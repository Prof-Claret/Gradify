/**
 * Gradify Life Hub (Phase 3 & 4) — satu modul untuk 3 route:
 *   budget    → 💰 Budget Kos (expense & income tracker)
 *   skripsi   → 📗 Skripsi Tracker (milestone pipeline)
 *   portfolio → 🏅 Portfolio & CV Auto-Builder
 */
import { esc, toast } from '../app.js';

/* ---------- shared meta ---------- */
const CATS = ['kos', 'makan', 'transport', 'buku', 'hiburan', 'lainnya'];
const CAT_META = {
  kos:       { label: 'Kos',       icon: '🏠', color: '#6366f1' },
  makan:     { label: 'Makan',     icon: '🍜', color: '#f59e0b' },
  transport: { label: 'Transport', icon: '🛵', color: '#10b981' },
  buku:      { label: 'Buku',      icon: '📚', color: '#3b82f6' },
  hiburan:   { label: 'Hiburan',   icon: '🎮', color: '#ec4899' },
  lainnya:   { label: 'Lainnya',   icon: '📦', color: '#94a3b8' }
};

const STATUS_ORDER = ['belum', 'berlangsung', 'selesai'];
const STATUS_META = {
  belum:       { label: 'Belum',       btn: 'bg-slate-200 text-slate-700 hover:bg-slate-300', dot: '⏳' },
  berlangsung: { label: 'Berlangsung', btn: 'bg-amber-100 text-amber-800 hover:bg-amber-200', dot: '🔄' },
  selesai:     { label: 'Selesai',     btn: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200', dot: '✅' }
};

const STAGE_META = {
  proposal: { label: 'Proposal', cls: 'bg-indigo-100 text-indigo-700' },
  bab1:     { label: 'Bab I',    cls: 'bg-sky-100 text-sky-700' },
  bab2:     { label: 'Bab II',   cls: 'bg-sky-100 text-sky-700' },
  bab3:     { label: 'Bab III',  cls: 'bg-cyan-100 text-cyan-700' },
  bab4:     { label: 'Bab IV',   cls: 'bg-teal-100 text-teal-700' },
  bab5:     { label: 'Bab V',    cls: 'bg-emerald-100 text-emerald-700' },
  ujian:    { label: 'Ujian',    cls: 'bg-violet-100 text-violet-700' },
  sidang:   { label: 'Sidang',   cls: 'bg-rose-100 text-rose-700' },
  custom:   { label: 'Custom',   cls: 'bg-slate-100 text-slate-600' }
};

const PTYPE_META = {
  proyek:      { icon: '💻', label: 'Proyek',      cls: 'bg-indigo-100 text-indigo-700' },
  prestasi:    { icon: '🏆', label: 'Prestasi',    cls: 'bg-amber-100 text-amber-700' },
  sertifikasi: { icon: '📜', label: 'Sertifikasi', cls: 'bg-emerald-100 text-emerald-700' },
  organisasi:  { icon: '🤝', label: 'Organisasi',  cls: 'bg-sky-100 text-sky-700' },
  magang:      { icon: '💼', label: 'Magang',      cls: 'bg-violet-100 text-violet-700' }
};
const PTYPE_ORDER = ['proyek', 'prestasi', 'sertifikasi', 'organisasi', 'magang'];

const todayISO = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d) ? esc(s) : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const subtitle = () => 'Budget kos, milestone skripsi, dan CV otomatis — kelola hidup mahasmu 🎓';

export async function render(main, ctx, extra) {
  injectStyles();
  const base = String(ctx.currentRoute || '').split('/')[0];
  const active = ['budget', 'skripsi', 'portfolio'].includes(base) ? base : 'budget';

  const pill = (key, icon, label) => `
    <button data-life="${key}" class="text-xs font-semibold px-3.5 py-1.5 rounded-lg transition
      ${active === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}">
      ${icon} ${label}</button>`;

  main.innerHTML = `
  <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
    <div>
      <h3 class="font-bold text-slate-800">🌱 Kehidupan Mahasiswa</h3>
      <p class="text-xs text-slate-500">Phase 3 & 4 · Budget Kos · Skripsi Tracker · Portfolio & CV</p>
    </div>
    <div class="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex gap-0.5">
      ${pill('budget', '💰', 'Budget Kos')}
      ${pill('skripsi', '📗', 'Skripsi')}
      ${pill('portfolio', '🏅', 'Portofolio & CV')}
    </div>
  </div>
  <div id="life-body"></div>`;

  main.querySelectorAll('button[data-life]').forEach(b =>
    b.addEventListener('click', () => ctx.navigate(b.dataset.life)));

  const body = main.querySelector('#life-body');
  if (active === 'skripsi') await drawSkripsi(body, ctx);
  else if (active === 'portfolio') await drawPortfolio(body, ctx);
  else await drawBudget(body, ctx);
}

/* ================================================================ */
/* 💰 BUDGET / KOS EXPENSE TRACKER                                   */
/* ================================================================ */

let budgetMonth = null; // dipertahankan saat berpindah sub-route

async function drawBudget(body, ctx) {
  const { api, toast, fmtIDR } = ctx;
  const month = budgetMonth || currentMonth();
  budgetMonth = month;

  let data;
  try {
    data = await api.get(`/api/life/budget?month=${month}`);
  } catch (e) { toast(e.message, 'error'); return; }

  const items = (data.items || [])
    .filter(i => String(i.occurred_at || '').startsWith(month))
    .sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)) || (b.id - a.id));
  const { income = 0, expenses = 0, balance = 0 } = data.totals || {};
  const byCat = data.byCategory || {};

  /* --- chart: % dari total pengeluaran --- */
  const chartRows = CATS.map(c => {
    const val = Number(byCat[c] || 0);
    const pct = expenses > 0 ? Math.round((val / expenses) * 100) : 0;
    return { cat: c, val, pct };
  }).filter(r => r.val > 0).sort((a, b) => b.val - a.val);

  /* --- savings tip --- */
  let tip = '';
  if (income > 0) {
    const pct = Math.round((balance / income) * 100);
    tip = balance >= income * 0.3
      ? `<div class="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3.5 text-sm font-semibold mt-4">🎉 Rapi! Kamu nabung ${pct}% dari pemasukan bulan ini. Lanjutkan kebiasaan baikmu!</div>`
      : `<div class="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3.5 text-sm font-semibold mt-4">⚠️ Hati-hati! Pengeluaranmu sudah melebihi 70% pemasukan (${pct}% tersisa). Coba kurangi ${CAT_META.hiburan.icon} hiburan dulu minggu ini ya.</div>`;
  } else if (expenses > 0) {
    tip = `<div class="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3.5 text-sm font-semibold mt-4">⚠️ Belum ada pemasukan yang tercatat bulan ini.</div>`;
  }

  body.innerHTML = `
  <div class="space-y-5">

    <!-- month selector -->
    <div class="flex flex-wrap items-center gap-3">
      <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Bulan</label>
      <input id="b-month" type="month" value="${esc(month)}"
        class="g-inp !w-auto text-sm" />
      <span class="text-xs text-slate-400">${items.length} transaksi tercatat</span>
    </div>

    <!-- summary cards -->
    <div class="grid sm:grid-cols-3 gap-4">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p class="text-xs font-bold text-slate-400 uppercase">Pemasukan</p>
        <p class="text-xl font-extrabold text-emerald-600 mt-1">${fmtIDR(income)}</p>
        <p class="text-xs text-slate-400 mt-1">💼 Total uang masuk</p>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p class="text-xs font-bold text-slate-400 uppercase">Pengeluaran</p>
        <p class="text-xl font-extrabold text-rose-600 mt-1">${fmtIDR(expenses)}</p>
        <p class="text-xs text-slate-400 mt-1">🛒 Total uang keluar</p>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p class="text-xs font-bold text-slate-400 uppercase">Saldo</p>
        <p class="text-xl font-extrabold mt-1 ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${fmtIDR(balance)}</p>
        <p class="text-xs text-slate-400 mt-1">⚖️ Pemasukan − Pengeluaran</p>
      </div>
    </div>
    ${tip}

    <!-- category chart + quick add -->
    <div class="grid lg:grid-cols-2 gap-5">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">📊 Pengeluaran per Kategori</p>
        ${chartRows.length === 0
          ? '<p class="text-sm text-slate-400 text-center py-8">Belum ada pengeluaran bulan ini.</p>'
          : `<div class="space-y-3">
              ${chartRows.map(r => {
                const m = CAT_META[r.cat];
                return `<div>
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-semibold text-slate-700">${m.icon} ${m.label}</span>
                    <span class="text-slate-500 font-semibold">${ctx.fmtIDR(r.val)} · ${r.pct}%</span>
                  </div>
                  <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full" style="width:${Math.max(r.pct, 1)}%;background:${m.color}"></div>
                  </div>
                </div>`;
              }).join('')}
            </div>`}
      </div>

      <!-- quick add / edit -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p id="b-form-title" class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">➕ Tambah Cepat</p>
        <form id="b-add" class="space-y-2.5">
          <input type="hidden" id="b-edit-id" value="" />
          <input id="b-title" class="g-inp" placeholder="cth. Beras 5kg · Jajan Mie Ayam" required />
          <div class="grid grid-cols-2 gap-2.5">
            <select id="b-cat" class="g-inp">
              ${CATS.map(c => `<option value="${c}">${CAT_META[c].icon} ${CAT_META[c].label}</option>`).join('')}
            </select>
            <select id="b-type" class="g-inp">
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <input id="b-amount" type="number" min="0" step="0.01" class="g-inp" placeholder="Nominal (Rp)" required />
            <input id="b-date" type="date" value="${todayISO()}" class="g-inp" />
          </div>
          <div class="flex justify-end gap-2 pt-1">
            <button type="button" id="b-cancel-edit" class="hidden text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">Batal Edit</button>
            <button type="reset" id="b-reset" class="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">Bersihkan</button>
            <button type="submit" id="b-submit" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl">Simpan Transaksi</button>
          </div>
        </form>
      </div>
    </div>

    <!-- transactions -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <p class="text-xs font-bold text-slate-400 uppercase tracking-wider px-5 pt-4">🧾 Transaksi Bulan Ini</p>
      ${items.length === 0
        ? `<div class="text-center py-12">
            <p class="text-5xl mb-3">💰</p>
            <p class="font-semibold text-slate-700">Belum ada transaksi bulan ini</p>
            <p class="text-xs text-slate-400 mt-1">Catat pemasukan & pengeluaran kos-mu lewat form "Tambah Cepat" di atas.</p>
           </div>`
        : `<div class="p-3">
            ${items.map(i => {
              const cat = CATS.includes(i.category) ? i.category : 'lainnya';
              const isInc = i.item_type === 'income';
              return `<div class="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50 border-b border-slate-50 last:border-0">
                <span class="w-9 h-9 shrink-0 rounded-xl ${isInc ? 'bg-emerald-50' : 'bg-slate-50'} flex items-center justify-center text-base">${isInc ? '💼' : CAT_META[cat].icon}</span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-slate-800 truncate">${esc(i.title)}</p>
                  <p class="text-[11px] text-slate-400">${isInc ? 'Pemasukan' : `${CAT_META[cat].icon} ${CAT_META[cat].label}`} · ${fmtDate(i.occurred_at)}</p>
                </div>
                <span class="text-sm font-bold ${isInc ? 'text-emerald-600' : 'text-slate-700'} whitespace-nowrap">${isInc ? '+' : ''}${fmtIDR(i.amount)}</span>
                <button class="b-edit text-slate-300 hover:text-indigo-600 px-1" data-id="${i.id}" title="Ubah">✏️</button>
                <button class="b-del text-slate-300 hover:text-rose-600 px-1" data-id="${i.id}" title="Hapus">🗑</button>
              </div>`;
            }).join('')}
           </div>`}
    </div>
  </div>`;

  /* --- wire events --- */
  const formTitle = body.querySelector('#b-form-title');
  const editIdEl = body.querySelector('#b-edit-id');
  const cancelEditBtn = body.querySelector('#b-cancel-edit');
  const resetBtn = body.querySelector('#b-reset');
  const submitBtn = body.querySelector('#b-submit');

  function clearBudgetEditMode() {
    editIdEl.value = '';
    formTitle.textContent = '➕ Tambah Cepat';
    submitBtn.textContent = 'Simpan Transaksi';
    cancelEditBtn.classList.add('hidden');
    resetBtn.classList.remove('hidden');
  }

  function fillBudgetForm(item) {
    editIdEl.value = String(item.id);
    body.querySelector('#b-title').value = item.title || '';
    body.querySelector('#b-cat').value = CATS.includes(item.category) ? item.category : 'lainnya';
    body.querySelector('#b-type').value = item.item_type === 'income' ? 'income' : 'expense';
    body.querySelector('#b-amount').value = item.amount ?? '';
    body.querySelector('#b-date').value = item.occurred_at || todayISO();
    formTitle.textContent = '✏️ Ubah Transaksi';
    submitBtn.textContent = 'Simpan Perubahan';
    cancelEditBtn.classList.remove('hidden');
    resetBtn.classList.add('hidden');
    body.querySelector('#b-title').focus();
  }

  body.querySelector('#b-month').addEventListener('change', e => {
    budgetMonth = e.target.value || currentMonth();
    drawBudget(body, ctx);
  });

  cancelEditBtn.addEventListener('click', () => {
    body.querySelector('#b-add').reset();
    body.querySelector('#b-date').value = todayISO();
    clearBudgetEditMode();
  });

  body.querySelector('#b-add').addEventListener('reset', () => {
    clearBudgetEditMode();
    setTimeout(() => { body.querySelector('#b-date').value = todayISO(); }, 0);
  });

  body.querySelector('#b-add').addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      title: body.querySelector('#b-title').value.trim(),
      category: body.querySelector('#b-cat').value,
      item_type: body.querySelector('#b-type').value,
      amount: parseFloat(body.querySelector('#b-amount').value),
      occurred_at: body.querySelector('#b-date').value || todayISO()
    };
    if (!payload.title || !(payload.amount >= 0) || Number.isNaN(payload.amount)) {
      toast('Judul dan nominal wajib diisi.', 'warn');
      return;
    }
    const editId = editIdEl.value;
    try {
      if (editId) {
        await api.put(`/api/life/budget/${editId}`, payload);
        toast('Transaksi diperbarui');
      } else {
        await api.post('/api/life/budget', payload);
        toast(payload.item_type === 'income' ? 'Pemasukan tercatat! 💼' : 'Pengeluaran tercatat! 🧾');
      }
      drawBudget(body, ctx);
    } catch (err) { toast(err.message, 'error'); }
  });

  body.querySelectorAll('.b-edit').forEach(b => b.addEventListener('click', () => {
    const item = items.find(x => String(x.id) === String(b.dataset.id));
    if (item) fillBudgetForm(item);
  }));

  body.querySelectorAll('.b-del').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Hapus transaksi ini?')) return;
    try {
      await api.del(`/api/life/budget/${b.dataset.id}`);
      toast('Transaksi dihapus', 'info');
      drawBudget(body, ctx);
    } catch (err) { toast(err.message, 'error'); }
  }));
}

/* ================================================================ */
/* 📗 SKRIPSI TRACKER                                                */
/* ================================================================ */

async function drawSkripsi(body, ctx) {
  const { api, toast } = ctx;

  let data;
  try {
    data = await api.get('/api/life/skripsi');
  } catch (e) { toast(e.message, 'error'); return; }

  const milestones = data.milestones || [];
  const progress = Math.min(Math.max(Number(data.progress) || 0, 0), 100);
  const done = milestones.filter(m => m.status === 'selesai').length;
  const todo = milestones.filter(m => m.status !== 'selesai');
  const nextTarget = todo.length ? todo[todo.length - 1].target_date : null;

  const motivation = progress >= 100
    ? 'MANTAP! Semua milestone selesai — tinggal serahin wisudamu! 🎓🎉'
    : progress >= 75 ? 'Tinggal sedikit lagi — konsistensi kunci lulus awal! 💪'
    : progress >= 50 ? 'Lebih dari separuh jalan — badai sudah lewat! ⛵'
    : progress >= 25 ? 'Fokus per bab, satu batu untuk satu pukulan! 🪨'
    : 'Setiap perjalanan dimulai dari Bab I. You got this! 🚀';

  body.innerHTML = `
  <div class="space-y-5">

    <!-- progress -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div class="flex items-end justify-between mb-2">
        <div>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Progres Skripsi</p>
          <p class="text-sm text-slate-600 mt-1 font-medium">${motivation}</p>
        </div>
        <span class="text-3xl font-extrabold text-indigo-600">${progress}%</span>
      </div>
      <div class="h-3.5 bg-slate-100 rounded-full overflow-hidden">
        <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style="width:${progress}%"></div>
      </div>
      <p class="text-xs text-slate-400 mt-2">${done} dari ${milestones.length} milestone selesai</p>
    </div>

    <!-- estimasi selesai -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-wrap items-center gap-6">
      <div>
        <p class="text-xs font-bold text-slate-400 uppercase">Selesai / Total</p>
        <p class="text-2xl font-extrabold text-slate-800 mt-0.5">${done} <span class="text-slate-300">/</span> ${milestones.length}</p>
      </div>
      <div class="w-px self-stretch bg-slate-100 hidden sm:block"></div>
      <div>
        <p class="text-xs font-bold text-slate-400 uppercase">Estimasi Target ${todo.length ? 'Terakhir' : ''}</p>
        <p class="text-2xl font-extrabold ${nextTarget ? 'text-indigo-600' : 'text-slate-800'} mt-0.5">${nextTarget ? fmtDate(nextTarget) : '🎉'}</p>
        <p class="text-xs text-slate-400 mt-0.5">${todo.length ? 'Target tanggal milestone belum-selesai terakhir' : 'Semua milestone selesai!'}</p>
      </div>
      <button id="s-add2" class="sm:ml-auto bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">+ Milestone Baru</button>
    </div>

    <!-- add form -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5" id="s-addcard">
      <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">➕ Milestone Baru (bersifat custom)</p>
      <form id="s-add" class="grid md:grid-cols-[2fr_1fr_1fr_auto] gap-2.5 items-end">
        <div>
          <label class="text-[10px] font-bold text-slate-400 uppercase">Judul *</label>
          <input id="s-title" class="g-inp" placeholder="cth. Penelitian Lapangan" required />
        </div>
        <div>
          <label class="text-[10px] font-bold text-slate-400 uppercase">Tahap</label>
          <select id="s-stage" class="g-inp">
            ${Object.keys(STAGE_META).map(s => `<option value="${s}" ${s === 'custom' ? 'selected' : ''}>${STAGE_META[s].label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-[10px] font-bold text-slate-400 uppercase">Target</label>
          <input id="s-target" type="date" class="g-inp" />
        </div>
        <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl h-[42px]">Tambah</button>
      </form>
    </div>

    <!-- pipeline -->
    <div>
      <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">🛠️ Pipeline Milestone</p>
      ${milestones.length === 0
        ? `<div class="bg-white rounded-2xl border border-slate-200 shadow-sm text-center py-12">
            <p class="text-5xl mb-3">📗</p>
            <p class="font-semibold text-slate-700">Belum ada milestone</p>
            <p class="text-xs text-slate-400 mt-1">Buat milestone pertamamu untuk mulai menelusuri perjalanan skripsimu.</p>
           </div>`
        : `<div class="space-y-2.5">
            ${milestones.map(m => {
              const stage = STAGE_META[m.stage] || STAGE_META.custom;
              const st = STATUS_META[m.status] || STATUS_META.belum;
              return `<div class="step-box flex flex-wrap items-center gap-3 !mb-0">
                <div class="min-w-0 flex-1 basis-48">
                  <p class="text-sm font-semibold text-slate-800 truncate">${esc(m.title)}</p>
                  <span class="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.cls}">${stage.label}</span>
                </div>
                <button class="s-cycle text-xs font-bold px-3 py-2 rounded-xl transition ${st.btn}" data-id="${m.id}" title="Klik untuk ganti status">${st.dot} ${st.label}</button>
                <span class="text-[10px] font-bold text-slate-400 uppercase">Target</span>
                <input type="date" class="g-inp !w-auto text-xs s-date" data-id="${m.id}" value="${esc(m.target_date || '')}" title="Target tanggal — menyimpan otomatis" />
                <input class="g-inp !w-44 text-xs s-notes" data-id="${m.id}" value="${esc(m.notes || '')}" placeholder="Catatan kecil…" title="Catatan — menyimpan otomatis" />
                <button class="s-del text-slate-300 hover:text-rose-600 px-1" data-id="${m.id}" title="Hapus">🗑</button>
              </div>`;
            }).join('')}
           </div>`}
    </div>
  </div>`;

  /* --- wire events --- */
  body.querySelector('#s-add2')?.addEventListener('click', () => {
    body.querySelector('#s-addcard').scrollIntoView({ behavior: 'smooth', block: 'center' });
    body.querySelector('#s-title').focus();
  });

  body.querySelector('#s-add').addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      title: body.querySelector('#s-title').value.trim(),
      stage: body.querySelector('#s-stage').value,
      target_date: body.querySelector('#s-target').value || null
    };
    if (!payload.title) { toast('Judul milestone wajib diisi.', 'warn'); return; }
    try {
      await api.post('/api/life/skripsi', payload);
      toast('Milestone ditambahkan! 🚀');
      drawSkripsi(body, ctx);
    } catch (err) { toast(err.message, 'error'); }
  });

  body.querySelectorAll('.s-cycle').forEach(b => b.addEventListener('click', async () => {
    const m = milestones.find(x => String(x.id) === String(b.dataset.id));
    if (!m) return;
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(m.status) + 1) % 3];
    try {
      await api.put(`/api/life/skripsi/${m.id}`, { status: next });
      toast(next === 'selesai' ? 'Milestone selesai! 🎉' : next === 'berlangsung' ? 'Status: berlangsung 🔄' : 'Kembali ke belum ⏳');
      drawSkripsi(body, ctx);
    } catch (err) { toast(err.message, 'error'); }
  }));

  body.querySelectorAll('.s-date').forEach(inp => inp.addEventListener('change', async () => {
    if (!inp.value) return;
    try {
      await api.put(`/api/life/skripsi/${inp.dataset.id}`, { target_date: inp.value });
      toast('Target tanggal diperbarui 📅');
      drawSkripsi(body, ctx);
    } catch (err) { toast(err.message, 'error'); }
  }));

  body.querySelectorAll('.s-notes').forEach(inp => inp.addEventListener('change', async () => {
    const v = inp.value.trim();
    if (!v) return;
    try {
      await api.put(`/api/life/skripsi/${inp.dataset.id}`, { notes: v });
      toast('Catatan disimpan 💾');
    } catch (err) { toast(err.message, 'error'); }
  }));

  body.querySelectorAll('.s-del').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Hapus milestone ini?')) return;
    try {
      await api.del(`/api/life/skripsi/${b.dataset.id}`);
      toast('Milestone dihapus', 'info');
      drawSkripsi(body, ctx);
    } catch (err) { toast(err.message, 'error'); }
  }));
}

/* ================================================================ */
/* 🏅 PORTFOLIO & CV AUTO-BUILDER                                    */
/* ================================================================ */

async function drawPortfolio(body, ctx) {
  const { api, toast, user } = ctx;

  let data;
  try {
    data = await api.get('/api/life/portfolio');
  } catch (e) { toast(e.message, 'error'); return; }

  const items = data.items || [];
  const nowYear = new Date().getFullYear();
  const yearRange = [];
  for (let y = nowYear - 10; y <= nowYear + 1; y++) yearRange.push(y);

  body.innerHTML = `
  <div class="space-y-5">

    <!-- header actions -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm font-semibold text-slate-700">${items.length} item portofolio tersimpan</p>
        <p class="text-xs text-slate-400">Semua item dipakai untuk menyusun CV otomatis.</p>
      </div>
      <button id="cv-gen" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm">📄 Generate CV</button>
    </div>

    <div class="grid lg:grid-cols-[2fr_1fr] gap-5 items-start">

      <!-- grouped items -->
      <div class="space-y-5">
        ${PTYPE_ORDER.map(t => {
          const meta = PTYPE_META[t];
          const group = items.filter(i => i.item_type === t);
          return `<div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-base">${meta.icon}</span>
              <p class="text-sm font-bold text-slate-800">${meta.label}</p>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}">${group.length}</span>
            </div>
            ${group.length === 0
              ? `<p class="text-xs text-slate-400 py-4 text-center">Belum ada ${meta.label.toLowerCase()} — waktunya beraksi! ${meta.icon}</p>`
              : `<div class="space-y-2">
                  ${group.map(i => `
                    <div class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition">
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-semibold text-slate-800">${esc(i.title)}</p>
                        ${i.description ? `<p class="text-xs text-slate-500 mt-0.5 leading-relaxed">${esc(i.description)}</p>` : ''}
                      </div>
                      ${i.year ? `<span class="shrink-0 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-1">${esc(i.year)}</span>` : ''}
                      <button class="p-edit shrink-0 text-slate-300 hover:text-indigo-600 px-1" data-id="${i.id}" title="Ubah">✏️</button>
                      <button class="p-del shrink-0 text-slate-300 hover:text-rose-600 px-1" data-id="${i.id}" title="Hapus">🗑</button>
                    </div>`).join('')}
                </div>`}
          </div>`;
        }).join('')}
        ${items.length === 0
          ? `<div class="bg-white rounded-2xl border border-slate-200 shadow-sm text-center py-10">
              <p class="text-5xl mb-3">🏅</p>
              <p class="font-semibold text-slate-700">Portofoliomu masih kosong</p>
              <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Tambahkan proyek, prestasi, sertifikasi, organisasi, atau pengalaman magang lewat form di samping — lalu generate CV-mu sekali klik.</p>
             </div>`
          : ''}
      </div>

      <!-- add / edit form -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <p id="p-form-title" class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">➕ Tambah Item</p>
        <form id="p-add" class="space-y-2.5">
          <input type="hidden" id="p-edit-id" value="" />
          <div>
            <label class="text-[10px] font-bold text-slate-400 uppercase">Jenis</label>
            <select id="p-type" class="g-inp">
              ${PTYPE_ORDER.map(t => `<option value="${t}">${PTYPE_META[t].icon} ${PTYPE_META[t].label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-[10px] font-bold text-slate-400 uppercase">Judul *</label>
            <input id="p-title" class="g-inp" placeholder="cth. Sistem Informasi Perpustakaan" required />
          </div>
          <div>
            <label class="text-[10px] font-bold text-slate-400 uppercase">Tahun</label>
            <select id="p-year" class="g-inp">
              ${yearRange.map(y => `<option value="${y}" ${y === nowYear ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-[10px] font-bold text-slate-400 uppercase">Deskripsi</label>
            <textarea id="p-desc" rows="3" class="g-inp" placeholder="Ringkasan singkat: peran, tech stack, capaian…"></textarea>
          </div>
          <div class="flex flex-col gap-2">
            <button type="submit" id="p-submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">Simpan Item</button>
            <button type="button" id="p-cancel-edit" class="hidden w-full text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">Batal Edit</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  /* --- wire events --- */
  const pFormTitle = body.querySelector('#p-form-title');
  const pEditId = body.querySelector('#p-edit-id');
  const pSubmit = body.querySelector('#p-submit');
  const pCancel = body.querySelector('#p-cancel-edit');

  function clearPortfolioEditMode() {
    pEditId.value = '';
    pFormTitle.textContent = '➕ Tambah Item';
    pSubmit.textContent = 'Simpan Item';
    pCancel.classList.add('hidden');
  }

  function fillPortfolioForm(item) {
    pEditId.value = String(item.id);
    body.querySelector('#p-type').value = PTYPE_ORDER.includes(item.item_type) ? item.item_type : 'proyek';
    body.querySelector('#p-title').value = item.title || '';
    const y = item.year || String(nowYear);
    const yearSel = body.querySelector('#p-year');
    if (![...yearSel.options].some(o => o.value === String(y))) {
      yearSel.insertAdjacentHTML('afterbegin', `<option value="${esc(String(y))}">${esc(String(y))}</option>`);
    }
    yearSel.value = String(y);
    body.querySelector('#p-desc').value = item.description || '';
    pFormTitle.textContent = '✏️ Ubah Item';
    pSubmit.textContent = 'Simpan Perubahan';
    pCancel.classList.remove('hidden');
    body.querySelector('#p-title').focus();
  }

  pCancel.addEventListener('click', () => {
    body.querySelector('#p-add').reset();
    body.querySelector('#p-year').value = String(nowYear);
    clearPortfolioEditMode();
  });

  body.querySelector('#p-add').addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      item_type: body.querySelector('#p-type').value,
      title: body.querySelector('#p-title').value.trim(),
      year: body.querySelector('#p-year').value,
      description: body.querySelector('#p-desc').value.trim()
    };
    if (!payload.title) { toast('Judul item wajib diisi.', 'warn'); return; }
    const editId = pEditId.value;
    try {
      if (editId) {
        await api.put(`/api/life/portfolio/${editId}`, payload);
        toast('Item portofolio diperbarui');
      } else {
        await api.post('/api/life/portfolio', payload);
        toast('Item portofolio disimpan! 🏅');
      }
      drawPortfolio(body, ctx);
    } catch (err) { toast(err.message, 'error'); }
  });

  body.querySelectorAll('.p-edit').forEach(b => b.addEventListener('click', () => {
    const item = items.find(x => String(x.id) === String(b.dataset.id));
    if (item) fillPortfolioForm(item);
  }));

  body.querySelectorAll('.p-del').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Hapus item ini dari portofolio?')) return;
    try {
      await api.del(`/api/life/portfolio/${b.dataset.id}`);
      toast('Item dihapus', 'info');
      drawPortfolio(body, ctx);
    } catch (err) { toast(err.message, 'error'); }
  }));

  body.querySelector('#cv-gen').addEventListener('click', () => openCvModal(items, user));
}

/* ---------- CV modal ---------- */
function openCvModal(items, user) {
  const u = user || {};
  const nama = u.full_name || 'Nama Mahasiswa';

  function sectionHtml(t) {
    const meta = PTYPE_META[t];
    const group = items.filter(i => i.item_type === t);
    if (group.length === 0) return '';
    return `<section class="mb-5">
      <h3 class="text-[13px] font-extrabold uppercase tracking-widest border-b-2 border-indigo-500 pb-1 mb-2">${meta.icon} ${meta.label}</h3>
      <ul class="space-y-2">
        ${group.map(i => `<li class="flex gap-2 text-[13px] leading-relaxed">
          <span class="text-indigo-500 mt-1">▸</span>
          <span><b>${esc(i.title)}</b>${i.year ? ` <span class="text-slate-400">· ${esc(i.year)}</span>` : ''}${i.description ? `<br/><span class="text-slate-600">${esc(i.description)}</span>` : ''}</span>
        </li>`).join('')}
      </ul>
    </section>`;
  }

  const root = document.createElement('div');
  root.id = 'cv-modal-root';
  root.innerHTML = `
  <div class="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm overflow-y-auto" id="cv-overlay">
    <div class="min-h-full flex flex-col items-center py-6 px-4">
      <div class="flex flex-wrap justify-center gap-2 mb-4">
        <button id="cv-print" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow">🖨️ Cetak / Simpan PDF</button>
        <button id="cv-close" class="bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold px-5 py-2.5 rounded-xl border border-slate-200 shadow">✕ Tutup</button>
      </div>
      <div class="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6 sm:p-10" id="cv-page">

        <!-- header -->
        <header class="text-center border-b pb-5 mb-5">
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">${esc(nama)}</h1>
          <p class="text-sm font-semibold text-indigo-600 mt-1">${esc(u.study_program || 'Program Studi')}</p>
          <p class="text-xs text-slate-500 mt-2">
            📧 ${esc(u.email || '—')} &nbsp;·&nbsp; 🆔 NPM ${esc(u.npm_nim || '—')} &nbsp;·&nbsp; 🏫 ${esc(u.campus_name || '—')}
          </p>
        </header>

        <!-- education -->
        <section class="mb-5">
          <h3 class="text-[13px] font-extrabold uppercase tracking-widest border-b-2 border-indigo-500 pb-1 mb-2">🎓 Pendidikan</h3>
          <p class="text-[13px] text-slate-700 leading-relaxed">
            <b>${esc(u.campus_name || '—')}</b>${u.faculty ? `<br/>Fakultas ${esc(String(u.faculty).replace(/^Fakultas\s+/i, ''))}` : ''}
            ${u.study_program ? `<br/>${esc(u.study_program)}` : ''}
          </p>
          <p class="text-xs text-slate-500 mt-1 italic">Sedang menempuh semester ${esc(u.active_semester ?? '—')} · disebarjukan dengan Gradify CV Builder pada ${fmtDate(todayISO())}</p>
        </section>

        <!-- portfolio sections -->
        ${PTYPE_ORDER.map(t => sectionHtml(t)).join('')}

        ${items.length === 0 ? `<p class="text-center text-sm text-slate-400 py-6">Belum ada item portofolio — tambahkan proyek/prestasi untuk melengkapinya.</p>` : ''}

        <footer class="border-t pt-3 mt-4 text-center">
          <p class="text-[10px] text-slate-400">Dokumen ini dihasilkan otomatis oleh Gradify · ${esc(nama)} · Semester ${esc(u.active_semester ?? '—')}</p>
        </footer>
      </div>
    </div>
  </div>`;

  document.body.appendChild(root);

  const overlay = root.querySelector('#cv-overlay');
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  root.querySelector('#cv-close').addEventListener('click', close);
  root.querySelector('#cv-print').addEventListener('click', () => window.print());
  document.addEventListener('keydown', escKey);

  function escKey(e) { if (e.key === 'Escape') close(); }
  function close() {
    document.removeEventListener('keydown', escKey);
    root.remove();
  }
}

function injectStyles() {
  if (document.getElementById('g-life-style')) return;
  const s = document.createElement('style');
  s.id = 'g-life-style';
  s.textContent = `
  .g-inp{width:100%;border:1px solid #cbd5e1;border-radius:0.6rem;padding:0.55rem 0.8rem;font-size:0.85rem;outline:none;background:#fff;color:#1e293b}
  .g-inp:focus{border-color:#6366f1;box-shadow:0 0 0 3px #e0e7ff}`;
  document.head.appendChild(s);
}

export default { render, subtitle };
