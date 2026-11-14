/**
 * Gradify Admin API — authentication, user management, settings, database backup/restore.
 * Mounted at /api/admin. All endpoints after the public setup/login block require an admin session.
 */
const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const multer = require('multer');
const { DatabaseSync } = require('node:sqlite');

const { db, DB_PATH, DEFAULT_APP_SETTINGS } = require('../db');
const {
  hashPassword, createSession, publicUser, requireAuth
} = require('./auth');
const {
  BOOLEAN_SETTINGS, getSettings, setSettings, ensureDefaultSettings
} = require('../utils/settings');
const { deleteOldAvatarFile } = require('../utils/avatarSecurity');
const {
  listCampuses, getCampusLogo, setCampusLogo, deleteCampusLogo
} = require('../utils/campusLogos');

const router = express.Router();
const packageJson = require('../../package.json');

const DATA_TABLES = [
  'users',
  'semesters',
  'courses',
  'tasks',
  'notes',
  'skripsi_milestones',
  'portfolio_items',
  'app_settings',
  'campus_logos'
];
const RESET_SEQUENCE_TABLES = [
  'users', 'semesters', 'courses', 'tasks', 'notes',
  'skripsi_milestones', 'portfolio_items', 'campus_logos'
];

const backupUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 }
});

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format file tidak didukung. Gunakan PNG, JPG, WebP, atau SVG.'));
  }
});

/* ============================================================
 * HELPERS
 * ============================================================ */
function adminCount() {
  return db.prepare('SELECT COUNT(*) AS c FROM users WHERE is_admin = 1').get().c;
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.is_admin) return next();
    res.status(403).json({ error: 'Akses ditolak. Akun ini bukan administrator.' });
  });
}

function timestamp() {
  return new Date().toISOString().replace('T', '_').replace(/[:.]/g, '-').slice(0, 23);
}

function dbSize() {
  let total = 0;
  for (const file of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
    try { total += fs.statSync(file).size; } catch { /* not present */ }
  }
  return total;
}

function backupDir() {
  const dir = path.join(path.dirname(DB_PATH), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function vacuumInto(file) {
  try {
    db.prepare('VACUUM INTO ?').run(file);
  } catch {
    const escaped = file.replaceAll("'", "''");
    db.exec(`VACUUM INTO '${escaped}'`);
  }
}

function pruneSafetyBackups(max = 10) {
  const dir = backupDir();
  const files = fs.readdirSync(dir)
    .filter(f => /^gradify-pre-import-.*\.db$/.test(f))
    .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const item of files.slice(max)) {
    try { fs.rmSync(path.join(dir, item.f), { force: true }); } catch { /* ignore */ }
  }
}

function createSafetyBackup() {
  const suffix = crypto.randomBytes(2).toString('hex');
  const file = path.join(backupDir(), `gradify-pre-import-${timestamp()}-${suffix}.db`);
  vacuumInto(file);
  pruneSafetyBackups();
  return path.basename(file);
}

function listSafetyBackups() {
  const dir = backupDir();
  return fs.readdirSync(dir)
    .filter(f => /^gradify-pre-import-.*\.db$/.test(f))
    .map(f => {
      const stat = fs.statSync(path.join(dir, f));
      return { filename: f, size: stat.size, created_at: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function tableColumns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
}

function tableCounts() {
  const counts = {};
  for (const table of DATA_TABLES) {
    counts[table] = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
  }
  return counts;
}

function parseJsonBackup(buffer) {
  let parsed;
  try { parsed = JSON.parse(buffer.toString('utf8')); }
  catch { throw new Error('File JSON tidak valid.'); }

  const source = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Struktur backup JSON tidak dikenali.');
  }

  const tables = {};
  for (const table of DATA_TABLES) {
    const rows = source[table];
    if (rows !== undefined && !Array.isArray(rows)) {
      throw new Error(`Tabel "${table}" pada backup tidak berisi array.`);
    }
    tables[table] = rows || [];
  }
  return tables;
}

function parseSqliteBackup(buffer) {
  const signature = buffer.subarray(0, 16).toString('utf8');
  if (signature !== 'SQLite format 3\u0000') {
    throw new Error('File bukan database SQLite yang valid.');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gradify-import-'));
  const tmpFile = path.join(tmpDir, 'import.db');
  fs.writeFileSync(tmpFile, buffer);

  let source;
  try {
    source = new DatabaseSync(tmpFile);
    const integrity = source.prepare('PRAGMA integrity_check').get();
    const result = integrity?.integrity_check;
    if (result !== 'ok') throw new Error('Pemeriksaan integritas database gagal.');

    const names = new Set(source.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table'"
    ).all().map(r => r.name));

    const tables = {};
    for (const table of DATA_TABLES) {
      tables[table] = names.has(table)
        ? source.prepare(`SELECT * FROM "${table}"`).all()
        : [];
    }
    return tables;
  } finally {
    try { source?.close(); } catch { /* ignore */ }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function validateImportTables(tables) {
  const users = tables.users;
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('Backup tidak memiliki data pengguna.');
  }
  if (!users.some(u => Number(u.is_admin) === 1)) {
    throw new Error('Backup tidak memiliki akun administrator. Import dibatalkan agar dashboard tidak terkunci.');
  }
  for (const user of users) {
    if (!user.email || !user.full_name || !user.password_hash || !user.salt) {
      throw new Error('Data pengguna pada backup tidak lengkap (email/nama/password).');
    }
  }
}

function importTables(tables) {
  validateImportTables(tables);

  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('DELETE FROM sessions');
    for (const table of [...DATA_TABLES].reverse()) {
      db.exec(`DELETE FROM ${table}`);
    }
    db.exec(`DELETE FROM sqlite_sequence WHERE name IN (${RESET_SEQUENCE_TABLES.map(t => `'${t}'`).join(',')})`);

    for (const table of DATA_TABLES) {
      const rows = tables[table] || [];
      if (rows.length === 0) continue;
      const columns = tableColumns(table);
      const stmt = db.prepare(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
      );
      for (const row of rows) {
        stmt.run(...columns.map(c => row[c] === undefined ? null : row[c]));
      }
    }

    ensureDefaultSettings();
    db.exec('COMMIT');
    return tableCounts();
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/* ============================================================
 * ADMIN LOGIN RATE LIMIT
 * ============================================================ */
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;

function checkLoginRate(key) {
  const now = Date.now();
  const history = (loginAttempts.get(key) || []).filter(t => now - t < LOGIN_WINDOW_MS);
  if (history.length >= MAX_LOGIN_ATTEMPTS) return false;
  history.push(now);
  loginAttempts.set(key, history);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, history] of loginAttempts.entries()) {
    const fresh = history.filter(t => now - t < LOGIN_WINDOW_MS);
    if (fresh.length) loginAttempts.set(key, fresh);
    else loginAttempts.delete(key);
  }
}, 10 * 60 * 1000).unref();

/* ============================================================
 * PUBLIC: setup & login
 * ============================================================ */
router.get('/setup-status', (req, res) => {
  res.json({
    needsSetup: adminCount() === 0,
    app: { name: 'Gradify', version: packageJson.version }
  });
});

router.post('/setup', (req, res) => {
  if (adminCount() > 0) {
    return res.status(403).json({ error: 'Administrator sudah tersedia. Silakan login.' });
  }

  const { email, password, full_name } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password administrator minimal 8 karakter.' });
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())) {
    return res.status(409).json({ error: 'Email sudah terdaftar. Gunakan email lain untuk administrator.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const info = db.prepare(`
    INSERT INTO users (email, password_hash, salt, full_name, avatar_emoji, campus_name,
      active_semester, target_gpa, is_admin)
    VALUES (?, ?, ?, ?, '🛡️', 'Administrator Gradify', 1, 3.5, 1)
  `).run(email.toLowerCase(), hash, salt, full_name);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = createSession(user.id);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const rateKey = `${req.ip || 'unknown'}:${String(email).toLowerCase()}`;
  if (!checkLoginRate(rateKey)) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba lagi dalam 5 menit.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (!user || !user.is_admin) {
    return res.status(401).json({ error: 'Email atau password administrator salah.' });
  }

  const hash = hashPassword(password, user.salt);
  const ok = hash.length === user.password_hash.length &&
    crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.password_hash));
  if (!ok) return res.status(401).json({ error: 'Email atau password administrator salah.' });

  loginAttempts.delete(rateKey);
  const token = createSession(user.id);
  res.json({ token, user: publicUser(user) });
});

/* ============================================================
 * ADMIN SESSION
 * ============================================================ */
router.use(requireAdmin);

router.get('/me', (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/logout', (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
  res.json({ ok: true });
});

router.put('/password', (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Password saat ini dan password baru wajib diisi.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Password baru minimal 8 karakter.' });
  }

  const currentHash = hashPassword(current_password, req.user.salt);
  const ok = currentHash.length === req.user.password_hash.length &&
    crypto.timingSafeEqual(Buffer.from(currentHash), Buffer.from(req.user.password_hash));
  if (!ok) return res.status(401).json({ error: 'Password saat ini salah.' });

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(new_password, salt);
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, req.user.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token <> ?').run(req.user.id, req.token);
  res.json({ ok: true, message: 'Password administrator berhasil diubah.' });
});

/* ============================================================
 * DASHBOARD
 * ============================================================ */
router.get('/stats', (req, res) => {
  const counts = tableCounts();
  const recentUsers = db.prepare(`
    SELECT id, full_name, email, npm_nim, study_program, is_admin, avatar_emoji, created_at
    FROM users ORDER BY created_at DESC LIMIT 6
  `).all();
  const newUsers7d = db.prepare(
    "SELECT COUNT(*) AS c FROM users WHERE created_at >= datetime('now', '-7 days')"
  ).get().c;
  const activeSessions = db.prepare(
    "SELECT COUNT(*) AS c FROM sessions WHERE expires_at > datetime('now')"
  ).get().c;
  const pendingTasks = db.prepare(
    "SELECT COUNT(*) AS c FROM tasks WHERE status = 'pending'"
  ).get().c;
  const latestActivity = db.prepare(`
    SELECT 'user' AS type, id, full_name AS title, created_at FROM users
    UNION ALL
    SELECT 'note' AS type, id, title, updated_at AS created_at FROM notes
    UNION ALL
    SELECT 'portfolio' AS type, id, title, created_at FROM portfolio_items
    ORDER BY created_at DESC LIMIT 8
  `).all();

  res.json({
    counts,
    users: {
      total: counts.users,
      admins: db.prepare('SELECT COUNT(*) AS c FROM users WHERE is_admin = 1').get().c,
      new_7d: newUsers7d,
      active_sessions: activeSessions
    },
    pending_tasks: pendingTasks,
    recent_users: recentUsers,
    latest_activity: latestActivity,
    database: {
      size_bytes: dbSize(),
      path: DB_PATH,
      tables: counts
    },
    system: {
      app_version: packageJson.version,
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      uptime_seconds: Math.floor(process.uptime()),
      memory_mb: +(process.memoryUsage().rss / 1024 / 1024).toFixed(1)
    }
  });
});

/* ============================================================
 * USER MANAGEMENT
 * ============================================================ */
router.get('/users', (req, res) => {
  const search = String(req.query.search || '').trim();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;

  let where = '';
  const params = [];
  if (search) {
    where = `WHERE u.full_name LIKE ? OR u.email LIKE ? OR COALESCE(u.npm_nim, '') LIKE ? OR COALESCE(u.study_program, '') LIKE ?`;
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  const total = db.prepare(`SELECT COUNT(*) AS c FROM users u ${where}`).get(...params).c;
  const rows = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.avatar_emoji, u.avatar_url, u.npm_nim,
      u.campus_name, u.faculty, u.study_program, u.active_semester, u.target_gpa,
      u.expected_graduation_year, u.is_admin, u.created_at,
      (SELECT COUNT(*) FROM courses c WHERE c.user_id = u.id) AS course_count,
      (SELECT COUNT(*) FROM notes n WHERE n.user_id = u.id) AS note_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.user_id = u.id) AS task_count
    FROM users u ${where}
    ORDER BY u.created_at DESC, u.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ users: rows, total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) });
});

router.get('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

  const counts = {
    semesters: db.prepare('SELECT COUNT(*) AS c FROM semesters WHERE user_id = ?').get(user.id).c,
    courses: db.prepare('SELECT COUNT(*) AS c FROM courses WHERE user_id = ?').get(user.id).c,
    notes: db.prepare('SELECT COUNT(*) AS c FROM notes WHERE user_id = ?').get(user.id).c,
    tasks: db.prepare('SELECT COUNT(*) AS c FROM tasks WHERE user_id = ?').get(user.id).c,
    skripsi_milestones: db.prepare('SELECT COUNT(*) AS c FROM skripsi_milestones WHERE user_id = ?').get(user.id).c,
    portfolio_items: db.prepare('SELECT COUNT(*) AS c FROM portfolio_items WHERE user_id = ?').get(user.id).c
  };
  const semesters = db.prepare(
    'SELECT id, semester_number, academic_year, is_active, ips FROM semesters WHERE user_id = ? ORDER BY semester_number'
  ).all(user.id);

  res.json({ user: publicUser(user), counts, semesters });
});

router.put('/users/:id', (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

  const allowed = [
    'full_name', 'email', 'npm_nim', 'campus_name', 'faculty', 'study_program',
    'active_semester', 'target_gpa', 'expected_graduation_year', 'avatar_emoji', 'is_admin'
  ];
  const updates = [];
  const values = [];

  for (const key of allowed) {
    if (!(key in req.body)) continue;
    let value = req.body[key];
    if (key === 'email') {
      value = String(value || '').trim().toLowerCase();
      if (!value) return res.status(400).json({ error: 'Email tidak boleh kosong.' });
      const duplicate = db.prepare('SELECT id FROM users WHERE email = ? AND id <> ?').get(value, target.id);
      if (duplicate) return res.status(409).json({ error: 'Email sudah digunakan pengguna lain.' });
    }
    if (key === 'full_name' && !String(value || '').trim()) {
      return res.status(400).json({ error: 'Nama lengkap tidak boleh kosong.' });
    }
    if (key === 'active_semester') value = Math.min(Math.max(parseInt(value, 10) || 1, 1), 9);
    if (key === 'target_gpa') {
      const parsed = parseFloat(value);
      value = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 4) : 3.5;
    }
    if (key === 'expected_graduation_year') value = value ? parseInt(value, 10) : null;
    if (key === 'is_admin') {
      value = value ? 1 : 0;
      if (target.id === req.user.id && value === 0) {
        return res.status(400).json({ error: 'Tidak dapat mencabut status admin dari akun yang sedang digunakan.' });
      }
      if (target.is_admin && value === 0 && adminCount() <= 1) {
        return res.status(400).json({ error: 'Minimal harus ada satu administrator aktif.' });
      }
    }
    updates.push(`${key} = ?`);
    values.push(value);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada perubahan.' });

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values, target.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(target.id);
  res.json({ user: publicUser(updated), message: 'Data pengguna berhasil diperbarui.' });
});

router.post('/users/:id/reset-password', (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(new_password, salt);
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, target.id);
  if (target.id === req.user.id) {
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token <> ?').run(target.id, req.token);
  } else {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id);
  }
  res.json({ ok: true, message: 'Password pengguna berhasil direset. Sesi lama telah dihentikan.' });
});

router.delete('/users/:id', (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'Tidak dapat menghapus akun yang sedang digunakan.' });
  }
  if (target.is_admin && adminCount() <= 1) {
    return res.status(400).json({ error: 'Minimal harus ada satu administrator aktif.' });
  }

  deleteOldAvatarFile(target.avatar_url, target.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(target.id);
  res.json({ ok: true, message: `Pengguna ${target.full_name} berhasil dihapus.` });
});

/* ============================================================
 * SETTINGS
 * ============================================================ */
router.get('/settings', (req, res) => {
  res.json({
    settings: getSettings(),
    defaults: DEFAULT_APP_SETTINGS,
    booleans: [...BOOLEAN_SETTINGS]
  });
});

router.put('/settings', (req, res) => {
  const patch = req.body || {};
  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: 'Tidak ada pengaturan yang dikirim.' });
  }
  if ('site_name' in patch && !String(patch.site_name || '').trim()) {
    return res.status(400).json({ error: 'Nama situs tidak boleh kosong.' });
  }
  if ('support_email' in patch && patch.support_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(patch.support_email))) {
    return res.status(400).json({ error: 'Format email dukungan tidak valid.' });
  }

  const updated = setSettings(patch);
  res.json({ settings: updated, message: 'Pengaturan berhasil disimpan.' });
});

/* ============================================================
 * LOGO UPLOAD
 * ============================================================ */
const LOGO_EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg'
};

function saveLogoFile(buffer, prefix, mimetype) {
  const uploadDir = path.join(path.dirname(DB_PATH), 'uploads', 'logos');
  fs.mkdirSync(uploadDir, { recursive: true });
  const ext = LOGO_EXTENSIONS[mimetype] || '.png';
  const suffix = crypto.randomBytes(4).toString('hex');
  const filename = `${prefix}-${Date.now()}-${suffix}${ext}`;
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, buffer);
  return `/uploads/logos/${filename}`;
}

function deleteLogoFile(logoUrl) {
  if (!logoUrl || !logoUrl.startsWith('/uploads/logos/')) return;
  try {
    const filepath = path.join(path.dirname(DB_PATH), logoUrl);
    if (fs.existsSync(filepath)) fs.rmSync(filepath, { force: true });
  } catch { /* ignore */ }
}

router.post('/settings/logo/site', logoUpload.single('logo'), (req, res) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ error: 'Pilih file logo terlebih dahulu.' });
  }
  try {
    const currentSettings = getSettings();
    if (currentSettings.site_logo) deleteLogoFile(currentSettings.site_logo);
    const logoUrl = saveLogoFile(req.file.buffer, 'site-logo', req.file.mimetype);
    const updated = setSettings({ site_logo: logoUrl });
    res.json({ settings: updated, message: 'Logo situs berhasil diunggah.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan logo situs.' });
  }
});

router.delete('/settings/logo/site', (req, res) => {
  try {
    const currentSettings = getSettings();
    if (currentSettings.site_logo) deleteLogoFile(currentSettings.site_logo);
    const updated = setSettings({ site_logo: '' });
    res.json({ settings: updated, message: 'Logo situs berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus logo situs.' });
  }
});

/* ============================================================
 * CAMPUS LOGOS — satu logo per nama kampus
 * ============================================================ */
router.get('/campuses', (req, res) => {
  res.json({ campuses: listCampuses() });
});

router.post('/campuses/logo', logoUpload.single('logo'), (req, res) => {
  const campusName = String(req.body?.campus_name || '').trim();
  if (!campusName) {
    return res.status(400).json({ error: 'Nama kampus wajib dipilih.' });
  }
  if (campusName.length > 120) {
    return res.status(400).json({ error: 'Nama kampus terlalu panjang.' });
  }
  if (!req.file?.buffer) {
    return res.status(400).json({ error: 'Pilih file logo terlebih dahulu.' });
  }

  try {
    deleteLogoFile(getCampusLogo(campusName));
    const logoUrl = saveLogoFile(req.file.buffer, 'campus-logo', req.file.mimetype);
    setCampusLogo(campusName, logoUrl);
    res.json({
      campus_name: campusName,
      logo_url: logoUrl,
      message: `Logo untuk ${campusName} berhasil diunggah.`
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan logo kampus.' });
  }
});

router.delete('/campuses/logo', (req, res) => {
  const campusName = String(req.query.campus || '').trim();
  if (!campusName) {
    return res.status(400).json({ error: 'Nama kampus wajib disertakan.' });
  }
  try {
    const removed = deleteCampusLogo(campusName);
    if (!removed) {
      return res.status(404).json({ error: 'Logo kampus tidak ditemukan.' });
    }
    deleteLogoFile(removed);
    res.json({ ok: true, message: `Logo untuk ${campusName} berhasil dihapus.` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus logo kampus.' });
  }
});

/* ============================================================
 * DATABASE EXPORT
 * ============================================================ */
router.get('/database/export', (req, res, next) => {
  const format = req.query.format === 'sqlite' ? 'sqlite' : 'json';
  const stamp = timestamp();

  if (format === 'json') {
    const data = {};
    for (const table of DATA_TABLES) {
      data[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }
    const payload = {
      meta: {
        app: 'Gradify',
        version: packageJson.version,
        format: 'json',
        exported_at: new Date().toISOString(),
        tables: tableCounts()
      },
      data
    };
    res.setHeader('Content-Disposition', `attachment; filename="gradify-backup-${stamp}.json"`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(JSON.stringify(payload, null, 2));
  }

  let tmpDir = null;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gradify-export-'));
    const file = path.join(tmpDir, 'gradify.db');
    vacuumInto(file);
    res.download(file, `gradify-backup-${stamp}.db`, (err) => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      if (err && !res.headersSent) next(err);
    });
  } catch (err) {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    next(err);
  }
});

/* ============================================================
 * DATABASE IMPORT & SAFETY BACKUPS
 * ============================================================ */
router.post('/database/import', (req, res) => {
  backupUpload.single('backup')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Ukuran file backup melebihi 50 MB.'
        : err.message;
      return res.status(400).json({ error: message });
    }

    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ error: 'Pilih file backup terlebih dahulu.' });
      }

      const ext = path.extname(req.file.originalname || '').toLowerCase();
      let tables;
      if (ext === '.json') tables = parseJsonBackup(req.file.buffer);
      else if (['.db', '.sqlite', '.sqlite3'].includes(ext)) tables = parseSqliteBackup(req.file.buffer);
      else return res.status(400).json({ error: 'Format backup harus .json, .db, .sqlite, atau .sqlite3.' });

      validateImportTables(tables);
      const safetyBackup = createSafetyBackup();
      const counts = importTables(tables);

      res.json({
        ok: true,
        reauth: true,
        message: 'Database berhasil dipulihkan. Semua sesi dihentikan; silakan login kembali.',
        safety_backup: safetyBackup,
        counts
      });
    } catch (importError) {
      console.error('[Admin Import]', importError.message);
      res.status(400).json({ error: importError.message || 'Import database gagal.' });
    }
  });
});

router.get('/database/backups', (req, res) => {
  res.json({ backups: listSafetyBackups() });
});

router.get('/database/backups/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!/^gradify-pre-import-.*\.db$/.test(filename)) {
    return res.status(400).json({ error: 'Nama file backup tidak valid.' });
  }
  const file = path.join(backupDir(), filename);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Backup tidak ditemukan.' });
  res.download(file, filename);
});

router.delete('/database/backups/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!/^gradify-pre-import-.*\.db$/.test(filename)) {
    return res.status(400).json({ error: 'Nama file backup tidak valid.' });
  }
  const file = path.join(backupDir(), filename);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Backup tidak ditemukan.' });
  fs.rmSync(file, { force: true });
  res.json({ ok: true, message: 'Backup dihapus.' });
});

router.post('/database/vacuum', (req, res) => {
  const before = dbSize();
  db.exec('VACUUM');
  res.json({ ok: true, message: 'Database berhasil dioptimalkan.', before, after: dbSize() });
});

module.exports = router;
