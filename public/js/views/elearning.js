/**
 * E-Learning — materi kuliah, jadwal ujian, dan pengumuman.
 */
import { esc, toast } from '../app.js';
import { injectFormStyles, todayStr, fmtDate } from './ui.js';

export const subtitle = () => 'Materi kuliah, jadwal ujian, dan pengumuman kampus';

const TABS = [
  { key: 'materi', label: '📚 Materi Kuliah' },
  { key: 'ujian', label: '🗓️ Jadwal Ujian' },
  { key: 'pengumuman', label: '📢 Pengumuman' }
];
const EXAM_TYPES = ['UTS', 'UAS', 'Quiz', 'Remedial'];
const EXAM_CLS = {
  UTS: 'bg-amber-100 text-amber-700',
  UAS: 'bg-rose-100 text-rose-700',
  Quiz: 'bg-sky-100 text-sky-700',
  Remedial: 'bg-violet-100 text-violet-700'
};

export async function render(main, ctx) {
  const { api } = ctx;
  let tab = sessionStorage.getItem('gradify_elearning_tab') || 'materi';
  let courses = [];
  let materials = [];
  let exams = [];
  let announcements = [];
  let editExamId = null;
  let editAnnId = null;

  async function loadCourses() {
    const res = await api.get('/api/academics/courses').catch(() => ({ courses: [] }));
    courses = res.courses || [];
  }

  async function loadTab() {
    if (tab === 'materi') {
      const res = await api.get('/api/academics/materials');
      materials = res.materials || [];
    } else if (tab === 'ujian') {
      const res = await api.get('/api/academics/exams');
      exams = res.exams || [];
    } else {
      const res = await api.get('/api/academics/announcements');
      announcements = res.announcements || [];
    }
    draw();
  }

  function courseOptions(selected) {
    return '<option value="">— Tanpa mata kuliah —</option>' +
      courses.map(c => `<option value="${c.id}" ${String(selected) === String(c.id) ? 'selected' : ''}>${esc(c.course_name)}</option>`).join('');
  }

  function tabsHtml() {
    return `<div class="flex flex-wrap gap-1.5 mb-5">
      ${TABS.map(t => `<button class="el-tab chip-btn ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-300 text-slate-600'}" data-tab="${t.key}">${t.label}</button>`).join('')}
    </div>`;
  }

  function draw() {
    main.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <div>
        <h2 class="font-extrabold text-slate-800 text-lg">🎓 Ruang Kuliah Digital</h2>
        <p class="text-xs text-slate-500">Materi, jadwal ujian, dan informasi kampus dalam satu tempat.</p>
      </div>
    </div>
    ${tabsHtml()}
    <div id="el-body">${tab === 'materi' ? materiHtml() : tab === 'ujian' ? ujianHtml() : pengumumanHtml()}</div>`;

    injectFormStyles();
    main.querySelectorAll('.el-tab').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.tab;
      sessionStorage.setItem('gradify_elearning_tab', tab);
      editExamId = null; editAnnId = null;
      loadTab();
    }));
    if (tab === 'materi') wireMateri();
    else if (tab === 'ujian') wireUjian();
    else wirePengumuman();
  }

  /* ---------------- Materi ---------------- */
  function materiHtml() {
    return `<div class="grid lg:grid-cols-3 gap-6">
      <section class="lg:col-span-2 space-y-3">
        ${materials.length === 0 ? empty('📚', 'Belum ada materi', 'Unggah modul, slide, atau tautan materi kuliah.') :
          materials.map(m => `<div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-bold text-sm text-slate-800">${esc(m.title)}</p>
                <p class="text-[11px] text-slate-500">${esc(m.course_name || 'Tanpa mata kuliah')} · ${fmtDate(m.created_at)}</p>
              </div>
              <button class="mat-del text-slate-300 hover:text-rose-600" data-id="${m.id}" title="Hapus">🗑</button>
            </div>
            ${m.description ? `<p class="text-[11px] text-slate-600 mt-1.5">${esc(m.description)}</p>` : ''}
            <div class="flex flex-wrap gap-1.5 mt-2">
              ${m.file_url ? `<span class="file-chip">📎 <a href="${esc(m.file_url)}" target="_blank" rel="noopener">${esc(m.file_name || 'Unduh file')}</a></span>` : ''}
              ${m.link_url ? `<a class="file-chip ok" href="${esc(m.link_url)}" target="_blank" rel="noopener">🔗 Tautan materi</a>` : ''}
              ${!m.file_url && !m.link_url ? '<span class="text-[10px] text-slate-400">Tanpa lampiran</span>' : ''}
            </div>
          </div>`).join('')}
      </section>
      <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 h-fit">
        <h3 class="font-bold text-slate-800 text-sm mb-3">➕ Unggah Materi</h3>
        <form id="mat-form" class="space-y-3">
          <div><label class="g-lbl">Judul *</label><input name="title" required class="g-inp" placeholder="cth. Slide Pertemuan 5" /></div>
          <div><label class="g-lbl">Mata Kuliah</label><select name="course_id" class="g-inp">${courseOptions()}</select></div>
          <div><label class="g-lbl">Deskripsi</label><textarea name="description" rows="2" class="g-inp" placeholder="opsional"></textarea></div>
          <div><label class="g-lbl">Tautan (opsional)</label><input name="link_url" type="url" class="g-inp" placeholder="https://..." /></div>
          <div>
            <label class="g-lbl">File (opsional)</label>
            <input name="file" type="file" class="g-inp text-xs" />
            <p class="text-[10px] text-slate-400 mt-1">Maks 20 MB. PDF, dokumen, spreadsheet, presentasi, gambar, atau ZIP.</p>
          </div>
          <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm">Unggah Materi</button>
        </form>
      </section>
    </div>`;
  }

  function wireMateri() {
    main.querySelectorAll('.mat-del').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Hapus materi ini beserta filenya?')) return;
      try {
        await api.del(`/api/academics/materials/${b.dataset.id}`);
        toast('Materi dihapus', 'info');
        loadTab();
      } catch (e) { toast(e.message, 'error'); }
    }));
    main.querySelector('#mat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      try {
        await api.upload('/api/academics/materials', fd);
        toast('Materi berhasil diunggah');
        loadTab();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  /* ---------------- Ujian ---------------- */
  function ujianHtml() {
    return `<div class="grid lg:grid-cols-3 gap-6">
      <section class="lg:col-span-2 space-y-3">
        ${exams.length === 0 ? empty('🗓️', 'Belum ada jadwal ujian', 'Tambahkan jadwal UTS, UAS, quiz, atau remedial.') :
          exams.map(e => `<div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div class="bg-indigo-50 text-indigo-700 rounded-xl px-3 py-2 text-center min-w-[76px] shrink-0">
              <p class="font-mono font-bold text-xs">${esc(e.start_time || '--:--')}</p>
              <p class="font-mono text-[9px] text-indigo-500">${esc(e.end_time || '')}</p>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-bold text-sm text-slate-800 truncate">${esc(e.course_name || 'Tanpa mata kuliah')}</p>
                <span class="text-[10px] font-semibold rounded-full px-2 py-0.5 ${EXAM_CLS[e.type] || EXAM_CLS.UTS}">${esc(e.type)}</span>
              </div>
              <p class="text-[11px] text-slate-500">📅 ${fmtDate(e.exam_date)} · ${esc(e.room || 'Ruangan belum diisi')}</p>
              ${e.notes ? `<p class="text-[10px] text-slate-400 mt-0.5 truncate">${esc(e.notes)}</p>` : ''}
            </div>
            <div class="flex flex-col gap-1 shrink-0">
              <button class="ex-edit text-[10px] text-indigo-600 hover:underline" data-id="${e.id}">Edit</button>
              <button class="ex-del text-[10px] text-slate-400 hover:text-rose-600" data-id="${e.id}">Hapus</button>
            </div>
          </div>`).join('')}
      </section>
      <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 h-fit">
        <h3 class="font-bold text-slate-800 text-sm mb-3">${editExamId ? '✏️ Edit Jadwal Ujian' : '➕ Tambah Jadwal Ujian'}</h3>
        <form id="ex-form" class="space-y-3">
          <div><label class="g-lbl">Mata Kuliah</label><select name="course_id" class="g-inp">${courseOptions()}</select></div>
          <div class="grid grid-cols-2 gap-2">
            <div><label class="g-lbl">Jenis</label><select name="type" class="g-inp">${EXAM_TYPES.map(t => `<option>${t}</option>`).join('')}</select></div>
            <div><label class="g-lbl">Tanggal *</label><input name="exam_date" type="date" required value="${todayStr()}" class="g-inp" /></div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div><label class="g-lbl">Mulai</label><input name="start_time" type="time" class="g-inp" /></div>
            <div><label class="g-lbl">Selesai</label><input name="end_time" type="time" class="g-inp" /></div>
          </div>
          <div><label class="g-lbl">Ruangan</label><input name="room" class="g-inp" placeholder="cth. I/3 atau LAB A" /></div>
          <div><label class="g-lbl">Catatan</label><input name="notes" class="g-inp" placeholder="opsional" /></div>
          <div class="flex gap-2">
            <button class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm">${editExamId ? 'Simpan' : 'Tambah'}</button>
            ${editExamId ? '<button type="button" id="ex-cancel" class="text-sm text-slate-500 px-3 rounded-xl hover:bg-slate-100">Batal</button>' : ''}
          </div>
        </form>
      </section>
    </div>`;
  }

  function fillExamForm(e) {
    const f = main.querySelector('#ex-form');
    if (!f) return;
    f.elements['course_id'].value = e.course_id || '';
    f.elements['type'].value = e.type || 'UTS';
    f.elements['exam_date'].value = e.exam_date || '';
    f.elements['start_time'].value = e.start_time || '';
    f.elements['end_time'].value = e.end_time || '';
    f.elements['room'].value = e.room || '';
    f.elements['notes'].value = e.notes || '';
  }

  function wireUjian() {
    main.querySelectorAll('.ex-del').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Hapus jadwal ujian ini?')) return;
      try {
        await api.del(`/api/academics/exams/${b.dataset.id}`);
        toast('Jadwal ujian dihapus', 'info');
        editExamId = null;
        loadTab();
      } catch (e) { toast(e.message, 'error'); }
    }));
    main.querySelectorAll('.ex-edit').forEach(b => b.addEventListener('click', () => {
      const e = exams.find(x => String(x.id) === String(b.dataset.id));
      if (!e) return;
      editExamId = e.id;
      draw();
      fillExamForm(e);
      main.querySelector('#ex-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    main.querySelector('#ex-cancel')?.addEventListener('click', () => {
      editExamId = null; draw();
    });
    main.querySelector('#ex-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const payload = {
        course_id: f.get('course_id') || undefined,
        type: f.get('type'), exam_date: f.get('exam_date'),
        start_time: f.get('start_time') || null, end_time: f.get('end_time') || null,
        room: f.get('room') || null, notes: f.get('notes') || null
      };
      try {
        if (editExamId) {
          await api.put(`/api/academics/exams/${editExamId}`, payload);
          toast('Jadwal ujian diperbarui');
        } else {
          await api.post('/api/academics/exams', payload);
          toast('Jadwal ujian ditambahkan');
        }
        editExamId = null;
        loadTab();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  /* ---------------- Pengumuman ---------------- */
  function pengumumanHtml() {
    return `<div class="grid lg:grid-cols-3 gap-6">
      <section class="lg:col-span-2 space-y-3">
        ${announcements.length === 0 ? empty('📢', 'Belum ada pengumuman', 'Simpan pengumuman kampus agar tidak terlewat.') :
          announcements.map(a => `<div class="bg-white border ${a.is_pinned ? 'border-amber-300' : 'border-slate-200'} rounded-2xl p-4 shadow-sm">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  ${a.is_pinned ? '<span class="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">📌 Disematkan</span>' : ''}
                  <p class="font-bold text-sm text-slate-800">${esc(a.title)}</p>
                </div>
                <p class="text-[10px] text-slate-400 mt-0.5">${esc(a.source || 'Kampus')} · ${fmtDate(a.published_at)}</p>
              </div>
              <div class="flex gap-2 shrink-0">
                <button class="an-edit text-[10px] text-indigo-600 hover:underline" data-id="${a.id}">Edit</button>
                <button class="an-del text-slate-300 hover:text-rose-600" data-id="${a.id}">🗑</button>
              </div>
            </div>
            ${a.content ? `<p class="text-[12px] text-slate-600 mt-2 whitespace-pre-line">${esc(a.content)}</p>` : ''}
          </div>`).join('')}
      </section>
      <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 h-fit">
        <h3 class="font-bold text-slate-800 text-sm mb-3">${editAnnId ? '✏️ Edit Pengumuman' : '➕ Tambah Pengumuman'}</h3>
        <form id="an-form" class="space-y-3">
          <div><label class="g-lbl">Judul *</label><input name="title" required class="g-inp" /></div>
          <div><label class="g-lbl">Sumber</label><input name="source" class="g-inp" placeholder="cth. BAAK / Prodi / Dosen" /></div>
          <div><label class="g-lbl">Isi</label><textarea name="content" rows="4" class="g-inp"></textarea></div>
          <label class="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" name="is_pinned" class="rounded" /> Sematkan di atas</label>
          <div class="flex gap-2">
            <button class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm">${editAnnId ? 'Simpan' : 'Tambah'}</button>
            ${editAnnId ? '<button type="button" id="an-cancel" class="text-sm text-slate-500 px-3 rounded-xl hover:bg-slate-100">Batal</button>' : ''}
          </div>
        </form>
      </section>
    </div>`;
  }

  function wirePengumuman() {
    main.querySelectorAll('.an-del').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Hapus pengumuman ini?')) return;
      try {
        await api.del(`/api/academics/announcements/${b.dataset.id}`);
        toast('Pengumuman dihapus', 'info');
        editAnnId = null;
        loadTab();
      } catch (e) { toast(e.message, 'error'); }
    }));
    main.querySelectorAll('.an-edit').forEach(b => b.addEventListener('click', () => {
      const a = announcements.find(x => String(x.id) === String(b.dataset.id));
      if (!a) return;
      editAnnId = a.id;
      draw();
      const f = main.querySelector('#an-form');
      f.elements['title'].value = a.title || '';
      f.elements['source'].value = a.source || '';
      f.elements['content'].value = a.content || '';
      f.elements['is_pinned'].checked = !!a.is_pinned;
      f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    main.querySelector('#an-cancel')?.addEventListener('click', () => { editAnnId = null; draw(); });
    main.querySelector('#an-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const payload = {
        title: f.get('title'), source: f.get('source') || null,
        content: f.get('content') || '', is_pinned: f.get('is_pinned') ? 1 : 0
      };
      try {
        if (editAnnId) {
          await api.put(`/api/academics/announcements/${editAnnId}`, payload);
          toast('Pengumuman diperbarui');
        } else {
          await api.post('/api/academics/announcements', payload);
          toast('Pengumuman ditambahkan');
        }
        editAnnId = null;
        loadTab();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  function empty(icon, title, sub) {
    return `<div class="bg-white border border-slate-200 rounded-2xl p-10 text-center">
      <p class="text-4xl">${icon}</p>
      <p class="font-semibold text-slate-700 mt-2">${esc(title)}</p>
      <p class="text-xs text-slate-400 mt-1">${esc(sub)}</p>
    </div>`;
  }

  await loadCourses();
  await loadTab();
}
