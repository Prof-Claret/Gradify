/**
 * Auth Screen — Login & Registration Wizard (Phase 0.1)
 * Step 1: Identitas → Step 2: Kampus → Step 3: Metadata Akademik
 */
export const steps_meta = ['Identitas', 'Kampus', 'Akademik'];

export function render(box, ctx) {
  const { api, esc, toast } = ctx;
  let mode = 'login';
  let wizard = { step: 1, data: {} };

  /* ================= LOGIN VIEW ================= */
  function renderLogin(backdrop) {
    box.innerHTML = `
    <div class="${backdrop ? '' : 'min-h-[92vh]'} flex items-center py-4 sm:py-8 px-2 sm:px-0">
      <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden mx-auto">
        <div class="bg-gradient-to-r from-indigo-700 to-violet-700 text-white p-6 sm:p-8 text-center">
          <div class="text-4xl sm:text-5xl mb-2">🎓</div>
          <h1 class="text-2xl font-extrabold">Gradify</h1>
          <p class="text-indigo-200 text-xs sm:text-sm italic mt-1">Simplify Your Academic Journey</p>
        </div>
        <div class="p-5 sm:p-8 space-y-4">
          <div>
            <h2 class="text-lg font-bold text-slate-800">Masuk ke akunmu</h2>
            <p class="text-sm text-slate-500">Selamat datang kembali, mahasiswa hebat!</p>
          </div>
          <form id="login-form" class="space-y-3">
            <input name="email" type="email" required placeholder="Email" class="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            <input name="password" type="password" required placeholder="Password" class="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            <p id="login-err" class="text-rose-600 text-xs hidden"></p>
            <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-2.5 text-sm transition">Login</button>
          </form>
          <p class="text-xs text-slate-400 text-center">
            <span title="Butuh kredensial provider — rencana v1.1" class="cursor-help">🔒 Google OAuth & Apple ID tersedia di v1.1</span>
          </p>
          <p class="text-sm text-center text-slate-500">Belum punya akun?
            <button id="go-register" class="text-indigo-600 font-semibold hover:underline">Daftar Sekarang</button></p>
        </div>
      </div>
    </div>`;

    box.querySelector('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const errEl = box.querySelector('#login-err');
      errEl.classList.add('hidden');
      try {
        const { token, user } = await api.post('/api/auth/login', {
          email: f.get('email'), password: f.get('password')
        });
        toast(`Selamat datang kembali, ${user.full_name}! 🎉`);
        ctx.onAuthed(token, user);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
    box.querySelector('#go-register').addEventListener('click', () => { mode = 'register'; wizard = { step: 1, data: {} }; renderWizard(); });
  }

  /* ================= REGISTRATION WIZARD ================= */
  async function renderWizard() {
    box.innerHTML = `
    <div class="min-h-[92vh] flex items-center justify-center py-4 sm:py-8 px-2 sm:px-0">
      <div class="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div class="bg-slate-900 text-white p-4 sm:p-6">
          <button id="wiz-back" class="text-xs text-slate-400 hover:text-white mb-2 sm:mb-3 hidden">← Kembali ke Login</button>
          <h2 class="text-lg sm:text-xl font-extrabold">Registrasi Mahasiswa</h2>
          <p class="text-slate-400 text-xs sm:text-sm mt-0.5">Lengkapi 3 langkah di bawah untuk membuat akunmu.</p>
          <!-- progress steps -->
          <div class="flex gap-1.5 sm:gap-2 mt-4" id="wiz-progress"></div>
        </div>
        <div class="p-4 sm:p-8" id="wiz-body"></div>
      </div>
    </div>`;
    box.querySelector('#wiz-back').classList.remove('hidden');

    const bar = box.querySelector('#wiz-progress');
    function drawProgress() {
      bar.innerHTML = steps_meta.map((label, i) => {
        const s = i + 1;
        const done = wizard.step > s, active = wizard.step === s;
        const cls = done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400';
        return `<div class="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0 ${i < steps_meta.length - 1 ? 'pr-1 sm:pr-2' : ''}">
          <div class="${cls} w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">${done ? '✓' : s}</div>
          <span class="text-${active ? 'white' : 'slate-500'} text-[11px] sm:text-xs font-medium truncate">${label}</span>
        </div>`;
      }).join('<div class="flex-1 h-px bg-slate-700 self-center hidden sm:block"></div>');
    }

    box.querySelector('#wiz-back').addEventListener('click', () => { mode = 'login'; renderLogin(false); });
    drawProgress();
    if (wizard.step === 1) step1();
    else if (wizard.step === 2) step2();
    else step3();
  }

  /* ---- STEP 1: Identitas ---- */
  function step1() {
    const body = box.querySelector('#wiz-body');
    body.innerHTML = `
      <h3 class="font-bold text-slate-800 mb-1">Langkah 1 — Identitas Diri</h3>
      <p class="text-sm text-slate-500 mb-4">Data dasar akunmu.</p>
      <form id="s1-form" class="space-y-3">
        <div class="grid grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">Nama Lengkap *</label>
            <input name="full_name" required placeholder="cth. Yohanes Sitorus" class="g-inp" />
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">Avatar</label>
            <div id="pick-avatar" class="flex gap-1 pb-0.5"></div>
          </div>
        </div>
        <div class="grid md:grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">NPM / NIM</label>
            <input name="npm_nim" placeholder="cth. 2412023xxx" class="g-inp" />
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">Email *</label>
            <input name="email" type="email" required placeholder="email@example.com" class="g-inp" />
          </div>
        </div>
        <div class="grid md:grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">Password * <span class="text-slate-400 font-normal">(min. 6)</span></label>
            <input name="password" type="password" required minlength="6" class="g-inp" />
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">Konfirmasi Password *</label>
            <input name="password2" type="password" required minlength="6" class="g-inp" />
          </div>
        </div>
        <p id="s1-err" class="text-rose-600 text-xs hidden"></p>
        <div class="flex justify-between pt-2">
          <span></span>
          <button class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">Lanjut →</button>
        </div>
      </form>`;

    // inject global input style
    const style = document.createElement('style');
    style.textContent = '.g-inp{width:100%;border:1px solid #cbd5e1;border-radius:0.75rem;padding:0.6rem 1rem;font-size:0.875rem;outline:none}.g-inp:focus{border-color:#6366f1;box-shadow:0 0 0 3px #e0e7ff}';
    if (!document.getElementById('gradify-inp-style')) { style.id = 'gradify-inp-style'; document.head.appendChild(style); }

    const avatars = ['🎓', '👩‍🎓', '👨‍🎓', '🧑‍💻', '👩‍🔬', '👨‍🔬', '🦉', '🚀'];
    let avatar = '🎓';
    const apick = body.querySelector('#pick-avatar');
    function drawAvatars() {
      avatars.forEach(a => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `w-9 h-9 rounded-lg text-xl ${a === avatar ? 'bg-indigo-600' : 'bg-slate-100 hover:bg-indigo-100'}`;
        b.textContent = a;
        b.addEventListener('click', () => { avatar = a; drawAvatars(); });
        apick.appendChild(b);
      });
    }
    drawAvatars();

    body.querySelector('#s1-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const errEl = body.querySelector('#s1-err');
      errEl.classList.add('hidden');
      if (f.get('password') !== f.get('password2')) {
        errEl.textContent = 'Konfirmasi password tidak sama.';
        errEl.classList.remove('hidden');
        return;
      }
      Object.assign(wizard.data, {
        full_name: f.get('full_name'), email: f.get('email'),
        password: f.get('password'), password2: undefined,
        npm_nim: f.get('npm_nim'), avatar_emoji: avatar
      });
      wizard.step = 2;
      renderWizard();
    });
  }

  /* ---- STEP 2: Kampus (radio preset/custom) ---- */
  async function step2() {
    const body = box.querySelector('#wiz-body');
    let campusMode = 'preset';
    let faculties = [];
    let faculty = '', program = '', customCampus = '', customFac = '', customProdi = '';

    await api.get('/api/auth/presets').then(({ campuses }) => {
      faculties = campuses[0].faculties;
    }).catch(() => {
      faculties = [
        { faculty: 'Fakultas Ilmu Komputer (FIKOM)', programs: ['Teknik Informatika (S1)', 'Sistem Informasi (S1)', 'Sains Data (S1)'] }
      ];
    });

    body.innerHTML = `
      <h3 class="font-bold text-slate-800 mb-1">Langkah 2 — Informasi Kampus</h3>
      <p class="text-sm text-slate-500 mb-4">Pilih kampus dengan preset bawaan atau tambahkan kampus baru.</p>

      <div class="space-y-2 mb-5" id="campus-mode">
        <label class="flex items-start gap-3 border-2 border-indigo-500 bg-indigo-50 rounded-xl p-4 cursor-pointer" id="opt-preset">
          <input type="radio" name="cmode" checked class="mt-1 accent-indigo-600" />
          <div>
            <p class="font-semibold text-sm text-slate-800">🏛️ Pilih Kampus (Default UNIKA UST)</p>
            <p class="text-xs text-slate-500">Universitas Katolik Santo Thomas Medan — dropdown Fakultas & Prodi otomatis.</p>
          </div>
        </label>
        <label class="flex items-start gap-3 border-2 border-slate-200 rounded-xl p-4 cursor-pointer" id="opt-custom">
          <input type="radio" name="cmode" class="mt-1 accent-indigo-600" />
          <div>
            <p class="font-semibold text-sm text-slate-800">✏️ Tambah Kampus Baru (Manual Input)</p>
            <p class="text-xs text-slate-500">Alternatif bagi mahasiswa dari universitas lain.</p>
          </div>
        </label>
      </div>

      <div id="campus-fields"></div>
      <p id="s2-err" class="text-rose-600 text-xs hidden"></p>
      <div class="flex justify-between pt-4">
        <button id="s2-prev" class="text-sm text-slate-500 hover:text-slate-800 font-medium">← Kembali</button>
        <button id="s2-next" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">Lanjut →</button>
      </div>`;

    const fields = body.querySelector('#campus-fields');
    const optPreset = body.querySelector('#opt-preset');
    const optCustom = body.querySelector('#opt-custom');

    function field(label, inner) {
      return `<div><label class="text-xs font-semibold text-slate-600 block mb-1">${label}</label>${inner}</div>`;
    }

    function drawPreset() {
      fields.innerHTML = `
        <div class="grid md:grid-cols-2 gap-3">
          ${field('Nama Kampus', `<input disabled value="Universitas Katolik Santo Thomas (UNIKA UST Medan)" class="g-inp bg-slate-100" />`)}
          ${field('Fakultas *', `<select id="sel-fac" class="g-inp"><option value="">— Pilih Fakultas —</option>
            ${faculties.map((f, i) => `<option value="${i}">${esc(f.faculty)}</option>`).join('')}</select>`)}
          ${field('Program Studi (Prodi) *', `<select id="sel-prodi" disabled class="g-inp bg-slate-100"><option>— Pilih Fakultas dulu —</option></select>`)}
        </div>`;
      const selF = fields.querySelector('#sel-fac'), selP = fields.querySelector('#sel-prodi');
      selF.addEventListener('change', () => {
        const f = faculties[selF.value];
        faculty = f?.faculty || '';
        selP.disabled = !f;
        selP.classList.toggle('bg-slate-100', !f);
        selP.innerHTML = !f ? '<option>— Pilih Fakultas dulu —</option>'
          : f.programs.map(p => `<option>${esc(p)}</option>`).join('');
        program = f ? f.programs[0] : '';
      });
      selP.addEventListener('change', () => { program = selP.value; });
    }

    function drawCustom() {
      fields.innerHTML = `
        <div class="space-y-3">
          ${field('Nama Kampus Custom *', `<input id="c-campus" class="g-inp" placeholder="cth. Universitas..." value="${esc(customCampus)}" />`)}
          ${field('Nama Fakultas Custom', `<input id="c-fac" class="g-inp" placeholder="cth. Fakultas..." value="${esc(customFac)}" />`)}
          ${field('Nama Prodi Custom', `<input id="c-prodi" class="g-inp" placeholder="cth. Program Studi..." value="${esc(customProdi)}" />`)}
        </div>`;
      fields.querySelector('#c-campus').addEventListener('input', e => customCampus = e.target.value);
      fields.querySelector('#c-fac').addEventListener('input', e => customFac = e.target.value);
      fields.querySelector('#c-prodi').addEventListener('input', e => customProdi = e.target.value);
    }

    function setMode(m) {
      campusMode = m;
      const on = 'border-indigo-500 bg-indigo-50', off = 'border-slate-200';
      optPreset.className = `flex items-start gap-3 border-2 rounded-xl p-4 cursor-pointer ${m === 'preset' ? on : off}`;
      optCustom.className = `flex items-start gap-3 border-2 rounded-xl p-4 cursor-pointer ${m === 'custom' ? on : off}`;
      optPreset.querySelector('input').checked = m === 'preset';
      optCustom.querySelector('input').checked = m === 'custom';
      m === 'preset' ? drawPreset() : drawCustom();
    }

    optPreset.addEventListener('click', () => setMode('preset'));
    optCustom.addEventListener('click', () => setMode('custom'));
    drawPreset();

    body.querySelector('#s2-prev').addEventListener('click', () => { wizard.step = 1; renderWizard(); });
    body.querySelector('#s2-next').addEventListener('click', () => {
      const errEl = body.querySelector('#s2-err');
      errEl.classList.add('hidden');
      if (campusMode === 'preset' && (!faculty || !program)) {
        errEl.textContent = 'Fakultas dan Prodi wajib dipilih.';
      } else if (campusMode === 'custom' && !customCampus) {
        errEl.textContent = 'Nama kampus custom wajib diisi.';
      } else {
        Object.assign(wizard.data, {
          campus_mode: campusMode,
          campus_name: campusMode === 'custom' ? customCampus : undefined,
          faculty: campusMode === 'preset' ? faculty : (customFac || 'Fakultas Tidak Ditetapkan'),
          study_program: campusMode === 'preset' ? program : (customProdi || 'Prodi Tidak Ditetapkan')
        });
        wizard.step = 3;
        renderWizard();
        return;
      }
      errEl.classList.remove('hidden');
    });
  }

  /* ---- STEP 3: Metadata akademik ---- */
  function step3() {
    const body = box.querySelector('#wiz-body');
    const years = [];
    for (let y = new Date().getFullYear(); y <= new Date().getFullYear() + 8; y++) years.push(y);

    body.innerHTML = `
      <h3 class="font-bold text-slate-800 mb-1">Langkah 3 — Profil Akademik</h3>
      <p class="text-sm text-slate-500 mb-4">Menentukan konten dashboard aktifmu.</p>
      <div class="space-y-3">
        <div class="grid md:grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">Semester Aktif (1–8+) *</label>
            <select id="s3-sem" class="g-inp">${[...Array(8)].map((_, i) => `<option value="${i + 1}">Semester ${i + 1}</option>`).join('')}<option value="9">Semester 9+ (KPP/TA)</option></select>
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-600 block mb-1">Target IPK / GPA *</label>
            <select id="s3-target" class="g-inp">
              <option value="3.50">3.50 — Cum Laude</option>
              <option value="3.00">3.00 — Memuaskan</option>
              <option value="3.75">3.75 — Sangat Cum Laude</option>
              <option value="2.50">2.50 — Cukup</option>
              <option value="4.00">4.00 — Sempurna</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600 block mb-1">Perkiraan Tahun Kelulusan</label>
          <select id="s3-grad" class="g-inp"><option value="">— Pilih —</option>${years.map(y => `<option>${y}</option>`).join('')}</select>
        </div>
      </div>
      <div class="mt-5 bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm">
        <p class="font-semibold text-indigo-900 mb-1">📋 Ringkasan</p>
        <ul class="text-indigo-900/80 space-y-0.5 text-xs">
          <li>• Nama: <b>${esc(wizard.data.full_name)}</b> ${esc(wizard.data.avatar_emoji)} · NPM: <b>${esc(wizard.data.npm_nim || '—')}</b></li>
          <li>• Kampus: <b>${esc(wizard.data.campus_mode === 'preset' ? 'UNIKA UST Medan' : wizard.data.campus_name)}</b></li>
          <li>• ${esc(wizard.data.faculty)} — ${esc(wizard.data.study_program)}</li>
        </ul>
      </div>
      <p id="s3-err" class="text-rose-600 text-xs hidden mt-2"></p>
      <div class="flex justify-between pt-4">
        <button id="s3-prev" class="text-sm text-slate-500 hover:text-slate-800 font-medium">← Kembali</button>
        <button id="s3-submit" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">🚀 Buat Akun Gradify</button>
      </div>`;

    body.querySelector('#s3-prev').addEventListener('click', () => { wizard.step = 2; renderWizard(); });
    body.querySelector('#s3-submit').addEventListener('click', async () => {
      const errEl = body.querySelector('#s3-err');
      errEl.classList.add('hidden');
      const payload = {
        ...wizard.data,
        active_semester: parseInt(body.querySelector('#s3-sem').value),
        target_gpa: parseFloat(body.querySelector('#s3-target').value),
        expected_graduation_year: body.querySelector('#s3-grad').value ? parseInt(body.querySelector('#s3-grad').value) : undefined
      };
      try {
        const { token, user } = await api.post('/api/auth/register', payload);
        toast(`Akun berhasil dibuat — selamat datang, ${user.full_name.split(' ')[0]}! 🎓`);
        ctx.onAuthed(token, user);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
  }

  renderLogin(false);
}
