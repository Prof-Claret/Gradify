/**
 * Presensi — catat & rekap kehadiran per mata kuliah.
 */
import { esc, toast } from '../app.js';
import { injectFormStyles } from './ui.js';

export const subtitle = () => 'Catat dan pantau kehadiran tiap mata kuliah';

const STATUS = {
  hadir: { label: 'Hadir', cls: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  izin: { label: 'Izin', cls: 'bg-sky-100 text-sky-700', bar: 'bg-sky-500' },
  sakit: { label: 'Sakit', cls: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
  alfa: { label: 'Alfa', cls: 'bg-rose-100 text-rose-700', bar: 'bg-rose-500' }
};

const today = () => new Date().toISOString().slice(0, 10);

export async function render(main, ctx) {
  const { api } = ctx;
  let semesters = [];
  let semId = sessionStorage.getItem('gradify_presensi_sem') || 'active';
  let semester = null;
  let courses = [];
  let records = [];
  let summary = { hadir: 0, izin: 0, sakit: 0, alfa: 0, total: 0, percentage: 0 };
  let courseFilter = sessionStorage.getItem('gradify_presensi_course') || 'all';

  async function load() {
    const data = await api.get('/api/academics/semesters');
    semesters = data.semesters || [];
    semester = semId === 'active'
      ? (semesters.find(s => s.is_active) || semesters[0])
      : (semesters.find(s => String(s.id) === String(semId)) || semesters.find(s => s.is_active) || semesters[0]);
    if (!semester) { draw(); return; }

    const [c, a] = await Promise.all([
      api.get(`/api/academics/courses?semester_id=${semester.id}`),
      api.get(`/api/academics/attendance?semester_id=${semester.id}`)
    ]);
    courses = c.courses || [];
    records = a.records || [];
    summary = a.summary || summary;
    if (courseFilter !== 'all' && !courses.some(x => String(x.id) === String(courseFilter))) courseFilter = 'all';
    draw();
  }

  function filtered() {
    return courseFilter === 'all' ? records : records.filter(r => String(r.course_id) === String(courseFilter));
  }

  function statCard(label, value, sub, icon, cls) {
    return `<div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-center gap-1.5 mb-1"><span>${icon}</span><p class="text-[11px] font-medium text-slate-500">${esc(label)}</p></div>
      <p class="text-2xl font-extrabold ${cls}">${esc(value)}</p>
      <p class="text-[10px] text-slate-400 mt-0.5">${esc(sub)}</p>
    </div>`;
  }

  function courseProgress() {
    if (!courses.length) return '';
    return `<div class="grid sm:grid-cols-2 gap-3 mb-6">${courses.map(c => {
      const rs = records.filter(r => String(r.course_id) === String(c.id));
      const hadir = rs.filter(r => r.status === 'hadir').length;
      const pct = rs.length ? Math.round((hadir / rs.length) * 100) : 0;
      const active = String(courseFilter) === String(c.id);
      return `<button class="att-course text-left border rounded-xl p-3 transition ${active ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 bg-white hover:border-indigo-300'}" data-id="${c.id}">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-bold text-slate-800 truncate">${esc(c.course_name)}</p>
          <span class="text-[10px] font-bold ${pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-600'}">${pct}%</span>
        </div>
        <p class="text-[10px] text-slate-500 mt-0.5">${hadir} hadir · ${rs.length} pertemuan · ${c.sks} SKS</p>
        <div class="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
          <div class="h-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}" style="width:${pct}%"></div>
        </div>
      </button>`;
    }).join('')}</div>`;
  }

  function recordRow(r) {
    const st = STATUS[r.status] || STATUS.hadir;
    return `<tr class="border-t border-slate-100 hover:bg-slate-50/70">
      <td class="px-3 py-2 font-mono text-[11px] text-slate-600 whitespace-nowrap">${esc(new Date(r.date + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }))}</td>
      <td class="px-3 py-2 text-xs text-slate-800">
        <p class="font-semibold truncate max-w-[220px]">${esc(r.course_name || '—')}</p>
        <p class="text-[10px] text-slate-400">${r.meeting_no ? 'Pertemuan ' + r.meeting_no : ''}</p>
      </td>
      <td class="px-3 py-2">
        <select class="att-status text-[11px] font-semibold rounded-full px-2 py-1 border-0 ${st.cls}" data-id="${r.id}">
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
      </td>
      <td class="px-3 py-2 text-[11px] text-slate-500 max-w-[260px] truncate">${esc(r.notes || '')}</td>
      <td class="px-3 py-2 text-right">
        <button class="att-del text-slate-300 hover:text-rose-600 text-sm" data-id="${r.id}" title="Hapus">🗑</button>
      </td>
    </tr>`;
  }

  function draw() {
    if (!semester) {
      main.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <p class="text-3xl mb-2">🗓️</p>
        <p class="font-semibold text-slate-700">Belum ada semester</p>
        <p class="text-sm text-slate-400 mt-1">Buat semester terlebih dahulu di menu Kelola Semester.</p>
      </div>`;
      return;
    }

    const list = filtered();
    const courseOptions = courses.length
      ? courses.map(c => `<option value="${c.id}">${esc(c.course_name)}</option>`).join('')
      : '<option value="">— Belum ada mata kuliah —</option>';

    main.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div class="flex items-center gap-2">
        <select id="att-sem" class="text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white">
          ${semesters.map(s => `<option value="${s.id}" ${String(s.id) === String(semester.id) ? 'selected' : ''}>Semester ${s.semester_number} — ${esc(s.academic_year)}</option>`).join('')}
        </select>
        <button id="att-all" class="text-xs px-3 py-2 rounded-lg font-semibold ${courseFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-300 text-slate-600'}">Semua Matkul</button>
      </div>
      <span class="text-[11px] bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-full">${summary.percentage}% kehadiran keseluruhan</span>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      ${statCard('Total Pertemuan', summary.total, 'tercatat di semester ini', '📅', 'text-indigo-600')}
      ${statCard('Hadir', summary.hadir, 'kehadiran penuh', '✅', 'text-emerald-600')}
      ${statCard('Izin / Sakit', summary.izin + summary.sakit, `${summary.izin} izin · ${summary.sakit} sakit`, '🤒', 'text-amber-600')}
      ${statCard('Alfa', summary.alfa, 'tanpa keterangan', '⚠️', 'text-rose-600')}
    </div>

    ${courseProgress()}

    <div class="grid lg:grid-cols-3 gap-6">
      <section class="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-slate-800 text-sm sm:text-base">🗂️ Riwayat Presensi</h3>
          <span class="text-[11px] text-slate-400">${list.length} catatan</span>
        </div>
        ${list.length === 0
          ? `<div class="text-center py-10"><p class="text-3xl">📭</p><p class="text-sm font-semibold text-slate-600 mt-2">Belum ada presensi</p><p class="text-xs text-slate-400">Catat kehadiran lewat formulir di samping.</p></div>`
          : `<div class="overflow-x-auto -mx-1"><table class="w-full text-left">
              <thead><tr class="text-[10px] uppercase tracking-wide text-slate-400">
                <th class="px-3 py-2 font-semibold">Tanggal</th>
                <th class="px-3 py-2 font-semibold">Mata Kuliah</th>
                <th class="px-3 py-2 font-semibold">Status</th>
                <th class="px-3 py-2 font-semibold">Catatan</th>
                <th></th>
              </tr></thead>
              <tbody>${list.map(recordRow).join('')}</tbody>
            </table></div>`}
      </section>

      <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 h-fit">
        <h3 class="font-bold text-slate-800 text-sm sm:text-base mb-3">➕ Catat Presensi</h3>
        <form id="att-form" class="space-y-3">
          <div>
            <label class="text-[11px] font-semibold text-slate-600 block mb-1">Mata Kuliah</label>
            <select name="course_id" required class="g-inp" ${courses.length ? '' : 'disabled'}>${courseOptions}</select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[11px] font-semibold text-slate-600 block mb-1">Tanggal</label>
              <input name="date" type="date" required value="${today()}" class="g-inp" />
            </div>
            <div>
              <label class="text-[11px] font-semibold text-slate-600 block mb-1">Pertemuan</label>
              <input name="meeting_no" type="number" min="1" placeholder="mis. 5" class="g-inp" />
            </div>
          </div>
          <div>
            <label class="text-[11px] font-semibold text-slate-600 block mb-1">Status</label>
            <select name="status" class="g-inp">
              ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-[11px] font-semibold text-slate-600 block mb-1">Catatan</label>
            <input name="notes" placeholder="opsional" class="g-inp" />
          </div>
          <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50" ${courses.length ? '' : 'disabled'}>Simpan Presensi</button>
          <p class="text-[10px] text-slate-400 leading-snug">Satu mata kuliah hanya punya satu catatan per tanggal — simpan ulang untuk mengubah status.</p>
        </form>
      </section>
    </div>`;

    injectFormStyles();
    wire();
  }

  function wire() {
    main.querySelector('#att-sem').addEventListener('change', (e) => {
      semId = e.target.value;
      sessionStorage.setItem('gradify_presensi_sem', semId);
      courseFilter = 'all';
      load();
    });
    main.querySelector('#att-all').addEventListener('click', () => {
      courseFilter = 'all';
      sessionStorage.setItem('gradify_presensi_course', 'all');
      draw();
    });
    main.querySelectorAll('.att-course').forEach(b => b.addEventListener('click', () => {
      courseFilter = String(b.dataset.id);
      sessionStorage.setItem('gradify_presensi_course', courseFilter);
      draw();
    }));
    main.querySelectorAll('.att-status').forEach(sel => sel.addEventListener('change', async () => {
      try {
        await api.put(`/api/academics/attendance/${sel.dataset.id}`, { status: sel.value });
        toast('Status presensi diperbarui', 'info');
        load();
      } catch (e) { toast(e.message, 'error'); }
    }));
    main.querySelectorAll('.att-del').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Hapus catatan presensi ini?')) return;
      try {
        await api.del(`/api/academics/attendance/${b.dataset.id}`);
        toast('Presensi dihapus', 'info');
        load();
      } catch (e) { toast(e.message, 'error'); }
    }));
    const form = main.querySelector('#att-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(form);
      try {
        await api.post('/api/academics/attendance', {
          course_id: f.get('course_id'),
          date: f.get('date'),
          status: f.get('status'),
          meeting_no: f.get('meeting_no') || null,
          notes: f.get('notes') || null
        });
        toast('Presensi tersimpan');
        load();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  await load();
}
