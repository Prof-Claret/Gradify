/**
 * Gradify Admin Dashboard
 * Vanilla ES module — no build step.
 */
import { startIconEngine } from '/js/icons.js';

const TOKEN_KEY = 'gradify_admin_token';
const root = document.getElementById('admin-root');

const state = {
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: null,
  tab: 'dashboard',
  usersPage: 1,
  usersSearch: ''
};

/* ============================================================
 * UTILITIES
 * ============================================================ */
const esc = (s) => {
  if (s === null || s === undefined) return '';
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
};

function toast(msg, type = 'success') {
  const box = document.getElementById('toast-container');
  const colors = {
    success: 'bg-emerald-600', error: 'bg-rose-600', info: 'bg-indigo-600', warn: 'bg-amber-500'
  };
  const icons = { success: '✅', error: '⚠️', info: 'ℹ️', warn: '⚡' };
  const el = document.createElement('div');
  el.className = `${colors[type] || colors.info} text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-sm pointer-events-auto`;
  el.innerHTML = `<span>${icons[type] || ''}</span><span>${esc(msg)}</span>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function fmtBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtDate(value) {
  if (!value) return '—';
  const raw = String(value);
  const d = new Date(raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return esc(value);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(value) {
  if (!value) return '—';
  const raw = String(value);
  const d = new Date(raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return esc(value);
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function avatarHtml(user, size = 'w-9 h-9') {
  if (user.avatar_url) {
    return `<img src="${esc(user.avatar_url)}" alt="${esc(user.full_name)}" class="${size} rounded-full object-cover border border-slate-200 bg-slate-100" />`;
  }
  return `<div class="${size} rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-base border border-slate-200">${esc(user.avatar_emoji || '🎓')}</div>`;
}

function loading(text = 'Memuat data…') {
  return `<div class="a-card p-10 text-center text-slate-500 text-sm">
    <span class="a-spin text-2xl">⏳</span>
    <p class="mt-3">${esc(text)}</p>
  </div>`;
}

function emptyState(icon, title, sub = '') {
  return `<div class="text-center py-12">
    <p class="text-4xl">${icon}</p>
    <p class="font-bold text-slate-700 mt-3">${esc(title)}</p>
    ${sub ? `<p class="text-xs text-slate-400 mt-1">${esc(sub)}</p>` : ''}
  </div>`;
}

/* ============================================================
 * API CLIENT
 * ============================================================ */
async function request(path, options = {}) {
  const headers = { Accept: 'application/json' };
  if (!options.form) headers['Content-Type'] = 'application/json';
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  let body;
  if (options.form) body = options.form;
  else if (options.body !== undefined) body = JSON.stringify(options.body);

  const res = await fetch(path, { method: options.method || 'GET', headers, body });

  let data = {};
  try { data = await res.json(); } catch { /* not JSON */ }

  const isAuthCall = path.includes('/api/admin/login') || path.includes('/api/admin/setup');
  if (!res.ok && !isAuthCall && (res.status === 401 || res.status === 403) && state.token) {
    clearSession();
    renderLogin('Sesi admin berakhir. Silakan login kembali.');
    throw new Error(data.error || 'Sesi admin berakhir.');
  }
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

async function downloadFile(path, fallbackName) {
  const headers = {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(path, { headers });
  if (!res.ok) {
    let data = {};
    try { data = await res.json(); } catch { /* ignore */ }
    throw new Error(data.error || 'Gagal mengunduh file.');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = match?.[1] || fallbackName || 'gradify-backup';

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return filename;
}

function saveSession(data) {
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem(TOKEN_KEY, data.token);
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem(TOKEN_KEY);
}

async function logout() {
  try { await request('/api/admin/logout', { method: 'POST', body: {} }); } catch { /* ignore */ }
  clearSession();
  renderLogin('Anda telah keluar dari dashboard admin.');
}

/* ============================================================
 * BOOTSTRAP & AUTH SCREENS
 * ============================================================ */
async function init() {
  try {
    const initialTab = location.hash.replace('#', '');
    if (TABS[initialTab]) state.tab = initialTab;

    const status = await request('/api/admin/setup-status');
    if (status.needsSetup) return renderSetup();

    if (!state.token) return renderLogin();

    try {
      const { user } = await request('/api/admin/me');
      state.user = user;
      renderShell();
    } catch {
      clearSession();
      renderLogin();
    }
  } catch (err) {
    renderLogin(err.message);
  }
}

function authShell(content) {
  root.innerHTML = `
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
    <div class="w-full max-w-lg">
      <div class="text-center text-white mb-5">
        <div class="text-5xl mb-2">🛡️</div>
        <h1 class="text-2xl font-extrabold tracking-tight">Gradify Admin</h1>
        <p class="text-indigo-300 text-xs mt-1">Dashboard pengelolaan website</p>
      </div>
      <div class="bg-white rounded-3xl shadow-2xl overflow-hidden">
        ${content}
      </div>
      <div class="text-center mt-5 text-[11px] text-slate-400">
        <a href="/" class="hover:text-white hover:underline">← Kembali ke Gradify</a>
        <span class="mx-2">·</span>
        <span>Akses terbatas untuk administrator</span>
      </div>
    </div>
  </div>`;
}

function renderSetup(message = '') {
  authShell(`
    <div class="bg-gradient-to-r from-emerald-700 to-teal-700 text-white p-6">
      <h2 class="text-lg font-extrabold">Setup Administrator Pertama</h2>
      <p class="text-emerald-100 text-xs mt-1">Belum ada akun admin. Buat akun administrator untuk mulai mengelola website.</p>
    </div>
    <form id="setup-form" class="p-6 space-y-3">
      ${message ? `<p class="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3">${esc(message)}</p>` : ''}
      <div><label class="a-label">Nama Lengkap *</label><input name="full_name" required class="a-input" placeholder="cth. Administrator Gradify" /></div>
      <div><label class="a-label">Email Administrator *</label><input name="email" type="email" required class="a-input" placeholder="admin@example.com" /></div>
      <div class="grid sm:grid-cols-2 gap-3">
        <div><label class="a-label">Password * (min. 8)</label><input name="password" type="password" minlength="8" required class="a-input" /></div>
        <div><label class="a-label">Konfirmasi Password *</label><input name="password2" type="password" minlength="8" required class="a-input" /></div>
      </div>
      <p id="setup-err" class="text-rose-600 text-xs hidden"></p>
      <button class="a-btn a-btn-primary w-full py-2.5">🛡️ Buat Akun Administrator</button>
      <p class="text-[11px] text-slate-400 text-center">Password disimpan dalam bentuk hash scrypt. Jangan bagikan akses admin kepada orang lain.</p>
    </form>
  `);

  const form = document.getElementById('setup-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const errEl = document.getElementById('setup-err');
    errEl.classList.add('hidden');
    if (fd.get('password') !== fd.get('password2')) {
      errEl.textContent = 'Konfirmasi password tidak sama.';
      errEl.classList.remove('hidden');
      return;
    }
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = '⏳ Membuat admin…';
    try {
      const data = await request('/api/admin/setup', {
        method: 'POST',
        body: {
          full_name: fd.get('full_name'),
          email: fd.get('email'),
          password: fd.get('password')
        }
      });
      saveSession(data);
      toast('Administrator pertama berhasil dibuat.');
      renderShell();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = '🛡️ Buat Akun Administrator';
    }
  });
}

function renderLogin(message = '') {
  authShell(`
    <div class="bg-gradient-to-r from-indigo-700 to-violet-700 text-white p-6">
      <h2 class="text-lg font-extrabold">Login Administrator</h2>
      <p class="text-indigo-200 text-xs mt-1">Masuk untuk mengelola pengguna, pengaturan, dan database.</p>
    </div>
    <form id="login-form" class="p-6 space-y-3">
      ${message ? `<p class="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3">${esc(message)}</p>` : ''}
      <div><label class="a-label">Email</label><input name="email" type="email" required class="a-input" autocomplete="username" /></div>
      <div><label class="a-label">Password</label><input name="password" type="password" required class="a-input" autocomplete="current-password" /></div>
      <p id="login-err" class="text-rose-600 text-xs hidden"></p>
      <button class="a-btn a-btn-primary w-full py-2.5">🔐 Masuk Dashboard</button>
      <p class="text-[11px] text-slate-400 text-center">Hanya akun dengan status administrator yang dapat masuk.</p>
    </form>
  `);

  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const errEl = document.getElementById('login-err');
    errEl.classList.add('hidden');
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = '⏳ Memeriksa…';
    try {
      const data = await request('/api/admin/login', {
        method: 'POST',
        body: { email: fd.get('email'), password: fd.get('password') }
      });
      saveSession(data);
      toast(`Selamat datang, ${data.user.full_name}!`);
      renderShell();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = '🔐 Masuk Dashboard';
    }
  });
}

/* ============================================================
 * APP SHELL
 * ============================================================ */
const TABS = {
  dashboard: { icon: '📊', label: 'Dashboard', subtitle: 'Ringkasan kondisi website & database' },
  users: { icon: '👥', label: 'Pengguna', subtitle: 'Kelola akun mahasiswa dan administrator' },
  academic: { icon: '🏫', label: 'Kampus & Prodi', subtitle: 'Kelola kampus, fakultas, prodi & fitur per prodi' },
  backup: { icon: '💾', label: 'Backup & Restore', subtitle: 'Ekspor, impor, dan amankan database' },
  settings: { icon: '⚙️', label: 'Pengaturan', subtitle: 'Identitas situs, akses, dan pemeliharaan' }
};

function renderShell() {
  const u = state.user || {};
  root.innerHTML = `
  <div class="min-h-screen flex bg-slate-100">
    <aside id="admin-sidebar" class="fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-slate-300 flex flex-col shadow-2xl">
      <div class="h-16 px-5 flex items-center gap-3 border-b border-slate-800">
        <span class="text-2xl">🛡️</span>
        <div>
          <p class="text-white font-extrabold leading-tight">Gradify Admin</p>
          <p class="text-[10px] text-indigo-400 tracking-widest uppercase">Control Center</p>
        </div>
        <button id="admin-sidebar-close" class="lg:hidden ml-auto text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800">✕</button>
      </div>

      <nav class="flex-1 overflow-y-auto p-3 space-y-1">
        <p class="a-nav-label">Ringkasan</p>
        ${navItem('dashboard')}
        <p class="a-nav-label mt-4">Manajemen</p>
        ${navItem('users')}
        ${navItem('academic')}
        <p class="a-nav-label mt-4">Sistem</p>
        ${navItem('backup')}
        ${navItem('settings')}
      </nav>

      <div class="p-3 border-t border-slate-800">
        <div class="flex items-center gap-2.5 px-2 py-2">
          ${avatarHtml(u, 'w-9 h-9')}
          <div class="min-w-0 flex-1">
            <p class="text-white text-xs font-bold truncate">${esc(u.full_name || 'Administrator')}</p>
            <p class="text-[10px] text-slate-500 truncate">${esc(u.email || '')}</p>
          </div>
        </div>
        <button id="admin-logout" class="a-nav-item mt-1 text-rose-300 hover:text-white">🚪 <span>Keluar</span></button>
        <a href="/" target="_blank" rel="noopener" class="a-nav-item text-slate-400">🌐 <span>Buka Website</span></a>
      </div>
    </aside>

    <div id="admin-sidebar-backdrop" class="hidden lg:hidden a-sidebar-backdrop"></div>

    <div class="flex-1 lg:ml-64 min-h-screen flex flex-col min-w-0">
      <header class="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center gap-3 px-4 lg:px-8">
        <button id="admin-menu" class="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700">☰</button>
        <div class="min-w-0 flex-1">
          <h1 id="admin-page-title" class="text-base sm:text-lg font-extrabold text-slate-800 truncate">Dashboard</h1>
          <p id="admin-page-subtitle" class="text-[11px] sm:text-xs text-slate-500 truncate">Ringkasan kondisi website & database</p>
        </div>
        <span class="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
          <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Admin aktif
        </span>
      </header>

      <main id="admin-main" class="flex-1 p-4 sm:p-6 lg:p-8"></main>
    </div>
  </div>`;

  document.getElementById('admin-menu').addEventListener('click', openSidebar);
  document.getElementById('admin-sidebar-close').addEventListener('click', closeSidebar);
  document.getElementById('admin-sidebar-backdrop').addEventListener('click', closeSidebar);
  document.getElementById('admin-logout').addEventListener('click', () => {
    if (confirm('Keluar dari dashboard admin?')) logout();
  });

  root.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => navigateTab(btn.dataset.tab));
  });

  navigateTab(state.tab);
}

function navItem(tab) {
  const t = TABS[tab];
  return `<button data-tab="${tab}" class="a-nav-item">
    <span class="text-base w-5 text-center">${t.icon}</span><span>${t.label}</span>
  </button>`;
}

function openSidebar() {
  document.getElementById('admin-sidebar')?.classList.add('open');
  document.getElementById('admin-sidebar-backdrop')?.classList.remove('hidden');
}
function closeSidebar() {
  document.getElementById('admin-sidebar')?.classList.remove('open');
  document.getElementById('admin-sidebar-backdrop')?.classList.add('hidden');
}

async function navigateTab(tab) {
  if (!TABS[tab]) tab = 'dashboard';
  state.tab = tab;
  closeSidebar();
  root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('admin-page-title').textContent = TABS[tab].label;
  document.getElementById('admin-page-subtitle').textContent = TABS[tab].subtitle;
  history.replaceState(null, '', `/admin/#${tab}`);

  const main = document.getElementById('admin-main');
  main.innerHTML = loading(`Memuat ${TABS[tab].label.toLowerCase()}…`);

  try {
    if (tab === 'dashboard') await loadDashboard();
    else if (tab === 'users') await loadUsers(state.usersPage, state.usersSearch);
    else if (tab === 'academic') await loadAcademic();
    else if (tab === 'backup') await loadBackup();
    else await loadSettings();
  } catch (err) {
    main.innerHTML = `<div class="a-card border-rose-200 bg-rose-50 p-6">
      <p class="font-bold text-rose-800">Gagal memuat halaman</p>
      <p class="text-sm text-rose-700 mt-1">${esc(err.message)}</p>
      <button id="retry-tab" class="a-btn a-btn-light mt-4">↻ Coba lagi</button>
    </div>`;
    document.getElementById('retry-tab')?.addEventListener('click', () => navigateTab(tab));
  }
}

/* ============================================================
 * DASHBOARD
 * ============================================================ */
async function loadDashboard() {
  const s = await request('/api/admin/stats');
  const main = document.getElementById('admin-main');

  const stat = (icon, label, value, sub, color = 'text-indigo-700') => `
    <div class="a-card p-4">
      <div class="flex items-center gap-2 mb-1.5"><span>${icon}</span>
        <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">${esc(label)}</p></div>
      <p class="text-2xl font-extrabold ${color} truncate">${esc(value)}</p>
      <p class="text-[11px] text-slate-400 mt-0.5 truncate">${esc(sub)}</p>
    </div>`;

  main.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div>
        <h2 class="text-xl font-extrabold text-slate-800">Ringkasan Sistem</h2>
        <p class="text-xs text-slate-500">Data diperbarui ${fmtDateTime(new Date().toISOString())}</p>
      </div>
      <div class="flex gap-2">
        <button data-go="users" class="a-btn a-btn-light">👥 Kelola Pengguna</button>
        <button data-go="backup" class="a-btn a-btn-primary">💾 Backup Database</button>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      ${stat('👥', 'Total Pengguna', s.users.total, `${s.users.admins} administrator · ${s.users.new_7d} baru (7 hari)`, 'text-indigo-700')}
      ${stat('📚', 'Mata Kuliah', s.counts.courses, `${s.counts.semesters} semester · ${s.counts.notes} catatan`, 'text-sky-700')}
      ${stat('📋', 'Tugas Pending', s.pending_tasks, `${s.counts.tasks} total tugas`, s.pending_tasks > 0 ? 'text-amber-600' : 'text-emerald-600')}
      ${stat('💾', 'Ukuran Database', fmtBytes(s.database.size_bytes), `${s.users.active_sessions} sesi aktif`, 'text-slate-700')}
    </div>

    <div class="grid lg:grid-cols-3 gap-5">
      <section class="lg:col-span-2 a-card overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 class="font-extrabold text-slate-800">👥 Pengguna Terbaru</h3>
          <button data-go="users" class="text-xs font-semibold text-indigo-600 hover:underline">Lihat semua →</button>
        </div>
        ${s.recent_users.length === 0
          ? emptyState('👤', 'Belum ada pengguna', 'Pengguna baru akan muncul di sini.')
          : `<div class="overflow-x-auto"><table class="a-table">
              <thead><tr><th>Pengguna</th><th>Program Studi</th><th>Status</th><th>Terdaftar</th></tr></thead>
              <tbody>${s.recent_users.map(u => `
                <tr>
                  <td><div class="flex items-center gap-2.5">${avatarHtml(u, 'w-8 h-8')}
                    <div class="min-w-0"><p class="font-semibold text-slate-800 truncate max-w-[180px]">${esc(u.full_name)}</p>
                    <p class="text-[10px] text-slate-400 truncate max-w-[180px]">${esc(u.email)}</p></div></div></td>
                  <td><p class="text-xs text-slate-600 truncate max-w-[190px]">${esc(u.study_program || '—')}</p>
                    <p class="text-[10px] text-slate-400">${esc(u.npm_nim || 'NIM belum diisi')}</p></td>
                  <td>${u.is_admin
                    ? '<span class="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Admin</span>'
                    : '<span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Mahasiswa</span>'}</td>
                  <td class="text-[11px] text-slate-500 whitespace-nowrap">${fmtDate(u.created_at)}</td>
                </tr>`).join('')}</tbody>
            </table></div>`}
      </section>

      <section class="a-card p-4">
        <h3 class="font-extrabold text-slate-800 mb-3">⚡ Aktivitas Terbaru</h3>
        ${s.latest_activity.length === 0
          ? emptyState('📭', 'Belum ada aktivitas')
          : `<div class="space-y-2.5">${s.latest_activity.map(a => {
              const icon = a.type === 'note' ? '📝' : a.type === 'portfolio' ? '🏅' : '👤';
              const label = a.type === 'note' ? 'Catatan' : a.type === 'portfolio' ? 'Portofolio' : 'Pengguna baru';
              return `<div class="flex items-start gap-2.5 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                <span class="text-base">${icon}</span>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold text-slate-700 truncate">${esc(a.title || '(tanpa judul)')}</p>
                  <p class="text-[10px] text-slate-400">${label} · ${fmtDate(a.created_at)}</p>
                </div>
              </div>`;
            }).join('')}</div>`}
      </section>
    </div>

    <div class="grid lg:grid-cols-2 gap-5 mt-5">
      <section class="a-card p-5">
        <h3 class="font-extrabold text-slate-800 mb-3">🗄️ Statistik Tabel Database</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${Object.entries(s.database.tables).map(([table, count]) => `
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <p class="text-[10px] font-mono text-slate-500 truncate">${esc(table)}</p>
              <p class="text-lg font-extrabold text-slate-800">${count}</p>
            </div>`).join('')}
        </div>
      </section>

      <section class="a-card p-5">
        <h3 class="font-extrabold text-slate-800 mb-3">🖥️ Informasi Sistem</h3>
        <dl class="space-y-2 text-xs">
          ${infoRow('Versi Aplikasi', s.system.app_version)}
          ${infoRow('Runtime', `Node ${s.system.node}`)}
          ${infoRow('Platform', s.system.platform)}
          ${infoRow('Uptime Server', `${Math.floor(s.system.uptime_seconds / 60)} menit`)}
          ${infoRow('Memori Proses', `${s.system.memory_mb} MB`)}
          ${infoRow('Lokasi Database', s.database.path, true)}
        </dl>
      </section>
    </div>`;

  main.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => navigateTab(btn.dataset.go));
  });
}

function infoRow(label, value, mono = false) {
  return `<div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
    <dt class="text-slate-500 shrink-0">${esc(label)}</dt>
    <dd class="font-semibold text-slate-800 text-right ${mono ? 'font-mono text-[10px] break-all' : ''}">${esc(value)}</dd>
  </div>`;
}

/* ============================================================
 * USER MANAGEMENT
 * ============================================================ */
async function loadUsers(page = 1, search = '') {
  state.usersPage = page;
  state.usersSearch = search;
  const qs = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) qs.set('search', search);
  const data = await request(`/api/admin/users?${qs}`);
  const main = document.getElementById('admin-main');

  main.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div>
        <h2 class="text-xl font-extrabold text-slate-800">Manajemen Pengguna</h2>
        <p class="text-xs text-slate-500">${data.total} akun terdaftar</p>
      </div>
      <form id="user-search" class="flex gap-2 w-full sm:w-auto">
        <input name="search" value="${esc(search)}" class="a-input sm:w-72" placeholder="Cari nama, email, NIM, atau prodi…" />
        <button class="a-btn a-btn-primary">🔍 Cari</button>
        ${search ? '<button type="button" id="clear-search" class="a-btn a-btn-light">Reset</button>' : ''}
      </form>
    </div>

    <section class="a-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="a-table min-w-[780px]">
          <thead><tr>
            <th>Pengguna</th><th>NIM / Prodi</th><th>Aktivitas</th><th>Semester</th><th>Role</th><th>Terdaftar</th><th class="text-right">Aksi</th>
          </tr></thead>
          <tbody>
            ${data.users.length === 0
              ? `<tr><td colspan="7">${emptyState('🔍', 'Pengguna tidak ditemukan', 'Coba kata kunci lain.')}</td></tr>`
              : data.users.map(u => `
                <tr>
                  <td><div class="flex items-center gap-2.5">${avatarHtml(u, 'w-9 h-9')}
                    <div class="min-w-0">
                      <p class="font-semibold text-slate-800 truncate max-w-[200px]">${esc(u.full_name)}</p>
                      <p class="text-[10px] text-slate-400 truncate max-w-[200px]">${esc(u.email)}</p>
                    </div></div></td>
                  <td><p class="text-xs text-slate-600 font-mono">${esc(u.npm_nim || '—')}</p>
                    <p class="text-[10px] text-slate-400 truncate max-w-[200px]">${esc(u.study_program || '—')}</p></td>
                  <td><div class="flex flex-wrap gap-1 text-[10px]">
                    <span class="bg-sky-50 text-sky-700 border border-sky-100 rounded-full px-1.5 py-0.5">${u.course_count} matkul</span>
                    <span class="bg-violet-50 text-violet-700 border border-violet-100 rounded-full px-1.5 py-0.5">${u.note_count} catatan</span>
                    <span class="bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-1.5 py-0.5">${u.task_count} tugas</span>
                  </div></td>
                  <td class="text-center font-semibold">${u.active_semester}</td>
                  <td>${u.is_admin
                    ? '<span class="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Admin</span>'
                    : '<span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Mahasiswa</span>'}</td>
                  <td class="text-[11px] text-slate-500 whitespace-nowrap">${fmtDate(u.created_at)}</td>
                  <td><div class="flex justify-end gap-1.5">
                    <button data-edit="${u.id}" class="a-btn a-btn-light a-btn-sm">✏️ Edit</button>
                    <button data-reset="${u.id}" data-name="${esc(u.full_name)}" class="a-btn a-btn-light a-btn-sm">🔑</button>
                    ${u.id === state.user?.id ? '' : `<button data-delete="${u.id}" data-name="${esc(u.full_name)}" class="a-btn a-btn-danger a-btn-sm">🗑</button>`}
                  </div></td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-slate-100">
        <p class="text-[11px] text-slate-500">Halaman ${data.page} dari ${data.pages}</p>
        <div class="flex gap-1.5">
          <button id="users-prev" class="a-btn a-btn-light a-btn-sm" ${data.page <= 1 ? 'disabled' : ''}>← Sebelumnya</button>
          <button id="users-next" class="a-btn a-btn-light a-btn-sm" ${data.page >= data.pages ? 'disabled' : ''}>Berikutnya →</button>
        </div>
      </div>
    </section>`;

  document.getElementById('user-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const value = new FormData(e.target).get('search').trim();
    loadUsers(1, value);
  });
  document.getElementById('clear-search')?.addEventListener('click', () => loadUsers(1, ''));
  document.getElementById('users-prev')?.addEventListener('click', () => loadUsers(data.page - 1, search));
  document.getElementById('users-next')?.addEventListener('click', () => loadUsers(data.page + 1, search));

  main.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openUserModal(btn.dataset.edit)));
  main.querySelectorAll('[data-reset]').forEach(btn =>
    btn.addEventListener('click', () => resetUserPassword(btn.dataset.reset, btn.dataset.name)));
  main.querySelectorAll('[data-delete]').forEach(btn =>
    btn.addEventListener('click', () => deleteUser(btn.dataset.delete, btn.dataset.name)));
}

async function resetUserPassword(id, name) {
  const password = prompt(`Password baru untuk ${name} (minimal 6 karakter):`);
  if (password === null) return;
  if (password.length < 6) return toast('Password baru minimal 6 karakter.', 'warn');
  try {
    const res = await request(`/api/admin/users/${id}/reset-password`, {
      method: 'POST', body: { new_password: password }
    });
    toast(res.message || 'Password berhasil direset.');
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteUser(id, name) {
  if (!confirm(`Hapus akun "${name}"? Semua data akademik, catatan, tugas, dan portofolionya akan terhapus permanen.`)) return;
  try {
    const res = await request(`/api/admin/users/${id}`, { method: 'DELETE' });
    toast(res.message || 'Pengguna dihapus.');
    loadUsers(state.usersPage, state.usersSearch);
  } catch (err) { toast(err.message, 'error'); }
}

async function openUserModal(id) {
  let data, campuses = [];
  try {
    const [userData, campusData] = await Promise.all([
      request(`/api/admin/users/${id}`),
      request('/api/admin/campuses')
    ]);
    data = userData;
    campuses = campusData.campuses;
  }
  catch (err) { return toast(err.message, 'error'); }

  const u = data.user;
  const wrapper = document.createElement('div');
  wrapper.className = 'a-modal-backdrop';
  wrapper.id = 'user-modal';

  const countCard = (label, value, icon) => `
    <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
      <p class="text-base">${icon}</p>
      <p class="text-lg font-extrabold text-slate-800">${value}</p>
      <p class="text-[10px] text-slate-500">${esc(label)}</p>
    </div>`;

  wrapper.innerHTML = `
    <div class="a-modal" role="dialog" aria-modal="true" aria-label="Edit pengguna">
      <div class="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
        <div class="flex items-center gap-3 min-w-0">
          ${avatarHtml(u, 'w-12 h-12')}
          <div class="min-w-0">
            <h2 class="font-extrabold text-slate-800 truncate">${esc(u.full_name)}</h2>
            <p class="text-xs text-slate-500 truncate">${esc(u.email)}</p>
            <p class="text-[10px] text-slate-400">ID #${u.id} · terdaftar ${fmtDate(u.created_at)}</p>
          </div>
        </div>
        <button data-close class="text-slate-400 hover:text-slate-700 text-xl leading-none p-1">✕</button>
      </div>

      <div class="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
          ${countCard('Semester', data.counts.semesters, '🗓️')}
          ${countCard('Matkul', data.counts.courses, '📚')}
          ${countCard('Catatan', data.counts.notes, '📝')}
          ${countCard('Tugas', data.counts.tasks, '📋')}
          ${countCard('Skripsi', data.counts.skripsi_milestones, '📗')}
          ${countCard('Portofolio', data.counts.portfolio_items, '🏅')}
        </div>

        <form id="user-edit-form" class="space-y-3">
          <div class="grid sm:grid-cols-2 gap-3">
            <div><label class="a-label">Nama Lengkap *</label><input name="full_name" required value="${esc(u.full_name)}" class="a-input" /></div>
            <div><label class="a-label">Email *</label><input name="email" type="email" required value="${esc(u.email)}" class="a-input" /></div>
          </div>
          <div class="grid sm:grid-cols-2 gap-3">
            <div><label class="a-label">NPM / NIM</label><input name="npm_nim" value="${esc(u.npm_nim || '')}" class="a-input" /></div>
            <div><label class="a-label">Emoji Avatar</label><input name="avatar_emoji" value="${esc(u.avatar_emoji || '🎓')}" class="a-input" /></div>
          </div>
          <div class="grid sm:grid-cols-2 gap-3">
            <div><label class="a-label">Kampus</label>
              <select name="campus_id" id="um-campus" class="a-input">
                <option value="">— Tidak ditentukan —</option>
                ${campuses.map(c => `<option value="${c.id}" ${Number(u.campus_id) === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
              </select>
            </div>
            <div><label class="a-label">Fakultas</label>
              <select name="faculty_id" id="um-faculty" class="a-input" disabled></select>
            </div>
          </div>
          <div><label class="a-label">Program Studi</label>
            <select name="program_id" id="um-program" class="a-input" disabled></select>
            <p class="text-[10px] text-slate-400 mt-1">Kampus, fakultas, dan prodi hanya dapat diubah oleh admin. Perubahan berlaku pada pemuatan aplikasi mahasiswa berikutnya.</p>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label class="a-label">Semester</label>
              <select name="active_semester" class="a-input">
                ${[...Array(9)].map((_, i) => `<option value="${i + 1}" ${Number(u.active_semester) === i + 1 ? 'selected' : ''}>Semester ${i + 1}${i === 8 ? '+' : ''}</option>`).join('')}
              </select></div>
            <div><label class="a-label">Target IPK</label><input name="target_gpa" type="number" min="0" max="4" step="0.01" value="${Number(u.target_gpa ?? 3.5).toFixed(2)}" class="a-input" /></div>
            <div><label class="a-label">Perkiraan Lulus</label><input name="expected_graduation_year" type="number" min="2000" max="2100" value="${esc(u.expected_graduation_year || '')}" class="a-input" /></div>
            <div class="flex items-end pb-1">
              <label class="a-toggle text-xs font-semibold text-slate-600">
                <input type="checkbox" name="is_admin" ${u.is_admin ? 'checked' : ''} />
                <span class="a-toggle-track"></span>
                <span>Administrator</span>
              </label>
            </div>
          </div>
          <p id="user-edit-err" class="text-rose-600 text-xs hidden"></p>
          <div class="flex justify-end gap-2 pt-1">
            <button type="button" data-close class="a-btn a-btn-light">Batal</button>
            <button class="a-btn a-btn-primary">💾 Simpan Perubahan</button>
          </div>
        </form>

        <div class="grid sm:grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p class="text-xs font-bold text-amber-900 mb-2">🔑 Reset Password</p>
            <input id="modal-new-password" type="password" minlength="6" class="a-input" placeholder="Password baru (min. 6)" />
            <button id="modal-reset-password" class="a-btn a-btn-dark w-full mt-2">Reset Password</button>
          </div>
          <div class="bg-rose-50 border border-rose-200 rounded-xl p-3">
            <p class="text-xs font-bold text-rose-900 mb-2">🗑️ Hapus Akun</p>
            <p class="text-[11px] text-rose-700 mb-2">Menghapus akun juga menghapus seluruh data terkait secara permanen.</p>
            <button id="modal-delete-user" class="a-btn a-btn-danger w-full" ${u.id === state.user?.id ? 'disabled' : ''}>
              ${u.id === state.user?.id ? 'Tidak dapat menghapus diri sendiri' : 'Hapus Pengguna'}
            </button>
          </div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(wrapper);

  const close = () => {
    wrapper.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && document.getElementById('user-modal')) close();
  };
  wrapper.addEventListener('click', (e) => { if (e.target === wrapper) close(); });
  wrapper.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', close));
  document.addEventListener('keydown', onKey);

  const form = wrapper.querySelector('#user-edit-form');

  /* ---------- cascade kampus → fakultas → prodi ---------- */
  const campusSel = wrapper.querySelector('#um-campus');
  const facultySel = wrapper.querySelector('#um-faculty');
  const programSel = wrapper.querySelector('#um-program');

  function fillPrograms(keepProgramId) {
    const campus = campuses.find(c => c.id === Number(campusSel.value));
    const faculty = campus?.faculties.find(f => f.id === Number(facultySel.value));
    const programs = faculty?.programs || [];
    programSel.innerHTML = '<option value="">— Pilih Prodi —</option>' +
      programs.map(p => `<option value="${p.id}">${esc(p.fullName || p.name)}</option>`).join('');
    programSel.disabled = !programs.length;
    programSel.value = keepProgramId ? String(keepProgramId) : '';
    if (programSel.value && !programs.some(p => String(p.id) === programSel.value)) programSel.value = '';
  }

  function fillFaculties(keepFacultyId, keepProgramId) {
    const campus = campuses.find(c => c.id === Number(campusSel.value));
    const faculties = campus?.faculties || [];
    facultySel.innerHTML = '<option value="">— Pilih Fakultas —</option>' +
      faculties.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('');
    facultySel.disabled = !faculties.length;
    facultySel.value = keepFacultyId ? String(keepFacultyId) : '';
    fillPrograms(keepProgramId);
  }

  campusSel.addEventListener('change', () => fillFaculties());
  facultySel.addEventListener('change', () => fillPrograms());
  fillFaculties(u.faculty_id, u.program_id);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const errEl = wrapper.querySelector('#user-edit-err');
    errEl.classList.add('hidden');

    if (campusSel.value && !programSel.value) {
      errEl.textContent = 'Pilih fakultas dan program studi, atau kosongkan pilihan kampus.';
      errEl.classList.remove('hidden');
      return;
    }

    const academic = programSel.value ? {
      campus_id: parseInt(campusSel.value, 10),
      faculty_id: parseInt(facultySel.value, 10),
      program_id: parseInt(programSel.value, 10)
    } : {};

    const btn = form.querySelector('button.a-btn-primary');
    btn.disabled = true;
    btn.textContent = '⏳ Menyimpan…';
    try {
      await request(`/api/admin/users/${u.id}`, {
        method: 'PUT',
        body: {
          full_name: fd.get('full_name'),
          email: fd.get('email'),
          npm_nim: fd.get('npm_nim'),
          avatar_emoji: fd.get('avatar_emoji'),
          active_semester: parseInt(fd.get('active_semester'), 10),
          target_gpa: parseFloat(fd.get('target_gpa')),
          expected_graduation_year: fd.get('expected_graduation_year') ? parseInt(fd.get('expected_graduation_year'), 10) : null,
          is_admin: form.querySelector('[name="is_admin"]').checked,
          ...academic
        }
      });
      toast('Data pengguna berhasil disimpan.');
      close();
      loadUsers(state.usersPage, state.usersSearch);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = '💾 Simpan Perubahan';
    }
  });

  wrapper.querySelector('#modal-reset-password').addEventListener('click', async () => {
    const input = wrapper.querySelector('#modal-new-password');
    const password = input.value;
    if (password.length < 6) return toast('Password baru minimal 6 karakter.', 'warn');
    if (!confirm(`Reset password untuk ${u.full_name}?`)) return;
    try {
      const res = await request(`/api/admin/users/${u.id}/reset-password`, {
        method: 'POST', body: { new_password: password }
      });
      input.value = '';
      toast(res.message || 'Password berhasil direset.');
    } catch (err) { toast(err.message, 'error'); }
  });

  wrapper.querySelector('#modal-delete-user').addEventListener('click', async () => {
    if (u.id === state.user?.id) return;
    if (!confirm(`Hapus akun "${u.full_name}" beserta seluruh datanya?`)) return;
    try {
      const res = await request(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      toast(res.message || 'Pengguna dihapus.');
      close();
      loadUsers(state.usersPage, state.usersSearch);
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ============================================================
 * KAMPUS & PRODI
 * ============================================================ */
let featureCatalog = null;

async function loadAcademic() {
  const [{ campuses }, featuresData] = await Promise.all([
    request('/api/admin/campuses'),
    request('/api/admin/features')
  ]);
  featureCatalog = featuresData.features;
  const main = document.getElementById('admin-main');
  const totalPrograms = campuses.reduce((n, c) => n + c.faculties.reduce((m, f) => m + f.programs.length, 0), 0);

  const campusCard = (c) => `
    <section class="a-card p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-extrabold text-slate-800">${esc(c.name)}</h3>
            ${c.isDefault
              ? '<span class="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Default</span>'
              : '<span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Custom</span>'}
            ${c.isActive
              ? '<span class="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Aktif</span>'
              : '<span class="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">Nonaktif</span>'}
          </div>
          <p class="text-[11px] text-slate-500 mt-1">${esc(c.short_name || '')} · ${c.userCount} mahasiswa · ${c.faculties.length} fakultas</p>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button data-add-faculty="${c.id}" class="a-btn a-btn-primary a-btn-sm">+ Fakultas</button>
          <button data-edit-campus="${c.id}" class="a-btn a-btn-light a-btn-sm">✏️ Edit</button>
          <button data-toggle-campus="${c.id}" class="a-btn a-btn-light a-btn-sm">${c.isActive ? '⏸️ Nonaktifkan' : '▶️ Aktifkan'}</button>
          ${c.isDefault ? '' : `<button data-del-campus="${c.id}" class="a-btn a-btn-danger a-btn-sm">🗑️</button>`}
        </div>
      </div>

      <div class="mt-3 space-y-2">
        ${c.faculties.length === 0
          ? '<p class="text-xs text-slate-400 py-2">Belum ada fakultas. Tambahkan fakultas pertama.</p>'
          : c.faculties.map(f => `
            <div class="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-semibold text-sm text-slate-800">${esc(f.name)}</p>
                  <p class="text-[10px] text-slate-400">${f.userCount} mahasiswa · ${f.programs.length} prodi</p>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button data-add-program="${f.id}" class="a-btn a-btn-light a-btn-sm">+ Prodi</button>
                  <button data-feat-faculty="${f.id}" data-name="${esc(f.name)}" class="a-btn a-btn-light a-btn-sm">🧩 Fitur Fakultas</button>
                  <button data-edit-faculty="${f.id}" class="a-btn a-btn-light a-btn-sm">✏️</button>
                  <button data-del-faculty="${f.id}" data-name="${esc(f.name)}" class="a-btn a-btn-danger a-btn-sm">🗑️</button>
                </div>
              </div>
              <div class="grid sm:grid-cols-2 gap-2 mt-2">
                ${f.programs.length === 0
                  ? '<p class="text-[11px] text-slate-400">Belum ada prodi.</p>'
                  : f.programs.map(pr => `
                    <div class="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <div class="min-w-0">
                        <p class="text-xs font-semibold text-slate-700 truncate">${esc(pr.name)} <span class="text-slate-400 font-normal">(${esc(pr.level)})</span></p>
                        <p class="text-[10px] text-slate-400">${pr.userCount} mahasiswa</p>
                      </div>
                      <div class="flex gap-1 shrink-0">
                        <button data-feat-program="${pr.id}" data-name="${esc(pr.fullName)}" class="a-btn a-btn-light a-btn-sm" title="Atur fitur">🧩</button>
                        <button data-edit-program="${pr.id}" data-name="${esc(pr.name)}" data-level="${esc(pr.level)}" class="a-btn a-btn-light a-btn-sm" title="Edit prodi">✏️</button>
                        <button data-del-program="${pr.id}" data-name="${esc(pr.fullName)}" class="a-btn a-btn-danger a-btn-sm" title="Hapus prodi">🗑️</button>
                      </div>
                    </div>`).join('')}
              </div>
            </div>`).join('')}
      </div>
    </section>`;

  main.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div>
        <h2 class="text-xl font-extrabold text-slate-800">Kampus, Fakultas & Prodi</h2>
        <p class="text-xs text-slate-500">${campuses.length} kampus · ${totalPrograms} prodi. Fitur dapat dipetakan per prodi maupun per fakultas.</p>
      </div>
      <button id="add-campus" class="a-btn a-btn-primary">+ Tambah Kampus</button>
    </div>
    <div class="space-y-4">${campuses.map(campusCard).join('')}</div>`;

  const refresh = () => loadAcademic();
  main.querySelector('#add-campus').addEventListener('click', async () => {
    const name = prompt('Nama kampus baru:');
    if (!name || !name.trim()) return;
    const shortName = prompt('Nama singkat kampus (opsional):', name.trim()) || '';
    try {
      const res = await request('/api/admin/campuses', { method: 'POST', body: { name: name.trim(), short_name: shortName.trim() } });
      toast(res.message || 'Kampus ditambahkan.');
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  });

  main.querySelectorAll('[data-add-faculty]').forEach(btn => btn.addEventListener('click', async () => {
    const name = prompt('Nama fakultas:');
    if (!name || !name.trim()) return;
    try {
      const res = await request('/api/admin/faculties', { method: 'POST', body: { campus_id: Number(btn.dataset.addFaculty), name: name.trim() } });
      toast(res.message || 'Fakultas ditambahkan.');
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  }));

  main.querySelectorAll('[data-edit-campus]').forEach(btn => btn.addEventListener('click', async () => {
    const campus = campuses.find(c => c.id === Number(btn.dataset.editCampus));
    if (!campus) return;
    let name = campus.name;
    if (!campus.isDefault) {
      name = prompt('Nama kampus:', campus.name);
      if (name === null) return;
      if (!name.trim()) return toast('Nama kampus wajib diisi.', 'warn');
    }
    const shortName = prompt('Nama singkat:', campus.short_name || '');
    if (shortName === null) return;
    try {
      const res = await request(`/api/admin/campuses/${campus.id}`, { method: 'PUT', body: { name: name.trim(), short_name: shortName.trim() } });
      toast(res.message || 'Kampus diperbarui.');
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  }));

  main.querySelectorAll('[data-toggle-campus]').forEach(btn => btn.addEventListener('click', async () => {
    const campus = campuses.find(c => c.id === Number(btn.dataset.toggleCampus));
    if (!campus) return;
    try {
      const res = await request(`/api/admin/campuses/${campus.id}`, {
        method: 'PUT', body: { is_active: !campus.isActive }
      });
      toast(res.message || 'Status kampus diperbarui.');
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  }));

  main.querySelectorAll('[data-del-campus]').forEach(btn => btn.addEventListener('click', async () => {
    const campus = campuses.find(c => c.id === Number(btn.dataset.delCampus));
    if (!campus || !confirm(`Hapus kampus "${campus.name}"? Kampus default tidak dapat dihapus.`)) return;
    try {
      const res = await request(`/api/admin/campuses/${campus.id}`, { method: 'DELETE' });
      toast(res.message || 'Kampus dihapus.');
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  }));

  main.querySelectorAll('[data-add-program]').forEach(btn => btn.addEventListener('click', async () => {
    const name = prompt('Nama program studi (tanpa gelar):');
    if (!name || !name.trim()) return;
    const level = prompt('Jenjang:', 'S1') || 'S1';
    try {
      const res = await request('/api/admin/programs', {
        method: 'POST', body: { faculty_id: Number(btn.dataset.addProgram), name: name.trim(), level: level.trim().toUpperCase() }
      });
      toast(res.message || 'Prodi ditambahkan.');
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  }));

  main.querySelectorAll('[data-edit-faculty]').forEach(btn => btn.addEventListener('click', async () => {
    let faculty = null;
    for (const c of campuses) faculty = faculty || c.faculties.find(f => f.id === Number(btn.dataset.editFaculty));
    if (!faculty) return;
    const name = prompt('Nama fakultas:', faculty.name);
    if (name === null || !name.trim()) return;
    try {
      const res = await request(`/api/admin/faculties/${faculty.id}`, { method: 'PUT', body: { name: name.trim() } });
      toast(res.message || 'Fakultas diperbarui.');
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  }));

  main.querySelectorAll('[data-del-faculty]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm(`Hapus fakultas "${btn.dataset.name}"? Prodi di dalamnya juga akan dihapus.`)) return;
    try {
      const res = await request(`/api/admin/faculties/${btn.dataset.delFaculty}`, { method: 'DELETE' });
      toast(res.message || 'Fakultas dihapus.');
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  }));

  main.querySelectorAll('[data-edit-program]').forEach(btn => btn.addEventListener('click', async () => {
    const name = prompt('Nama prodi:', btn.dataset.name);
    if (name === null || !name.trim()) return;
    const level = prompt('Jenjang:', btn.dataset.level) || btn.dataset.level || 'S1';
    try {
      const res = await request(`/api/admin/programs/${btn.dataset.editProgram}`, {
        method: 'PUT', body: { name: name.trim(), level: level.trim().toUpperCase() }
      });
      toast(res.message || 'Prodi diperbarui.');
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  }));

  main.querySelectorAll('[data-del-program]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm(`Hapus prodi "${btn.dataset.name}"?`)) return;
    try {
      const res = await request(`/api/admin/programs/${btn.dataset.delProgram}`, { method: 'DELETE' });
      toast(res.message || 'Prodi dihapus.');
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  }));

  main.querySelectorAll('[data-feat-program]').forEach(btn => btn.addEventListener('click', () =>
    openFeatureModal('program', Number(btn.dataset.featProgram), btn.dataset.name)));
  main.querySelectorAll('[data-feat-faculty]').forEach(btn => btn.addEventListener('click', () =>
    openFeatureModal('faculty', Number(btn.dataset.featFaculty), btn.dataset.name)));
}

async function openFeatureModal(type, id, name) {
  let data;
  try {
    data = await request(type === 'program'
      ? `/api/admin/programs/${id}/features`
      : `/api/admin/faculties/${id}/features`);
  } catch (err) { return toast(err.message, 'error'); }

  const catalog = featureCatalog || (await request('/api/admin/features')).features;
  const selected = new Set(data.features || []);
  const selectable = catalog.filter(f => !f.isCore && !f.isGeneral);
  const groups = {};
  for (const f of selectable) (groups[f.group || 'Umum'] ||= []).push(f);

  const wrapper = document.createElement('div');
  wrapper.className = 'a-modal-backdrop';
  wrapper.innerHTML = `
    <div class="a-modal" role="dialog" aria-modal="true" aria-label="Atur fitur">
      <div class="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
        <div>
          <h2 class="font-extrabold text-slate-800">🧩 Fitur ${type === 'program' ? 'Prodi' : 'Fakultas'}</h2>
          <p class="text-xs text-slate-500 mt-0.5">${esc(name)}</p>
        </div>
        <button data-close class="text-slate-400 hover:text-slate-700 text-xl leading-none p-1">✕</button>
      </div>
      <div class="p-5 max-h-[65vh] overflow-y-auto space-y-4">
        <p class="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
          Fitur inti dan umum (dashboard, catatan, kalkulator, dll.) selalu tersedia dan tidak perlu dipilih.
          ${type === 'faculty' ? 'Fitur fakultas berlaku untuk semua prodi di fakultas ini.' : ''}
        </p>
        ${Object.entries(groups).map(([group, items]) => `
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">${esc(group)}</p>
            <div class="grid sm:grid-cols-2 gap-1.5">
              ${items.map(f => `
                <label class="flex items-start gap-2 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" value="${esc(f.key)}" ${selected.has(f.key) ? 'checked' : ''} class="mt-0.5 accent-indigo-600" />
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-slate-700">${esc(f.icon)} ${esc(f.label)}</span>
                    <span class="block text-[10px] text-slate-400">${esc(f.description || '')}</span>
                  </span>
                </label>`).join('')}
            </div>
          </div>`).join('')}
        <p id="feat-err" class="text-rose-600 text-xs hidden"></p>
      </div>
      <div class="flex justify-end gap-2 p-4 border-t border-slate-200">
        <button type="button" data-close class="a-btn a-btn-light">Batal</button>
        <button type="button" id="feat-save" class="a-btn a-btn-primary">💾 Simpan Fitur</button>
      </div>
    </div>`;
  document.body.appendChild(wrapper);

  const close = () => wrapper.remove();
  wrapper.addEventListener('click', e => { if (e.target === wrapper) close(); });
  wrapper.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));

  wrapper.querySelector('#feat-save').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = '⏳ Menyimpan…';
    const keys = [...wrapper.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value);
    try {
      const res = await request(type === 'program'
        ? `/api/admin/programs/${id}/features`
        : `/api/admin/faculties/${id}/features`, {
        method: 'PUT', body: { features: keys }
      });
      toast(res.message || 'Fitur berhasil disimpan.');
      close();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = '💾 Simpan Fitur';
      const errEl = wrapper.querySelector('#feat-err');
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });
}

/* ============================================================
 * BACKUP & RESTORE
 * ============================================================ */
async function loadBackup() {
  const { backups } = await request('/api/admin/database/backups');
  const main = document.getElementById('admin-main');

  main.innerHTML = `
    <div class="mb-5">
      <h2 class="text-xl font-extrabold text-slate-800">Backup & Restore Database</h2>
      <p class="text-xs text-slate-500">Ekspor seluruh data ke JSON/SQLite, atau pulihkan dari file backup.</p>
    </div>

    <div class="grid lg:grid-cols-2 gap-5 mb-5">
      <section class="a-card p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-extrabold text-slate-800">📤 Ekspor Database</h3>
            <p class="text-xs text-slate-500 mt-1">Unduh salinan lengkap seluruh tabel, termasuk akun, nilai, catatan, dan pengaturan.</p>
          </div>
          <span class="text-2xl">💾</span>
        </div>
        <div class="grid sm:grid-cols-2 gap-2 mt-4">
          <button id="export-json" class="a-btn a-btn-primary py-2.5">⬇️ Backup JSON</button>
          <button id="export-sqlite" class="a-btn a-btn-dark py-2.5">⬇️ Backup SQLite</button>
        </div>
        <p class="text-[11px] text-slate-400 mt-2">JSON mudah diperiksa dan dipindahkan; SQLite cocok untuk arsip penuh.</p>
        <p class="text-[11px] text-rose-600 mt-2">🔒 Simpan file backup secara aman: file berisi akun dan hash password. File avatar di <code class="font-mono bg-slate-100 px-1 rounded">data/uploads</code> tidak termasuk dalam backup database.</p>
      </section>

      <section class="a-card p-5 border-amber-200">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-extrabold text-slate-800">📥 Impor / Restore</h3>
            <p class="text-xs text-slate-500 mt-1">Pulihkan database dari file <b>.json</b>, <b>.db</b>, atau <b>.sqlite</b> (maks. 50 MB).</p>
          </div>
          <span class="text-2xl">♻️</span>
        </div>
        <div class="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
          ⚠️ Import akan <b>mengganti seluruh data</b> saat ini. Backup otomatis dibuat sebelum import. Semua sesi login akan dihentikan.
        </div>
        <label class="block mt-3">
          <span class="a-label">File Backup</span>
          <input id="import-file" type="file" accept=".json,.db,.sqlite,.sqlite3" class="a-input file:mr-3 file:border-0 file:bg-indigo-50 file:text-indigo-700 file:px-3 file:py-1.5 file:rounded-lg file:text-xs file:font-bold" />
        </label>
        <button id="import-btn" class="a-btn a-btn-danger w-full mt-3 py-2.5" disabled>♻️ Import & Ganti Database</button>
      </section>
    </div>

    <div class="grid lg:grid-cols-3 gap-5">
      <section class="lg:col-span-2 a-card overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h3 class="font-extrabold text-slate-800">🛟 Backup Otomatis Sebelum Import</h3>
            <p class="text-[11px] text-slate-500">Maksimal 10 backup terbaru disimpan otomatis.</p>
          </div>
          <button id="refresh-backups" class="a-btn a-btn-light a-btn-sm">↻ Refresh</button>
        </div>
        ${backups.length === 0
          ? emptyState('🛟', 'Belum ada backup otomatis', 'Backup akan muncul setelah Anda melakukan import.')
          : `<div class="overflow-x-auto"><table class="a-table">
              <thead><tr><th>Nama File</th><th>Ukuran</th><th>Dibuat</th><th class="text-right">Aksi</th></tr></thead>
              <tbody>${backups.map(b => `
                <tr>
                  <td class="font-mono text-[11px] text-slate-700 break-all">${esc(b.filename)}</td>
                  <td class="whitespace-nowrap">${fmtBytes(b.size)}</td>
                  <td class="text-[11px] text-slate-500 whitespace-nowrap">${fmtDateTime(b.created_at)}</td>
                  <td><div class="flex justify-end gap-1.5">
                    <button data-backup-download="${esc(b.filename)}" class="a-btn a-btn-light a-btn-sm">⬇️</button>
                    <button data-backup-delete="${esc(b.filename)}" class="a-btn a-btn-danger a-btn-sm">🗑</button>
                  </div></td>
                </tr>`).join('')}</tbody>
            </table></div>`}
      </section>

      <section class="a-card p-5">
        <h3 class="font-extrabold text-slate-800">🧹 Optimalkan Database</h3>
        <p class="text-xs text-slate-500 mt-1">Jalankan <code class="font-mono text-[11px] bg-slate-100 px-1 rounded">VACUUM</code> untuk merapikan ruang kosong dan memperkecil ukuran file database.</p>
        <button id="vacuum-db" class="a-btn a-btn-light w-full mt-4">🧹 Jalankan VACUUM</button>
      </section>
    </div>`;

  const fileInput = document.getElementById('import-file');
  const importBtn = document.getElementById('import-btn');

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    importBtn.disabled = !file;
    if (file && file.size > 50 * 1024 * 1024) {
      importBtn.disabled = true;
      toast('File melebihi batas 50 MB.', 'error');
    }
  });

  document.getElementById('export-json').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = '⏳ Menyiapkan…';
    try {
      const filename = await downloadFile('/api/admin/database/export?format=json', 'gradify-backup.json');
      toast(`Backup JSON diunduh: ${filename}`);
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '⬇️ Backup JSON'; }
  });

  document.getElementById('export-sqlite').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = '⏳ Menyiapkan…';
    try {
      const filename = await downloadFile('/api/admin/database/export?format=sqlite', 'gradify-backup.db');
      toast(`Backup SQLite diunduh: ${filename}`);
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '⬇️ Backup SQLite'; }
  });

  importBtn.addEventListener('click', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!confirm('Import akan MENGGANTI seluruh database saat ini. Backup otomatis akan dibuat terlebih dahulu. Lanjutkan?')) return;

    const fd = new FormData();
    fd.append('backup', file);
    importBtn.disabled = true;
    importBtn.textContent = '⏳ Mengimpor database…';
    try {
      const res = await request('/api/admin/database/import', { method: 'POST', form: fd });
      clearSession();
      toast(`${res.message} Backup keamanan: ${res.safety_backup}`, 'success');
      setTimeout(() => renderLogin('Database berhasil dipulihkan. Silakan login kembali.'), 1200);
    } catch (err) {
      importBtn.disabled = false;
      importBtn.textContent = '♻️ Import & Ganti Database';
      toast(err.message, 'error');
    }
  });

  document.getElementById('refresh-backups').addEventListener('click', () => loadBackup());

  main.querySelectorAll('[data-backup-download]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const filename = btn.dataset.backupDownload;
      try {
        await downloadFile(`/api/admin/database/backups/${encodeURIComponent(filename)}`, filename);
        toast('Backup diunduh.');
      } catch (err) { toast(err.message, 'error'); }
    });
  });

  main.querySelectorAll('[data-backup-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const filename = btn.dataset.backupDelete;
      if (!confirm(`Hapus backup "${filename}"?`)) return;
      try {
        await request(`/api/admin/database/backups/${encodeURIComponent(filename)}`, { method: 'DELETE' });
        toast('Backup dihapus.');
        loadBackup();
      } catch (err) { toast(err.message, 'error'); }
    });
  });

  document.getElementById('vacuum-db').addEventListener('click', async (e) => {
    if (!confirm('Jalankan VACUUM untuk mengoptimalkan database?')) return;
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = '⏳ Mengoptimalkan…';
    try {
      const res = await request('/api/admin/database/vacuum', { method: 'POST', body: {} });
      toast(`Database dioptimalkan: ${fmtBytes(res.before)} → ${fmtBytes(res.after)}`);
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '🧹 Jalankan VACUUM'; }
  });
}

/* ============================================================
 * SETTINGS
 * ============================================================ */
async function loadSettings() {
  const [{ settings: s }, { campuses }] = await Promise.all([
    request('/api/admin/settings'),
    request('/api/admin/campuses')
  ]);
  const main = document.getElementById('admin-main');
  const currentGpa = Number(s.default_target_gpa || 3.5).toFixed(2);

  const toggle = (name, checked, label, description) => `
    <label class="a-toggle items-start">
      <input type="checkbox" name="${name}" ${checked ? 'checked' : ''} />
      <span class="a-toggle-track mt-0.5"></span>
      <span class="min-w-0">
        <span class="block text-sm font-semibold text-slate-800">${esc(label)}</span>
        <span class="block text-[11px] text-slate-500 mt-0.5">${esc(description)}</span>
      </span>
    </label>`;

  function logoSection(key, label, description, icon) {
    const currentLogo = s[key];
    const hasLogo = currentLogo && currentLogo.length > 0;
    const preview = hasLogo
      ? `<img src="${esc(currentLogo)}" alt="${esc(label)}" class="h-20 w-20 object-contain" />`
      : '<div class="h-20 w-20 flex items-center justify-center text-slate-300 text-xs">Kosong</div>';
    return `
      <section class="a-card p-5 space-y-4">
        <h3 class="font-extrabold text-slate-800">${icon} ${label}</h3>
        <p class="text-xs text-slate-500">${esc(description)}</p>
        <div class="flex items-center gap-4">
          <div class="shrink-0">${preview}</div>
          <div class="flex-1 min-w-0">
            <form class="logo-upload-form" data-key="${key}" enctype="multipart/form-data">
              <input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="a-input file:mr-3 file:border-0 file:bg-indigo-50 file:text-indigo-700 file:px-3 file:py-1.5 file:rounded-lg file:text-xs file:font-bold" />
              <p class="text-[10px] text-slate-400 mt-1">Format: PNG, JPG, WebP, SVG. Maksimal 2MB.</p>
              <div class="flex gap-2 mt-3">
                <button type="submit" class="a-btn a-btn-primary a-btn-sm">⬆️ Unggah</button>
                ${hasLogo ? `<button type="button" class="a-btn a-btn-danger a-btn-sm logo-delete" data-key="${key}">🗑️ Hapus</button>` : ''}
              </div>
            </form>
          </div>
        </div>
      </section>`;
  }

  function campusPanelHtml(c) {
    const hasLogo = c.logo_url && c.logo_url.length > 0;
    const preview = hasLogo
      ? `<img src="${esc(c.logo_url)}" alt="Logo ${esc(c.campus_name)}" class="h-20 w-20 object-contain" />`
      : '<div class="h-20 w-20 flex items-center justify-center text-slate-300 text-[10px] text-center leading-tight">Belum ada logo</div>';
    return `
      <div class="flex flex-wrap items-center gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50">
        <div class="shrink-0">${preview}</div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-slate-800 truncate">${esc(c.campus_name)}</p>
          <p class="text-[10px] text-slate-400">${c.user_count} mahasiswa terdaftar</p>
          <form class="campus-logo-form mt-2" enctype="multipart/form-data">
            <input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="a-input file:mr-3 file:border-0 file:bg-indigo-50 file:text-indigo-700 file:px-3 file:py-1.5 file:rounded-lg file:text-xs file:font-bold" />
            <p class="text-[10px] text-slate-400 mt-1">Format: PNG, JPG, WebP, SVG. Maksimal 2MB.</p>
            <div class="flex gap-2 mt-2">
              <button type="submit" class="a-btn a-btn-primary a-btn-sm">⬆️ Unggah Logo</button>
              ${hasLogo ? '<button type="button" class="a-btn a-btn-danger a-btn-sm campus-logo-delete">🗑️ Hapus</button>' : ''}
            </div>
          </form>
        </div>
      </div>`;
  }

  function campusLogoSection(campuses) {
    if (campuses.length === 0) {
      return `
        <section class="a-card p-5 space-y-4 lg:col-span-2">
          <h3 class="font-extrabold text-slate-800">🏫 Logo Kampus (Per Kampus)</h3>
          <p class="text-xs text-slate-500 mt-1">Setiap kampus punya logo sendiri. Logo akan muncul di Kartu Tanda Mahasiswa sesuai nama kampus mahasiswa.</p>
          ${emptyState('🏫', 'Belum ada kampus terdaftar', 'Kampus akan muncul otomatis dari data pengguna.')}
        </section>`;
    }

    return `
      <section class="a-card p-5 space-y-4 lg:col-span-2">
        <div>
          <h3 class="font-extrabold text-slate-800">🏫 Logo Kampus (Per Kampus)</h3>
          <p class="text-xs text-slate-500 mt-1">Pilih kampus terlebih dahulu, lalu unggah atau ganti logo kampus tersebut. Logo akan muncul di Kartu Tanda Mahasiswa sesuai nama kampus mahasiswa.</p>
        </div>
        <div>
          <label class="a-label">Pilih Kampus</label>
          <select id="campus-logo-select" class="a-input sm:max-w-md">
            <option value="">— Pilih Kampus —</option>
            ${campuses.map(c => `<option value="${esc(c.campus_name)}">${esc(c.campus_name)} (${c.user_count} mahasiswa)</option>`).join('')}
          </select>
        </div>
        <div id="campus-logo-panel"></div>
      </section>`;
  }

  async function showCampusPanel(campusName) {
    const panel = document.getElementById('campus-logo-panel');
    if (!panel) return;
    if (!campusName) { panel.innerHTML = ''; return; }

    panel.innerHTML = loading('Memuat logo kampus…');
    try {
      const { campuses } = await request('/api/admin/campuses');
      const c = campuses.find(x => x.campus_name === campusName);
      if (!c) {
        panel.innerHTML = '<p class="text-xs text-slate-400">Kampus tidak ditemukan.</p>';
        return;
      }
      panel.innerHTML = campusPanelHtml(c);

      const formEl = panel.querySelector('.campus-logo-form');
      formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = formEl.querySelector('input[type="file"]');
        const file = fileInput.files?.[0];
        if (!file) return toast('Pilih file logo terlebih dahulu.', 'warn');

        const submitBtn = formEl.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Mengunggah…';

        const fd = new FormData();
        fd.append('campus_name', c.campus_name);
        fd.append('logo', file);

        try {
          const res = await request('/api/admin/campuses/logo', { method: 'POST', form: fd });
          toast(res.message || 'Logo kampus berhasil diunggah.');
          showCampusPanel(c.campus_name); // Refresh panel dengan logo baru
        } catch (err) {
          toast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = '⬆️ Unggah Logo';
        }
      });

      panel.querySelector('.campus-logo-delete')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        if (!confirm(`Hapus logo untuk ${c.campus_name}?`)) return;

        btn.disabled = true;
        btn.textContent = '⏳ Menghapus…';

        try {
          const res = await request(`/api/admin/campuses/logo?campus=${encodeURIComponent(c.campus_name)}`, {
            method: 'DELETE'
          });
          toast(res.message || 'Logo kampus berhasil dihapus.');
          showCampusPanel(c.campus_name); // Refresh panel
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = '🗑️ Hapus';
        }
      });
    } catch (err) {
      panel.innerHTML = '';
      toast(err.message, 'error');
    }
  }

  main.innerHTML = `
    <div class="mb-5">
      <h2 class="text-xl font-extrabold text-slate-800">Pengaturan Website</h2>
      <p class="text-xs text-slate-500">Atur identitas situs, akses pengguna, dan mode pemeliharaan.</p>
    </div>

    <form id="settings-form" class="grid lg:grid-cols-2 gap-5">
      <section class="a-card p-5 space-y-3">
        <h3 class="font-extrabold text-slate-800">🏷️ Identitas Situs</h3>
        <div><label class="a-label">Nama Situs *</label><input name="site_name" required value="${esc(s.site_name)}" class="a-input" /></div>
        <div><label class="a-label">Tagline</label><input name="site_tagline" value="${esc(s.site_tagline)}" class="a-input" /></div>
        <div><label class="a-label">Email Dukungan</label><input name="support_email" type="email" value="${esc(s.support_email)}" class="a-input" /></div>
        <div><label class="a-label">Pengumuman Global</label>
          <textarea name="announcement" rows="3" class="a-input" placeholder="Tampil sebagai banner di aplikasi utama…">${esc(s.announcement)}</textarea>
          <p class="text-[10px] text-slate-400 mt-1">Kosongkan untuk menyembunyikan banner pengumuman.</p>
        </div>
      </section>

      <section class="a-card p-5 space-y-4">
        <h3 class="font-extrabold text-slate-800">🔐 Registrasi & Akses</h3>
        ${toggle('registration_enabled', s.registration_enabled === '1', 'Buka pendaftaran akun baru', 'Jika dimatikan, halaman registrasi mahasiswa akan ditutup.')}
        ${toggle('allow_custom_campus', s.allow_custom_campus === '1', 'Izinkan kampus custom', 'Mahasiswa dapat mendaftar dengan kampus di luar preset UNIKA UST.')}
        <div>
          <label class="a-label">Target IPK Default</label>
          <input name="default_target_gpa" type="number" min="0" max="4" step="0.01" value="${currentGpa}" class="a-input" />
          <p class="text-[10px] text-slate-400 mt-1">Dipakai saat mahasiswa mendaftar tanpa memilih target IPK.</p>
        </div>
      </section>

      <section class="a-card p-5 space-y-4">
        <h3 class="font-extrabold text-slate-800">🛠️ Mode Pemeliharaan</h3>
        ${toggle('maintenance_mode', s.maintenance_mode === '1', 'Aktifkan mode pemeliharaan', 'Aplikasi utama akan menampilkan halaman perbaikan. Dashboard admin tetap dapat diakses.')}
        <div><label class="a-label">Pesan Pemeliharaan</label>
          <textarea name="maintenance_message" rows="3" class="a-input">${esc(s.maintenance_message)}</textarea>
        </div>
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500">
          🔗 Dashboard admin: <a href="/admin" target="_blank" class="font-mono text-indigo-600 hover:underline">/admin</a>
        </div>
      </section>

      <section class="a-card p-5 flex flex-col justify-between">
        <div>
          <h3 class="font-extrabold text-slate-800">💾 Simpan Pengaturan</h3>
          <p class="text-xs text-slate-500 mt-1">Perubahan berlaku langsung setelah disimpan.</p>
          <p id="settings-err" class="text-rose-600 text-xs hidden mt-2"></p>
          <p id="settings-ok" class="text-emerald-600 text-xs hidden mt-2">Pengaturan berhasil disimpan.</p>
        </div>
        <button class="a-btn a-btn-primary w-full py-2.5 mt-4">💾 Simpan Semua Pengaturan</button>
      </section>
    </form>

    <div class="grid lg:grid-cols-2 gap-5 mt-5">
      ${logoSection('site_logo', 'Logo Website', 'Logo ini akan ditampilkan di header, splash screen, dan favicon situs.', '🌐')}
    </div>

    <div class="mt-5">
      ${campusLogoSection(campuses)}
    </div>

    <section class="a-card p-5 mt-5 max-w-2xl">
      <h3 class="font-extrabold text-slate-800">🔑 Keamanan Akun Admin</h3>
      <p class="text-xs text-slate-500 mt-1">Ganti password akun administrator yang sedang digunakan.</p>
      <form id="admin-password-form" class="grid sm:grid-cols-2 gap-3 mt-4">
        <div><label class="a-label">Password Saat Ini</label><input name="current_password" type="password" required class="a-input" /></div>
        <div><label class="a-label">Password Baru (min. 8)</label><input name="new_password" type="password" minlength="8" required class="a-input" /></div>
        <p id="password-err" class="text-rose-600 text-xs hidden sm:col-span-2"></p>
        <div class="sm:col-span-2"><button class="a-btn a-btn-dark">🔒 Ganti Password Admin</button></div>
      </form>
    </section>`;

  const form = document.getElementById('settings-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const errEl = document.getElementById('settings-err');
    const okEl = document.getElementById('settings-ok');
    errEl.classList.add('hidden');
    okEl.classList.add('hidden');
    const btn = form.querySelector('button.a-btn-primary');
    btn.disabled = true;
    btn.textContent = '⏳ Menyimpan…';
    try {
      const res = await request('/api/admin/settings', {
        method: 'PUT',
        body: {
          site_name: fd.get('site_name'),
          site_tagline: fd.get('site_tagline'),
          support_email: fd.get('support_email'),
          announcement: fd.get('announcement'),
          registration_enabled: form.querySelector('[name="registration_enabled"]').checked,
          allow_custom_campus: form.querySelector('[name="allow_custom_campus"]').checked,
          maintenance_mode: form.querySelector('[name="maintenance_mode"]').checked,
          maintenance_message: fd.get('maintenance_message'),
          default_target_gpa: fd.get('default_target_gpa')
        }
      });
      okEl.classList.remove('hidden');
      toast(res.message || 'Pengaturan berhasil disimpan.');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Simpan Semua Pengaturan';
    }
  });

  // Logo upload handlers
  main.querySelectorAll('.logo-upload-form').forEach(formEl => {
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const key = formEl.dataset.key;
      const fileInput = formEl.querySelector('input[type="file"]');
      const file = fileInput.files?.[0];
      if (!file) return toast('Pilih file logo terlebih dahulu.', 'warn');
      
      const submitBtn = formEl.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Mengunggah…';
      
      const fd = new FormData();
      fd.append('logo', file);
      
      try {
        const res = await request(`/api/admin/settings/logo/${key === 'site_logo' ? 'site' : 'campus'}`, {
          method: 'POST',
          form: fd
        });
        toast(res.message || 'Logo berhasil diunggah.');
        fileInput.value = '';
        loadSettings(); // Reload to show updated logo
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '⬆️ Unggah';
      }
    });
  });

  // Logo kampus: dropdown pemilihan kampus → tampilkan panel logonya
  document.getElementById('campus-logo-select')?.addEventListener('change', (e) => {
    showCampusPanel(e.target.value);
  });

  // Logo delete handlers
  main.querySelectorAll('.logo-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      if (!confirm(`Hapus ${key === 'site_logo' ? 'logo website' : 'logo kampus'}?`)) return;
      
      btn.disabled = true;
      btn.textContent = '⏳ Menghapus…';
      
      try {
        const res = await request(`/api/admin/settings/logo/${key === 'site_logo' ? 'site' : 'campus'}`, {
          method: 'DELETE'
        });
        toast(res.message || 'Logo berhasil dihapus.');
        loadSettings(); // Reload to show updated state
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = '🗑️ Hapus';
      }
    });
  });

  document.getElementById('admin-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = document.getElementById('password-err');
    errEl.classList.add('hidden');
    try {
      await request('/api/admin/password', {
        method: 'PUT',
        body: {
          current_password: fd.get('current_password'),
          new_password: fd.get('new_password')
        }
      });
      toast('Password admin berhasil diubah.');
      e.target.reset();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });
}

/* ============================================================
 * START
 * ============================================================ */
init();
startIconEngine();
