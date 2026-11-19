/**
 * Course Management Module (Phase 1.2) — CRUD Matkul + Jadwal + Input Nilai
 */
import { esc, toast } from '../app.js';
import { injectFormStyles } from './ui.js';

export const subtitle = () => 'Kelola catalog mata kuliah per semester';

export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const GRADES = ['', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'E'];

export async function render(main, ctx) {
  const { api } = ctx;

  let semId = sessionStorage.getItem('gradify_course_sem') || 'active';
  let semesterRow = null;
  let dosenList = [];

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

    const { dosen: fetchedDosen } = await api.get('/api/academics/dosen').catch(() => ({ dosen: [] }));
    dosenList = fetchedDosen;

    draw(semesters, courses, dosenList);
  }

  function draw(semesters, courses, dosenList) {
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
    <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-slate-800">🕐 Jadwal Mingguan</h3>
        <span class="text-[10px] text-slate-400">07:00–21:00</span>
      </div>
      <div id="timetable" class="overflow-x-auto"></div>
    </div>

    <!-- Daftar Dosen -->
    <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-slate-800">👨‍🏫 Daftar Dosen</h3>
        <button id="add-dosen" class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg sm:px-4 sm:py-2">+ Tambah Dosen</button>
      </div>
      <div id="dosen-list" class="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
        ${dosenList.length ? dosenList.map(d => dosenCard(d)).join('') : '<p class="text-slate-400 text-xs">Belum ada dosen. Tambahkan dosen terlebih dahulu agar bisa dipilih saat input matkul.</p>'}
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
    wire(semesters, courses, dosenList);
  }

  function dosenCard(d) {
    return `<div class="border border-slate-200 rounded-xl p-3 bg-white">
      <p class="font-semibold text-sm text-slate-800 truncate">${esc(d.nama)}${d.nip_nidn ? ` <span class="text-[10px] text-slate-400 font-normal">(${esc(d.nip_nidn)})</span>` : ''}</p>
      <p class="text-[10px] text-slate-500 mt-0.5">${esc(d.email || d.telepon || '—')}</p>
      <div class="flex gap-1 mt-2">
        <button class="d-edit text-[10px] px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 font-semibold" data-id="${d.id}" title="Ubah nama">✏️</button>
        <button class="d-del text-[10px] px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 font-semibold" data-id="${d.id}" title="Hapus dosen">🗑</button>
      </div>
    </div>`;
  }

  /* ---------- timetable helper ---------- */
  const GRID_START = 7 * 60;   // 07:00 dalam menit
  const GRID_END = 21 * 60;    // 21:00
  const PX_PER_MIN = 1;        // 60 px per jam

  function toMinutes(t) {
    if (!t) return null;
    const [h, m] = String(t).split(':').map(Number);
    if (h == null || m == null || Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  function bindTimetable(courses) {
    const host = main.querySelector('#timetable');
    if (!host) return;

    const totalMinutes = GRID_END - GRID_START;
    const totalHeight = totalMinutes * PX_PER_MIN;
    const hours = [];
    for (let m = GRID_START; m <= GRID_END; m += 60) hours.push(m);

    const hourLines = () => hours
      .filter(m => m < GRID_END)
      .map(m => `<div class="absolute left-0 right-0 border-t ${m % 120 === 0 ? 'border-slate-200' : 'border-slate-100'}" style="top:${(m - GRID_START) * PX_PER_MIN}px"></div>`)
      .join('');

    const blocksFor = (day) => courses
      .filter(c => c.day === day && c.start_time)
      .map(c => {
        const s = toMinutes(c.start_time);
        const e = toMinutes(c.end_time);
        if (s == null) return '';
        const end = e != null && e > s ? e : s + 60;
        const top = Math.max(0, (s - GRID_START) * PX_PER_MIN);
        const bottom = Math.min(totalMinutes, (end - GRID_START) * PX_PER_MIN);
        const height = Math.max(bottom - top - 2, 20);
        const label = `${c.course_name} · ${c.start_time || ''}${c.end_time ? '–' + c.end_time : ''}${c.room ? ' · ' + c.room : ''}`;
        return `<div class="absolute left-1 right-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white px-1.5 py-1 overflow-hidden shadow-sm ring-1 ring-indigo-700/20 transition-colors"
          style="top:${top}px;height:${height}px" title="${esc(label)}">
          <p class="font-bold text-[10px] leading-[1.15] break-words">${esc(c.course_name)}</p>
          <p class="text-[9px] opacity-90 font-mono mt-0.5">${esc(c.start_time || '')}${c.end_time ? '–' + esc(c.end_time) : ''}</p>
          <p class="text-[9px] opacity-90 truncate">${esc(c.room || '')}</p>
        </div>`;
      })
      .join('');

    const todayIdx = (new Date().getDay() + 6) % 7;

    host.innerHTML = `
      <div class="min-w-[760px]">
        <div class="grid border-b border-slate-200" style="grid-template-columns:56px repeat(${DAYS.length},minmax(0,1fr))">
          <div class="bg-slate-50 px-1 py-2 text-[10px] font-bold text-slate-400 text-center">Jam</div>
          ${DAYS.map((d, i) => `<div class="border-l border-slate-200 px-1 py-2 text-[11px] font-bold text-center ${i === todayIdx ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-600'}">${d}</div>`).join('')}
        </div>
        <div class="grid" style="grid-template-columns:56px repeat(${DAYS.length},minmax(0,1fr))">
          <div class="relative border-r border-slate-200" style="height:${totalHeight}px">
            ${hours.map(m => {
              const hh = String(Math.floor(m / 60)).padStart(2, '0');
              return `<div class="absolute right-1 text-[9px] font-mono text-slate-400" style="top:${(m - GRID_START) * PX_PER_MIN}px">${hh}:00</div>`;
            }).join('')}
          </div>
          ${DAYS.map(day => `
            <div class="relative border-l border-slate-200" style="height:${totalHeight}px">
              ${hourLines()}
              ${blocksFor(day)}
            </div>`).join('')}
        </div>
      </div>`;
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
            <select name="dosen_id" class="g-inp" id="cm-dosen-select">
              <option value="">— Pilih dosen —</option>
              ${dosenList.map(d => `<option value="${d.id}">${esc(d.nama)}</option>`).join('')}
            </select>
            <input name="lecturer" class="g-inp mt-2" placeholder="Ketik nama dosen (jika pilih sendiri)" value="${course ? esc(course.lecturer || '') : ''}" />
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

    // ui.js sudah membuat style tag saat boot; tidak perlu membuat ulang
    const close = () => modal.classList.add('hidden');
    body.querySelector('#cm-close').addEventListener('click', close);
    body.querySelector('#cm-cancel').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    injectFormStyles(); // pakai style global dari ui.js

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

    const dosenSel = body.querySelector('#cm-dosen-select');
    const lecturerInp = form.elements['lecturer'];
    const contactInp = form.elements['lecturer_contact'];
    if (course) {
      const match = dosenList.find(d => d.nama === course.lecturer);
      if (match) dosenSel.value = String(match.id);
    }
    dosenSel.addEventListener('change', () => {
      const d = dosenList.find(x => String(x.id) === String(dosenSel.value));
      if (d) {
        lecturerInp.value = d.nama;
        if (d.email || d.telepon) contactInp.value = d.email || d.telepon;
      }
    });

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

  function wire(semesters, courses, dosenList) {
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

    /* ---------- Dosen CRUD ---------- */
    const addBtn = document.getElementById('add-dosen');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        addBtn.classList.add('hidden');
        const row = document.createElement('div');
        row.id = 'dosen-add-row';
        row.className = 'grid sm:grid-cols-4 gap-2 mb-3';
        row.innerHTML = `
          <input id="d-new-nama" placeholder="Nama dosen" class="g-inp" />
          <input id="d-new-nip" placeholder="NIP/NIDN" class="g-inp" />
          <input id="d-new-email" placeholder="Email" class="g-inp" />
          <input id="d-new-telp" placeholder="Telepon" class="g-inp" />
          <button id="d-save" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-2 rounded-lg sm:col-span-2">Simpan</button>
          <button id="d-cancel" class="text-xs text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-100 sm:col-span-2">Batal</button>
        `;
        addBtn.parentElement.after(row);
        row.querySelector('#d-cancel').addEventListener('click', () => {
          row.remove();
          addBtn.classList.remove('hidden');
        });
        row.querySelector('#d-save').addEventListener('click', async () => {
          const nama = row.querySelector('#d-new-nama').value.trim();
          if (!nama) return toast('Nama dosen wajib diisi.', 'warn');
          try {
            await api.post('/api/academics/dosen', {
              nip_nidn: row.querySelector('#d-new-nip').value.trim() || null,
              nama,
              email: row.querySelector('#d-new-email').value.trim() || null,
              telepon: row.querySelector('#d-new-telp').value.trim() || null
            });
            toast('Dosen ditambahkan');
            load();
          } catch (err) { toast(err.message, 'error'); }
        });
      });
    }

    main.querySelectorAll('.d-edit').forEach(b => b.addEventListener('click', async () => {
      const d = dosenList.find(x => String(x.id) === String(b.dataset.id));
      if (!d) return;
      const nama = prompt('Ubah nama dosen:', d.nama);
      if (nama === null || !nama.trim()) return;
      try {
        await api.put(`/api/academics/dosen/${d.id}`, { nama: nama.trim() });
        toast('Dosen diperbarui');
        load();
      } catch (err) { toast(err.message, 'error'); }
    }));
    main.querySelectorAll('.d-del').forEach(b => b.addEventListener('click', async () => {
      const d = dosenList.find(x => String(x.id) === String(b.dataset.id));
      if (!d || !confirm(`Hapus dosen "${d.nama}"?`)) return;
      try {
        await api.del(`/api/academics/dosen/${d.id}`);
        toast('Dosen dihapus', 'info');
        load();
      } catch (err) { toast(err.message, 'error'); }
    }));
  }

  await load();
}
