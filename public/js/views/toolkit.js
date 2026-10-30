/**
 * CS & IT Math Toolkit (PRD §2.2) — kalkulator akademik CS dalam 5 tab:
 * Sistem Bilangan · Aljabar Linier & Matriks · Gaussian Elimination (OBE) ·
 * Kalkulus & Optimasi · Statistika & Data Science.
 * Semua kalkulasi dihitung client-side (vanilla JS); LaTeX dirender ulang lewat ctx.rerenderMath().
 */
const TABS = [
  { id: 'bilangan',   label: '🔢 Sistem Bilangan' },
  { id: 'matriks',    label: '🧮 Aljabar Linier & Matriks' },
  { id: 'obe',        label: '⭕ Gaussian Elimination (OBE)' },
  { id: 'kalkulus',   label: '📈 Kalkulus & Optimasi' },
  { id: 'statistika', label: '📊 Statistika & Data Science' },
];

const TAB_ON = 'bg-indigo-600 text-white border-indigo-600 shadow-sm';
const TAB_OFF = 'bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700';
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const BASE_OPTS = [];
for (let b = 2; b <= 36; b++) {
  const nm = { 2: ' — Biner', 8: ' — Oktal', 10: ' — Desimal', 16: ' — Heksadesimal' }[b] || '';
  BASE_OPTS.push({ b, label: `${b}${nm}` });
}

/* Pilihan tab bertahan selama sesi (default: tab pertama) */
let activeTab = '';

export const subtitle = () => 'Konversi basis · Matriks & invers · OBE · Turunan & gradient descent · Statistika deskriptif';

export async function render(main, ctx, extra) {
  const esc = ctx.esc;
  const rerenderMath = () => { if (ctx.rerenderMath) ctx.rerenderMath(); };

  /* Deep-link: #toolkit/obe membuka tab OBE secara langsung */
  if (extra && extra[0] && TABS.some(t => t.id === extra[0])) activeTab = extra[0];
  if (!TABS.some(t => t.id === activeTab)) activeTab = TABS[0].id;

  /* State yang bertahan antar ganti tab & re-render */
  const state = {
    baseVal: '1011', baseSrc: 2,
    matSize: 2, matA: defA(2), matB: defB(2),
    obeSize: 2, obeA: defA(2), obeB: [5, 11],
    polyStr: '3, 2, 0, -5', gdX0: 0.6, gdEta: 0.05, gdN: 12,
    statRaw: '12, 7, 9, 15, 21, 4, 11, 18, 9, 14',
  };

  /* ================= UTIL DASAR ================= */
  function fmt(x, d = 4) {
    if (x === null || x === undefined || Number.isNaN(x)) return '—';
    if (!Number.isFinite(x)) return x > 0 ? '∞' : '-∞';
    const v = Math.abs(x) < 1e-10 ? 0 : x;
    const r = parseFloat(v.toFixed(d));
    return (Object.is(r, -0) ? 0 : r).toString();
  }
  function snap(v) { return Math.abs(v) < 1e-12 ? 0 : v; }
  function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
  /* angka utk baris aritmetika: dibungkus kurung bila negatif/pecahan */
  function pnum(v) { const s = fmt(v); return v < 0 || s.indexOf('.') >= 0 ? `(${s})` : s; }

  /* ================= CORE MATRIKS (semua dihitung manual) ================= */
  function defA(n) {
    if (n === 2) return [[1, 2], [3, 4]];
    if (n === 3) return [[2, 1, 1], [1, 3, 2], [1, 1, 4]];
    return [[2, 1, 0, 3], [1, 3, 2, 1], [0, 1, 4, 2], [3, 2, 1, 5]];
  }
  function defB(n) {
    if (n === 2) return [[2, 0], [1, 1]];
    if (n === 3) return [[1, 0, 2], [3, 1, 0], [0, 2, 1]];
    return [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]];
  }
  function minorM(a, i, j) { return a.filter((_, r) => r !== i).map(row => row.filter((_, c) => c !== j)); }
  function detM(a) {
    const n = a.length;
    if (n === 1) return a[0][0];
    if (n === 2) return a[0][0] * a[1][1] - a[0][1] * a[1][0];
    let d = 0;
    for (let j = 0; j < n; j++) d += ((j % 2 === 0) ? 1 : -1) * a[0][j] * detM(minorM(a, 0, j));
    return d;
  }
  function cofM(a) {
    const n = a.length, C = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) row.push(snap(((i + j) % 2 ? -1 : 1) * detM(minorM(a, i, j))));
      C.push(row);
    }
    return C;
  }
  function transposeM(a) { return a[0].map((_, i) => a.map(row => row[i])); }
  function adjM(a) { return transposeM(cofM(a)); }
  function invM(a) {
    const d = detM(a);
    if (Math.abs(d) < 1e-10) return null;
    return adjM(a).map(row => row.map(v => snap(v / d)));
  }
  function addM(a, b) { return a.map((row, i) => row.map((v, j) => snap(v + b[i][j]))); }
  function subM(a, b) { return a.map((row, i) => row.map((v, j) => snap(v - b[i][j]))); }
  function mulM(a, b) {
    const n = a.length;
    return a.map((_, i) => Array.from({ length: n }, (_, j) =>
      snap(a[i].reduce((s, v, k) => s + v * b[k][j], 0))));
  }

  /* ================= TAB 1: SISTEM BILANGAN ================= */
  function parseBaseVal(raw, b) {
    let s = String(raw || '').trim().toLowerCase();
    if (!s) return { err: 'Masukkan nilai untuk dikonversi.' };
    let sign = 1;
    if (s[0] === '-') { sign = -1; s = s.slice(1).trim(); }
    else if (s[0] === '+') s = s.slice(1).trim();
    if (!s) return { err: 'Masukkan nilai untuk dikonversi.' };
    for (const ch of s) {
      const d = DIGITS.indexOf(ch);
      if (d < 0 || d >= b) {
        const ok = b <= 10 ? `0–${b - 1}` : `0–9 dan a–${DIGITS[b - 1]}`;
        return { err: `Digit "${esc(ch)}" tidak valid untuk basis ${b} (boleh hanya: ${ok}).` };
      }
    }
    const digits = [...s].map(ch => DIGITS.indexOf(ch));
    let dec = 0, k = digits.length - 1;
    for (const d of digits) dec += d * Math.pow(b, k--);
    dec *= sign;
    if (!Number.isFinite(dec) || Math.abs(dec) > Number.MAX_SAFE_INTEGER)
      return { err: 'Nilai terlalu besar (> 2⁵³ − 1) untuk dihitung dengan presisi penuh.' };
    return { dec, digits, sign, mag: Math.abs(dec) };
  }

  function divisionRows(n, b) {
    const rows = [];
    let q = n, step = 1;
    while (q > 0) {
      const r = q % b;
      rows.push({ step, n: q, q: Math.floor(q / b), r, digit: DIGITS[r] });
      q = Math.floor(q / b); step++;
    }
    return rows;
  }

  function divisionBox(n, b) {
    const rows = divisionRows(n, b);
    const res = rows.slice().reverse().map(r => r.digit).join('');
    const tr = rows.map(r =>
      `<tr><td class="text-center">${r.step}</td><td class="text-right font-mono">${r.n}</td><td class="text-center font-mono">÷ ${b}</td><td class="text-right font-mono">${r.q}</td><td class="text-right font-mono">${r.r}</td><td class="text-center font-mono font-bold text-indigo-700">${r.digit}</td></tr>`).join('');
    return `<div class="step-box overflow-x-auto">
      <p class="font-semibold text-slate-700 text-sm mb-1.5">Desimal → Basis ${b}: pembagian berulang dengan ${b}</p>
      <table class="gtable"><thead><tr><th class="text-center">Langkah</th><th class="text-right">n</th><th class="text-center">n ÷ ${b}</th><th class="text-right">Hasil bagi</th><th class="text-right">Sisa</th><th class="text-center">Digit</th></tr></thead>
      <tbody>${tr}</tbody></table>
      <p class="text-xs text-slate-500 mt-1.5">Sisa dibaca <b>dari bawah ke atas</b> → <span class="font-mono font-bold text-indigo-700">${res}</span><sub class="text-slate-400">${b}</sub></p></div>`;
  }

  function positionBox(digits, base, label) {
    const kk = digits.length - 1;
    const parts = [], vals = [];
    digits.forEach((d, idx) => {
      const pw = kk - idx;
      parts.push(`${d > 9 ? `${DIGITS[d]}(${d})` : d}·${base}<sup>${pw}</sup>`);
      vals.push(d * Math.pow(base, pw));
    });
    const sum = vals.reduce((a, v) => a + v, 0);
    return `<div class="step-box overflow-x-auto">
      <p class="font-semibold text-slate-700 text-sm mb-1.5">${label}: ekspansi posisional</p>
      <p class="font-mono text-[13px] break-all text-slate-700">n<sub>10</sub> = ${parts.join(' + ')} = ${vals.join(' + ')} = <b class="text-indigo-700">${sum}</b></p></div>`;
  }

  function tabBilangan(body) {
    body.innerHTML = `
    <div class="grid lg:grid-cols-3 gap-4 mb-4">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800">Konverter Basis</h3>
        <p class="text-xs text-slate-500 mt-1 mb-3">Nilai pada basis sumber → dikonversi ke semua basis umum.</p>
        <label class="block text-xs font-semibold text-slate-500 mb-1">Nilai</label>
        <input id="tk-bas-val" type="text" value="${esc(state.baseVal)}" spellcheck="false" class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
        <label class="block text-xs font-semibold text-slate-500 mt-3 mb-1">Basis sumber</label>
        <select id="tk-bas-src" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white outline-none focus:border-indigo-500">
          ${BASE_OPTS.map(o => `<option value="${o.b}" ${o.b === state.baseSrc ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
        <button id="tk-bas-go" class="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-2 text-sm">Konversi</button>
        <p id="tk-bas-err" class="hidden mt-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2"></p>
      </div>
      <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800 mb-3">Hasil di semua basis</h3>
        <div id="tk-bas-grid" class="grid grid-cols-2 md:grid-cols-3 gap-3"></div>
      </div>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
      <h3 class="font-bold text-slate-800 mb-3">🪜 Langkah pengerjaan</h3>
      <div id="tk-bas-steps"></div>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 class="font-bold text-slate-800 mb-2">📐 Rumus</h3>
      <p class="text-sm text-slate-600">Ekspansi posisional: \\( (n_{10}) = \\sum_{i=0}^{k} d_i \\cdot b^{i} \\) — digit paling kiri berpangkat tertinggi.</p>
      <p class="text-sm text-slate-600 mt-1.5">Pembagian berulang: \\( n = q \\cdot b + r \\) dengan sisa \\( r \\in [0,\\, b) \\); hasil dibaca dari sisa terbawah ke atas.</p>
    </div>`;

    const inp = document.getElementById('tk-bas-val');
    const src = document.getElementById('tk-bas-src');
    const errEl = document.getElementById('tk-bas-err');
    const gridEl = document.getElementById('tk-bas-grid');
    const stepsEl = document.getElementById('tk-bas-steps');
    inp.addEventListener('input', convert);
    src.addEventListener('change', convert);
    document.getElementById('tk-bas-go').addEventListener('click', convert);
    convert();

    function convert() {
      state.baseVal = inp.value;
      state.baseSrc = parseInt(src.value, 10);
      const BASES = [[2, 'Biner'], [3, 'Basis 3'], [4, 'Basis 4'], [8, 'Oktal'], [10, 'Desimal'], [16, 'Heksadesimal']];
      const p = parseBaseVal(state.baseVal, state.baseSrc);
      if (p.err) {
        errEl.textContent = p.err;
        errEl.classList.remove('hidden');
        gridEl.innerHTML = `<div class="col-span-full text-sm text-slate-400 text-center py-6">Perbaiki input untuk melihat hasil konversi.</div>`;
        stepsEl.innerHTML = '';
        return;
      }
      errEl.classList.add('hidden');
      gridEl.innerHTML = BASES.map(([b, lb]) =>
        `<div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <p class="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">${lb} (basis ${b})</p>
          <p class="font-mono text-base font-bold text-indigo-700 break-all mt-1">${p.dec.toString(b)}</p>
        </div>`).join('');
      const steps = [];
      if (state.baseSrc !== 10) steps.push(positionBox(p.digits, state.baseSrc, `Basis ${state.baseSrc} → Desimal`));
      else steps.push(`<div class="step-box"><p class="text-sm text-slate-600">Nilai sudah berupa desimal: <b>${p.dec}</b>.</p></div>`);
      if (p.sign < 0) steps.push(`<div class="step-box"><p class="text-sm text-slate-600">Nilai negatif: langkah di bawah memakai nilai mutlak ${p.mag}, lalu tanda − ditempelkan di depan.</p></div>`);
      if (p.mag === 0) steps.push(`<div class="step-box"><p class="text-sm text-slate-600">Nol di basis apa pun tetap <b>0</b>.</p></div>`);
      else [2, 3, 4, 8, 16].forEach(b => steps.push(divisionBox(p.mag, b)));
      stepsEl.innerHTML = steps.join('');
      rerenderMath();
    }
  }

  /* ================= TAB 2: ALJABAR LINIER & MATRIKS ================= */
  function matView(rows) {
    const trs = rows.map(r => r.map(v => `<td class="px-2.5 py-1 text-center font-mono text-[13px] whitespace-nowrap">${fmt(v)}</td>`).join('')).join('</tr><tr>');
    return `<table class="border-collapse bg-slate-50 border border-slate-200 rounded-lg mx-auto my-1"><tr>${trs}</tr></table>`;
  }
  function matWrap(label, rows, extra = '') {
    return `<div class="inline-flex flex-col items-center bg-white rounded-xl border border-slate-200 px-4 py-2">
      <p class="text-xs font-bold text-slate-500 mb-1">${label}</p>${matView(rows)}${extra}</div>`;
  }
  function inputGrid(key, arr, tint) {
    const n = arr.length;
    const st = tint ? ' style="background:#f5f3ff;border-color:#c4b5fd"' : '';
    const rows = arr.map((row, i) =>
      `<div class="grid gap-1.5" style="grid-template-columns:repeat(${n},auto)">${row.map((v, j) =>
        `<input type="number" step="any" class="matrix-input" ${st} data-m="${key}" data-r="${i}" data-c="${j}" value="${v}">`).join('')}</div>`).join('');
    return `<div class="flex items-center gap-2 w-max mx-auto"><span class="font-mono text-lg text-slate-400">${key === 'matA' ? 'A' : 'B'}</span><div class="space-y-1.5">${rows}</div></div>`;
  }
  function wireMatInputs(body) {
    body.querySelectorAll('.matrix-input').forEach(inp => inp.addEventListener('input', () => {
      const v = parseFloat(inp.value);
      if (Number.isFinite(v)) state[inp.dataset.m][+inp.dataset.r][+inp.dataset.c] = v;
    }));
  }
  function det2Line(m) {
    return `${pnum(m[0][0])}·${pnum(m[1][1])} − ${pnum(m[0][1])}·${pnum(m[1][0])}`;
  }
  function sarrusLine(m) {
    const t = (i, j) => pnum(m[i][j]);
    return `${t(0, 0)}·${t(1, 1)}·${t(2, 2)} + ${t(0, 1)}·${t(1, 2)}·${t(2, 0)} + ${t(0, 2)}·${t(1, 0)}·${t(2, 1)} − ${t(0, 2)}·${t(1, 1)}·${t(2, 0)} − ${t(0, 0)}·${t(1, 2)}·${t(2, 1)} − ${t(0, 1)}·${t(1, 0)}·${t(2, 2)}`;
  }
  function detExpHTML(A) {
    const n = A.length, d = detM(A);
    if (n === 2) {
      return `<div class="step-box"><p class="font-semibold text-slate-700 text-sm mb-1.5">Determinan 2×2 (rumus ad − bc)</p>
        <p class="font-mono text-[13px] break-all">det(A) = ${det2Line(A)} = <b class="text-indigo-700">${fmt(d)}</b></p></div>`;
    }
    const boxes = [], terms = [];
    A[0].forEach((a0j, j) => {
      const m = minorM(A, 0, j), dm = detM(m), si = (j % 2 === 0) ? 1 : -1;
      const comp = n === 3
        ? `${det2Line(m)} = ${fmt(dm)}`
        : `${sarrusLine(m)} = ${fmt(dm)} <span class="text-slate-400">(aturan Sarrus untuk minor 3×3)</span>`;
      boxes.push(`<div class="step-box overflow-x-auto">
        <p class="font-semibold text-slate-700 text-sm mb-1">Langkah ${j + 1} — suku j = ${j + 1}: ${si > 0 ? '+' : '−'} a<sub>1,${j + 1}</sub>·det(M<sub>1,${j + 1}</sub>)</p>
        <p class="font-mono text-[12.5px] break-all text-slate-700">det(M<sub>1,${j + 1}</sub>) = ${comp}</p>
        <p class="font-mono text-[12.5px] break-all text-slate-700 mt-1">suku = (${si})·${pnum(a0j)}·${pnum(dm)} = <b>${fmt(si * a0j * dm)}</b></p></div>`);
      const term = `(${pnum(a0j)})·(${pnum(dm)})`;
      terms.push(j === 0 ? (si < 0 ? `−${term}` : term) : (si < 0 ? ` − ${term}` : ` + ${term}`));
    });
    return boxes.join('') +
      `<div class="step-box overflow-x-auto border-l-indigo-500 bg-indigo-50/50">
        <p class="font-mono text-[13px] break-all">det(A) = ${terms.join('')} = <b class="text-indigo-700">${fmt(d)}</b></p></div>`;
  }
  function cofDetailHTML(A) {
    const n = A.length, C = cofM(A);
    if (n > 3) {
      return `<div class="step-box"><p class="text-sm text-slate-600">16 kofaktor dihitung dengan rumus di atas (tiap minor 3×3 via aturan Sarrus), hasilnya matriks kofaktor C di bawah.</p></div>`;
    }
    const rows = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const m = minorM(A, i, j);
      rows.push(`<tr><td class="text-center font-mono">C<sub>${i + 1},${j + 1}</sub></td><td class="text-center font-mono">${(i + j) % 2 ? '−' : '+'}</td><td class="font-mono text-[12px] break-all">${det2Line(m)}</td><td class="text-right font-mono font-bold text-indigo-700">${fmt(C[i][j])}</td></tr>`);
    }
    return `<div class="step-box overflow-x-auto">
      <p class="font-semibold text-slate-700 text-sm mb-1.5">Matriks kofaktor: C<sub>ij</sub> = (−1)<sup>i+j</sup> · det(M<sub>ij</sub>)</p>
      <table class="gtable"><thead><tr><th class="text-center">Kofaktor</th><th class="text-center">±</th><th>det(M<sub>ij</sub>)</th><th class="text-right">Nilai</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }

  function tabMatriks(body) {
    const n = state.matSize;
    const opCls = 'px-3 py-1.5 rounded-xl text-sm font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-700 text-slate-700 transition-colors';
    body.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <h3 class="font-bold text-slate-800 mr-auto">Matriks persegi A & B</h3>
        <label class="text-xs font-semibold text-slate-500">Ukuran</label>
        <select id="tk-mat-size" class="rounded-xl border border-slate-300 px-3 py-1.5 text-sm bg-white outline-none focus:border-indigo-500">
          ${[2, 3, 4].map(s => `<option value="${s}" ${s === n ? 'selected' : ''}>${s} × ${s}</option>`).join('')}
        </select>
      </div>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Matriks A</p>
          ${inputGrid('matA', state.matA, false)}
        </div>
        <div class="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <p class="text-xs font-bold text-violet-500 uppercase tracking-wide mb-2">Matriks B</p>
          ${inputGrid('matB', state.matB, true)}
        </div>
      </div>
      <div id="tk-mat-ops" class="flex flex-wrap gap-2 mt-4">
        <button data-op="add" class="${opCls}">A + B</button>
        <button data-op="sub" class="${opCls}">A − B</button>
        <button data-op="mul" class="${opCls}">A × B</button>
        <button data-op="trans" class="${opCls}">Aᵀ (transpos)</button>
        <button data-op="det" class="${opCls}">det(A)</button>
        <button data-op="adj" class="${opCls}">adj(A)</button>
        <button data-op="inv" class="px-3 py-1.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">A⁻¹ (invers)</button>
      </div>
      <div id="tk-mat-result" class="mt-4"></div>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 class="font-bold text-slate-800 mb-2">📐 Rumus</h3>
      <p class="text-sm text-slate-600">Ekspansi kofaktor: \\[ \\det(A) = \\sum_{j=1}^{n} (-1)^{1+j}\\, a_{1j}\\, \\det(M_{1j}) \\]</p>
      <p class="text-sm text-slate-600 mt-1.5">Adjoint &amp; invers: \\[ \\operatorname{adj}(A) = C^{\\mathsf{T}}, \\qquad A^{-1} = \\frac{1}{\\det(A)}\\,\\operatorname{adj}(A) \\]</p>
      <p class="text-sm text-slate-600 mt-1.5">Sistem \\( Ax = b \\) juga selesai lewat OBE terhadap \\( [A\\mid b] \\) — lihat tab <b>Gaussian Elimination</b>.</p>
    </div>`;

    document.getElementById('tk-mat-size').addEventListener('change', e => {
      const s = parseInt(e.target.value, 10);
      if (s === state.matSize) return;
      state.matSize = s; state.matA = defA(s); state.matB = defB(s);
      tabMatriks(body);
    });
    wireMatInputs(body);
    body.querySelectorAll('#tk-mat-ops [data-op]').forEach(btn =>
      btn.addEventListener('click', () => runOp(btn.dataset.op)));
    runOp('det');

    function runOp(op) {
      const A = state.matA.map(r => r.slice());
      const B = state.matB.map(r => r.slice());
      let html = '';
      if (op === 'add') html = `<p class="text-xs font-bold text-slate-500 uppercase mb-2">A + B — penjumlahan elemen sejenis</p>` + matWrap('A + B', addM(A, B));
      else if (op === 'sub') html = `<p class="text-xs font-bold text-slate-500 uppercase mb-2">A − B — pengurangan elemen sejenis</p>` + matWrap('A − B', subM(A, B));
      else if (op === 'mul') html = `<p class="text-xs font-bold text-slate-500 uppercase mb-2">A × B — baris A dikali kolom B</p>` + matWrap('A × B', mulM(A, B));
      else if (op === 'trans') html = `<p class="text-xs font-bold text-slate-500 uppercase mb-2">Aᵀ — baris menjadi kolom</p>` + matWrap('Aᵀ', transposeM(A));
      else if (op === 'det') html = detExpHTML(A);
      else if (op === 'adj') {
        const C = cofM(A);
        html = `<p class="text-xs font-bold text-slate-500 uppercase mb-2">Adjung (adjoin) A</p>` +
          cofDetailHTML(A) +
          `<div class="flex flex-wrap gap-3 mt-2">${matWrap('C (kofaktor)', C)}${matWrap('adj(A) = Cᵀ', adjM(A))}</div>`;
      } else if (op === 'inv') {
        const d = detM(A);
        if (Math.abs(d) < 1e-10) {
          html = `<div class="step-box border-l-rose-500 bg-rose-50"><p class="font-semibold text-rose-700 text-sm">det(A) = 0 → A matriks singular dan tidak memiliki invers.</p></div>`;
        } else {
          html = `<p class="text-xs font-bold text-slate-500 uppercase mb-2">Invers A via adjugate ÷ det</p>` +
            cofDetailHTML(A) +
            `<div class="flex flex-wrap gap-3 mt-2">${matWrap('adj(A)', adjM(A))}${matWrap('A⁻¹ = adj(A) ÷ det(A)', invM(A), `<p class="text-[11px] text-slate-400 mt-1">det(A) = ${fmt(d)}</p>`)}</div>`;
        }
      }
      document.getElementById('tk-mat-result').innerHTML = html;
      rerenderMath();
    }
  }

  /* ================= TAB 3: GAUSSIAN ELIMINATION (OBE) ================= */
  function augView(M) {
    const n = M[0].length - 1;
    const rows = M.map(r => `<div class="flex items-center gap-1 leading-6 whitespace-nowrap font-mono text-[13px]">
      <span class="text-slate-400">[</span>${r.slice(0, n).map(v => `<span class="w-16 text-right inline-block">${fmt(v)}</span>`).join('')}
      <span class="border-l-2 border-slate-400 pl-2 w-16 text-right inline-block text-violet-700 font-semibold">${fmt(r[n])}</span><span class="text-slate-400">]</span></div>`).join('');
    return `<div class="inline-block bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">${rows}</div>`;
  }

  function obeSolve(Ain, bin, nn) {
    const eps = 1e-10;
    const M = Ain.map((row, i) => row.map(snap).concat([snap(bin[i])]));
    const steps = [{ t: 'Matriks augmentasi awal [A | b]', M: M.map(r => r.slice()) }];
    let rank = 0, inconsistent = false;
    for (let k = 0; k < nn; k++) {
      let p = -1;
      for (let i = k; i < nn; i++) if (Math.abs(M[i][k]) > eps) { p = i; break; }
      if (p < 0) {
        steps.push({ t: `Tidak ada pivot pada kolom x<sub>${k + 1}</sub> → x<sub>${k + 1}</sub> menjadi variabel bebas`, M: null });
        continue;
      }
      if (p !== k) {
        const tmp = M[k]; M[k] = M[p]; M[p] = tmp;
        steps.push({ t: `Tukar baris: R<sub>${k + 1}</sub> ↔ R<sub>${p + 1}</sub>`, M: M.map(r => r.slice()) });
      }
      rank++;
      const piv = M[k][k];
      if (Math.abs(piv - 1) > eps) {
        for (let j = 0; j <= nn; j++) M[k][j] = snap(M[k][j] / piv);
        steps.push({ t: `Normalisasi pivot: R<sub>${k + 1}</sub> ← R<sub>${k + 1}</sub> ÷ ${fmt(piv)} (pivot 1)`, M: M.map(r => r.slice()) });
      }
      for (let i = 0; i < nn; i++) {
        if (i === k || Math.abs(M[i][k]) < eps) continue;
        const m = M[i][k];
        for (let j = 0; j <= nn; j++) M[i][j] = snap(M[i][j] - m * M[k][j]);
        steps.push({ t: `Eliminasi kolom x<sub>${k + 1}</sub>: m = ${fmt(m)} → R<sub>${i + 1}</sub> ← R<sub>${i + 1}</sub> − (${fmt(m)})·R<sub>${k + 1}</sub>`, M: M.map(r => r.slice()) });
      }
    }
    for (let i = 0; i < nn; i++) {
      const zeroRow = M[i].slice(0, nn).every(v => Math.abs(v) < eps);
      if (zeroRow && Math.abs(M[i][nn]) > eps) inconsistent = true;
    }
    const outcome = inconsistent ? 'none' : (rank < nn ? 'infinite' : 'unique');
    const x = [];
    if (outcome === 'unique') {
      for (let i = 0; i < nn; i++) {
        for (let j = 0; j < nn; j++) if (Math.abs(M[i][j]) > eps) { x[j] = M[i][nn]; break; }
      }
    }
    return { steps, outcome, x };
  }

  function tabOBE(body) {
    const n = state.obeSize;
    const aCells = state.obeA.map((row, i) =>
      `<div class="grid gap-1.5" style="grid-template-columns:repeat(${n},auto)">${row.map((v, j) =>
        `<input type="number" step="any" class="matrix-input obe-a" data-r="${i}" data-c="${j}" value="${v}">`).join('')}</div>`).join('');
    const bCells = state.obeB.map((v, i) =>
      `<input type="number" step="any" class="matrix-input obe-b" data-r="${i}" value="${v}">`).join('');
    body.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <h3 class="font-bold text-slate-800 mr-auto">Sistem persamaan linier A·x = b</h3>
        <label class="text-xs font-semibold text-slate-500">Ukuran</label>
        <select id="tk-obe-size" class="rounded-xl border border-slate-300 px-3 py-1.5 text-sm bg-white outline-none focus:border-indigo-500">
          ${[2, 3].map(s => `<option value="${s}" ${s === n ? 'selected' : ''}>${s} × ${s}</option>`).join('')}
        </select>
        <button id="tk-obe-go" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-2 text-sm">⚡ Jalankan Eliminasi</button>
      </div>
      <div class="flex flex-wrap items-start gap-6">
        <div><p class="text-xs font-bold text-slate-500 uppercase mb-2">A</p><div class="space-y-1.5">${aCells}</div></div>
        <div><p class="text-xs font-bold text-slate-500 uppercase mb-2">&nbsp;</p><p class="font-mono text-slate-400 text-xl pb-2">·</p></div>
        <div><p class="text-xs font-bold text-slate-500 uppercase mb-2">b</p><div class="space-y-1.5">${bCells}</div></div>
      </div>
      <div id="tk-obe-result" class="mt-4"></div>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 class="font-bold text-slate-800 mb-2">📐 Metode Gauss–Jordan (OBE)</h3>
      <p class="text-sm text-slate-600">Operasi Baris Elementer pada matriks augmentasi \\( [A\\mid b] \\): setiap kolom dijadikan pivot 1 lalu dieliminasi dari <i>semua</i> baris lain. Untuk sistem dengan solusi unik berarti \\( x = A^{-1}b \\); jika terdapat baris \\( 0 = c,\\, c \\neq 0 \\) sistem tidak konsisten, dan jika ada variabel bebas solusinya tak hingga banyak.</p>
    </div>`;

    document.getElementById('tk-obe-size').addEventListener('change', e => {
      const s = parseInt(e.target.value, 10);
      if (s === state.obeSize) return;
      state.obeSize = s; state.obeA = defA(s);
      state.obeB = s === 2 ? [5, 11] : [6, 12, 12];
      tabOBE(body);
    });
    body.querySelectorAll('.obe-a').forEach(inp => inp.addEventListener('input', () => {
      state.obeA[+inp.dataset.r][+inp.dataset.c] = num(inp.value);
    }));
    body.querySelectorAll('.obe-b').forEach(inp => inp.addEventListener('input', () => {
      state.obeB[+inp.dataset.r] = num(inp.value);
    }));
    document.getElementById('tk-obe-go').addEventListener('click', solve);
    solve();

    function solve() {
      const res = obeSolve(state.obeA.map(r => r.slice()), state.obeB.slice(), state.obeSize);
      let html = res.steps.map(s => s.M === null
        ? `<div class="step-box"><p class="text-sm font-semibold text-slate-600">${s.t}</p></div>`
        : `<div class="step-box overflow-x-auto"><p class="font-semibold text-slate-700 text-sm mb-1.5">${s.t}</p>${augView(s.M)}</div>`).join('');
      if (res.outcome === 'unique') {
        const list = res.x.map((v, i) => `<div class="font-mono text-[13px]">x<sub>${i + 1}</sub> = <b class="text-indigo-700">${fmt(v)}</b></div>`).join('');
        html += `<div class="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 inline-flex gap-5 mr-auto">
          <p class="font-bold text-indigo-800 text-sm">✅ Solusi unik</p>${list}</div>`;
      } else if (res.outcome === 'infinite') {
        html += `<div class="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p class="font-bold text-amber-700 text-sm">ℹ️ Solusi tidak tunggal — tak hingga banyak solusi</p>
          <p class="text-xs text-amber-600 mt-1">Terdapat variabel bebas (rank A &lt; n). Sistem konsisten namun solusinya berupa ruang solusi berparameter.</p></div>`;
      } else {
        html += `<div class="mt-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <p class="font-bold text-rose-700 text-sm">❌ Tidak ada solusi — sistem tidak konsisten</p>
          <p class="text-xs text-rose-600 mt-1">Reduksi menghasilkan baris 0 = c dengan c ≠ 0.</p></div>`;
      }
      document.getElementById('tk-obe-result').innerHTML = html;
      rerenderMath();
    }
  }

  /* ================= TAB 4: KALKULUS & OPTIMASI ================= */
  function parsePoly(raw) {
    let s = String(raw || '').toLowerCase().replace(/\s+/g, '');
    if (!s.replace(/,/g, '')) return { err: 'Masukkan polinomial.' };
    const isList = s.includes(','); /* mode daftar koefisien: angka polos = koefisien berurutan */
    const c = [];
    let pos = 0;
    const put = (coef, pow) => {
      if (pow > 8) return false;
      c[pow] = coef + (c[pow] || 0);
      return true;
    };
    for (const seg0 of s.split(',')) {
      let seg = seg0.replace(/\*/g, '');
      if (!seg) continue;
      let sign = 1;
      if (seg[0] === '-') { sign = -1; seg = seg.slice(1); }
      else if (seg[0] === '+') seg = seg.slice(1);
      if (!seg) continue;
      const xm = seg.match(/^(\d*\.?\d*)?x(\^(\d+))?$/);
      const nm = seg.match(/^(\d*\.?\d+)$/);
      if (xm || nm) {
        let coef, pow;
        if (xm) {
          coef = (xm[1] === undefined || xm[1] === '') ? 1 : parseFloat(xm[1]);
          pow = xm[3] ? parseInt(xm[3], 10) : 1;
        } else {
          coef = parseFloat(nm[1]);
          pow = isList ? pos++ : 0;
        }
        if (!put(sign * coef, pow)) return { err: 'Derajat polinomial maksimal 8.' };
        continue;
      }
      /* segmen majemuk, mis. "3 + 2x - 5x^2" diraih per suku (tanda depan diwarisi suku pertama) */
      const cs = (sign === -1 ? '-' : '') + seg;
      const parts = cs.match(/[+-]?[^+-]+/g);
      let ok = parts && parts.length;
      if (ok) for (const pt0 of parts) {
        const isneg = pt0[0] === '-';
        const pt = (isneg || pt0[0] === '+') ? pt0.slice(1) : pt0;
        if (!pt) { ok = false; break; }
        const x2 = pt.match(/^(\d*\.?\d*)?x(\^(\d+))?$/);
        const n2 = pt.match(/^(\d*\.?\d+)$/);
        if (x2) {
          const cf = (x2[1] === undefined || x2[1] === '') ? 1 : parseFloat(x2[1]);
          ok = put((isneg ? -1 : 1) * cf, x2[3] ? parseInt(x2[3], 10) : 1);
        } else if (n2) {
          ok = put((isneg ? -1 : 1) * parseFloat(n2[1]), 0);
        } else ok = false;
        if (!ok) break;
      }
      if (!ok) return { err: `Suku "${esc(seg0)}" tidak dikenali. Gunakan bentuk seperti 2x / x^2 / -5x^3.` };
    }
    for (let i = 0; i < c.length; i++) if (c[i] === undefined) c[i] = 0;
    return { c };
  }
  function polyLatex(c) {
    const parts = [];
    for (let i = c.length - 1; i >= 0; i--) {
      const a = c[i] || 0;
      if (Math.abs(a) < 1e-12) continue;
      const mag = Math.abs(a) === 1 && i > 0 ? '' : fmt(Math.abs(a));
      const vx = i === 0 ? '' : (i === 1 ? 'x' : `x^{${i}}`);
      parts.push({ neg: a < 0, s: `${mag}${vx}` });
    }
    if (!parts.length) return '0';
    let out = (parts[0].neg ? '-' : '') + parts[0].s;
    for (let k = 1; k < parts.length; k++) out += parts[k].neg ? ` - ${parts[k].s}` : ` + ${parts[k].s}`;
    return out;
  }
  function polyEval(c, x) {
    let y = 0;
    for (let i = c.length - 1; i >= 0; i--) y = y * x + (c[i] || 0);
    return y;
  }
  function polyDeriv(c) {
    return c.slice(1).map((v, i) => snap(v * (i + 1)));
  }
  function bisect(f, a, b) {
    let fa = f(a);
    for (let i = 0; i < 80; i++) {
      const m = (a + b) / 2, fm = f(m);
      if (fm === 0 || Math.abs(fm) < 1e-12) return m;
      if (fa * fm < 0) b = m; else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  }
  function rootsScan(f) {
    const roots = [];
    let px = -50, py = f(px);
    for (let x = -49.99; x <= 50.0001; x += 0.01) {
      const y = f(x);
      if (py === 0) roots.push(px);
      else if (py * y < 0) roots.push(bisect(f, px, x));
      px = x; py = y;
    }
    if (py === 0) roots.push(px);
    roots.sort((p, q) => p - q);
    const out = [];
    for (const r of roots) if (!out.length || Math.abs(r - out[out.length - 1]) > 1e-4) out.push(r);
    return out;
  }
  function polyRoots(c) {
    const a = c.slice();
    while (a.length && Math.abs(a[a.length - 1] || 0) < 1e-12) a.pop();
    const deg = a.length - 1;
    if (deg <= 0) return { deg: Math.max(deg, 0), roots: [] };
    if (deg === 1) return { deg, roots: [snap(-a[0] / a[1])] };
    if (deg === 2) {
      const D = a[1] * a[1] - 4 * a[2] * a[0];
      if (D < -1e-12) return { deg, roots: [] };
      const s = Math.sqrt(Math.max(D, 0));
      return { deg, roots: [snap((-a[1] + s) / (2 * a[2])), snap((-a[1] - s) / (2 * a[2]))] };
    }
    return { deg, roots: rootsScan(x => polyEval(a, x)) };
  }
  function gdRun(c, x0, eta, N) {
    const dc = polyDeriv(c);
    const path = [x0], iters = [];
    let x = x0, converged = false, diverged = false;
    for (let k = 0; k < N; k++) {
      const g = polyEval(dc, x), x1 = x - eta * g;
      iters.push({ k: k + 1, x, fx: polyEval(c, x), g, x1 });
      path.push(x1);
      if (!Number.isFinite(x1) || Math.abs(x1) > 1e9) { diverged = true; path.pop(); break; }
      if (Math.abs(x1 - x) < 1e-9) { x = x1; converged = true; break; }
      x = x1;
    }
    return { path, iters, converged, diverged, final: path[path.length - 1] };
  }
  function curveSVG(c, path) {
    let xLo = Math.min(-5, ...path), xHi = Math.max(5, ...path);
    if (xHi - xLo < 1) { xLo -= 1; xHi += 1; }
    const ys = [], W = 560, H = 300, P = 42;
    for (let i = 0; i <= 160; i++) ys.push(polyEval(c, xLo + (i / 160) * (xHi - xLo)));
    path.forEach(px => { if (Number.isFinite(px)) ys.push(polyEval(c, px)); });
    let yLo = Math.min(...ys.filter(Number.isFinite)), yHi = Math.max(...ys.filter(Number.isFinite));
    if (!Number.isFinite(yLo) || !Number.isFinite(yHi) || yHi - yLo < 1e-9) { yLo = yLo - 1 || -1; yHi = yHi + 1 || 1; }
    const pad = (yHi - yLo) * 0.1; yLo -= pad; yHi += pad;
    const sx = x => P + (x - xLo) / (xHi - xLo) * (W - 2 * P);
    const sy = y => H - P - (y - yLo) / (yHi - yLo) * (H - 2 * P);
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const x = xLo + i / 160 * (xHi - xLo);
      pts.push(`${sx(x).toFixed(1)},${sy(polyEval(c, x)).toFixed(1)}`);
    }
    let g = `<svg viewBox="0 0 ${W} ${H}" class="w-full" role="img" aria-label="Grafik f(x) &amp; lintasan gradient descent">`;
    g += `<rect x="0" y="0" width="${W}" height="${H}" fill="#fafbfc" rx="12"></rect>`;
    if (yLo < 0 && yHi > 0) g += `<line x1="${P}" y1="${sy(0).toFixed(1)}" x2="${W - P}" y2="${sy(0).toFixed(1)}" stroke="#cbd5e1" stroke-dasharray="4 4"></line>`;
    if (xLo < 0 && xHi > 0) g += `<line x1="${sx(0).toFixed(1)}" y1="${P}" x2="${sx(0).toFixed(1)}" y2="${H - P}" stroke="#cbd5e1" stroke-dasharray="4 4"></line>`;
    for (let i = 0; i <= 5; i++) {
      const t = xLo + i / 5 * (xHi - xLo);
      g += `<text x="${sx(t).toFixed(1)}" y="${H - 14}" text-anchor="middle" font-size="10" fill="#94a3b8">${fmt(t, 1)}</text>`;
    }
    for (let i = 0; i <= 4; i++) {
      const t = yLo + i / 4 * (yHi - yLo);
      g += `<text x="${P - 7}" y="${(sy(t) + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#94a3b8">${fmt(t, 1)}</text>`;
    }
    g += `<polyline fill="none" stroke="#4f46e5" stroke-width="2.5" points="${pts.join(' ')}"></polyline>`;
    if (path.length > 1) {
      const pp = path.filter(Number.isFinite).map(x => `${sx(x).toFixed(1)},${sy(polyEval(c, x)).toFixed(1)}`);
      g += `<polyline fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 3" points="${pp.join(' ')}"></polyline>`;
    }
    path.forEach((x, i) => {
      if (!Number.isFinite(x)) return;
      const cx = sx(x), cy = sy(polyEval(c, x));
      if (!Number.isFinite(cy)) return;
      g += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.2" fill="${i === 0 ? '#4f46e5' : '#f59e0b'}" stroke="#fff" stroke-width="1.4"></circle>`;
      if (i === 0) g += `<text x="${(cx + 7).toFixed(1)}" y="${(cy - 7).toFixed(1)}" font-size="11" font-weight="700" fill="#4f46e5">x₀</text>`;
    });
    return g + '</svg>';
  }

  function tabKalkulus(body) {
    body.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
      <h3 class="font-bold text-slate-800">Polinomial f(x)</h3>
      <p class="text-xs text-slate-500 mt-1 mb-3">Daftar koefisien dipisah koma, konstanta lebih dulu: <span class="font-mono">3, 2, 0, -5</span> → 3 + 2x − 5x³. Bentuk suku juga diterima: <span class="font-mono">3 + 2x - 5x^2</span> / <span class="font-mono">x^2</span>. Derajat maks 8.</p>
      <div class="flex gap-2">
        <input id="tk-cal-poly" type="text" value="${esc(state.polyStr)}" spellcheck="false" class="flex-1 rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
        <button id="tk-cal-go" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-2 text-sm">Terapkan</button>
      </div>
      <p id="tk-cal-err" class="hidden mt-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2"></p>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
      <h3 class="font-bold text-slate-800 mb-3">🧷 f(x), f'(x) &amp; f''(x)</h3>
      <div id="tk-cal-derive" class="grid md:grid-cols-3 gap-3"></div>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
      <h3 class="font-bold text-slate-800 mb-3">🎯 Titik kritis (f'(x) = 0)</h3>
      <div id="tk-cal-crit"></div>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
      <div class="flex flex-wrap items-end gap-3 mb-3">
        <h3 class="font-bold text-slate-800 mr-auto">📉 Gradient Descent</h3>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase">x₀ awal</label>
          <input id="tk-gd-x0" type="number" step="any" value="${state.gdX0}" class="w-24 rounded-xl border border-slate-300 px-2.5 py-1.5 text-sm font-mono outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase">η (learning rate)</label>
          <input id="tk-gd-eta" type="number" step="any" value="${state.gdEta}" class="w-24 rounded-xl border border-slate-300 px-2.5 py-1.5 text-sm font-mono outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase">N langkah</label>
          <input id="tk-gd-n" type="number" step="1" value="${state.gdN}" class="w-24 rounded-xl border border-slate-300 px-2.5 py-1.5 text-sm font-mono outline-none focus:border-indigo-500" />
        </div>
        <button id="tk-gd-go" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-2 text-sm">▶ Jalankan</button>
      </div>
      <div id="tk-gd-out"></div>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 class="font-bold text-slate-800 mb-2">📐 Rumus</h3>
      <p class="text-sm text-slate-600">Aturan pangkat: \\( \\dfrac{d}{dx}\\,x^{n} = n\\,x^{n-1} \\), sehingga \\( f(x) = \\sum a_k x^{k} \\Rightarrow f'(x) = \\sum k\\,a_k\\,x^{k-1} \\).</p>
      <p class="text-sm text-slate-600 mt-1.5">Uji turunan kedua: \\( f''(x_0) &lt; 0 \\Rightarrow \\) maksimum lokal, \\( f''(x_0) &gt; 0 \\Rightarrow \\) minimum lokal.</p>
      <p class="text-sm text-slate-600 mt-1.5">Gradient Descent: \\( x_{k+1} = x_k - \\eta\\, f'(x_k) \\).</p>
    </div>`;

    const inp = document.getElementById('tk-cal-poly');
    const errEl = document.getElementById('tk-cal-err');
    inp.addEventListener('input', drawPoly);
    document.getElementById('tk-cal-go').addEventListener('click', drawPoly);
    document.getElementById('tk-gd-go').addEventListener('click', runGD);
    drawPoly();
    runGD();

    function drawPoly() {
      state.polyStr = inp.value;
      const deriveEl = document.getElementById('tk-cal-derive');
      const critEl = document.getElementById('tk-cal-crit');
      const p = parsePoly(state.polyStr);
      if (p.err) {
        errEl.textContent = p.err;
        errEl.classList.remove('hidden');
        deriveEl.innerHTML = '';
        critEl.innerHTML = '';
        return;
      }
      errEl.classList.add('hidden');
      const c = p.c, d1 = polyDeriv(c), d2 = polyDeriv(d1);
      const tile = (lb, ex) => `<div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">${lb}</p><p class="mt-1.5">\\( ${lb} = ${ex} \\)</p></div>`;
      deriveEl.innerHTML = tile('f(x)', polyLatex(c)) + tile("f'(x)", polyLatex(d1)) + tile("f''(x)", polyLatex(d2));
      const f = x => polyEval(c, x), g2 = x => polyEval(d2, x);
      const { deg, roots } = polyRoots(d1);
      let boxes = '';
      if ((deg === 0 && !roots.length && Math.abs(d1[0] || 0) < 1e-12) || deg < 0) {
        boxes = `<div class="step-box"><p class="text-sm text-slate-600">f(x) konstan — tidak ada titik kritis.</p></div>`;
      } else if (!roots.length) {
        boxes = `<div class="step-box"><p class="text-sm text-slate-600">${deg >= 1 && deg <= 2 ? "f'(x) tidak memiliki akar real" : "Pemindaian tidak menemukan perubahan tanda f'(x)"} → tidak ada titik kritis.</p></div>`;
      } else {
        boxes = roots.map(x0 => {
          const v = g2(x0);
          const cls = v < -1e-7 ? ['Maksimum lokal', 'bg-rose-100 text-rose-700']
            : v > 1e-7 ? ['Minimum lokal', 'bg-emerald-100 text-emerald-700']
            : ['uji turunan kedua ≈ 0 — titik belok?', 'bg-amber-100 text-amber-700'];
          return `<div class="step-box flex flex-wrap items-center gap-3">
            <span class="font-mono text-[13px] font-semibold">x<sub>0</sub> = ${fmt(x0)}</span>
            <span class="font-mono text-[12px] text-slate-500">f(x<sub>0</sub>) = ${fmt(f(x0))} · f''(x<sub>0</sub>) = ${fmt(v)}</span>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${cls[1]}">${cls[0]}</span></div>`;
        }).join('');
      }
      const note = deg >= 3
        ? `<p class="text-[11px] text-slate-400 mt-2">Metode numerik: pindai tanda f'(x) pada [−50, 50] dengan Δx = 0,01, lalu biseksi hingga |Δx| sangat kecil.</p>`
        : `<p class="text-[11px] text-slate-400 mt-2">Derajat f' ≤ 2 → akar dihitung eksak (rumus kuadrat / linier).</p>`;
      critEl.innerHTML = boxes + note;
      rerenderMath();
    }

    function runGD() {
      state.gdX0 = num(document.getElementById('tk-gd-x0').value);
      state.gdEta = num(document.getElementById('tk-gd-eta').value);
      state.gdN = Math.max(1, Math.min(200, Math.round(num(document.getElementById('tk-gd-n').value))));
      const out = document.getElementById('tk-gd-out');
      const p = parsePoly(state.polyStr);
      if (p.err) { out.innerHTML = `<p class="text-xs font-semibold text-rose-700">Perbaiki polinomial di atas terlebih dahulu.</p>`; return; }
      const r = gdRun(p.c, state.gdX0, state.gdEta, state.gdN);
      const shown = r.iters.slice(0, 12);
      const rows = shown.map(t =>
        `<tr><td class="text-center font-mono">${t.k}</td><td class="text-right font-mono">${fmt(t.x)}</td><td class="text-right font-mono">${fmt(t.fx)}</td><td class="text-right font-mono">${fmt(t.g)}</td><td class="text-right font-mono font-semibold text-indigo-700">${fmt(t.x1)}</td></tr>`).join('');
      out.innerHTML = `
      ${curveSVG(p.c, r.path)}
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 mb-2">
        <span>x₀ = ${fmt(state.gdX0)}</span><span>η = ${fmt(state.gdEta)}</span><span>N = ${state.gdN}</span>
        <span>titik akhir: x ≈ <b class="text-indigo-700">${fmt(r.final)}</b></span>
        ${r.converged ? '<span class="text-emerald-600 font-bold">konvergen ✓</span>' : ''}
        ${r.diverged ? '<span class="text-rose-600 font-bold">divergen — coba kecilkan η</span>' : ''}
      </div>
      <table class="gtable"><thead><tr><th class="text-center">k</th><th class="text-right">x<sub>k</sub></th><th class="text-right">f(x<sub>k</sub>)</th><th class="text-right">f'(x<sub>k</sub>)</th><th class="text-right">x<sub>k+1</sub></th></tr></thead><tbody>${rows}</tbody></table>
      ${r.iters.length > 12 ? `<p class="text-[11px] text-slate-400 mt-1">Menampilkan 12 iterasi pertama dari ${r.iters.length} langkah.</p>` : ''}`;
      rerenderMath();
    }
  }

  /* ================= TAB 5: STATISTIKA & DATA SCIENCE ================= */
  function medianOf(a) {
    const n = a.length, m = Math.floor(n / 2);
    return n % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function histSVG(nums) {
    const nmin = Math.min(...nums), nmax = Math.max(...nums);
    const nb = Math.max(4, Math.min(10, Math.ceil(Math.sqrt(nums.length))));
    const bwv = (nmax - nmin) / nb || 1;
    const edges = [];
    for (let i = 0; i <= nb; i++) edges.push(nmin + i * bwv);
    const counts = Array(nb).fill(0);
    nums.forEach(v => {
      let bi = Math.floor((v - nmin) / bwv);
      if (bi >= nb) bi = nb - 1;
      counts[bi]++;
    });
    const W = 560, H = 240, P = 40, pb = 26;
    const mx = Math.max(...counts) || 1;
    const bw = (W - 2 * P) / nb;
    let g = `<svg viewBox="0 0 ${W} ${H}" class="w-full" role="img" aria-label="Histogram data">`;
    g += `<rect x="0" y="0" width="${W}" height="${H}" fill="#fafbfc" rx="12"></rect>`;
    counts.forEach((cnt, i) => {
      const h = (cnt / mx) * (H - P - pb);
      const x = P + i * bw + 3, y = H - pb - h;
      g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="3" fill="#6366f1" opacity="0.85"></rect>`;
      g += `<text x="${(P + i * bw + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="600" fill="#475569">${cnt}</text>`;
    });
    edges.forEach((e, i) => {
      g += `<text x="${(P + i * bw).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="#94a3b8">${fmt(e, 1)}</text>`;
    });
    for (let i = 0; i <= 4; i++) {
      const t = (mx / 4) * i;
      g += `<text x="${P - 7}" y="${(H - pb - (t / mx) * (H - P - pb) + 3).toFixed(1)}" text-anchor="end" font-size="9.5" fill="#94a3b8">${fmt(t, 1)}</text>`;
    }
    g += `<line x1="${P}" y1="${H - pb}" x2="${W - P}" y2="${H - pb}" stroke="#cbd5e1"></line></svg>`;
    return `<p class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">${nb} bin [${fmt(nmin, 1)}, ${fmt(nmax, 1)}]</p>` + g;
  }

  function tabStatistika(body) {
    body.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
      <h3 class="font-bold text-slate-800">Data numerik</h3>
      <p class="text-xs text-slate-500 mt-1 mb-2">Pisahkan dengan koma, spasi, atau baris baru.</p>
      <textarea id="tk-st-raw" rows="3" spellcheck="false" class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">${esc(state.statRaw)}</textarea>
      <button id="tk-st-go" class="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-2 text-sm">📊 Hitung Statistik</button>
      <p id="tk-st-err" class="hidden mt-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2"></p>
    </div>
    <div id="tk-st-out"></div>
    <div class="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 class="font-bold text-slate-800 mb-2">📐 Rumus</h3>
      <p class="text-sm text-slate-600">Rata-rata: \\( \\mu = \\dfrac{1}{n}\\sum_{i=1}^{n} x_i \\)</p>
      <p class="text-sm text-slate-600 mt-1.5">Varians &amp; simpangan: \\( \\sigma^2 = \\dfrac{1}{n}\\sum_{i=1}^{n}(x_i - \\mu)^2 \\) (populasi), \\( s^2 = \\dfrac{1}{n-1}\\sum_{i=1}^{n}(x_i - \\mu)^2 \\) (sampel); \\( \\sigma = \\sqrt{\\sigma^2}, \\; s = \\sqrt{s^2} \\).</p>
      <p class="text-sm text-slate-600 mt-1.5">Kuartil (Moore–McCabe): Q1 = median paruh bawah, Q3 = median paruh atas; \\( \\mathrm{IQR} = Q3 - Q1 \\).</p>
    </div>`;

    const ta = document.getElementById('tk-st-raw');
    const errEl = document.getElementById('tk-st-err');
    ta.addEventListener('change', computeStats);
    document.getElementById('tk-st-go').addEventListener('click', computeStats);
    computeStats();

    function computeStats() {
      state.statRaw = ta.value;
      const out = document.getElementById('tk-st-out');
      const toks = ta.value.split(/[\s,;]+/).filter(s => s.length);
      const bad = toks.find(t => !/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t));
      if (bad) { fail(`Data "${esc(bad)}" bukan angka valid.`); return; }
      const nums = toks.map(Number);
      if (nums.length < 2) { fail('Minimal 2 angka diperlukan.'); return; }
      errEl.classList.add('hidden');
      const n = nums.length;
      const sorted = nums.slice().sort((a, b) => a - b);
      const sum = nums.reduce((a, v) => a + v, 0);
      const mu = sum / n;
      const med = medianOf(sorted);
      const cnt = new Map();
      nums.forEach(v => cnt.set(v, (cnt.get(v) || 0) + 1));
      let mcm = 0; cnt.forEach(c => mcm = Math.max(mcm, c));
      const modes = [...cnt.entries()].filter(([, c]) => c === mcm).map(([v]) => fmt(v));
      const modeStr = mcm === 1 ? 'tidak ada (semua unik)' : modes.join(', ');
      const min = sorted[0], max = sorted[n - 1], range = max - min;
      const dev = nums.map(v => v - mu);
      const dev2 = dev.map(v => v * v);
      const ss = dev2.reduce((a, v) => a + v, 0);
      const popVar = ss / n, smpVar = n > 1 ? ss / (n - 1) : popVar;
      const popSd = Math.sqrt(popVar), smpSd = Math.sqrt(smpVar);
      const mid = Math.floor(n / 2);
      const q1 = medianOf(sorted.slice(0, mid));
      const q3 = n % 2 ? medianOf(sorted.slice(mid + 1)) : medianOf(sorted.slice(mid));
      const iqr = q3 - q1;
      const tile = (lb, val, sub) => `<div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
        <p class="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">${lb}</p>
        <p class="text-base font-bold text-indigo-700 mt-0.5 break-all">${val}</p>${sub ? `<p class="text-[10px] text-slate-400">${sub}</p>` : ''}</div>`;
      const tiles = [
        tile('n', n), tile('Σ', fmt(sum)), tile('μ (mean)', fmt(mu)), tile('median', fmt(med)), tile('modus', esc(modeStr)),
        tile('min', fmt(min)), tile('max', fmt(max)), tile('rentang', fmt(range)),
        tile('Q1', fmt(q1)), tile('Q3', fmt(q3)), tile('IQR', fmt(iqr)),
        tile('σ² (populasi)', fmt(popVar)), tile('σ', fmt(popSd)),
        tile('s² (sampel)', fmt(smpVar)), tile('s', fmt(smpSd)),
      ].join('');
      let run = 0;
      const rows = nums.map((v, i) => {
        run += dev2[i];
        return `<tr><td class="text-center font-mono">${i + 1}</td><td class="text-right font-mono">${fmt(v)}</td><td class="text-right font-mono">${fmt(dev[i])}</td><td class="text-right font-mono">${fmt(dev2[i])}</td><td class="text-right font-mono font-semibold text-indigo-700">${fmt(run)}</td></tr>`;
      }).join('');
      out.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
        <h3 class="font-bold text-slate-800 mb-3">📈 Statistik deskriptif (${n} data)</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">${tiles}</div>
      </div>
      <div class="grid lg:grid-cols-2 gap-4 mb-4">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 class="font-bold text-slate-800 mb-3">🪜 Langkah variansi (tabel kerja)</h3>
          <div class="overflow-x-auto"><table class="gtable">
            <thead><tr><th class="text-center">i</th><th class="text-right">x<sub>i</sub></th><th class="text-right">x<sub>i</sub> − μ</th><th class="text-right">(x<sub>i</sub> − μ)²</th><th class="text-right">Σ (x<sub>i</sub> − μ)²</th></tr></thead>
            <tbody>${rows}</tbody></table></div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 class="font-bold text-slate-800 mb-3">📊 Histogram</h3>
          ${histSVG(nums)}
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800 mb-3">🧮 Perhitungan variansi</h3>
        <div class="step-box"><p class="font-mono text-[13px] break-all">\\( \\sum_{i=1}^{n} (x_i - \\mu)^2 = ${fmt(ss)} \\)</p></div>
        <div class="step-box"><p class="font-mono text-[13px] break-all">Populasi: \\( \\sigma^2 = \\dfrac{${fmt(ss)}}{${n}} = ${fmt(popVar)} \\quad\\Rightarrow\\quad \\sigma = \\sqrt{${fmt(popVar)}} = ${fmt(popSd)} \\)</p></div>
        <div class="step-box"><p class="font-mono text-[13px] break-all">Sampel: \\( s^2 = \\dfrac{${fmt(ss)}}{${n - 1}} = ${fmt(smpVar)} \\quad\\Rightarrow\\quad s = \\sqrt{${fmt(smpVar)}} = ${fmt(smpSd)} \\)</p></div>
      </div>`;
      rerenderMath();
      return;

      function fail(msg) {
        errEl.innerHTML = msg;
        errEl.classList.remove('hidden');
        out.innerHTML = '';
      }
    }
  }

  /* ================= SHELL TAB ================= */
  function draw() {
    main.innerHTML = `
    <div id="tk-tabs" class="flex overflow-x-auto no-scrollbar py-1 gap-2 flex-nowrap sm:flex-wrap mb-5">${TABS.map(t =>
      `<button data-tab="${t.id}" class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors border shrink-0 ${t.id === activeTab ? TAB_ON : TAB_OFF}">${t.label}</button>`).join('')}</div>
    <div id="tk-body"></div>`;
    main.querySelectorAll('#tk-tabs [data-tab]').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.tab === activeTab) return;
      activeTab = btn.dataset.tab;
      paintTabs();
      drawTab();
    }));
    drawTab();
  }
  function paintTabs() {
    main.querySelectorAll('#tk-tabs [data-tab]').forEach(btn => {
      btn.className = `px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors border shrink-0 ${btn.dataset.tab === activeTab ? TAB_ON : TAB_OFF}`;
    });
  }
  function drawTab() {
    const body = document.getElementById('tk-body');
    if (!body) return;
    if (activeTab === 'bilangan') tabBilangan(body);
    else if (activeTab === 'matriks') tabMatriks(body);
    else if (activeTab === 'obe') tabOBE(body);
    else if (activeTab === 'kalkulus') tabKalkulus(body);
    else tabStatistika(body);
  }

  draw();
}

export default { render, subtitle };
