/**
 * Toolkit Hukum (per-prodi: Ilmu Hukum, Hukum Keluarga Islam, Hukum Ekonomi Syariah)
 * Kalkulator daluwarsa, tenggat proses, timeline kasus, checklist berkas,
 * dan referensi pasal. Data lokal disimpan di localStorage.
 */

export const subtitle = () => 'Daluwarsa, tenggat proses, timeline kasus, checklist berkas & referensi pasal';

const CARD = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-5';
const INPUT = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';
const BTN = 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-2 text-sm transition';
const BTN2 = 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl px-4 py-2 text-sm transition';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- date helpers (UTC agar bebas timezone) ---------- */
function parseDate(value) {
  const [y, m, d] = String(value || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}
function todayUTC() {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}
function fmtDate(dt) {
  if (!dt) return '—';
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function addParts(dt, { years = 0, months = 0, days = 0 }) {
  const d = new Date(dt.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
function addBusinessDays(dt, days) {
  const d = new Date(dt.getTime());
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}
function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function inputDateValue(dt) {
  return dt.toISOString().slice(0, 10);
}

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
  { id: 'daluwarsa', label: 'Daluwarsa', icon: '⏳' },
  { id: 'tenggat', label: 'Tenggat Proses', icon: '🗓️' },
  { id: 'timeline', label: 'Timeline Kasus', icon: '🧭' },
  { id: 'berkas', label: 'Checklist Berkas', icon: '📁' },
  { id: 'pasal', label: 'Referensi Pasal', icon: '📖' }
];

/* ============================================================
 * 1. DALUWARSA
 * ============================================================ */
const PRESETS = {
  'pidana-berat': { label: 'Penuntutan pidana — ancaman > 3 tahun', years: 12 },
  'pidana-sedang': { label: 'Penuntutan pidana — ancaman 1–3 tahun', years: 6 },
  'pidana-ringan': { label: 'Penuntutan pidana — ancaman < 1 tahun', years: 3 },
  pelanggaran: { label: 'Pelanggaran', years: 1 },
  perdata: { label: 'Daluwarsa perdata umum', years: 30 },
  tagihan: { label: 'Tagihan / utang jangka pendek', years: 3 },
  eksekusi: { label: 'Daluwarsa eksekusi putusan', years: 5 },
  custom: { label: 'Custom (isi manual)', years: 0 }
};

function renderDaluwarsa(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">⏳ Kalkulator Daluwarsa</h3>
      <p class="text-xs text-slate-500 mb-4">Hitung berakhirnya masa daluwarsa dan sisa waktu dari hari ini.</p>
      <div class="grid sm:grid-cols-2 gap-3">
        ${field('Tanggal Mulai / Peristiwa', 'l-start', inputDateValue(todayUTC()), 'date')}
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Jenis Daluwarsa</label>
          <select id="l-type" class="${INPUT}">
            ${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-cols-3 gap-2 sm:col-span-2">
          ${field('Tahun', 'l-years', 12, 'number', 'min="0"')}
          ${field('Bulan', 'l-months', 0, 'number', 'min="0"')}
          ${field('Hari', 'l-days', 0, 'number', 'min="0"')}
        </div>
      </div>
      <button id="l-go" class="${BTN} mt-4">Hitung Daluwarsa</button>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        ${out('Tanggal Berakhir', 'l-o-end')}
        ${out('Sisa Waktu', 'l-o-left')}
        ${out('Total Rentang', 'l-o-span')}
        ${out('Status', 'l-o-status')}
      </div>
      <div id="l-msg" class="mt-3"></div>
      <p class="text-[11px] text-slate-400 mt-3">Referensi umum: KUHP lama (daluwarsa penuntutan), KUHPerdata (30 tahun). Selalu periksa peraturan terbaru dan putusan pengadilan.</p>
    </div>`;

  const typeSel = pane.querySelector('#l-type');
  typeSel.addEventListener('change', () => {
    const preset = PRESETS[typeSel.value];
    if (typeSel.value !== 'custom') {
      pane.querySelector('#l-years').value = preset.years;
      pane.querySelector('#l-months').value = 0;
      pane.querySelector('#l-days').value = 0;
    }
  });

  pane.querySelector('#l-go').addEventListener('click', () => {
    const start = parseDate(pane.querySelector('#l-start').value);
    const years = Math.max(0, parseInt(pane.querySelector('#l-years').value, 10) || 0);
    const months = Math.max(0, parseInt(pane.querySelector('#l-months').value, 10) || 0);
    const days = Math.max(0, parseInt(pane.querySelector('#l-days').value, 10) || 0);
    const msg = pane.querySelector('#l-msg');
    if (!start || (!years && !months && !days)) {
      msg.innerHTML = `<div class="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">Isi tanggal mulai dan minimal satu durasi.</div>`;
      return;
    }
    msg.innerHTML = '';

    const end = addParts(start, { years, months, days });
    const now = todayUTC();
    const remaining = daysBetween(now, end);
    const total = daysBetween(start, end);
    const set = (id, v) => pane.querySelector(`#${id}`).textContent = v;

    set('l-o-end', fmtDate(end));
    set('l-o-span', `${total.toLocaleString('id-ID')} hari`);
    if (remaining > 0) {
      set('l-o-left', `${remaining.toLocaleString('id-ID')} hari lagi`);
      set('l-o-status', 'Belum daluwarsa');
      pane.querySelector('#l-o-status').className = 'text-lg font-bold text-emerald-600 mt-0.5';
    } else if (remaining === 0) {
      set('l-o-left', 'Hari ini');
      set('l-o-status', 'Berakhir hari ini');
      pane.querySelector('#l-o-status').className = 'text-lg font-bold text-amber-600 mt-0.5';
    } else {
      set('l-o-left', `Lewat ${Math.abs(remaining).toLocaleString('id-ID')} hari`);
      set('l-o-status', 'Sudah daluwarsa');
      pane.querySelector('#l-o-status').className = 'text-lg font-bold text-rose-600 mt-0.5';
    }
  });
}

/* ============================================================
 * 2. TENGGAT PROSES
 * ============================================================ */
function renderTenggat(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">🗓️ Kalkulator Tenggat Proses</h3>
      <p class="text-xs text-slate-500 mb-4">Hitung batas akhir berdasarkan hari kalender atau hari kerja.</p>
      <div class="grid sm:grid-cols-3 gap-3">
        ${field('Tanggal Mulai', 't-start', inputDateValue(todayUTC()), 'date')}
        ${field('Jumlah Hari', 't-days', 14, 'number', 'min="0"')}
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Jenis Hari</label>
          <select id="t-mode" class="${INPUT}">
            <option value="calendar">Hari Kalender</option>
            <option value="business">Hari Kerja (Senin–Jumat)</option>
          </select>
        </div>
      </div>
      <button id="t-go" class="${BTN} mt-4">Hitung Tenggat</button>
      <div class="grid sm:grid-cols-3 gap-3 mt-4">
        ${out('Batas Akhir', 't-o-end')}
        ${out('Hari Tersisa', 't-o-left')}
        ${out('Hari Kerja Tersisa', 't-o-work')}
      </div>
      <div id="t-msg" class="mt-3"></div>
    </div>`;

  pane.querySelector('#t-go').addEventListener('click', () => {
    const start = parseDate(pane.querySelector('#t-start').value);
    const days = Math.max(0, parseInt(pane.querySelector('#t-days').value, 10) || 0);
    const mode = pane.querySelector('#t-mode').value;
    const msg = pane.querySelector('#t-msg');
    if (!start) {
      msg.innerHTML = `<div class="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">Tanggal mulai wajib diisi.</div>`;
      return;
    }
    msg.innerHTML = '';

    const end = mode === 'business' ? addBusinessDays(start, days) : addParts(start, { days });
    const now = todayUTC();
    const left = daysBetween(now, end);
    let work = 0;
    if (left > 0) {
      const cursor = new Date(now.getTime());
      while (daysBetween(cursor, end) > 0) {
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        const dow = cursor.getUTCDay();
        if (dow !== 0 && dow !== 6) work++;
      }
    }
    const set = (id, v) => pane.querySelector(`#${id}`).textContent = v;
    set('t-o-end', fmtDate(end));
    set('t-o-left', left >= 0 ? `${left} hari` : `Lewat ${Math.abs(left)} hari`);
    set('t-o-work', `${work} hari kerja`);
  });
}

/* ============================================================
 * 3. TIMELINE KASUS (localStorage)
 * ============================================================ */
function renderTimeline(pane, ctx) {
  const key = `gradify_law_timeline_${ctx.user?.id || 'guest'}`;
  let items = [];
  try { items = JSON.parse(localStorage.getItem(key) || '[]'); } catch { items = []; }

  function save() {
    try { localStorage.setItem(key, JSON.stringify(items)); } catch { /* ignore */ }
  }

  function draw() {
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    pane.innerHTML = `
      <div class="${CARD}">
        <h3 class="font-bold text-slate-800 mb-1">🧭 Timeline Kasus</h3>
        <p class="text-xs text-slate-500 mb-4">Catat kronologi peristiwa penting. Disimpan di perangkat ini.</p>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          ${field('Tanggal', 'tl-date', inputDateValue(todayUTC()), 'date')}
          ${field('Peristiwa', 'tl-title', '', 'text', 'placeholder="cth. Surat kuasa diterima"')}
          <div class="lg:col-span-2">${field('Catatan', 'tl-note', '', 'text', 'placeholder="Keterangan singkat (opsional)"')}</div>
        </div>
        <div class="flex gap-2 mt-3">
          <button id="tl-add" class="${BTN}">+ Tambah Peristiwa</button>
          <button id="tl-clear" class="${BTN2}">Hapus Semua</button>
        </div>
        <div class="mt-4">
          ${sorted.length ? `<ol class="relative border-l-2 border-indigo-200 ml-2 space-y-4">
            ${sorted.map(it => `
              <li class="ml-4">
                <span class="absolute -left-[7px] w-3 h-3 rounded-full bg-indigo-500"></span>
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-semibold text-indigo-600">${fmtDate(parseDate(it.date))}</p>
                    <p class="text-sm font-semibold text-slate-800">${esc(it.title)}</p>
                    ${it.note ? `<p class="text-xs text-slate-500 mt-0.5">${esc(it.note)}</p>` : ''}
                  </div>
                  <button data-del="${esc(it.id)}" class="text-rose-500 hover:text-rose-700 text-xs font-semibold shrink-0">Hapus</button>
                </div>
              </li>`).join('')}
          </ol>` : `<p class="text-sm text-slate-400 text-center py-6">Belum ada peristiwa. Tambahkan kronologi pertama.</p>`}
        </div>
      </div>`;

    pane.querySelector('#tl-add').addEventListener('click', () => {
      const date = pane.querySelector('#tl-date').value;
      const title = pane.querySelector('#tl-title').value.trim();
      const note = pane.querySelector('#tl-note').value.trim();
      if (!date || !title) return;
      items.push({ id: String(Date.now()), date, title, note });
      save();
      draw();
    });
    pane.querySelector('#tl-clear').addEventListener('click', () => {
      if (!items.length || !confirm('Hapus semua peristiwa pada timeline?')) return;
      items = [];
      save();
      draw();
    });
    pane.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        items = items.filter(it => it.id !== btn.dataset.del);
        save();
        draw();
      });
    });
  }

  draw();
}

/* ============================================================
 * 4. CHECKLIST BERKAS (localStorage)
 * ============================================================ */
const CHECKLISTS = {
  perdata: {
    label: 'Gugatan Perdata',
    items: [
      'Surat kuasa khusus (jika diwakili)',
      'Kartu tanda penduduk para pihak',
      'Kronologi / posita gugatan',
      'Alat bukti surat (P1–Pn)',
      'Daftar saksi dan keterangannya',
      'Bukti pembayaran biaya perkara',
      'Salinan gugatan sesuai jumlah pihak'
    ]
  },
  pidana: {
    label: 'Perkara Pidana',
    items: [
      'Laporan polisi / LP',
      'Surat perintah penyidikan',
      'Berita acara pemeriksaan (BAP)',
      'Surat dakwaan jaksa',
      'Alat bukti dan barang bukti',
      'Daftar saksi (saksi a de charge & a charge)',
      'Penetapan penahanan / perpanjangan',
      'Surat kuasa pendamping hukum'
    ]
  },
  arbitrase: {
    label: 'Arbitrase / Mediasi',
    items: [
      'Klausul arbitrase dalam kontrak',
      'Kronologi sengketa',
      'Dokumen kontrak dan addendum',
      'Korespondensi upaya damai',
      'Surat pemberitahuan arbitrase',
      'Daftar arbiter / mediator',
      'Bukti kerugian dan perhitungannya'
    ]
  }
};

function renderBerkas(pane, ctx) {
  const key = `gradify_law_checklist_${ctx.user?.id || 'guest'}`;
  let state = {};
  try { state = JSON.parse(localStorage.getItem(key) || '{}'); } catch { state = {}; }

  function save() {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* ignore */ }
  }

  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">📁 Checklist Berkas Perkara</h3>
      <p class="text-xs text-slate-500 mb-4">Centang berkas yang sudah disiapkan. Status disimpan di perangkat ini.</p>
      <div class="space-y-5">
        ${Object.entries(CHECKLISTS).map(([groupId, group]) => {
          const done = group.items.filter((_, i) => state[`${groupId}:${i}`]).length;
          return `<div class="border border-slate-200 rounded-xl p-4">
            <div class="flex items-center justify-between mb-2">
              <p class="font-semibold text-slate-800 text-sm">${group.label}</p>
              <span class="text-[11px] font-semibold text-indigo-600">${done}/${group.items.length}</span>
            </div>
            <div class="space-y-1.5">
              ${group.items.map((item, i) => `
                <label class="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" data-key="${groupId}:${i}" ${state[`${groupId}:${i}`] ? 'checked' : ''} class="mt-0.5 accent-indigo-600" />
                  <span>${esc(item)}</span>
                </label>`).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  pane.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      state[cb.dataset.key] = cb.checked;
      save();
      renderBerkas(pane, ctx);
    });
  });
}

/* ============================================================
 * 5. REFERENSI PASAL
 * ============================================================ */
const PASAL = [
  { source: 'KUHPerdata', article: 'Pasal 1365', title: 'Perbuatan melawan hukum', note: 'Setiap perbuatan melawan hukum yang menimbulkan kerugian mewajibkan pelaku mengganti kerugian.' },
  { source: 'KUHPerdata', article: 'Pasal 1320', title: 'Syarat sah perjanjian', note: 'Sepakat, cakap, suatu hal tertentu, dan sebab yang halal.' },
  { source: 'KUHPerdata', article: 'Pasal 1338', title: 'Asas pacta sunt servanda', note: 'Perjanjian berlaku sebagai undang-undang bagi para pihak.' },
  { source: 'KUHPerdata', article: 'Pasal 1967', title: 'Daluwarsa tagihan tertentu', note: 'Tagihan tertentu daluwarsa setelah 3 tahun (mis. tagihan tukang, guru, apotek).' },
  { source: 'KUHPerdata', article: 'Pasal 1971', title: 'Daluwarsa umum', note: 'Semua tuntutan hukum daluwarsa setelah 30 tahun.' },
  { source: 'KUHP (lama)', article: 'Pasal 78', title: 'Daluwarsa penuntutan', note: '12 tahun (ancaman >3 tahun), 6 tahun (1–3 tahun), 3 tahun (<1 tahun), 1 tahun (pelanggaran).' },
  { source: 'KUHP (lama)', article: 'Pasal 79', title: 'Titik mulai daluwarsa', note: 'Dihitung sejak hari terjadinya tindak pidana (kecuali delik berlanjut).' },
  { source: 'KUHP (lama)', article: 'Pasal 84', title: 'Daluwarsa eksekusi', note: 'Kewenangan menjalankan putusan hilang setelah 5 tahun.' },
  { source: 'UU No. 30/2004', article: 'Pasal 136', title: 'Arbitrase', note: 'Putusan arbitrase bersifat final dan mengikat para pihak.' },
  { source: 'UU No. 2/2004', article: 'Pasal 6', title: 'Mediasi', note: 'Pengadilan wajib mendorong perdamaian melalui mediasi sebelum memeriksa pokok perkara.' }
];

function renderPasal(pane) {
  pane.innerHTML = `
    <div class="${CARD}">
      <h3 class="font-bold text-slate-800 mb-1">📖 Referensi Pasal Umum</h3>
      <p class="text-xs text-slate-500 mb-4">Rujukan cepat — bukan pengganti teks resmi peraturan.</p>
      <input id="ps-search" placeholder="Cari pasal, judul, atau kata kunci..." class="${INPUT} mb-4" />
      <div id="ps-list" class="space-y-2"></div>
    </div>`;

  const list = pane.querySelector('#ps-list');
  function draw(filter = '') {
    const q = filter.toLowerCase();
    const rows = PASAL.filter(p =>
      !q || `${p.source} ${p.article} ${p.title} ${p.note}`.toLowerCase().includes(q)
    );
    list.innerHTML = rows.length ? rows.map(p => `
      <div class="border border-slate-200 rounded-xl p-3 hover:bg-slate-50 transition">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[11px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">${esc(p.source)}</span>
          <span class="text-sm font-bold text-slate-800">${esc(p.article)}</span>
          <span class="text-xs text-slate-500">— ${esc(p.title)}</span>
        </div>
        <p class="text-xs text-slate-600 mt-1">${esc(p.note)}</p>
      </div>`).join('')
      : `<p class="text-sm text-slate-400 text-center py-6">Tidak ada pasal yang cocok.</p>`;
  }
  pane.querySelector('#ps-search').addEventListener('input', e => draw(e.target.value));
  draw();
}

const RENDERERS = {
  daluwarsa: renderDaluwarsa,
  tenggat: renderTenggat,
  timeline: renderTimeline,
  berkas: renderBerkas,
  pasal: renderPasal
};

export async function render(main, ctx) {
  main.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-extrabold text-slate-800">⚖️ Toolkit Hukum</h2>
      <p class="text-sm text-slate-500 mt-1">Daluwarsa, tenggat proses, kronologi kasus, checklist berkas, dan referensi pasal — diproses lokal di peramban.</p>
    </div>
    <div id="law-tabbar" class="flex flex-wrap gap-2 py-1"></div>
    <div id="law-content" class="mt-5"></div>`;

  const bar = main.querySelector('#law-tabbar');
  const content = main.querySelector('#law-content');
  let current = 'daluwarsa';

  function drawBar() {
    bar.innerHTML = TABS.map(t => {
      const active = t.id === current;
      return `<button type="button" data-tab="${t.id}" class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${active ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">${t.icon} ${t.label}</button>`;
    }).join('');
  }

  function draw() {
    const pane = document.createElement('div');
    content.replaceChildren(pane);
    RENDERERS[current](pane, ctx);
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
