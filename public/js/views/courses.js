/**
 * Course Management Module (Phase 1.2) — CRUD Matkul + Jadwal + Input Nilai
 */
import { esc, toast } from '../app.js';

export const subtitle = () => 'Kelola catalog mata kuliah per semester';

export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
export const GRADES = ['', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'E'];

export async function render(main, ctx) {
  const { api } = ctx;

  let semId = sessionStorage.getItem('gradify_course_sem') || 'active';
  let semesterRow = null;

  async function load() {
    let { semesters } = await api.get('/api/academics/semesters');
    if (semId === 'active') {
      semesterRow = semesters.find(s => s.is_active) || semesters[0];
    } else {
      semesterRow = semesters.find(s => String(s.id) === String(semId));
    }
    if (!semesterRow) semesterRow = semesters.find(s => s.is_active) || semesters[0];
    if (semesterRow) sessionStorage.setItem('gradify_course_sem', String(semesterRow.id));

    const { courses } = semesterRow
      ? await api.get(`/api/academics/courses?semester_id=${semesterRow.id}`)
      : { courses: [] };

    draw(semesters, courses);
  }

  function draw(semesters, courses) {
    const totalSks = courses.reduce((a, c) => a + c.sks, 0);
    main.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
        <select id="sem-pick" class="flex-1 sm:flex-none text-xs sm:text-sm border border-slate-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white">
          ${semesters.map(s => `<option value="${s.id}" ${semesterRow && s.id === semesterRow.id ? 'selected' : ''}>
            Semester ${s.semester_number} — ${esc(s.academic_year)}${s.is_active ? ' (Aktif)' : ''}</option>`).join('')}
        </select>
        <span class="text-xs bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1.5 rounded-full shrink-0">${courses.length} Matkul · ${totalSks} SKS</span>
      </div>
      <button id="add-course" class="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl">+ Tambah Matkul</button>
    </div>

    ${courses.length === 0 ? `
    <div class="bg-white border border-slate-200 rounded-2xl p-12 text-center">
      <p class="text-4xl">📚</p>
      <p class="font-bold text-slate-700 mt-2">Belum ada mata kuliah</p>
      <p class="text-sm text-slate-400 mt-1">Tambahkan matkul semester ini: kode, nama, SKS, jadwal, ruangan, dosen.</p>
    </div>

    <!-- Weekly timetable empty state -->
    <div class="bg-white border border-slate-200 rounded-2xl p-5 mt-6">
      <h3 class="font-bold text-slate-800 mb-3">🕐 Jadwal Mingguan</h3>
      <p class="text-sm text-slate-400 text-center py-6">Jadwal akan muncul di sini setelah kamu menambah matkul.</p>
    </div>` : `
    <!-- Timetable -->
    <div class="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
      <h3 class="font-bold text-slate-800 mb-3">🕐 Jadwal Mingguan</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-xs border-collapse min-w-[720px]">
          <thead><tr>
            <th class="border border-slate-200 bg-slate-50 p-2 w-16">Jam</th>
            ${DAYS.map(d => `<th class="border border-slate-200 bg-slate-50 p-2">${d}</th>`).join('')}
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <!-- Course cards -->
    <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      ${courses.map(c => courseCard(c)).join('')}
    </div>`}

    <!-- Modal form -->
    <div id="course-modal" class="hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-2 sm:p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-3 sm:my-8 max-h-[92vh] overflow-y-auto" id="course-modal-body"></div>
    </div>`;

    bindTimetable(courses);
    wire(semesters, courses);
  }

  /* ---------- timetable helper ---------- */
  function timeRows(courses) {
    // Build hour slots 07:00-21:00
    const rows = [];
    for (let h = 7; h <= 20; h++) {
      const slot = `${String(h).padStart(2, '0')}:00`;
      rows.push({ slot, cells: DAYS.map(day => courses.filter(c => c.day === day && c.start_time && parseInt(c.start_time) === h)) });
    }
    return rows;
  }
  function bindTimetable(courses) {
    const tbody = main.querySelector('tbody');
    if (!tbody) return;
    const rows = timeRows(courses);
    tbody.innerHTML = rows.map(r => `<tr>
      <td class="border border-slate-200 font-mono text-[10px] text-slate-500 p-1.5 text-center">${r.slot}</td>
      ${r.cells.map(cell => {
        const c = cell[0];
        if (!c) return '<td class="border border-slate-100 p-1"></td>';
        const span = c.end_time ? Math.max(1, (parseFloat(c.end_time) - parseFloat(c.start_time)) || 1) : 1;
        return `<td class="border border-slate-200 p-1 align-top" rowspan="${span}">
          <div class="bg-indigo-500 text-white rounded-md p-1.5 h-full">
            <p class="font-bold text-[10px] leading-tight truncate">${esc(c.course_name)}</p>
            <p class="text-[9px] opacity-90 font-mono">${esc(c.start_time)}-${esc(c.end_time || '')}</p>
            <p class="text-[9px] opacity-90 truncate">${esc(c.room || '')}</p>
          </div>
        </td>`;
      }).join('')}
    </tr>`).join('');
  }

  /* ---------- course card ---------- */
  function courseCard(c) {
    return `<div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="min-w-0">
          <p class="text-[10px] font-mono bg-slate-100 rounded-full px-2 py-0.5 inline-block text-slate-600">${esc(c.course_code)}</p>
          <p class="font-bold text-sm text-slate-800 mt-1 truncate">${esc(c.course_name)}</p>
        </div>
        <span class="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded-full shrink-0">${c.sks} SKS</span>
      </div>
      <div class="text-xs text-slate-500 space-y-1">
        ${c.day ? `<p>📅 ${esc(c.day)} ${esc(c.start_time || '')}${c.end_time ? '–' + esc(c.end_time) : ''}</p>` : ''}
        ${c.room ? `<p>📍 ${esc(c.room)}</p>` : ''}
        ${c.lecturer ? `<p>👨‍🏫 ${esc(c.lecturer)}${c.lecturer_contact ? ` · <a class="text-indigo-600" href="${esc(c.lecturer_contact.replace(/[^\w@.\-\d\\\+\/:]/g, '') || '#')}">${esc(c.lecturer_contact)}</a>` : ''}</p>` : ''}
        <p class="text-[10px] text-slate-400 pt-0.5">Bobot: Tugas ${c.weight_tugas ?? 20}% · UTS ${c.weight_uts ?? 30}% · UAS ${c.weight_uas ?? 40}% · Lain ${c.weight_lain ?? 10}%</p>
      </div>
      <div class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
        <label class="text-[10px] text-slate-500">Nilai</label>
        <div class="flex items-center gap-1.5">
          <select class="g-grade text-xs border border-slate-300 rounded-lg px-2 py-1 font-semibold" data-id="${c.id}">
            ${GRADES.map(g => `<option value="${g}" ${c.grade === g ? 'selected' : ''}>${g || 'Belum'}</option>`).join('')}
          </select>
          <button class="c-edit text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-100" data-id="${c.id}" title="Ubah">✏️</button>
          <button class="c-del text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-100" data-id="${c.id}" title="Hapus">🗑</button>
        </div>
      </div>
    </div>`;
  }

  /* ---------- modal ---------- */
  function openModal(course = null) {
    const modal = document.getElementById('course-modal');
    const body = document.getElementById('course-modal-body');
    modal.classList.remove('hidden');
    body.innerHTML = `
      <div class="p-4 sm:p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-slate-800 text-base sm:text-lg">${course ? '✏️ Ubah Matkul' : '➕ Tambah Mata Kuliah'}</h3>
          <button id="cm-close" class="text-slate-400 hover:text-slate-700 text-xl p-1">✕</button>
        </div>
        <form id="cm-form" class="grid md:grid-cols-2 gap-3">
          <div>
            <label class="g-lbl">Kode Matkul *</label>
            <input name="course_code" required value="${course ? esc(course.course_code) : ''}" class="g-inp" placeholder="cth. TIF-3112" />
          </div>
          <div>
            <label class="g-lbl">Nama Matkul *</label>
            <input name="course_name" required value="${course ? esc(course.course_name) : ''}" class="g-inp" placeholder="cth. Struktur Data" />
          </div>
          <div>
            <label class="g-lbl">SKS *</label>
            <input name="sks" type="number" min="1" max="12" value="${course ? course.sks : 3}" class="g-inp" />
          </div>
          <div>
            <label class="g-lbl">Hari</label>
            <select name="day" class="g-inp">
              <option value="">— Pilih —</option>
              ${DAYS.map(d => `<option ${course?.day === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="g-lbl">Jam Mulai</label>
            <input name="start_time" type="time" value="${course?.start_time || ''}" class="g-inp" />
          </div>
          <div>
            <label class="g-lbl">Jam Selesai</label>
            <input name="end_time" type="time" value="${course?.end_time || ''}" class="g-inp" />
          </div>
          <div>
            <label class="g-lbl">Ruangan</label>
            <input name="room" value="${course ? esc(course.room || '') : ''}" class="g-inp" placeholder="cth. R-302" />
          </div>
          <div>
            <label class="g-lbl">Dosen</label>
            <input name="lecturer" value="${course ? esc(course.lecturer || '') : ''}" class="g-inp" placeholder="Nama dosen" />
          </div>
          <div class="md:col-span-2">
            <label class="g-lbl">Kontak Dosen (email/WA)</label>
            <input name="lecturer_contact" value="${course ? esc(course.lecturer_contact || '') : ''}" class="g-inp" placeholder="cth. dosen@ust.ac.id" />
          </div>
          <div class="md:col-span-2">
            <label class="g-lbl">Skala Bobot Penilaian (%)</label>
            <p class="text-[10px] text-slate-400 mb-2">Disarankan total 100%. Default UNIKA-style: Tugas 20 · UTS 30 · UAS 40 · Lain 10.</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label class="g-lbl">Tugas</label>
                <input name="weight_tugas" type="number" min="0" max="100" value="${course?.weight_tugas ?? 20}" class="g-inp" />
              </div>
              <div>
                <label class="g-lbl">UTS</label>
                <input name="weight_uts" type="number" min="0" max="100" value="${course?.weight_uts ?? 30}" class="g-inp" />
              </div>
              <div>
                <label class="g-lbl">UAS</label>
                <input name="weight_uas" type="number" min="0" max="100" value="${course?.weight_uas ?? 40}" class="g-inp" />
              </div>
              <div>
                <label class="g-lbl">Lain</label>
                <input name="weight_lain" type="number" min="0" max="100" value="${course?.weight_lain ?? 10}" class="g-inp" />
              </div>
            </div>
            <p id="cm-weight-sum" class="text-[11px] text-slate-500 mt-2">Total bobot: 100%</p>
          </div>
          ${course ? `
          <div>
            <label class="g-lbl">Nilai (Grade)</label>
            <select name="grade" class="g-inp">
              ${GRADES.map(g => `<option value="${g}" ${course.grade === g ? 'selected' : ''}>${g || 'Belum dinilai'}</option>`).join('')}
            </select>
          </div>` : ''}
          <div class="md:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" id="cm-cancel" class="text-sm text-slate-500 px-4 py-2 rounded-xl hover:bg-slate-100">Batal</button>
            <button class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-xl text-sm">${course ? 'Simpan Perubahan' : 'Tambah Matkul'}</button>
          </div>
        </form>
      </div>`;

    injectFormStyles();
    const close = () => modal.classList.add('hidden');
    body.querySelector('#cm-close').addEventListener('click', close);
    body.querySelector('#cm-cancel').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    const form = body.querySelector('#cm-form');
    const sumEl = body.querySelector('#cm-weight-sum');
    const weightNames = ['weight_tugas', 'weight_uts', 'weight_uas', 'weight_lain'];
    function refreshWeightSum() {
      const total = weightNames.reduce((a, n) => a + (parseInt(form.elements[n]?.value, 10) || 0), 0);
      sumEl.textContent = `Total bobot: ${total}%`;
      sumEl.className = `text-[11px] mt-2 ${total === 100 ? 'text-emerald-600' : 'text-amber-600'}`;
      if (total !== 100) sumEl.textContent += ' (disarankan 100%)';
    }
    weightNames.forEach(n => form.elements[n]?.addEventListener('input', refreshWeightSum));
    refreshWeightSum();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const payload = Object.fromEntries(f.entries());
      if (!payload.grade) delete payload.grade;
      for (const n of weightNames) payload[n] = parseInt(payload[n], 10) || 0;
      try {
        if (course) {
          await api.put(`/api/academics/courses/${course.id}`, payload);
          toast('Matkul diperbarui');
        } else {
          await api.post('/api/academics/courses', { ...payload, semester_id: semesterRow.id });
          toast('Matkul ditambahkan!');
        }
        close();
        await api.refreshSemesters?.();
        window.location.hash = window.location.hash; // noop
        ctx.refresh();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  function wire(semesters, courses) {
    document.getElementById('sem-pick').addEventListener('change', (e) => {
      sessionStorage.setItem('gradify_course_sem', e.target.value);
      load();
    });
    document.getElementById('add-course').addEventListener('click', () => openModal());

    main.querySelectorAll('.g-grade').forEach(sel => sel.addEventListener('change', async () => {
      try {
        await api.put(`/api/academics/courses/${sel.dataset.id}`, { grade: sel.value });
        toast(sel.value ? `Nilai ${sel.value} tersimpan — IPS dihitung ulang` : 'Nilai dihapus', 'info');
        ctx.refresh();
      } catch (e) { toast(e.message, 'error'); }
    }));
    main.querySelectorAll('.c-edit').forEach(b => b.addEventListener('click', () => {
      openModal(courses.find(c => String(c.id) === String(b.dataset.id)));
    }));
    main.querySelectorAll('.c-del').forEach(b => b.addEventListener('click', async () => {
      const c = courses.find(x => String(x.id) === String(b.dataset.id));
      if (!confirm(`Hapus matkul "${c.course_name}"?`)) return;
      await api.del(`/api/academics/courses/${c.id}`);
      toast('Matkul dihapus', 'info');
      ctx.refresh();
    }));
  }

  injectFormStyles();
  await load();
}

function injectFormStyles() {
  if (document.getElementById('g-form-style')) return;
  const s = document.createElement('style');
  s.id = 'g-form-style';
  s.textContent = `.g-lbl{font-size:11px;font-weight:600;color:#475569;display:block;margin-bottom:4px}
  .g-inp{width:100%;border:1px solid #cbd5e1;border-radius:0.6rem;padding:0.55rem 0.8rem;font-size:0.85rem;outline:none}
  .g-inp:focus{border-color:#6366f1;box-shadow:0 0 0 3px #e0e7ff}`;
  document.head.appendChild(s);
}
