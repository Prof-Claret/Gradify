/**
 * About App & About Developer (PRD Bab 4)
 */
import { esc } from '../app.js';

export const subtitle = () => 'Tentang Aplikasi & Pengembang';

const FEATURES = [
  ['Phase 0', 'Registrasi Wizard & Profil Akademik', 'Onboarding 3 langkah, preset 8 fakultas UNIKA UST, mode kampus custom, hub identitas.'],
  ['Phase 1', 'Semester & Mata Kuliah', 'Kelola semester 1–8+, semester switcher, arsip/transkrip, transition wizard, kalkulator SKS, CRD/CRUD matkul, dashboard tugas, catatan CS Markdown.'],
  ['Phase 2', 'Toolkit CS', 'Kalkulator ilmiah + palet simbol Yunani, sistem bilangan, matriks (det/adj/OBE), kalkulus, statistika, Matematika Diskrit lengkap, SQL builder, regex tester, subnet/CIDR, Big-O reference.'],
  ['Phase 3', 'GPA & Kehidupan', 'Transkrip + IPK, simulator Cum Laude, pelacak milestone skripsi, auto-builder portofolio & CV.']
];

export function render(main, ctx) {
  const u = ctx.user;
  main.innerHTML = `
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- About App -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 p-8 text-white text-center">
        <div class="text-5xl">🎓</div>
        <h2 class="text-2xl font-extrabold mt-2">Gradify</h2>
        <p class="text-indigo-200 italic mt-1">Simplify Your Academic Journey</p>
        <div class="inline-flex items-center gap-2 mt-3 bg-white/15 backdrop-blur rounded-full px-4 py-1.5 text-xs font-semibold">
          v1.0.0 — Stable Release
        </div>
      </div>
      <div class="p-6">
        <p class="text-sm text-slate-600 leading-relaxed">
          <b>Gradify</b> adalah <i>Academic &amp; Computer Science Super-App</i> yang dirancang khusus untuk membantu
          mahasiswa mengelola seluruh aspek perkuliahan secara terstruktur, intuitif, dan efisien — dari manajemen semester,
          jadwal kuliah, pelacak tugas, kalkulator IPK/IPS, manajemen skripsi, pencatatan kode, hingga toolkit penyelesaian
          soal Matematika Diskrit dan Informatika.
        </p>

        <div class="grid md:grid-cols-2 gap-3 mt-5">
          <div class="bg-slate-50 rounded-xl p-4">
            <p class="text-xs font-bold text-slate-500 uppercase mb-2">Core Technologies</p>
            <ul class="text-xs text-slate-600 space-y-1">
              <li>⚡ HTML5 — Modern JavaScript (ES6 Modules)</li>
              <li>🎨 Tailwind CSS</li>
              <li>∑ MathJax — LaTeX Renderer</li>
              <li>🟢 Node.js + Express</li>
              <li>🗄️ SQLite — Relational Database</li>
            </ul>
          </div>
          <div class="bg-slate-50 rounded-xl p-4">
            <p class="text-xs font-bold text-slate-500 uppercase mb-2">Roadmap Implementasi</p>
            <ul class="text-xs text-slate-600 space-y-1.5">
              ${FEATURES.map(([ph, t, d]) => `<li><span class="inline-block bg-indigo-100 text-indigo-700 font-bold text-[9px] px-1.5 py-0.5 rounded mr-1">${ph}</span><b>${esc(t)}</b><br/><span class="text-[10px] text-slate-500">${esc(d)}</span></li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- About Dev -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h3 class="font-bold text-slate-800 text-lg flex items-center gap-2">
          <span>👨‍💻</span> Tentang Pengembang
        </h3>
        <span class="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-3 py-1 font-semibold">
          🚀 Proyek Pribadi / Independen
        </span>
      </div>

      <div class="mt-4 text-sm text-slate-600 space-y-3">
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <p class="flex items-center gap-2">
            <span class="font-bold text-slate-800 min-w-[140px]">Creator / Developer:</span>
            <span class="font-semibold text-indigo-600">XII DEV / SCARLET DEV</span>
          </p>
          <p class="flex items-center gap-2">
            <span class="font-bold text-slate-800 min-w-[140px]">GitHub:</span>
            <a href="https://github.com/Prof-Claret" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold hover:underline">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              @Prof-Claret
            </a>
          </p>
          <p class="flex items-center gap-2">
            <span class="font-bold text-slate-800 min-w-[140px]">Status Kepemilikan:</span>
            <span class="text-slate-700">Project mandiri / personal project (<b>bukan proyek resmi atas nama kampus</b>)</span>
          </p>
        </div>

        <div class="leading-relaxed bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-950">
          <p class="font-semibold text-indigo-900 mb-1">💡 Catatan Pengembang:</p>
          <p class="italic">
            "Aplikasi Gradify ini dibangun dan dikembangkan secara independen oleh <b>XII DEV / SCARLET DEV</b> sebagai solusi digital komprehensif bagi mahasiswa. Seluruh pengembangan, desain arsitektur, dan kode program adalah proyek personal yang tidak berafiliasi maupun mewakili institusi kampus manapun."
          </p>
        </div>

        <div class="flex flex-wrap gap-2 pt-1">
          <a href="https://github.com/Prof-Claret" target="_blank" rel="noopener noreferrer" class="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full px-3.5 py-1.5 inline-flex items-center gap-1.5 transition">
            🐙 GitHub @Prof-Claret
          </a>
          <span class="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1.5 font-medium">📧 claretianovfx@gmail.com</span>
          <span class="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1.5 font-medium">✨ XII DEV / SCARLET DEV</span>
        </div>
      </div>
      <p class="text-[11px] text-slate-400 mt-5 border-t border-slate-100 pt-3">© 2026 Gradify by XII DEV / SCARLET DEV (@Prof-Claret). Proyek independen berlisensi MIT.</p>
    </div>
  </div>`;
}
