/**
 * Kartu Mahasiswa (KTM) — pratinjau, verifikasi & cetak kartu tanda mahasiswa
 * Ukuran fisik mengikuti standar CR80: 85,6 mm × 54 mm.
 */
import { esc, toast } from '../app.js';

export const subtitle = () => 'Pratinjau, verifikasi & cetak Kartu Tanda Mahasiswa (KTM)';

/* ============================================================
 * BARCODE CODE 39 (tanpa dependensi eksternal)
 * ============================================================ */
const CODE39 = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101',
  'A': '110101001011', 'B': '101101001011', 'C': '110110100101', 'D': '101011001011',
  'E': '110101100101', 'F': '101101100101', 'G': '101010011011', 'H': '110101001101',
  'I': '101101001101', 'J': '101011001101', 'K': '110101010011', 'L': '101101010011',
  'M': '110110101001', 'N': '101011010011', 'O': '110101101001', 'P': '101101101001',
  'Q': '101010110011', 'R': '110101011001', 'S': '101101011001', 'T': '101011011001',
  'U': '110010101011', 'V': '100110101011', 'W': '110011010101', 'X': '100101101011',
  'Y': '110010110101', 'Z': '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101',
  '$': '100100100101', '/': '100100101001', '+': '100101001001', '%': '101001001001',
  '*': '100101101101'
};

function code39SVG(value, { height = 26, unit = 1.5, quiet = 5 } = {}) {
  const text = String(value || 'GRADIFY')
    .toUpperCase()
    .replace(/[^0-9A-Z\-. $/+%]/g, '-')
    .slice(0, 28) || 'GRADIFY';
  const chars = `*${text}*`.split('');

  let x = quiet;
  const bars = [];
  for (const ch of chars) {
    const pattern = CODE39[ch] || CODE39['-'];
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '1') {
        bars.push(`<rect x="${x.toFixed(2)}" y="0" width="${unit}" height="${height}" />`);
      }
      x += unit;
    }
    x += unit; // inter-character gap
  }
  const width = x + quiet;

  return `<svg class="ktm-barcode-svg" viewBox="0 0 ${width.toFixed(2)} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Barcode ${esc(text)}">
    <rect width="${width.toFixed(2)}" height="${height}" fill="#ffffff" />
    <g fill="#111827">${bars.join('')}</g>
  </svg>`;
}

/* ============================================================
 * HELPERS
 * ============================================================ */
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtLongDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ============================================================
 * CARD MARKUP
 * ============================================================ */
function frontCard(card) {
  const s = card.student;
  const photo = s.avatar_url
    ? `<img src="${esc(s.avatar_url)}" alt="Foto ${esc(s.full_name)}" />`
    : `<span class="ktm-photo-emoji">${esc(s.avatar_emoji || '🎓')}</span>`;

  return `<article class="ktm-card ktm-front" id="ktm-card-front" data-side="front">
    <div class="ktm-watermark" aria-hidden="true">🎓</div>
    <header class="ktm-head">
      <div class="ktm-logo">🎓</div>
      <div class="ktm-head-txt">
        <p class="ktm-univ">${esc(s.campus_name)}</p>
        <p class="ktm-title">KARTU TANDA MAHASISWA</p>
      </div>
      <span class="ktm-badge">KTM</span>
    </header>

    <div class="ktm-body">
      <div class="ktm-photo">${photo}</div>
      <div class="ktm-info">
        <p class="ktm-name">${esc(s.full_name)}</p>
        <p class="ktm-nim">${s.npm_nim ? 'NIM' : 'NO. KARTU'} <b>${esc(card.card_number)}</b></p>
        <p class="ktm-line">${esc(s.study_program || 'Program Studi belum diisi')}</p>
        <p class="ktm-line ktm-muted">${esc(s.faculty || 'Fakultas belum diisi')}</p>
        <div class="ktm-chips">
          <span>Smt ${esc(s.active_semester)}</span>
          <span>IPK ${Number(card.academic.ipk || 0).toFixed(2)}</span>
          ${card.academic.academic_year ? `<span>${esc(card.academic.academic_year)}</span>` : ''}
        </div>
      </div>
    </div>

    <footer class="ktm-foot">
      <div class="ktm-foot-l">
        <span class="ktm-label">BERLAKU S.D.</span>
        <b>${fmtDate(card.valid_until)}</b>
      </div>
      <div class="ktm-foot-c">
        ${code39SVG(card.card_number, { height: 26, unit: 1.5, quiet: 4 })}
        <span class="ktm-barcode-txt">${esc(card.card_number)}</span>
      </div>
      <div class="ktm-foot-r">
        <span class="ktm-label">VERIFIKASI</span>
        <b>${esc(card.verification_code)}</b>
      </div>
    </footer>
  </article>`;
}

function backCard(card) {
  const s = card.student;

  return `<article class="ktm-card ktm-back" id="ktm-card-back" data-side="back">
    <div class="ktm-watermark ktm-watermark-back" aria-hidden="true">🎓</div>
    <header class="ktm-back-head">
      <p>KETENTUAN PENGGUNAAN</p>
      <span class="ktm-badge">SISI BELAKANG</span>
    </header>

    <div class="ktm-back-body">
      <div class="ktm-rules">
        <ol>
          <li>Kartu ini merupakan identitas resmi mahasiswa <b>${esc(s.campus_name)}</b>.</li>
          <li>Wajib dibawa saat kegiatan akademik dan ditunjukkan bila diminta.</li>
          <li>Kartu tidak boleh dipindahtangankan atau diubah tanpa izin.</li>
          <li>Jika hilang, segera laporkan ke bagian akademik untuk penggantian.</li>
          <li>Kartu berlaku sampai tanggal yang tertera di sisi depan.</li>
        </ol>
        <p class="ktm-back-note">Kode verifikasi unik ini dapat dicocokkan dengan data akademik untuk memastikan keaslian kartu.</p>
      </div>

      <div class="ktm-back-side">
        <div class="ktm-back-barcode">
          ${code39SVG(card.card_number, { height: 32, unit: 1.6, quiet: 4 })}
          <span class="ktm-barcode-txt">${esc(card.card_number)}</span>
          <span class="ktm-verif-code">${esc(card.verification_code)}</span>
        </div>
        <div class="ktm-sign">
          <span>Diterbitkan ${fmtLongDate(card.issued_at)}</span>
          <b>Rektor / Pimpinan Universitas</b>
        </div>
      </div>
    </div>

    <footer class="ktm-back-foot">
      <span>Dicetak: ${fmtLongDate(card.printed_at)}</span>
      <span>${esc(card.card_version)} · Gradify</span>
    </footer>
  </article>`;
}

/* ============================================================
 * VIEW
 * ============================================================ */
export async function render(main, ctx) {
  const { api, navigate } = ctx;
  const card = await api.get('/api/academics/student-card');
  const s = card.student;

  main.innerHTML = `
  <div id="ktm-view" class="space-y-5">
    <!-- Hero / actions -->
    <div class="no-print bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 rounded-2xl p-4 sm:p-6 text-white shadow-lg">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-indigo-200 text-[11px] sm:text-xs font-semibold tracking-widest uppercase">Kartu Tanda Mahasiswa</p>
          <h2 class="text-xl sm:text-2xl font-extrabold mt-1">KTM Digital & Siap Cetak 🪪</h2>
          <p class="text-indigo-100 text-xs sm:text-sm mt-1">
            Pratinjau ukuran fisik CR80 (85,6 × 54 mm) dengan barcode & kode verifikasi — siap dicetak atau diunduh sebagai PNG.
          </p>
        </div>
        <div class="flex flex-wrap gap-2 w-full sm:w-auto">
          <button id="ktm-print" class="flex-1 sm:flex-none bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition">
            🖨️ Cetak Kartu
          </button>
          <button id="ktm-copy" class="flex-1 sm:flex-none bg-white/15 hover:bg-white/25 backdrop-blur px-4 py-2.5 rounded-xl text-sm font-semibold transition">
            📋 Salin Kode
          </button>
        </div>
      </div>
    </div>

    ${!s.npm_nim ? `
      <div class="no-print bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs sm:text-sm">⚠️ <b>NPM/NIM belum diisi.</b> Kartu sementara memakai nomor <b>${esc(card.card_number)}</b>. Lengkapi NIM agar kartu sesuai identitas kampus.</p>
        <button id="ktm-go-profile" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0">Lengkapi Profil →</button>
      </div>` : ''}

    <div class="ktm-screen-grid grid lg:grid-cols-3 gap-5">
      <!-- Card preview -->
      <section class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div class="no-print flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 class="font-bold text-slate-800">👁️ Pratinjau Kartu</h3>
            <p class="text-[11px] text-slate-500">Tampilan dua sisi — siap dicetak pada kertas A4.</p>
          </div>
          <span class="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full">CR80 · 85,6 × 54 mm</span>
        </div>

        <div id="ktm-print-root" class="ktm-stage">
          ${frontCard(card)}
          ${backCard(card)}
        </div>

        <div class="no-print mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3">
          <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
            <input type="checkbox" id="ktm-opt-front" class="accent-indigo-600 w-4 h-4" checked /> Cetak sisi depan
          </label>
          <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
            <input type="checkbox" id="ktm-opt-back" class="accent-indigo-600 w-4 h-4" checked /> Cetak sisi belakang
          </label>
          <span class="text-[11px] text-slate-400">Sisi belakang dicetak pada halaman terpisah (duplex).</span>
        </div>
      </section>

      <!-- Info & print settings -->
      <aside class="no-print space-y-4">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 class="font-bold text-slate-800">⬇️ Unduh PNG</h3>
              <p class="text-[11px] text-slate-500 mt-0.5">Ekspor kartu sebagai PNG <b>300 DPI</b> (1011 × 638 px), siap dicetak.</p>
            </div>
            <span class="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">PNG</span>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-3">
            <button id="ktm-png-front" class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2 rounded-xl text-xs shadow-sm transition">
              Sisi Depan
            </button>
            <button id="ktm-png-back" class="bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-semibold py-2 rounded-xl text-xs shadow-sm transition">
              Sisi Belakang
            </button>
          </div>
          <p class="text-[10px] text-slate-400 mt-2">Latar putih penuh · ukuran fisik CR80 · tanpa elemen antarmuka.</p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <h3 class="font-bold text-slate-800 mb-3">📇 Data Kartu</h3>
          <dl class="space-y-2 text-xs">
            ${infoRow('Nama', s.full_name)}
            ${infoRow('NIM / No. Kartu', card.card_number)}
            ${infoRow('Program Studi', s.study_program || '—')}
            ${infoRow('Fakultas', s.faculty || '—')}
            ${infoRow('Semester', `Semester ${s.active_semester}`)}
            ${infoRow('Berlaku s.d.', fmtLongDate(card.valid_until))}
            ${infoRow('Kode Verifikasi', card.verification_code, true)}
          </dl>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <h3 class="font-bold text-slate-800 mb-2">🖨️ Tips Cetak</h3>
          <ul class="text-[11px] text-slate-500 space-y-1.5 list-disc list-inside">
            <li>Butuh file cetak? Gunakan <b>Unduh PNG</b> di atas (300 DPI).</li>
            <li>Aktifkan opsi <b>Background graphics</b> agar warna kartu tercetak.</li>
            <li>Gunakan skala <b>100% / Actual size</b>, bukan “Fit to page”.</li>
            <li>Pilih kertas <b>A4</b> dan margin <b>default</b>.</li>
            <li>Untuk dua sisi, pilih <b>duplex — flip on long edge</b>.</li>
            <li>Cetak pada kertas tebal/Photo Paper lalu potong mengikuti batas kartu.</li>
          </ul>
        </div>

        <div class="bg-slate-900 text-slate-200 rounded-2xl p-4 shadow-sm">
          <p class="text-[11px] font-bold text-indigo-300 tracking-wider uppercase mb-1">Ringkasan Akademik</p>
          <div class="flex items-end gap-2">
            <span class="text-3xl font-extrabold">${Number(card.academic.ipk || 0).toFixed(2)}</span>
            <span class="text-xs text-slate-400 mb-1">/ 4.00 IPK</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">${esc(card.academic.predikat)}</p>
          <div class="grid grid-cols-2 gap-2 mt-3 text-center">
            <div class="bg-white/10 rounded-xl p-2">
              <p class="text-[10px] text-slate-400">SKS Dinilai</p>
              <p class="font-bold text-sm">${card.academic.total_sks_graded}</p>
            </div>
            <div class="bg-white/10 rounded-xl p-2">
              <p class="text-[10px] text-slate-400">SKS Diambil</p>
              <p class="font-bold text-sm">${card.academic.total_sks_taken}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>`;

  injectStyles();

  const frontEl = document.getElementById('ktm-card-front');
  const backEl = document.getElementById('ktm-card-back');
  const optFront = document.getElementById('ktm-opt-front');
  const optBack = document.getElementById('ktm-opt-back');

  function syncPrintSides() {
    const showFront = optFront.checked;
    const showBack = optBack.checked;
    frontEl.classList.toggle('ktm-hide-print', !showFront);
    backEl.classList.toggle('ktm-hide-print', !showBack);
    backEl.classList.toggle('ktm-break-before', showFront && showBack);
  }

  optFront.addEventListener('change', syncPrintSides);
  optBack.addEventListener('change', syncPrintSides);
  syncPrintSides();

  document.getElementById('ktm-print').addEventListener('click', () => {
    if (!optFront.checked && !optBack.checked) {
      toast('Pilih minimal satu sisi kartu untuk dicetak.', 'warn');
      return;
    }
    window.print();
  });

  document.getElementById('ktm-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(card.verification_code);
      toast('Kode verifikasi disalin ke clipboard ✅');
    } catch {
      toast(`Kode verifikasi: ${card.verification_code}`, 'info');
    }
  });

  document.getElementById('ktm-png-front').addEventListener('click', (e) => downloadCardPng(card, 'front', e.currentTarget));
  document.getElementById('ktm-png-back').addEventListener('click', (e) => downloadCardPng(card, 'back', e.currentTarget));

  document.getElementById('ktm-go-profile')?.addEventListener('click', () => navigate('profile'));
}

/* ============================================================
 * PNG EXPORT (300 DPI)
 * ============================================================ */
let htmlToImagePromise = null;

function loadHtmlToImage() {
  if (window.htmlToImage) return Promise.resolve(window.htmlToImage);
  if (htmlToImagePromise) return htmlToImagePromise;

  htmlToImagePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/dist/html-to-image.js';
    script.async = true;
    script.onload = () => window.htmlToImage
      ? resolve(window.htmlToImage)
      : reject(new Error('Library PNG gagal dimuat.'));
    script.onerror = () => {
      htmlToImagePromise = null;
      reject(new Error('Tidak dapat memuat library PNG. Periksa koneksi internet.'));
    };
    document.head.appendChild(script);
  });

  return htmlToImagePromise;
}

async function downloadCardPng(card, side, button) {
  const source = document.getElementById(side === 'front' ? 'ktm-card-front' : 'ktm-card-back');
  if (!source) return;

  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '⏳ Menyiapkan…';

  let holder = null;
  try {
    const htmlToImage = await loadHtmlToImage();

    // Clone kartu ke area off-screen dengan ukuran fisik penuh. Ini memastikan
    // hasil PNG tetap 85,6 × 54 mm walau pratinjau sedang mengecil di layar HP.
    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.remove('ktm-hide-print', 'ktm-break-before');
    clone.style.cssText = 'width:85.6mm;height:54mm;max-width:none;aspect-ratio:auto;box-shadow:none;border-radius:3.2mm;';

    holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:85.6mm;height:54mm;overflow:hidden;background:#ffffff;';
    holder.appendChild(clone);
    document.body.appendChild(holder);

    await Promise.all([...clone.querySelectorAll('img')].map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));

    const blob = await htmlToImage.toBlob(clone, {
      pixelRatio: 300 / 96, // 96 DPI layar × 3,125 = 300 DPI cetak
      backgroundColor: '#ffffff',
      cacheBust: true,
      style: {
        width: '85.6mm',
        height: '54mm',
        maxWidth: 'none',
        aspectRatio: 'auto',
        boxShadow: 'none'
      }
    });

    if (!blob) throw new Error('Canvas PNG tidak dapat dibuat.');

    const safeNumber = String(card.card_number).replace(/[^0-9A-Za-z-]/g, '') || 'mahasiswa';
    const filename = `KTM-${safeNumber}-${side === 'front' ? 'depan' : 'belakang'}.png`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    toast(`PNG sisi ${side === 'front' ? 'depan' : 'belakang'} berhasil diunduh (300 DPI) ✅`);
  } catch (err) {
    console.error('[KTM PNG]', err);
    toast(err.message || 'Gagal membuat PNG.', 'error');
  } finally {
    holder?.remove();
    button.disabled = false;
    button.innerHTML = originalHtml;
  }
}

function infoRow(label, value, mono = false) {
  return `<div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
    <dt class="text-slate-500 shrink-0">${esc(label)}</dt>
    <dd class="font-semibold text-slate-800 text-right ${mono ? 'font-mono text-[11px]' : ''}">${esc(value)}</dd>
  </div>`;
}

/* ============================================================
 * STYLES
 * ============================================================ */
const injectStyles = () => {
  if (document.getElementById('g-ktm-style')) return;
  const style = document.createElement('style');
  style.id = 'g-ktm-style';
  style.textContent = `
  .ktm-stage {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    justify-content: center;
    align-items: flex-start;
  }

  /* ---- Kartu fisik CR80: 85,6 mm × 54 mm ---- */
  .ktm-card {
    position: relative;
    width: 85.6mm;
    max-width: 100%;
    aspect-ratio: 85.6 / 54;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 3.2mm;
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 14px 34px rgba(15, 23, 42, .18);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .ktm-watermark {
    position: absolute;
    right: -4mm;
    bottom: -5mm;
    font-size: 26mm;
    opacity: .045;
    transform: rotate(-12deg);
    pointer-events: none;
  }
  .ktm-watermark-back { right: auto; left: -5mm; bottom: -6mm; }

  .ktm-head {
    display: flex;
    align-items: center;
    gap: 2mm;
    padding: 2.2mm 3mm 1.7mm;
    background: linear-gradient(135deg, #312e81 0%, #4f46e5 58%, #7c3aed 100%);
    color: #ffffff;
  }
  .ktm-logo {
    width: 7.4mm;
    height: 7.4mm;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3.6mm;
    flex-shrink: 0;
    background: rgba(255, 255, 255, .17);
    border: .35mm solid rgba(255, 255, 255, .5);
  }
  .ktm-head-txt { min-width: 0; flex: 1; }
  .ktm-univ {
    font-size: 2.4mm;
    font-weight: 700;
    line-height: 1.2;
    max-height: 2.4em;
    overflow: hidden;
  }
  .ktm-title {
    margin-top: .45mm;
    font-size: 1.75mm;
    font-weight: 600;
    letter-spacing: .16em;
    color: #c7d2fe;
  }
  .ktm-badge {
    flex-shrink: 0;
    margin-left: auto;
    font-size: 1.55mm;
    font-weight: 800;
    letter-spacing: .13em;
    padding: .55mm 1.2mm;
    border-radius: 1mm;
    border: .3mm solid rgba(255, 255, 255, .38);
    background: rgba(255, 255, 255, .16);
  }

  .ktm-body {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 2.7mm;
    padding: 2.2mm 3mm 1.5mm;
  }
  .ktm-photo {
    width: 16mm;
    height: 20mm;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 1.4mm;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef2ff;
    border: .4mm solid #c7d2fe;
  }
  .ktm-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .ktm-photo-emoji { font-size: 7mm; }
  .ktm-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .ktm-name {
    font-size: 3.05mm;
    line-height: 1.2;
    font-weight: 800;
    text-transform: uppercase;
    max-height: 2.4em;
    overflow: hidden;
  }
  .ktm-nim {
    margin-top: .7mm;
    font-family: 'JetBrains Mono', monospace;
    font-size: 2.1mm;
    color: #4338ca;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ktm-line {
    margin-top: .4mm;
    font-size: 2mm;
    line-height: 1.3;
    color: #475569;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ktm-muted { color: #64748b; }
  .ktm-chips { display: flex; flex-wrap: wrap; gap: 1mm; margin-top: 1.3mm; }
  .ktm-chips span {
    font-size: 1.75mm;
    font-weight: 700;
    color: #3730a3;
    background: #eef2ff;
    border: .25mm solid #c7d2fe;
    border-radius: 999px;
    padding: .35mm 1.15mm;
  }

  .ktm-foot {
    display: flex;
    align-items: flex-end;
    gap: 2mm;
    padding: 1.5mm 3mm 2.2mm;
    background: #f8fafc;
    border-top: .3mm dashed #cbd5e1;
  }
  .ktm-foot-l, .ktm-foot-r { flex-shrink: 0; }
  .ktm-foot-r { text-align: right; }
  .ktm-label {
    display: block;
    font-size: 1.3mm;
    font-weight: 700;
    letter-spacing: .12em;
    color: #64748b;
  }
  .ktm-foot b { font-size: 1.85mm; }
  .ktm-foot-r b {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.65mm;
    letter-spacing: .015em;
    color: #312e81;
  }
  .ktm-foot-c { flex: 1; min-width: 0; text-align: center; }
  .ktm-barcode-svg { display: block; width: 100%; height: 6mm; }
  .ktm-barcode-txt {
    display: block;
    margin-top: .25mm;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.2mm;
    letter-spacing: .12em;
    color: #334155;
  }

  /* ---- Sisi belakang ---- */
  .ktm-back-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2mm;
    padding: 2.2mm 3mm;
    background: linear-gradient(135deg, #1e1b4b 0%, #3730a3 60%, #6d28d9 100%);
    color: #ffffff;
  }
  .ktm-back-head p {
    font-size: 2.2mm;
    font-weight: 800;
    letter-spacing: .13em;
  }
  .ktm-back-body {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 3mm;
    padding: 2mm 3mm 1mm;
  }
  .ktm-rules { flex: 1.25; min-width: 0; }
  .ktm-rules ol {
    margin: 0;
    padding-left: 3.2mm;
    list-style: decimal;
    font-size: 1.7mm;
    line-height: 1.35;
    color: #475569;
  }
  .ktm-rules li { margin-bottom: .35mm; }
  .ktm-back-note {
    margin-top: 1.3mm;
    padding: 1mm 1.2mm;
    border-radius: 1mm;
    background: #eef2ff;
    border: .25mm solid #c7d2fe;
    font-size: 1.45mm;
    line-height: 1.3;
    color: #4338ca;
  }
  .ktm-back-side {
    flex: .9;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: space-between;
  }
  .ktm-back-barcode {
    background: #ffffff;
    border: .25mm solid #e2e8f0;
    border-radius: 1mm;
    padding: .8mm 1mm .6mm;
  }
  .ktm-verif-code {
    display: block;
    margin-top: .45mm;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.45mm;
    font-weight: 600;
    letter-spacing: .06em;
    color: #312e81;
  }
  .ktm-sign {
    margin-top: 1.2mm;
    text-align: center;
    font-size: 1.35mm;
    line-height: 1.3;
    color: #64748b;
  }
  .ktm-sign b {
    display: block;
    margin-top: 4.5mm;
    padding-top: .5mm;
    border-top: .25mm solid #94a3b8;
    font-size: 1.5mm;
    color: #0f172a;
  }
  .ktm-back-foot {
    display: flex;
    justify-content: space-between;
    gap: 2mm;
    padding: 0 3mm 2mm;
    font-size: 1.35mm;
    color: #64748b;
  }

  /* ---- Print ---- */
  @media print {
    @page { size: A4 portrait; margin: 12mm; }

    html, body { background: #ffffff !important; max-width: none !important; overflow: visible !important; }
    #splash, #auth-screen, #toast-container, #sidebar, #sidebar-backdrop,
    #mobile-bottom-nav, #app-shell > main > header { display: none !important; }

    #app-shell { display: block !important; min-height: 0 !important; }
    #app-shell > main { margin: 0 !important; display: block !important; min-height: 0 !important; }
    #main-content { padding: 0 !important; }
    #main-content > * { margin: 0 !important; }

    #ktm-view > .no-print,
    #ktm-view .ktm-screen-grid > aside,
    #ktm-view .no-print { display: none !important; }
    #ktm-view .ktm-screen-grid {
      display: block !important;
      margin-top: 0 !important;
    }
    #ktm-view .ktm-screen-grid > section {
      display: block !important;
      border: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    #ktm-print-root {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 0 !important;
    }
    #ktm-print-root .ktm-card {
      width: 85.6mm !important;
      height: 54mm !important;
      max-width: none !important;
      aspect-ratio: auto !important;
      box-shadow: none !important;
      border: .3mm solid #cbd5e1 !important;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    #ktm-print-root .ktm-card.ktm-hide-print { display: none !important; }
    #ktm-print-root .ktm-card.ktm-break-before {
      page-break-before: always;
      break-before: page;
    }
  }

  @media (max-width: 420px) {
    .ktm-stage { gap: 1rem; }
    .ktm-card { width: 100%; }
  }
  `;
  document.head.appendChild(style);
};
