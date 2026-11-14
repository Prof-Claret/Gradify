/**
 * Toolkit Teknik Sipil (per-prodi: Teknik Sipil, Arsitektur)
 * Perhitungan volume, material, besi, kemiringan, RAB — lokal di peramban.
 */

export const subtitle = () => 'Konversi satuan, volume beton, berat besi, kemiringan & RAB';

const CARD = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-5';
const INPUT = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';
const BTN = 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-2 text-sm transition';
const BTN2 = 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl px-4 py-2 text-sm transition';

const fmt = (n, d = 2) => {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: d }).format(n);
};
const idr = (n) => 'Rp ' + fmt(n, 0);
const escAttr = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function field(label, id, value = '', type = 'number', extra = '') {
  return `<div>
    <label class="block text-xs font-semibold text-slate-600 mb-1">${label}</label>
    <input id="${id}" type="${type}" value="${value}" class="${INPUT}" ${extra} />
  </div>`;
}
function out(label, id) {
  return `<div class="bg-slate-50 border border-slate-200 rounded-xl p-3">
    <p class="text-[11px] text-slate-500">${label}</p>
    <p id="${id}" class="text-lg font-bold text-slate-800 mt-0.5">—</p>
  </div>`;
}

const TABS = [
  { id: 'konversi', label: 'Konversi Satuan', icon: '📐' },
  { id: 'beton', label: 'Volume & Beton', icon: '🧱' },
  { id: 'besi', label: 'Berat Besi', icon: '🔩' },
  { id: 'slope', label: 'Kemiringan', icon: '📏' },
  { id: 'rab', label: 'RAB Sederhana', icon: '💰' },
  { id: 'mutu', label: 'Mutu Beton', icon: '📋' }
];

/* ============================================================
 * 1. KONVERSI SATUAN
 * ============================================================ */
const UNIT_GROUPS = {
  panjang: { label: 'Panjang (meter)', units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, inci: 0.0254, kaki: 0.3048 } },
  berat: { label: 'Berat (kg)', units: { gram: 0.001, kg: 1, ton: 1000, kuintal: 100, pon: 0.45359237 } },
  luas: { label: 'Luas (m²)', units: { 'cm²': 0.0001, 'm²': 1, are: 100, hektar: 10000 } },
  volume: { label: 'Volume (m³)', units: { 'cm³': 0.000001, liter: 0.001, 'm³': 1, galon: 0.00378541 } }
};

function renderKonversi(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">📐 Konversi Satuan</h3>
      <p class="text-xs text-slate-500 mb-4">Konversi satuan panjang, berat, luas, dan volume.</p>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Kategori</label>
          <select id="k-group" class="${INPUT}">
            ${Object.entries(UNIT_GROUPS).map(([k, g]) => `<option value="${k}">${g.label}</option>`).join('')}
          </select>
        </div>
        ${field('Nilai', 'k-value', 1)}
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Dari</label>
          <select id="k-from" class="${INPUT}"></select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Ke</label>
          <select id="k-to" class="${INPUT}"></select>
        </div>
      </div>
      <button id="k-go" class="${BTN} mt-4">Konversi</button>
      <div class="mt-4">${out('Hasil', 'k-result')}</div>
    </div>`;

  const groupSel = pane.querySelector('#k-group');
  const fromSel = pane.querySelector('#k-from');
  const toSel = pane.querySelector('#k-to');

  function fillUnits() {
    const units = Object.keys(UNIT_GROUPS[groupSel.value].units);
    fromSel.innerHTML = units.map(u => `<option>${u}</option>`).join('');
    toSel.innerHTML = units.map(u => `<option>${u}</option>`).join('');
    toSel.selectedIndex = Math.min(1, units.length - 1);
  }
  groupSel.addEventListener('change', fillUnits);
  fillUnits();

  pane.querySelector('#k-go').addEventListener('click', () => {
    const group = UNIT_GROUPS[groupSel.value];
    const value = parseFloat(pane.querySelector('#k-value').value) || 0;
    const from = group.units[fromSel.value];
    const to = group.units[toSel.value];
    const result = (value * from) / to;
    pane.querySelector('#k-result').textContent = `${fmt(result, 6)} ${toSel.value}`;
  });
}

/* ============================================================
 * 2. VOLUME & MATERIAL BETON
 * ============================================================ */
function renderBeton(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">🧱 Volume Beton & Material</h3>
      <p class="text-xs text-slate-500 mb-4">Estimasi volume dan kebutuhan material untuk campuran 1 : 2 : 3.</p>
      <div class="grid sm:grid-cols-3 gap-3">
        ${field('Panjang (m)', 'b-p', 6)}
        ${field('Lebar (m)', 'b-l', 0.3)}
        ${field('Tinggi / Tebal (m)', 'b-t', 0.4)}
      </div>
      <div class="grid sm:grid-cols-2 gap-3 mt-3">
        ${field('Faktor Pemborosan (%)', 'b-waste', 5)}
        ${field('Harga Beton Ready Mix / m³ (opsional)', 'b-price', 1200000)}
      </div>
      <button id="b-go" class="${BTN} mt-4">Hitung</button>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        ${out('Volume Bersih', 'b-o-vol')}
        ${out('Volume + Waste', 'b-o-total')}
        ${out('Semen (50 kg)', 'b-o-cement')}
        ${out('Pasir', 'b-o-sand')}
      </div>
      <div class="grid sm:grid-cols-3 gap-3 mt-3">
        ${out('Kerikil', 'b-o-gravel')}
        ${out('Air (±)', 'b-o-water')}
        ${out('Estimasi Biaya Beton', 'b-o-cost')}
      </div>
      <p class="text-[11px] text-slate-400 mt-3">Koefisien pendekatan per m³ beton: semen 384 kg, pasir 0,55 m³, kerikil 0,75 m³, air 190 liter. Sesuaikan dengan SNI/mutu beton proyek.</p>
    </div>`;

  pane.querySelector('#b-go').addEventListener('click', () => {
    const p = parseFloat(pane.querySelector('#b-p').value) || 0;
    const l = parseFloat(pane.querySelector('#b-l').value) || 0;
    const t = parseFloat(pane.querySelector('#b-t').value) || 0;
    const waste = Math.max(0, parseFloat(pane.querySelector('#b-waste').value) || 0) / 100;
    const price = parseFloat(pane.querySelector('#b-price').value) || 0;
    const vol = p * l * t;
    const total = vol * (1 + waste);
    const set = (id, v) => pane.querySelector(`#${id}`).textContent = v;
    set('b-o-vol', `${fmt(vol, 3)} m³`);
    set('b-o-total', `${fmt(total, 3)} m³`);
    set('b-o-cement', `${fmt(Math.ceil(total * 384 / 50), 0)} sak`);
    set('b-o-sand', `${fmt(total * 0.55, 3)} m³`);
    set('b-o-gravel', `${fmt(total * 0.75, 3)} m³`);
    set('b-o-water', `${fmt(total * 190, 0)} liter`);
    set('b-o-cost', price ? idr(total * price) : '—');
  });
}

/* ============================================================
 * 3. BERAT BESI
 * ============================================================ */
function renderBesi(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">🔩 Berat Besi Tulangan</h3>
      <p class="text-xs text-slate-500 mb-4">Berat teoretis besi beton: 0,006165 × d² × L (kg).</p>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        ${field('Diameter (mm)', 's-d', 10, 'number', 'min="1" step="0.1"')}
        ${field('Panjang per Batang (m)', 's-l', 12)}
        ${field('Jumlah Batang', 's-n', 20, 'number', 'min="1"')}
        ${field('Waste (%)', 's-waste', 3)}
      </div>
      <div class="grid sm:grid-cols-2 gap-3 mt-3">
        ${field('Harga Besi / kg (opsional)', 's-price', 15000)}
      </div>
      <button id="s-go" class="${BTN} mt-4">Hitung Berat</button>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        ${out('Berat / Batang', 's-o-bar')}
        ${out('Total Panjang', 's-o-len')}
        ${out('Total Berat', 's-o-weight')}
        ${out('Estimasi Biaya', 's-o-cost')}
      </div>
    </div>`;

  pane.querySelector('#s-go').addEventListener('click', () => {
    const d = Math.max(0.1, parseFloat(pane.querySelector('#s-d').value) || 0);
    const len = Math.max(0, parseFloat(pane.querySelector('#s-l').value) || 0);
    const n = Math.max(1, parseInt(pane.querySelector('#s-n').value, 10) || 1);
    const waste = Math.max(0, parseFloat(pane.querySelector('#s-waste').value) || 0) / 100;
    const price = parseFloat(pane.querySelector('#s-price').value) || 0;
    const perBar = 0.006165 * d * d * len;
    const totalLen = len * n;
    const totalWeight = perBar * n * (1 + waste);
    const set = (id, v) => pane.querySelector(`#${id}`).textContent = v;
    set('s-o-bar', `${fmt(perBar, 3)} kg`);
    set('s-o-len', `${fmt(totalLen, 2)} m`);
    set('s-o-weight', `${fmt(totalWeight, 3)} kg`);
    set('s-o-cost', price ? idr(totalWeight * price) : '—');
  });
}

/* ============================================================
 * 4. KEMIRINGAN
 * ============================================================ */
function renderSlope(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">📏 Kemiringan & Ramp</h3>
      <p class="text-xs text-slate-500 mb-4">Hitung slope, sudut, dan rasio kemiringan.</p>
      <div class="grid sm:grid-cols-2 gap-3">
        ${field('Beda Tinggi / Rise (m)', 'd-rise', 1.2)}
        ${field('Jarak Datar / Run (m)', 'd-run', 12)}
      </div>
      <button id="d-go" class="${BTN} mt-4">Hitung</button>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        ${out('Slope', 'd-o-pct')}
        ${out('Sudut', 'd-o-deg')}
        ${out('Rasio 1 : x', 'd-o-ratio')}
        ${out('Panjang Miring', 'd-o-len')}
      </div>
      <div id="d-msg" class="mt-3"></div>
    </div>`;

  pane.querySelector('#d-go').addEventListener('click', () => {
    const rise = Math.abs(parseFloat(pane.querySelector('#d-rise').value) || 0);
    const run = Math.abs(parseFloat(pane.querySelector('#d-run').value) || 0);
    const msg = pane.querySelector('#d-msg');
    if (run === 0) {
      msg.innerHTML = `<div class="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">Jarak datar tidak boleh nol.</div>`;
      return;
    }
    msg.innerHTML = '';
    const slope = rise / run;
    const deg = Math.atan(slope) * 180 / Math.PI;
    const set = (id, v) => pane.querySelector(`#${id}`).textContent = v;
    set('d-o-pct', `${fmt(slope * 100)}%`);
    set('d-o-deg', `${fmt(deg)}°`);
    set('d-o-ratio', `1 : ${fmt(run / (rise || 1), 2)}`);
    set('d-o-len', `${fmt(Math.hypot(rise, run), 3)} m`);
  });
}

/* ============================================================
 * 5. RAB SEDERHANA
 * ============================================================ */
function renderRab(pane) {
  let items = [
    { name: 'Pekerjaan galian tanah', volume: 12, unit: 'm³', price: 85000 },
    { name: 'Pekerjaan beton struktur', volume: 4, unit: 'm³', price: 1200000 }
  ];

  function draw() {
    const total = items.reduce((sum, it) => sum + (Number(it.volume) || 0) * (Number(it.price) || 0), 0);
    pane.innerHTML = `
      <div class="${CARD}">
        <h3 class="font-bold text-slate-800 mb-1">💰 RAB Sederhana</h3>
        <p class="text-xs text-slate-500 mb-4">Daftar item pekerjaan, volume, dan harga satuan.</p>
        <div class="overflow-x-auto rounded-xl border border-slate-200">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="text-left px-3 py-2">Uraian Pekerjaan</th>
                <th class="px-3 py-2 w-24">Volume</th>
                <th class="px-3 py-2 w-20">Satuan</th>
                <th class="px-3 py-2 w-40">Harga Satuan</th>
                <th class="px-3 py-2 w-40 text-right">Jumlah</th>
                <th class="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody id="rab-body">
              ${items.map((it, i) => `
                <tr class="border-t border-slate-100">
                  <td class="px-2 py-1"><input data-i="${i}" data-k="name" value="${escAttr(it.name)}" class="${INPUT} !py-1.5" /></td>
                  <td class="px-2 py-1"><input data-i="${i}" data-k="volume" type="number" step="0.01" value="${it.volume}" class="${INPUT} !py-1.5" /></td>
                  <td class="px-2 py-1"><input data-i="${i}" data-k="unit" value="${escAttr(it.unit)}" class="${INPUT} !py-1.5" /></td>
                  <td class="px-2 py-1"><input data-i="${i}" data-k="price" type="number" value="${it.price}" class="${INPUT} !py-1.5" /></td>
                  <td class="px-3 py-1 text-right font-semibold" id="rab-amt-${i}">${idr((Number(it.volume) || 0) * (Number(it.price) || 0))}</td>
                  <td class="px-2 py-1 text-center"><button data-del="${i}" class="text-rose-600 hover:text-rose-800 font-bold">✕</button></td>
                </tr>`).join('')}
            </tbody>
            <tfoot class="bg-indigo-50">
              <tr>
                <td colspan="4" class="px-3 py-2 font-bold text-indigo-900 text-right">Total RAB</td>
                <td class="px-3 py-2 text-right font-extrabold text-indigo-900" id="rab-total">${idr(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="flex gap-2 mt-3">
          <button id="rab-add" class="${BTN}">+ Tambah Item</button>
          <button id="rab-reset" class="${BTN2}">Reset</button>
        </div>
        <p class="text-[11px] text-slate-400 mt-2">Total ${idr(total)} · ${items.length} item. Nilai belum termasuk PPN dan biaya tak terduga.</p>
      </div>`;

    pane.querySelectorAll('#rab-body input').forEach(inp => {
      inp.addEventListener('input', () => {
        const i = Number(inp.dataset.i);
        const k = inp.dataset.k;
        items[i][k] = k === 'volume' || k === 'price' ? (parseFloat(inp.value) || 0) : inp.value;
        if (k === 'volume' || k === 'price') {
          const amount = (Number(items[i].volume) || 0) * (Number(items[i].price) || 0);
          const amtCell = pane.querySelector(`#rab-amt-${i}`);
          if (amtCell) amtCell.textContent = idr(amount);
          const totalCell = pane.querySelector('#rab-total');
          if (totalCell) totalCell.textContent = idr(
            items.reduce((sum, it) => sum + (Number(it.volume) || 0) * (Number(it.price) || 0), 0)
          );
        }
      });
    });
    pane.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        items.splice(Number(btn.dataset.del), 1);
        draw();
      });
    });
    pane.querySelector('#rab-add').addEventListener('click', () => {
      items.push({ name: 'Item pekerjaan baru', volume: 0, unit: 'm³', price: 0 });
      draw();
    });
    pane.querySelector('#rab-reset').addEventListener('click', () => {
      items = [];
      draw();
    });
  }

  draw();
}

/* ============================================================
 * 6. REFERENSI MUTU BETON
 * ============================================================ */
function renderMutu(pane) {
  const rows = [
    ['K-175', '14,5', '1 : 2 : 3', 'Non-struktural ringan'],
    ['K-200', '16,4', '1 : 2 : 3', 'Non-struktural'],
    ['K-225', '19,3', '1 : 2 : 3', 'Struktur ringan'],
    ['K-250', '20,8', '1 : 1,5 : 2,5', 'Struktur umum'],
    ['K-300', '24,9', '1 : 1,5 : 2,5', 'Struktur bertulang'],
    ['K-350', '29,0', '1 : 1,5 : 2', 'Struktur berat'],
    ['K-400', '33,2', '1 : 1 : 2', 'Prasarana berat'],
    ['K-500', '41,5', '1 : 1 : 1,5', 'Pracetak / khusus']
  ];
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">📋 Referensi Mutu Beton</h3>
      <p class="text-xs text-slate-500 mb-4">Nilai pendekatan konversi K (kuat tekan kubus) ke fc' (silinder) dan rasio campuran volume.</p>
      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left px-3 py-2">Mutu</th>
              <th class="text-right px-3 py-2">fc' (MPa)</th>
              <th class="text-left px-3 py-2">Semen : Pasir : Kerikil</th>
              <th class="text-left px-3 py-2">Penggunaan umum</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(([k, mpa, mix, use]) => `
              <tr class="border-t border-slate-100">
                <td class="px-3 py-2 font-semibold">${k}</td>
                <td class="px-3 py-2 text-right">${mpa}</td>
                <td class="px-3 py-2">${mix}</td>
                <td class="px-3 py-2 text-slate-600">${use}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-[11px] text-slate-400 mt-3">Angka bersifat estimasi untuk perencanaan awal. Selalu gunakan hasil uji laboratorium dan ketentuan SNI untuk pekerjaan struktural.</p>
    </div>`;
}

const RENDERERS = {
  konversi: renderKonversi,
  beton: renderBeton,
  besi: renderBesi,
  slope: renderSlope,
  rab: renderRab,
  mutu: renderMutu
};

export async function render(main) {
  main.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-extrabold text-slate-800">🏗️ Toolkit Teknik Sipil</h2>
      <p class="text-sm text-slate-500 mt-1">Konversi satuan, estimasi volume beton & material, berat besi, kemiringan, RAB, dan referensi mutu beton.</p>
    </div>
    <div id="civil-tabbar" class="flex flex-wrap gap-2 py-1"></div>
    <div id="civil-content" class="mt-5"></div>`;

  const bar = main.querySelector('#civil-tabbar');
  const content = main.querySelector('#civil-content');
  let current = 'konversi';

  function drawBar() {
    bar.innerHTML = TABS.map(t => {
      const active = t.id === current;
      return `<button type="button" data-tab="${t.id}" class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${active ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">${t.icon} ${t.label}</button>`;
    }).join('');
  }

  function draw() {
    const pane = document.createElement('div');
    content.replaceChildren(pane);
    RENDERERS[current](pane);
  }

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn || btn.dataset.tab === current) return;
    current = btn.dataset.tab;
    drawBar();
    draw();
  });

  drawBar();
  draw();
}

export default { render, subtitle };
