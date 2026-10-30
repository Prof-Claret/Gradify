/**
 * Profile & Identity Hub (Phase 0.2) — edit metadata, photo avatar, semester aktif & keamanan
 */
import { esc, toast } from '../app.js';

export const subtitle = () => 'Metadata mahasiswa, foto profil aman, semester aktif & keamanan';

export async function render(main, ctx) {
  const { api } = ctx;
  const u = ctx.user;

  const currentAvatarHtml = u.avatar_url
    ? `<img id="pf-avatar-current-img" src="${esc(u.avatar_url)}" alt="${esc(u.full_name)}" class="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400 shadow-sm" onerror="this.outerHTML='<div class=\\'w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-3xl\\'>${esc(u.avatar_emoji || '🎓')}</div>'" />`
    : `<div class="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-3xl">${esc(u.avatar_emoji || '🎓')}</div>`;

  main.innerHTML = `
  <div class="grid lg:grid-cols-2 gap-6">
    <!-- Identity Form -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div class="flex items-center gap-4 mb-4">
        ${currentAvatarHtml}
        <div>
          <h3 class="font-bold text-slate-800">${esc(u.full_name)}</h3>
          <p class="text-xs text-slate-500">${esc(u.email)}</p>
          <p class="text-[11px] mt-1">
            <span class="bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">Semester ${u.active_semester}</span>
            ${u.avatar_url ? `<span class="ml-1 bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Foto Aktif</span>` : ''}
          </p>
        </div>
      </div>

      <form id="pf-form" class="space-y-3">
        <div class="grid md:grid-cols-2 gap-3">
          <div><label class="g-lbl">Nama Lengkap</label><input name="full_name" value="${esc(u.full_name)}" class="g-inp" required /></div>
          <div><label class="g-lbl">Emoji Cadangan / Fallback</label>
            <div id="pf-avatars" class="flex flex-wrap gap-1"></div>
          </div>
        </div>
        <div class="grid md:grid-cols-2 gap-3">
          <div><label class="g-lbl">NPM / NIM</label><input name="npm_nim" value="${esc(u.npm_nim || '')}" class="g-inp" /></div>
          <div><label class="g-lbl">Semester Aktif</label>
            <select name="active_semester" class="g-inp">
              ${[...Array(8)].map((_, i) => `<option value="${i + 1}" ${u.active_semester === i + 1 ? 'selected' : ''}>Semester ${i + 1}</option>`).join('')}
              <option value="9" ${u.active_semester === 9 ? 'selected' : ''}>Semester 9+ (KPP/TA)</option>
            </select>
          </div>
        </div>
        <div class="grid md:grid-cols-2 gap-3">
          <div><label class="g-lbl">Fakultas</label>
            ${u.campus_name && u.campus_name.includes('Santo Thomas')
            ? `<select name="faculty" id="pf-fac" class="g-inp"></select>`
            : `<input name="faculty" value="${esc(u.faculty || '')}" class="g-inp" />`}
          </div>
          <div><label class="g-lbl">Program Studi</label>
            <input id="pf-prodi" ${u.campus_name && u.campus_name.includes('Santo Thomas') ? 'list="pf-prodi-list"' : ''} name="study_program" value="${esc(u.study_program || '')}" class="g-inp" />
            <datalist id="pf-prodi-list"></datalist>
          </div>
        </div>
        <div class="grid md:grid-cols-2 gap-3">
          <div><label class="g-lbl">Target IPK/GPA</label>
            <select name="target_gpa" class="g-inp">
              ${[3.0, 3.5, 3.75, 4.0].map(v => `<option value="${v}" ${Number(u.target_gpa) === v ? 'selected' : ''}>${v} ${v === 3.5 ? '— Cum Laude' : v === 3.75 ? '— Sangat Cum Laude' : v === 4.0 ? '— Sempurna' : '— Memuaskan'}</option>`).join('')}
            </select>
          </div>
          <div><label class="g-lbl">Perkiraan Lulus</label>
            <select name="expected_graduation_year" class="g-inp">
              ${(() => { const ys = []; for (let y = new Date().getFullYear(); y <= new Date().getFullYear() + 8; y++) ys.push(y);
              return `<option value="">— Pilih —</option>` + ys.map(y => `<option ${Number(u.expected_graduation_year) === y ? 'selected' : ''}>${y}</option>`).join(''); })()}
            </select>
          </div>
        </div>
        <p class="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-3">🏫 Kampus: <b>${esc(u.campus_name || 'UNIKA UST')}</b></p>
        <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition">💾 Simpan Profil</button>
      </form>
    </div>

    <!-- Security + Photo Upload Hub -->
    <div class="space-y-6">
      
      <!-- Secure Profile Photo Upload Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">📸</span>
            <h3 class="font-bold text-slate-800">Foto Profil Mahasiswa</h3>
          </div>
          <span class="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            🛡️ Proteksi Anti-Malware Aktif
          </span>
        </div>
        <p class="text-xs text-slate-500 mb-4">
          Unggah foto profil Anda. Sistem dilengkapi proteksi multi-lapis (inspeksi magic-bytes, pembersihan metadata EXIF, dan re-encoding aman).
        </p>

        <!-- Current / Preview Avatar Box -->
        <div class="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4">
          <div class="relative group">
            <div id="pf-avatar-preview-box" class="w-20 h-20 rounded-2xl overflow-hidden bg-indigo-100 flex items-center justify-center text-4xl shadow-inner border border-slate-200">
              ${u.avatar_url
                ? `<img src="${esc(u.avatar_url)}" alt="Avatar" class="w-full h-full object-cover" />`
                : `<span>${esc(u.avatar_emoji || '🎓')}</span>`}
            </div>
            <div id="pf-preview-badge" class="hidden absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold shadow">
              Preview
            </div>
          </div>
          <div class="flex-1 text-center sm:text-left min-w-0">
            <p id="pf-avatar-status-title" class="text-sm font-semibold text-slate-700">
              ${u.avatar_url ? 'Foto Profil Kustom Aktif' : 'Menggunakan Avatar Emoji Default'}
            </p>
            <p id="pf-avatar-status-sub" class="text-xs text-slate-400 mt-0.5">
              ${u.avatar_url ? 'Format: WebP 400x400 (Tersanitasi)' : 'Pilih file foto untuk mengganti avatar'}
            </p>
            <div class="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
              <label for="pf-avatar-file" class="cursor-pointer inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition">
                📁 Pilih Foto Baru
              </label>
              ${u.avatar_url ? `
                <button type="button" id="pf-avatar-delete-btn" class="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition">
                  🗑️ Hapus Foto
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Hidden input for file selection -->
        <input type="file" id="pf-avatar-file" accept="image/jpeg,image/png,image/webp" class="hidden" />

        <!-- Selected file confirmation & upload action -->
        <div id="pf-avatar-action-bar" class="hidden p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl mb-4 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span id="pf-selected-filename" class="font-semibold text-indigo-900 truncate"></span>
            <span id="pf-selected-filesize" class="text-indigo-600 shrink-0 ml-2"></span>
          </div>
          <div class="flex gap-2">
            <button type="button" id="pf-avatar-submit-btn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-1.5">
              <span>🚀 Unggah & Amankan Foto</span>
            </button>
            <button type="button" id="pf-avatar-cancel-btn" class="px-3 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 font-semibold py-2 rounded-lg text-xs transition">
              Batal
            </button>
          </div>
        </div>

        <!-- Security Specification Box -->
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
          <p class="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            🔒 Standar Keamanan Upload Gradify:
          </p>
          <ul class="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
            <li><b>Maksimal 2 MB</b> (JPG, PNG, atau WebP). SVG/HTML ditolak otomatis.</li>
            <li><b>Pemeriksaan Magic-Bytes Biner</b>: File skrip yang disamarkan akan dicekal.</li>
            <li><b>Transcoding & Re-encoding Otomatis</b>: Semua metadata, tag GPS, dan payload polyglot dihapus tuntas.</li>
            <li><b>Nama Acak 128-bit & Anti Path-Traversal</b>: Disimpan di folder aman non-eksekusi.</li>
          </ul>
        </div>
      </div>

      <!-- Account Security -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800 mb-3">🔒 Keamanan Akun</h3>
        <form id="pw-form" class="space-y-3">
          <div><label class="g-lbl">Password Saat Ini</label><input name="current_password" type="password" required class="g-inp" /></div>
          <div><label class="g-lbl">Password Baru (min. 6)</label><input name="new_password" type="password" minlength="6" required class="g-inp" /></div>
          <button class="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-5 py-2 rounded-xl text-sm transition">Ganti Password</button>
        </form>
        <p class="text-[10px] text-slate-400 mt-3">Google OAuth & Apple ID SSO akan hadir pada rilis v1.1.</p>
      </div>

      <!-- Session Logout -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800 mb-2">🚪 Keluar</h3>
        <p class="text-xs text-slate-500 mb-3">Hentikan sesi di perangkat ini.</p>
        <button id="pf-logout" class="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2 rounded-xl text-sm transition">Logout</button>
      </div>

    </div>
  </div>`;

  injectStyles();

  /* ---------- avatar emoji picker ---------- */
  let avatar = u.avatar_emoji || '🎓';
  const pick = document.getElementById('pf-avatars');
  ['🎓', '👩‍🎓', '👨‍🎓', '🧑‍💻', '👩‍🔬', '👨‍🔬', '🦉', '🚀'].forEach(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `w-9 h-9 rounded-lg text-xl ${a === avatar ? 'bg-indigo-600' : 'bg-slate-100 hover:bg-indigo-100'}`;
    b.textContent = a;
    b.addEventListener('click', () => {
      avatar = a;
      [...pick.children].forEach(x => x.classList.replaceAll('bg-indigo-600', 'bg-slate-100'));
      b.classList.replace('bg-slate-100', 'bg-indigo-600');
    });
    pick.appendChild(b);
  });

  /* ---------- secure avatar file upload handling ---------- */
  const fileInput = document.getElementById('pf-avatar-file');
  const actionBar = document.getElementById('pf-avatar-action-bar');
  const previewBox = document.getElementById('pf-avatar-preview-box');
  const previewBadge = document.getElementById('pf-preview-badge');
  const filenameLabel = document.getElementById('pf-selected-filename');
  const filesizeLabel = document.getElementById('pf-selected-filesize');
  const submitBtn = document.getElementById('pf-avatar-submit-btn');
  const cancelBtn = document.getElementById('pf-avatar-cancel-btn');
  const deleteBtn = document.getElementById('pf-avatar-delete-btn');

  let selectedFile = null;

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation: Type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast('Format file tidak didukung! Gunakan format JPG, PNG, atau WebP.', 'error');
      fileInput.value = '';
      return;
    }

    // Client-side validation: Max 2MB
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast(`Ukuran file terlalu besar (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maksimal 2 MB.`, 'error');
      fileInput.value = '';
      return;
    }

    selectedFile = file;
    filenameLabel.textContent = file.name;
    filesizeLabel.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    actionBar.classList.remove('hidden');

    // Create instant local preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewBox.innerHTML = `<img src="${ev.target.result}" alt="Preview" class="w-full h-full object-cover" />`;
      previewBadge.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  cancelBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    actionBar.classList.add('hidden');
    previewBadge.classList.add('hidden');
    // Restore original
    previewBox.innerHTML = u.avatar_url
      ? `<img src="${esc(u.avatar_url)}" alt="Avatar" class="w-full h-full object-cover" />`
      : `<span>${esc(u.avatar_emoji || '🎓')}</span>`;
  });

  submitBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳ Mengamankan & Mengunggah...</span>`;

    const formData = new FormData();
    formData.append('avatar', selectedFile);

    try {
      const res = await api.upload('/api/auth/avatar', formData);
      toast(res.message || 'Foto profil berhasil diperbarui! 🎉');
      // Refresh page to apply updated session/badges
      setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      toast(err.message || 'Gagal mengunggah foto profil', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Hapus foto profil dan kembali menggunakan emoji avatar?')) return;
      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Menghapus...';
      try {
        const res = await api.del('/api/auth/avatar');
        toast(res.message || 'Foto profil berhasil dihapus.');
        setTimeout(() => window.location.reload(), 400);
      } catch (err) {
        toast(err.message || 'Gagal menghapus foto profil', 'error');
        deleteBtn.disabled = false;
        deleteBtn.textContent = '🗑️ Hapus Foto';
      }
    });
  }

  /* ---------- faculty/prodi dropdown for UNIKA UST users ---------- */
  const facSel = document.getElementById('pf-fac');
  if (facSel) {
    api.get('/api/auth/presets').then(({ campuses }) => {
      const facs = campuses[0].faculties;
      facSel.innerHTML = `<option value="">— Pilih —</option>` + facs.map((f, i) => `<option value="${i}" ${u.faculty === f.faculty ? 'selected' : ''}>${esc(f.faculty)}</option>`).join('');
      const list = document.getElementById('pf-prodi-list');
      function fillProdi() {
        const f = facs[facSel.value];
        list.innerHTML = f ? f.programs.map(p => `<option value="${esc(p)}">`).join('') : '';
      }
      fillProdi();
      facSel.addEventListener('change', () => {
        fillProdi();
        const f = facs[facSel.value];
        if (f) document.getElementById('pf-prodi').value = f.programs[0];
      });
    });
  }

  /* ---------- forms ---------- */
  document.getElementById('pf-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const payload = Object.fromEntries(f.entries());
    payload.target_gpa = parseFloat(payload.target_gpa);
    payload.active_semester = parseInt(payload.active_semester);
    payload.avatar_emoji = avatar;
    try {
      await api.put('/api/auth/profile', payload);
      toast('Profil berhasil disimpan ✅');
      setTimeout(() => window.location.reload(), 400);
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('pw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.put('/api/auth/password', { current_password: f.get('current_password'), new_password: f.get('new_password') });
      toast('Password berhasil diubah ✅');
      e.target.reset();
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('pf-logout').addEventListener('click', async () => {
    if (!confirm('Logout dari Gradify?')) return;
    try { await api.post('/api/auth/logout', {}); } catch { /* ignore */ }
    localStorage.removeItem('gradify_token');
    window.location.reload();
  });
}

const injectStyles = () => {
  if (document.getElementById('g-form-style')) return;
  const s = document.createElement('style');
  s.id = 'g-form-style';
  s.textContent = `.g-lbl{font-size:11px;font-weight:600;color:#475569;display:block;margin-bottom:4px}
  .g-inp{width:100%;border:1px solid #cbd5e1;border-radius:0.6rem;padding:0.55rem 0.8rem;font-size:0.85rem;outline:none}
  .g-inp:focus{border-color:#6366f1;box-shadow:0 0 0 3px #e0e7ff}`;
  document.head.appendChild(s);
};
