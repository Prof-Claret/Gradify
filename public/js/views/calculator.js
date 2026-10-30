/**
 * Kalkulator Ilmiah + Palet Simbol Yunani (PRD 2.1)
 * Semua perhitungan dilakukan di sisi klien (tanpa panggilan server).
 */

export const subtitle = () => 'Kalkulator ilmiah & rujukan simbol Yunani';

/* ============================================================
 * DATA RUJUKAN
 * ============================================================ */
const GREEK = [
  { g: 'α', name: 'Alfa', m: 'Sudut, koefisien (mis. koefisien atenuasi $\\alpha$)' },
  { g: 'β', name: 'Beta', m: 'Sudut, rasio, koefisien regresi $\\beta$' },
  { g: 'γ', name: 'Gamma', m: 'Sinar gamma; energi foton $E_\\gamma$' },
  { g: 'Γ', name: 'Gamma besar', m: 'Fungsi Gamma, generalisasi faktorial: $\\Gamma(n)=(n-1)!$' },
  { g: 'δ', name: 'Delta kecil', m: 'Perubahan kecil $\\delta x$; delta Kronecker $\\delta_{ij}$' },
  { g: 'Δ', name: 'Delta besar', m: 'Perubahan: $\\Delta x = x_2 - x_1$; diskriminan $\\Delta = b^2-4ac$' },
  { g: 'λ', name: 'Lambda', m: 'Panjang gelombang $\\lambda = v/f$; eigenvalue $A\\vec{v}=\\lambda\\vec{v}$' },
  { g: 'Λ', name: 'Lambda besar', m: 'Konstanta kosmologis $\\Lambda$' },
  { g: 'μ', name: 'Mu', m: 'Awalan mikro ($10^{-6}$), mean populasi $\\mu$, gesekan $\\mu_k$' },
  { g: 'π', name: 'Pi', m: '$\\pi \\approx 3{,}14159$ — rasio keliling/diameter lingkaran' },
  { g: 'Π', name: 'Pi besar', m: 'Operator hasil kali $\\prod_{i=1}^{n} a_i$' },
  { g: 'σ', name: 'Sigma', m: 'Standar deviasi populasi $\\sigma$' },
  { g: 'Σ', name: 'Sigma besar', m: 'Operator sumasi $\\sum_{i=1}^{n} x_i$' },
  { g: 'ω', name: 'Omega', m: 'Kecepatan sudut $\\omega = 2\\pi f$' },
  { g: 'Ω', name: 'Omega besar', m: 'Ohm (hambatan listrik); notasi Big-Omega' },
];

/* ============================================================
 * EVALUATOR EKSPRESI (tokenizer/replacer + Function tersanitasi)
 * ============================================================ */
const PI = 3.141592653589793;
const E = 2.718281828459045;
// Simbol Yunani selain π dipakai sebagai variabel (nilai 1) agar tak crash.
const VARS = { α: 1, β: 1, γ: 1, Γ: 1, δ: 1, Δ: 1, λ: 1, Λ: 1, μ: 1, σ: 1, Σ: 1, ω: 1, Ω: 1, Π: 1 };

function fact(n) {
  if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error('x! hanya untuk bilangan bulat 0–170');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/* Ubah tanda "!" menjadi panggilan fact(...) dengan memindai operan di depannya */
function factorials(s) {
  let out = '', i = 0;
  while (i < s.length) {
    if (s[i] !== '!') { out += s[i]; i++; continue; }
    if (/(\d*\.?\d+)$/.test(out)) {
      const m = /(\d*\.?\d+)$/.exec(out)[1];
      out = out.slice(0, out.length - m.length) + 'fact(' + m + ')';
    } else if (out.endsWith(')')) {
      let d = 0, j = out.length - 1, found = false;
      while (j >= 0) {
        if (out[j] === ')') d++;
        else if (out[j] === '(') { d--; if (d === 0) { found = true; break; } }
        j--;
      }
      if (!found) throw new Error('Tanda ! tidak valid');
      out = out.slice(0, j) + 'fact(' + out.slice(j) + ')';
    } else throw new Error('Tanda ! butuh operan di depannya');
    i++;
  }
  return out;
}

function evalExpr(expr, deg) {
  if (!expr || !expr.trim()) throw new Error('Ekspresi masih kosong');
  if (expr.length > 300) throw new Error('Ekspresi terlalu panjang');
  if (!/^[0-9a-zA-Z^+\-*/().,%!\s×÷√\u0370-\u03FF\u212f]*$/.test(expr)) throw new Error('Ada karakter yang tidak diizinkan');

  let s = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, '(' + PI + ')')
    .replace(/\u212f/g, '(' + E + ')');

  // Faktorial: 5! -> fact(5), (3+2)! -> fact((3+2))
  s = factorials(s);

  // Persen: 50% -> (50/100)
  s = s.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');

  // Tandai minus unary (di awal atau setelah operator/kurung) dengan '~'
  const PRE = new RegExp('(^|[(+\\-*/^])-', 'g');
  let p2;
  do { p2 = s; s = s.replace(PRE, '$1~'); } while (s !== p2);

  s = s.replace(/\^/g, '**');

  // Tanda minus unary (bukan tanda eksponen) di depan "**" diubah menjadi
  // subtraksi/pengali eksplisit agar sesuai konvensi matematika: -2^2 = -4
  const GRP = '\\((?:[^()]|\\((?:[^()]|\\([^()]*\\))*\\))*\\)';
  const OPERAND = '(?:\\d+(?:\\.\\d+)?|[A-Za-z\\u0370-\\u03FF][\\w\\u0370-\\u03FF]*|' + GRP + ')';
  const NEG = new RegExp('(?<!\\*)(^|[(+\\-*/])~(' + OPERAND + ')\\*\\*', 'g');
  let p3;
  do {
    p3 = s;
    s = s.replace(NEG, (m, p, b) => {
      if (p === '' || p === '(') return p + '0-' + b + '**';
      if (p === '/') return p + '(0-1)/' + b + '**';
      return p + '(0-1)*' + b + '**';
    });
  } while (s !== p3);
  s = s.replace(/~/g, '-');

  // Scope fungsi (trig sadar mode derajat) + variabel simbol Yunani
  const k = deg ? Math.PI / 180 : 1;
  const scope = {
    sin: (x) => Math.sin(x * k),
    cos: (x) => Math.cos(x * k),
    tan: (x) => Math.tan(x * k),
    sqrt: Math.sqrt,
    abs: Math.abs,
    ln: Math.log,
    log: (x) => Math.log10(x),
    fact,
    ...VARS,
  };

  // Whitelist: pastikan hanya token yang dikenal yang tersisa
  const strip = new RegExp(
    '\\b(?:sin|cos|tan|ln|log|sqrt|abs|fact)\\b|\\d+(?:\\.\\d+)?|[+\\-*/(),%~\\s]|[\\u0370-\\u03FF]',
    'g'
  );
  const leftover = s.replace(strip, '');
  if (leftover) throw new Error('Simbol tidak dikenali: ' + leftover.slice(0, 12));

  // Hanya string tersanitasi (whitelisted) yang dikompilasi dengan Function
  const fn = new Function(...Object.keys(scope), '"use strict";return(' + s + ');');
  const val = fn(...Object.values(scope));
  if (Number.isNaN(val)) throw new Error('Hasil tidak terdefinisi (NaN)');
  return val;
}

function fmtNum(x) {
  if (!Number.isFinite(x)) return '∞';
  const ax = Math.abs(x);
  if (ax !== 0 && (ax >= 1e12 || ax < 1e-9)) {
    let t = x.toExponential(6).replace(/\.?0+e/, 'e');
    return t.replace('e+', '×10^').replace('e-', '×10^-');
  }
  return String(parseFloat(x.toPrecision(12)));
}

/* ============================================================
 * RENDER
 * ============================================================ */
export async function render(main, ctx) {
  const esc = ctx.esc;
  const toast = ctx.toast;

  /* ---------- STATE ---------- */
  let expr = '';
  let curResult = null; // nilai numerik hasil terakhir
  let curFmt = null;    // tampilan hasil terakhir
  let justEval = false;
  let mem = null;
  let deg = true; // true = derajat, false = radian
  let history = []; // { e, r }

  /* ---------- MARKUP ---------- */
  const BTN_SCI = 'py-2 rounded-lg text-xs font-semibold border transition active:scale-95';
  const CLS = {
    mem: ' text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    konst: ' text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100',
    fn: ' text-slate-700 bg-slate-100 border-slate-200 hover:bg-indigo-100 hover:text-indigo-700',
    digit: ' text-lg font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-indigo-50 rounded-xl py-3',
    op: ' text-lg font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-xl py-3',
    kasar: ' text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl py-3',
    edit: ' text-sm font-bold text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl py-3',
    eq: ' text-xl font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-600 rounded-xl py-3',
  };

  const sciBtns = [
    { k: 'MS', l: 'MS', c: 'mem', t: 'Simpan hasil ke memori' },
    { k: 'MR', l: 'MR', c: 'mem', t: 'Baca memori' },
    { k: 'M+', l: 'M+', c: 'mem', t: 'Tambahkan hasil ke memori' },
    { k: 'π', l: 'π', c: 'konst', t: 'Konstanta pi' },
    { k: 'ℯ', l: 'e', c: 'konst', t: 'Konstanta Euler (e)' },
    { k: 'sin(', l: 'sin', c: 'fn' },
    { k: 'cos(', l: 'cos', c: 'fn' },
    { k: 'tan(', l: 'tan', c: 'fn' },
    { k: 'ln(', l: 'ln', c: 'fn' },
    { k: 'log(', l: 'log', c: 'fn' },
    { k: '^2', l: 'x²', c: 'fn', t: 'Kuadrat' },
    { k: '^3', l: 'x³', c: 'fn', t: 'Pangkat tiga' },
    { k: '^', l: 'xʸ', c: 'fn', t: 'Pangkat (ketik y setelah ini)' },
    { k: 'ℯ^(', l: 'eˣ', c: 'fn', t: 'Eksponensial e^x' },
    { k: '10^(', l: '10ˣ', c: 'fn', t: 'Pangkat 10' },
    { k: 'inv', l: '1/x', c: 'fn', t: 'Kebalikan' },
    { k: '√(', l: '√x', c: 'fn', t: 'Akar kuadrat' },
    { k: '^(1/', l: 'ⁿ√x', c: 'fn', t: 'Akar ke-n: ketik n lalu tutup kurung, mis. 8^(1/3)' },
    { k: 'abs(', l: '|x|', c: 'fn', t: 'Nilai mutlak' },
    { k: '!', l: 'x!', c: 'fn', t: 'Faktorial' },
  ];

  const mainBtns = [
    { k: 'BK', l: '⌫', c: 'edit' },
    { k: 'AC', l: 'AC', c: 'kasar' },
    { k: '(', l: '(', c: 'op' },
    { k: ')', l: ')', c: 'op' },
    { k: '÷', l: '÷', c: 'op' },
    { k: '7', c: 'digit' }, { k: '8', c: 'digit' }, { k: '9', c: 'digit' }, { k: '%', c: 'op' }, { k: '×', l: '×', c: 'op' },
    { k: '4', c: 'digit' }, { k: '5', c: 'digit' }, { k: '6', c: 'digit' }, { k: '±', c: 'op' }, { k: '-', l: '−', c: 'op' },
    { k: '1', c: 'digit' }, { k: '2', c: 'digit' }, { k: '3', c: 'digit' }, { k: '.', c: 'op' }, { k: '+', c: 'op' },
    { k: '0', c: 'digit', span: 2 }, { k: '=', c: 'eq', span: 3 },
  ];

  const btnHtml = (b, cls) =>
    `<button data-k="${esc(b.k)}" class="${cls}${CLS[b.c] || ''}${b.span ? ' col-span-' + b.span : ''}" title="${esc(b.t || '')}">${esc(b.l || b.k)}</button>`;

  main.innerHTML = `
  <div class="grid lg:grid-cols-5 gap-6 items-start">

    <!-- ===== KALKULATOR ===== -->
    <div class="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div class="flex items-center justify-between gap-2 mb-3">
        <h3 class="font-bold text-slate-800">🧮 Kalkulator Ilmiah</h3>
        <div class="flex items-center gap-2">
          <span id="calc-memtag" class="hidden text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">● M</span>
          <button id="calc-deg" class="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition">DEG</button>
        </div>
      </div>

      <div id="calc-screen" class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl px-4 py-3 shadow-inner">
        <div id="calc-expr" class="calc-display text-slate-300 text-lg whitespace-nowrap overflow-x-auto min-h-[1.75rem] pb-1"></div>
        <div id="calc-result" class="calc-display text-indigo-300 text-lg mt-1 min-h-[2rem] break-all">0</div>
        <button id="copy-res" class="hidden text-[11px] text-slate-400 hover:text-white ml-auto block mt-1 transition">📋 Salin hasil</button>
      </div>
      <p class="text-[11px] text-slate-400 mt-1.5">Keyboard: angka, + − × ÷ ^ % ! ( ) · Enter = hitung · ⌫ hapus · Esc bersihkan</p>

      <div id="pad-sci" class="grid grid-cols-5 gap-1.5 mt-3"></div>
      <div id="pad-main" class="grid grid-cols-5 gap-1.5 mt-2"></div>

      <div class="mt-4">
        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🕘 Riwayat (10 terakhir)</h4>
        <div id="calc-history" class="space-y-1.5 max-h-56 overflow-y-auto pr-1"></div>
      </div>
    </div>

    <!-- ===== KOLOM RUJUKAN ===== -->
    <div class="lg:col-span-2 space-y-6">

      <!-- Palet simbol Yunani -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800">Σ Palet Simbol Yunani</h3>
        <p class="text-xs text-slate-500 mt-1 mb-3">Klik simbol untuk menyisipkannya ke kalkulator. Arahkan kursor untuk melihat maknanya.</p>
        <div id="greek-grid" class="flex flex-wrap gap-1.5"></div>
        <p class="text-[11px] text-slate-400 mt-3">π dan e dihitung sebagai konstanta asli; simbol Yunani lain diperlakukan sebagai variabel (nilai 1) agar ekspresi tetap dapat dievaluasi.</p>
      </div>

      <!-- Legenda -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800">📖 Legenda Simbol</h3>
        <table class="gtable mt-2">
          <thead><tr><th>Simbol</th><th>Nama</th><th>Makna umum</th></tr></thead>
          <tbody>
            ${GREEK.map(g => `
            <tr>
              <td class="text-lg font-bold text-indigo-700 text-center">${g.g}</td>
              <td class="whitespace-nowrap font-semibold text-slate-700">${g.name}</td>
              <td class="text-slate-600">${g.m}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="step-box">
          <p class="font-bold text-slate-700">Hubungan yang sering muncul</p>
          <p class="text-slate-600">Standar deviasi: $\\sigma = \\sqrt{\\tfrac{1}{N}\\sum_{i=1}^{N}(x_i-\\mu)^2}$</p>
          <p class="text-slate-600">Perubahan: $\\Delta x = x_{akhir} - x_{awal}$</p>
          <p class="text-slate-600">Kecepatan sudut: $\\omega = 2\\pi f = \\dfrac{2\\pi}{T}$</p>
          <p class="text-slate-600">Dualitas gelombang: $\\lambda = \\dfrac{h}{p}$</p>
        </div>
      </div>

      <!-- Konstanta & Fungsi -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800">🔗 Konstanta &amp; Fungsi</h3>
        <div class="grid sm:grid-cols-3 gap-2 mt-2">
          <div class="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
            <p class="text-2xl font-bold text-indigo-700">π</p>
            <p class="font-mono text-xs text-slate-500">≈ 3,14159</p>
            <p class="text-[10px] text-slate-400">Konstanta lingkaran</p>
          </div>
          <div class="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
            <p class="text-2xl font-bold text-indigo-700">e</p>
            <p class="font-mono text-xs text-slate-500">≈ 2,71828</p>
            <p class="text-[10px] text-slate-400">Basis log natural</p>
          </div>
          <div class="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
            <p class="text-2xl font-bold text-indigo-700">φ</p>
            <p class="font-mono text-xs text-slate-500">≈ 1,61803</p>
            <p class="text-[10px] text-slate-400">Rasio emas</p>
          </div>
        </div>
        <div class="mt-3 grid gap-1.5">
          <div class="step-box"><b class="text-slate-700">Pangkat</b> — $x^y$ · contoh $2^{10}=1024$ (tombol $x^y$)</div>
          <div class="step-box"><b class="text-slate-700">Eksponensial</b> — $e^x$, dengan $e \\approx 2{,}71828$</div>
          <div class="step-box"><b class="text-slate-700">Akar ke-n</b> — $\\sqrt[n]{x}$ · tulis $x^{1/n}$, mis. $8^{1/3}=2$</div>
          <div class="step-box"><b class="text-slate-700">Logaritma</b> — $\\log_{10}(x)$ log desimal ($\\log_{10}(100)=2$); $\\ln(x)$ log natural</div>
          <div class="step-box"><b class="text-slate-700">Faktorial</b> — $x!$ · contoh $5!=120$ (x bulat, $0\\le x\\le170$)</div>
        </div>
      </div>

    </div>
  </div>`;

  /* ---------- ELEMEN ---------- */
  const exprEl = main.querySelector('#calc-expr');
  const resultEl = main.querySelector('#calc-result');
  const copyBtn = main.querySelector('#copy-res');
  const degBtn = main.querySelector('#calc-deg');
  const memTag = main.querySelector('#calc-memtag');
  const padSci = main.querySelector('#pad-sci');
  const padMain = main.querySelector('#pad-main');
  const histEl = main.querySelector('#calc-history');
  padSci.innerHTML = sciBtns.map(b => btnHtml(b, BTN_SCI)).join('');
  padMain.innerHTML = mainBtns.map(b => btnHtml(b, '')).join('');

  /* ---------- TAMPILAN ---------- */
  function update() {
    exprEl.textContent = expr || '';
    if (justEval && curFmt != null) {
      resultEl.textContent = curFmt;
      resultEl.className = 'calc-display text-white text-3xl font-extrabold break-all mt-1 min-h-[2.5rem]';
      copyBtn.classList.remove('hidden');
    } else {
      resultEl.classList.add('calc-display');
      let shown = '';
      if (expr.trim()) {
        try {
          const raw = evalExpr(expr, deg);
          if (Number.isFinite(raw)) shown = '≈ ' + fmtNum(raw);
        } catch { /* pratinjau belum bisa dihitung */ }
      }
      resultEl.textContent = shown || (expr.trim() ? '' : '0');
      resultEl.className = 'calc-display text-indigo-300 text-lg mt-1 min-h-[2rem] break-all';
      copyBtn.classList.add('hidden');
    }
    degBtn.textContent = deg ? 'DEG' : 'RAD';
    memTag.classList.toggle('hidden', mem == null);
    memTag.title = mem == null ? '' : 'Memori = ' + fmtNum(mem);
  }

  function renderHistory() {
    if (!history.length) {
      histEl.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Belum ada perhitungan. Hasil akan muncul di sini — klik untuk memakai ulang.</p>';
      return;
    }
    histEl.innerHTML = history.map((h, i) => `
      <div class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-indigo-50 cursor-pointer transition" data-h="${i}" title="Klik untuk memakai ulang">
        <span class="font-mono text-xs text-slate-500 truncate">${esc(h.e)}</span>
        <span class="font-mono text-sm font-semibold text-indigo-700 whitespace-nowrap">= ${esc(h.r)}</span>
      </div>`).join('');
  }

  /* ---------- LOGIKA INPUT ---------- */
  const OPS = ['+', '-', '×', '÷', '^'];
  const last = () => expr.slice(-1);
  const needMul = () => /[0-9)\u0370-\u03FF\u212f]/.test(last());

  function resetIfEval() {
    if (justEval) { expr = ''; justEval = false; curResult = null; curFmt = null; }
  }

  function currentRaw() {
    if (justEval && curResult != null) return curResult;
    try { return evalExpr(expr, deg); } catch { return null; }
  }

  function pushChar(t) {
    resetIfEval();
    if (/[0-9]/.test(t) && needMul()) expr += '×';
    if (t === '.') {
      const m = /(\d*\.?\d*)$/.exec(expr);
      if (m && m[1].includes('.')) return;
      expr += /\d$/.test(expr) ? '.' : '0.';
      return;
    }
    expr += t;
  }

  function pushOp(t) {
    if (justEval) { expr = curFmt == null ? '' : curFmt; justEval = false; curResult = null; curFmt = null; }
    if (t === '-' && (!expr || last() === '(')) { expr += '-'; return; }
    if (!expr) return; // operator selain minus butuh operan
    if ((t === '%' || t === '^') && !/[0-9)\u0370-\u03FF\u212f]/.test(last())) return;
    if (OPS.includes(last())) expr = expr.slice(0, -1) + t;
    else expr += t;
  }

  function pushSuffix(t) { // '^2', '^3', '^(1/'
    if (justEval) {
      expr = (curFmt == null ? '' : curFmt) + t;
      justEval = false; curResult = null; curFmt = null;
      return;
    }
    if (!/[0-9)\u0370-\u03FF\u212f]/.test(last())) return;
    expr += t;
  }

  function pushFn(t) {
    resetIfEval();
    if (needMul()) expr += '×';
    expr += t;
  }

  function pushParen(t) {
    resetIfEval();
    if (t === '(') {
      if (needMul()) expr += '×';
      expr += '(';
    } else {
      const open = (expr.match(/\(/g) || []).length;
      const close = (expr.match(/\)/g) || []).length;
      if (open > close && !OPS.includes(last()) && last() !== '(') expr += ')';
    }
  }

  function pushBang() {
    resetIfEval();
    if (!/[0-9)]/.test(last())) return;
    expr += '!';
  }

  function matchedOpen(s) { // indeks '(' yang berpasangan dengan ')' terakhir
    let d = 0;
    for (let i = s.length - 1; i >= 0; i--) {
      if (s[i] === ')') d++;
      else if (s[i] === '(') { d--; if (d === 0) return i; }
    }
    return -1;
  }

  function pushInv() { // 1/x
    if (justEval) {
      expr = '1÷(' + (curFmt == null ? '' : curFmt) + ')';
      justEval = false; curResult = null; curFmt = null;
      return;
    }
    if (/\d+$/.test(expr)) {
      const m = /(\d+\.?\d*)$/.exec(expr);
      const head = expr.slice(0, m.index);
      expr = head + (needMulAt(head) ? '×' : '') + '1÷(' + m[1] + ')';
      return;
    }
    if (last() === ')') {
      const oi = matchedOpen(expr);
      if (oi > 0) {
        const head = expr.slice(0, oi);
        const grp = expr.slice(oi);
        expr = head + (needMulAt(head) ? '×' : '') + '1÷' + grp;
        return;
      }
    }
    expr += '1÷(';
  }
  const needMulAt = (s) => /[0-9)\u0370-\u03FF\u212f]/.test(s.slice(-1));

  function signToggle() {
    resetIfEval();
    const m = /(-?\d*\.?\d+)$/.exec(expr);
    if (m) {
      const num = m[1];
      const start = expr.length - num.length;
      if (num.startsWith('-')) expr = expr.slice(0, start) + num.slice(1);
      else expr = expr.slice(0, start) + '-' + num;
    } else expr += '-';
  }

  function insertGlyph(g) {
    resetIfEval();
    if (needMul()) expr += '×';
    expr += g;
  }

  function insertNum(f) {
    resetIfEval();
    if (needMul()) expr += '×';
    expr += f;
  }

  /* ---------- MEMORI ---------- */
  function memStore() {
    const v = currentRaw();
    if (v == null) { toast('Tidak ada nilai untuk disimpan.', 'warn'); return; }
    mem = v;
    update();
    toast('Hasil disimpan ke memori.', 'info');
  }
  function memRecall() {
    if (mem == null) { toast('Memori masih kosong. Tekan MS dulu.', 'warn'); return; }
    insertNum(fmtNum(mem));
    update();
  }
  function memAdd() {
    const v = currentRaw();
    if (v == null) { toast('Tidak ada nilai untuk ditambahkan.', 'warn'); return; }
    mem = (mem ?? 0) + v;
    update();
    toast('M+ : memori = ' + fmtNum(mem), 'info');
  }

  /* ---------- HITUNG ---------- */
  function compute() {
    if (!expr.trim()) { toast('Masukkan ekspresi terlebih dahulu.', 'info'); return; }
    let raw = null, fmt = null;
    try { raw = evalExpr(expr, deg); fmt = fmtNum(raw); }
    catch (err) { toast(err.message || 'Ekspresi tidak valid.', 'error'); return; }
    if (raw == null || String(fmt) === '∞') { toast('Hasil tidak berhingga (∞).', 'warn'); }
    curResult = raw; curFmt = fmt; justEval = true;
    if (!history.length || history[0].e !== expr) {
      history.unshift({ e: expr, r: fmt });
      history = history.slice(0, 10);
    }
    renderHistory();
    update();
  }

  /* ---------- ROUTER TOMBOL ---------- */
  function press(k) {
    if (k === 'AC') { expr = ''; curResult = null; curFmt = null; justEval = false; }
    else if (k === 'BK') {
      if (justEval) { expr = ''; justEval = false; curResult = null; curFmt = null; }
      else expr = expr.slice(0, -1);
    }
    else if (k === '=') { compute(); return update(); }
    else if (k === 'deg') { deg = !deg; }
    else if (k === '±') signToggle();
    else if (k === 'MS') memStore();
    else if (k === 'MR') memRecall();
    else if (k === 'M+') memAdd();
    else if (k === 'inv') pushInv();
    else if (k === '×' || k === '÷' || k === '%' || k === '^' || k === '+' || k === '-') pushOp(k);
    else if (k === '^2' || k === '^3' || k === '^(1/') pushSuffix(k);
    else if (k === '!') pushBang();
    else if (k === '(' || k === ')') pushParen(k);
    else if (/\($/.test(k)) pushFn(k); // sin(, cos(, tan(, ln(, log(, √(, abs(, ℯ^(, 10^(
    else if (/^[0-9.]$/.test(k)) pushChar(k);
    else insertGlyph(k); // π, ℯ, dan simbol Yunani lain
    update();
  }

  /* ---------- EVENTS ---------- */
  padSci.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]');
    if (b) press(b.dataset.k);
  });
  padMain.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]');
    if (b) press(b.dataset.k);
  });
  histEl.addEventListener('click', (e) => {
    const row = e.target.closest('[data-h]');
    if (!row) return;
    const h = history[Number(row.dataset.h)];
    if (!h) return;
    expr = h.e; curResult = null; curFmt = h.r; justEval = false;
    update();
  });
  degBtn.addEventListener('click', () => press('deg'));
  copyBtn.addEventListener('click', async () => {
    if (curFmt == null) return;
    try {
      await navigator.clipboard.writeText(curFmt.replace('×10^', 'e').replace(/×10\^?/, 'e'));
      toast('Hasil disalin ke clipboard.', 'success');
    } catch { toast('Gagal menyalin ke clipboard.', 'error'); }
  });

  // Palet simbol Yunani
  const greekGrid = main.querySelector('#greek-grid');
  greekGrid.innerHTML = GREEK.map(g =>
    `<button class="greek-btn" data-g="${g.g}" title="${esc(g.name)} — ${esc(g.m.replace(/\$[^$]*\$/g, '…'))}">${g.g}</button>`
  ).join('');
  greekGrid.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-g]');
    if (!b) return;
    insertGlyph(b.dataset.g);
    update();
  });

  // Keyboard: listener otomatis dilepas saat view sudah tidak terpasang
  const KEYMAP = { '*': '×', '/': '÷', Enter: '=', '=': '=', Escape: 'AC', Backspace: 'BK', Delete: 'AC', ' ': 'BK' };
  function onKey(ev) {
    if (!exprEl.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.target instanceof Element && ev.target.closest('input,textarea,select')) return;
    const raw = ev.key;
    if (/^F\d+$/.test(raw)) return;
    const k = KEYMAP[raw] ?? raw;
    let handled = false;
    if (/^[0-9.]$/.test(k)) { press(k); handled = true; }
    else if (['+', '-', '×', '÷', '(', ')', '%', '^', '=', 'AC', 'BK', '±', '!', 'π'].includes(k)) { press(k); handled = true; }
    if (handled) ev.preventDefault();
  }
  document.addEventListener('keydown', onKey);

  update();
  renderHistory();
  ctx.rerenderMath(); // MathJax untuk legenda & kartu rumus ($...$)
}

export default { render, subtitle };
