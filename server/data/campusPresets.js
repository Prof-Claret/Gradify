/**
 * Preset kampus default: kampus → fakultas → prodi, serta katalog fitur.
 *
 * Data ini di-seed secara idempotent saat server berjalan. Admin tetap dapat
 * mengubah/menambah data melalui dashboard admin; seed tidak menimpa perubahan
 * pemetaan fitur setelah seed pertama.
 */

/* ============================================================
 * KATALOG FITUR
 * - is_core    : selalu tampil untuk semua prodi
 * - is_general : tampil untuk semua prodi (opsional, non-core)
 * ============================================================ */
const FEATURES = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', group: null, module: '/js/views/dashboard.js', description: 'Ringkasan akademik harian', is_core: 1, is_general: 0, sort_order: 10 },
  { key: 'semesters', label: 'Kelola Semester', icon: '🗓️', group: 'Akademik', module: '/js/views/semesters.js', description: 'Kelola semester aktif dan arsip', is_core: 1, is_general: 0, sort_order: 20 },
  { key: 'courses', label: 'Mata Kuliah', icon: '📚', group: 'Akademik', module: '/js/views/courses.js', description: 'Jadwal dan data mata kuliah', is_core: 1, is_general: 0, sort_order: 30 },
  { key: 'notes', label: 'Catatan', icon: '📝', group: 'Akademik', module: '/js/views/notes.js', description: 'Catatan perkuliahan Markdown', is_core: 1, is_general: 0, sort_order: 40 },
  { key: 'gpa', label: 'IPK & Transkrip', icon: '🎯', group: 'Akademik', module: '/js/views/gpa.js', description: 'Transkrip dan simulasi IPK', is_core: 1, is_general: 0, sort_order: 50 },
  { key: 'student-card', label: 'Kartu Mahasiswa', icon: '🪪', group: 'Akademik', module: '/js/views/student-card.js', description: 'KTM digital siap cetak', is_core: 1, is_general: 0, sort_order: 60 },
  { key: 'calculator', label: 'Kalkulator Ilmiah', icon: '🧮', group: 'Umum', module: '/js/views/calculator.js', description: 'Kalkulator ilmiah & simbol Yunani', is_core: 0, is_general: 1, sort_order: 100 },

  { key: 'cs-toolkit', label: 'CS Math Toolkit', icon: '🛠️', group: 'Toolkit CS', module: '/js/views/toolkit.js', description: 'Sistem bilangan, matriks, kalkulus, statistik', is_core: 0, is_general: 0, sort_order: 200 },
  { key: 'discrete-math', label: 'Matematika Diskrit', icon: '🔗', group: 'Toolkit CS', module: '/js/views/discrete.js', description: 'Logika, himpunan, graf, kombinatorika', is_core: 0, is_general: 0, sort_order: 210 },
  { key: 'dev-tools', label: 'Dev Tools', icon: '💻', group: 'Toolkit CS', module: '/js/views/devtools.js', description: 'SQL, regex, CIDR, dan Big-O', is_core: 0, is_general: 0, sort_order: 220 },

  { key: 'acc-toolkit', label: 'Toolkit Keuangan & Akuntansi', icon: '🧾', group: 'Toolkit Keuangan', module: '/js/views/accounting.js', description: 'Rasio keuangan, penyusutan, NPV/IRR, BEP, PPh 21', is_core: 0, is_general: 0, sort_order: 300 },

  { key: 'civil-toolkit', label: 'Toolkit Teknik Sipil', icon: '🏗️', group: 'Toolkit Teknik', module: '/js/views/civil.js', description: 'Konversi satuan, volume beton, kebutuhan besi, kemiringan, RAB', is_core: 0, is_general: 0, sort_order: 400 },

  { key: 'law-toolkit', label: 'Toolkit Hukum', icon: '⚖️', group: 'Toolkit Hukum', module: '/js/views/law.js', description: 'Kalkulator daluwarsa, timeline kasus, checklist berkas', is_core: 0, is_general: 0, sort_order: 500 },

  { key: 'skripsi', label: 'Skripsi', icon: '📗', group: 'Kehidupan', module: '/js/views/life.js', description: 'Milestone skripsi & tugas akhir', is_core: 1, is_general: 0, sort_order: 60 },
  { key: 'portfolio', label: 'Portofolio & CV', icon: '🏅', group: 'Kehidupan', module: '/js/views/life.js', description: 'Portofolio, prestasi, dan CV', is_core: 1, is_general: 0, sort_order: 70 },
  { key: 'profile', label: 'Pengaturan Akun', icon: '⚙️', group: null, module: '/js/views/profile.js', description: 'Profil, keamanan, dan foto', is_core: 1, is_general: 0, sort_order: 900 },
  { key: 'about', label: 'Tentang', icon: 'ℹ️', group: null, module: '/js/views/about.js', description: 'Tentang aplikasi & pengembang', is_core: 1, is_general: 0, sort_order: 910 }
];

/* ============================================================
 * DATA KAMPUS DEFAULT
 * ============================================================ */
const CAMPUSES = [
  {
    name: 'Universitas Katolik Santo Thomas (UNIKA UST)',
    short_name: 'UNIKA UST',
    faculties: [
      {
        name: 'Fakultas Ilmu Komputer (FIKOM)',
        programs: [
          { name: 'Teknik Informatika', level: 'S1', features: ['cs-toolkit', 'discrete-math', 'dev-tools'] },
          { name: 'Sistem Informasi', level: 'S1', features: ['dev-tools'] },
          { name: 'Sains Data', level: 'S1', features: ['cs-toolkit'] }
        ]
      },
      {
        name: 'Fakultas Ekonomi dan Bisnis (FEB)',
        programs: [
          { name: 'Manajemen', level: 'S1', features: ['acc-toolkit'] },
          { name: 'Akuntansi', level: 'S1', features: ['acc-toolkit'] },
          { name: 'Ekonomi Pembangunan', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Teknik (FT)',
        programs: [
          { name: 'Teknik Sipil', level: 'S1', features: ['civil-toolkit'] },
          { name: 'Teknik Arsitektur', level: 'S1', features: ['civil-toolkit'] },
          { name: 'Teknik Lingkungan', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Pertanian (FP)',
        programs: [
          { name: 'Agroteknologi', level: 'S1', features: [] },
          { name: 'Teknologi Hasil Pertanian', level: 'S1', features: [] },
          { name: 'Agribisnis', level: 'S1', features: [] }
        ]
      },
      { name: 'Fakultas Hukum (FH)', programs: [{ name: 'Ilmu Hukum', level: 'S1', features: ['law-toolkit'] }] },
      { name: 'Fakultas Filsafat (FF)', programs: [{ name: 'Ilmu Filsafat', level: 'S1', features: [] }] },
      {
        name: 'Fakultas Ilmu Budaya / Sastra (FIB)',
        programs: [
          { name: 'Sastra Inggris', level: 'S1', features: [] },
          { name: 'Sastra Indonesia', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Keguruan dan Ilmu Pendidikan (FKIP)',
        programs: [
          { name: 'Pendidikan Matematika', level: 'S1', features: [] },
          { name: 'Pendidikan Bahasa Inggris', level: 'S1', features: [] },
          { name: 'Pendidikan Sains', level: 'S1', features: [] }
        ]
      }
    ]
  },
  {
    name: 'Universitas Sumatera Utara (USU)',
    short_name: 'USU',
    faculties: [
      { name: 'Fakultas Kedokteran', programs: [{ name: 'Pendidikan Dokter', level: 'S1', features: [] }] },
      { name: 'Fakultas Kedokteran Gigi', programs: [{ name: 'Pendidikan Dokter Gigi', level: 'S1', features: [] }] },
      { name: 'Fakultas Farmasi', programs: [{ name: 'Farmasi', level: 'S1', features: [] }] },
      { name: 'Fakultas Kesehatan Masyarakat', programs: [{ name: 'Kesehatan Masyarakat', level: 'S1', features: [] }] },
      { name: 'Fakultas Keperawatan', programs: [{ name: 'Ilmu Keperawatan', level: 'S1', features: [] }] },
      { name: 'Fakultas Psikologi', programs: [{ name: 'Psikologi', level: 'S1', features: [] }] },
      {
        name: 'Fakultas Ekonomi dan Bisnis',
        programs: [
          { name: 'Manajemen', level: 'S1', features: ['acc-toolkit'] },
          { name: 'Akuntansi', level: 'S1', features: ['acc-toolkit'] },
          { name: 'Ekonomi Pembangunan', level: 'S1', features: [] },
          { name: 'Ekonomi Islam', level: 'S1', features: [] }
        ]
      },
      { name: 'Fakultas Hukum', programs: [{ name: 'Ilmu Hukum', level: 'S1', features: ['law-toolkit'] }] },
      {
        name: 'Fakultas Ilmu Sosial dan Ilmu Politik',
        programs: [
          { name: 'Ilmu Komunikasi', level: 'S1', features: [] },
          { name: 'Ilmu Politik', level: 'S1', features: [] },
          { name: 'Administrasi Publik', level: 'S1', features: [] },
          { name: 'Sosiologi', level: 'S1', features: [] },
          { name: 'Antropologi', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Ilmu Budaya',
        programs: [
          { name: 'Sastra Inggris', level: 'S1', features: [] },
          { name: 'Sastra Indonesia', level: 'S1', features: [] },
          { name: 'Sejarah', level: 'S1', features: [] },
          { name: 'Etnomusikologi', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Matematika dan Ilmu Pengetahuan Alam',
        programs: [
          { name: 'Matematika', level: 'S1', features: [] },
          { name: 'Fisika', level: 'S1', features: [] },
          { name: 'Kimia', level: 'S1', features: [] },
          { name: 'Biologi', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Teknik',
        programs: [
          { name: 'Teknik Sipil', level: 'S1', features: ['civil-toolkit'] },
          { name: 'Teknik Mesin', level: 'S1', features: [] },
          { name: 'Teknik Elektro', level: 'S1', features: [] },
          { name: 'Teknik Industri', level: 'S1', features: [] },
          { name: 'Teknik Kimia', level: 'S1', features: [] },
          { name: 'Arsitektur', level: 'S1', features: ['civil-toolkit'] }
        ]
      },
      {
        name: 'Fakultas Pertanian',
        programs: [
          { name: 'Agroteknologi', level: 'S1', features: [] },
          { name: 'Agribisnis', level: 'S1', features: [] },
          { name: 'Ilmu Tanah', level: 'S1', features: [] }
        ]
      },
      { name: 'Fakultas Kehutanan', programs: [{ name: 'Kehutanan', level: 'S1', features: [] }] },
      { name: 'Fakultas Peternakan', programs: [{ name: 'Peternakan', level: 'S1', features: [] }] },
      {
        name: 'Fakultas Ilmu Komputer dan Teknologi Informasi',
        programs: [
          { name: 'Ilmu Komputer', level: 'S1', features: ['cs-toolkit', 'discrete-math', 'dev-tools'] },
          { name: 'Teknologi Informasi', level: 'S1', features: ['cs-toolkit', 'dev-tools'] },
          { name: 'Sistem Informasi', level: 'S1', features: ['dev-tools'] }
        ]
      }
    ]
  },
  {
    name: 'Universitas Negeri Medan (Unimed)',
    short_name: 'Unimed',
    faculties: [
      {
        name: 'Fakultas Ilmu Pendidikan',
        programs: [
          { name: 'Pendidikan Guru Sekolah Dasar', level: 'S1', features: [] },
          { name: 'Pendidikan Anak Usia Dini', level: 'S1', features: [] },
          { name: 'Administrasi Pendidikan', level: 'S1', features: [] },
          { name: 'Bimbingan dan Konseling', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Bahasa dan Seni',
        programs: [
          { name: 'Sastra Indonesia', level: 'S1', features: [] },
          { name: 'Sastra Inggris', level: 'S1', features: [] },
          { name: 'Pendidikan Bahasa Indonesia', level: 'S1', features: [] },
          { name: 'Pendidikan Bahasa Inggris', level: 'S1', features: [] },
          { name: 'Seni Rupa', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Matematika dan Ilmu Pengetahuan Alam',
        programs: [
          { name: 'Pendidikan Matematika', level: 'S1', features: [] },
          { name: 'Pendidikan Fisika', level: 'S1', features: [] },
          { name: 'Pendidikan Kimia', level: 'S1', features: [] },
          { name: 'Pendidikan Biologi', level: 'S1', features: [] },
          { name: 'Matematika', level: 'S1', features: [] },
          { name: 'Biologi', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Ilmu Sosial',
        programs: [
          { name: 'Pendidikan Sejarah', level: 'S1', features: [] },
          { name: 'Pendidikan Geografi', level: 'S1', features: [] },
          { name: 'Pendidikan Ekonomi', level: 'S1', features: [] },
          { name: 'Pendidikan Pancasila dan Kewarganegaraan', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Teknik',
        programs: [
          { name: 'Pendidikan Teknik Mesin', level: 'S1', features: [] },
          { name: 'Pendidikan Teknik Elektro', level: 'S1', features: [] },
          { name: 'Pendidikan Teknik Bangunan', level: 'S1', features: [] },
          { name: 'Teknik Sipil', level: 'S1', features: ['civil-toolkit'] }
        ]
      },
      {
        name: 'Fakultas Ilmu Keolahragaan',
        programs: [
          { name: 'Ilmu Keolahragaan', level: 'S1', features: [] },
          { name: 'Pendidikan Jasmani', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Ekonomi',
        programs: [
          { name: 'Manajemen', level: 'S1', features: ['acc-toolkit'] },
          { name: 'Akuntansi', level: 'S1', features: ['acc-toolkit'] },
          { name: 'Pendidikan Ekonomi', level: 'S1', features: [] }
        ]
      },
      { name: 'Fakultas Hukum', programs: [{ name: 'Ilmu Hukum', level: 'S1', features: ['law-toolkit'] }] }
    ]
  },
  {
    name: 'Universitas Islam Negeri Sumatera Utara (UINSU)',
    short_name: 'UINSU',
    faculties: [
      {
        name: 'Fakultas Ilmu Tarbiyah dan Keguruan',
        programs: [
          { name: 'Pendidikan Agama Islam', level: 'S1', features: [] },
          { name: 'Pendidikan Matematika', level: 'S1', features: [] },
          { name: 'Pendidikan Bahasa Inggris', level: 'S1', features: [] },
          { name: 'Pendidikan Guru Madrasah Ibtidaiyah', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Syariah dan Hukum',
        programs: [
          { name: 'Hukum Keluarga Islam', level: 'S1', features: [] },
          { name: 'Hukum Ekonomi Syariah', level: 'S1', features: ['law-toolkit'] }
        ]
      },
      {
        name: 'Fakultas Ekonomi dan Bisnis Islam',
        programs: [
          { name: 'Ekonomi Islam', level: 'S1', features: ['acc-toolkit'] },
          { name: 'Perbankan Syariah', level: 'S1', features: ['acc-toolkit'] },
          { name: 'Manajemen', level: 'S1', features: ['acc-toolkit'] }
        ]
      },
      {
        name: 'Fakultas Dakwah dan Komunikasi',
        programs: [
          { name: 'Komunikasi Penyiaran Islam', level: 'S1', features: [] },
          { name: 'Bimbingan Konseling Islam', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Ushuluddin',
        programs: [
          { name: "Ilmu Al-Qur'an dan Tafsir", level: 'S1', features: [] },
          { name: 'Filsafat Islam', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Sains dan Teknologi',
        programs: [
          { name: 'Sistem Informasi', level: 'S1', features: ['dev-tools'] },
          { name: 'Teknologi Informasi', level: 'S1', features: ['dev-tools'] },
          { name: 'Matematika', level: 'S1', features: [] },
          { name: 'Biologi', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Kesehatan Masyarakat',
        programs: [{ name: 'Kesehatan Masyarakat', level: 'S1', features: [] }]
      }
    ]
  },
  {
    name: 'Universitas Muhammadiyah Sumatera Utara (UMSU)',
    short_name: 'UMSU',
    faculties: [
      {
        name: 'Fakultas Ilmu Komputer dan Teknologi Informasi',
        programs: [
          { name: 'Sistem Informasi', level: 'S1', features: ['dev-tools'] },
          { name: 'Teknologi Informasi', level: 'S1', features: ['dev-tools'] }
        ]
      },
      {
        name: 'Fakultas Ekonomi dan Bisnis',
        programs: [
          { name: 'Manajemen', level: 'S1', features: ['acc-toolkit'] },
          { name: 'Akuntansi', level: 'S1', features: ['acc-toolkit'] }
        ]
      },
      { name: 'Fakultas Hukum', programs: [{ name: 'Ilmu Hukum', level: 'S1', features: ['law-toolkit'] }] },
      {
        name: 'Fakultas Keguruan dan Ilmu Pendidikan',
        programs: [
          { name: 'Pendidikan Bahasa Inggris', level: 'S1', features: [] },
          { name: 'Pendidikan Matematika', level: 'S1', features: [] },
          { name: 'Pendidikan Guru Sekolah Dasar', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Teknik',
        programs: [
          { name: 'Teknik Sipil', level: 'S1', features: ['civil-toolkit'] },
          { name: 'Teknik Mesin', level: 'S1', features: [] },
          { name: 'Teknik Elektro', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Pertanian',
        programs: [
          { name: 'Agroteknologi', level: 'S1', features: [] },
          { name: 'Agribisnis', level: 'S1', features: [] }
        ]
      },
      { name: 'Fakultas Agama Islam', programs: [{ name: 'Pendidikan Agama Islam', level: 'S1', features: [] }] },
      {
        name: 'Fakultas Ilmu Sosial dan Ilmu Politik',
        programs: [
          { name: 'Ilmu Komunikasi', level: 'S1', features: [] },
          { name: 'Administrasi Publik', level: 'S1', features: [] }
        ]
      },
      { name: 'Fakultas Kedokteran', programs: [{ name: 'Pendidikan Dokter', level: 'S1', features: [] }] },
      { name: 'Fakultas Psikologi', programs: [{ name: 'Psikologi', level: 'S1', features: [] }] }
    ]
  },
  {
    name: 'Universitas Prima Indonesia (UNPRI)',
    short_name: 'UNPRI',
    faculties: [
      { name: 'Fakultas Kedokteran', programs: [{ name: 'Pendidikan Dokter', level: 'S1', features: [] }] },
      { name: 'Fakultas Kedokteran Gigi', programs: [{ name: 'Pendidikan Dokter Gigi', level: 'S1', features: [] }] },
      { name: 'Fakultas Kesehatan Masyarakat', programs: [{ name: 'Kesehatan Masyarakat', level: 'S1', features: [] }] },
      { name: 'Fakultas Keperawatan', programs: [{ name: 'Ilmu Keperawatan', level: 'S1', features: [] }] },
      {
        name: 'Fakultas Ekonomi',
        programs: [
          { name: 'Manajemen', level: 'S1', features: ['acc-toolkit'] },
          { name: 'Akuntansi', level: 'S1', features: ['acc-toolkit'] }
        ]
      },
      { name: 'Fakultas Hukum', programs: [{ name: 'Ilmu Hukum', level: 'S1', features: ['law-toolkit'] }] },
      {
        name: 'Fakultas Teknik',
        programs: [
          { name: 'Teknik Sipil', level: 'S1', features: ['civil-toolkit'] },
          { name: 'Teknik Industri', level: 'S1', features: [] },
          { name: 'Teknik Elektro', level: 'S1', features: [] }
        ]
      },
      {
        name: 'Fakultas Ilmu Komputer dan Teknologi Informasi',
        programs: [
          { name: 'Sistem Informasi', level: 'S1', features: ['dev-tools'] },
          { name: 'Teknologi Informasi', level: 'S1', features: ['dev-tools'] }
        ]
      },
      {
        name: 'Fakultas Keguruan dan Ilmu Pendidikan',
        programs: [
          { name: 'Pendidikan Bahasa Inggris', level: 'S1', features: [] },
          { name: 'Pendidikan Matematika', level: 'S1', features: [] }
        ]
      },
      { name: 'Fakultas Agro Teknologi', programs: [{ name: 'Agroteknologi', level: 'S1', features: [] }] }
    ]
  }
];

module.exports = { FEATURES, CAMPUSES };
