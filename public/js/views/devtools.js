/* ============================================================
   Gradify — CS Specialized Developer Tools (PRD §2.4)
   4 tab: 1) SQL Query Builder  2) Regex / NFA-DFA  3) Subnet CIDR  4) Big-O
   Semua komputasi berjalan 100% client-side, tanpa dependensi.
   ============================================================ */

const CARD = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-5';
const BTN = 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl';
const BTN_SOFT = 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl';
const INPUT = 'rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

export function subtitle(_user, _extra) {
  return 'Laboratorium SQL mini-engine, regex → NFA/DFA, kalkulator subnet CIDR, dan referensi Big-O — berjalan penuh di browser.';
}

/* ============================================================
   DATA: database demo in-memory (UNIKA UST)
   ============================================================ */
const DEMO_DB = {
  mahasiswa: {
    cols: ['id', 'npm', 'nama', 'prodi', 'angkatan'],
    rows: [
      { id: 1, npm: '2401501001', nama: 'Andini Prameswari', prodi: 'Teknik Informatika', angkatan: 2024 },
      { id: 2, npm: '2401502002', nama: 'Bayu Setyawan', prodi: 'Sistem Informasi', angkatan: 2024 },
      { id: 3, npm: '2301501003', nama: 'Citra Maharani', prodi: 'Teknik Informatika', angkatan: 2023 },
      { id: 4, npm: '2301502004', nama: 'Dimas Aryasatya', prodi: 'Sistem Informasi', angkatan: 2023 },
      { id: 5, npm: '2201501005', nama: 'Eka Wulandari', prodi: 'Teknik Informatika', angkatan: 2022 },
      { id: 6, npm: '2401501006', nama: 'Fajar Nugroho', prodi: 'Teknik Informatika', angkatan: 2024 }
    ]
  },
  matakuliah: {
    cols: ['id', 'kode', 'nama', 'sks'],
    rows: [
      { id: 1, kode: 'TI1101', nama: 'Algoritma & Pemrograman', sks: 3 },
      { id: 2, kode: 'TI1102', nama: 'Struktur Data', sks: 4 },
      { id: 3, kode: 'TI2103', nama: 'Basis Data', sks: 3 },
      { id: 4, kode: 'TI2104', nama: 'Jaringan Komputer', sks: 2 },
      { id: 5, kode: 'SI2201', nama: 'Sistem Analisis & Desain', sks: 3 },
      { id: 6, kode: 'TI3105', nama: 'Kecerdasan Buatan', sks: 4 }
    ]
  },
  nilai: {
    cols: ['id', 'mahasiswa_id', 'matakuliah_id', 'nilai', 'skor'],
    rows: [
      { id: 1, mahasiswa_id: 1, matakuliah_id: 1, nilai: 'A', skor: 92 },
      { id: 2, mahasiswa_id: 1, matakuliah_id: 3, nilai: 'A', skor: 88 },
      { id: 3, mahasiswa_id: 2, matakuliah_id: 1, nilai: 'B', skor: 76 },
      { id: 4, mahasiswa_id: 2, matakuliah_id: 5, nilai: 'C', skor: 65 },
      { id: 5, mahasiswa_id: 3, matakuliah_id: 2, nilai: 'A', skor: 95 },
      { id: 6, mahasiswa_id: 3, matakuliah_id: 3, nilai: 'B', skor: 78 },
      { id: 7, mahasiswa_id: 3, matakuliah_id: 4, nilai: 'B', skor: 84 },
      { id: 8, mahasiswa_id: 4, matakuliah_id: 1, nilai: 'B', skor: 81 },
      { id: 9, mahasiswa_id: 4, matakuliah_id: 5, nilai: 'C', skor: 70 },
      { id: 10, mahasiswa_id: 5, matakuliah_id: 2, nilai: null, skor: null }
    ]
  }
};

/* ============================================================
   MINI SQL ENGINE (subset praktis)
   ============================================================ */
function sqlErr(msg) { return new Error('Kesalahan sintaks SQL: ' + msg); }

function sqlTokenize(sql) {
  const out = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') { i++; continue; }
    if (c === ';') { out.push({ t: ';', v: ';' }); i++; continue; }
    if (c === "'" || c === '"') {
      const q = c; let j = i + 1, s = '';
      while (j < sql.length) {
        if (sql[j] === q) { if (sql[j + 1] === q) { s += q; j += 2; continue; } break; }
        s += sql[j]; j++;
      }
      if (j >= sql.length) throw sqlErr('string tidak ditutup dengan tanda ' + q);
      out.push({ t: 'str', v: s }); i = j + 1; continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i; while (j < sql.length && /[0-9.]/.test(sql[j])) j++;
      out.push({ t: 'num', v: parseFloat(sql.slice(i, j)) }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < sql.length && /[A-Za-z0-9_$]/.test(sql[j])) j++;
      out.push({ t: 'id', v: sql.slice(i, j) }); i = j; continue;
    }
    if (c === '*') { out.push({ t: 'star', v: '*' }); i++; continue; }
    if (c === ',') { out.push({ t: ',', v: ',' }); i++; continue; }
    if (c === '(') { out.push({ t: '(', v: '(' }); i++; continue; }
    if (c === '.') { out.push({ t: '.', v: '.' }); i++; continue; }
    if (c === ')') { out.push({ t: ')', v: ')' }); i++; continue; }
    const two = sql.slice(i, i + 2);
    if (two === '<=' || two === '>=' || two === '!=') { out.push({ t: 'op', v: two }); i += 2; continue; }
    if (two === '<>') { out.push({ t: 'op', v: '!=' }); i += 2; continue; }
    if (c === '=' || c === '<' || c === '>') { out.push({ t: 'op', v: c }); i++; continue; }
    throw sqlErr('karakter tidak dikenal "' + c + '"');
  }
  return out;
}

function sqlParse(tokens) {
  const p = { i: 0 };
  const peek = () => tokens[p.i];
  const isKw = w => { const t = tokens[p.i]; return !!t && t.t === 'id' && t.v.toUpperCase() === w; };
  const eatKw = w => { if (isKw(w)) { p.i++; return true; } return false; };
  const isTok = c => { const t = tokens[p.i]; return !!t && t.t === c; };
  const eatTok = c => { if (isTok(c)) { p.i++; return true; } return false; };
  const expectKw = w => { if (!eatKw(w)) throw sqlErr('keyword "' + w + '" diharapkan di sini'); };
  const expectTok = c => { if (!eatTok(c)) throw sqlErr('tanda "' + c + '" diharapkan'); };
  const RESERVED = ['WHERE', 'JOIN', 'ON', 'GROUP', 'ORDER', 'LIMIT', 'HAVING', 'AS', 'ASC', 'DESC', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'IS', 'NULL', 'SELECT', 'FROM'];

  function parseIdentPath() {
    const t = tokens[p.i];
    if (!t || t.t !== 'id') throw sqlErr('nama kolom/tabel diharapkan');
    p.i++;
    let name = t.v;
    if (isTok('.') && tokens[p.i + 1] && tokens[p.i + 1].t === 'id') {
      p.i++;
      name += '.' + tokens[p.i].v;
      p.i++;
    }
    return name;
  }

  function parseExpr() {
    const t = tokens[p.i];
    if (!t) throw sqlErr('ekspresi berakhir tiba-tiba');
    if (t.t === 'num' || t.t === 'str') { p.i++; return { k: 'lit', v: t.v }; }
    if (t.t === 'id') {
      if (/^(COUNT|SUM|AVG|MIN|MAX)$/i.test(t.v) && tokens[p.i + 1] && tokens[p.i + 1].t === '(') {
        const fn = t.v.toUpperCase();
        p.i++;
        expectTok('(');
        let arg = '*';
        if (isTok('star')) { p.i++; } else { arg = parseIdentPath(); }
        expectTok(')');
        return { k: 'agg', fn, arg };
      }
      return { k: 'col', name: parseIdentPath() };
    }
    throw sqlErr('ekspresi tidak valid di dekat "' + t.v + '"');
  }

  function parsePred() {
    if (eatKw('NOT')) return { k: 'not', v: parsePred() };
    if (isTok('(')) { p.i++; const c = parseOr(); expectTok(')'); return c; }
    const left = parseExpr();
    if (eatKw('IS')) {
      const neg = eatKw('NOT');
      expectKw('NULL');
      return { k: 'isnull', e: left, want: !neg };
    }
    let neg = false;
    if (isKw('NOT')) { p.i++; neg = true; }
    if (eatKw('IN')) {
      expectTok('(');
      const vals = [];
      if (!isTok(')')) { do { vals.push(parseExpr()); } while (eatTok(',')); }
      expectTok(')');
      const c = { k: 'in', e: left, vals };
      return neg ? { k: 'not', v: c } : c;
    }
    if (eatKw('LIKE')) {
      const c = { k: 'like', e: left, pat: parseExpr() };
      return neg ? { k: 'not', v: c } : c;
    }
    if (neg) throw sqlErr('NOT hanya didukung sebelum IN atau LIKE');
    const t = tokens[p.i];
    if (t && t.t === 'op') { p.i++; return { k: 'cmp', op: t.v, l: left, r: parseExpr() }; }
    throw sqlErr('kondisi tidak valid di dekat "' + (left.k === 'col' ? left.name : 'ekspresi') + '"');
  }
  function parseAnd() { let l = parsePred(); while (eatKw('AND')) l = { k: 'and', l, r: parsePred() }; return l; }
  function parseOr() { let l = parseAnd(); while (eatKw('OR')) l = { k: 'or', l, r: parseAnd() }; return l; }
  function parseCond() { return parseOr(); }

  function parseItem() {
    const e = parseExpr();
    if (eatKw('AS')) {
      const t = tokens[p.i];
      if (!t || (t.t !== 'id' && t.t !== 'str')) throw sqlErr('alias diharapkan setelah AS');
      p.i++;
      return { expr: e, alias: t.v };
    }
    return { expr: e };
  }

  function parseTableRef() {
    const t = tokens[p.i];
    if (!t || t.t !== 'id') throw sqlErr('nama tabel diharapkan setelah FROM/JOIN');
    p.i++;
    let alias = null;
    const nt = tokens[p.i];
    if (nt && nt.t === 'id' && !RESERVED.includes(nt.v.toUpperCase())) { alias = nt.v; p.i++; }
    return { name: t.v, alias };
  }

  expectKw('SELECT');
  const ast = { joins: [], items: [], groupBy: [], ords: [], limit: null, star: false };
  if (isTok('star')) { p.i++; ast.star = true; }
  else { do { ast.items.push(parseItem()); } while (eatTok(',')); }
  expectKw('FROM');
  ast.from = parseTableRef();
  while (isKw('JOIN') || isKw('INNER')) {
    eatKw('INNER');
    expectKw('JOIN');
    const tb = parseTableRef();
    expectKw('ON');
    ast.joins.push({ table: tb, on: parseCond() });
  }
  if (eatKw('WHERE')) ast.where = parseCond();
  if (eatKw('GROUP')) { expectKw('BY'); do { ast.groupBy.push(parseIdentPath()); } while (eatTok(',')); }
  if (eatKw('HAVING')) ast.having = parseCond();
  if (eatKw('ORDER')) {
    expectKw('BY');
    do {
      const expr = parseExpr();
      let dir = 'ASC';
      if (eatKw('DESC')) dir = 'DESC'; else eatKw('ASC');
      ast.ords.push({ expr, dir });
    } while (eatTok(','));
  }
  if (eatKw('LIMIT')) {
    const t = tokens[p.i];
    if (!t || t.t !== 'num') throw sqlErr('LIMIT membutuhkan angka');
    p.i++;
    ast.limit = t.v;
  }
  if (isTok(';')) p.i++;
  if (p.i < tokens.length) throw sqlErr('token tidak terduga di dekat "' + tokens[p.i].v + '"');
  return ast;
}

function sqlEnv() { return Object.create(null); }
function sqlAddCols(env, alias, row) {
  for (const k in row) {
    env[alias + '.' + k] = row[k];
    if (!(k in env)) env[k] = row[k];
  }
}
function sqlColGet(name, env) {
  if (env && (name in env)) return env[name];
  throw new Error('Kolom tidak dikenal: "' + name + '". Periksa pengejaan kolom, alias tabel, atau gunakan SELECT * untuk melihat kolom yang tersedia.');
}
function sqlEvalExpr(e, env, grp) {
  if (e.k === 'lit') return e.v;
  if (e.k === 'col') return sqlColGet(e.name, env);
  if (e.k === 'agg') {
    if (!grp) throw new Error('Fungsi agregat ' + e.fn + '() tidak diizinkan di sini — gunakan pada SELECT/HAVING (dengan atau tanpa GROUP BY).');
    const rows = grp;
    if (e.fn === 'COUNT') {
      if (e.arg === '*') return rows.length;
      let c = 0;
      for (const e2 of rows) { if (sqlColGet(e.arg, e2) != null) c++; }
      return c;
    }
    const vals = [];
    for (const e2 of rows) { const v = sqlColGet(e.arg, e2); if (v != null) vals.push(v); }
    if (vals.length === 0) return null;
    if (e.fn === 'SUM') return vals.reduce((a, b) => a + Number(b), 0);
    if (e.fn === 'AVG') return vals.reduce((a, b) => a + Number(b), 0) / vals.length;
    if (e.fn === 'MIN') return vals.reduce((a, b) => (b < a ? b : a));
    if (e.fn === 'MAX') return vals.reduce((a, b) => (b > a ? b : a));
  }
  throw new Error('Ekspresi tidak dikenal.');
}

function sqlCompare(a, b, op) {
  if (a == null || b == null) return null;
  let x = a, y = b;
  if (typeof x !== 'number' || typeof y !== 'number') {
    const nx = Number(x), ny = Number(y);
    if (x !== '' && y !== '' && !Number.isNaN(nx) && !Number.isNaN(ny)) { x = nx; y = ny; }
    else { x = String(x); y = String(y); }
  }
  switch (op) {
    case '=': return x === y;
    case '!=': return x !== y;
    case '<': return x < y;
    case '>': return x > y;
    case '<=': return x <= y;
    case '>=': return x >= y;
  }
  return null;
}

const LIKE_CACHE = new Map();
function sqlLike(s, pat) {
  let rx = LIKE_CACHE.get(pat);
  if (!rx) {
    let src = '';
    for (const ch of pat) {
      if (ch === '%') src += '.*';
      else if (ch === '_') src += '.';
      else src += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    rx = new RegExp('^' + src + '$', 'i');
    LIKE_CACHE.set(pat, rx);
  }
  return rx.test(s);
}

function sqlEvalCond(c, env, grp) {
  switch (c.k) {
    case 'or': {
      const a = sqlEvalCond(c.l, env, grp), b = sqlEvalCond(c.r, env, grp);
      if (a === true || b === true) return true;
      if (a === false && b === false) return false;
      return null;
    }
    case 'and': {
      const a = sqlEvalCond(c.l, env, grp), b = sqlEvalCond(c.r, env, grp);
      if (a === false || b === false) return false;
      if (a === true && b === true) return true;
      return null;
    }
    case 'not': {
      const v = sqlEvalCond(c.v, env, grp);
      return v == null ? null : !v;
    }
    case 'isnull': return (sqlEvalExpr(c.e, env, grp) == null) === c.want;
    case 'cmp': return sqlCompare(sqlEvalExpr(c.l, env, grp), sqlEvalExpr(c.r, env, grp), c.op);
    case 'in': {
      const v = sqlEvalExpr(c.e, env, grp);
      if (v == null) return null;
      let anyNull = false;
      for (const x of c.vals) {
        const xv = sqlEvalExpr(x, env, grp);
        if (xv == null) { anyNull = true; continue; }
        if (sqlCompare(v, xv, '=') === true) return true;
      }
      return anyNull ? null : false;
    }
    case 'like': {
      const s = sqlEvalExpr(c.e, env, grp), pt = sqlEvalExpr(c.pat, env, grp);
      if (s == null || pt == null) return null;
      return sqlLike(String(s), String(pt));
    }
  }
  throw new Error('Kondisi tidak dikenal.');
}

function sqlExprHasAgg(e) { return !!e && e.k === 'agg'; }
function sqlCondHasAgg(c) {
  if (!c) return false;
  switch (c.k) {
    case 'cmp': return sqlExprHasAgg(c.l) || sqlExprHasAgg(c.r);
    case 'in': return sqlExprHasAgg(c.e) || c.vals.some(sqlExprHasAgg);
    case 'like': return sqlExprHasAgg(c.e) || sqlExprHasAgg(c.pat);
    case 'isnull': return sqlExprHasAgg(c.e);
    default: return sqlCondHasAgg(c.l) || sqlCondHasAgg(c.r) || sqlCondHasAgg(c.v);
  }
}

function sqlLabelOfExpr(e) {
  if (e.k === 'agg') return e.fn + '(' + e.arg + ')';
  if (e.k === 'col') { const parts = e.name.split('.'); return parts[parts.length - 1]; }
  return String(e.v);
}

function sqlProject(ast, env, grp) {
  const out = sqlEnv();
  if (ast.star) { Object.assign(out, env); return out; }
  for (const it of ast.items) out[it.alias || sqlLabelOfExpr(it.expr)] = sqlEvalExpr(it.expr, env, grp);
  return out;
}

function runSelect(ast, db) {
  const names = Object.keys(db);
  const chk = t => {
    if (!names.includes(t.name)) {
      throw new Error('Tabel tidak dikenal: "' + t.name + '". Tabel yang tersedia: ' + names.join(', ') + '.');
    }
  };
  chk(ast.from);
  const keyOf = t => t.alias || t.name;
  let rows = db[ast.from.name].rows.map(r => {
    const e = sqlEnv();
    sqlAddCols(e, keyOf(ast.from), r);
    return e;
  });
  for (const j of ast.joins) {
    chk(j.table);
    const nextRows = [];
    for (const env of rows) {
      for (const r of db[j.table.name].rows) {
        const e2 = sqlEnv();
        Object.assign(e2, env);
        sqlAddCols(e2, keyOf(j.table), r);
        if (sqlEvalCond(j.on, e2) === true) nextRows.push(e2);
      }
    }
    rows = nextRows;
  }
  if (ast.where) rows = rows.filter(env => sqlEvalCond(ast.where, env) === true);

  const grouped = ast.groupBy.length > 0
    || ast.items.some(it => sqlExprHasAgg(it.expr))
    || sqlCondHasAgg(ast.having);

  let outRows = [];
  if (grouped) {
    const gmap = new Map();
    if (ast.groupBy.length) {
      for (const env of rows) {
        const gk = ast.groupBy.map(c => String(sqlColGet(c, env))).join('\u0001');
        if (!gmap.has(gk)) gmap.set(gk, { rep: env, rowsG: [] });
        gmap.get(gk).rowsG.push(env);
      }
    } else {
      gmap.set('__all__', { rep: rows[0] || sqlEnv(), rowsG: rows });
    }
    for (const g of gmap.values()) {
      if (ast.having && sqlEvalCond(ast.having, g.rep, g.rowsG) !== true) continue;
      outRows.push({ rep: g.rep, grp: g.rowsG, out: sqlProject(ast, g.rep, g.rowsG) });
    }
  } else {
    for (const env of rows) outRows.push({ rep: env, grp: null, out: sqlProject(ast, env, null) });
  }

  if (ast.ords.length) {
    const keyed = outRows.map(r => {
      const keys = ast.ords.map(o => {
        if (o.expr.k === 'col' && (o.expr.name in r.out)) return r.out[o.expr.name];
        return sqlEvalExpr(o.expr, r.rep, r.grp);
      });
      return { r, keys };
    });
    keyed.sort((a, b) => {
      for (let i = 0; i < ast.ords.length; i++) {
        const av = a.keys[i], bv = b.keys[i];
        let r;
        if (av == null && bv == null) r = 0;
        else if (av == null) r = 1;
        else if (bv == null) r = -1;
        else r = (typeof av === 'number' && typeof bv === 'number') ? av - bv : String(av).localeCompare(String(bv), 'id');
        if (r !== 0) {
          const invert = ast.ords[i].dir === 'DESC' && av != null && bv != null;
          return invert ? -r : r;
        }
      }
      return 0;
    });
    outRows = keyed.map(k => k.r);
  }
  if (ast.limit != null) outRows = outRows.slice(0, ast.limit);
  return outRows.map(r => r.out);
}

function sqlExprToStr(e) {
  if (e.k === 'lit') return typeof e.v === 'string' ? "'" + e.v + "'" : String(e.v);
  if (e.k === 'agg') return e.fn + '(' + e.arg + ')';
  return e.name;
}
function sqlCondToStr(c) {
  switch (c.k) {
    case 'or': return sqlCondToStr(c.l) + ' OR ' + sqlCondToStr(c.r);
    case 'and': return sqlCondToStr(c.l) + ' AND ' + sqlCondToStr(c.r);
    case 'not': return 'NOT ' + sqlCondToStr(c.v);
    case 'cmp': return sqlExprToStr(c.l) + ' ' + c.op + ' ' + sqlExprToStr(c.r);
    case 'in': return sqlExprToStr(c.e) + ' IN (' + c.vals.map(sqlExprToStr).join(', ') + ')';
    case 'like': return exprLikeToStr(c);
    case 'isnull': return sqlExprToStr(c.e) + (c.want ? ' IS NULL' : ' IS NOT NULL');
  }
  return '?';
}
function exprLikeToStr(c) {
  return sqlExprToStr(c.e) + " LIKE '" + sqlExprToStr(c.pat) + "'";
}

/* Preset queries contoh */
const SQL_PRESETS = [
  { t: 'Semua mahasiswa', s: 'SELECT * FROM mahasiswa ORDER BY nama;' },
  { t: 'JOIN 3 tabel: nilai lengkap', s: "SELECT m.nama AS mahasiswa, mk.nama AS matkul, n.nilai, n.skor\nFROM nilai n\nJOIN mahasiswa m ON n.mahasiswa_id = m.id\nJOIN matakuliah mk ON n.matakuliah_id = mk.id\nORDER BY m.nama, mk.nama;" },
  { t: 'Rata-rata skor per mahasiswa', s: "SELECT m.nama, COUNT(*) AS jumlah_nilai, AVG(n.skor) AS rata_rata\nFROM nilai n\nJOIN mahasiswa m ON n.mahasiswa_id = m.id\nGROUP BY m.nama\nORDER BY rata_rata DESC;" },
  { t: 'GROUP BY prodi', s: 'SELECT prodi, COUNT(*) AS jumlah FROM mahasiswa GROUP BY prodi ORDER BY jumlah DESC;' },
  { t: 'Top 3 total SKS yang diambil', s: "SELECT m.nama, COUNT(*) AS jumlah_mk, SUM(mk.sks) AS total_sks\nFROM nilai n\nJOIN mahasiswa m ON n.mahasiswa_id = m.id\nJOIN matakuliah mk ON n.matakuliah_id = mk.id\nGROUP BY m.nama\nORDER BY total_sks DESC\nLIMIT 3;" },
  { t: 'LIKE: prodi Teknik%', s: "SELECT npm, nama, angkatan FROM mahasiswa\nWHERE prodi LIKE 'Teknik%'\nORDER BY angkatan DESC, nama;" },
  { t: 'NULL: nilai yang belum dinilai', s: "SELECT m.nama, mk.nama AS matkul\nFROM nilai n\nJOIN mahasiswa m ON n.mahasiswa_id = m.id\nJOIN matakuliah mk ON n.matakuliah_id = mk.id\nWHERE n.skor IS NULL;" },
  { t: 'HAVING: mahasiswa dengan > 1 nilai', s: "SELECT m.nama, COUNT(*) AS banyak\nFROM nilai n\nJOIN mahasiswa m ON n.mahasiswa_id = m.id\nGROUP BY m.nama\nHAVING COUNT(*) > 1\nORDER BY banyak DESC;" },
  { t: 'IN: matakuliah sks 2 atau 4', s: 'SELECT kode, nama, sks FROM matakuliah WHERE sks IN (2, 4) ORDER BY nama;' }
];

const SQL_DDL = [
  'CREATE TABLE mahasiswa (',
  '  id       INTEGER PRIMARY KEY,',
  '  npm      VARCHAR(12),',
  '  nama     VARCHAR(60),',
  '  prodi    VARCHAR(30),',
  '  angkatan INTEGER',
  ');',
  '',
  'CREATE TABLE matakuliah (',
  '  id    INTEGER PRIMARY KEY,',
  '  kode  VARCHAR(10),',
  '  nama  VARCHAR(60),',
  '  sks   INTEGER',
  ');',
  '',
  'CREATE TABLE nilai (',
  '  id            INTEGER PRIMARY KEY,',
  '  mahasiswa_id  INTEGER REFERENCES mahasiswa(id),',
  '  matakuliah_id INTEGER REFERENCES matakuliah(id),',
  '  nilai         CHAR(1),  -- huruf A..E, NULL = belum dinilai',
  '  skor          INTEGER   -- skor numerik 0-100 (untuk SUM/AVG)',
  ');'
].join('\n');

/* ============================================================
   TAB 2: REGEX — Thompson NFA + subset construction DFA
   ============================================================ */
function reParse(re) {
  let i = 0;
  const err = m => { const e = new Error(m); e.subset = true; throw e; };

  function parseClass() {
    i++; // [
    const chars = new Set();
    while (i < re.length && re[i] !== ']') {
      let ch = re[i];
      if (ch === '\\') {
        const n = re[i + 1];
        if (n === undefined) err('escape tidak lengkap di dalam kelas [..]');
        if ('dDwWsS'.includes(n)) err('kelas \\' + n + ' di dalam [..] tidak didukung visual NFA/DFA — coba pola yang lebih sederhana');
        ch = n; i += 2;
      } else i++;
      if (re[i] === '-' && re[i + 1] !== undefined && re[i + 1] !== ']' && re[i + 1] !== '\\') {
        const lo = ch.charCodeAt(0), hi = re[i + 1].charCodeAt(0);
        if (hi <= lo) err('rentang kelas tidak valid (a-z)');
        for (let cd = lo; cd <= hi; cd++) chars.add(String.fromCharCode(cd));
        i += 2;
      } else chars.add(ch);
      if (chars.size > 24) err('kelas karakter terlalu besar untuk visual DFA');
    }
    if (i >= re.length) err('kelas [..] tidak ditutup dengan "]"');
    i++;
    if (chars.size === 0) err('kelas karakter kosong');
    return { t: 'class', chars: [...chars] };
  }

  function alt() {
    let n = concat();
    while (re[i] === '|') { i++; n = { t: 'alt', a: n, b: concat() }; }
    return n;
  }
  function concat() {
    let n = repeat();
    while (i < re.length && re[i] !== ')' && re[i] !== '|') n = { t: 'cat', a: n, b: repeat() };
    return n;
  }
  function repeat() {
    let a = atom();
    while (i < re.length && (re[i] === '*' || re[i] === '+' || re[i] === '?')) {
      a = { t: 'rep', q: re[i], a };
      i++;
    }
    return a;
  }
  function atom() {
    const c = re[i];
    if (c === undefined || c === ')' || c === '|') err('ekspresi tidak lengkap / kurung tidak seimbang');
    if (c === '\\') {
      const n = re[i + 1];
      if (n === undefined) err('escape "\\" tidak lengkap');
      i += 2;
      if ('dDwWsSbB'.includes(n)) err('kelas \\' + n + ' tidak didukung visual NFA/DFA — pakai hanya karakter, dot, *, +, ?, |, ( ), [..]');
      return { t: 'char', c: n };
    }
    if (c === '.') { i++; return { t: 'any' }; }
    if (c === '[') return parseClass();
    if (c === '(') {
      i++;
      if (re[i] === '?') err('grup non-capturing / lookaround tidak didukung visual NFA/DFA');
      const n = alt();
      if (re[i] !== ')') err('kurung "(" tidak ditutup');
      i++;
      return n;
    }
    if (c === '*' || c === '+' || c === '?') err('kuantifier "' + c + '" tanpa operand di depannya');
    i++;
    return { t: 'char', c };
  }

  const node = alt();
  if (i < re.length) err('ada karakter berlebih — kemungkinan kurung ")" tidak seimbang');
  return node;
}

function buildNFA(node) {
  const EPS = 'ε';
  const tr = [];
  let S = 0;
  const ns = () => { const s = S++; tr[s] = []; return s; };
  function build(n) {
    switch (n.t) {
      case 'char': case 'any': case 'class': {
        const s = ns(), e = ns();
        if (n.t === 'char') tr[s].push({ via: n.c, to: e });
        else if (n.t === 'any') tr[s].push({ via: 'ANY', to: e });
        else for (const ch of n.chars) tr[s].push({ via: ch, to: e });
        return [s, e];
      }
      case 'cat': {
        const [s1, e1] = build(n.a);
        const [s2, e2] = build(n.b);
        tr[e1].push({ via: EPS, to: s2 });
        return [s1, e2];
      }
      case 'alt': {
        const s = ns(), e = ns();
        const [a1, b1] = build(n.a);
        const [a2, b2] = build(n.b);
        tr[s].push({ via: EPS, to: a1 }, { via: EPS, to: a2 });
        tr[b1].push({ via: EPS, to: e });
        tr[b2].push({ via: EPS, to: e });
        return [s, e];
      }
      case 'rep': {
        const s = ns(), e = ns();
        const [i1, o1] = build(n.a);
        tr[s].push({ via: EPS, to: i1 });
        tr[o1].push({ via: EPS, to: e });
        if (n.q === '*' || n.q === '+') tr[o1].push({ via: EPS, to: i1 });
        if (n.q === '*' || n.q === '?') tr[s].push({ via: EPS, to: e });
        return [s, e];
      }
    }
    throw new Error('node tidak dikenal');
  }
  const [start, accept] = build(node);
  return { tr, S, start, accept };
}

function reAlphabet(node) {
  const set = new Set();
  const walk = n => {
    if (!n) return;
    if (n.t === 'char') set.add(n.c);
    else if (n.t === 'class') n.chars.forEach(c => set.add(c));
    else if (n.t === 'cat' || n.t === 'alt') { walk(n.a); walk(n.b); }
    else if (n.t === 'rep') walk(n.a);
  };
  walk(node);
  let arr = [...set];
  if (arr.length === 0) arr = ['a', 'b', 'c'];
  while (arr.length < 3) { const cand = ['a', 'b', 'c'].find(c => !arr.includes(c)); arr.push(cand); }
  arr.sort();
  return arr;
}

function nfaToDFA(nfa, alphabet) {
  const EPS = 'ε';
  const tooComplex = () => {
    const e = new Error('Pola ini menghasilkan DFA dengan lebih dari 30 kondisi — terlalu kompleks untuk visual NFA/DFA.');
    e.tooComplex = true;
    throw e;
  };
  const sig = set => [...set].sort((a, b) => a - b).join(',');
  const closure = initSet => {
    const seen = new Set(initSet);
    const st = [...initSet];
    while (st.length) {
      const s = st.pop();
      for (const t of nfa.tr[s] || []) if (t.via === EPS && !seen.has(t.to)) { seen.add(t.to); st.push(t.to); }
    }
    return seen;
  };
  const startSet = closure(new Set([nfa.start]));
  const sets = [startSet];
  const idx = new Map([[sig(startSet), 0]]);
  const rows = [];
  for (let qi = 0; qi < sets.length; qi++) {
    const row = {};
    for (const ch of alphabet) {
      const mv = new Set();
      for (const s of sets[qi]) {
        for (const t of nfa.tr[s] || []) if (t.via === ch || t.via === 'ANY') mv.add(t.to);
      }
      if (mv.size === 0) { row[ch] = null; continue; }
      const cl = closure(mv);
      const k = sig(cl);
      if (!idx.has(k)) {
        if (sets.length >= 30) tooComplex();
        idx.set(k, sets.length);
        sets.push(cl);
      }
      row[ch] = idx.get(k);
    }
    rows.push(row);
  }
  return {
    alphabet,
    states: sets.map((set, i) => ({ accept: set.has(nfa.accept), trans: rows[i] }))
  };
}

/* ============================================================
   TAB 3: SUBNET — util matematis IPv4 (bitwise, client-side)
   ============================================================ */
function clampPrefix(v) {
  let n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0) n = 0;
  if (n > 32) n = 32;
  return n;
}
function parseIPv4(s) {
  const parts = String(s || '').trim().split('.');
  if (parts.length !== 4) return null;
  let v = 0;
  for (const o of parts) {
    if (!/^\d{1,3}$/.test(o)) return null;
    const n = Number(o);
    if (n > 255) return null;
    v = v * 256 + n;
  }
  return v >>> 0;
}

function ipMaskOf(prefix) {
  if (prefix <= 0) return 0;
  if (prefix >= 32) return 0xFFFFFFFF;
  return (0xFFFFFFFF << (32 - prefix)) >>> 0;
}

const ipFmt = v => [(v>>>24)&255, (v>>>16)&255, (v>>>8)&255, v&255].join('.');
const ipWildcard = mask => (~mask) >>> 0;

function ipClass(v) {
  const o1 = (v >>> 24) & 255;
  if (o1 < 128) return { c: 'A', desc: 'Kelas A (1-126, 0 invalid)' };
  if (o1 < 192) return { c: 'B', desc: 'Kelas B (128-191)' };
  if (o1 < 224) return { c: 'C', desc: 'Kelas C (192-223)' };
  if (o1 < 240) return { c: 'D', desc: 'Kelas D — multicast' };
  return { c: 'E', desc: 'Kelas E — eksperimental' };
}

function ipPrivacy(v) {
  const a = (v >>> 24) & 255, b = (v >>> 16) & 255;
  if (a === 10) return 'Private (RFC 1918: 10.0.0.0/8)';
  if (a === 172 && b >= 16 && b <= 31) return 'Private (RFC 1918: 172.16.0.0/12)';
  if (a === 192 && b === 168) return 'Private (RFC 1918: 192.168.0.0/16)';
  if (a === 127) return 'Loopback (127.0.0.0/8)';
  if (a === 169 && b === 254) return 'APIPA / Link-local (169.254.0.0/16)';
  return 'Publik (dirutekan di internet)';
}

function usableHosts(prefix) {
  const h = 32 - prefix;
  if (h === 0) return 0;
  if (h === 1) return 0; /* /31 point-to-point */
  return Math.pow(2, h) - 2;
}

/* ============================================================
   TAB 4: BIG-O — data referensi & util
   ============================================================ */
const O_BADGE = {
  'O(1)': 'bg-emerald-100 text-emerald-700',
  'O(log n)': 'bg-sky-100 text-sky-700',
  'O(n)': 'bg-amber-100 text-amber-700',
  'O(n log n)': 'bg-violet-100 text-violet-700',
  'O(n²)': 'bg-rose-100 text-rose-700',
  'O(2ⁿ)': 'bg-rose-100 text-rose-700',
  'O(V+E)': 'bg-amber-100 text-amber-700',
  'O(E)': 'bg-amber-100 text-amber-700',
  '—': 'bg-slate-100 text-slate-400'
};
function obadge(o) {
  const cls = O_BADGE[o] || 'bg-slate-100 text-slate-600';
  return '<span class="inline-block px-2 py-0.5 rounded-lg text-[11px] font-semibold ' + cls + '">' + o + '</span>';
}

/* [DataStruktur, akses avg, akses worst, search avg, search worst, insert avg, insert worst, delete avg, delete worst] */
const DS_ROWS = [
  ['Array (statis)', 'O(1)', 'O(1)', 'O(n)', 'O(n)', 'O(n)', 'O(n)', 'O(n)', 'O(n)'],
  ['Dynamic Array (ArrayList)', 'O(1)', 'O(1)', 'O(n)', 'O(n)', 'O(1)', 'O(n)', 'O(n)', 'O(n)'],
  ['Linked List', 'O(n)', 'O(n)', 'O(n)', 'O(n)', 'O(1)', 'O(1)', 'O(1)', 'O(1)'],
  ['Stack', '—', '—', 'O(n)', 'O(n)', 'O(1)', 'O(1)', 'O(1)', 'O(1)'],
  ['Queue', '—', '—', 'O(n)', 'O(n)', 'O(1)', 'O(1)', 'O(1)', 'O(1)'],
  ['Hash Table', '—', '—', 'O(1)', 'O(n)', 'O(1)', 'O(n)', 'O(1)', 'O(n)'],
  ['BST (rata-rata)', 'O(log n)', 'O(n)', 'O(log n)', 'O(n)', 'O(log n)', 'O(n)', 'O(log n)', 'O(n)'],
  ['AVL Tree (seimbang)', 'O(log n)', 'O(log n)', 'O(log n)', 'O(log n)', 'O(log n)', 'O(log n)', 'O(log n)', 'O(log n)'],
  ['Heap (min-heap)', 'O(1)', 'O(1)', 'O(n)', 'O(n)', 'O(log n)', 'O(log n)', 'O(log n)', 'O(log n)'],
  ['Graph (adjacency list)', '—', '—', 'O(V+E)', 'O(V+E)', 'O(1)', 'O(1)', 'O(E)', 'O(E)']
];

const ALGO_ROWS = [
  ['Binary Search', 'O(1)', 'O(log n)', 'O(log n)', 'O(1)'],
  ['Linear Search', 'O(1)', 'O(n)', 'O(n)', 'O(1)'],
  ['Bubble Sort', 'O(n)', 'O(n²)', 'O(n²)', 'O(1)'],
  ['Insertion Sort', 'O(n)', 'O(n²)', 'O(n²)', 'O(1)'],
  ['Selection Sort', 'O(n²)', 'O(n²)', 'O(n²)', 'O(1)'],
  ['Merge Sort', 'O(n log n)', 'O(n log n)', 'O(n log n)', 'O(n)'],
  ['Quick Sort', 'O(n log n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
  ['Heap Sort', 'O(n log n)', 'O(n log n)', 'O(n log n)', 'O(1)'],
  ['BFS (graph)', 'O(V+E)', 'O(V+E)', 'O(V+E)', 'O(V)'],
  ['DFS (graph)', 'O(V+E)', 'O(V+E)', 'O(V+E)', 'O(V)'],
  ['Dijkstra (binary heap)', 'O((V+E) log V)', 'O((V+E) log V)', 'O((V+E) log V)', 'O(V)']
];

const GROWTH = [
  { key: 'o1', label: 'O(1)', tex: 'O(1)', f: () => 1 },
  { key: 'ologn', label: 'O(log n)', tex: 'O(\\log n)', f: n => Math.max(1, Math.log2(n)) },
  { key: 'on', label: 'O(n)', tex: 'O(n)', f: n => n },
  { key: 'onlogn', label: 'O(n log n)', tex: 'O(n \\log n)', f: n => n * Math.max(1, Math.log2(n)) },
  { key: 'on2', label: 'O(n²)', tex: 'O(n^2)', f: n => n * n },
  { key: 'o2n', label: 'O(2ⁿ)', tex: 'O(2^n)', f: n => Math.pow(2, Math.min(n, 1000)) }
];

const SUPD = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
function sup(x) { return String(x).split('').map(d => SUPD[d] || d).join(''); }

function fmtOps(v) {
  if (!isFinite(v)) return 'astronomis';
  if (v < 1e6) return v.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  if (v < 1e12) return v.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  return 'astronomis (≈10' + sup(Math.round(Math.log10(v))) + ')';
}

/* ============================================================
   STATIC HTML PARTS
   ============================================================ */
const ER_SVG = `
<svg viewBox="0 0 560 150" class="w-full" role="img" aria-label="Diagram relasi tabel demo">
  <line x1="160" y1="70" x2="216" y2="70" stroke="#94a3b8" stroke-width="2"/>
  <path d="M216 70 L230 64 M216 70 L230 70 M216 70 L230 76" stroke="#6366f1" stroke-width="2" fill="none"/>
  <line x1="354" y1="70" x2="386" y2="70" stroke="#94a3b8" stroke-width="2"/>
  <path d="M354 70 L340 64 M354 70 L340 70 M354 70 L340 76" stroke="#6366f1" stroke-width="2" fill="none"/>
  <text x="172" y="60" font-size="11" fill="#64748b">1</text>
  <text x="205" y="58" font-size="12" fill="#4f46e5" font-weight="700">N</text>
  <text x="358" y="58" font-size="12" fill="#4f46e5" font-weight="700">N</text>
  <text x="372" y="60" font-size="11" fill="#64748b">1</text>
  <rect x="10" y="40" width="150" height="60" rx="10" fill="#eef2ff" stroke="#a5b4fc" stroke-width="1.5"/>
  <text x="85" y="66" text-anchor="middle" font-size="13" font-weight="700" fill="#3730a3">mahasiswa</text>
  <text x="85" y="84" text-anchor="middle" font-size="10" fill="#64748b">id (PK)</text>
  <rect x="230" y="40" width="94" height="60" rx="10" fill="#fdf4ff" stroke="#e879f9" stroke-width="1.5"/>
  <text x="277" y="62" text-anchor="middle" font-size="13" font-weight="700" fill="#a21caf">nilai</text>
  <text x="277" y="78" text-anchor="middle" font-size="10" fill="#64748b">mahasiswa_id (FK)</text>
  <text x="277" y="90" text-anchor="middle" font-size="10" fill="#64748b">matakuliah_id (FK)</text>
  <rect x="386" y="40" width="164" height="60" rx="10" fill="#f0fdfa" stroke="#5eead4" stroke-width="1.5"/>
  <text x="468" y="66" text-anchor="middle" font-size="13" font-weight="700" fill="#0f766e">matakuliah</text>
  <text x="468" y="84" text-anchor="middle" font-size="10" fill="#64748b">id (PK)</text>
  <text x="140" y="126" font-size="10" fill="#94a3b8">crow's foot = sisi "banyak" (many)</text>
</svg>`;

function schemaCard(t, icon) {
  const db = DEMO_DB[t];
  const cols = db.cols.map(c => '<li class="flex items-center gap-2 py-1 text-xs text-slate-600"><span class="w-2 h-2 rounded-full bg-indigo-400 inline-block"></span><code class="font-mono">' + c + '</code></li>').join('');
  return '<div class="' + CARD + ' p-4"><div class="flex items-center justify-between mb-2"><h4 class="font-bold text-slate-800 text-sm">' + icon + ' <code class="font-mono">' + t + '</code></h4><span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">' + db.rows.length + ' baris</span></div><ul class="divide-y divide-slate-100">' + cols + '</ul></div>';
}

function gtableHTML(head, rows, emptyMsg) {
  if (!rows.length) return '<p class="text-sm text-slate-500 italic py-3">' + (emptyMsg || 'Tidak ada data.') + '</p>';
  const th = head.map(h => '<th class="px-3 py-2 text-left font-semibold whitespace-nowrap">' + h + '</th>').join('');
  const trs = rows.map(r => '<tr class="border-t border-slate-100 hover:bg-indigo-50/40">' + r.map(c => '<td class="px-3 py-2">' + c + '</td>').join('') + '</tr>').join('');
  return '<div class="overflow-x-auto rounded-xl border border-slate-200"><table class="gtable w-full text-sm">' + '<thead class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide"><tr>' + th + '</tr></thead>' + '<tbody>' + trs + '</tbody></table></div>';
}

const REGEX_CHEAT = gtableHTML(
  ['Simbol', 'Arti', 'Contoh'],
  [
    ['<code>\\d</code>', 'digit 0-9', ' tahun\\d'],
    ['<code>\\w</code>', 'huruf/digit/underscore', ' \\w+'],
    ['<code>\\s</code>', 'whitespace', ' a\\sb '],
    ['<code>\\b</code>', 'batas kata (word boundary)', ' \\bkata\\b'],
    ['<code>.</code>', 'karakter apa pun (kecuali newline)', ' a.c'],
    ['<code>*</code>', '0 kali atau lebih', ' ab*c'],
    ['<code>+</code>', '1 kali atau lebih', ' ab+c'],
    ['<code>?</code>', '0 atau 1 kali (opsional)', ' colou?r'],
    ['<code>{m,n}</code>', 'antara m sampai n kali', ' \\d{2,4}'],
    ['<code>^</code> / <code>$</code>', 'awal / akhir (dengan flag m: per baris)', ' ^abc$'],
    ['<code>[abc]</code>', 'salah satu karakter di dalam kelas', ' [Tt]idak'],
    ['<code>[a-z]</code>', 'rentang karakter', ' [A-Za-z0-9]'],
    ['<code>(...)</code>', 'grup tangkap (capturing group)', ' (\\d+)x(\\d+)'],
    ['<code>a|b</code>', 'alternasi: a atau b', ' kucing|anjing'],
    ['<code>(?=...)</code>', 'lookahead positif', ' \\d(?=px)'],
    ['<code>(?!...)</code>', 'lookahead negatif', ' \\d(?!px)']
  ]
);

const CIDR_CHEAT = gtableHTML(
  ['Prefix', 'Subnet Mask', 'Bit host', 'Total host', 'Host usable'],
  [
    ['/24', '255.255.255.0', '<span class="font-mono text-xs text-slate-500">8</span>', '256', '254'],
    ['/25', '255.255.255.128', '<span class="font-mono text-xs text-slate-500">7</span>', '128', '126'],
    ['/26', '255.255.255.192', '<span class="font-mono text-xs text-slate-500">6</span>', '64', '62'],
    ['/27', '255.255.255.224', '<span class="font-mono text-xs text-slate-500">5</span>', '32', '30'],
    ['/28', '255.255.255.240', '<span class="font-mono text-xs text-slate-500">4</span>', '16', '14'],
    ['/29', '255.255.255.248', '<span class="font-mono text-xs text-slate-500">3</span>', '8', '6'],
    ['/30', '255.255.255.252', '<span class="font-mono text-xs text-slate-500">2</span>', '4', '2']
  ]
);

function binSpans(v, prefix) {
  let out = '';
  for (let i = 0; i < 32; i++) {
    const bit = ((v >>> (31 - i)) & 1);
    if (i > 0 && i % 8 === 0) {
      out += '<span class="text-slate-300">.</span>';
    }
    const cls = i < prefix ? 'bg-indigo-600/90 text-white' : 'bg-rose-100 text-rose-600';
    out += '<span class="inline-block rounded text-[10px] px-[1px] font-bold ' + cls + '">' + bit + '</span>';
  }
  return out;
}

/* ============================================================
   VIEW
   ============================================================ */
export default async function render(mainEl, ctx, extra) {
  const esc = ctx.esc;
  const qs = sel => mainEl.querySelector(sel);
  const qsa = sel => mainEl.querySelectorAll(sel);

  const tabsDef = [
    { id: 'sql', icon: '🗃️', label: 'SQL Query Builder &amp; Visualizer' },
    { id: 'regex', icon: '🔍', label: 'Regex Engine Tester' },
    { id: 'subnet', icon: '🌐', label: 'Subnet &amp; CIDR Calculator' },
    { id: 'bigo', icon: '⏱️', label: 'Big-O &amp; Struktur Data' }
  ];

  mainEl.innerHTML = `
<div class="max-w-6xl mx-auto space-y-6">

  <div class="${CARD} p-6 bg-gradient-to-r from-indigo-50 via-white to-fuchsia-50">
    <h1 class="text-2xl font-bold text-slate-800">🛠️ CS Developer Tools</h1>
    <p class="text-slate-500 text-sm mt-1 max-w-3xl">Empat laboratorium spesialis untuk mahasiswa Informatika/SI — mini SQL engine di memori, tester regex lengkap dengan automata NFA→DFA, kalkulator subnet/CIDR bitwise, dan referensi kompleksitas Big-O. Semua berjalan <b>100% di browser</b>, tanpa server.</p>
  </div>

  <div class="flex flex-wrap gap-2" id="dt-tabs">
    ${tabsDef.map(t => `<button data-tab="${t.id}" class="text-sm px-4 py-2 rounded-xl transition ${t.id === 'sql' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">${t.icon} ${t.label}</button>`).join('')}
  </div>

  <!-- ============ TAB 1: SQL ============ -->
  <section id="dt-panel-sql" class="space-y-4">
    <div class="grid lg:grid-cols-3 gap-4">
      <div class="${CARD} lg:col-span-1">
        <h3 class="font-bold text-slate-800 text-sm mb-1">Editor Query</h3>
        <p class="text-xs text-slate-500 mb-3">SELECT subset — JOIN, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, agregat. Keyword tidak case-sensitive.</p>
        <label class="block text-xs font-semibold text-slate-500 mb-1">Preset contoh</label>
        <select id="sql-preset" class="w-full text-sm mb-3 pr-8 ${INPUT}">
          ${SQL_PRESETS.map((p, i) => `<option value="${i}">${p.t}</option>`).join('')}
        </select>
        <textarea id="sql-q" rows="7" spellcheck="false"
          class="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
        <button id="sql-run" class="w-full mt-3 ${BTN} py-2.5 text-sm">▶ Jalankan Query</button>
        <div id="sql-err" class="hidden mt-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium p-3"></div>
        <div class="step-box mt-4">
          <h4 class="text-xs font-bold text-indigo-700 mb-2">Query Plan</h4>
          <div id="sql-plan" class="text-xs text-indigo-900/80 space-y-1"></div>
        </div>
      </div>
      <div class="lg:col-span-2 space-y-4">
        <div class="${CARD}">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-slate-800 text-sm">Hasil</h3>
            <span id="sql-meta" class="text-xs text-slate-400"></span>
          </div>
          <div id="sql-out"></div>
        </div>
        <div class="${CARD}">
          <h3 class="font-bold text-slate-800 text-sm mb-1">ER Diagram — relasi foreign key</h3>
          <p class="text-xs text-slate-500 mb-3">mahasiswa (1) — nilai (N) — matakuliah (1), crow's foot menandai sisi banyak.</p>
          ${ER_SVG}
        </div>
      </div>
    </div>
    <div class="grid lg:grid-cols-4 gap-4">
      <div class="lg:col-span-1 space-y-3">
        ${schemaCard('mahasiswa', '🎓')}
        ${schemaCard('matakuliah', '📘')}
        ${schemaCard('nilai', '📝')}
      </div>
      <div class="${CARD} lg:col-span-3">
        <h3 class="font-bold text-slate-800 text-sm mb-2">DDL Skema</h3>
        <pre class="text-xs leading-relaxed bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto"><code class="language-sql">${SQL_DDL}</code></pre>
        <p class="text-xs text-slate-500 mt-2">Kolom <code class="font-mono">skor</code> (0-100) ditambahkan agar fungsi agregat <code class="font-mono">SUM/AVG</code> bisa didemokan di atas huruf mutu.</p>
      </div>
    </div>
  </section>

  <!-- ============ TAB 2: REGEX ============ -->
  <section id="dt-panel-regex" class="hidden space-y-4">
    <div class="grid lg:grid-cols-2 gap-4">
      <div class="${CARD}">
        <h3 class="font-bold text-slate-800 text-sm mb-3">Pola</h3>
        <div class="flex gap-2">
          <span class="text-2xl font-mono text-slate-400 self-center">/</span>
          <input id="re-pattern" class="flex-1 font-mono text-sm ${INPUT}" value="(ab|a)*b" spellcheck="false" placeholder="masukkan pola regex...">
          <span class="text-2xl font-mono text-slate-400 self-center">/g</span>
        </div>
        <div class="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-600" id="re-flags">
          <span class="font-semibold text-slate-500">Flag:</span>
          <label class="flex items-center gap-1"><input type="checkbox" id="re-f-g" checked class="accent-indigo-600"> g global</label>
          <label class="flex items-center gap-1"><input type="checkbox" id="re-f-i" class="accent-indigo-600"> i ignore-case</label>
          <label class="flex items-center gap-1"><input type="checkbox" id="re-f-m" class="accent-indigo-600"> m multiline</label>
          <label class="flex items-center gap-1"><input type="checkbox" id="re-f-s" class="accent-indigo-600"> s dotall</label>
          <label class="flex items-center gap-1"><input type="checkbox" id="re-f-u" class="accent-indigo-600"> u unicode</label>
        </div>
        <label class="block text-xs font-semibold text-slate-500 mt-4 mb-1">Teks uji</label>
        <textarea id="re-text" rows="5" class="w-full rounded-xl border border-slate-300 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">abab aab ba bba abba
abd ababab</textarea>
        <div id="re-err" class="hidden mt-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium p-3"></div>
        <h4 class="font-bold text-slate-800 text-sm mt-5 mb-2">Highlight di teks</h4>
        <div id="re-hl" class="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm font-mono whitespace-pre-wrap break-words min-h-[3rem]"></div>
        <h4 class="font-bold text-slate-800 text-sm mt-5 mb-2">Daftar kecocokan</h4>
        <div id="re-table"></div>
      </div>
      <div class="space-y-4">
        <div class="${CARD}">
          <h3 class="font-bold text-slate-800 text-sm mb-2">📐 Automata: NFA (Thompson) → DFA (subset construction)</h3>
          <p class="text-xs text-slate-500 mb-3">Untuk pola sederhana (karakter, <code class="font-mono">.</code>, <code class="font-mono">*</code>, <code class="font-mono">+</code>, <code class="font-mono">?</code>, <code class="font-mono">|</code>, <code class="font-mono">( )</code>, <code class="font-mono">[a-z]</code>) dibangun NFA Thompson lalu dikonversi ke DFA. Kecocokan live per keystroke (debounce 150 ms) tetap menggunakan <code class="font-mono">RegExp</code> native.</p>
          <div id="re-nfa"></div>
        </div>
        <div class="${CARD}">
          <h3 class="font-bold text-slate-800 text-sm mb-3">Cheat Sheet Regex</h3>
          ${REGEX_CHEAT}
        </div>
      </div>
    </div>
  </section>

  <!-- ============ TAB 3: SUBNET ============ -->
  <section id="dt-panel-subnet" class="hidden space-y-4">
    <div class="grid lg:grid-cols-3 gap-4">
      <div class="${CARD} lg:col-span-1">
        <h3 class="font-bold text-slate-800 text-sm mb-3">Input</h3>
        <label class="block text-xs font-semibold text-slate-500 mb-1">Alamat IPv4</label>
        <input id="sn-ip" value="192.168.10.77" class="w-full font-mono text-sm ${INPUT} mb-3" spellcheck="false">
        <label class="block text-xs font-semibold text-slate-500 mb-1">Prefix (CIDR)</label>
        <div class="flex items-center gap-2 mb-3">
          <span class="text-slate-400 font-mono">/</span>
          <input id="sn-prefix" type="number" min="0" max="32" value="24" class="flex-1 font-mono text-sm ${INPUT}">
        </div>
        <label class="block text-xs font-semibold text-slate-500 mb-1">…atau jumlah host diperlukan (mengabaikan prefix)</label>
        <input id="sn-hosts" type="number" min="0" placeholder="mis. 100" class="w-full font-mono text-sm ${INPUT} mb-3">
        <button id="sn-run" class="w-full ${BTN} py-2.5 text-sm">🌐 Hitung Subnet</button>
        <div id="sn-err" class="hidden mt-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium p-3"></div>
      </div>
      <div class="lg:col-span-2 space-y-4">
        <div class="grid sm:grid-cols-3 gap-3" id="sn-out"></div>
        <div class="${CARD} p-4">
          <h3 class="font-bold text-slate-800 text-sm mb-2">Bentuk biner — <span class="text-xs font-normal text-indigo-600">biru = bit network</span> / <span class="text-xs font-normal text-rose-500">merah muda = bit host</span></h3>
          <div id="sn-bin" class="space-y-1.5"></div>
        </div>
      </div>
    </div>
    <div class="grid lg:grid-cols-2 gap-4">
      <div class="${CARD}">
        <h3 class="font-bold text-slate-800 text-sm mb-2">Panel jumlah subnet</h3>
        <p class="text-xs text-slate-500 mb-3">Berapa subnet yang muncul bila /base dipatahkan ke /target? Banyak subnet = \(2^m\) dengan \(m\) = selisih prefix; host tiap subnet = \(2^{32-\text{target}} - 2\).</p>
        <div class="flex items-end gap-2">
          <div><label class="block text-xs font-semibold text-slate-500 mb-1">/base</label><input id="sn-base" type="number" min="0" max="30" value="24" class="w-24 font-mono text-sm ${INPUT}"></div>
          <span class="text-slate-400 self-center pb-2">→</span>
          <div><label class="block text-xs font-semibold text-slate-500 mb-1">/target</label><input id="sn-target" type="number" min="1" max="32" value="26" class="w-24 font-mono text-sm ${INPUT}"></div>
          <button id="sn-subnet-run" class="${BTN_SOFT} py-2 px-4 text-sm">Hitung</button>
        </div>
        <div id="sn-subnet-out" class="mt-3"></div>
      </div>
      <div class="${CARD}">
        <h3 class="font-bold text-slate-800 text-sm mb-2">Tabel VLSM — membelah /24</h3>
        ${gtableHTML(
          ['Prefix', 'Subnet Mask', 'Blok', 'Host usable', 'Peningkatan subnet'],
          [
            ['/25', '255.255.255.128', '128', '126', '×2'],
            ['/26', '255.255.255.192', '64', '62', '×4'],
            ['/27', '255.255.255.224', '32', '30', '×8'],
            ['/28', '255.255.255.240', '16', '14', '×16'],
            ['/29', '255.255.255.248', '8', '6', '×32'],
            ['/30', '255.255.255.252', '4', '2', '×64']
          ]
        )}
      </div>
    </div>
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 text-sm mb-3">Cheat sheet CIDR populer</h3>
      ${CIDR_CHEAT}
      <p class="text-xs text-slate-500 mt-3">Rumus: total host \(2^h\), usable \(2^h-2\) (alamat network &amp; broadcast dipakai); \(h\) = 32 − prefix.</p>
    </div>
  </section>

  <!-- ============ TAB 4: BIG-O ============ -->
  <section id="dt-panel-bigo" class="hidden space-y-4">
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 text-sm mb-3">🏗️ Kompleksitas operasi struktur data (avg / worst)</h3>
      ${gtableHTML(
        ['Struktur', 'Akses', 'Search', 'Insert', 'Delete'],
        DS_ROWS.map(r => [
          r[0],
          obadge(r[1]) + (r[2] !== r[1] ? ' ' + obadge(r[2]) : ''),
          obadge(r[3]) + (r[4] !== r[3] ? ' ' + obadge(r[4]) : ''),
          obadge(r[5]) + (r[6] !== r[5] ? ' ' + obadge(r[6]) : ''),
          obadge(r[7]) + (r[8] !== r[7] ? ' ' + obadge(r[8]) : '')
        ])
      )}
    </div>
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 text-sm mb-3">⚙️ Kompleksitas algoritma klasik</h3>
      ${gtableHTML(
        ['Algoritma', 'Terbaik', 'Rata-rata', 'Terburuk', 'Ruang'],
        ALGO_ROWS.map(r => [r[0], obadge(r[1]), obadge(r[2]), obadge(r[3]), obadge(r[4])])
      )}
    </div>
    <div class="grid lg:grid-cols-2 gap-4">
      <div class="${CARD}">
        <h3 class="font-bold text-slate-800 text-sm mb-2">📈 Visualizer Kurva Pertumbuhan</h3>
        <select id="bigo-func" class="${INPUT} text-sm mb-2">
          ${GROWTH.map(g => `<option value="${g.key}">${g.label}</option>`).join('')}
        </select>
        <p class="text-xs text-slate-500 mb-2">Skala logaritmik pada sumbu Y, \(n\) = 1…24.</p>
        <svg id="bigo-svg" viewBox="0 0 640 300" class="w-full"></svg>
        <div class="text-xs text-slate-500 mt-1"><span id="bigo-math"></span></div>
        <div id="bigo-compare" class="mt-3"></div>
      </div>
      <div class="${CARD}">
        <h3 class="font-bold text-slate-800 text-sm mb-2">🧮 Growth Estimator</h3>
        <p class="text-xs text-slate-500 mb-3">Masukkan ukuran input \(n\) — lihat estimasi jumlah operasi untuk tiap kelas kompleksitas.</p>
        <div class="flex gap-2">
          <input id="bigo-n" type="number" min="1" value="1000" class="w-32 font-mono text-sm ${INPUT}">
          <button id="bigo-est" class="${BTN} py-2 px-4 text-sm">Estimasi</button>
        </div>
        <div id="bigo-est-out" class="mt-3"></div>
      </div>
    </div>
  </section>

  <p class="text-center text-xs text-slate-400 pb-4">Gradify · CS Developer Tools — seluruh logika (SQL engine, NFA/DFA, bitwise CIDR) ditulis murni di modul ini, tanpa library.</p>
</div>`;

  /* ---------- Tab switching ---------- */
  const TAB_ON = ['bg-indigo-600', 'text-white', 'shadow-sm'];
  const TAB_OFF = ['bg-white', 'text-slate-600', 'border', 'border-slate-200', 'hover:bg-slate-50'];
  function showTab(id) {
    for (const t of tabsDef) {
      const panel = qs('#dt-panel-' + t.id);
      if (panel) panel.classList.toggle('hidden', t.id !== id);
    }
    qsa('#dt-tabs button[data-tab]').forEach(b => {
      const on = b.dataset.tab === id;
      b.classList.remove(...TAB_ON, ...TAB_OFF);
      b.classList.add(...(on ? TAB_ON : TAB_OFF));
    });
  }
  qsa('#dt-tabs button[data-tab]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  /* ---------- TAB 1 wiring: SQL ---------- */
  const sqlQ = qs('#sql-q');
  const sqlOut = qs('#sql-out');
  const sqlPlan = qs('#sql-plan');
  const sqlErrEl = qs('#sql-err');
  const sqlMeta = qs('#sql-meta');

  function sqlShowError(msg) {
    sqlErrEl.textContent = msg;
    sqlErrEl.classList.remove('hidden');
  }
  function runSQL() {
    sqlErrEl.classList.add('hidden');
    const t0 = performance.now();
    let ast, res;
    try {
      ast = sqlParse(sqlTokenize(sqlQ.value));
      res = runSelect(ast, DEMO_DB);
    } catch (e) {
      sqlShowError(e.message);
      return;
    }
    const dt = Math.max(0.1, performance.now() - t0).toFixed(2);
    const cols = res.length ? Object.keys(res[0]) : [];
    sqlOut.innerHTML = res.length
      ? gtableHTML(cols.map(c => esc(c)), res.map(r => cols.map(c => {
          const v = r[c];
          return v == null ? '<span class="text-slate-400 italic">NULL</span>' : esc(String(v));
        })), '0 baris — hasil kosong.')
      : '<p class="text-sm text-slate-500 italic py-3">0 baris — hasil kosong.</p>';
    sqlMeta.textContent = res.length + ' baris • ' + cols.length + ' kolom • ' + dt + ' ms';
    sqlPlan.innerHTML =
      '<div>📄 <b>FROM</b> <code>' + esc(ast.from.name) + '</code>' + (ast.from.alias ? ' (alias <code>' + esc(ast.from.alias) + '</code>) — full scan ' + DEMO_DB[ast.from.name].rows.length + ' baris' : ' — full scan ' + DEMO_DB[ast.from.name].rows.length + ' baris') + '</div>' +
      ast.joins.map(j => '<div>🔗 <b>JOIN</b> <code>' + esc(j.table.name) + '</code>' + (j.table.alias ? ' (alias <code>' + esc(j.table.alias) + '</code>)' : '') + ' ON <code>' + esc(sqlCondToStr(j.on)) + '</code> — nested-loop join</div>').join('') +
      (ast.where ? '<div>🔎 <b>WHERE</b> <code>' + esc(sqlCondToStr(ast.where)) + '</code></div>' : '') +
      (ast.groupBy.length ? '<div>🧺 <b>GROUP BY</b> <code>' + esc(ast.groupBy.join(', ')) + '</code></div>' : '') +
      (ast.having ? '<div>🚧 <b>HAVING</b> <code>' + esc(sqlCondToStr(ast.having)) + '</code></div>' : '') +
      (ast.ords.length ? '<div>↕️ <b>ORDER BY</b> <code>' + esc(ast.ords.map(o => sqlExprToStr(o.expr) + ' ' + o.dir).join(', ')) + '</code></div>' : '') +
      (ast.limit != null ? '<div>✂️ <b>LIMIT</b> ' + ast.limit + '</div>' : '') +
      '<div class="pt-1 text-indigo-900/60">Metode: nested-loop join + evaluasi kondisi tiga-nilai (true/false/NULL) di memori.</div>';
  }
  qs('#sql-run').addEventListener('click', runSQL);
  const sqlPreset = qs('#sql-preset');
  sqlPreset.addEventListener('change', () => {
    sqlQ.value = SQL_PRESETS[Number(sqlPreset.value)].s;
    runSQL();
  });
  sqlQ.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runSQL(); }
  });
  sqlQ.value = SQL_PRESETS[0].s;
  runSQL();

  /* ---------- TAB 2 wiring: Regex ---------- */
  const rePattern = qs('#re-pattern');
  const reTextEl = qs('#re-text');
  const reFlagsEl = qs('#re-flags');
  const reErrEl = qs('#re-err');
  const reHl = qs('#re-hl');
  const reTable = qs('#re-table');
  const reNfa = qs('#re-nfa');

  function currentFlags() {
    let f = '';
    for (const id of ['g', 'i', 'm', 's', 'u']) {
      if (qs('#re-f-' + id).checked) f += id;
    }
    return f;
  }

  function updateRegex() {
    const pat = rePattern.value;
    const flags = currentFlags();
    const text = reTextEl.value;
    reErrEl.classList.add('hidden');
    reHl.innerHTML = '';

    let matches = [];
    if (pat === '') {
      reHl.innerHTML = '<span class="text-slate-400 italic">Masukkan pola regex di atas...</span>';
      reTable.innerHTML = '<p class="text-sm text-slate-500 italic py-2">Tidak ada pola.</p>';
      reNfa.innerHTML = '<p class="text-xs text-slate-400 italic">Masukkan pola untuk melihat NFA/DFA.</p>';
      return;
    }
    try {
      const rx = new RegExp(pat, flags.includes('g') ? flags : flags + 'g');
      matches = [...text.matchAll(rx)].filter(m => m[0] !== '');
      if (matches.length > 500) matches = matches.slice(0, 500);
    } catch (e) {
      reErrEl.textContent = 'Regex tidak valid: ' + e.message;
      reErrEl.classList.remove('hidden');
      reHl.innerHTML = esc(text);
      reTable.innerHTML = '';
      reNfa.innerHTML = '<div class="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium p-3">Pola tidak valid — ' + esc(e.message) + '</div>';
      return;
    }

    /* highlight inline */
    let hl = '', last = 0;
    for (const m of matches) {
      const s = m.index, e2 = s + m[0].length;
      if (e2 <= last) continue;
      hl += esc(text.slice(last, s)) + '<mark class="bg-amber-200 text-slate-900 rounded px-0.5 font-semibold">' + esc(text.slice(s, e2)) + '</mark>';
      last = e2;
    }
    hl += esc(text.slice(last));
    reHl.innerHTML = hl === '' ? '<span class="text-slate-400 italic">teks kosong</span>' : hl;

    /* matches table */
    reTable.innerHTML = matches.length
      ? gtableHTML(
          ['#', 'Posisi', 'Match', 'Grup'],
          matches.map((m, i) => [
            String(i + 1),
            '<span class="font-mono text-xs text-slate-500">' + m.index + '</span>',
            '<mark class="bg-amber-200 rounded px-1 font-mono text-xs">' + esc(m[0]) + '</mark>',
            m.length > 1
              ? m.slice(1).map(g => g === undefined ? '<span class="text-slate-300">—</span>' : '<span class="font-mono text-xs">' + esc(g) + '</span>').join(' | ')
              : '<span class="text-slate-300">—</span>'
          ]),
          'Tidak ada kecocokan.'
        )
      : '<p class="text-sm text-slate-500 italic py-2">Tidak ada kecocokan untuk pola ini.</p>';

    /* NFA -> DFA visual */
    try {
      const node = reParse(pat);
      const alphabet = reAlphabet(node);
      if (alphabet.length > 12) {
        const e = new Error('Alfabet pola lebih dari 12 simbol — terlalu kompleks untuk visual NFA/DFA.');
        e.subset = true;
        throw e;
      }
      const nfa = buildNFA(node);
      const dfa = nfaToDFA(nfa, alphabet);
      let cols = alphabet.map(c => '<th class="px-2 py-1.5 font-mono">' + (c === ' ' ? "' '" : esc(c)) + '</th>').join('');
      const rows = dfa.states.map((st, i) => {
        let cell = '<td class="px-2 py-1.5 font-mono font-semibold">' + (i === nfa.start ? '→ ' : '') + (st.accept ? '<span class="text-emerald-600">*</span>' : '') + 'q' + i + '</td>';
        for (const c of alphabet) {
          const to = st.trans[c];
          cell += '<td class="px-2 py-1.5 font-mono text-xs">' + (to == null ? '<span class="text-slate-300">∅</span>' : 'q' + to) + '</td>';
        }
        return '<tr class="border-t border-slate-100 hover:bg-indigo-50/40">' + cell + '</tr>';
      }).join('');
      reNfa.innerHTML =
        '<div class="flex flex-wrap gap-2 mb-3 text-xs">' +
        '<span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">NFA Thompson: ' + nfa.S + ' kondisi</span>' +
        '<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">DFA subset: ' + dfa.states.length + ' kondisi</span>' +
        '<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">Σ = {' + alphabet.map(c => c === ' ' ? "' '" : c).join(', ') + '}</span>' +
        '</div>' +
        '<div class="overflow-x-auto rounded-xl border border-slate-200"><table class="gtable w-full text-sm"><thead class="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th class="px-2 py-1.5">Kondisi</th>' + cols + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<p class="text-xs text-slate-400 mt-2">→ = kondisi awal · * = kondisi akseptor · ∅ = jebakan/kosong. ε-transisi hanya ada di NFA (Thompson); DFA hasil subset construction tidak memakai ε.</p>';
    } catch (e) {
      reNfa.innerHTML = '<div class="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium p-3">⚠️ ' + esc(e.message) + '</div>' +
        '<p class="text-xs text-slate-400 mt-2">Pola dengan kelas \\d, \\w, backreference, kuantifier berjatuhan {m,n}, atau lookaround tidak divisualisasikan — tetapi penguji kecocokan (RegExp native) di kiri tetap bekerja normal.</p>';
    }
  }
  let reDeb = null;
  rePattern.addEventListener('input', () => { clearTimeout(reDeb); reDeb = setTimeout(updateRegex, 150); });
  reTextEl.addEventListener('input', () => { clearTimeout(reDeb); reDeb = setTimeout(updateRegex, 150); });
  reFlagsEl.addEventListener('change', () => { clearTimeout(reDeb); reDeb = setTimeout(updateRegex, 150); });
  updateRegex();

  /* ---------- TAB 3 wiring: Subnet ---------- */
  const snIp = qs('#sn-ip'), snPrefix = qs('#sn-prefix'), snHosts = qs('#sn-hosts');
  const snOut = qs('#sn-out'), snBin = qs('#sn-bin'), snErrEl = qs('#sn-err');

  function snCard(label, value, sub, extraCls) {
    return '<div class="' + CARD + ' p-4 ' + (extraCls || '') + '"><div class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">' + label + '</div><div class="font-mono font-bold text-slate-800 mt-1 break-all' + (extraCls ? '' : ' text-lg') + '">' + value + '</div>' + (sub ? '<div class="text-xs text-slate-500 mt-1">' + sub + '</div>' : '') + '</div>';
  }

  function runSubnet() {
    snErrEl.classList.add('hidden');
    let prefix = clampPrefix(snPrefix.value);
    const ip = parseIPv4(snIp.value);
    if (ip == null) {
      snErrEl.textContent = 'Alamat IPv4 tidak valid. Gunakan format a.b.c.d dengan oktet 0-255, contoh: 192.168.10.77';
      snErrEl.classList.remove('hidden');
      ctx.toast('Alamat IP tidak valid', 'error');
      return;
    }
    const needHosts = Number(snHosts.value);
    if (Number.isFinite(needHosts) && needHosts > 0) {
      if (needHosts > Math.pow(2, 30) - 2) {
        snErrEl.textContent = 'Jumlah host terlalu besar — maksimum praktis adalah \(2^{30} - 2\) host (/1).';
        snErrEl.classList.remove('hidden');
        return;
      }
      let h = 1;
      while (h < 32 && Math.pow(2, h) - 2 < needHosts) h++;
      prefix = 32 - h;
      snPrefix.value = prefix;
    }
    const mask = ipMaskOf(prefix);
    const wild = ipWildcard(mask);
    const net = (ip & mask) >>> 0;
    const bcast = (net | wild) >>> 0;
    const first = prefix >= 31 ? net : net + 1;
    const last = prefix >= 31 ? bcast : bcast - 1;
    const total = Math.pow(2, 32 - prefix);
    const usable = usableHosts(prefix);
    const kls = ipClass(ip);

    snOut.innerHTML =
      snCard('Network address', ipFmt(net), 'prefix /' + prefix, 'ring-2 ring-indigo-400') +
      snCard('Subnet mask', ipFmt(mask), 'wildcard: ' + ipFmt(wild)) +
      snCard('Broadcast', ipFmt(bcast), 'alamat terakhir blok') +
      snCard('Host usable (pertama)', ipFmt(first), prefix >= 31 ? '/31 - /32 tidak punya host usable' : 'alamat +1 dari network') +
      snCard('Host usable (terakhir)', ipFmt(last), prefix >= 31 ? '-' : 'alamat −1 dari broadcast') +
      snCard('Kapasitas', usable.toLocaleString('id-ID') + ' usable', 'total \(2^{' + (32 - prefix) + '}\) = ' + total.toLocaleString('id-ID') + ' · usable \(2^{' + (32 - prefix) + '}-2\)') +
      snCard('Kelas IP', kls.c, esc(kls.desc), 'ring-1 ring-fuchsia-200 bg-fuchsia-50/60') +
      snCard('Sifat alamat', ipPrivacy(ip).split('(')[0], esc(ipPrivacy(ip)), 'ring-1 ring-emerald-200 bg-emerald-50/60') +
      snCard('Bit host', (32 - prefix) + ' bit', '0 ≤ prefix ≤ 32');

    const rowHTML = (label, v) => '<div class="flex items-start gap-3"><span class="w-28 shrink-0 text-xs font-semibold text-slate-500 pt-0.5">' + label + '</span><span class="font-mono text-xs leading-5">' + binSpans(v, prefix) + '</span></div>';
    snBin.innerHTML =
      rowHTML('Alamat IP', ip) +
      rowHTML('Subnet mask', mask) +
      rowHTML('Network', net) +
      rowHTML('Broadcast', bcast);

    if (ctx.rerenderMath) ctx.rerenderMath();
  }

  const snSubOut = qs('#sn-subnet-out');
  function runSubnetSplit() {
    let base = clampPrefix(qs('#sn-base').value);
    let target = clampPrefix(qs('#sn-target').value);
    if (target <= base) {
      snSubOut.innerHTML = '<div class="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium p-3">/target harus lebih besar daripada /base (subnet dipecah, tidak digabung).</div>';
      return;
    }
    const m = target - base;
    const subs = Math.pow(2, m);
    const perHosts = usableHosts(target);
    const blockSize = Math.pow(2, 32 - target);
    const baseMask = ipMaskOf(base);
    const nets = [];
    const seed = parseIPv4('10.0.0.0') & baseMask;
    for (let i = 0; i < Math.min(4, subs); i++) nets.push(ipFmt((seed + i * blockSize) >>> 0));
    snSubOut.innerHTML =
      '<div class="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-sm text-indigo-900"><b>/' + base + ' → /' + target + '</b>: \(m\) = ' + m + ' bit baru → <b>' + subs.toLocaleString('id-ID') + ' subnet</b> (\(2^' + m + '\) ), masing-masing <b>' + perHosts.toLocaleString('id-ID') + ' host usable</b>, ukuran blok ' + blockSize.toLocaleString('id-ID') + ' alamat.' +
      '<div class="mt-2 text-xs font-mono text-indigo-700 break-all">' + nets.join(' · ') + (subs > 4 ? ' · …' : '') + '</div></div>';
    if (ctx.rerenderMath) ctx.rerenderMath();
  }

  function runSubnetAll() { runSubnet(); runSubnetSplit(); }
  qs('#sn-run').addEventListener('click', runSubnet);
  qs('#sn-subnet-run').addEventListener('click', runSubnetSplit);
  snIp.addEventListener('change', runSubnet);
  snPrefix.addEventListener('change', runSubnet);
  snHosts.addEventListener('input', () => { /* preview ringan saja */ });
  runSubnet();
  runSubnetSplit();

  /* ---------- TAB 4 wiring: Big-O ---------- */
  const bigoSvg = qs('#bigo-svg');
  const bigoMath = qs('#bigo-math');
  const bigoCompare = qs('#bigo-compare');

  function drawGrowth(g) {
    const left = 56, top = 16, w = 640 - left - 24, h = 300 - top - 40;
    const nMax = 24;
    const yv = n => Math.log10(g.f(n) + 1);
    const yMax = yv(nMax);
    const x = n => left + ((n - 1) / (nMax - 1)) * w;
    const y = n => top + h - (yv(n) / yMax) * h;
    let parts = [];
    for (let i = 4; i <= nMax; i += 4) {
      parts.push('<line x1="' + x(i) + '" y1="' + top + '" x2="' + x(i) + '" y2="' + (top + h) + '" stroke="#e2e8f0" stroke-width="1"/>');
      parts.push('<text x="' + x(i) + '" y="' + (top + h + 16) + '" text-anchor="middle" font-size="10" fill="#94a3b8">n=' + i + '</text>');
    }
    for (let k = 0; k <= 4; k++) {
      const yy = top + (h / 4) * k;
      parts.push('<line x1="' + left + '" y1="' + yy + '" x2="' + (left + w) + '" y2="' + yy + '" stroke="#f1f5f9" stroke-width="1"/>');
    }
    parts.push('<line x1="' + left + '" y1="' + top + '" x2="' + left + '" y2="' + (top + h) + '" stroke="#94a3b8" stroke-width="1.5"/>');
    parts.push('<line x1="' + left + '" y1="' + (top + h) + '" x2="' + (left + w) + '" y2="' + (top + h) + '" stroke="#94a3b8" stroke-width="1.5"/>');
    for (let k = 0; k <= 4; k++) {
      parts.push('<text x="' + (left - 8) + '" y="' + (top + (h / 4) * k + 4) + '" text-anchor="end" font-size="9" fill="#94a3b8">' + Math.round(((4 - k) / 4) * 100) + '% log</text>');
    }
    const pts = [];
    for (let n = 1; n <= nMax; n++) pts.push(x(n).toFixed(1) + ',' + y(n).toFixed(1));
    parts.push('<polyline points="' + pts.join(' ') + '" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>');
    parts.push('<circle cx="' + x(1) + '" cy="' + y(1) + '" r="4" fill="#4f46e5"/>');
    parts.push('<circle cx="' + x(nMax) + '" cy="' + y(nMax) + '" r="4" fill="#4f46e5"/>');
    parts.push('<text x="' + (left + w) + '" y="' + (y(nMax) - 10) + '" text-anchor="end" font-size="11" font-weight="700" fill="#3730a3">' + g.label + ' → f(24) = ' + fmtOps(g.f(nMax)) + '</text>');
    bigoSvg.innerHTML = parts.join('');
    bigoMath.innerHTML = 'Kompleksitas terpilih: \\(' + g.tex + '\\) · sumbu Y logaritmik · n = 1…24';
    if (ctx.rerenderMath) ctx.rerenderMath();
  }

  function growthCompareHTML(selKey) {
    return gtableHTML(
      ['Kelas', 'n=10', 'n=100', 'n=1000'],
      GROWTH.map(g => [
        (selKey === g.key ? '<b class="text-indigo-700">' + g.label + '</b>' : g.label),
        fmtOps(g.f(10)),
        fmtOps(g.f(100)),
        fmtOps(g.f(1000))
      ])
    );
  }

  function runEstimator() {
    const n = Number(qs('#bigo-n').value);
    if (!Number.isFinite(n) || n < 1) {
      ctx.toast('Masukkan n berupa angka ≥ 1', 'error');
      return;
    }
    qs('#bigo-est-out').innerHTML = gtableHTML(
      ['Kelas', 'Estimasi operasi untuk n=' + n.toLocaleString('id-ID')],
      GROWTH.map(g => [g.label, fmtOps(g.f(Number(n > 1000 ? 1000 : n)))])
    );
  }
  qs('#bigo-func').addEventListener('change', e => {
    const g = GROWTH.find(x => x.key === e.target.value) || GROWTH[3];
    drawGrowth(g);
    bigoCompare.innerHTML = growthCompareHTML(g.key);
  });
  qs('#bigo-est').addEventListener('click', runEstimator);

  const g0 = GROWTH.find(x => x.key === 'on') || GROWTH[2];
  drawGrowth(g0);
  bigoCompare.innerHTML = growthCompareHTML(g0.key);
  runEstimator();

  /* ---------- init ---------- */
  showTab('sql');
  if (ctx.refresh) {
    /* ctx.refresh disediakan harness — tidak dipakai langsung mono-thread di sini */
  }
  if (ctx.rerenderMath) await ctx.rerenderMath();
}
