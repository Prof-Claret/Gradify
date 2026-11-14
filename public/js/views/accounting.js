/**
 * Toolkit Keuangan & Akuntansi (per-prodi: Akuntansi, Manajemen, Ekonomi, Perbankan Syariah)
 * Semua perhitungan dilakukan lokal di peramban.
 */

export const subtitle = () => 'Rasio keuangan, penyusutan, NPV/IRR, BEP, HPP & PPh 21';

const CARD = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-5';
const INPUT = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';
const BTN = 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-2 text-sm transition';
const BTN2 = 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl px-4 py-2 text-sm transition';

const fmt = (n, d = 2) => {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: d }).format(n);
};
const idr = (n) => 'Rp ' + fmt(n, 0);
const pct = (n) => `${fmt(n * 100, 2)}%`;

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
function resultBox(id) {
  return `<div id="${id}" class="mt-3"></div>`;
}
function errorBox(msg) {
  return `<div class="mt-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">⚠ ${msg}</div>`;
}

const TABS = [
  { id: 'rasio', label: 'Rasio Keuangan', icon: '📊' },
  { id: 'susut', label: 'Penyusutan', icon: '📉' },
  { id: 'npv', label: 'NPV & IRR', icon: '💹' },
  { id: 'bep', label: 'BEP', icon: '⚖️' },
  { id: 'hpp', label: 'HPP', icon: '🏭' },
  { id: 'pph', label: 'PPh 21', icon: '🧾' }
];

/* ============================================================
 * 1. RASIO KEUANGAN
 * ============================================================ */
function renderRasio(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">📊 Rasio Keuangan</h3>
      <p class="text-xs text-slate-500 mb-4">Masukkan angka dari laporan keuangan (dalam rupiah).</p>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        ${field('Aset Lancar', 'r-ca', 150000000)}
        ${field('Persediaan', 'r-inv', 40000000)}
        ${field('Liabilitas Lancar', 'r-cl', 80000000)}
        ${field('Total Utang', 'r-debt', 200000000)}
        ${field('Total Ekuitas', 'r-eq', 300000000)}
        ${field('Total Aset', 'r-ta', 500000000)}
        ${field('Laba Bersih', 'r-ni', 75000000)}
        ${field('Pendapatan', 'r-rev', 600000000)}
      </div>
      <div class="flex gap-2 mt-4">
        <button id="r-go" class="${BTN}">Hitung Rasio</button>
        <button id="r-reset" class="${BTN2}">Reset</button>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        ${out('Current Ratio', 'r-o-cr')}
        ${out('Quick Ratio', 'r-o-qr')}
        ${out('Debt to Equity (DER)', 'r-o-der')}
        ${out('Debt to Asset', 'r-o-dar')}
        ${out('ROA', 'r-o-roa')}
        ${out('ROE', 'r-o-roe')}
        ${out('Net Profit Margin', 'r-o-npm')}
      </div>
      ${resultBox('r-msg')}
    </div>`;

  const val = (id) => parseFloat(pane.querySelector(`#${id}`).value) || 0;
  pane.querySelector('#r-go').addEventListener('click', () => {
    const ca = val('r-ca'), inv = val('r-inv'), cl = val('r-cl');
    const debt = val('r-debt'), eq = val('r-eq'), ta = val('r-ta');
    const ni = val('r-ni'), rev = val('r-rev');
    const set = (id, v) => { pane.querySelector(`#${id}`).textContent = v; };
    set('r-o-cr', cl ? fmt(ca / cl) + '×' : '—');
    set('r-o-qr', cl ? fmt((ca - inv) / cl) + '×' : '—');
    set('r-o-der', eq ? fmt(debt / eq) + '×' : '—');
    set('r-o-dar', ta ? pct(debt / ta) : '—');
    set('r-o-roa', ta ? pct(ni / ta) : '—');
    set('r-o-roe', eq ? pct(ni / eq) : '—');
    set('r-o-npm', rev ? pct(ni / rev) : '—');
    pane.querySelector('#r-msg').innerHTML = cl && eq && ta
      ? ''
      : errorBox('Beberapa rasio tidak dapat dihitung karena pembagi bernilai nol.');
  });
  pane.querySelector('#r-reset').addEventListener('click', () => {
    const defaults = { 'r-ca': 150000000, 'r-inv': 40000000, 'r-cl': 80000000, 'r-debt': 200000000, 'r-eq': 300000000, 'r-ta': 500000000, 'r-ni': 75000000, 'r-rev': 600000000 };
    for (const [id, v] of Object.entries(defaults)) pane.querySelector(`#${id}`).value = v;
    pane.querySelectorAll('[id^="r-o-"]').forEach(el => el.textContent = '—');
    pane.querySelector('#r-msg').innerHTML = '';
  });
}

/* ============================================================
 * 2. PENYUSUTAN
 * ============================================================ */
function renderSusut(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">📉 Penyusutan Aset Tetap</h3>
      <p class="text-xs text-slate-500 mb-4">Metode garis lurus, saldo menurun ganda, dan jumlah angka tahun.</p>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        ${field('Harga Perolehan', 's-cost', 120000000)}
        ${field('Nilai Residu', 's-salvage', 12000000)}
        ${field('Umur Ekonomis (tahun)', 's-life', 5, 'number', 'min="1"')}
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Metode</label>
          <select id="s-method" class="${INPUT}">
            <option value="straight">Garis Lurus</option>
            <option value="declining">Saldo Menurun Ganda</option>
            <option value="years">Jumlah Angka Tahun</option>
          </select>
        </div>
      </div>
      <button id="s-go" class="${BTN} mt-4">Hitung Penyusutan</button>
      ${resultBox('s-result')}
    </div>`;

  pane.querySelector('#s-go').addEventListener('click', () => {
    const cost = parseFloat(pane.querySelector('#s-cost').value) || 0;
    const salvage = parseFloat(pane.querySelector('#s-salvage').value) || 0;
    const life = Math.max(1, Math.min(parseInt(pane.querySelector('#s-life').value, 10) || 1, 50));
    const method = pane.querySelector('#s-method').value;
    const box = pane.querySelector('#s-result');

    if (cost <= 0 || salvage < 0 || salvage >= cost) {
      box.innerHTML = errorBox('Harga perolehan harus lebih besar dari nilai residu.');
      return;
    }

    const base = cost - salvage;
    let rows = [], book = cost;

    if (method === 'straight') {
      const dep = base / life;
      for (let y = 1; y <= life; y++) {
        book -= dep;
        rows.push([y, dep, book]);
      }
    } else if (method === 'declining') {
      const rate = 2 / life;
      for (let y = 1; y <= life; y++) {
        let dep = book * rate;
        if (book - dep < salvage) dep = Math.max(book - salvage, 0);
        book -= dep;
        rows.push([y, dep, book]);
      }
    } else {
      const sum = (life * (life + 1)) / 2;
      for (let y = 1; y <= life; y++) {
        const dep = (base * (life - y + 1)) / sum;
        book -= dep;
        rows.push([y, dep, book]);
      }
    }

    box.innerHTML = `
      <div class="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left px-3 py-2">Tahun</th>
              <th class="text-right px-3 py-2">Beban Penyusutan</th>
              <th class="text-right px-3 py-2">Nilai Buku</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(([y, dep, b]) => `
              <tr class="border-t border-slate-100">
                <td class="px-3 py-2">${y}</td>
                <td class="px-3 py-2 text-right">${idr(dep)}</td>
                <td class="px-3 py-2 text-right font-semibold">${idr(b)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-[11px] text-slate-400 mt-2">Total beban ${idr(base)}; nilai buku akhir ${idr(book)}.</p>`;
  });
}

/* ============================================================
 * 3. NPV & IRR
 * ============================================================ */
function npvAt(rate, flows) {
  return flows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i), 0);
}
function irr(flows) {
  let lo = -0.9999, hi = 10;
  let fLo = npvAt(lo, flows), fHi = npvAt(hi, flows);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npvAt(mid, flows);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) { hi = mid; fHi = fMid; }
    else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}

function renderNpv(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">💹 NPV, IRR & Payback Period</h3>
      <p class="text-xs text-slate-500 mb-4">Arus kas awal (tahun 0) boleh negatif. Satu angka per baris.</p>
      <div class="grid lg:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Arus Kas per Tahun</label>
          <textarea id="n-flows" rows="7" class="${INPUT} font-mono text-xs">-150000000
45000000
50000000
55000000
40000000</textarea>
        </div>
        <div class="space-y-3">
          ${field('Discount Rate (%)', 'n-rate', 12)}
          <div class="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
            Tahun 0 = investasi awal. NPV &gt; 0 berarti proyek layak pada tingkat diskonto tersebut.
          </div>
        </div>
      </div>
      <button id="n-go" class="${BTN} mt-4">Hitung</button>
      <div class="grid sm:grid-cols-3 gap-3 mt-4">
        ${out('NPV', 'n-o-npv')}
        ${out('IRR (per tahun)', 'n-o-irr')}
        ${out('Payback Period', 'n-o-pb')}
      </div>
      ${resultBox('n-msg')}
    </div>`;

  pane.querySelector('#n-go').addEventListener('click', () => {
    const flows = pane.querySelector('#n-flows').value
      .split(/[\n,;]+/).map(s => parseFloat(s.trim())).filter(n => isFinite(n));
    const rate = (parseFloat(pane.querySelector('#n-rate').value) || 0) / 100;
    const msg = pane.querySelector('#n-msg');

    if (flows.length < 2) {
      msg.innerHTML = errorBox('Masukkan minimal arus kas tahun 0 dan tahun 1.');
      return;
    }
    msg.innerHTML = '';

    const value = npvAt(rate, flows);
    const rateIrr = irr(flows);

    let cumulative = flows[0];
    let payback = null;
    if (cumulative >= 0) payback = 0;
    else {
      for (let i = 1; i < flows.length; i++) {
        const prev = cumulative;
        cumulative += flows[i];
        if (cumulative >= 0 && flows[i] !== 0) {
          payback = (i - 1) + Math.abs(prev) / flows[i];
          break;
        }
      }
    }

    pane.querySelector('#n-o-npv').textContent = idr(value);
    pane.querySelector('#n-o-irr').textContent = rateIrr === null ? 'Tidak ada akar' : pct(rateIrr);
    pane.querySelector('#n-o-pb').textContent = payback === null ? 'Tidak tercapai' : `${fmt(payback)} tahun`;
  });
}

/* ============================================================
 * 4. BEP
 * ============================================================ */
function renderBep(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">⚖️ Break Even Point</h3>
      <p class="text-xs text-slate-500 mb-4">Titik impas dalam unit dan rupiah.</p>
      <div class="grid sm:grid-cols-3 gap-3">
        ${field('Biaya Tetap', 'b-fc', 50000000)}
        ${field('Harga Jual / Unit', 'b-price', 25000)}
        ${field('Biaya Variabel / Unit', 'b-vc', 15000)}
      </div>
      <button id="b-go" class="${BTN} mt-4">Hitung BEP</button>
      <div class="grid sm:grid-cols-3 gap-3 mt-4">
        ${out('BEP (unit)', 'b-o-unit')}
        ${out('BEP (rupiah)', 'b-o-rp')}
        ${out('Margin Kontribusi / Unit', 'b-o-cm')}
      </div>
      ${resultBox('b-msg')}
    </div>`;

  pane.querySelector('#b-go').addEventListener('click', () => {
    const fc = parseFloat(pane.querySelector('#b-fc').value) || 0;
    const price = parseFloat(pane.querySelector('#b-price').value) || 0;
    const vc = parseFloat(pane.querySelector('#b-vc').value) || 0;
    const cm = price - vc;
    const msg = pane.querySelector('#b-msg');

    if (cm <= 0) {
      pane.querySelector('#b-o-unit').textContent = '—';
      pane.querySelector('#b-o-rp').textContent = '—';
      pane.querySelector('#b-o-cm').textContent = idr(cm);
      msg.innerHTML = errorBox('Harga jual harus lebih besar dari biaya variabel per unit.');
      return;
    }
    msg.innerHTML = '';
    const units = fc / cm;
    pane.querySelector('#b-o-unit').textContent = `${fmt(Math.ceil(units), 0)} unit`;
    pane.querySelector('#b-o-rp').textContent = idr(units * price);
    pane.querySelector('#b-o-cm').textContent = idr(cm);
  });
}

/* ============================================================
 * 5. HPP
 * ============================================================ */
function renderHpp(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">🏭 Harga Pokok Produksi</h3>
      <p class="text-xs text-slate-500 mb-4">Menghitung HPP dan harga pokok per unit.</p>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        ${field('Biaya Bahan Baku', 'h-mat', 60000000)}
        ${field('Biaya Tenaga Kerja Langsung', 'h-lab', 30000000)}
        ${field('Overhead Pabrik', 'h-oh', 15000000)}
        ${field('Jumlah Unit Produksi', 'h-units', 5000, 'number', 'min="1"')}
      </div>
      <div class="grid sm:grid-cols-2 gap-3 mt-3">
        ${field('Persediaan Awal Barang Dalam Proses', 'h-wip0', 0)}
        ${field('Persediaan Akhir Barang Dalam Proses', 'h-wip1', 0)}
      </div>
      <button id="h-go" class="${BTN} mt-4">Hitung HPP</button>
      <div class="grid sm:grid-cols-3 gap-3 mt-4">
        ${out('Total HPP', 'h-o-total')}
        ${out('HPP / Unit', 'h-o-unit')}
        ${out('Biaya Konversi', 'h-o-conv')}
      </div>
      ${resultBox('h-msg')}
    </div>`;

  pane.querySelector('#h-go').addEventListener('click', () => {
    const n = (id) => parseFloat(pane.querySelector(`#${id}`).value) || 0;
    const units = Math.max(1, n('h-units'));
    const total = n('h-mat') + n('h-lab') + n('h-oh') + n('h-wip0') - n('h-wip1');
    pane.querySelector('#h-o-total').textContent = idr(total);
    pane.querySelector('#h-o-unit').textContent = idr(total / units);
    pane.querySelector('#h-o-conv').textContent = idr(n('h-lab') + n('h-oh'));
    pane.querySelector('#h-msg').innerHTML = total < 0
      ? errorBox('HPP negatif — periksa nilai persediaan barang dalam proses.')
      : '';
  });
}

/* ============================================================
 * 6. PPh 21 (dis sederhanakan)
 * ============================================================ */
const PTKP = {
  TK0: 54000000, K0: 58500000, K1: 63000000, K2: 67500000, K3: 72000000
};

function renderPph(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">🧾 PPh 21 Karyawan (Simplified)</h3>
      <p class="text-xs text-slate-500 mb-4">Perhitungan estimasi tahunan tanpa tunjangan khusus. Bukan pengganti perhitungan resmi.</p>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        ${field('Penghasilan Bruto / Bulan', 'p-gross', 8000000)}
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Status PTKP</label>
          <select id="p-status" class="${INPUT}">
            <option value="TK0">TK/0 — Rp 54.000.000</option>
            <option value="K0">K/0 — Rp 58.500.000</option>
            <option value="K1">K/1 — Rp 63.000.000</option>
            <option value="K2">K/2 — Rp 67.500.000</option>
            <option value="K3">K/3 — Rp 72.000.000</option>
          </select>
        </div>
        ${field('Iuran Pensiun / Bulan', 'p-pension', 200000)}
      </div>
      <button id="p-go" class="${BTN} mt-4">Hitung PPh 21</button>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        ${out('Bruto / Tahun', 'p-o-gross')}
        ${out('PKP (dibulatkan)', 'p-o-pkp')}
        ${out('PPh 21 / Tahun', 'p-o-year')}
        ${out('PPh 21 / Bulan', 'p-o-month')}
      </div>
      ${resultBox('p-detail')}
    </div>`;

  pane.querySelector('#p-go').addEventListener('click', () => {
    const grossMonth = parseFloat(pane.querySelector('#p-gross').value) || 0;
    const pensionMonth = parseFloat(pane.querySelector('#p-pension').value) || 0;
    const status = pane.querySelector('#p-status').value;
    const annualGross = grossMonth * 12;
    const netIncome = Math.max(0, annualGross - pensionMonth * 12);
    const pkp = Math.max(0, Math.floor((netIncome - PTKP[status]) / 1000) * 1000);

    const brackets = [
      [60000000, 0.05],
      [190000000, 0.15],
      [250000000, 0.25],
      [4500000000, 0.30],
      [Infinity, 0.35]
    ];
    let remaining = pkp, tax = 0;
    const rows = [];
    for (const [limit, rate] of brackets) {
      if (remaining <= 0) break;
      const slice = Math.min(remaining, limit);
      const amount = slice * rate;
      tax += amount;
      rows.push([rate, slice, amount]);
      remaining -= slice;
    }

    pane.querySelector('#p-o-gross').textContent = idr(annualGross);
    pane.querySelector('#p-o-pkp').textContent = idr(pkp);
    pane.querySelector('#p-o-year').textContent = idr(tax);
    pane.querySelector('#p-o-month').textContent = idr(tax / 12);
    pane.querySelector('#p-detail').innerHTML = rows.length
      ? `<div class="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr><th class="text-left px-3 py-2">Tarif</th><th class="text-right px-3 py-2">Dasar Pengenaan</th><th class="text-right px-3 py-2">Pajak</th></tr>
            </thead>
            <tbody>
              ${rows.map(([rate, slice, amount]) => `
                <tr class="border-t border-slate-100">
                  <td class="px-3 py-2">${Math.round(rate * 100)}%</td>
                  <td class="px-3 py-2 text-right">${idr(slice)}</td>
                  <td class="px-3 py-2 text-right font-semibold">${idr(amount)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`
      : '';
  });
}

const RENDERERS = {
  rasio: renderRasio,
  susut: renderSusut,
  npv: renderNpv,
  bep: renderBep,
  hpp: renderHpp,
  pph: renderPph
};

export async function render(main, ctx) {
  main.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-extrabold text-slate-800">🧾 Toolkit Keuangan & Akuntansi</h2>
      <p class="text-sm text-slate-500 mt-1">Rasio keuangan, penyusutan aset, studi kelayakan (NPV/IRR), BEP, HPP, dan estimasi PPh 21 — dihitung lokal di peramban.</p>
    </div>
    <div id="acc-tabbar" class="flex flex-wrap gap-2 py-1"></div>
    <div id="acc-content" class="mt-5"></div>`;

  const bar = main.querySelector('#acc-tabbar');
  const content = main.querySelector('#acc-content');
  let current = 'rasio';

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
