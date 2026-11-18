/**
 * SIAK — KRS, kalender akademik, dan ringkasan studi.
 */
import { esc, toast } from '../app.js';
import { injectFormStyles, todayStr, fmtDate } from './ui.js';

export const subtitle = () => 'KRS, kalender akademik, dan ringkasan studi';

const TABS = [
  { key: 'krs', label: '📋 KRS' },
  { key: 'kalender', label: '📅 Kalender Akademik' },
  { key: 'ringkasan', label: '📊 Ringkasan Studi' }
];
const KRS_STATUS = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-700', hint: 'Masih dapat diubah' },
  diajukan: { label: 'Diajukan', cls: 'bg-amber-100 text-amber-700', hint: 'Menunggu persetujuan' },
  disetujui: { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-700', hint: 'Sudah disetujui' }
};
const EVENT_TYPES = ['akademik', 'libur', 'ujian', 'registrasi', 'lainnya'];
const EVENT_CLS = {
  akademik: 'bg-indigo-100 text-indigo-700',
  libur: 'bg-emerald-100 text-emerald-700',
  ujian: 'bg-rose-100 text-rose-700',
  registrasi: 'bg-amber-100 text-amber-700',
  lainnya: 'bg-slate-100 text-slate-700'
};

export async function render(main, ctx) {
  const { api, navigate } = ctx;
  let tab = sessionStorage.getItem('gradify_siak_tab') || 'krs';
  let semesters = [];
  let semId = sessionStorage.getItem('gradify_siak_sem') || 'active';
  let krsData = null;
  let events = [];
  let transcript = null;

  async function loadSemesters() {
    const res = await api.get('/api/academics/semesters');
    semesters = res.semesters || [];
  }

  function activeSemester() {
    return semId === 'active'
      ? (semesters.find(s => s.is_active) || semesters[0] || null)
      : (semesters.find(s => String(s.id) === String(semId)) || semesters.find(s => s.is_active) || semesters[0] || null);
  }

  async function loadTab() {
    if (tab === 'krs') {
      const sem = activeSemester();
      krsData = sem ? await api.get(`/api/academics/krs?semester_id=${sem.id}`) : { krs: null, courses: [], total_sks: 0 };
    } else if (tab === 'kalender') {
      const res = await api.get('/api/academics/calendar');
      events = res.events || [];
    } else {
      transcript = await api.get('/api/academics/transcript');
    }
    draw();
  }

  function tabsHtml() {
    return `<div class="flex flex-wrap gap-1.5 mb-5">
      ${TABS.map(t => `<button class="sk-tab chip-btn ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-300 text-slate-600'}" data-tab="${t.key}">${t.label}</button>`).join('')}
    </div>`;
  }

  function draw() {
    main.innerHTML = `
    <div class="mb-4">
      <h2 class="font-extrabold text-slate-800 text-lg">🏛️ Sistem Informasi Akademik</h2>
      <p class="text-xs text-slate-500">Rencana studi, kalender kampus, dan rekap nilai.</p>
    </div>
    ${tabsHtml()}
    <div id="sk-body">${tab === 'krs' ? krsHtml() : tab === 'kalender' ? kalenderHtml() : ringkasanHtml()}</div>`;

    injectFormStyles();
    main.querySelectorAll('.sk-tab').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.tab;
      sessionStorage.setItem('gradify_siak_tab', tab);
      loadTab();
    }));
    if (tab === 'krs') wireKrs();
    else if (tab === 'kalender') wireKalender();
    else wireRingkasan();
  }

  /* ---------------- KRS ---------------- */
  function krsHtml() {
    const sem = activeSemester();
    if (!sem) return empty('🗓️', 'Belum ada semester', 'Buat semester di menu Kelola Semester.');
    const k = krsData?.krs;
    const status = k?.status || 'draft';
    const st = KRS_STATUS[status] || KRS_STATUS.draft;
    const courses = krsData?.courses || [];
    return `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <select id="sk-sem" class="text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white">
        ${semesters.map(s => `<option value="${s.id}" ${String(s.id) === String(sem.id) ? 'selected' : ''}>Semester ${s.semester_number} — ${esc(s.academic_year)}</option>`).join('')}
      </select>
      <span class="text-[11px] font-bold rounded-full px-3 py-1.5 ${st.cls}">${st.label} · ${st.hint}</span>
    </div>

    <div class="grid xl:grid-cols-3 gap-6">
      <section class="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 class="font-bold text-slate-800 text-sm">Daftar Mata Kuliah</h3>
          <span class="text-[11px] bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-full">${krsData?.total_sks || 0} SKS</span>
        </div>
        ${courses.length === 0 ? `<div class="p-8 text-center text-sm text-slate-400">Belum ada mata kuliah di semester ini. Tambahkan di menu Mata Kuliah.</div>` :
          `<div class="overflow-x-auto"><table class="w-full text-left text-xs">
            <thead><tr class="text-[10px] uppercase text-slate-400 bg-slate-50">
              <th class="px-4 py-2 font-semibold">Kode</th>
              <th class="px-4 py-2 font-semibold">Mata Kuliah</th>
              <th class="px-4 py-2 font-semibold">Jadwal</th>
              <th class="px-4 py-2 font-semibold text-center">SKS</th>
              <th class="px-4 py-2 font-semibold text-center">Nilai</th>
            </tr></thead>
            <tbody>${courses.map(c => `<tr class="border-t border-slate-100">
              <td class="px-4 py-2 font-mono text-[10px] text-slate-500">${esc(c.course_code)}</td>
              <td class="px-4 py-2"><p class="font-semibold text-slate-800">${esc(c.course_name)}</p><p class="text-[10px] text-slate-400">${esc(c.lecturer || '—')}</p></td>
              <td class="px-4 py-2 text-[11px] text-slate-600">${c.day ? esc(c.day) : '—'}${c.start_time ? ` · ${esc(c.start_time)}-${esc(c.end_time || '')}` : ''}<br><span class="text-[10px] text-slate-400">${esc(c.room || '')}</span></td>
              <td class="px-4 py-2 text-center font-bold text-slate-700">${c.sks}</td>
              <td class="px-4 py-2 text-center font-bold ${c.grade ? 'text-indigo-600' : 'text-slate-300'}">${esc(c.grade || '—')}</td>
            </tr>`).join('')}</tbody>
          </table></div>`}
        <div class="px-4 py-3 border-t border-slate-100 flex justify-between text-[11px] text-slate-500">
          <span>${courses.length} mata kuliah</span>
          <button id="sk-gpa" class="text-indigo-600 font-semibold hover:underline">Lihat KHS & IPK →</button>
        </div>
      </section>

      <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 h-fit">
        <h3 class="font-bold text-slate-800 text-sm mb-3">Status KRS</h3>
        <form id="krs-form" class="space-y-3">
          <div>
            <label class="g-lbl">Status pengajuan</label>
            <select name="status" class="g-inp">
              ${Object.entries(KRS_STATUS).map(([key, v]) => `<option value="${key}" ${status === key ? 'selected' : ''}>${v.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="g-lbl">Catatan / dosen PA</label>
            <textarea name="notes" rows="3" class="g-inp" placeholder="cth. Disetujui Dr. ...">${esc(k?.notes || '')}</textarea>
          </div>
          <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm">Simpan Status KRS</button>
          <p class="text-[10px] text-slate-400 leading-snug">Status KRS disimpan per semester. Perubahan mata kuliah otomatis memperbarui daftar & total SKS.</p>
        </form>
      </section>
    </div>`;
  }

  function wireKrs() {
    main.querySelector('#sk-sem')?.addEventListener('change', (e) => {
      semId = e.target.value;
      sessionStorage.setItem('gradify_siak_sem', semId);
      loadTab();
    });
    main.querySelector('#sk-gpa')?.addEventListener('click', () => navigate('gpa'));
    main.querySelector('#krs-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sem = activeSemester();
      if (!sem) return;
      const f = new FormData(e.target);
      try {
        await api.put('/api/academics/krs', {
          semester_id: sem.id, status: f.get('status'), notes: f.get('notes') || null
        });
        toast('Status KRS disimpan');
        loadTab();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  /* ---------------- Kalender ---------------- */
  function kalenderHtml() {
    return `<div class="grid lg:grid-cols-3 gap-6">
      <section class="lg:col-span-2 space-y-3">
        ${events.length === 0 ? empty('📅', 'Kalender masih kosong', 'Tambahkan agenda akademik seperti registrasi, UTS, atau libur.') :
          events.map(e => `<div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center min-w-[64px] shrink-0">
              <p class="text-[10px] uppercase text-slate-400 font-semibold">${fmtDate(e.start_date, false).split(' ')[1] || ''}</p>
              <p class="text-lg font-extrabold text-slate-700 leading-none">${(fmtDate(e.start_date, false).split(' ')[0] || '').padStart(2, '0')}</p>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-bold text-sm text-slate-800">${esc(e.title)}</p>
                <span class="text-[10px] font-semibold rounded-full px-2 py-0.5 ${EVENT_CLS[e.type] || EVENT_CLS.lainnya}">${esc(e.type)}</span>
              </div>
              <p class="text-[11px] text-slate-500">${fmtDate(e.start_date)}${e.end_date && e.end_date !== e.start_date ? ` — ${fmtDate(e.end_date)}` : ''}</p>
              ${e.description ? `<p class="text-[11px] text-slate-600 mt-1">${esc(e.description)}</p>` : ''}
            </div>
            <button class="cal-del text-slate-300 hover:text-rose-600 shrink-0" data-id="${e.id}">🗑</button>
          </div>`).join('')}
      </section>
      <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 h-fit">
        <h3 class="font-bold text-slate-800 text-sm mb-3">➕ Tambah Agenda</h3>
        <form id="cal-form" class="space-y-3">
          <div><label class="g-lbl">Judul *</label><input name="title" required class="g-inp" placeholder="cth. Registrasi Semester Ganjil" /></div>
          <div><label class="g-lbl">Jenis</label><select name="type" class="g-inp">${EVENT_TYPES.map(t => `<option value="${t}">${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}</select></div>
          <div class="grid grid-cols-2 gap-2">
            <div><label class="g-lbl">Mulai *</label><input name="start_date" type="date" required value="${todayStr()}" class="g-inp" /></div>
            <div><label class="g-lbl">Selesai</label><input name="end_date" type="date" class="g-inp" /></div>
          </div>
          <div><label class="g-lbl">Keterangan</label><textarea name="description" rows="2" class="g-inp" placeholder="opsional"></textarea></div>
          <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm">Tambah Agenda</button>
        </form>
      </section>
    </div>`;
  }

  function wireKalender() {
    main.querySelectorAll('.cal-del').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Hapus agenda ini?')) return;
      try {
        await api.del(`/api/academics/calendar/${b.dataset.id}`);
        toast('Agenda dihapus', 'info');
        loadTab();
      } catch (e) { toast(e.message, 'error'); }
    }));
    main.querySelector('#cal-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await api.post('/api/academics/calendar', {
          title: f.get('title'), type: f.get('type'),
          start_date: f.get('start_date'), end_date: f.get('end_date') || null,
          description: f.get('description') || null
        });
        toast('Agenda akademik ditambahkan');
        loadTab();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  /* ---------------- Ringkasan ---------------- */
  function ringkasanHtml() {
    if (!transcript) return empty('📊', 'Belum ada data', 'Tambahkan semester dan mata kuliah.');
    const { summary, transcript: rows } = transcript;
    return `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      ${sumCard('IPK Kumulatif', Number(summary.ipk || 0).toFixed(2), summary.predikat, '🎯', 'text-indigo-600')}
      ${sumCard('SKS Dinilai', `${summary.total_sks_graded} SKS`, `dari ${summary.total_sks_taken} SKS diambil`, '✅', 'text-emerald-600')}
      ${sumCard('Maks SKS Berikutnya', `${summary.max_sks_next} SKS`, 'berdasarkan IPS terakhir', '⚖️', 'text-amber-600')}
      ${sumCard('Total Semester', rows.length, 'semester tercatat', '🗓️', 'text-slate-700')}
    </div>
    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h3 class="font-bold text-slate-800 text-sm">Rekap per Semester</h3>
        <button id="sk-gpa2" class="text-[11px] text-indigo-600 font-semibold hover:underline">Buka Transkrip Lengkap →</button>
      </div>
      ${rows.length === 0 ? `<div class="p-8 text-center text-sm text-slate-400">Belum ada semester.</div>` :
        `<div class="overflow-x-auto"><table class="w-full text-left text-xs">
          <thead><tr class="text-[10px] uppercase text-slate-400 bg-slate-50">
            <th class="px-4 py-2 font-semibold">Semester</th>
            <th class="px-4 py-2 font-semibold">Tahun Akademik</th>
            <th class="px-4 py-2 font-semibold text-center">Matkul</th>
            <th class="px-4 py-2 font-semibold text-center">SKS</th>
            <th class="px-4 py-2 font-semibold text-center">IPS</th>
            <th class="px-4 py-2 font-semibold text-center">Status</th>
          </tr></thead>
          <tbody>${rows.map(s => `<tr class="border-t border-slate-100">
            <td class="px-4 py-2 font-semibold text-slate-700">Semester ${s.semester_number}</td>
            <td class="px-4 py-2 text-slate-500">${esc(s.academic_year)}</td>
            <td class="px-4 py-2 text-center">${s.course_count ?? (s.courses ? s.courses.length : '—')}</td>
            <td class="px-4 py-2 text-center font-bold">${s.total_sks ?? '—'}</td>
            <td class="px-4 py-2 text-center font-bold text-indigo-600">${s.ips != null ? Number(s.ips).toFixed(2) : '—'}</td>
            <td class="px-4 py-2 text-center">
              <span class="text-[10px] font-semibold rounded-full px-2 py-0.5 ${s.is_active ? 'bg-emerald-100 text-emerald-700' : s.is_archived ? 'bg-slate-100 text-slate-500' : 'bg-sky-100 text-sky-700'}">
                ${s.is_active ? 'Aktif' : s.is_archived ? 'Arsip' : 'Selesai'}
              </span>
            </td>
          </tr>`).join('')}</tbody>
        </table></div>`}
    </section>`;
  }

  function sumCard(label, value, sub, icon, cls) {
    return `<div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-center gap-1.5 mb-1"><span>${icon}</span><p class="text-[11px] font-medium text-slate-500">${esc(label)}</p></div>
      <p class="text-2xl font-extrabold ${cls}">${esc(value)}</p>
      <p class="text-[10px] text-slate-400 mt-0.5">${esc(sub)}</p>
    </div>`;
  }

  function wireRingkasan() {
    main.querySelector('#sk-gpa2')?.addEventListener('click', () => navigate('gpa'));
  }

  function empty(icon, title, sub) {
    return `<div class="bg-white border border-slate-200 rounded-2xl p-10 text-center">
      <p class="text-4xl">${icon}</p>
      <p class="font-semibold text-slate-700 mt-2">${esc(title)}</p>
      <p class="text-xs text-slate-400 mt-1">${esc(sub)}</p>
    </div>`;
  }

  await loadSemesters();
  await loadTab();
}
