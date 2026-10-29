/**
 * Kelola Semester Engine (Phase 1.1)
 * Semester Switcher, Arsip/Transkrip, Transition Wizard, Max SKS Calculator
 */
import { esc, toast, navigate } from '../app.js';

export const subtitle = (u) => `Semester aktif: ${u?.active_semester ?? '-'} · ${u?.faculty || '-'}`;

export async function render(main, ctx) {
  const { api } = ctx;

  const [{ semesters }, { transcript, summary }] = await Promise.all([
    api.get('/api/academics/semesters'),
    api.get('/api/academics/transcript')
  ]);

  main.innerHTML = `
  <div class="grid lg:grid-cols-3 gap-6">
    <!-- Left: semester list -->
    <div class="lg:col-span-2 space-y-6">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 class="font-bold text-slate-800">🗓️ Semua Semester</h3>
          <button id="add-sem" class="text-xs bg-indigo-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700">+ Tambah Semester</button>
        </div>
        <div id="sem-list" class="space-y-2">
          ${semesters.length === 0 ? '<p class="text-sm text-slate-400 text-center py-6">Belum ada semester. Klik "Tambah Semester".</p>' :
          semesters.map(s => `
          <div class="flex flex-wrap items-center gap-3 border ${s.is_active ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200'} rounded-xl p-3">
            <div class="w-11 h-11 rounded-full ${s.is_active ? 'bg-indigo-600 text-white' : 'bg-slate-100'} flex flex-col items-center justify-center shrink-0">
              <span class="text-sm font-extrabold leading-none">${s.semester_number}</span>
              <span class="text-[8px] opacity-70">SMT</span>
            </div>
            <div class="flex-1 min-w-[120px]">
              <p class="font-semibold text-sm text-slate-800">Semester ${s.semester_number} — ${esc(s.academic_year)}</p>
              <p class="text-[11px] text-slate-500">${s.course_count} matkul · ${s.total_sks} SKS · IPS ${s.ips || '—'} ${s.is_archived ? '· 📦 Arsip' : ''}</p>
            </div>
            ${s.is_active ? '<span class="text-[10px] bg-indigo-600 text-white font-bold px-2.5 py-1 rounded-full">AKTIF</span>'
              : `<div class="flex gap-1">
                  <button class="s-act text-[11px] px-2.5 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 font-semibold hover:bg-indigo-200" data-id="${s.id}">Jadikan Aktif</button>
                  <button class="s-arch text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200" data-id="${s.id}" data-a="${s.is_archived ? 0 : 1}">${s.is_archived ? 'Buka' : 'Arsip'}</button>
                  <button class="s-del text-[11px] px-2 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" data-id="${s.id}">🗑</button>
                </div>`}
          </div>`).join('')}
        </div>
      </div>

      <!-- Transkrip per semester -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800 mb-3">📄 Transkrip Akademik (Per Semester)</h3>
        <div class="overflow-x-auto">
          <table class="gtable">
            <thead><tr><th>Smt</th><th>TA</th><th>Matkul</th><th>SKS</th><th>IPS</th><th>IPK jalan</th><th>Detail Nilai</th></tr></thead>
            <tbody>
              ${transcript.length === 0 ? '<tr><td colspan="7" class="text-center text-slate-400 py-4">Belum ada data.</td></tr>' :
              transcript.map(r => `<tr>
                <td class="font-bold">${r.semester_number}</td>
                <td class="text-[11px]">${esc(r.academic_year)}</td>
                <td>${r.courses.length}</td>
                <td>${r.total_sks}</td>
                <td class="font-mono font-semibold">${r.ips || '—'}</td>
                <td class="font-mono">${r.ipk_running || '—'}</td>
                <td>
                  ${r.courses.filter(c => c.grade).map(c =>
                    `<span class="inline-block text-[10px] bg-slate-100 rounded px-1.5 py-0.5 mr-1 mb-0.5 font-mono">${esc(c.grade)} ${esc(c.course_code)}</span>`).join('') ||
                  '<span class="text-[10px] text-slate-400">belum dinilai</span>'}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Right: wizards & calculator -->
    <div class="space-y-6">
      <!-- Transition wizard -->
      <div class="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white shadow-lg">
        <h3 class="font-bold mb-1">🚀 Semester Transition Wizard</h3>
        <p class="text-indigo-100 text-xs mb-3">Naik ke semester berikutnya: arsipkan otomatis semester lama & reset jadwal aktif.</p>
        <button id="promote" class="w-full bg-white text-indigo-700 rounded-xl py-2 text-sm font-bold hover:bg-indigo-50 transition">
          Promosikan ke Semester ${Math.min(ctx.user.active_semester + 1, 9)} →
        </button>
      </div>

      <!-- Max SKS calculator -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800 mb-1">⚖️ Kalkulator Maks SKS</h3>
        <p class="text-xs text-slate-500 mb-3">Hitung batas SKS semester berikutnya berdasarkan IPS.</p>
        <label class="text-xs font-semibold text-slate-600 block mb-1">Masukkan IPS terakhir</label>
        <input id="ips-inp" type="number" step="0.01" min="0" max="4" value="${summary.ipk}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono mb-2" />
        <div id="max-sks-out" class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
          <p class="text-[11px] text-indigo-500 font-medium">Maks SKS berikutnya</p>
          <p id="max-sks-val" class="text-3xl font-extrabold text-indigo-700">${summary.max_sks_next} SKS</p>
          <p id="max-sks-rule" class="text-[10px] text-indigo-400">${sksRule(summary.ipk)}</p>
        </div>
      </div>

      <!-- Campus info -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-sm">
        <h3 class="font-bold text-slate-800 mb-2">🏫 Profil Kampus</h3>
        <p class="text-slate-600"><b>${esc(ctx.user.campus_name)}</b></p>
        <p class="text-slate-500 text-xs mt-1">${esc(ctx.user.faculty || '—')}</p>
        <p class="text-slate-500 text-xs">${esc(ctx.user.study_program || '—')}</p>
        <p class="text-slate-500 text-xs mt-2">NPM: <b>${esc(ctx.user.npm_nim || '—')}</b> · Target IPK: <b>${ctx.user.target_gpa}</b></p>
      </div>
    </div>
  </div>`;

  /* ---------- events ---------- */
  document.getElementById('promote').addEventListener('click', async () => {
    if (!confirm(`Promosikan dari Semester ${ctx.user.active_semester} ke Semester ${Math.min(ctx.user.active_semester + 1, 9)}?`)) return;
    try {
      const r = await api.post('/api/auth/promote', {});
      toast(r.message);
      ctx.refresh();
    } catch (e) { toast(e.message, 'error'); }
  });

  const ipsInp = document.getElementById('ips-inp');
  ipsInp.addEventListener('input', () => {
    const ips = Math.min(Math.max(parseFloat(ipsInp.value) || 0, 0), 4);
    const max = MAX_SKS(ips);
    document.getElementById('max-sks-val').textContent = `${max} SKS`;
    document.getElementById('max-sks-rule').textContent = sksRule(ips);
  });

  const addSem = document.getElementById('add-sem');
  addSem.addEventListener('click', async () => {
    const num = prompt('Nomor semester baru (1-12):');
    if (!num) return;
    const year = prompt('Tahun akademik (cth. Ganjil 2026/2027):', `Ganjil ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);
    try {
      await api.post('/api/academics/semesters', { semester_number: num, academic_year: year });
      toast('Semester ditambahkan');
      ctx.refresh();
    } catch (e) { toast(e.message, 'error'); }
  });

  document.querySelectorAll('.s-act').forEach(b => b.addEventListener('click', async () => {
    await api.put(`/api/academics/semesters/${b.dataset.id}`, { action: 'activate' });
    toast('Semester aktif diubah');
    ctx.refresh();
  }));
  document.querySelectorAll('.s-arch').forEach(b => b.addEventListener('click', async () => {
    await api.put(`/api/academics/semesters/${b.dataset.id}`, { is_archived: b.dataset.a === '1' });
    toast(b.dataset.a === '1' ? 'Semester diarsipkan' : 'Semester dibuka', 'info');
    ctx.refresh();
  }));
  document.querySelectorAll('.s-del').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Hapus semester ini beserta seluruh matkulnya?')) return;
    try {
      await api.del(`/api/academics/semesters/${b.dataset.id}`);
      toast('Semester dihapus', 'info');
      ctx.refresh();
    } catch (e) { toast(e.message, 'error'); }
  }));
}

function MAX_SKS(ips) {
  if (ips >= 3.0) return 24;
  if (ips >= 2.5) return 21;
  if (ips >= 2.0) return 18;
  return 15;
}
function sksRule(ips) {
  const max = MAX_SKS(ips);
  return ips >= 3.0 ? 'IPS ≥ 3.00 → maksimal 24 SKS'
    : ips >= 2.5 ? '2.50 ≤ IPS < 3.00 → maksimal 21 SKS'
    : ips >= 2.0 ? '2.00 ≤ IPS < 2.50 → maksimal 18 SKS'
    : 'IPS < 2.00 → maksimal 15 SKS';
}
