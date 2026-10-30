/**
 * Matematika Diskrit Hub (PRD 2.3)
 * Delapan tab interaktif:
 *   1. Logika Matematika       5. Kombinatorika & Probabilitas
 *   2. Teori Himpunan          6. Teori Graf
 *   3. Relasi & Fungsi         7. Teori Bilangan
 *   4. Aljabar Boolean         8. Induksi & Rekurensi
 * Semua parser & solver ditulis dari nol (tanpa library eksternal).
 */

export const subtitle = (user, extra) =>
  'Logika, himpunan, relasi, Boolean, kombinatorika, graf, bilangan & rekurensi';

/* =========================================================================
   SHARED HELPERS
   ========================================================================= */

const esc0 = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const BTN = 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-2 text-sm transition';
const BTN2 = 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl px-4 py-2 text-sm transition';
const INPUT = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';
const CARD = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-5';

const T_BADGE = '<span class="inline-block min-w-[1.9rem] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">T</span>';
const F_BADGE = '<span class="inline-block min-w-[1.9rem] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">F</span>';
const badgeTF = (b) => (b ? T_BADGE : F_BADGE);

function card(title, icon, body, extraClass = '') {
  return `<div class="${CARD} ${extraClass}">
    <h3 class="font-bold text-slate-800 mb-3">${icon ? icon + ' ' : ''}${esc0(title)}</h3>
    ${body}
  </div>`;
}

function errHtml(msg) {
  return `<div class="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">⚠ ${esc0(String(msg))}</div>`;
}

function fmtNum(x) {
  if (typeof x !== 'number' || !isFinite(x)) return '—';
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
  return String(Math.round(x * 1e6) / 1e6);
}

function parseItems(str) {
  const out = [];
  const seen = new Set();
  for (const part of String(str ?? '').split(/[,;\n]/)) {
    for (const t of part.trim().split(/\s+/)) {
      if (t && !seen.has(t)) { seen.add(t); out.push(t); }
    }
  }
  return out;
}

function parseNumList(str) {
  const nums = [];
  for (const it of parseItems(str)) {
    const n = /^-?\d+$/.test(it) ? parseInt(it, 10) : Number(it);
    if (isFinite(n)) nums.push(n);
  }
  return nums;
}

/* =========================================================================
   MATEMATIKA DASAR
   ========================================================================= */

function gcd(a, b) {
  a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0 || n > 20) return null;
  let v = 1;
  for (let i = 2; i <= n; i++) v *= i;
  return v;
}

function factorialChainStr(n) {
  if (!Number.isInteger(n) || n < 0) return null;
  if (n === 0) return '0! = 1 (konvensi permutasi kosong)';
  if (n > 10) return null;
  const chain = [];
  for (let i = n; i >= 1; i--) chain.push(i);
  return `${n}! = ${chain.join('·')} = ${factorial(n)}`;
}

function permCap(n, r) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) return null;
  let v = 1;
  for (let i = 0; i < r; i++) { v *= (n - i); if (v > 1e15) return null; }
  return Math.round(v);
}

function binom(n, r) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) return null;
  const rr = Math.min(r, n - r);
  let v = 1;
  for (let i = 0; i < rr; i++) { v *= (n - i); v /= (i + 1); if (v > 1e15) return null; }
  return Math.round(v);
}

function derangementDP(n) {
  if (!Number.isInteger(n) || n < 0 || n > 20) return null;
  if (n === 0) return 1;
  if (n === 1) return 0;
  let a = 1, b = 0; // D0, D1
  for (let i = 2; i <= n; i++) { const d = (i - 1) * (a + b); a = b; b = d; }
  return b;
}

/* =========================================================================
   PARSER LOGIKA (recursive descent)
   Grammar: iff → impl ('↔' iff)?; impl → xor ('→' impl)?; xor → or ('⊕' xor)?;
            or → and ('∨' or)?; and → not ('∧' and)?; not → '¬' not | atom;
            atom → var | '(' iff ')'
   Presedensi: ¬ > ∧ > ∨ > ⊕ > → > ↔
   ========================================================================= */

function logicTokenize(src) {
  const s = String(src)
    .replace(/<->/g, '↔').replace(/<=>/g, '↔').replace(/->/g, '→').replace(/=>/g, '→')
    .replace(/[~!]/g, '¬').replace(/&&/g, '∧').replace(/[&.]/g, '∧')
    .replace(/\|\|/g, '∨').replace(/[|]/g, '∨').replace(/\^/g, '⊕');
  const tokens = [];
  for (const ch of s) {
    if (/\s/.test(ch)) continue;
    if (ch === 'p' || ch === 'q' || ch === 'r') { tokens.push({ t: 'var', v: ch }); continue; }
    if ('¬∧∨⊕→↔()'.includes(ch)) { tokens.push({ t: ch }); continue; }
    throw new Error('Karakter tidak dikenal: "' + ch + '"');
  }
  if (!tokens.length) throw new Error('Ekspresi kosong');
  return tokens;
}

function logicParse(tokens) {
  let i = 0;
  const peek = () => tokens[i];
  function iff() {
    const l = impl();
    if (peek() && peek().t === '↔') { i++; const r = iff(); return { op: '↔', l, r }; }
    return l;
  }
  function impl() {
    const l = xorl();
    if (peek() && peek().t === '→') { i++; const r = impl(); return { op: '→', l, r }; }
    return l;
  }
  function xorl() {
    const l = orl();
    if (peek() && peek().t === '⊕') { i++; const r = xorl(); return { op: '⊕', l, r }; }
    return l;
  }
  function orl() {
    const l = andl();
    if (peek() && peek().t === '∨') { i++; const r = orl(); return { op: '∨', l, r }; }
    return l;
  }
  function andl() {
    const l = notl();
    if (peek() && peek().t === '∧') { i++; const r = andl(); return { op: '∧', l, r }; }
    return l;
  }
  function notl() {
    if (peek() && peek().t === '¬') { i++; return { op: '¬', a: notl() }; }
    return atoml();
  }
  function atoml() {
    const tk = peek();
    if (!tk) throw new Error('Ekspresi tidak lengkap (operand hilang)');
    if (tk.t === 'var') { i++; return { v: tk.v }; }
    if (tk.t === '(') {
      i++;
      const e = iff();
      if (!peek() || peek().t !== ')') throw new Error('Kurung tutup ")" hilang');
      i++;
      return e;
    }
    throw new Error('Token tak terduga: "' + tk.t + '"');
  }
  const ast = iff();
  if (i < tokens.length) throw new Error('Token berlebih setelah akhir: "' + tokens[i].t + '"');
  return ast;
}

function evalLogic(node, env) {
  if (node.v) return !!env[node.v];
  switch (node.op) {
    case '¬': return !evalLogic(node.a, env);
    case '∧': return evalLogic(node.l, env) && evalLogic(node.r, env);
    case '∨': return evalLogic(node.l, env) || evalLogic(node.r, env);
    case '⊕': return evalLogic(node.l, env) !== evalLogic(node.r, env);
    case '→': return !evalLogic(node.l, env) || evalLogic(node.r, env);
    case '↔': return evalLogic(node.l, env) === evalLogic(node.r, env);
    default: throw new Error('Operator tidak dikenal: ' + node.op);
  }
}

function astVars(node, set) {
  if (node.v) { set.add(node.v); return set; }
  if (node.a) astVars(node.a, set);
  if (node.l) astVars(node.l, set);
  if (node.r) astVars(node.r, set);
  return set;
}

/* =========================================================================
   TAB 1 — LOGIKA MATEMATIKA
   ========================================================================= */

function insButtonsHtml(nvars, targetId) {
  const toks = ['p', 'q', ...(nvars === 3 ? ['r'] : []), '¬', '∧', '∨', '→', '↔', '⊕', '(', ')'];
  return toks.map((t) =>
    `<button type="button" class="dis-ins px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-mono" data-target="${targetId}" data-tok="${t}">${t}</button>`
  ).join(' ');
}

function logicTableHTML(expr, nvars) {
  let ast;
  try {
    ast = logicParse(logicTokenize(expr));
  } catch (e) {
    return errHtml(e.message || e);
  }
  const vars = ['p', 'q', 'r'].slice(0, nvars);
  let rows = '', allTrue = true, allFalse = true;
  for (let i = 0; i < (1 << nvars); i++) {
    const env = {};
    vars.forEach((v, k) => { env[v] = !!((i >> (nvars - 1 - k)) & 1); });
    const val = evalLogic(ast, env);
    if (!val) allTrue = false;
    if (val) allFalse = false;
    rows += '<tr>' + vars.map((v) => `<td>${badgeTF(env[v])}</td>`).join('') + `<td>${badgeTF(val)}</td></tr>`;
  }
  const kind = allTrue
    ? '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">Tautologi (∎)</span>'
    : allFalse
      ? '<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">Kontradiksi</span>'
      : '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">Kontingensi</span>';
  return `
    <p class="text-xs text-slate-500 mb-2">Dievaluasi untuk semua ${1 << nvars} kombinasi nilai kebenaran.</p>
    <table class="gtable truth-table">
      <thead><tr>${vars.map((v) => `<th class="text-center">${v}</th>`).join('')}<th class="text-center">${esc0(expr)}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="mt-3 text-sm">Klasifikasi: ${kind}</p>`;
}

function equivHTML(e1, e2) {
  let a1, a2;
  try { a1 = logicParse(logicTokenize(e1)); } catch (e) { return errHtml('Ekspresi A: ' + (e.message || e)); }
  try { a2 = logicParse(logicTokenize(e2)); } catch (e) { return errHtml('Ekspresi B: ' + (e.message || e)); }
  const varsSet = astVars(a1, astVars(a2, new Set()));
  const nvars = varsSet.has('r') ? 3 : 2;
  const vars = ['p', 'q', 'r'].slice(0, nvars);
  let rows = '', diffs = 0;
  for (let i = 0; i < (1 << nvars); i++) {
    const env = {};
    vars.forEach((v, k) => { env[v] = !!((i >> (nvars - 1 - k)) & 1); });
    const v1 = evalLogic(a1, env), v2 = evalLogic(a2, env);
    if (v1 !== v2) diffs++;
    rows += '<tr>' + vars.map((v) => `<td>${env[v] ? 'T' : 'F'}</td>`).join('')
      + `<td>${badgeTF(v1)}</td><td>${badgeTF(v2)}</td>`
      + `<td>${v1 === v2 ? '<span class="text-emerald-600 font-bold">✓</span>' : '<span class="text-rose-600 font-bold">✗</span>'}</td></tr>`;
  }
  const verdict = diffs === 0
    ? '<div class="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold px-3 py-2">Ekuivalen (∎) — kedua tabel kebenaran identik di semua baris (mis. hukum De Morgan terverifikasi).</div>'
    : `<div class="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold px-3 py-2">Tidak ekuivalen — tabel berbeda pada ${diffs} baris (tanda ✗).</div>`;
  return `${verdict}
    <table class="gtable truth-table mt-3">
      <thead><tr>${vars.map((v) => `<th class="text-center">${v}</th>`).join('')}<th class="text-center">A</th><th class="text-center">B</th><th>Sama?</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function tabLogika(host, ctx, S, rerender, finish) {
  const esc = ctx.esc || esc0;
  const st = S.logika;
  host.innerHTML = `
    <div class="grid lg:grid-cols-2 gap-5">
      ${card('Generator Tabel Kebenaran', '🧠', `
        <div class="grid grid-cols-2 gap-3 mb-3">
          <label class="block"><span class="text-xs font-semibold text-slate-500">Jumlah variabel</span>
            <select id="dis-nvar" class="${INPUT}">
              <option value="2" ${st.nvars === 2 ? 'selected' : ''}>2 — p, q</option>
              <option value="3" ${st.nvars === 3 ? 'selected' : ''}>3 — p, q, r</option>
            </select></label>
          <div><span class="text-xs font-semibold text-slate-500">Sisipkan token (klik)</span>
            <div class="flex flex-wrap gap-1 mt-1">${insButtonsHtml(st.nvars, 'dis-logexpr')}</div></div>
        </div>
        <label class="block mb-2"><span class="text-xs font-semibold text-slate-500">Ekspresi</span>
          <input id="dis-logexpr" class="${INPUT}" value="${esc(st.expr)}" spellcheck="false" placeholder="mis. ¬(p∧q) → r ⊕ p" /></label>
        <p class="text-xs text-slate-500 mb-3">Bisa juga diketik: ~ atau ! = ¬, &amp; = ∧, | = ∨, ^ = ⊕, -&gt; = →, &lt;-&gt; = ↔. Presedensi: ¬ &gt; ∧ &gt; ∨ &gt; ⊕ &gt; → &gt; ↔.</p>
        <button type="button" data-act="dis-eval" class="${BTN}">▶ Evaluasi Tabel Kebenaran</button>
        <div id="dis-tt" class="mt-4 overflow-x-auto">${st.expr ? logicTableHTML(st.expr, st.nvars) : '<p class="text-sm text-slate-400">Tabel akan muncul di sini.</p>'}</div>`)}
      ${card('Uji Ekuivalensi Dua Ekspresi', '⇄', `
        <p class="text-xs text-slate-500 mb-3">Dua kalimat proposisional ekuivalen jika tabel kebenarannya identik. Contoh: uji hukum De Morgan ¬(p∧q) ≡ ¬p∨¬q.</p>
        <div class="grid sm:grid-cols-2 gap-3 mb-3">
          <label class="block"><span class="text-xs font-semibold text-slate-500">Ekspresi A</span>
            <input id="dis-eqa" class="${INPUT}" value="${esc(st.eqa)}" spellcheck="false" /></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">Ekspresi B</span>
            <input id="dis-eqb" class="${INPUT}" value="${esc(st.eqb)}" spellcheck="false" /></label>
        </div>
        <button type="button" data-act="dis-equiv" class="${BTN}">⇄ Periksa Ekuivalensi</button>
        <div id="dis-equiv" class="mt-4 overflow-x-auto"></div>`)}
    </div>`;

  const inpExpr = host.querySelector('#dis-logexpr');
  if (inpExpr) inpExpr.addEventListener('input', () => { st.expr = inpExpr.value; });
  const selNvar = host.querySelector('#dis-nvar');
  if (selNvar) selNvar.addEventListener('change', (e) => { st.nvars = Number(e.target.value); rerender(); });
  const btnEval = host.querySelector('[data-act="dis-eval"]');
  if (btnEval) btnEval.addEventListener('click', () => {
    host.querySelector('#dis-tt').innerHTML = logicTableHTML(st.expr, st.nvars);
    finish();
  });
  ['dis-eqa', 'dis-eqb'].forEach((id) => {
    const inp = host.querySelector('#' + id);
    if (inp) inp.addEventListener('input', () => {
      st.eqa = host.querySelector('#dis-eqa').value;
      st.eqb = host.querySelector('#dis-eqb').value;
    });
  });
  const btnEquiv = host.querySelector('[data-act="dis-equiv"]');
  if (btnEquiv) btnEquiv.addEventListener('click', () => {
    host.querySelector('#dis-equiv').innerHTML = equivHTML(st.eqa, st.eqb);
    finish();
  });
  host.addEventListener('click', (e) => {
    const b = e.target.closest('.dis-ins');
    if (!b) return;
    const inp = host.querySelector('#' + b.dataset.target);
    if (!inp) return;
    const tok = b.dataset.tok;
    const pos = inp.selectionStart ?? inp.value.length;
    const end = inp.selectionEnd ?? pos;
    inp.value = inp.value.slice(0, pos) + tok + inp.value.slice(end);
    st.expr = inp.value;
    const np = pos + tok.length;
    inp.focus();
    try { inp.setSelectionRange(np, np); } catch (_) { /* abaikan */ }
  });
}

/* =========================================================================
   TAB 2 — TEORI HIMPUNAN
   ========================================================================= */

const VENN_MODES = [
  { id: 'none', label: 'Tanpa sorot' },
  { id: 'union', label: 'A ∪ B' },
  { id: 'inter', label: 'A ∩ B' },
  { id: 'adiff', label: 'A ∖ B' },
  { id: 'bdiff', label: 'B ∖ A' },
];

function vennSvg(nAonly, nBoth, nBonly, mode) {
  const base = '#eef2ff', hi = '#a5b4fc', stroke = '#6366f1';
  const defs = `<defs>
      <clipPath id="dis-clipA"><circle cx="150" cy="130" r="85"/></clipPath>
      <mask id="dis-notB"><rect width="400" height="260" fill="white"/><circle cx="250" cy="130" r="85" fill="black"/></mask>
      <mask id="dis-notA"><rect width="400" height="260" fill="white"/><circle cx="150" cy="130" r="85" fill="black"/></mask>
    </defs>`;
  const circA = (fill, extra = '') => `<circle cx="150" cy="130" r="85" fill="${fill}" ${extra}/>`;
  const circB = (fill, extra = '') => `<circle cx="250" cy="130" r="85" fill="${fill}" ${extra}/>`;
  const outline = `<circle cx="150" cy="130" r="85" fill="none" stroke="${stroke}" stroke-width="2"/>
    <circle cx="250" cy="130" r="85" fill="none" stroke="${stroke}" stroke-width="2"/>`;
  let body;
  if (mode === 'union') body = circA(hi) + circB(hi);
  else if (mode === 'inter') body = circA(base) + circB(base) + `<circle cx="250" cy="130" r="85" fill="${hi}" clip-path="url(#dis-clipA)"/>`;
  else if (mode === 'adiff') body = circA(base) + circB(base) + circA(hi, 'mask="url(#dis-notB)"');
  else if (mode === 'bdiff') body = circA(base) + circB(base) + circB(hi, 'mask="url(#dis-notA)"');
  else body = circA(base) + circB(base);
  const lbl = (x, txt, fillT) => `<text x="${x}" y="135" text-anchor="middle" font-size="16" font-weight="700" fill="${fillT}" font-family="JetBrains Mono, monospace">${txt}</text>`;
  return `<svg viewBox="0 0 400 260" class="w-full max-w-lg mx-auto" xmlns="http://www.w3.org/2000/svg">
    ${defs}${body}${outline}
    <text x="80" y="42" text-anchor="middle" font-size="14" font-weight="700" fill="#4338ca">A</text>
    <text x="320" y="42" text-anchor="middle" font-size="14" font-weight="700" fill="#4338ca">B</text>
    ${lbl(100, String(nAonly), '#3730a3')}${lbl(200, String(nBoth), '#0f172a')}${lbl(300, String(nBonly), '#3730a3')}
  </svg>`;
}

function setOpsHTML(aStr, bStr) {
  const A = parseItems(aStr), B = parseItems(bStr);
  const Bs = new Set(B), As = new Set(A);
  const inter = A.filter((x) => Bs.has(x));
  const aOnly = A.filter((x) => !Bs.has(x));
  const bOnly = B.filter((x) => !As.has(x));
  const union = [...new Set([...A, ...B])];
  const sym = [...new Set([...aOnly, ...bOnly])];
  const mono = "font-family:'JetBrains Mono', monospace";
  const row = (tex, items) => `<tr>
    <td class="whitespace-nowrap">$${tex}$</td>
    <td style="${mono}" class="text-sm">${items.length ? esc0(items.join(', ')) : '∅'}</td>
    <td class="text-center text-xs font-bold text-indigo-700">${items.length}</td></tr>`;
  const ieOk = union.length === A.length + B.length - inter.length;
  return `
    <table class="gtable">
      <thead><tr><th>Notasi</th><th>Elemen</th><th class="text-center">Card</th></tr></thead>
      <tbody>
        ${row('A', A)}${row('B', B)}
        ${row('A \\cup B', union)}
        ${row('A \\cap B', inter)}
        ${row('A \\setminus B', aOnly)}
        ${row('B \\setminus A', bOnly)}
        ${row('A \\oplus B', sym)}
      </tbody>
    </table>
    <div class="step-box mt-3">$\\text{Inklusi-eksklusi: } |A \\cup B| = |A| + |B| - |A \\cap B| \\;\\Longrightarrow\\; ${union.length} = ${A.length} + ${B.length} - ${inter.length}$ ${ieOk ? '✓ terverifikasi' : '✗'}</div>
    ${(aOnly.length === 0 && A.length) || (bOnly.length === 0 && B.length) ? `<p class="mt-2 text-sm">${aOnly.length === 0 && A.length ? '$A \\subseteq B$' : ''} ${bOnly.length === 0 && B.length ? '$B \\subseteq A$' : ''}</p>` : ''}`;
}

function powerSetHTML(A) {
  const n = A.length;
  if (n > 10) return `<p class="text-sm text-rose-600">⚠ |A| = ${n} terlalu besar untuk ditampilkan (maks 10 elemen, karena |P(A)| = 2<sup>${n}</sup>).</p>`;
  const subs = [];
  for (let m = 0; m < (1 << n); m++) subs.push(A.filter((_, i) => (m >> i) & 1));
  const chips = subs.map((s) =>
    `<span class="inline-block px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs" style="font-family:'JetBrains Mono', monospace">{${esc0(s.join(','))}}</span>`
  ).join(' ');
  return `${chips}<p class="text-xs text-slate-500 mt-2">$|P(A)| = 2^${n} = ${subs.length}$ · jumlah subhimpunan cocok dengan 2^${n}.</p>`;
}

function tabHimpunan(host, ctx, S, rerender, finish) {
  const esc = ctx.esc || esc0;
  const st = S.himp;
  const A = parseItems(st.a), B = parseItems(st.b);
  const Bs = new Set(B), As = new Set(A);
  const counts = {
    aOnly: A.filter((x) => !Bs.has(x)).length,
    bOnly: B.filter((x) => !As.has(x)).length,
    both: A.filter((x) => Bs.has(x)).length,
  };
  host.innerHTML = `
    ${card('Operasi Dua Himpunan', '🫧', `
      <div class="grid sm:grid-cols-2 gap-3 mb-3">
        <label class="block"><span class="text-xs font-semibold text-slate-500">Himpunan A (pisahkan dengan koma, mis. 1,2,3)</span>
          <input id="dis-seta" class="${INPUT}" value="${esc(st.a)}" /></label>
        <label class="block"><span class="text-xs font-semibold text-slate-500">Himpunan B</span>
          <input id="dis-setb" class="${INPUT}" value="${esc(st.b)}" /></label>
      </div>
      <button type="button" data-act="dis-sethit" class="${BTN}">🫧 Hitung Operasi Himpunan</button>
      <div id="dis-setres" class="mt-4 overflow-x-auto">${setOpsHTML(st.a, st.b)}</div>`)}
    <div class="grid lg:grid-cols-3 gap-5 mt-5">
      ${card('Himpunan Kuasa P(A)', '⚡', `<div id="dis-pow" class="max-h-72 overflow-y-auto pr-1">${powerSetHTML(A)}</div>`)}
      ${card('Diagram Venn Interaktif', '🔷', `
        <div id="dis-venn">${vennSvg(counts.aOnly, counts.both, counts.bOnly, st.venn)}</div>
        <div class="flex flex-wrap gap-1 mt-2">${VENN_MODES.map((m) =>
          `<button type="button" class="dis-vennbtn px-2.5 py-1 rounded-full text-xs font-semibold border ${st.venn === m.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}" data-venn="${m.id}">${m.label}</button>`).join('')}</div>`)}
      ${card('Legenda Notasi', '📖', `
        <div class="space-y-2 text-sm text-slate-700">
          <div>$A \\cup B$ — gabungan</div>
          <div>$A \\cap B$ — irisan</div>
          <div>$A \\setminus B$ — selisih A dikurangi B</div>
          <div>$A \\oplus B$ — beda simetris</div>
          <div>$|P(A)| = 2^n$ — kardinalitas himpunan kuasa</div>
          <div>$|A \\cup B| = |A| + |B| - |A \\cap B|$ — prinsip inklusi-eksklusi</div>
          <div>$\\varnothing$ — himpunan kosong</div>
        </div>`)}
    </div>`;

  ['dis-seta', 'dis-setb'].forEach((id) => {
    const inp = host.querySelector('#' + id);
    if (inp) inp.addEventListener('input', () => {
      st.a = host.querySelector('#dis-seta').value;
      st.b = host.querySelector('#dis-setb').value;
    });
  });
  const btnHit = host.querySelector('[data-act="dis-sethit"]');
  if (btnHit) btnHit.addEventListener('click', () => {
    host.querySelector('#dis-setres').innerHTML = setOpsHTML(st.a, st.b);
    finish();
  });
  host.querySelectorAll('.dis-vennbtn').forEach((btn) => btn.addEventListener('click', () => {
    st.venn = btn.dataset.venn;
    rerender();
  }));
}

/* =========================================================================
   TAB 3 — RELASI & FUNGSI
   ========================================================================= */

function parsePairsText(text) {
  const pairs = [];
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trim().replace(/[,;]+$/, '').trim();
    if (!line) continue;
    const m = line.match(/^[\(\[]?\s*([^\s,()\[\]]+)\s*[,;\s]\s*([^\s,()\[\]]+)\s*[\)\]]?$/);
    if (!m) return { error: `Baris tidak terbaca: "${line.slice(0, 40)}" — gunakan format (a,b)` };
    pairs.push([m[1], m[2]]);
  }
  return { pairs };
}

function relSvg(A, B, pairs) {
  const W = 460;
  const maxN = Math.max(A.length || 1, B.length || 1, 1);
  const H = Math.max(200, 60 * maxN + 30);
  const colA = 90, colB = W - 90;
  const yFor = (i, n) => (n === 1 ? H / 2 : 35 + (H - 70) * (i / (n - 1)));
  const defs = `<defs><marker id="dis-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="#6366f1"/></marker></defs>`;
  let edges = '';
  for (const [a, b] of pairs) {
    const ia = A.indexOf(a), ib = B.indexOf(b);
    if (ia < 0 || ib < 0) continue;
    const x1 = colA + 22, x2 = colB - 24, y1 = yFor(ia, A.length || 1), y2 = yFor(ib, B.length || 1);
    edges += `<line x1="${x1}" y1="${y1.toFixed(1)}" x2="${x2}" y2="${y2.toFixed(1)}" stroke="#6366f1" stroke-width="1.5" marker-end="url(#dis-arr)"/>`;
  }
  const node = (x, i, n, label) => {
    const y = yFor(i, n || 1);
    return `<circle cx="${x}" cy="${y.toFixed(1)}" r="20" fill="#eef2ff" stroke="#6366f1" stroke-width="2"/>
      <text x="${x}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="#3730a3">${esc0(label)}</text>`;
  };
  let nodes = '';
  A.forEach((a, i) => { nodes += node(colA, i, A.length, a); });
  B.forEach((b, i) => { nodes += node(colB, i, B.length, b); });
  return `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" class="w-full max-w-xl mx-auto" xmlns="http://www.w3.org/2000/svg">${defs}${edges}${nodes}</svg>`;
}

function relResultsHTML(st) {
  const A = parseItems(st.a), B = parseItems(st.b);
  const pp = parsePairsText(st.pairs);
  if (pp.error) return errHtml(pp.error);
  const pairs = pp.pairs;
  const asSet = new Set(A), bsSet = new Set(B);
  const outside = pairs.filter(([x, y]) => !asSet.has(x) || !bsSet.has(y));
  const domain = [], range = [];
  for (const [x, y] of pairs) {
    if (!domain.includes(x)) domain.push(x);
    if (!range.includes(y)) range.push(y);
  }
  const perA = new Map();
  for (const [x] of pairs) perA.set(x, (perA.get(x) || 0) + 1);
  const dupA = [...perA.entries()].filter(([, c]) => c > 1).map(([a]) => a);
  const unmapped = A.filter((a) => !perA.has(a));
  const isFunc = pairs.length > 0 && dupA.length === 0 && unmapped.length === 0;
  const isInjective = isFunc && range.length === pairs.length;
  const rangeSet = new Set(range);
  const isSurjective = isFunc && B.every((b) => rangeSet.has(b));
  const chip = (ok, label) => `<span class="px-2.5 py-1 rounded-full text-xs font-bold ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${ok ? '✓' : '✗'} ${label}</span>`;
  const sameSet = A.length === B.length && A.length > 0 && A.every((x) => bsSet.has(x)) && B.every((x) => asSet.has(x));

  let propsHtml = '';
  if (sameSet) {
    const reflexMiss = A.filter((a) => !pairs.some(([x, y]) => x === a && y === a));
    const symViol = [];
    for (const [x, y] of pairs) {
      if (!pairs.some(([p, q]) => p === y && q === x) && !symViol.some(([p, q]) => p === x && q === y)) symViol.push([x, y]);
    }
    const transViol = [];
    for (const [a, b] of pairs) for (const [b2, c] of pairs) {
      if (b !== b2) continue;
      if (pairs.some(([p, q]) => p === a && q === c)) continue;
      if (transViol.some((t) => t.miss === `${a},${c}`)) continue;
      transViol.push({ miss: `${a},${c}`, why: `${a},${b} dan ${b},${c}` });
    }
    const list = (arr) => arr.slice(0, 8).map((t) => `<span class="font-mono">${esc0(typeof t === 'string' ? t : t.join(' · '))}</span>`).join(', ') + (arr.length > 8 ? ' …' : '') || '—';
    propsHtml = `<div class="mt-4"><p class="text-xs font-semibold text-slate-500 mb-1">Sifat relasi (karena A = B)</p>
      <div class="step-box">
        <p>Refleksif: <b>${reflexMiss.length === 0 ? 'YA ✓' : 'TIDAK ✗'}</b>${reflexMiss.length ? ` — pasangan hilang: ${list(reflexMiss.map((a) => `(${a},${a})`))}` : ''}</p>
        <p>Simetris: <b>${symViol.length === 0 ? 'YA ✓' : 'TIDAK ✗'}</b>${symViol.length ? ` — dilanggar oleh: ${list(symViol.map((t) => `(${t[0]},${t[1]})`))}` : ''}</p>
        <p>Transitif: <b>${transViol.length === 0 ? 'YA ✓' : 'TIDAK ✗'}</b>${transViol.length ? ` — dilanggar oleh: ${transViol.slice(0, 8).map((t) => `<span class="font-mono">(${esc0(t.miss)}) hilang karena (${esc0(t.why)})</span>`).join(', ')}${transViol.length > 8 ? ' …' : ''}` : ''}</p>
      </div></div>`;
  }

  return `
    ${outside.length ? `<p class="mb-2 text-xs text-amber-600">⚠ ${outside.length} pasangan di luar A × B tetap digambar: ${esc0(outside.map((p) => `(${p[0]},${p[1]})`).join(' '))}</p>` : ''}
    <div class="flex flex-wrap gap-2 mb-3">
      ${chip(isFunc, isFunc ? 'Fungsi' : 'Bukan fungsi')}
      ${chip(isInjective, 'Injektif')}
      ${chip(isSurjective, 'Surjektif')}
      ${chip(isInjective && isSurjective, 'Bijektif')}
    </div>
    <table class="gtable mb-3">
      <tbody>
        <tr><th>Domain</th><td style="font-family:'JetBrains Mono',monospace">${esc0(domain.join(', ') || '∅')}</td></tr>
        <tr><th>Kodomain (B)</th><td style="font-family:'JetBrains Mono',monospace">${esc0(B.join(', ') || '∅')}</td></tr>
        <tr><th>Range (image)</th><td style="font-family:'JetBrains Mono',monospace">${esc0(range.join(', ') || '∅')}</td></tr>
      </tbody>
    </table>
    <div class="step-box">
      <p>Setiap elemen A terpetakan paling banyak sekali: <b>${dupA.length === 0 ? 'YA' : `TIDAK (${esc0(dupA.join(', '))} dipetakan ganda)`}</b></p>
      <p>Cakupan domain A: <b>${unmapped.length === 0 ? `${esc0(A.join(', '))} semua terpetakan` : `belum terpetakan: ${esc0(unmapped.join(', '))}`}</b></p>
      ${isFunc ? `<p>R(p) untuk tiap p: <span style="font-family:'JetBrains Mono',monospace">${esc0(domain.map((a) => `${a}↦${pairs.find((pr) => pr[0] === a)[1]}`).join('  ·  '))}</span></p>` : ''}
    </div>
    <div class="mt-3">
      <p class="text-xs font-semibold text-slate-500 mb-1">Relasi invers R⁻¹ (komponen ditukar)</p>
      <div class="flex flex-wrap gap-1">${pairs.length ? pairs.map((p) => `<span class="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono">(${esc0(p[1])},${esc0(p[0])})</span>`).join('') : '<span class="text-sm text-slate-400">—</span>'}</div>
    </div>
    ${propsHtml}`;
}

function tabRelasi(host, ctx, S, rerender, finish) {
  const esc = ctx.esc || esc0;
  const st = S.relasi;
  const A = parseItems(st.a), B = parseItems(st.b);
  const pp = parsePairsText(st.pairs);
  host.innerHTML = `
    ${card('Editor Relasi A × B', '↔️', `
      <div class="grid sm:grid-cols-2 gap-3 mb-3">
        <label class="block"><span class="text-xs font-semibold text-slate-500">Himpunan A</span><input id="dis-rela" class="${INPUT}" value="${esc(st.a)}" /></label>
        <label class="block"><span class="text-xs font-semibold text-slate-500">Himpunan B (kodomain)</span><input id="dis-relb" class="${INPUT}" value="${esc(st.b)}" /></label>
      </div>
      <label class="block mb-2"><span class="text-xs font-semibold text-slate-500">Pasangan terurut — satu pasangan per baris, format (a,b)</span>
        <textarea id="dis-relp" class="${INPUT} font-mono" rows="5" spellcheck="false">${esc(st.pairs)}</textarea></label>
      <button type="button" data-act="dis-relgo" class="${BTN}">↔️ Analisis Relasi</button>`)}
    <div class="grid lg:grid-cols-2 gap-5 mt-5">
      ${card('Diagram Panah (SVG)', '🕸️', `<div>${pp.error ? errHtml(pp.error) : relSvg(A, B, pp.pairs)}</div>`)}
      ${card('Hasil Analisis', '📊', `<div id="dis-relres" class="overflow-x-auto">${pp.error ? '' : relResultsHTML(st)}</div>`)}
    </div>`;

  ['dis-rela', 'dis-relb', 'dis-relp'].forEach((id) => {
    const inp = host.querySelector('#' + id);
    if (inp) inp.addEventListener('input', () => {
      st.a = host.querySelector('#dis-rela').value;
      st.b = host.querySelector('#dis-relb').value;
      st.pairs = host.querySelector('#dis-relp').value;
    });
  });
  const btn = host.querySelector('[data-act="dis-relgo"]');
  if (btn) btn.addEventListener('click', () => {
    const res = relResultsHTML(st);
    host.querySelector('#dis-relres').innerHTML = res;
    finish();
  });
}

/* =========================================================================
   TAB 4 — ALJABAR BOOLEAN (Quine–McCluskey + K-map + De Morgan NNF)
   ========================================================================= */

function qmc(minterms) {
  let current = minterms.map((v) => ({ mask: 0, val: v }));
  const primes = [];
  const havePrime = new Set();
  let guard = 0;
  while (current.length && guard++ < 24) {
    const used = new Array(current.length).fill(false);
    const next = [];
    const seen = new Set();
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const a = current[i], b = current[j];
        if (a.mask !== b.mask) continue;
        const d = a.val ^ b.val;
        if (d !== 0 && (d & (d - 1)) === 0) {
          used[i] = used[j] = true;
          const mask = a.mask | d, val = a.val & ~d;
          const key = mask + ':' + val;
          if (!seen.has(key)) { seen.add(key); next.push({ mask, val }); }
        }
      }
    }
    current.forEach((im, idx) => {
      if (!used[idx]) {
        const key = im.mask + ':' + im.val;
        if (!havePrime.has(key)) { havePrime.add(key); primes.push(im); }
      }
    });
    current = next;
  }
  return primes;
}

function implicantCovers(im) {
  const free = [];
  for (let b = 8; b >= 1; b >>= 1) if (!(im.mask & b)) free.push(b);
  const out = [];
  const total = 1 << free.length;
  for (let c = 0; c < total; c++) {
    let m = im.val;
    free.forEach((b, k) => { if ((c >> (free.length - 1 - k)) & 1) m |= b; });
    if (m >= 0 && m <= 15) out.push(m);
  }
  return [...new Set(out)];
}

function implicantTerm(im) {
  let parts = '';
  for (const [b, name] of [[8, 'w'], [4, 'x'], [2, 'y'], [1, 'z']]) {
    if (im.mask & b) continue;
    parts += ((im.val & b) ? '' : '¬') + name;
  }
  return parts || '1';
}

function minimalCover(primes, minterms) {
  const msSet = new Set(minterms);
  const cov = primes.map((im) => ({ im, covers: implicantCovers(im).filter((m) => msSet.has(m)) }));
  const need = new Set(minterms);
  const chosen = [];
  for (const m of minterms) {
    const hits = cov.filter((c) => c.covers.includes(m));
    if (hits.length === 1 && !chosen.includes(hits[0])) chosen.push(hits[0]);
  }
  chosen.forEach((c) => c.covers.forEach((m) => need.delete(m)));
  while (need.size) {
    let best = null, bestN = -1;
    for (const c of cov) {
      if (chosen.includes(c)) continue;
      const n = c.covers.filter((m) => need.has(m)).length;
      if (n > bestN) { bestN = n; best = c; }
    }
    if (!best || bestN === 0) break;
    chosen.push(best);
    best.covers.forEach((m) => need.delete(m));
  }
  return chosen.map((c) => c.im);
}

function canonicalSOP(ms) {
  return ms.map((m) => [[8, 'w'], [4, 'x'], [2, 'y'], [1, 'z']]
    .map(([b, name]) => ((m & b) ? '' : '¬') + name).join('')).join(' ∨ ');
}

function boolMinimizeHTML(raw) {
  const seen = new Set();
  const ms = [];
  for (const n of parseNumList(raw)) {
    if (n < 0 || n > 15 || !Number.isInteger(n) || seen.has(n)) continue;
    seen.add(n);
    ms.push(n);
  }
  ms.sort((a, b) => a - b);
  if (!ms.length) return errHtml('Masukkan minimal satu minterm (bilangan 0–15).');
  if (ms.length === 16) return '<p class="text-sm font-semibold">f = 1 (semua minterm aktif).</p>';
  const termBits = (m) => `${(m >> 3) & 1}${(m >> 2) & 1}${(m >> 1) & 1}${m & 1}`;
  let tt = '';
  for (let m = 0; m < 16; m++) {
    const on = seen.has(m);
    tt += `<tr><td class="text-center">${m}</td><td class="text-center">${termBits(m)}</td><td class="text-center">${on ? '1' : '0'}</td></tr>`;
  }
  const primes = qmc(ms);
  const chosen = minimalCover(primes, ms);
  const sop = chosen.map(implicantTerm).join(' ∨ ');
  const gray = [0, 1, 3, 2];
  const colors = ['#bbf7d0', '#bfdbfe', '#fde68a', '#fecaca', '#ddd6fe', '#a7f3d0', '#fbcfe8', '#bae6fd'];
  const cellColor = new Array(16).fill(null);
  chosen.forEach((im, k) => {
    for (const m of implicantCovers(im)) if (ms.includes(m) && cellColor[m] === null) cellColor[m] = colors[k % colors.length];
  });
  const head = '<tr><th class="text-center">w\\yz</th>' + gray.map((c) => `<th class="text-center">${(c >> 1) & 1}${c & 1}</th>`).join('') + '</tr>';
  const kmRows = gray.map((rc) => {
    const w = (rc >> 1) & 1, x = rc & 1;
    let r = `<tr><th class="text-center">${w}${x}</th>`;
    for (const cc of gray) {
      const y = (cc >> 1) & 1, z = cc & 1;
      const m = w * 8 + x * 4 + y * 2 + z;
      r += `<td class="text-center" style="background:${cellColor[m] || 'transparent'};font-family:'JetBrains Mono',monospace">${seen.has(m) ? 1 : 0}</td>`;
    }
    return r + '</tr>';
  }).join('');
  const legend = chosen.map((im, k) =>
    `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"><span class="w-3 h-3 rounded" style="background:${colors[k % colors.length]}"></span><span class="font-mono">${esc0(implicantTerm(im))}</span><span class="text-slate-400">(${implicantCovers(im).filter((m) => ms.includes(m)).length} minterm)</span></span>`
  ).join(' ');
  return `
    <div class="grid md:grid-cols-2 gap-5">
      <div>
        <p class="text-xs font-semibold text-slate-500 mb-1">Tabel kebenaran f(w,x,y,z), 1 untuk minterm</p>
        <table class="gtable truth-table max-h-60 overflow-y-auto block"><thead><tr><th class="text-center">m</th><th class="text-center">wxyz</th><th class="text-center">f</th></tr></thead><tbody>${tt}</tbody></table>
        <div class="step-box mt-3"><p>SOP kanonik (bentuk baku): <b>${esc0(canonicalSOP(ms))}</b></p><p>$f(w,x,y,z) = \\sum m(${esc0(ms.join(', '))})$</p></div>
      </div>
      <div>
        <p class="text-xs font-semibold text-slate-500 mb-1">Peta Karnaugh 4×4 (urutan Gray)</p>
        <table class="gtable">${head}${kmRows}</table>
        <p class="text-xs font-semibold text-slate-500 mt-3 mb-1">Grup implikan primitif terpilih</p>
        <div class="flex flex-wrap gap-1.5">${legend}</div>
        <div class="mt-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200">
          <p class="text-xs font-semibold text-indigo-500 mb-1">SOP MINIMAL</p>
          <p class="font-mono text-lg font-bold text-indigo-800 break-all">${esc0(sop)}</p>
        </div>
      </div>
    </div>`;
}

/* ---- Ekspander De Morgan (NNF) ---- */

const DM_PREC = { '∧': 2, '∨': 1 };

function dmTokenize(src) {
  const s = String(src).replace(/[~!]/g, '¬').replace(/&&/g, '∧').replace(/[&.]/g, '∧').replace(/\|\|/g, '∨').replace(/[|]/g, '∨');
  const tokens = [];
  for (const ch of s) {
    if (/\s/.test(ch)) continue;
    if (/[A-Za-z]/.test(ch)) { tokens.push({ t: 'var', v: ch.toUpperCase() }); continue; }
    if ('¬∧∨()'.includes(ch)) { tokens.push({ t: ch }); continue; }
    throw new Error('Karakter tidak dikenal: "' + ch + '"');
  }
  if (!tokens.length) throw new Error('Ekspresi kosong');
  return tokens;
}

function dmParse(tokens) {
  let i = 0;
  const peek = () => tokens[i];
  function orl() {
    const l = andl();
    if (peek() && peek().t === '∨') { i++; const r = orl(); return { op: '∨', l, r }; }
    return l;
  }
  function andl() {
    const l = notl();
    if (peek() && peek().t === '∧') { i++; const r = andl(); return { op: '∧', l, r }; }
    return l;
  }
  function notl() {
    if (peek() && peek().t === '¬') { i++; return { op: '¬', a: notl() }; }
    const tk = peek();
    if (!tk) throw new Error('Ekspresi tidak lengkap');
    if (tk.t === 'var') { i++; return { v: tk.v }; }
    if (tk.t === '(') { i++; const e = orl(); if (!peek() || peek().t !== ')') throw new Error('Kurung tutup ")" hilang'); i++; return e; }
    throw new Error('Token tak terduga: "' + tk.t + '"');
  }
  const ast = orl();
  if (i < tokens.length) throw new Error('Token berlebih: "' + tokens[i].t + '"');
  return ast;
}

function dmStringify(node) {
  if (node.v) return node.v;
  if (node.op === '¬') return node.a.v ? '¬' + node.a.v : '¬(' + dmStringify(node.a) + ')';
  const side = (c) => {
    if (c.v) return dmStringify(c);
    if (c.op === '¬') return dmStringify(c);
    return c.op === node.op ? dmStringify(c) : '(' + dmStringify(c) + ')';
  };
  return side(node.l) + node.op + side(node.r);
}

function dmWrap(node) {
  const s = dmStringify(node);
  if (node.v) return s;
  return node.op === '¬' ? s : '(' + s + ')';
}

function dmNNF(node, neg, rules) {
  if (node.v) return neg ? { op: '¬', a: { v: node.v } } : { v: node.v };
  if (node.op === '¬') {
    const c = node.a;
    if (c.op === '¬') {
      const inner = c.a.v ? c.a.v : '(' + dmStringify(c.a) + ')';
      rules.push({ rule: 'Negasi ganda ¬¬X ⇒ X', from: '¬¬' + inner, to: inner });
      return dmNNF(c.a, neg, rules);
    }
    return dmNNF(c, !neg, rules);
  }
  if (!neg) return { op: node.op, l: dmNNF(node.l, false, rules), r: dmNNF(node.r, false, rules) };
  const flip = node.op === '∧' ? '∨' : '∧';
  const entry = {
    rule: node.op === '∧' ? 'De Morgan ¬(X∧Y) ⇒ ¬X∨¬Y' : 'De Morgan ¬(X∨Y) ⇒ ¬X∧¬Y',
    from: '¬(' + dmStringify(node.l) + node.op + dmStringify(node.r) + ')',
    to: '',
  };
  rules.push(entry);
  const l = dmNNF(node.l, true, rules);
  const r = dmNNF(node.r, true, rules);
  entry.to = dmWrap(l) + ' ' + flip + ' ' + dmWrap(r);
  return { op: flip, l, r };
}

function expandDeMorganHTML(raw) {
  try {
    const ast = dmParse(dmTokenize(raw));
    const beforeS = dmStringify(ast);
    const rules = [];
    const after = dmNNF(ast, false, rules);
    const afterS = dmStringify(after);
    const ruleRows = rules.length
      ? rules.map((r, i) =>
        `<li class="flex flex-wrap gap-2"><span class="text-indigo-600 font-bold">${i + 1}.</span><span class="font-mono">${esc0(r.from)}</span><span class="text-indigo-500">⇒</span><span class="font-mono">${esc0(r.to)}</span><span class="text-slate-400 text-xs">(${esc0(r.rule)})</span></li>`).join('')
      : '<li class="text-slate-500">Tidak ada negasi yang perlu didorong ke dalam — sudah berupa NNF.</li>';
    return `
      <ol class="space-y-1.5 text-sm">${ruleRows}</ol>
      <div class="grid sm:grid-cols-2 gap-3 mt-3">
        <div><p class="text-xs font-semibold text-slate-500 mb-1">Sebelum</p><div class="step-box">${esc0(beforeS)}</div></div>
        <div><p class="text-xs font-semibold text-slate-500 mb-1">Sesudah (Negasi Normatif / NNF)</p><div class="step-box font-bold">${esc0(afterS)}</div></div>
      </div>`;
  } catch (e) {
    return errHtml(e.message || e);
  }
}

function tabBoolean(host, ctx, S, rerender, finish) {
  const esc = ctx.esc || esc0;
  const st = S.bool;
  host.innerHTML = `
    <div class="grid lg:grid-cols-2 gap-5">
      ${card('Minimisasi Boolean — Quine–McCluskey & Peta Karnaugh', '🟦', `
        <label class="block mb-2"><span class="text-xs font-semibold text-slate-500">Minterm (0–15, koma) — variabel w x y z, w = bit tertinggi</span>
          <input id="dis-bmint" class="${INPUT}" value="${esc(st.minterms)}" /></label>
        <button type="button" data-act="dis-bmin" class="${BTN}">🟦 Minimalkan</button>
        <div id="dis-bres" class="mt-4">${boolMinimizeHTML(st.minterms)}</div>`)}
      ${card('Ekspander De Morgan (push-down negasi rekursif)', '🔻', `
        <label class="block mb-2"><span class="text-xs font-semibold text-slate-500">Ekspresi (¬, ∧, ∨, kurung; variabel satu huruf, nesting bebas)</span>
          <input id="dis-bdm" class="${INPUT}" value="${esc(st.dm)}" spellcheck="false" /></label>
        <p class="text-xs text-slate-500 mb-3">Contoh: ¬(A∧(B∨¬C)) → ¬A ∨ (¬B∧C). Bisa juga ! &amp; | untuk ¬ ∧ ∨.</p>
        <button type="button" data-act="dis-bdmgo" class="${BTN}">🔻 Perluas De Morgan</button>
        <div id="dis-bdmres" class="mt-4">${st.dm ? expandDeMorganHTML(st.dm) : ''}</div>`)}
    </div>`;

  const i1 = host.querySelector('#dis-bmint');
  if (i1) i1.addEventListener('input', () => { st.minterms = i1.value; });
  const b1 = host.querySelector('[data-act="dis-bmin"]');
  if (b1) b1.addEventListener('click', () => { host.querySelector('#dis-bres').innerHTML = boolMinimizeHTML(st.minterms); finish(); });
  const i2 = host.querySelector('#dis-bdm');
  if (i2) i2.addEventListener('input', () => { st.dm = i2.value; });
  const b2 = host.querySelector('[data-act="dis-bdmgo"]');
  if (b2) b2.addEventListener('click', () => { host.querySelector('#dis-bdmres').innerHTML = expandDeMorganHTML(st.dm); finish(); });
}

/* =========================================================================
   TAB 5 — KOMBINATORIKA & PROBABILITAS
   ========================================================================= */

function bigStat(title, val, sub, ok = true) {
  return `<div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
    <p class="text-[10px] uppercase tracking-wide text-slate-500 font-bold">${title}</p>
    <p class="text-xl font-extrabold text-indigo-700 break-all" style="font-family:'JetBrains Mono',monospace">${val !== null ? val : 'terlalu besar'}</p>
    <p class="text-[11px] text-slate-500 mt-0.5">${sub}</p></div>`;
}

function kombHTML(n, r) {
  const int = Number.isInteger(n) && Number.isInteger(r);
  const nF = int ? factorial(n) : null, nFvalid = nF !== null;
  const chain = int ? factorialChainStr(n) : null;
  const p = int ? permCap(n, r) : null;
  const c = int ? binom(n, r) : null;
  const cr = int ? binom(n + r - 1, r) : null;
  const dn = int && n <= 10 ? derangementDP(n) : null;
  return `
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
      ${bigStat('n!', nFvalid ? fmtNum(nF) : null, int ? `faktorial ${esc0(String(n))}` : 'masukkan bulat ≥ 0')}
      ${bigStat('P(n,r)', p !== null ? p : null, `n!/(n−r)! = ${n}|${r}`)}
      ${bigStat('C(n,r)', c !== null ? c : null, `n!/(r!(n−r)!) = ${n}|${r}`)}
      ${bigStat('C(n+r−1, r)', cr !== null ? cr : null, 'kombinasi dengan pengulangan')}
      ${bigStat('!' + esc0(String(n)), dn !== null ? fmtNum(dn) : null, 'derangement (n ≤ 10)')}
      ${bigStat('n·r', int ? n * r : null, 'kontrol sederhana')}
    </div>
    ${int && nFvalid ? `<div class="step-box">${esc0(chain)} — dengan prinsip: langkah = ${n}, pilihan ${esc0(String(n))}↓.</div>` : ''}
    <div class="step-box mt-2">
      $P(n,r) = \\frac{n!}{(n-r)!} = ${p !== null ? p : '—'}$ · $C(n,r) = \\frac{n!}{r!\\,(n-r)!} = ${c !== null ? c : '—'}$ · $\\left(^{n+r-1}_{r}\\right) = \\binom{n+r-1}{r} = ${cr !== null ? cr : '—'}$<br/>
      ${dn !== null ? `!n = (n-1)·[!(n-1)+!(n-2)] → !${n} = ${dn}` : (int && n > 10 ? '!n ditampilkan hanya untuk n ≤ 10.' : '')}
    </div>`;
}

function probHTML(m, n) {
  if (!Number.isInteger(m) || !Number.isInteger(n) || n < 1 || m < 0 || m > n) {
    return errHtml('Syarat: 0 ≤ m ≤ n, n ≥ 1 (m = kasus menguntungkan, n = seluruh kasus).');
  }
  const g = gcd(m, n) || 1;
  const p = m / n;
  return `
    <div class="step-box">
      $P(E) = \\frac{m}{n} = \\frac{${m}}{${n}} = \\frac{${m / g}}{${n / g}} = ${fmtNum(p)}$
    </div>
    <div class="mt-3 grid grid-cols-3 gap-2">
      ${bigStat('P(E)', fmtNum(p), `${m}/${n} = ${(p * 100).toFixed(2)}%`)}
      ${bigStat('Persentase', (p * 100).toFixed(2) + '%', 'kasus menguntungkan')}
      ${bigStat('P(Eᶜ)', fmtNum(1 - p), '1 − P(E), pelengkap')}
    </div>
    <div class="step-box mt-2">$P(E^{c}) = 1 - P(E) = 1 - \\frac{${m / g}}{${n / g}} = \\frac{${n / g - m / g}}{${n / g}} = ${fmtNum(1 - p)}$</div>`;
}

function tabKombinatorika(host, ctx, S, rerender, finish) {
  const esc = ctx.esc || esc0;
  const st = S.komb;
  host.innerHTML = `
    <div class="grid lg:grid-cols-2 gap-5">
      ${card('Permutasi, Kombinasi & Derangement', '🎲', `
        <div class="grid grid-cols-2 gap-3 mb-3">
          <label class="block"><span class="text-xs font-semibold text-slate-500">n (banyak objek)</span>
            <input id="dis-kn" type="number" min="0" step="1" class="${INPUT}" value="${esc(String(st.n))}" /></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">r (banyak dipilih)</span>
            <input id="dis-kr" type="number" min="0" step="1" class="${INPUT}" value="${esc(String(st.r))}" /></label>
        </div>
        <button type="button" data-act="dis-kgo" class="${BTN}">🎲 Hitung</button>
        <div id="dis-kres" class="mt-4">${kombHTML(st.n, st.r)}</div>`)}
      ${card('Peluang Dasar', '🎯', `
        <div class="grid grid-cols-2 gap-3 mb-3">
          <label class="block"><span class="text-xs font-semibold text-slate-500">m — banyak kasus menguntungkan</span>
            <input id="dis-km" type="number" min="0" step="1" class="${INPUT}" value="${esc(String(st.m))}" /></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">n — banyak seluruh kasus</span>
            <input id="dis-knt" type="number" min="1" step="1" class="${INPUT}" value="${esc(String(st.total))}" /></label>
        </div>
        <button type="button" data-act="dis-kprob" class="${BTN}">🎯 Hitung Peluang</button>
        <div id="dis-kprobres" class="mt-4">${probHTML(st.m, st.total)}</div>`)}
    </div>`;

  const readK = () => {
    st.n = parseInt(host.querySelector('#dis-kn').value, 10);
    st.r = parseInt(host.querySelector('#dis-kr').value, 10);
  };
  const btnK = host.querySelector('[data-act="dis-kgo"]');
  if (btnK) btnK.addEventListener('click', () => {
    readK();
    host.querySelector('#dis-kres').innerHTML = kombHTML(st.n, st.r);
    finish();
  });
  const btnP = host.querySelector('[data-act="dis-kprob"]');
  if (btnP) btnP.addEventListener('click', () => {
    st.m = parseInt(host.querySelector('#dis-km').value, 10);
    st.total = parseInt(host.querySelector('#dis-knt').value, 10);
    host.querySelector('#dis-kprobres').innerHTML = probHTML(st.m, st.total);
    finish();
  });
}

/* =========================================================================
   TAB 6 — TEORI GRAF (BFS/DFS visualizer)
   ========================================================================= */

let grafTimer = null;
let grafAnimSeq = 0;

function grafParse(st) {
  const verts = parseItems(st.verts);
  const vset = new Set(verts);
  const edges = [];
  for (const raw of String(st.edges ?? '').split('\n')) {
    const parts = raw.trim().split('-').map((s) => s.trim()).filter(Boolean);
    if (parts.length !== 2) continue;
    const [u, v] = parts;
    if (!vset.has(u)) { vset.add(u); verts.push(u); }
    if (!vset.has(v)) { vset.add(v); verts.push(v); }
    edges.push([u, v]);
  }
  const adj = new Map();
  verts.forEach((v) => adj.set(v, []));
  for (const [u, v] of edges) {
    if (u === v) { if (!adj.get(u).includes(u)) adj.get(u).push(u); continue; }
    if (!adj.get(u).includes(v)) { adj.get(u).push(v); adj.get(v).push(u); }
  }
  adj.forEach((lst) => lst.sort((a, b) => verts.indexOf(a) - verts.indexOf(b)));
  return { verts, edges, adj };
}

function bfsSteps(adj, start) {
  const steps = [];
  const visited = new Set([start]);
  const Q = [start];
  steps.push({ node: start, desc: `Mulai: ${start} masuk antrean`, struct: [...Q], visited: new Set(visited) });
  while (Q.length) {
    const u = Q.shift();
    if (!visited.has(u)) { visited.add(u); }
    steps.push({ node: u, desc: `Kunjungi simpul ${u}`, struct: [...Q], visited: new Set(visited) });
    for (const v of adj.get(u) || []) {
      if (v === u) continue;
      if (!visited.has(v)) { visited.add(v); Q.push(v); steps.push({ node: v, desc: `${v} masuk antrean`, struct: [...Q], visited: new Set(visited) }); }
    }
  }
  return steps;
}

function dfsSteps(adj, start) {
  const steps = [];
  const visited = new Set();
  const st = [start];
  steps.push({ node: start, desc: `Mulai: tumpukan berisi ${start}`, struct: [...st], visited: new Set() });
  while (st.length) {
    const u = st.pop();
    if (visited.has(u)) continue;
    visited.add(u);
    steps.push({ node: u, desc: `Kunjungi simpul ${u}`, struct: [...st], visited: new Set(visited) });
    for (const v of (adj.get(u) || []).slice().reverse()) {
      if (v === u) continue;
      if (!visited.has(v)) { st.push(v); steps.push({ node: v, desc: `${v} didorong ke tumpukan`, struct: [...st], visited: new Set(visited) }); }
    }
  }
  return steps;
}

function grafSvg(verts, edges, state, ordMap) {
  if (!verts.length) return '<p class="text-sm text-slate-400 text-center py-8">Belum ada simpul — tambahkan simpul terlebih dahulu.</p>';
  const n = verts.length;
  const cx = 210, cy = 155;
  const R = Math.min(125, Math.max(55, 26 + 13 * n));
  const pos = new Map();
  verts.forEach((v, i) => {
    const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
    pos.set(v, [cx + R * Math.cos(ang), cy + R * Math.sin(ang)]);
  });
  const lines = edges.map(([u, v]) => {
    const p1 = pos.get(u), p2 = pos.get(v);
    return `<line x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}" stroke="#cbd5e1" stroke-width="2"/>`;
  }).join('');
  const nodes = verts.map((v) => {
    const [x, y] = pos.get(v);
    const st0 = state || {};
    const isVis = st0.visited && st0.visited.has(v);
    const isFront = st0.frontier && !isVis && st0.frontier.has(v);
    const isCur = st0.current === v;
    const fill = isCur ? '#312e81' : isVis ? '#4f46e5' : isFront ? '#fbbf24' : '#eef2ff';
    const txt = isVis ? '#ffffff' : '#3730a3';
    const ring = isCur ? 'stroke="#1e1b4b" stroke-width="3.5"' : 'stroke="#a5b4fc" stroke-width="2"';
    const ord = ordMap && ordMap.get(v);
    const ordSvg = ord ? `<g><circle cx="${(x + 16).toFixed(1)}" cy="${(y - 16).toFixed(1)}" r="9" fill="#059669"/><text x="${(x + 16).toFixed(1)}" y="${(y - 12.8).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="700" fill="#ffffff">${ord}</text></g>` : '';
    return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="22" fill="${fill}" ${ring}/>
      <text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="${txt}" font-family="JetBrains Mono">${esc0(v)}</text>${ordSvg}</g>`;
  }).join('');
  return `<svg viewBox="0 0 420 310" class="w-full max-w-xl mx-auto" xmlns="http://www.w3.org/2000/svg">${lines}${nodes}</svg>`;
}

function graphHasCycle(verts, adj) {
  const visited = new Set();
  for (const s of verts) {
    if (visited.has(s)) continue;
    const stack = [[s, null]];
    while (stack.length) {
      const [u, parent] = stack.pop();
      if (visited.has(u)) continue;
      visited.add(u);
      for (const v of adj.get(u) || []) {
        if (v === parent) continue;
        if (v === u || visited.has(v)) return true;
        stack.push([v, u]);
      }
    }
  }
  return false;
}

function grafPropsHTML(parsed) {
  const { verts, edges, adj } = parsed;
  if (!verts.length) return '<p class="text-sm text-slate-400">—</p>';
  const degSeq = verts.map((v) => (adj.get(v) || []).length).sort((a, b) => b - a);
  const degStr = '[' + degSeq.join(', ') + ']';
  const seen = new Set([verts[0]]);
  const Q = [verts[0]];
  while (Q.length) {
    const u = Q.shift();
    for (const v of adj.get(u) || []) if (!seen.has(v)) { seen.add(v); Q.push(v); }
  }
  const connected = seen.size === verts.length;
  const cyclic = graphHasCycle(verts, adj);
  const feat = (label, val, ok) => `<div class="flex items-center justify-between border-b border-slate-100 py-1.5">
    <span class="text-sm text-slate-600">${label}</span><span class="text-sm font-bold ${ok === undefined ? 'text-indigo-700' : ok ? 'text-emerald-600' : 'text-rose-600'}">${val}</span></div>`;
  const mrows = verts.map((v) => `<tr><th>${esc0(v)}</th>${verts.map((w) =>
    `<td class="text-center" style="font-family:'JetBrains Mono',monospace">${(adj.get(v) || []).includes(w) ? 1 : 0}</td>`).join('')}</tr>`).join('');
  return `
    ${feat('Jumlah simpul (V)', verts.length)}
    ${feat('Jumlah sisi (E)', edges.length)}
    ${feat('Derajat (urut turun)', degStr, undefined)}
    ${feat('Terhubung?', connected ? 'YA ✓' : 'TIDAK ✗', connected)}
    ${feat('Memuat siklus?', cyclic ? 'YA (DFS)' : 'TIDAK', cyclic)}
    <p class="text-xs font-semibold text-slate-500 mt-3 mb-1">Matriks ketetanggaan</p>
    <div class="overflow-x-auto"><table class="gtable truth-table">
      <thead><tr><th></th>${verts.map((v) => `<th class="text-center">${esc0(v)}</th>`).join('')}</tr></thead>
      <tbody>${mrows}</tbody></table></div>`;
}

function traversalTableHTML(steps) {
  let ord = [];
  const rows = steps.map((s, i) => {
    if (s.desc.startsWith('Kunjungi')) ord.push(s.node);
    return `<tr><td class="text-center">${i + 1}</td><td>${esc0(s.desc)}</td>
      <td class="text-center font-bold text-indigo-700">${esc0(s.node)}</td>
      <td class="font-mono">[${esc0(s.struct.join(', '))}]</td>
      <td class="font-mono">${esc0([...s.visited].join(', '))}</td></tr>`;
  }).join('');
  return `<p class="text-xs text-slate-500 mb-1">Urutan kunjungan: <b style="font-family:'JetBrains Mono',monospace">${esc0(ord.join(' → ')) || '—'}</b></p>
    <table class="gtable"><thead><tr><th>#</th><th>Aksi</th><th class="text-center">Aktif</th><th>Isi struktur</th><th>Dikunjungi</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function playGrafAnimation(host, verts, edges, steps) {
  const svgBox = host.querySelector('#dis-gsvg');
  const stateBox = host.querySelector('#dis-gstate');
  if (!svgBox || !stateBox) return;
  const ordMap = new Map();
  for (const s of steps) if (s.desc.startsWith('Kunjungi')) ordMap.set(s.node, ordMap.size + 1);
  if (grafTimer) clearInterval(grafTimer);
  const seq = ++grafAnimSeq;
  let idx = -1;
  const tick = () => {
    if (seq !== grafAnimSeq || !host.isConnected) { if (grafTimer) clearInterval(grafTimer); grafTimer = null; return; }
    idx++;
    if (idx >= steps.length) {
      if (grafTimer) clearInterval(grafTimer);
      grafTimer = null;
      svgBox.innerHTML = grafSvg(verts, edges, { visited: steps[steps.length - 1].visited, frontier: new Set(), current: null }, ordMap);
      stateBox.innerHTML = 'Penelusuran selesai ✔';
      return;
    }
    const s = steps[idx];
    const frontier = new Set(s.struct.filter((v) => !s.visited.has(v)));
    svgBox.innerHTML = grafSvg(verts, edges, { visited: s.visited, frontier, current: s.node }, null);
    stateBox.innerHTML = `Langkah ${idx + 1}/${steps.length}: ${esc0(s.desc)} · struktur: [${esc0(s.struct.join(', '))}]`;
  };
  tick();
  grafTimer = setInterval(tick, 900);
}

function tabGraf(host, ctx, S, rerender, finish) {
  const esc = ctx.esc || esc0;
  const st = S.graf;
  const parsed = grafParse(st);
  if (!parsed.verts.includes(st.start)) st.start = parsed.verts[0] || '';
  host.innerHTML = `
    <div class="grid lg:grid-cols-5 gap-5">
      <div class="lg:col-span-2 space-y-5">
        ${card('Editor Graf', '🌐', `
          <label class="block mb-2"><span class="text-xs font-semibold text-slate-500">Simpul (pisah koma)</span>
            <input id="dis-gverts" class="${INPUT}" value="${esc(st.verts)}" /></label>
          <div class="flex gap-2 mb-3">
            <input id="dis-gnewv" class="${INPUT}" placeholder="nama simpul baru…" />
            <button type="button" data-act="dis-gaddv" class="${BTN2} whitespace-nowrap">tambah simpul</button>
          </div>
          <label class="block mb-2"><span class="text-xs font-semibold text-slate-500">Daftar sisi — satu per baris: u - v</span>
            <textarea id="dis-gedges" class="${INPUT} font-mono" rows="5" spellcheck="false">${esc(st.edges)}</textarea></label>
          <button type="button" data-act="dis-gupdate" class="${BTN}">↻ Perbarui Graf</button>`)}
        ${card('Penelusuran BFS / DFS', '🧭', `
          <div class="grid grid-cols-2 gap-3 mb-3 items-end">
            <label class="block"><span class="text-xs font-semibold text-slate-500">Simpul awal</span>
              <select id="dis-gstart" class="${INPUT}">${parsed.verts.map((v) => `<option ${v === st.start ? 'selected' : ''}>${esc0(v)}</option>`).join('')}</select></label>
            <div class="flex gap-2">
              <button type="button" data-act="dis-gbfs" class="${BTN} flex-1">BFS ▶</button>
              <button type="button" data-act="dis-gdfs" class="${BTN2} flex-1">DFS ▶</button>
            </div>
          </div>
          <div id="dis-gsteps" class="max-h-80 overflow-y-auto"><p class="text-sm text-slate-400">Pilih simpul awal lalu jalankan BFS atau DFS.</p></div>`)}
      </div>
      <div class="lg:col-span-3 space-y-5">
        ${card('Visualisasi (layout melingkar)', '🖼️', `
          <div id="dis-gsvg">${grafSvg(parsed.verts, parsed.edges, null, null)}</div>
          <div id="dis-gstate" class="mt-2 text-sm text-slate-600 text-center min-h-[1.5rem]"></div>`)}
        ${card('Sifat Graf', '📐', `<div class="overflow-x-auto">${grafPropsHTML(parsed)}</div>`)}
      </div>
    </div>`;

  host.querySelector('[data-act="dis-gaddv"]')?.addEventListener('click', () => {
    const nv = host.querySelector('#dis-gnewv');
    if (!nv || !nv.value.trim()) return;
    const cur = parseItems(st.verts);
    if (!cur.includes(nv.value.trim())) { cur.push(nv.value.trim()); st.verts = cur.join(', '); }
    rerender();
  });
  host.querySelector('[data-act="dis-gupdate"]')?.addEventListener('click', () => {
    st.verts = host.querySelector('#dis-gverts').value;
    st.edges = host.querySelector('#dis-gedges').value;
    rerender();
  });
  const runTrav = (method) => {
    st.start = host.querySelector('#dis-gstart')?.value || st.start;
    if (!st.start) return;
    const steps = method === 'bfs' ? bfsSteps(parsed.adj, st.start) : dfsSteps(parsed.adj, st.start);
    host.querySelector('#dis-gsteps').innerHTML = traversalTableHTML(steps);
    playGrafAnimation(host, parsed.verts, parsed.edges, steps);
    finish();
  };
  host.querySelector('[data-act="dis-gbfs"]')?.addEventListener('click', () => runTrav('bfs'));
  host.querySelector('[data-act="dis-gdfs"]')?.addEventListener('click', () => runTrav('dfs'));
}

/* =========================================================================
   TAB 7 — TEORI BILANGAN
   ========================================================================= */

function euclidRows(a, b) {
  const rows = [];
  let r0 = a, r1 = b;
  while (r1 > 0) {
    const q = Math.floor(r0 / r1), r = r0 % r1;
    rows.push({ a: r0, b: r1, q, r });
    r0 = r1; r1 = r;
  }
  return { rows, g: r0 };
}

function extEuclidRows(a, b) {
  let r0 = a, r1 = b, s0 = 1, s1 = 0, t0 = 0, t1 = 1;
  const rows = [{ q: '—', r: r0, s: s0, t: t0 }];
  if (b === 0) {
    rows.push({ q: '—', r: 0, s: 0, t: 1 });
    return { rows, g: a, x: 1, y: 0 };
  }
  while (r1 > 0) {
    const q = Math.floor(r0 / r1);
    const r = r0 - q * r1, s = s0 - q * s1, t = t0 - q * t1;
    rows.push({ q, r, s, t });
    r0 = r1; r1 = r; s0 = s1; s1 = s; t0 = t1; t1 = t;
  }
  return { rows, g: r0, x: s0, y: t0 };
}

function modInverse(a, n) {
  const e = extEuclidRows(((a % n) + n) % n, n);
  if (e.g !== 1) return null;
  return ((e.x % n) + n) % n;
}

function modpowSteps(a, b, n) {
  if (!Number.isInteger(n) || n <= 0) return { error: 'Modulus n harus bilangan bulat positif.' };
  if (!Number.isInteger(b) || b < 0) return { error: 'Eksponen b harus bilangan bulat ≥ 0.' };
  const base = ((a % n) + n) % n;
  const bits = b.toString(2);
  let result = 1 % n;
  let cur = base;
  const rows = [];
  for (let i = 0; i < bits.length; i++) {
    const bit = bits[bits.length - 1 - i];
    const before = result;
    if (bit === '1') result = (result * cur) % n;
    rows.push({
      bit,
      p: cur,
      op: bit === '1' ? `bit=1 → kalikan ${cur}: ${before}·${cur} ≡ ${result}` : `bit=0 → result tetap ${result}`,
      res: result,
    });
    cur = (cur * cur) % n;
  }
  return { result, rows, bits, base };
}

function gcdHTML(aRaw, bRaw) {
  const a = Math.abs(Math.round(Number(aRaw))), b = Math.abs(Math.round(Number(bRaw)));
  if (!isFinite(a) || !isFinite(b) || (a === 0 && b === 0)) return errHtml('Masukkan dua bilangan bulat (tidak keduanya 0).');
  const { rows, g } = euclidRows(a || b, b);
  const e = extEuclidRows(a || b, b);
  return `
    <div class="step-box">
      <p class="font-semibold mb-1">Algoritma Euklides — pembagian bertingkat $${a || b} = q \\cdot ${b} + r$</p>
      <table class="gtable mb-2"><tbody>
        ${rows.map((d) => `<tr><td style="font-family:'JetBrains Mono',monospace">${d.a} = ${d.q} · ${d.b} + ${d.r}</td></tr>`).join('')}
      </tbody></table>
      <p class="text-sm">Barisan hasil bagi (q): <b style="font-family:'JetBrains Mono',monospace">${rows.map((d) => d.q).join(', ') || '—'}</b> → gcd = <b>${g}</b></p>
    </div>
    <div class="step-box mt-3">
      <p class="font-semibold mb-1">Euklides diperluas (indeks: r, s, t)</p>
      <table class="gtable mt-1">
        <thead><tr><th>q</th><th>r</th><th>x (s)</th><th>y (t)</th></tr></thead>
        <tbody>
          ${e.rows.map((d) => `<tr><td class="text-center">${d.q}</td><td class="text-center">${d.r}</td><td class="text-center">${d.s}</td><td class="text-center">${d.t}</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="mt-2">$\\gcd(${a || b}, ${b}) = ${g} = (${a || b})\\cdot(${e.x}) + (${b})\\cdot(${e.y})$ — koefisien Bézout x = ${e.x}, y = ${e.y}.</p>
      ${g === 1 ? '<p class="text-emerald-700 mt-1">gcd = 1 → coprima; invers moduler tersedia.</p>' : ''}
    </div>`;
}

function modHTML(aRaw, bRaw, nRaw) {
  const a = Math.round(Number(aRaw)), b = Math.round(Number(bRaw)), n = Math.round(Number(nRaw));
  if (!isFinite(a) || !isFinite(b) || !Number.isInteger(n) || n <= 0) return errHtml('Isi a (bulat), b (eksponen ≥ 0), dan n (modulus ≥ 1).');
  const amod = ((a % n) + n) % n;
  const pp = modpowSteps(a, b, n);
  if (pp.error) return errHtml(pp.error);
  const mi = modInverse(amod, n);
  return `
    <div class="step-box">
      <p>$(${a}) \\bmod ${n} = ${amod}$ · $(${a})^{${b}} \\bmod ${n} = ${pp.result}$</p>
      <p class="text-xs text-slate-500 mt-1">Biner eksponen: ${pp.bits ? pp.bits.split('').reverse().map((c, i) => (i ? ' · ' : '') + c).join('') : '0'} (dibaca LSB → MSB)</p>
      <table class="gtable mt-2">
        <thead><tr><th>Bit</th><th>Pangkat saat ini</th><th>Operasi</th><th class="text-center">Result</th></tr></thead>
        <tbody>
          ${pp.rows.map((r) => `<tr><td class="text-center">${r.bit}</td><td class="text-center">${r.p}</td><td style="font-family:'JetBrains Mono',monospace">${esc0(r.op)}</td><td class="text-center font-bold">${r.res}</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="mt-2 font-semibold">Invers moduler: ${mi !== null ? `$${amod}^{-1} \\equiv ${mi} \\pmod{${n}}$ (cek: ${amod}·${mi} mod ${n} = ${(amod * mi) % n})` : `tidak ada — gcd(${amod}, ${n}) ≠ 1`}</p>
    </div>`;
}

function crtHTML(a1Raw, m1Raw, a2Raw, m2Raw) {
  const a1 = Math.round(Number(a1Raw)), a2 = Math.round(Number(a2Raw));
  const m1 = Math.round(Number(m1Raw)), m2 = Math.round(Number(m2Raw));
  if (!Number.isInteger(m1) || !Number.isInteger(m2) || m1 < 1 || m2 < 1) return errHtml('Moduli harus bilangan bulat ≥ 1.');
  if (!isFinite(a1) || !isFinite(a2)) return errHtml('Sisa a₁ dan a₂ harus bilangan bulat.');
  const g0 = gcd(m1, m2);
  if (g0 !== 1) return errHtml(`Moduli harus coprima — gcd(${m1}, ${m2}) = ${g0} ≠ 1.`);
  const A1 = ((a1 % m1) + m1) % m1, A2 = ((a2 % m2) + m2) % m2;
  const M = m1 * m2;
  const inv = modInverse(((m1 % m2) + m2) % m2, m2);
  const diff = ((A2 - A1) % m2 + m2) % m2;
  const t = (diff * (inv ?? 0)) % m2;
  const x = A1 + m1 * t;
  return `
    <div class="step-box">
      <p>$x \\equiv ${A1} \\pmod{${m1}}, \\quad x \\equiv ${A2} \\pmod{${m2}}$</p>
      <p class="mt-1">$M = m_1 \\cdot m_2 = ${m1} \\cdot ${m2} = ${M}$</p>
      <p>$m_1^{-1} \\equiv ${inv} \\pmod{${m2}}$ — cek: $${m1} \\cdot ${inv} \\bmod ${m2} = ${(m1 * inv) % m2} = 1$</p>
      <p>$t = (a_2 - a_1) \\cdot m_1^{-1} \\bmod m_2 = (${A2} - ${A1}) \\cdot ${inv} \\bmod ${m2} = ${t}$</p>
      <p>$x = a_1 + m_1 \\cdot t = ${A1} + ${m1} \\cdot ${t} = ${x}$</p>
      <p class="text-emerald-700 mt-1">Cek: $${x} \\bmod ${m1} = ${x % m1}$ ✓ dan $${x} \\bmod ${m2} = ${x % m2}$ ✓ — $0 \\le x < M = ${M}$.</p>
    </div>`;
}

function tabBilangan(host, ctx, S, rerender, finish) {
  const esc = ctx.esc || esc0;
  const st = S.bil;
  host.innerHTML = `
    <div class="grid lg:grid-cols-3 gap-5">
      ${card('GCDE — Euklides Diperluas', '🔢', `
        <div class="grid grid-cols-2 gap-3 mb-3">
          <label class="block"><span class="text-xs font-semibold text-slate-500">a</span>
            <input id="dis-ga" class="${INPUT}" value="${esc(st.ga)}" /></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">b</span>
            <input id="dis-gb" class="${INPUT}" value="${esc(st.gb)}" /></label>
        </div>
        <button type="button" data-act="dis-ggo" class="${BTN}">🔢 Hitung gcd & Bézout</button>
        <div id="dis-gres" class="mt-4 overflow-x-auto">${gcdHTML(st.ga, st.gb)}</div>`)}
      ${card('Aritmetika Modular', '🧮', `
        <div class="grid grid-cols-3 gap-2 mb-3">
          <label class="block"><span class="text-xs font-semibold text-slate-500">a</span>
            <input id="dis-ma" class="${INPUT}" value="${esc(st.ma)}" /></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">b (eksponen)</span>
            <input id="dis-mb" class="${INPUT}" value="${esc(st.mb)}" /></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">n (modulus)</span>
            <input id="dis-mn" class="${INPUT}" value="${esc(st.mn)}" /></label>
        </div>
        <button type="button" data-act="dis-mgo" class="${BTN}">🧮 Hitung Modular</button>
        <div id="dis-mres" class="mt-4 overflow-x-auto">${modHTML(st.ma, st.mb, st.mn)}</div>`)}
      ${card('Teorema Sisa Tionghoa (CRT)', '🧩', `
        <div class="grid grid-cols-2 gap-2 mb-3">
          <label class="block"><span class="text-xs font-semibold text-slate-500">a₁ (sisa 1)</span>
            <input id="dis-c1" class="${INPUT}" value="${esc(st.c1)}" /></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">m₁ (moduli 1)</span>
            <input id="dis-cm1" class="${INPUT}" value="${esc(st.m1)}" /></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">a₂ (sisa 2)</span>
            <input id="dis-c2" class="${INPUT}" value="${esc(st.c2)}" /></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">m₂ (moduli 2)</span>
            <input id="dis-cm2" class="${INPUT}" value="${esc(st.m2)}" /></label>
        </div>
        <button type="button" data-act="dis-cgo" class="${BTN}">🧩 Selesaikan CRT</button>
        <div id="dis-cres" class="mt-4 overflow-x-auto">${crtHTML(st.c1, st.m1, st.c2, st.m2)}</div>`)}
    </div>`;

  const bind = (ids, key) => ids.forEach((id) => {
    const inp = host.querySelector('#' + id);
    if (inp) inp.addEventListener('input', () => { st[key] = inp.value; });
  });
  host.querySelectorAll('#dis-ga, #dis-gb, #dis-ma, #dis-mb, #dis-mn, #dis-c1, #dis-cm1, #dis-c2, #dis-cm2').forEach((inp) => {
    inp.addEventListener('input', () => {
      st.ga = host.querySelector('#dis-ga').value;
      st.gb = host.querySelector('#dis-gb').value;
      st.ma = host.querySelector('#dis-ma').value;
      st.mb = host.querySelector('#dis-mb').value;
      st.mn = host.querySelector('#dis-mn').value;
      st.c1 = host.querySelector('#dis-c1').value;
      st.m1 = host.querySelector('#dis-cm1').value;
      st.c2 = host.querySelector('#dis-c2').value;
      st.m2 = host.querySelector('#dis-cm2').value;
    });
  });
  host.querySelector('[data-act="dis-ggo"]')?.addEventListener('click', () => {
    host.querySelector('#dis-gres').innerHTML = gcdHTML(st.ga, st.gb);
    finish();
  });
  host.querySelector('[data-act="dis-mgo"]')?.addEventListener('click', () => {
    host.querySelector('#dis-mres').innerHTML = modHTML(st.ma, st.mb, st.mn);
    finish();
  });
  host.querySelector('[data-act="dis-cgo"]')?.addEventListener('click', () => {
    host.querySelector('#dis-cres').innerHTML = crtHTML(st.c1, st.m1, st.c2, st.m2);
    finish();
  });
}

/* =========================================================================
   TAB 8 — INDUKSI & REKURENSI
   ========================================================================= */

const INDUCTION_FAMILIES = [
  {
    key: 'sumi',
    label: 'Σ i = n(n+1)/2',
    tex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
    lhs: (n) => { let s = 0; for (let i = 1; i <= n; i++) s += i; return s; },
    rhs: (n) => (n * (n + 1)) / 2,
    stepTex: 'P(k): \\sum_{i=1}^{k} i = \\frac{k(k+1)}{2} \\;\\Longrightarrow\\; \\sum_{i=1}^{k+1} i = \\left( \\sum_{i=1}^{k} i \\right) + (k+1) = \\frac{k(k+1)}{2} + (k+1) = \\frac{k^2+3k+2}{2} = \\frac{(k+1)(k+2)}{2}',
  },
  {
    key: 'sumi2',
    label: 'Σ i² = n(n+1)(2n+1)/6',
    tex: '\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}',
    lhs: (n) => { let s = 0; for (let i = 1; i <= n; i++) s += i * i; return s; },
    rhs: (n) => (n * (n + 1) * (2 * n + 1)) / 6,
    stepTex: '\\sum_{i=1}^{k+1} i^2 = \\frac{k(k+1)(2k+1)}{6} + (k+1)^2 = (k+1)\\left[\\frac{k(2k+1)}{6} + (k+1)\\right] = \\frac{(k+1)(k+2)(2k+3)}{6}',
  },
  {
    key: 'pow2',
    label: 'Σ 2^i = 2^(n+1) − 1',
    tex: '\\sum_{i=0}^{n} 2^i = 2^{n+1} - 1',
    lhs: (n) => { let s = 0; for (let i = 0; i <= n; i++) s += Math.pow(2, i); return s; },
    rhs: (n) => Math.pow(2, n + 1) - 1,
    stepTex: '\\sum_{i=0}^{k+1} 2^i = (2^{k+1} - 1) + 2^{k+1} = 2 \\cdot 2^{k+1} - 1 = 2^{k+2} - 1',
  },
  {
    key: 'odd',
    label: 'Σ (2i−1) = n²',
    tex: '\\sum_{i=1}^{n} (2i-1) = n^2',
    lhs: (n) => { let s = 0; for (let i = 1; i <= n; i++) s += 2 * i - 1; return s; },
    rhs: (n) => n * n,
    stepTex: '\\sum_{i=1}^{k+1} (2i-1) = k^2 + (2k+1) = k^2 + 2k + 1 = (k+1)^2',
  },
  {
    key: 'arit',
    label: 'Deret aritmetika a, a+d, …',
    tex: (pa) => `\\sum_{i=0}^{n-1} (${pa.a} + i \\cdot ${pa.d}) = \\frac{n \\left( 2 \\cdot ${pa.a} + (n-1) \\cdot ${pa.d} \\right)}{2}`,
    stepTex: (pa) => `S_{k+1} = \\frac{k \\left( 2 \\cdot ${pa.a} + (k-1) \\cdot ${pa.d} \\right)}{2} + \\left( ${pa.a} + k \\cdot ${pa.d} \\right) = \\frac{(k+1) \\left( 2 \\cdot ${pa.a} + k \\cdot ${pa.d} \\right)}{2}`,
    params: ['a', 'd'],
    lhs: (n, pa) => { let s = 0; for (let i = 0; i < n; i++) s += pa.a + i * pa.d; return s; },
    rhs: (n, pa) => (n * (2 * pa.a + (n - 1) * pa.d)) / 2,
  },
  {
    key: 'geo',
    label: 'Deret geometri a, a·r, …',
    tex: (pa) => `\\sum_{i=0}^{n-1} ${pa.a} \\cdot ${pa.r}^{\\,i} = ${pa.a} \\, \\frac{${pa.r}^{\\,n} - 1}{${pa.r} - 1}`,
    stepTex: (pa) => `S_{k+1} = ${pa.a} \\, \\frac{${pa.r}^{\\,k} - 1}{${pa.r} - 1} + ${pa.a} \\cdot ${pa.r}^{\\,k} = ${pa.a} \\, \\frac{${pa.r}^{\\,k+1} - 1}{${pa.r} - 1}`,
    params: ['a', 'r'],
    lhs: (n, pa) => { let s = 0; for (let i = 0; i < n; i++) s += pa.a * Math.pow(pa.r, i); return s; },
    rhs: (n, pa) => (pa.r === 1 ? pa.a * n : pa.a * ((Math.pow(pa.r, n) - 1) / (pa.r - 1))),
  },
];

function inductionHTML(famKey, nTarget, params) {
  const fam = INDUCTION_FAMILIES.find((f) => f.key === famKey) || INDUCTION_FAMILIES[0];
  const nt = Math.max(1, Math.min(12, Number.isInteger(nTarget) ? nTarget : 5));
  const tex0 = typeof fam.tex === 'function' ? fam.tex(params) : fam.tex;
  const tex1 = typeof fam.stepTex === 'function' ? fam.stepTex(params) : fam.stepTex;
  const L1 = fam.lhs(1, params), R1 = fam.rhs(1, params);
  const baseOk = L1 === R1;
  const k = Math.max(1, nt - 1);
  const Lk = fam.lhs(k, params), Lk1 = fam.lhs(k + 1, params), Rk1 = fam.rhs(k + 1, params);
  const spotOk = Lk1 === Rk1;
  let trows = '';
  for (let n = 1; n <= nt; n++) {
    const L = fam.lhs(n, params), R = fam.rhs(n, params);
    trows += `<tr><td class="text-center">${n}</td><td class="text-center">${fmtNum(L)}</td><td class="text-center">${fmtNum(R)}</td>
      <td class="text-center">${L === R ? '<span class="text-emerald-600 font-bold">✓</span>' : '<span class="text-rose-600 font-bold">✗</span>'}</td></tr>`;
  }
  return `
    <div class="step-box">
      <p class="font-semibold">Kasus dasar P(1):</p>
      <p>$\\text{LHS}(1) = ${fmtNum(L1)}$, $\\text{RHS}(1) = ${fmtNum(R1)}$ → nilai sama, basis induksi ${baseOk ? '<span class="text-emerald-700 font-bold">terpenuhi ✓</span>' : '<span class="text-rose-700 font-bold">GAGAL ✗</span>'}</p>
      <p class="font-semibold mt-2">Langkah induktif P(k) ⟹ P(k+1):</p>
      <p>$${tex1}$</p>
      <p class="text-xs text-slate-500 mt-1">Uji numerik menuju n = ${nt}: $\\text{LHS}(${k + 1}) = \\text{LHS}(${k}) + (\\text{LHS}(${k + 1}) - \\text{LHS}(${k})) = ${fmtNum(Lk)} + ${fmtNum(Lk1 - Lk)} = ${fmtNum(Lk1)}$ dan $\\text{RHS}(${k + 1}) = ${fmtNum(Rk1)}$ → ${spotOk ? '<span class="text-emerald-700 font-bold">cocok ✓</span>' : '<span class="text-rose-700 font-bold">tidak cocok ✗</span>'}</p>
    </div>
    <div class="step-box mt-3">$\\text{Premis: } ${tex0}$</div>
    <p class="text-xs font-semibold text-slate-500 mt-3 mb-1">Tabel verifikasi P(1..${nt})</p>
    <table class="gtable truth-table">
      <thead><tr><th class="text-center">n</th><th class="text-center">LHS (hitung iteratif)</th><th class="text-center">RHS (rumus tertutup)</th><th>Cocok?</th></tr></thead>
      <tbody>${trows}</tbody>
    </table>
    <p class="text-sm mt-2 ${baseOk && spotOk ? 'text-emerald-700' : 'text-rose-700'}">Kesimpulan: identitas ${baseOk && spotOk ? '<b>terbukti</b> untuk semua n by induksi (∎)' : 'tidak terverifikasi — periksa kembali'}</p>`;
}

function recurrenceHTML(pRaw, qRaw, a0Raw) {
  const p = Number(pRaw), q = Number(qRaw), a0 = Number(a0Raw);
  if (!isFinite(p) || !isFinite(q) || !isFinite(a0)) return errHtml('Isi p, q, dan a₀ sebagai bilangan.');
  let closed, closedTex, derivLines, val;
  if (p === 1) {
    val = (n) => a0 + n * q;
    derivLines = [
      '$a_n - a_{n-1} = q$ selalu konstanta → deret aritmetika',
      `$a_1 = a_0 + q = ${fmtNum(a0 + q)}$, $a_2 = a_0 + 2q = ${fmtNum(a0 + 2 * q)}$, …`,
      `$\\text{Rumus tertutup: } a_n = a_0 + n \\cdot q = ${fmtNum(a0)} + n \\cdot ${fmtNum(q)}$`,
    ];
    closedTex = '$a_n = c \\cdot p^n + d \\text{ degenerate: } p = 1 \\Rightarrow a_n = a_0 + n q$';
  } else {
    const d = q / (1 - p);
    const c = a0 - d;
    val = (n) => c * Math.pow(p, n) + d;
    derivLines = [
      `$a_n = p \\, a_{n-1} + q$ dengan $p = ${fmtNum(p)}, q = ${fmtNum(q)}, a_0 = ${fmtNum(a0)}$`,
      `$\\text{Cari titik tetap } d: \\quad d = p \\cdot d + q \\;\\Longrightarrow\\; d = \\frac{q}{1 - p} = \\frac{${fmtNum(q)}}{1 - ${fmtNum(p)}} = ${fmtNum(d)}$`,
      `$\\text{Misalkan } b_n = a_n - d \\;\\Longrightarrow\\; b_n = p \\cdot b_{n-1} \\;\\Longrightarrow\\; b_n = b_0 \\cdot p^n$`,
      `$c = b_0 = a_0 - d = ${fmtNum(a0)} - ${fmtNum(d)} = ${fmtNum(c)}$`,
      `$\\text{Rumus tertutup: } a_n = c \\cdot p^n + d = ${fmtNum(c)} \\cdot ${fmtNum(p)}^{\\,n} + ${fmtNum(d)}$`,
    ];
    closedTex = `$a_n = ${fmtNum(c)} \\cdot ${fmtNum(p)}^{\\,n} + ${fmtNum(d)}$`;
  }
  let rows = '';
  let cur = a0;
  for (let n = 0; n < 10; n++) {
    const rec = cur, clo = val(n);
    const ok = Math.abs(rec - clo) < 1e-9;
    rows += `<tr><td class="text-center">${n}</td><td class="text-center">${fmtNum(rec)}</td><td class="text-center">${fmtNum(clo)}</td>
      <td class="text-center">${ok ? '<span class="text-emerald-600 font-bold">✓</span>' : '<span class="text-rose-600 font-bold">✗</span>'}</td></tr>`;
    cur = p * cur + q;
  }
  return `
    <div class="step-box">
      <p class="font-semibold mb-1">Derivasi rumus tertutup</p>
      ${derivLines.map((l) => `<p>${l}</p>`).join('')}
    </div>
    <p class="text-xs font-semibold text-slate-500 mt-3 mb-1">10 suku pertama (rekursif vs rumus)</p>
    <table class="gtable truth-table">
      <thead><tr><th class="text-center">n</th><th class="text-center">aₙ (rekursif)</th><th class="text-center">aₙ (rumus)</th><th>Sama?</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="step-box mt-3">Bentuk umum: $a_n = c \\cdot p^n + d$ · konkretnya: ${closedTex}</div>`;
}

function tabInduksi(host, ctx, S, rerender, finish) {
  const st = S.induk;
  const famOptions = INDUCTION_FAMILIES.map((f) =>
    `<option value="${f.key}" ${st.fam === f.key ? 'selected' : ''}>${esc0(f.label)}</option>`).join('');
  const fam = INDUCTION_FAMILIES.find((f) => f.key === st.fam) || INDUCTION_FAMILIES[0];
  host.innerHTML = `
    <div class="grid lg:grid-cols-2 gap-5">
      ${card('Pembantu Pembuktian Induksi', '∑', `
        <p class="text-xs text-slate-500 mb-3">Pilih salah satu keluarga identitas terkenal, beri nilai, lalu tabrik kasus dasar P(1), langkah induktif P(k)⟹P(k+1), dan tabel verifikasi P(1..n).</p>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <label class="block"><span class="text-xs font-semibold text-slate-500">Keluarga identitas</span>
            <select id="dis-ifam" class="${INPUT}">${famOptions}</select></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">Target n</span>
            <input id="dis-int" type="number" min="1" max="12" step="1" class="${INPUT}" value="${esc(String(st.n))}" /></label>
        </div>
        ${fam.params ? `<div class="grid grid-cols-${fam.params.length} gap-3 mb-3">${fam.params.map((pk) =>
          `<label class="block"><span class="text-xs font-semibold text-slate-500">${pk}</span>
            <input id="dis-ip-${pk}" type="number" step="any" class="${INPUT}" value="${esc(String(st.params[pk]))}" /></label>`).join('')}</div>` : ''}
        <button type="button" data-act="dis-igo" class="${BTN}">∑ Periksa Induksi</button>
        <div id="dis-ires" class="mt-4">${inductionHTML(st.fam, st.n, st.params)}</div>`)}
      ${card('Solver Rekurensi Linear Tingkat 1', '🔁', `
        <p class="text-xs text-slate-500 mb-3">Bentuk: a(n) = p·a(n−1) + q, dengan a₀ diberikan → rumus tertutup a(n) = c·pⁿ + d.</p>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <label class="block"><span class="text-xs font-semibold text-slate-500">p</span>
            <input id="dis-rp" type="number" step="any" class="${INPUT}" value="${esc(String(st.rec.p))}" /></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">q</span>
            <input id="dis-rq" type="number" step="any" class="${INPUT}" value="${esc(String(st.rec.q))}" /></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">a₀</span>
            <input id="dis-ra0" type="number" step="any" class="${INPUT}" value="${esc(String(st.rec.a0))}" /></label>
        </div>
        <button type="button" data-act="dis-rgo" class="${BTN}">🔁 Selesaikan Rekurensi</button>
        <div id="dis-rres" class="mt-4">${recurrenceHTML(st.rec.p, st.rec.q, st.rec.a0)}</div>`)}
    </div>`;

  const ifam = host.querySelector('#dis-ifam');
  if (ifam) ifam.addEventListener('change', (e) => { st.fam = e.target.value; rerender(); });
  const goI = host.querySelector('[data-act="dis-igo"]');
  if (goI) goI.addEventListener('click', () => {
    st.n = parseInt(host.querySelector('#dis-int').value, 10);
    if (fam.params) fam.params.forEach((pk) => {
      const v = Number(host.querySelector('#dis-ip-' + pk).value);
      if (isFinite(v)) st.params[pk] = v;
    });
    host.querySelector('#dis-ires').innerHTML = inductionHTML(st.fam, st.n, st.params);
    finish();
  });
  ['dis-int', ...((fam.params || []).map((pk) => 'dis-ip-' + pk))].forEach((id) => {
    const inp = host.querySelector('#' + id);
    if (inp) inp.addEventListener('input', () => {
      if (id === 'dis-int') return;
      const pk = id.replace('dis-ip-', '');
      const v = Number(inp.value);
      if (isFinite(v)) st.params[pk] = v;
    });
  });
  const goR = host.querySelector('[data-act="dis-rgo"]');
  if (goR) goR.addEventListener('click', () => {
    st.rec.p = host.querySelector('#dis-rp').value;
    st.rec.q = host.querySelector('#dis-rq').value;
    st.rec.a0 = host.querySelector('#dis-ra0').value;
    host.querySelector('#dis-rres').innerHTML = recurrenceHTML(st.rec.p, st.rec.q, st.rec.a0);
    finish();
  });
}

/* =========================================================================
   KOMPONEN UTAMA — kerangka tab
   ========================================================================= */

const TABS = [
  { id: 'logika', icon: '🧠', label: 'Logika Matematika' },
  { id: 'himp', icon: '🫧', label: 'Teori Himpunan' },
  { id: 'relasi', icon: '↔️', label: 'Relasi & Fungsi' },
  { id: 'bool', icon: '🟦', label: 'Aljabar Boolean' },
  { id: 'komb', icon: '🎲', label: 'Kombinatorika' },
  { id: 'graf', icon: '🌐', label: 'Teori Graf' },
  { id: 'bil', icon: '🔢', label: 'Teori Bilangan' },
  { id: 'induk', icon: '∑', label: 'Induksi & Rekurensi' },
];

const RENDERERS = {
  logika: tabLogika,
  himp: tabHimpunan,
  relasi: tabRelasi,
  bool: tabBoolean,
  komb: tabKombinatorika,
  graf: tabGraf,
  bil: tabBilangan,
  induk: tabInduksi,
};

export async function render(mainEl, ctx, extra) {
  const S = {
    logika: { nvars: 2, expr: '¬(p∧q) → (p∨q)', eqa: '¬(p∧q)', eqb: '¬p∨¬q' },
    himp: { a: '1, 2, 3', b: '2, 3, 5', venn: 'union' },
    relasi: { a: '1, 2, 3', b: '4, 5, 6', pairs: '(1,4)\n(2,5)\n(3,6)' },
    bool: { minterms: '0, 1, 2, 5, 6, 7', dm: '¬(A∧(B∨C))' },
    komb: { n: 7, r: 3, m: 3, total: 10 },
    graf: { verts: 'A, B, C, D, E', edges: 'A - B\nA - C\nB - D\nC - D\nD - E', start: 'A' },
    bil: { ga: '252', gb: '198', ma: '7', mb: '22', mn: '31', c1: '2', m1: '3', c2: '3', m2: '5' },
    induk: { fam: 'sumi', n: 5, params: { a: 3, d: 2, r: 2 }, rec: { p: '2', q: '3', a0: '1' } },
  };

  mainEl.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-extrabold text-slate-800">🧮 Matematika Diskrit Hub</h2>
      <p class="text-sm text-slate-500 mt-1">Delapan alat interaktif: logika, himpunan, relasi &amp; fungsi, aljabar Boolean, kombinatorika, graf, teori bilangan, serta induksi &amp; rekurensi — semua dihitung lokal di peramban.</p>
    </div>
    <div id="dis-tabbar" class="flex overflow-x-auto no-scrollbar py-1 gap-2 flex-nowrap sm:flex-wrap"></div>
    <div id="dis-tabcontent" class="mt-5"></div>`;

  const bar = mainEl.querySelector('#dis-tabbar');
  const content = mainEl.querySelector('#dis-tabcontent');
  let currentTab = 'logika';

  function drawBar() {
    bar.innerHTML = TABS.map((t) => {
      const active = t.id === currentTab;
      return `<button type="button" data-tab="${t.id}" class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${active ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">${t.icon} ${t.label}</button>`;
    }).join('');
  }

  function finish() {
    try { if (ctx.rerenderMath) ctx.rerenderMath(); } catch (_) { /* diam */ }
  }

  function renderTab() {
    const pane = document.createElement('div');
    content.replaceChildren(pane);
    (RENDERERS[currentTab])(pane, ctx, S, renderTab, finish);
    finish();
  }

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn || btn.dataset.tab === currentTab) return;
    currentTab = btn.dataset.tab;
    drawBar();
    renderTab();
  });

  drawBar();
  renderTab();
}

export default { render, subtitle };
