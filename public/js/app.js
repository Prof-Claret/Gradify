/**
 * Gradify SPA Router & App Shell
 */
import { api, getToken, setToken } from './api.js';

/* ---------- shared global helpers ---------- */
export const esc = (s) => {
  if (s === null || s === undefined) return '';
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
};

export function toast(msg, type = 'success') {
  const box = document.getElementById('toast-container');
  const colors = {
    success: 'bg-emerald-600', error: 'bg-rose-600', info: 'bg-indigo-600', warn: 'bg-amber-500'
  };
  const icons = { success: '✅', error: '⚠️', info: 'ℹ️', warn: '⚡' };
  const el = document.createElement('div');
  el.className = `${colors[type]} text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-sm animate-[fadeIn_.2s]`;
  el.innerHTML = `<span>${icons[type] || ''}</span><span>${esc(msg)}</span>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export function rerenderMath() {
  if (window.MathJax?.typesetPromise) MathJax.typesetPromise();
}

export function fmtIDR(n) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
}

/* ---------- app state ---------- */
const state = {
  user: null,
  currentRoute: 'dashboard',
  viewModules: {}
};

/* ---------- route registry ---------- */
export const routes = {
  dashboard:    { module: '/js/views/dashboard.js',  group: null,  icon: '📊', label: 'Dashboard' },
  semesters:    { module: '/js/views/semesters.js',  group: 'Akademik', icon: '🗓️', label: 'Kelola Semester' },
  courses:      { module: '/js/views/courses.js',    group: 'Akademik', icon: '📚', label: 'Mata Kuliah' },
  notes:        { module: '/js/views/notes.js',      group: 'Akademik', icon: '📝', label: 'Catatan CS' },
  gpa:          { module: '/js/views/gpa.js',        group: 'Akademik', icon: '🎯', label: 'IPK & Transkrip' },
  calculator:   { module: '/js/views/calculator.js', group: 'Toolkit CS', icon: '🧮', label: 'Kalkulator Ilmiah' },
  toolkit:      { module: '/js/views/toolkit.js',    group: 'Toolkit CS', icon: '🛠️', label: 'CS Math Toolkit' },
  discrete:     { module: '/js/views/discrete.js',   group: 'Toolkit CS', icon: '🔗', label: 'Matematika Diskrit' },
  devtools:     { module: '/js/views/devtools.js',   group: 'Toolkit CS', icon: '💻', label: 'Dev Tools' },
  budget:       { module: '/js/views/life.js',       group: 'Kehidupan', icon: '💰', label: 'Budget Kos' },
  skripsi:      { module: '/js/views/life.js',       group: 'Kehidupan', icon: '📗', label: 'Skripsi' },
  portfolio:    { module: '/js/views/life.js',       group: 'Kehidupan', icon: '🏅', label: 'Portofolio & CV' },
  profile:      { module: '/js/views/profile.js',    group: null,  icon: '⚙️', label: 'Pengaturan Akun' },
  about:        { module: '/js/views/about.js',      group: null,  icon: 'ℹ️', label: 'Tentang' }
};

/** Baca route dari hash URL (dipakai saat refresh / deep-link). */
function syncRouteFromHash() {
  const [base, ...rest] = window.location.hash.replace(/^#/, '').split('/').filter(Boolean);
  if (base && routes[base]) {
    state.currentRoute = rest.length ? `${base}/${rest.join('/')}` : base;
  } else {
    state.currentRoute = 'dashboard';
  }
  return state.currentRoute;
}

/* navigate via hash */
export function navigate(route, subTab) {
  if (!routes[route]) route = 'dashboard';
  state.currentRoute = route;
  window.location.hash = subTab ? `${route}/${subTab}` : route;
  if (subTab) sessionStorage.setItem('gradify_tab', subTab);
  const base = String(state.currentRoute).split('/')[0];
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = (routes[base] || routes.dashboard).label;
  renderView();
  refreshSidebarActive();
  closeMobileSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- view rendering ---------- */
const ctx = {
  api, esc, toast, rerenderMath, fmtIDR,
  navigate,
  get user() { return state.user; },
  get currentRoute() { return state.currentRoute; },
  refresh: () => renderView()
};

let renderSeq = 0;
async function renderView() {
  const main = document.getElementById('main-content');
  const [base, ...extra] = state.currentRoute.split('/');
  const def = routes[base] || routes.dashboard;
  document.getElementById('page-title').textContent = def.label;

  try {
    const mod = await import(def.module);
    if (!state.user) return;
    document.getElementById('page-subtitle').textContent =
      mod.subtitle ? mod.subtitle(state.user, extra) : '';

    const seq = ++renderSeq;
    await mod.render(main, ctx, extra);
    if (seq === renderSeq) {
      rerenderMath();
      window.hljs && hljs.highlightAll();
    }
  } catch (err) {
    console.error(err);
    main.innerHTML = `<div class="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-6">
      <p class="font-bold">Gagal memuat halaman "${esc(def.label)}"</p>
      <p class="text-sm mt-1">${esc(err.message)}</p></div>`;
  }
  window.scrollTo(0, 0);
}

/* ---------- sidebar ---------- */
function navGroup(group, items) {
  return `<div>
    <p class="nav-label mb-1">${esc(group)}</p>
    <div class="space-y-0.5">${items.map(renderNavItem).join('')}</div>
  </div>`;
}
function renderNavItem(key) {
  const r = routes[key];
  return `<a class="nav-item" data-route="${key}" href="#${key}">
    <span class="text-base w-5 text-center">${r.icon}</span><span>${esc(r.label)}</span></a>`;
}

function renderSidebar() {
  const groups = { Akademik: [], 'Toolkit CS': [], Kehidupan: [] };
  const top = [], bottom = [];
  for (const [key, r] of Object.entries(routes)) {
    if (!r.group) {
      if (key === 'dashboard') top.push(key);
      else bottom.push(key);
    } else if (groups[r.group]) {
      groups[r.group].push(key);
    }
  }
  const html = [top.map(renderNavItem).join('')]
    .concat(Object.entries(groups).map(([label, items]) => items.length ? navGroup(label, items) : ''))
    .concat([bottom.map(renderNavItem).join('')])
    .filter(Boolean).join('');
  document.getElementById('sidebar-nav').innerHTML = html;
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileSidebar();
      navigate(a.dataset.route);
    });
  });
  refreshSidebarActive();
}

function refreshSidebarActive() {
  const activeBase = String(state.currentRoute || 'dashboard').split('/')[0];
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.route === activeBase);
  });
  document.querySelectorAll('#mobile-bottom-nav .bnav-btn').forEach(b => {
    const isActive = b.dataset.route === activeBase;
    b.classList.toggle('text-indigo-600', isActive);
    b.classList.toggle('font-bold', isActive);
    b.classList.toggle('text-slate-500', !isActive);
  });
}

function renderProfileBadge() {
  const u = state.user;
  const sidebarAvatar = u.avatar_url
    ? `<img src="${esc(u.avatar_url)}" alt="${esc(u.full_name)}" class="w-10 h-10 rounded-full object-cover border border-indigo-400/40 shadow-sm" onerror="this.outerHTML='<div class=\\'w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-xl\\'>${esc(u.avatar_emoji || '🎓')}</div>'" />`
    : `<div class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-xl">${esc(u.avatar_emoji || '🎓')}</div>`;

  document.getElementById('sidebar-profile').innerHTML = `
    ${sidebarAvatar}
    <div class="min-w-0">
      <p class="text-white text-sm font-semibold truncate">${esc(u.full_name)}</p>
      <p class="text-[11px] text-slate-400 truncate">Semester ${u.active_semester} · ${esc((u.study_program || 'Program Studi'))}</p>
    </div>`;

  const topbarAvatar = u.avatar_url
    ? `<button id="btn-avatar" class="w-9 h-9 rounded-full overflow-hidden hover:ring-2 ring-indigo-400 border border-slate-200" title="${esc(u.full_name)}">
        <img src="${esc(u.avatar_url)}" alt="${esc(u.full_name)}" class="w-full h-full object-cover" onerror="this.outerHTML='<div class=\\'w-full h-full bg-indigo-100 flex items-center justify-center text-lg\\'>${esc(u.avatar_emoji || '🎓')}</div>'" />
      </button>`
    : `<button id="btn-avatar" class="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-lg hover:ring-2 ring-indigo-400" title="${esc(u.full_name)}">${esc(u.avatar_emoji || '🎓')}</button>`;

  document.getElementById('topbar-avatar').innerHTML = topbarAvatar;
  document.getElementById('btn-avatar').addEventListener('click', () => navigate('profile'));
}

/* ---------- top bar semester switcher ---------- */
export async function loadSemesterSwitcher() {
  const sel = document.getElementById('semester-switcher');
  try {
    const { semesters } = await api.get('/api/academics/semesters');
    if (!semesters.length) { sel.innerHTML = '<option>—</option>'; return; }
    const active = semesters.find(s => s.is_active) || semesters[0];
    sel.innerHTML = semesters.map(s =>
      `<option value="${s.semester_number}" ${s.is_active ? 'selected' : ''}>
        Semester ${s.semester_number} — ${esc(s.academic_year)}</option>`).join('');
    sel.addEventListener('change', async () => {
      const num = parseInt(sel.value);
      try {
        await api.put('/api/auth/profile', { active_semester: num });
        state.user.active_semester = num;
        const s = semesters.find(x => x.semester_number === num);
        if (s) await api.put(`/api/academics/semesters/${s.id}`, { action: 'activate' });
        toast(`Semester aktif diubah ke Semester ${num}`, 'info');
        renderView();
      } catch (e) { toast(e.message, 'error'); }
    });
  } catch { sel.innerHTML = '<option>—</option>'; }
}

/* ---------- mobile sidebar ---------- */
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.add('-translate-x-full');
  document.getElementById('sidebar-backdrop').classList.add('hidden');
}
function openMobileSidebar() {
  document.getElementById('sidebar').classList.remove('-translate-x-full');
  document.getElementById('sidebar-backdrop').classList.remove('hidden');
}

/* ---------- auth gate ---------- */
async function tryResumeSession() {
  if (!getToken()) return false;
  try {
    const { user } = await api.get('/api/auth/me');
    state.user = user;
    return true;
  } catch { return false; }
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('splash').classList.add('hidden');
  syncRouteFromHash();
  renderSidebar();
  renderProfileBadge();
  renderView();
  loadSemesterSwitcher();
}

function showAuth() {
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('splash').classList.add('hidden');
  const screen = document.getElementById('auth-screen');
  screen.classList.remove('hidden');
  screen.innerHTML = '<div class="min-h-screen flex items-center justify-center p-4"><div id="auth-box" class="w-full max-w-4xl"></div></div>';
  import('/js/views/auth.js').then(m => m.render(document.getElementById('auth-box'), {
    api, esc, toast,
    onAuthed(token, user) {
      setToken(token);
      state.user = user;
      showApp();
    }
  }));
}

/* ---------- boot ---------- */
document.getElementById('btn-mobile-menu')?.addEventListener('click', openMobileSidebar);
document.getElementById('btn-sidebar-close')?.addEventListener('click', closeMobileSidebar);
document.getElementById('sidebar-backdrop')?.addEventListener('click', closeMobileSidebar);
document.getElementById('bnav-menu-btn')?.addEventListener('click', openMobileSidebar);
document.querySelectorAll('#mobile-bottom-nav .bnav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(btn.dataset.route);
  });
});

window.addEventListener('hashchange', () => {
  const prev = state.currentRoute;
  syncRouteFromHash();
  if (state.currentRoute === prev) return;
  refreshSidebarActive();
  const base = String(state.currentRoute).split('/')[0];
  document.getElementById('page-title').textContent = (routes[base] || routes.dashboard).label;
  renderView();
  closeMobileSidebar();
});

(async function boot() {
  const ok = await tryResumeSession();
  if (ok) showApp();
  else showAuth();
})();
