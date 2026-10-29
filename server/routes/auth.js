/**
 * Gradify Auth Routes — Registration Wizard, Login, Profile
 */
const express = require('express');
const crypto = require('node:crypto');
const { db, UNIKA_UST_PRESET } = require('../db');

const router = express.Router();

/* ---------- helpers ---------- */
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return token;
}

function publicUser(u) {
  if (!u) return null;
  const { password_hash, salt, ...rest } = u;
  return rest;
}

/* ---------- middleware: requireAuth ---------- */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Tidak terautentikasi. Silakan login.' });

  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!session || new Date(session.expires_at) < new Date()) {
    if (session) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return res.status(401).json({ error: 'Sesi berakhir. Silakan login kembali.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
  if (!user) return res.status(401).json({ error: 'Akun tidak ditemukan.' });

  req.user = user;
  req.token = token;
  next();
}

/* ---------- GET /api/auth/presets: data fakultas & prodi UNIKA UST ---------- */
router.get('/presets', (req, res) => {
  res.json({
    campuses: [
      { id: 'unika-ust', name: 'Universitas Katolik Santo Thomas (UNIKA UST)', medan: true, faculties: UNIKA_UST_PRESET },
      { id: 'custom', name: 'Tambah Kampus Baru (Manual Input)' }
    ]
  });
});

/* ---------- POST /api/auth/register ---------- */
router.post('/register', (req, res) => {
  const {
    email, password, full_name, avatar_emoji = '🎓', npm_nim,
    campus_mode = 'preset', campus_name, faculty, study_program,
    active_semester = 1, target_gpa = 3.5, expected_graduation_year
  } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, dan nama lengkap wajib diisi.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email sudah terdaftar. Silakan login.' });
  }

  // Validation for campus mode
  if (campus_mode === 'preset') {
    if (!faculty || !study_program) {
      return res.status(400).json({ error: 'Fakultas dan Prodi wajib dipilih.' });
    }
  } else if (!campus_name) {
    return res.status(400).json({ error: 'Nama kampus custom wajib diisi.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);

  const resolvedCampus = campus_mode === 'preset'
    ? 'Universitas Katolik Santo Thomas (UNIKA UST)'
    : campus_name;

  // NOTE: Google OAuth / Apple ID hooks planned for v1.1 (requires provider credentials)
  const info = db.prepare(`
    INSERT INTO users (email, password_hash, salt, full_name, avatar_emoji, npm_nim,
      campus_name, faculty, study_program, active_semester, target_gpa, expected_graduation_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    email.toLowerCase(), hash, salt, full_name, avatar_emoji,
    npm_nim || null, resolvedCampus,
    campus_mode === 'preset' ? faculty : campus_name ? '' : faculty || null,
    campus_mode === 'preset' ? study_program : null,
    Math.min(Math.max(parseInt(active_semester) || 1, 1), 9),
    parseFloat(target_gpa) || 3.5,
    expected_graduation_year ? parseInt(expected_graduation_year) : null
  );

  const userId = info.lastInsertRowid;
  seedFirstSemester(userId, Math.min(Math.max(parseInt(active_semester) || 1, 1), 9));

  const token = createSession(userId);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.status(201).json({ token, user: publicUser(user) });
});

/* seed the first active semester for new users */
function seedFirstSemester(userId, semesterNumber) {
  const now = new Date();
  const year = now.getFullYear();
  const isGanjil = now.getMonth() >= 6; // Jul-Dec = Ganjil
  const academicYear = isGanjil ? 'Ganjil' : 'Genap';
  db.prepare('INSERT INTO semesters (user_id, semester_number, academic_year, is_active) VALUES (?, ?, ?, 1)')
    .run(userId, semesterNumber, `${academicYear} ${year}/${year + 1}`);
}

/* ---------- POST /api/auth/login ---------- */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Email atau password salah.' });

  const hash = hashPassword(password, user.salt);
  const ok = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.password_hash));
  if (!ok) return res.status(401).json({ error: 'Email atau password salah.' });

  const token = createSession(user.id);
  res.json({ token, user: publicUser(user) });
});

/* ---------- POST /api/auth/logout ---------- */
router.post('/logout', requireAuth, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
  res.json({ ok: true });
});

/* ---------- GET /api/auth/me ---------- */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

/* ---------- PUT /api/auth/profile: update student metadata (Phase 0.2) ---------- */
router.put('/profile', requireAuth, (req, res) => {
  const allowed = ['full_name', 'avatar_emoji', 'npm_nim', 'faculty', 'study_program',
    'active_semester', 'target_gpa', 'expected_graduation_year'];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (key in req.body) {
      updates.push(`${key} = ?`);
      let v = req.body[key];
      if (key === 'active_semester') v = Math.min(Math.max(parseInt(v) || 1, 1), 9);
      if (key === 'target_gpa') v = Math.min(Math.max(parseFloat(v) || 3.5, 0), 4);
      values.push(v);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada perubahan.' });

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values, req.user.id);

  // keep active semester in sync with semesters table
  if ('active_semester' in req.body) {
    const sem = db.prepare('SELECT id FROM semesters WHERE user_id = ? AND semester_number = ?')
      .get(req.user.id, req.body.active_semester);
    if (sem) {
      db.prepare('UPDATE semesters SET is_active = 0 WHERE user_id = ?').run(req.user.id);
      db.prepare('UPDATE semesters SET is_active = 1 WHERE id = ?').run(sem.id);
    }
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

/* ---------- POST /api/auth/promote: semester transition wizard ---------- */
router.post('/promote', requireAuth, (req, res) => {
  const current = req.user.active_semester;
  if (current >= 9) return res.status(400).json({ error: 'Sudah di semester maksimum.' });

  const next = current + 1;
  const existing = db.prepare('SELECT id FROM semesters WHERE user_id = ? AND semester_number = ?')
    .get(req.user.id, next);

  if (!existing) {
    // archive current, create next as active
    db.prepare('UPDATE semesters SET is_active = 0, is_archived = 1 WHERE user_id = ? AND semester_number = ?')
      .run(req.user.id, current);
    const now = new Date();
    const year = now.getFullYear();
    const isGanjil = now.getMonth() >= 6;
    db.prepare('INSERT INTO semesters (user_id, semester_number, academic_year, is_active) VALUES (?, ?, ?, 1)')
      .run(req.user.id, next, `${isGanjil ? 'Ganjil' : 'Genap'} ${year}/${year + 1}`);
  } else {
    db.prepare('UPDATE semesters SET is_active = 0 WHERE user_id = ?').run(req.user.id);
    db.prepare('UPDATE semesters SET is_active = 1, is_archived = 0 WHERE id = ?').run(existing.id);
  }

  db.prepare('UPDATE users SET active_semester = ? WHERE id = ?').run(next, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user), message: `Berhasil naik ke Semester ${next}. Semester sebelumnya diarsipkan.` });
});

/* ---------- PUT /api/auth/password ---------- */
router.put('/password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Field password wajib diisi.' });
  if (new_password.length < 6) return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });

  const hash = hashPassword(current_password, req.user.salt);
  const ok = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(req.user.password_hash));
  if (!ok) return res.status(401).json({ error: 'Password saat ini salah.' });

  const salt = crypto.randomBytes(16).toString('hex');
  const newHash = hashPassword(new_password, salt);
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(newHash, salt, req.user.id);
  res.json({ ok: true, message: 'Password berhasil diubah.' });
});

module.exports = { router, requireAuth };
