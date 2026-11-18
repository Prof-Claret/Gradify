/**
 * Tugas & Upload — kelola tugas, lampiran soal, dan unggah jawaban.
 */
import { esc, toast } from '../app.js';
import { injectFormStyles, todayStr, fmtDate, daysLeft } from './ui.js';

export const subtitle = () => 'Kelola tugas, lampiran soal, dan unggah jawaban';

const PRIORITY = {
  tinggi: { label: 'Tinggi', cls: 'bg-rose-100 text-rose-700' },
  sedang: { label: 'Sedang', cls: 'bg-amber-100 text-amber-700' },
  rendah: { label: 'Rendah', cls: 'bg-emerald-100 text-emerald-700' }
};
const TYPE_CLS = {
  ujian: 'bg-orange-100 text-orange-700',
  quiz: 'bg-sky-100 text-sky-700',
  project: 'bg-violet-100 text-violet-700',
  presentasi: 'bg-fuchsia-100 text-fuchsia-700',
  tugas: 'bg-blue-100 text-blue-700'
};
const TYPES = ['tugas', 'ujian', 'quiz', 'project', 'presentasi'];
const TYPE_LABEL = { tugas: 'Tugas', ujian: 'Ujian', quiz: 'Quiz', project: 'Project', presentasi: 'Presentasi' };

export async function render(main, ctx) {
  const { api } = ctx;
  let tasks = [];
  let courses = [];
  let typeFilter = 'all';
  let statusFilter = 'all';

  async function load() {
    const [t, c] = await Promise.all([
      api.get('/api/academics/tasks?scope=all'),
      api.get('/api/academics/courses').catch(() => ({ courses: [] }))
    ]);
    tasks = t.tasks || [];
    courses = c.courses || [];
    draw();
  }

  function visible() {
    return tasks.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter === 'done') return t.status === 'done';
      if (statusFilter === 'pending') return t.status !== 'done';
      if (statusFilter === 'submitted') return !!t.submission_url;
      return true;
    });
  }

  function stats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const submitted = tasks.filter(t => t.submission_url).length;
    const overdue = tasks.filter(t => t.status !== 'done' && daysLeft(t.due_date) < 0).length;
    return { total, done, submitted, overdue };
  }

  function statCard(label, value, sub, icon, cls) {
    return `<div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-center gap-1.5 mb-1"><span>${icon}</span><p class="text-[11px] font-medium text-slate-500">${esc(label)}</p></div>
      <p class="text-2xl font-extrabold ${cls}">${esc(value)}</p>
      <p class="text-[10px] text-slate-400 mt-0.5">${esc(sub)}</p>
    </div>`;
  }

  function chip(label, active, data, group) {
    return `<button class="chip-btn ${active ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-300 text-slate-600'}" data-${group}="${data}">${esc(label)}</button>`;
  }

  function taskCard(t) {
    const p = PRIORITY[t.priority] || PRIORITY.sedang;
    const typeCls = TYPE_CLS[t.type] || TYPE_CLS.tugas;
    const done = t.status === 'done';
    const d = daysLeft(t.due_date);
    const late = !done && d < 0;
    const dueCls = late ? 'text-rose-600' : d <= 2 ? 'text-amber-600' : 'text-slate-500';
    return `<div class="bg-white border ${late ? 'border-rose-200' : 'border-slate-200'} rounded-2xl p-4 shadow-sm flex flex-col">
      <div class="flex items-start gap-2.5">
        <button class="tk-done shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${done ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-transparent hover:border-indigo-500'}" data-id="${t.id}" title="Tandai selesai">✓</button>
        <div class="min-w-0 flex-1">
          <p class="font-bold text-sm ${done ? 'line-through text-slate-400' : 'text-slate-800'}">${esc(t.title)}</p>
          <p class="text-[11px] text-slate-500 truncate">${esc(t.course_name || 'Tanpa mata kuliah')}</p>
        </div>
        <span class="text-[10px] font-semibold rounded-full px-2 py-1 shrink-0 ${typeCls}">${esc(TYPE_LABEL[t.type] || t.type)}</span>
      </div>

      <div class="flex flex-wrap items-center gap-2 mt-2">
        <span class="text-[10px] font-semibold rounded-full px-2 py-0.5 ${p.cls}">Prioritas ${p.label}</span>
        <span class="text-[11px] ${dueCls}">📅 ${fmtDate(t.due_date)}${d !== null ? ` · ${d < 0 ? 'lewat ' + Math.abs(d) + ' hari' : d === 0 ? 'hari ini' : d + ' hari lagi'}` : ''}</span>
      </div>

      ${t.description ? `<p class="text-[11px] text-slate-600 mt-2 line-clamp-2">${esc(t.description)}</p>` : ''}

      <div class="flex flex-wrap items-center gap-1.5 mt-3">
        ${t.attachment_url
          ? `<span class="file-chip">📎 <a href="${esc(t.attachment_url)}" target="_blank" rel="noopener">${esc(t.attachment_name || 'Lampiran')}</a><button class="tk-att-del text-current opacity-60 hover:opacity-100" data-id="${t.id}" title="Hapus lampiran">✕</button></span>`
          : ''}
        ${t.submission_url
          ? `<span class="file-chip ok">📤 <a href="${esc(t.submission_url)}" target="_blank" rel="noopener">${esc(t.submission_name || 'Jawaban')}</a><button class="tk-sub-del text-current opacity-60 hover:opacity-100" data-id="${t.id}" title="Hapus jawaban">✕</button></span>`
          : `<label class="cursor-pointer text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full px-2.5 py-1">📤 Unggah Jawaban<input type="file" class="tk-sub-file hidden" data-id="${t.id}" /></label>`}
      </div>

      <div class="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
        <div class="flex gap-2">
          <button class="tk-edit text-[11px] font-semibold text-indigo-600 hover:underline" data-id="${t.id}">✏️ Edit</button>
          <label class="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-indigo-600">📎 Lampiran<input type="file" class="tk-att-file hidden" data-id="${t.id}" /></label>
        </div>
        <button class="tk-del text-slate-300 hover:text-rose-600 text-sm" data-id="${t.id}" title="Hapus tugas">🗑</button>
      </div>
      ${t.submitted_at ? `<p class="text-[10px] text-emerald-600 mt-1.5">Terkirim ${new Date(String(t.submitted_at).replace(' ', 'T') + 'Z').toLocaleString('id-ID')}</p>` : ''}
    </div>`;
  }

  function draw() {
    const s = stats();
    const list = visible();
    main.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div class="flex flex-wrap items-center gap-1.5">
        ${chip('Semua', typeFilter === 'all', 'all', 'type')}
        ${TYPES.map(t => chip(TYPE_LABEL[t], typeFilter === t, t, 'type')).join('')}
      </div>
      <button id="tk-add" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">+ Tugas Baru</button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      ${statCard('Total Tugas', s.total, 'semua jenis', '📋', 'text-indigo-600')}
      ${statCard('Belum Selesai', tasks.filter(t => t.status !== 'done').length, 'perlu dikerjakan', '⏳', 'text-amber-600')}
      ${statCard('Sudah Dikumpul', s.submitted, 'file jawaban terunggah', '📤', 'text-emerald-600')}
      ${statCard('Lewat Deadline', s.overdue, 'segera tindak lanjuti', '⚠️', 'text-rose-600')}
    </div>

    <div class="flex flex-wrap items-center gap-1.5 mb-4">
      ${chip('Semua Status', statusFilter === 'all', 'all', 'status')}
      ${chip('Belum', statusFilter === 'pending', 'pending', 'status')}
      ${chip('Sudah Dikumpul', statusFilter === 'submitted', 'submitted', 'status')}
      ${chip('Selesai', statusFilter === 'done', 'done', 'status')}
    </div>

    ${list.length === 0
      ? `<div class="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p class="text-4xl">🎉</p>
          <p class="font-semibold text-slate-700 mt-2">Tidak ada tugas pada filter ini</p>
          <p class="text-xs text-slate-400 mt-1">Tambahkan tugas baru atau ubah filter.</p>
        </div>`
      : `<div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">${list.map(taskCard).join('')}</div>`}

    <div id="tk-modal" class="hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm items-center justify-center p-4"></div>`;

    injectFormStyles();
    wire();
  }

  function wire() {
    main.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', () => {
      typeFilter = b.dataset.type; draw();
    }));
    main.querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', () => {
      statusFilter = b.dataset.status; draw();
    }));
    main.querySelector('#tk-add').addEventListener('click', () => openModal());

    main.querySelectorAll('.tk-done').forEach(b => b.addEventListener('click', async () => {
      try {
        await api.put(`/api/academics/tasks/${b.dataset.id}`, { action: 'toggle' });
        load();
      } catch (e) { toast(e.message, 'error'); }
    }));
    main.querySelectorAll('.tk-del').forEach(b => b.addEventListener('click', async () => {
      const t = tasks.find(x => String(x.id) === String(b.dataset.id));
      if (!t || !confirm(`Hapus tugas "${t.title}"?`)) return;
      try {
        await api.del(`/api/academics/tasks/${t.id}`);
        toast('Tugas dihapus', 'info');
        load();
      } catch (e) { toast(e.message, 'error'); }
    }));
    main.querySelectorAll('.tk-edit').forEach(b => b.addEventListener('click', () => {
      openModal(tasks.find(x => String(x.id) === String(b.dataset.id)));
    }));

    main.querySelectorAll('.tk-att-file').forEach(input => input.addEventListener('change', () => {
      uploadFile(input, `/api/academics/tasks/${input.dataset.id}/attachment`, 'Lampiran tugas diunggah');
    }));
    main.querySelectorAll('.tk-sub-file').forEach(input => input.addEventListener('change', () => {
      uploadFile(input, `/api/academics/tasks/${input.dataset.id}/submission`, 'Jawaban berhasil dikumpulkan');
    }));
    main.querySelectorAll('.tk-att-del').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Hapus lampiran tugas ini?')) return;
      try {
        await api.del(`/api/academics/tasks/${b.dataset.id}/attachment`);
        toast('Lampiran dihapus', 'info');
        load();
      } catch (e) { toast(e.message, 'error'); }
    }));
    main.querySelectorAll('.tk-sub-del').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Hapus file jawaban ini?')) return;
      try {
        await api.del(`/api/academics/tasks/${b.dataset.id}/submission`);
        toast('Jawaban dihapus', 'info');
        load();
      } catch (e) { toast(e.message, 'error'); }
    }));
  }

  async function uploadFile(input, path, okMsg) {
    const file = input.files && input.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.upload(path, fd);
      toast(okMsg);
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  function openModal(task) {
    const modal = main.querySelector('#tk-modal');
    const courseOptions = '<option value="">— Tanpa mata kuliah —</option>' +
      courses.map(c => `<option value="${c.id}" ${task && String(task.course_id) === String(c.id) ? 'selected' : ''}>${esc(c.course_name)}</option>`).join('');
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 class="font-bold text-slate-800">${task ? '✏️ Edit Tugas' : '➕ Tugas Baru'}</h3>
          <button id="tk-x" class="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>
        <form id="tk-form" class="p-5 space-y-3">
          <div>
            <label class="g-lbl">Judul *</label>
            <input name="title" required value="${task ? esc(task.title) : ''}" class="g-inp" placeholder="cth. Laporan Praktikum Jaringan" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="g-lbl">Mata Kuliah</label>
              <select name="course_id" class="g-inp">${courseOptions}</select>
            </div>
            <div>
              <label class="g-lbl">Jenis</label>
              <select name="type" class="g-inp">
                ${TYPES.map(t => `<option value="${t}" ${task && task.type === t ? 'selected' : ''}>${TYPE_LABEL[t]}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="g-lbl">Prioritas</label>
              <select name="priority" class="g-inp">
                ${Object.entries(PRIORITY).map(([k, v]) => `<option value="${k}" ${task && task.priority === k ? 'selected' : ''}>${v.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="g-lbl">Batas Waktu *</label>
              <input name="due_date" type="date" required value="${task ? esc(task.due_date) : todayStr()}" class="g-inp" />
            </div>
          </div>
          <div>
            <label class="g-lbl">Deskripsi</label>
            <textarea name="description" rows="2" class="g-inp" placeholder="opsional">${task ? esc(task.description || '') : ''}</textarea>
          </div>
          <div>
            <label class="g-lbl">Lampiran soal (opsional)</label>
            <input name="file" type="file" class="g-inp text-xs" />
            <p class="text-[10px] text-slate-400 mt-1">PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, gambar, TXT, CSV, atau ZIP (maks 20 MB).</p>
          </div>
          <div class="flex justify-end gap-2 pt-1">
            <button type="button" id="tk-cancel" class="text-sm text-slate-500 px-4 py-2 rounded-xl hover:bg-slate-100">Batal</button>
            <button class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-xl text-sm">${task ? 'Simpan Perubahan' : 'Tambah Tugas'}</button>
          </div>
        </form>
      </div>`;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
    modal.querySelector('#tk-x').addEventListener('click', close);
    modal.querySelector('#tk-cancel').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    modal.querySelector('#tk-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const fd = new FormData(form);
      const payload = {
        title: fd.get('title'),
        course_id: fd.get('course_id') || undefined,
        type: fd.get('type'),
        priority: fd.get('priority'),
        due_date: fd.get('due_date'),
        description: fd.get('description') || null
      };
      try {
        let id = task ? task.id : null;
        if (task) {
          await api.put(`/api/academics/tasks/${task.id}`, payload);
        } else {
          const res = await api.post('/api/academics/tasks', payload);
          id = res.id;
        }
        const file = fd.get('file');
        if (file && file.size) {
          const up = new FormData();
          up.append('file', file);
          await api.upload(`/api/academics/tasks/${id}/attachment`, up);
        }
        toast(task ? 'Tugas diperbarui' : 'Tugas berhasil ditambahkan');
        close();
        load();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  await load();
}
