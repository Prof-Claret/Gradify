/**
 * Gradify Database Layer
 * SQLite relational database via node:sqlite (built into Node.js 22+)
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.GRADIFY_DB_PATH
  ? path.resolve(process.env.GRADIFY_DB_PATH)
  : path.join(DATA_DIR, 'gradify.db');
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA busy_timeout = 5000;');

/* ============================================================
 * SCHEMA
 * ============================================================ */
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_emoji TEXT DEFAULT '🎓',
  avatar_url TEXT,
  npm_nim TEXT,
  campus_name TEXT DEFAULT 'Universitas Katolik Santo Thomas (UNIKA UST)',
  faculty TEXT,
  study_program TEXT,
  active_semester INTEGER DEFAULT 1,
  target_gpa REAL DEFAULT 3.50,
  expected_graduation_year INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS semesters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semester_number INTEGER NOT NULL,
  academic_year TEXT NOT NULL,           -- e.g. "Ganjil 2026/2027"
  is_active INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  ips REAL,                              -- Semester GPA (computed/saved)
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, semester_number)
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL,
  course_name TEXT NOT NULL,
  sks INTEGER NOT NULL DEFAULT 3,
  day TEXT,                              -- Senin..Minggu
  start_time TEXT,                       -- HH:MM
  end_time TEXT,                         -- HH:MM
  room TEXT,
  lecturer TEXT,
  lecturer_contact TEXT,
  grade TEXT,                            -- A, A-, B+, etc.
  weight_tugas INTEGER DEFAULT 20,       -- grading weight scale (%)
  weight_uts INTEGER DEFAULT 30,
  weight_uas INTEGER DEFAULT 40,
  weight_lain INTEGER DEFAULT 10,        -- quiz / praktikum / kehadiran
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'tugas',             -- tugas | ujian | quiz | project | presentasi
  priority TEXT DEFAULT 'sedang',        -- rendah | sedang | tinggi
  due_date TEXT NOT NULL,                -- ISO date
  status TEXT DEFAULT 'pending',         -- pending | done
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',               -- Markdown with code blocks + LaTeX
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS budget_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,                -- kos, makan, transport, buku, hiburan, lainnya
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  item_type TEXT DEFAULT 'expense',      -- expense | income
  occurred_at TEXT DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skripsi_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,                   -- proposal, bab1..bab5, ujian, sidang, revisi
  status TEXT DEFAULT 'belum',           -- belum | berlangsung | selesai
  target_date TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT DEFAULT 'proyek',       -- proyek | prestasi | sertifikasi | organisasi | magang
  title TEXT NOT NULL,
  description TEXT,
  year TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS campus_logos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campus_name TEXT UNIQUE NOT NULL,
  logo_url TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

/* ---------- Multi-kampus, fakultas, prodi & fitur per prodi ---------- */
CREATE TABLE IF NOT EXISTS campuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  short_name TEXT,
  is_default INTEGER DEFAULT 0,          -- 1 = preset bawaan (tidak boleh dihapus)
  is_active INTEGER DEFAULT 1,           -- 0 = dinonaktifkan (tidak muncul saat registrasi)
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faculties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campus_id INTEGER NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(campus_id, name)
);

CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty_id INTEGER NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT DEFAULT 'S1',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(faculty_id, name)
);

CREATE TABLE IF NOT EXISTS features (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT DEFAULT '🧩',
  group_name TEXT,
  module_path TEXT,
  description TEXT,
  is_core INTEGER DEFAULT 0,             -- selalu tersedia untuk semua prodi
  is_general INTEGER DEFAULT 0,          -- tersedia untuk semua prodi (non-core)
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS program_features (
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES features(key) ON DELETE CASCADE,
  PRIMARY KEY (program_id, feature_key)
);

CREATE TABLE IF NOT EXISTS faculty_features (
  faculty_id INTEGER NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES features(key) ON DELETE CASCADE,
  PRIMARY KEY (faculty_id, feature_key)
);

/* ---------- Master dosen (per user) ---------- */
CREATE TABLE IF NOT EXISTS dosen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nip_nidn TEXT,
  nama TEXT NOT NULL,
  email TEXT,
  telepon TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

/* ---------- Presensi / kehadiran per mata kuliah ---------- */
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  meeting_no INTEGER,
  date TEXT NOT NULL,                    -- YYYY-MM-DD
  status TEXT DEFAULT 'hadir',           -- hadir | izin | sakit | alfa
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, course_id, date)
);

/* ---------- Materi kuliah (e-learning) ---------- */
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  link_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

/* ---------- Jadwal ujian (UTS/UAS/Quiz) ---------- */
CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'UTS',               -- UTS | UAS | Quiz | Remedial
  exam_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  room TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

/* ---------- Kalender akademik ---------- */
CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  type TEXT DEFAULT 'akademik',          -- akademik | libur | ujian | registrasi | lainnya
  created_at TEXT DEFAULT (datetime('now'))
);

/* ---------- Pengumuman kampus ---------- */
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  source TEXT,
  is_pinned INTEGER DEFAULT 0,
  published_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

/* ---------- KRS (status rencana studi per semester) ---------- */
CREATE TABLE IF NOT EXISTS krs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',           -- draft | diajukan | disetujui
  notes TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, semester_id)
);
`);

/* Migrate existing DBs that predate grading weight columns */
function ensureColumn(table, column, ddlType) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddlType}`);
  }
}
ensureColumn('courses', 'weight_tugas', 'INTEGER DEFAULT 20');
ensureColumn('courses', 'weight_uts', 'INTEGER DEFAULT 30');
ensureColumn('courses', 'weight_uas', 'INTEGER DEFAULT 40');
ensureColumn('courses', 'weight_lain', 'INTEGER DEFAULT 10');
ensureColumn('users', 'avatar_url', 'TEXT');
ensureColumn('users', 'is_admin', 'INTEGER DEFAULT 0');
ensureColumn('users', 'campus_id', 'INTEGER');
ensureColumn('users', 'faculty_id', 'INTEGER');
ensureColumn('users', 'program_id', 'INTEGER');
/* Lampiran & jawaban tugas (upload) */
ensureColumn('tasks', 'attachment_url', 'TEXT');
ensureColumn('tasks', 'attachment_name', 'TEXT');
ensureColumn('tasks', 'submission_url', 'TEXT');
ensureColumn('tasks', 'submission_name', 'TEXT');
ensureColumn('tasks', 'submitted_at', 'TEXT');

/* ============================================================
 * APP SETTINGS (admin dashboard)
 * ============================================================ */
const DEFAULT_APP_SETTINGS = {
  site_name: 'Gradify',
  site_tagline: 'Simplify Your Academic Journey',
  support_email: 'support@gradify.local',
  registration_enabled: '1',
  maintenance_mode: '0',
  maintenance_message: 'Gradify sedang dalam perbaikan. Silakan kembali beberapa saat lagi.',
  allow_custom_campus: '1',
  default_target_gpa: '3.50',
  announcement: '',
  site_logo: '',
  campus_logo: ''
};

for (const [key, value] of Object.entries(DEFAULT_APP_SETTINGS)) {
  db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
}

/* ============================================================
 * GRADE POINT SCALE (UNIKA UST standard 4.00 scale)
 * ============================================================ */
const GRADE_POINTS = {
  'A': 4.00, 'A-': 3.75, 'B+': 3.50, 'B': 3.00, 'B-': 2.75,
  'C+': 2.50, 'C': 2.00, 'C-': 1.75, 'D': 1.00, 'E': 0.00
};

function gradeToPoint(grade) {
  return GRADE_POINTS[grade] ?? 0;
}

/* ============================================================
 * UNIKA UST FACULTY & STUDY PROGRAM PRESETS (Phase 0)
 * ============================================================ */
const UNIKA_UST_PRESET = [
  {
    faculty: 'Fakultas Ilmu Komputer (FIKOM)',
    programs: ['Teknik Informatika (S1)', 'Sistem Informasi (S1)', 'Sains Data (S1)']
  },
  {
    faculty: 'Fakultas Ekonomi dan Bisnis (FEB)',
    programs: ['Manajemen (S1)', 'Akuntansi (S1)', 'Ekonomi Pembangunan (S1)']
  },
  {
    faculty: 'Fakultas Teknik (FT)',
    programs: ['Teknik Sipil (S1)', 'Teknik Arsitektur (S1)', 'Teknik Lingkungan (S1)']
  },
  {
    faculty: 'Fakultas Pertanian (FP)',
    programs: ['Agroteknologi (S1)', 'Teknologi Hasil Pertanian (S1)', 'Agribisnis (S1)']
  },
  {
    faculty: 'Fakultas Hukum (FH)',
    programs: ['Ilmu Hukum (S1)']
  },
  {
    faculty: 'Fakultas Filsafat (FF)',
    programs: ['Ilmu Filsafat (S1)']
  },
  {
    faculty: 'Fakultas Ilmu Budaya / Sastra (FIB)',
    programs: ['Sastra Inggris (S1)', 'Sastra Indonesia (S1)']
  },
  {
    faculty: 'Fakultas Keguruan dan Ilmu Pendidikan (FKIP)',
    programs: ['Pendidikan Matematika (S1)', 'Pendidikan Bahasa Inggris (S1)', 'Pendidikan Sains (S1)']
  }
];

/**
 * Maximum SKS allowance rule (per PRD 1.1)
 * IPS >= 3.00 => 24 SKS; 2.50-2.99 => 21; 2.00-2.49 => 18; < 2.00 => 15
 */
function maxSksForIps(ips) {
  if (ips >= 3.0) return 24;
  if (ips >= 2.5) return 21;
  if (ips >= 2.0) return 18;
  return 15;
}

/* ============================================================
 * GPA COMPUTATION HELPERS
 * ============================================================ */
function computeIps(courses) {
  // courses: [{sks, grade}]
  let totalPoints = 0, totalSks = 0;
  for (const c of courses) {
    if (!c.grade || c.grade === 'Belum' || c.grade === '') continue;
    totalPoints += gradeToPoint(c.grade) * c.sks;
    totalSks += c.sks;
  }
  return totalSks > 0 ? +(totalPoints / totalSks).toFixed(2) : 0;
}

module.exports = {
  db,
  DB_PATH,
  DEFAULT_APP_SETTINGS,
  GRADE_POINTS,
  UNIKA_UST_PRESET,
  gradeToPoint,
  maxSksForIps,
  computeIps
};
