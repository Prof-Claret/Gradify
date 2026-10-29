/**
 * Profile & Identity Hub (Phase 0.2) — edit metadata, switch semester, security
 */
import { esc, toast } from '../app.js';

export const subtitle = () => 'Metadata mahasiswa, semester aktif & keamanan';

export async function render(main, ctx) {
  const { api } = ctx;
  const u = ctx.user;

  main.innerHTML = `
  <div class="grid lg:grid-cols-2 gap-6">
    <!-- Identity -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-3xl">${esc(u.avatar_emoji)}</div>
        <div>
          <h3 class="font-bold text-slate-800">${esc(u.full_name)}</h3>
          <p class="text-xs text-slate-500">${esc(u.email)}</p>
          <p class="text-[11px] mt-1"><span class="bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">Semester ${u.active_semester}</span></p>
        </div>
      </div>
      <form id="pf-form" class="space-y-3">
        <div class="grid md:grid-cols-2 gap-3">
          <div><label class="g-lbl">Nama Lengkap</label><input name="full_name" value="${esc(u.full_name)}" class="g-inp" required /></div>
          <div><label class="g-lbl">Avatar</label>
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
            ${u.campus_name.includes('Santo Thomas')
            ? `<select name="faculty" id="pf-fac" class="g-inp"></select>`
            : `<input name="faculty" value="${esc(u.faculty || '')}" class="g-inp" />`}
          </div>
          <div><label class="g-lbl">Program Studi</label>
            <input id="pf-prodi" ${u.campus_name.includes('Santo Thomas') ? 'list="pf-prodi-list"' : ''} name="study_program" value="${esc(u.study_program || '')}" class="g-inp" />
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
        <p class="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-3">🏫 Kampus: <b>${esc(u.campus_name)}</b></p>
        <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm">💾 Simpan Profil</button>
      </form>
    </div>

    <!-- Security + actions -->
    <div class="space-y-6">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800 mb-3">🔒 Keamanan Akun</h3>
        <form id="pw-form" class="space-y-3">
          <div><label class="g-lbl">Password Saat Ini</label><input name="current_password" type="password" required class="g-inp" /></div>
          <div><label class="g-lbl">Password Baru (min. 6)</label><input name="new_password" type="password" minlength="6" required class="g-inp" /></div>
          <button class="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-5 py-2 rounded-xl text-sm">Ganti Password</button>
        </form>
        <p class="text-[10px] text-slate-400 mt-3">Google OAuth & Apple ID SSO akan hadir pada rilis v1.1.</p>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800 mb-2">🚪 Keluar</h3>
        <p class="text-xs text-slate-500 mb-3">Hentikan sesi di perangkat ini.</p>
        <button id="pf-logout" class="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2 rounded-xl text-sm">Logout</button>
      </div>
    </div>
  </div>`;

  injectStyles();

  /* ---------- avatar picker ---------- */
  let avatar = u.avatar_emoji || '🎓';
  const pick = document.getElementById('pf-avatars');
  ['🎓', '👩‍🎓', '👨‍🎓', '🧑‍💻', '👩‍🔬', '👨‍🔬', '🦉', '🚀'].forEach(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `w-9 h-9 rounded-lg text-xl ${a === avatar ? 'bg-indigo-600' : 'bg-slate-100 hover:bg-indigo-100'}`;
    b.textContent = a;
    b.addEventListener('click', () => { avatar = a; [...pick.children].forEach(x => x.classList.replaceAll('bg-indigo-600', 'bg-slate-100')); b.classList.replace('bg-slate-100', 'bg-indigo-600'); });
    pick.appendChild(b);
  });

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
      const { user } = await api.put('/api/auth/profile', payload);
      window.location.reload(); // simplest: reload to refresh shell state
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
