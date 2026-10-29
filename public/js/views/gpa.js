/**
 * IPK & Transkrip + Cum Laude Target Simulator (Phase 3)
 */
import { esc, toast } from '../app.js';

export const subtitle = () => 'Transkrip, proyeksi IPK & simulator target Cum Laude';

export const GRADE_POINTS = { A: 4.0, 'A-': 3.75, 'B+': 3.5, B: 3.0, 'B-': 2.75, 'C+': 2.5, C: 2.0, 'C-': 1.75, D: 1.0, E: 0.0 };
export const PREDICATE = (ipk) =>
  ipk >= 3.5 ? { label: 'Cum Laude (Sangat Memuaskan)', cls: 'bg-emerald-600' }
  : ipk >= 3.0 ? { label: 'Memuaskan', cls: 'bg-sky-600' }
  : ipk >= 2.0 ? { label: 'Cukup', cls: 'bg-amber-500' }
  : { label: 'Perlu Peningkatan', cls: 'bg-rose-600' };

export async function render(main, ctx) {
  const { api } = ctx;

  /* ---------- SIMULATION STATE ---------- */
  // Sim: mutable copies of graded courses
  const { transcript, summary, target_gpa } = await api.get('/api/academics/transcript');
  const courses = [];
  for (const row of transcript) {
    for (const c of row.courses) courses.push({ ...c, sem: row.semester_number });
  }
  const graded = courses.filter(c => c.grade);

  drawMain();

  function drawMain() {
    const pred = PREDICATE(summary.ipk);
    const targetMet = summary.ipk >= target_gpa;

    main.innerHTML = `
    <div class="grid lg:grid-cols-3 gap-6 mb-6">
      <!-- IPK hero -->
      <div class="lg:col-span-1 bg-gradient-to-br from-indigo-700 to-violet-700 rounded-2xl p-6 text-white shadow-lg">
        <p class="text-indigo-200 text-xs font-semibold tracking-wider uppercase">IPK Kumulatif</p>
        <div class="flex items-end gap-3 mt-1">
          <span class="text-5xl font-extrabold">${summary.ipk.toFixed(2)}</span>
          <span class="text-indigo-200 text-sm mb-2">/ 4.00</span>
        </div>
        <div class="mt-3 h-2.5 bg-indigo-900/40 rounded-full overflow-hidden">
          <div class="${pred.cls} h-full rounded-full transition-all" style="width:${(summary.ipk / 4) * 100}%"></div>
        </div>
        <p class="mt-2 text-sm font-semibold">🏆 ${pred.label}</p>
        <div class="mt-4 bg-white/10 backdrop-blur rounded-xl p-3 grid grid-cols-2 gap-2 text-center">
          <div><p class="text-[10px] text-indigo-200">Target IPK</p><p class="text-xl font-bold">${target_gpa}</p></div>
          <div><p class="text-[10px] text-indigo-200">Status</p>
            <p class="text-sm font-bold ${targetMet ? 'text-emerald-400' : 'text-amber-300'}">${targetMet ? '✅ Tercapai' : '📈 Menuju target'}</p></div>
        </div>
        <p class="text-indigo-200 text-[11px] mt-3">SKS dinilai: <b>${summary.total_sks_graded}</b> · Maks SKS semester depan: <b>${summary.max_sks_next}</b></p>
      </div>

      <!-- Cum Laude simulator -->
      <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 class="font-bold text-slate-800">🎯 Simulator Target Cum Laude</h3>
        <p class="text-xs text-slate-500 mb-3">Ubah nilai prediksi matkul yang belum dinilai untuk melihat dampaknya ke IPK.</p>
        <div id="sim-courses" class="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          ${courses.map((c, i) => `
          <div class="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2">
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-slate-700 truncate">${esc(c.course_name)} <span class="text-slate-400 font-mono">(Smt ${c.sem})</span></p>
              <p class="text-[10px] text-slate-400">${c.sks} SKS</p>
            </div>
            <select class="sim-grade" data-i="${i}" ${c.grade ? 'data-locked="1"' : ''}>
              ${['Belum', ...Object.keys(GRADE_POINTS)].map(g =>
                `<option value="${g}" ${((c.grade || 'Belum') === g) ? 'selected' : ''}>${g === 'Belum' ? 'Belum dinilai' : g}</option>`).join('')}
            </select>
          </div>`).join('')}
          ${courses.length === 0 ? '<p class="text-sm text-slate-400 text-center py-6">Belum ada matkul. Tambahkan di menu Mata Kuliah.</p>' : ''}
        </div>
        <button id="sim-reset" class="mt-3 text-xs text-indigo-600 font-semibold hover:underline">↺ Reset simulasi ke nilai asli</button>
      </div>
    </div>

    <!-- MehPrefab: grade scale -->
    <div class="grid lg:grid-cols-4 gap-4 mb-6" id="scale-bar"></div>

    <!-- Transkrip detail -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 class="font-bold text-slate-800 mb-3">📄 Transkrip Akademik Lengkap</h3>
      <div class="overflow-x-auto">
        <table class="gtable min-w-[680px]">
          <thead><tr><th>Smt</th>
            ${transcript.flatMap(row => row.courses.length ? row.courses.map(c =>
              `<th class="text-left text-[10px] w-auto whitespace-nowrap" title="${esc(c.course_name)}">${esc(c.course_code)}</th>`).join('') : '').join('')}
            <th>Nomor</th>
          </tr></thead>
          <tbody>${''}</tbody>
        </table>
      </div>
    </div>`;

    drawSim();
    drawScale();
    drawTranscriptTable();
  }

  function drawSim() {
    let simGrades = courses.map(c => c.grade || '');
    const sel = document.getElementById('sim-courses');
    if (!sel) return;

    sel.querySelectorAll('.sim-grade').forEach(s => s.addEventListener('change', () => {
      simGrades[s.dataset.i] = s.value === 'Belum' ? '' : s.value;
      updateSimResult();
    }));

    document.getElementById('sim-reset').addEventListener('click', () => {
      simGrades = courses.map(c => c.grade || '');
      sel.querySelectorAll('.sim-grade').forEach((s, i) => { s.value = courses[i].grade || 'Belum'; });
      updateSimResult();
    });

    function updateSimResult() {
      // compute simulated IPK
      let pts = 0, sks = 0;
      for (let i = 0; i < courses.length; i++) {
        const g = simGrades[i];
        if (!g) continue;
        pts += GRADE_POINTS[g] * courses[i].sks;
        sks += courses[i].sks;
      }
      const simIpk = sks > 0 ? (pts / sks) : 0;
      const bar = document.getElementById('scale-bar').querySelector('#sim-result');
      if (!bar) return;
      const pred = PREDICATE(simIpk);
      bar.className = `lg:col-span-2 ${pred.cls} rounded-2xl p-4 text-white shadow-sm`;
      bar.innerHTML = `
        <div class="flex items-center gap-2 mb-1"><span>🧮</span><p class="text-xs font-semibold opacity-90">Hasil Simulasi IPK</p></div>
        <div class="flex items-end gap-2"><span class="text-3xl font-extrabold">${simIpk.toFixed(2)}</span>
          ${simIpk >= target_gpa ? '<span class="text-xs bg-white/25 rounded-full px-2 py-1 mb-1.5 font-bold">Cum Laude tercapai 🎉</span>'
          : `<span class="text-xs bg-black/20 rounded-full px-2 py-1 mb-1.5">${(target_gpa - simIpk).toFixed(2)} menuju target ${target_gpa}</span>`}</div>`;
    }
  }

  function drawScale() {
    const bar = document.getElementById('scale-bar');
    if (!bar) return;
    bar.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <p class="text-xs text-slate-500 font-medium mb-1">Total SKS Diambil</p>
        <p class="text-2xl font-extrabold text-indigo-700">${summary.total_sks_taken}</p>
        <p class="text-[10px] text-slate-400">SKS tergrader: ${summary.total_sks_graded}</p>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <p class="text-xs text-slate-500 font-medium mb-1">Bobot Nilai (Skala 4.00)</p>
        <div class="flex flex-wrap gap-1">
          ${Object.entries(GRADE_POINTS).map(([g, p]) =>
            `<span class="text-[9px] font-mono bg-slate-100 rounded px-1.5 py-0.5"><b>${g}=${p}</b></span>`).join('')}
        </div>
      </div>
      <div id="sim-result" class="lg:col-span-2 bg-slate-200 rounded-2xl p-4 shadow-sm">
        <p class="text-xs text-slate-500">Hasil simulasi muncul di sini…</p>
      </div>`;
  }

  function drawTranscriptTable() {
    const table = main.querySelector('table.gtable');
    if (!table) return;
    table.innerHTML = `
      <thead><tr><th>Smt</th><th>Matkul</th><th>Kode</th><th>SKS</th><th>Nilai</th><th>Bobot</th><th>Poin (SKS×Bobot)</th></tr></thead>
      <tbody>
        ${transcript.length === 0 ? '<tr><td colspan="7" class="text-center text-slate-400 py-4">Belum ada semester.</td></tr>' :
        transcript.map(row => {
          if (row.courses.length === 0) {
            return `<tr><td class="font-bold">Smt ${row.semester_number}</td>
              <td colspan="6" class="text-slate-400 text-xs italic">${esc(row.academic_year)} — belum ada matkul</td></tr>`;
          }
          return row.courses.map((c, idx) => {
            const first = idx === 0
              ? `<td class="font-bold text-center align-top" rowspan="${row.courses.length}">Smt ${row.semester_number}<br/><span class="text-[10px] text-slate-400">IPS ${row.ips || '—'}</span></td>` : '';
            const bobot = c.grade ? GRADE_POINTS[c.grade] : null;
            return `<tr class="${c.grade ? '' : 'opacity-60'}">
              ${first}<td class="whitespace-nowrap">${esc(c.course_name)}</td>
              <td class="font-mono text-[11px]">${esc(c.course_code)}</td>
              <td class="text-center">${c.sks}</td>
              <td class="text-center font-bold">${esc(c.grade || '—')}</td>
              <td class="text-center font-mono">${bobot !== null ? bobot.toFixed(2) : '—'}</td>
              <td class="text-center font-mono">${bobot !== null ? (bobot * c.sks).toFixed(2) : '—'}</td>
            </tr>`;
          }).join('');
        }).join('')}
        <tr class="bg-indigo-50 font-bold">
          <td colspan="2" class="text-right">TOTAL</td>
          <td class="text-center">${summary.total_sks_taken}</td>
          <td></td><td></td>
          <td class="text-center font-mono">IPK ${summary.ipk.toFixed(2)}</td>
          <td class="text-center font-mono">${(summary.ipk * summary.total_sks_graded).toFixed(2)}</td>
        </tr>
      </tbody>`;
  }

  rerenderIfAny();
  function rerenderIfAny() { /* nothing */ }
}
