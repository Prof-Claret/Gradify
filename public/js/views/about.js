/**
 * About App & About Developer (PRD Bab 4)
 */
import { esc } from '../app.js';

export const subtitle = () => 'Tentang Aplikasi & Pengembang';

const FEATURES = [
  ['Phase 0', 'Registrasi Wizard & Profil Akademik', 'Onboarding 3 langkah, preset 8 fakultas UNIKA UST, mode kampus custom, hub identitas.'],
  ['Phase 1', 'Semester & Mata Kuliah', 'Kelola semester 1–8+, semester switcher, arsip/transkrip, transition wizard, kalkulator SKS, CRD/CRUD matkul, dashboard tugas, catatan CS Markdown.'],
  ['Phase 2', 'Toolkit CS', 'Kalkulator ilmiah + palet simbol Yunani, sistem bilangan, matriks (det/adj/OBE), kalkulus, statistika, Matematika Diskrit lengkap, SQL builder, regex tester, subnet/CIDR, Big-O reference.'],
  ['Phase 3', 'GPA & Kehidupan', 'Transkrip + IPK, simulator Cum Laude, pelacak milestone skripsi, budget kos, auto-builder portofolio & CV.']
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
          v1.0.0 — Beta Release
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
      <h3 class="font-bold text-slate-800 text-lg">👨‍💻 Tentang Pengembang</h3>
      <div class="mt-3 text-sm text-slate-600 space-y-2">
        <p><b>Lead Developer / Creator:</b> Student Developer Team — Fakultas Ilmu Komputer, Teknik Informatika</p>
        <p><b>Affiliation:</b> Universitas Katolik Santo Thomas (UNIKA UST Medan), North Sumatra, Indonesia</p>
        <p class="leading-relaxed bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs italic">
          "Berkomitmen untuk menciptakan solusi perangkat lunak berstandar tinggi yang mampu menyelesaikan
          permasalahan nyata di dunia akademik dan mendukung rekan-rekan mahasiswa meraih predikat kelulusan
          terbaik (<b>Cum Laude</b>)."
        </p>
        <div class="flex flex-wrap gap-2 pt-2">
          <span class="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1">📧 ${esc('support@gradify.ac.id')}</span>
          <span class="text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1">🏛️ UNIKA UST Medan</span>
        </div>
      </div>
      <p class="text-[11px] text-slate-400 mt-5 border-t border-slate-100 pt-3">© 2026 Gradify. All rights reserved. Built for Academic &amp; Educational Excellence. Lisensi MIT.</p>
    </div>
  </div>`;
}
