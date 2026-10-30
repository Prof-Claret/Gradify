/**
 * Dashboard & Task Tracker (Phase 1.3)
 */
import { esc, rerenderMath, fmtIDR } from '../app.js';

export const subtitle = () => 'Ringkasan agenda akademik hari ini';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const PRIORITY = {
  tinggi: { label: 'Tinggi', cls: 'bg-rose-100 text-rose-700' },
  sedang: { label: 'Sedang', cls: 'bg-amber-100 text-amber-700' },
  rendah: { label: 'Rendah', cls: 'bg-emerald-100 text-emerald-700' }
};

export async function render(main, ctx) {
  const { api, toast, navigate } = ctx;

  /* ---- fetch all data in parallel ---- */
  const [transcript, activeCoursesData, tasksUp, budget] = await Promise.all([
    api.get('/api/academics/transcript'),
    api.get('/api/academics/courses'),
    api.get('/api/academics/tasks?scope=upcoming'),
    api.get('/api/life/budget').catch(() => ({ totals: { balance: 0 } }))
  ]);

  const activeCourses = activeCoursesData.courses || [];

  const { summary, target_gpa } = transcript;
  const pending = (tasksUp.tasks || []).slice(0, 6);
  const todayName = DAYS[(new Date().getDay() + 6) % 7];
  const todayClass = activeCourses.filter(c => c.day === todayName);

  main.innerHTML = `
  <!-- Hero greeting -->
  <div class="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 rounded-2xl p-4 sm:p-6 text-white mb-6 shadow-lg">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-indigo-200 text-xs sm:text-sm">${esc(todayName)}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h2 class="text-xl sm:text-2xl font-extrabold mt-1">Halo, ${esc(ctx.user.full_name.split(' ')[0])}! 👋</h2>
        <p class="text-indigo-100 text-xs sm:text-sm mt-1">${esc(ctx.user.faculty || '')} · Semester ${ctx.user.active_semester} · Target IPK ${target_gpa}</p>
      </div>
      <div class="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
        <button id="q-add-task" class="flex-1 sm:flex-none text-center bg-white/15 hover:bg-white/25 backdrop-blur px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition">+ Tugas Baru</button>
        <button id="q-check-promote" class="flex-1 sm:flex-none text-center bg-white text-indigo-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-50 transition">Naik Semester →</button>
      </div>
    </div>
  </div>

  <!-- Stat cards -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6" id="stat-cards">
    ${statCard('IPK Kumulatif', summary.ipk.toFixed(2) || '-', `Predikat: ${summary.predikat}`, '🎯', summary.ipk >= (target_gpa - 0.3) ? 'text-emerald-600' : 'text-rose-600')}
    ${statCard('Sudah Dinilai', `${summary.total_sks_graded} SKS`, `Take: ${summary.total_sks_taken} SKS`, '📋', 'text-indigo-600')}
    ${statCard('Maks SKS Berikutnya', `${summary.max_sks_next} SKS`, 'Sesuai regulasi IPS', '⚖️', 'text-indigo-600')}
    ${statCard('Saldo Budget Bulan Ini', fmtIDR(budget.totals?.balance || 0), 'Kos & harian', '💰', (budget.totals?.balance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600')}
  </div>

  <div class="grid lg:grid-cols-3 gap-6 mb-6">
    <!-- Today agenda -->
    <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-slate-800 text-sm sm:text-base">📅 Jadwal Hari Ini — ${esc(todayName)}</h3>
        <button id="goto-courses" class="text-xs text-indigo-600 font-medium hover:underline">Kelola Matkul →</button>
      </div>
      ${todayClass.length === 0 ? emptyState('🕊️', 'Tidak ada kelas hari ini', 'Fokus tugas atau istirahat!')
      : `<div class="space-y-2">${todayClass.map(c => `
        <div class="flex items-center gap-3 border border-slate-200 rounded-xl p-3 hover:border-indigo-300 transition">
          <div class="bg-indigo-50 text-indigo-700 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-center min-w-[75px] sm:min-w-[90px] shrink-0">
            <p class="font-mono font-bold text-xs sm:text-sm">${esc(c.start_time || '--:--')}</p>
            <p class="font-mono text-[9px] sm:text-[10px] text-indigo-500">${esc(c.end_time || '')}</p>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-xs sm:text-sm text-slate-800 truncate">${esc(c.course_name)}</p>
            <p class="text-[11px] sm:text-xs text-slate-500 truncate">${esc(c.room || '—')} · ${esc(c.lecturer || '—')} · ${c.sks} SKS</p>
          </div>
          <span class="text-[10px] bg-slate-100 rounded-full px-2 py-1 font-mono shrink-0 hidden sm:inline-block">${esc(c.course_code)}</span>
        </div>`).join('')}</div>`}
    </div>

    <!-- Deadline countdown -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
      <h3 class="font-bold text-slate-800 text-sm sm:text-base mb-3">⏳ Deadline Terdekat</h3>
      ${pending.length === 0 ? emptyState('🎉', 'Semua tugas bersih!', 'Tidak ada deadline terdekat.') :
      `<div class="space-y-2">${pending.map(t => {
        const daysLeft = Math.ceil((new Date(t.due_date) - new Date()) / 86400000);
        const urgent = daysLeft <= 1, soon = daysLeft <= 3;
        return `<div class="flex items-center gap-2.5 border ${urgent ? 'border-rose-300 bg-rose-50' : 'border-slate-200'} rounded-xl p-2.5">
          <div class="min-w-0 flex-1">
            <p class="text-xs sm:text-sm font-medium text-slate-800 truncate">${esc(t.title)}</p>
            <p class="text-[10px] sm:text-[11px] text-slate-500 truncate">${esc(t.course_name || '')} · ${new Date(t.due_date).toLocaleDateString('id-ID')}</p>
          </div>
          <span class="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:py-1 rounded-full shrink-0 ${urgent ? 'bg-rose-600 text-white' : soon ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}">
            ${daysLeft === 0 ? 'HARI INI' : daysLeft < 0 ? 'LEWAT' : `${daysLeft} hari`}</span>
          <button class="t-done shrink-0 w-6 h-6 rounded-full border-2 border-indigo-300 hover:bg-indigo-500 text-transparent hover:text-white text-xs" data-id="${t.id}" title="Selesaikan">✓</button>
        </div>`;
      }).join('')}</div>`}
      <button id="goto-tasks" class="w-full mt-3 text-xs text-indigo-600 font-medium hover:underline text-center">Lihat Semua Tugas →</button>
    </div>
  </div>

  <!-- Quick add task -->
  <div id="quick-task" class="hidden bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-6"></div>

  <!-- Full task list -->
  <section id="task-section" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h3 class="font-bold text-slate-800 text-sm sm:text-base">📋 Semua Tugas</h3>
      <div class="flex gap-1.5 overflow-x-auto no-scrollbar py-1 max-w-full" id="task-filters">
        <button data-f="all" class="f-btn bg-indigo-600 text-white shrink-0">Semua</button>
        <button data-f="tugas" class="f-btn bg-slate-200 shrink-0">Tugas</button>
        <button data-f="ujian" class="f-btn bg-slate-200 shrink-0">Ujian</button>
        <button data-f="quiz" class="f-btn bg-slate-200 shrink-0">Quiz</button>
        <button data-f="project" class="f-btn bg-slate-200 shrink-0">Project</button>
      </div>
    </div>
    <div id="task-list" class="space-y-2"></div>
  </section>`;

  addStyles();
  loadTasks('all');
  wireEvents(api, toast, navigate, ctx);

  function statCard(label, value, sub, icon, valCls) {
    return `<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-3.5 sm:p-4">
      <div class="flex items-center gap-1.5 mb-1.5"><span class="text-base">${icon}</span><p class="text-[11px] sm:text-xs text-slate-500 font-medium truncate">${esc(label)}</p></div>
      <p class="text-lg sm:text-2xl font-extrabold ${valCls} truncate">${esc(value)}</p>
      <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">${esc(sub)}</p>
    </div>`;
  }
      <p class="text-[11px] text-slate-400 mt-1">${esc(sub)}</p>
    </div>`;
  }
  function emptyState(icon, title, sub) {
    return `<div class="text-center py-8"><p class="text-3xl">${icon}</p><p class="font-semibold text-slate-700 mt-2 text-sm">${esc(title)}</p><p class="text-xs text-slate-400">${esc(sub)}</p></div>`;
  }
}

function addStyles() {
  const s = document.createElement('style');
  s.textContent = `
    .f-btn { font-size: 11px; padding: .25rem .7rem; border-radius: 9999px; font-weight: 600; cursor: pointer; }
    .f-btn:hover { background: #c7d2fe; }
    .f-btn.on { background: #4f46e5 !important; color: white; }
    .t-done.done-check { background: #4f46e5 !important; color: white !important; border-color: #4f46e5; }`;
  if (!document.getElementById('g-dash-style')) { s.id = 'g-dash-style'; document.head.appendChild(s); }
}

async function loadTasks(filter = 'all') {
  const el = document.getElementById('task-list');
  if (!el) return;
  const { api, toast, navigate } = window.__gctx || {};
  try {
    const { tasks } = await api.get('/api/academics/tasks?scope=all');
    const list = filter === 'all' ? tasks : tasks.filter(t => t.type === filter);
    if (list.length === 0) {
      el.innerHTML = `<p class="text-sm text-slate-400 text-center py-6">Tidak ada tugas${filter !== 'all' ? ' dengan jenis ' + filter : ''}.</p>`;
      return;
    }
    el.innerHTML = list.map(t => {
      const p = PRIORITY[t.priority] || PRIORITY.sedang;
      const done = t.status === 'done';
      const late = !done && new Date(t.due_date + 'T23:59:59') < new Date();
      return `<div class="flex items-center gap-3 border border-slate-200 rounded-xl p-3 ${done ? 'opacity-50' : ''}">
        <button class="tw-done w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs shrink-0 ${done ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-transparent hover:border-indigo-500'}" data-id="${t.id}">✓</button>
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-sm ${done ? 'line-through text-slate-400' : 'text-slate-800'}">${esc(t.title)} ${late ? '<span class="text-[10px] bg-rose-100 text-rose-600 px-1.5 rounded-full">lewat</span>' : ''}</p>
          <p class="text-[11px] text-slate-500">${esc(t.course_name || t.type)} · batas: ${new Date(t.due_date).toLocaleDateString('id-ID')}</p>
        </div>
        <span class="text-[10px] rounded-full px-2 py-1 font-semibold ${t.type === 'ujian' ? 'bg-orange-100 text-orange-700' : t.type === 'quiz' ? 'bg-sky-100 text-sky-700' : t.type === 'project' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}">${esc(t.type)}</span>
        <span class="text-[10px] rounded-full px-2 py-1 font-semibold ${p.cls}">Prioritas ${p.label}</span>
        <button class="td-del text-slate-300 hover:text-rose-600 text-sm" data-id="${t.id}">🗑</button>
      </div>`;
    }).join('');
    el.querySelectorAll('.tw-done').forEach(b => b.addEventListener('click', async () => {
      await api.put(`/api/academics/tasks/${b.dataset.id}`, { action: 'toggle' });
      loadTasks(filter); window.__grerender?.();
    }));
    el.querySelectorAll('.td-del').forEach(b => b.addEventListener('click', async () => {
      await api.del(`/api/academics/tasks/${b.dataset.id}`);
      toast('Tugas dihapus', 'info');
      loadTasks(filter); window.__grerender?.();
    }));
  } catch (e) { toast(e.message, 'error'); }
}

function wireEvents(api, toast, navigate, ctx) {
  window.__gctx = { api, toast, navigate };
  window.__grerender = ctx.refresh;

  document.getElementById('q-add-task').addEventListener('click', () => openQuickTask(api, toast));
  document.getElementById('goto-courses').addEventListener('click', () => navigate('courses'));
  document.getElementById('goto-tasks').addEventListener('click', () => {
    document.getElementById('task-section').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('q-check-promote').addEventListener('click', async () => {
    if (confirm('Naik ke semester berikutnya? Semester matkul saat ini akan diarsipkan (Transkrip tetap tersimpan).')) {
      try {
        const r = await api.post('/api/auth/promote', {});
        toast(r.message);
        ctx.refresh();
        ctx.navigate('dashboard');
      } catch (e) { toast(e.message, 'error'); }
    }
  });
  document.querySelectorAll('#task-filters .f-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#task-filters .f-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      loadTasks(btn.dataset.f);
    });
  });
}

async function openQuickTask(api, toast) {
  const box = document.getElementById('quick-task');
  box.classList.toggle('hidden');
  if (box.classList.contains('hidden')) return;
  let courseOptions = '<option value="">— Tanpa matkul —</option>';
  try {
    const { courses } = await api.get('/api/academics/courses');
    courseOptions += courses.map(c => `<option value="${c.id}">${esc(c.course_name)}</option>`).join('');
  } catch { /* ignore */ }

  box.innerHTML = `
    <h3 class="font-bold text-slate-800 mb-3">➕ Tambah Tugas Cepat</h3>
    <form id="qa-form" class="grid md:grid-cols-2 gap-3">
      <div class="md:col-span-2">
        <label class="text-xs font-semibold text-slate-600 block mb-1">Judul *</label>
        <input name="title" required class="g-inp" placeholder="cth. Tugas RPP Sistem Digital" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600 block mb-1">Matkul</label>
        <select name="course_id" class="g-inp">${courseOptions}</select>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600 block mb-1">Jenis</label>
        <select name="type" class="g-inp"><option>tugas</option><option>ujian</option><option>quiz</option><option>project</option><option>presentasi</option></select>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600 block mb-1">Prioritas</label>
        <select name="priority" class="g-inp"><option value="sedang">Sedang</option><option value="tinggi">Tinggi</option><option value="rendah">Rendah</option></select>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600 block mb-1">Batas Waktu *</label>
        <input name="due_date" type="date" required class="g-inp" />
      </div>
      <div class="md:col-span-2">
        <label class="text-xs font-semibold text-slate-600 block mb-1">Deskripsi</label>
        <input name="description" class="g-inp" placeholder="opsional" />
      </div>
      <div class="md:col-span-2 flex justify-end gap-2">
        <button type="button" id="qa-close" class="text-sm text-slate-500 px-4 py-2 rounded-xl hover:bg-slate-100">Tutup</button>
        <button class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-xl text-sm">Simpan Tugas</button>
      </div>
    </form>`;
  rerenderMath();

  box.querySelector('#qa-close').addEventListener('click', () => box.classList.add('hidden'));
  box.querySelector('#qa-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.post('/api/academics/tasks', {
        title: f.get('title'),
        course_id: f.get('course_id') || undefined,
        type: f.get('type'), priority: f.get('priority'),
        due_date: f.get('due_date'), description: f.get('description')
      });
      toast('Tugas berhasil ditambahkan!');
      window.__grerender?.();
    } catch (err) { toast(err.message, 'error'); }
  });
}
