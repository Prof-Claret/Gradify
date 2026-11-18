/**
 * Gradify Academic Routes — Semesters, Courses, Tasks, Transcript
 */
const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const { db, DB_PATH, computeIps, maxSksForIps, gradeToPoint } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();
router.use(requireAuth);

/* Secret used to derive a stable KTM verification code.
 * Set GRADIFY_CARD_SECRET in production to keep codes unguessable. */
const CARD_SECRET = process.env.GRADIFY_CARD_SECRET || 'gradify-ktm-v1';

/* ============================================================
 * UPLOAD (tugas, materi kuliah)
 * ============================================================ */
const FILE_DIR = path.join(path.dirname(DB_PATH), 'uploads', 'files');
const FILE_EXT = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
  'application/vnd.rar': '.rar',
  'application/x-7z-compressed': '.7z'
};

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (FILE_EXT[file.mimetype]) cb(null, true);
    else cb(new Error('Format file tidak didukung. Gunakan PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, gambar, TXT, CSV, atau ZIP.'));
  }
});

/** Terima satu file dari multipart, kembalikan { url, name } atau null. */
function receiveFile(req, res) {
  return new Promise((resolve) => {
    fileUpload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || 'Gagal mengunggah file.' });
        return resolve(undefined);
      }
      if (!req.file) return resolve(null);
      fs.mkdirSync(FILE_DIR, { recursive: true });
      const ext = FILE_EXT[req.file.mimetype] || '.bin';
      const filename = `u${req.user.id}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      fs.writeFileSync(path.join(FILE_DIR, filename), req.file.buffer);
      resolve({
        url: `/uploads/files/${filename}`,
        name: String(req.file.originalname || filename).slice(0, 180)
      });
    });
  });
}

/** Hapus file upload milik user (hanya dari folder files & pola nama kita). */
function removeFile(url) {
  if (!url || !url.startsWith('/uploads/files/')) return;
  const filename = path.basename(url);
  if (!/^u\d+-[a-f0-9]{16}\.[a-z0-9]+$/i.test(filename)) return;
  try { fs.unlinkSync(path.join(FILE_DIR, filename)); } catch { /* sudah tidak ada */ }
}

function courseOfUser(courseId, userId) {
  if (!courseId) return null;
  return db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId) || null;
}

function semesterOfUser(semesterId, userId) {
  if (!semesterId) return null;
  return db.prepare('SELECT * FROM semesters WHERE id = ? AND user_id = ?').get(semesterId, userId) || null;
}

function clampWeight(v, fallback) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, 0), 100);
}

/* ============================================================
 * SEMESTERS (Phase 1.1)
 * ============================================================ */

// GET /api/academics/semesters — all semesters with computed IPS
router.get('/semesters', (req, res) => {
  const sems = db.prepare('SELECT * FROM semesters WHERE user_id = ? ORDER BY semester_number').all(req.user.id);
  const courseStmt = db.prepare('SELECT sks, grade FROM courses WHERE semester_id = ?');
  const result = sems.map(s => {
    const courses = courseStmt.all(s.id);
    return { ...s, course_count: courses.length, total_sks: courses.reduce((a, c) => a + c.sks, 0), ips: computeIps(courses) };
  });
  res.json({ semesters: result });
});

// POST /api/academics/semesters — add a semester manually
router.post('/semesters', (req, res) => {
  const { semester_number, academic_year } = req.body;
  if (!semester_number) return res.status(400).json({ error: 'Nomor semester wajib diisi.' });
  const num = Math.min(Math.max(parseInt(semester_number), 1), 12);

  const existing = db.prepare('SELECT id FROM semesters WHERE user_id = ? AND semester_number = ?')
    .get(req.user.id, num);
  if (existing) return res.status(409).json({ error: `Semester ${num} sudah ada.` });

  const year = academic_year || `Ganjil ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  db.prepare('INSERT INTO semesters (user_id, semester_number, academic_year) VALUES (?, ?, ?)')
    .run(req.user.id, num, year);
  res.status(201).json({ ok: true });
});

// PUT /api/academics/semesters/:id — rename/activate/archive
router.put('/semesters/:id', (req, res) => {
  const sem = db.prepare('SELECT * FROM semesters WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!sem) return res.status(404).json({ error: 'Semester tidak ditemukan.' });

  if (req.body.action === 'activate') {
    db.prepare('UPDATE semesters SET is_active = 0 WHERE user_id = ?').run(req.user.id);
    db.prepare('UPDATE semesters SET is_active = 1 WHERE id = ?').run(sem.id);
    db.prepare('UPDATE users SET active_semester = ? WHERE id = ?').run(sem.semester_number, req.user.id);
  } else {
    const { academic_year, is_archived } = req.body;
    if (academic_year !== undefined) {
      db.prepare('UPDATE semesters SET academic_year = ? WHERE id = ?').run(academic_year, sem.id);
    }
    if (is_archived !== undefined) {
      db.prepare('UPDATE semesters SET is_archived = ? WHERE id = ?').run(is_archived ? 1 : 0, sem.id);
    }
  }
  res.json({ ok: true });
});

// DELETE /api/academics/semesters/:id
router.delete('/semesters/:id', (req, res) => {
  const sem = db.prepare('SELECT * FROM semesters WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!sem) return res.status(404).json({ error: 'Semester tidak ditemukan.' });
  if (sem.is_active) return res.status(400).json({ error: 'Tidak bisa menghapus semester aktif. Pindahkan dulu.' });
  db.prepare('DELETE FROM semesters WHERE id = ?').run(sem.id);
  res.json({ ok: true });
});

/* ============================================================
 * COURSES (Phase 1.2)
 * ============================================================ */

// GET /api/academics/courses?semester_id= — courses for one semester (or active)
router.get('/courses', (req, res) => {
  let semesterId;
  if (req.query.semester_id) {
    semesterId = req.query.semester_id;
  } else {
    const active = db.prepare('SELECT id FROM semesters WHERE user_id = ? AND is_active = 1').get(req.user.id);
    if (!active) return res.json({ courses: [] });
    semesterId = active.id;
  }
  const courses = db.prepare('SELECT * FROM courses WHERE semester_id = ? ORDER BY day, start_time').all(semesterId);
  res.json({ courses });
});

// POST /api/academics/courses
router.post('/courses', (req, res) => {
  const {
    semester_id, course_code, course_name, sks = 3, day, start_time, end_time,
    room, lecturer, lecturer_contact, grade,
    weight_tugas, weight_uts, weight_uas, weight_lain
  } = req.body;
  if (!course_code || !course_name) return res.status(400).json({ error: 'Kode dan nama matkul wajib diisi.' });

  const sem = db.prepare('SELECT id FROM semesters WHERE id = ? AND user_id = ?').get(semester_id, req.user.id);
  if (!sem) return res.status(404).json({ error: 'Semester tidak valid.' });

  const info = db.prepare(`
    INSERT INTO courses (
      user_id, semester_id, course_code, course_name, sks, day, start_time, end_time,
      room, lecturer, lecturer_contact, grade, weight_tugas, weight_uts, weight_uas, weight_lain
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, semester_id, course_code, course_name,
    Math.min(Math.max(parseInt(sks) || 3, 1), 12),
    day || null, start_time || null, end_time || null, room || null,
    lecturer || null, lecturer_contact || null, grade || null,
    clampWeight(weight_tugas, 20), clampWeight(weight_uts, 30),
    clampWeight(weight_uas, 40), clampWeight(weight_lain, 10));

  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// PUT /api/academics/courses/:id — edit incl. grade entry
router.put('/courses/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!c) return res.status(404).json({ error: 'Matkul tidak ditemukan.' });

  const allowed = [
    'course_code', 'course_name', 'sks', 'day', 'start_time', 'end_time',
    'room', 'lecturer', 'lecturer_contact', 'grade',
    'weight_tugas', 'weight_uts', 'weight_uas', 'weight_lain'
  ];
  const weightKeys = new Set(['weight_tugas', 'weight_uts', 'weight_uas', 'weight_lain']);
  const updates = [], values = [];
  for (const key of allowed) {
    if (key in req.body) {
      updates.push(`${key} = ?`);
      if (key === 'sks') values.push(Math.min(Math.max(parseInt(req.body[key]) || 3, 1), 12));
      else if (weightKeys.has(key)) values.push(clampWeight(req.body[key], c[key] ?? 0));
      else values.push(req.body[key]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada perubahan.' });
  db.prepare(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`).run(...values, c.id);
  res.json({ ok: true });
});

// DELETE /api/academics/courses/:id
router.delete('/courses/:id', (req, res) => {
  const info = db.prepare('DELETE FROM courses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Matkul tidak ditemukan.' });
  res.json({ ok: true });
});

/* ============================================================
 * DOSEN — master data dosen per user (Add / Edit / Delete)
 * ============================================================ */

// GET /api/academics/dosen — daftar dosen user
router.get('/dosen', (req, res) => {
  const rows = db.prepare('SELECT * FROM dosen WHERE user_id = ? ORDER BY nama').all(req.user.id);
  res.json({ dosen: rows });
});

// POST /api/academics/dosen — tambah dosen
router.post('/dosen', (req, res) => {
  const { nip_nidn, nama, email, telepon } = req.body || {};
  if (!nama || !nama.trim()) return res.status(400).json({ error: 'Nama dosen wajib diisi.' });
  const info = db.prepare(`
    INSERT INTO dosen (user_id, nip_nidn, nama, email, telepon)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, nip_nidn || null, nama.trim(), email || null, telepon || null);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// PUT /api/academics/dosen/:id — edit dosen
router.put('/dosen/:id', (req, res) => {
  const d = db.prepare('SELECT * FROM dosen WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!d) return res.status(404).json({ error: 'Dosen tidak ditemukan.' });
  const { nip_nidn, nama, email, telepon } = req.body || {};
  if (nama !== undefined && !nama.trim()) return res.status(400).json({ error: 'Nama dosen wajib diisi.' });
  const updates = [], values = [];
  if (nip_nidn !== undefined) { updates.push('nip_nidn = ?'); values.push(nip_nidn || null); }
  if (nama !== undefined) { updates.push('nama = ?'); values.push(nama.trim()); }
  if (email !== undefined) { updates.push('email = ?'); values.push(email || null); }
  if (telepon !== undefined) { updates.push('telepon = ?'); values.push(telepon || null); }
  if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada perubahan.' });
  db.prepare(`UPDATE dosen SET ${updates.join(', ')} WHERE id = ?`).run(...values, d.id);
  res.json({ ok: true });
});

// DELETE /api/academics/dosen/:id — hapus dosen
router.delete('/dosen/:id', (req, res) => {
  const d = db.prepare('SELECT * FROM dosen WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!d) return res.status(404).json({ error: 'Dosen tidak ditemukan.' });
  db.prepare('DELETE FROM dosen WHERE id = ?').run(d.id);
  res.json({ ok: true });
});

/* ============================================================
 * TASKS (Phase 1.3)
 * ============================================================ */

// GET /api/academics/tasks?scope=active|all|upcoming
router.get('/tasks', (req, res) => {
  const scope = req.query.scope || 'all';
  let rows;
  if (scope === 'upcoming') {
    rows = db.prepare(`
      SELECT t.*, c.course_name FROM tasks t
      LEFT JOIN courses c ON c.id = t.course_id
      WHERE t.user_id = ? AND t.status = 'pending' AND t.due_date >= date('now')
      ORDER BY t.due_date LIMIT 20
    `).all(req.user.id);
  } else {
    rows = db.prepare(`
      SELECT t.*, c.course_name FROM tasks t
      LEFT JOIN courses c ON c.id = t.course_id
      WHERE t.user_id = ? ORDER BY t.status, t.due_date
    `).all(req.user.id);
  }
  res.json({ tasks: rows });
});

// POST /api/academics/tasks
router.post('/tasks', (req, res) => {
  const { course_id, title, description, type = 'tugas', priority = 'sedang', due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Judul tugas wajib diisi.' });
  if (!due_date) return res.status(400).json({ error: 'Batas waktu (due date) wajib diisi.' });

  let cid = null;
  if (course_id) {
    const c = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(course_id, req.user.id);
    if (c) cid = c.id;
  }
  if (!['tugas', 'ujian', 'quiz', 'project', 'presentasi'].includes(type)) type = 'tugas';
  if (!['rendah', 'sedang', 'tinggi'].includes(priority)) priority = 'sedang';

  const info = db.prepare(`
    INSERT INTO tasks (user_id, course_id, title, description, type, priority, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, cid, title, description || null, type, priority, due_date);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// PUT /api/academics/tasks/:id — edit or toggle status
router.put('/tasks/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!t) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });

  if (req.body.action === 'toggle') {
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(t.status === 'done' ? 'pending' : 'done', t.id);
  } else {
    const allowed = ['title', 'description', 'type', 'priority', 'due_date'];
    const updates = [], values = [];
    for (const key of allowed) {
      if (key in req.body) { updates.push(`${key} = ?`); values.push(req.body[key]); }
    }
    if (updates.length > 0) {
      db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values, t.id);
    }
  }
  res.json({ ok: true });
});

// DELETE /api/academics/tasks/:id
router.delete('/tasks/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!t) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
  removeFile(t.attachment_url);
  removeFile(t.submission_url);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(t.id);
  res.json({ ok: true });
});

/* ---------- Lampiran & jawaban tugas (upload file) ---------- */

// POST /api/academics/tasks/:id/attachment — unggah lampiran/soal
router.post('/tasks/:id/attachment', async (req, res) => {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!t) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
  const file = await receiveFile(req, res);
  if (file === undefined) return;
  if (!file) return res.status(400).json({ error: 'Pilih file yang akan diunggah.' });
  if (t.attachment_url) removeFile(t.attachment_url);
  db.prepare('UPDATE tasks SET attachment_url = ?, attachment_name = ? WHERE id = ?')
    .run(file.url, file.name, t.id);
  res.status(201).json({ ok: true, url: file.url, name: file.name });
});

// DELETE /api/academics/tasks/:id/attachment
router.delete('/tasks/:id/attachment', (req, res) => {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!t) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
  removeFile(t.attachment_url);
  db.prepare('UPDATE tasks SET attachment_url = NULL, attachment_name = NULL WHERE id = ?').run(t.id);
  res.json({ ok: true });
});

// POST /api/academics/tasks/:id/submission — unggah jawaban tugas
router.post('/tasks/:id/submission', async (req, res) => {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!t) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
  const file = await receiveFile(req, res);
  if (file === undefined) return;
  if (!file) return res.status(400).json({ error: 'Pilih file jawaban yang akan diunggah.' });
  if (t.submission_url) removeFile(t.submission_url);
  db.prepare(`UPDATE tasks SET submission_url = ?, submission_name = ?, submitted_at = datetime('now') WHERE id = ?`)
    .run(file.url, file.name, t.id);
  res.status(201).json({ ok: true, url: file.url, name: file.name });
});

// DELETE /api/academics/tasks/:id/submission
router.delete('/tasks/:id/submission', (req, res) => {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!t) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
  removeFile(t.submission_url);
  db.prepare('UPDATE tasks SET submission_url = NULL, submission_name = NULL, submitted_at = NULL WHERE id = ?').run(t.id);
  res.json({ ok: true });
});

/* ============================================================
 * PRESENSI / KEHADIRAN
 * ============================================================ */

// GET /api/academics/attendance?semester_id=|course_id=
router.get('/attendance', (req, res) => {
  const params = [req.user.id];
  let sql = `SELECT a.*, c.course_name, c.course_code, c.sks
             FROM attendance a LEFT JOIN courses c ON c.id = a.course_id
             WHERE a.user_id = ?`;
  if (req.query.course_id) {
    sql += ' AND a.course_id = ?'; params.push(req.query.course_id);
  } else if (req.query.semester_id) {
    sql += ' AND c.semester_id = ?'; params.push(req.query.semester_id);
  }
  sql += ' ORDER BY a.date DESC, a.id DESC';
  const records = db.prepare(sql).all(...params);
  const summary = { hadir: 0, izin: 0, sakit: 0, alfa: 0, total: records.length };
  for (const r of records) if (summary[r.status] !== undefined) summary[r.status]++;
  summary.percentage = summary.total ? Math.round((summary.hadir / summary.total) * 1000) / 10 : 0;
  res.json({ records, summary });
});

// POST /api/academics/attendance — catat/ubah kehadiran (unik per matkul+tanggal)
router.post('/attendance', (req, res) => {
  const { course_id, date, status = 'hadir', meeting_no, notes } = req.body || {};
  const course = courseOfUser(course_id, req.user.id);
  if (!course) return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return res.status(400).json({ error: 'Tanggal presensi wajib diisi (YYYY-MM-DD).' });
  }
  const st = ['hadir', 'izin', 'sakit', 'alfa'].includes(status) ? status : 'hadir';
  const meeting = meeting_no === '' || meeting_no == null ? null : Math.max(parseInt(meeting_no, 10) || 1, 1);
  db.prepare(`
    INSERT INTO attendance (user_id, course_id, meeting_no, date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, course_id, date) DO UPDATE SET
      meeting_no = excluded.meeting_no,
      status = excluded.status,
      notes = excluded.notes
  `).run(req.user.id, course.id, meeting, date, st, notes || null);
  res.status(201).json({ ok: true });
});

// PUT /api/academics/attendance/:id
router.put('/attendance/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM attendance WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!a) return res.status(404).json({ error: 'Presensi tidak ditemukan.' });
  const allowed = ['meeting_no', 'date', 'status', 'notes'];
  const updates = [], values = [];
  for (const key of allowed) {
    if (key in req.body) {
      let val = req.body[key];
      if (key === 'status' && !['hadir', 'izin', 'sakit', 'alfa'].includes(val)) val = 'hadir';
      if (key === 'meeting_no') val = val === '' || val == null ? null : Math.max(parseInt(val, 10) || 1, 1);
      if (key === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(String(val))) {
        return res.status(400).json({ error: 'Format tanggal tidak valid.' });
      }
      updates.push(`${key} = ?`); values.push(val);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Tidak ada perubahan.' });
  db.prepare(`UPDATE attendance SET ${updates.join(', ')} WHERE id = ?`).run(...values, a.id);
  res.json({ ok: true });
});

// DELETE /api/academics/attendance/:id
router.delete('/attendance/:id', (req, res) => {
  const info = db.prepare('DELETE FROM attendance WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Presensi tidak ditemukan.' });
  res.json({ ok: true });
});

/* ============================================================
 * MATERI KULIAH (e-learning)
 * ============================================================ */

router.get('/materials', (req, res) => {
  const params = [req.user.id];
  let sql = `SELECT m.*, c.course_name, c.course_code
             FROM materials m LEFT JOIN courses c ON c.id = m.course_id
             WHERE m.user_id = ?`;
  if (req.query.course_id) { sql += ' AND m.course_id = ?'; params.push(req.query.course_id); }
  else if (req.query.semester_id) { sql += ' AND c.semester_id = ?'; params.push(req.query.semester_id); }
  sql += ' ORDER BY m.created_at DESC, m.id DESC';
  res.json({ materials: db.prepare(sql).all(...params) });
});

router.post('/materials', async (req, res) => {
  const file = await receiveFile(req, res);
  if (file === undefined) return;
  const { title, description, course_id, link_url } = req.body || {};
  if (!title || !String(title).trim()) {
    if (file) removeFile(file.url);
    return res.status(400).json({ error: 'Judul materi wajib diisi.' });
  }
  const course = courseOfUser(course_id, req.user.id);
  const info = db.prepare(`
    INSERT INTO materials (user_id, course_id, title, description, file_url, file_name, link_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, course ? course.id : null, String(title).trim(),
    description || null, file ? file.url : null, file ? file.name : null,
    link_url && String(link_url).trim() ? String(link_url).trim() : null);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

router.put('/materials/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM materials WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!m) return res.status(404).json({ error: 'Materi tidak ditemukan.' });
  const updates = [], values = [];
  if ('title' in req.body) {
    if (!String(req.body.title).trim()) return res.status(400).json({ error: 'Judul materi wajib diisi.' });
    updates.push('title = ?'); values.push(String(req.body.title).trim());
  }
  if ('description' in req.body) { updates.push('description = ?'); values.push(req.body.description || null); }
  if ('link_url' in req.body) { updates.push('link_url = ?'); values.push(req.body.link_url || null); }
  if ('course_id' in req.body) {
    const course = courseOfUser(req.body.course_id, req.user.id);
    updates.push('course_id = ?'); values.push(course ? course.id : null);
  }
  if (!updates.length) return res.status(400).json({ error: 'Tidak ada perubahan.' });
  db.prepare(`UPDATE materials SET ${updates.join(', ')} WHERE id = ?`).run(...values, m.id);
  res.json({ ok: true });
});

router.delete('/materials/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM materials WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!m) return res.status(404).json({ error: 'Materi tidak ditemukan.' });
  removeFile(m.file_url);
  db.prepare('DELETE FROM materials WHERE id = ?').run(m.id);
  res.json({ ok: true });
});

/* ============================================================
 * JADWAL UJIAN
 * ============================================================ */

router.get('/exams', (req, res) => {
  const params = [req.user.id];
  let sql = `SELECT e.*, c.course_name, c.course_code
             FROM exams e LEFT JOIN courses c ON c.id = e.course_id
             WHERE e.user_id = ?`;
  if (req.query.semester_id) { sql += ' AND c.semester_id = ?'; params.push(req.query.semester_id); }
  sql += ' ORDER BY e.exam_date, e.start_time';
  res.json({ exams: db.prepare(sql).all(...params) });
});

router.post('/exams', (req, res) => {
  const { course_id, type = 'UTS', exam_date, start_time, end_time, room, notes } = req.body || {};
  if (!exam_date) return res.status(400).json({ error: 'Tanggal ujian wajib diisi.' });
  const course = courseOfUser(course_id, req.user.id);
  const t = ['UTS', 'UAS', 'Quiz', 'Remedial'].includes(type) ? type : 'UTS';
  const info = db.prepare(`
    INSERT INTO exams (user_id, course_id, type, exam_date, start_time, end_time, room, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, course ? course.id : null, t, exam_date,
    start_time || null, end_time || null, room || null, notes || null);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

router.put('/exams/:id', (req, res) => {
  const e = db.prepare('SELECT * FROM exams WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!e) return res.status(404).json({ error: 'Jadwal ujian tidak ditemukan.' });
  const updates = [], values = [];
  for (const key of ['type', 'exam_date', 'start_time', 'end_time', 'room', 'notes']) {
    if (key in req.body) { updates.push(`${key} = ?`); values.push(req.body[key] || null); }
  }
  if ('course_id' in req.body) {
    const course = courseOfUser(req.body.course_id, req.user.id);
    updates.push('course_id = ?'); values.push(course ? course.id : null);
  }
  if (!updates.length) return res.status(400).json({ error: 'Tidak ada perubahan.' });
  db.prepare(`UPDATE exams SET ${updates.join(', ')} WHERE id = ?`).run(...values, e.id);
  res.json({ ok: true });
});

router.delete('/exams/:id', (req, res) => {
  const info = db.prepare('DELETE FROM exams WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Jadwal ujian tidak ditemukan.' });
  res.json({ ok: true });
});

/* ============================================================
 * KALENDER AKADEMIK
 * ============================================================ */

router.get('/calendar', (req, res) => {
  res.json({
    events: db.prepare('SELECT * FROM calendar_events WHERE user_id = ? ORDER BY start_date, id').all(req.user.id)
  });
});

router.post('/calendar', (req, res) => {
  const { title, description, start_date, end_date, type = 'akademik' } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Judul agenda wajib diisi.' });
  if (!start_date) return res.status(400).json({ error: 'Tanggal mulai wajib diisi.' });
  const t = ['akademik', 'libur', 'ujian', 'registrasi', 'lainnya'].includes(type) ? type : 'akademik';
  const info = db.prepare(`
    INSERT INTO calendar_events (user_id, title, description, start_date, end_date, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, String(title).trim(), description || null, start_date, end_date || null, t);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

router.put('/calendar/:id', (req, res) => {
  const e = db.prepare('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!e) return res.status(404).json({ error: 'Agenda tidak ditemukan.' });
  const updates = [], values = [];
  for (const key of ['title', 'description', 'start_date', 'end_date', 'type']) {
    if (key in req.body) {
      if ((key === 'title' || key === 'start_date') && !String(req.body[key] || '').trim()) {
        return res.status(400).json({ error: `${key === 'title' ? 'Judul' : 'Tanggal mulai'} wajib diisi.` });
      }
      updates.push(`${key} = ?`); values.push(req.body[key] || null);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Tidak ada perubahan.' });
  db.prepare(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`).run(...values, e.id);
  res.json({ ok: true });
});

router.delete('/calendar/:id', (req, res) => {
  const info = db.prepare('DELETE FROM calendar_events WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Agenda tidak ditemukan.' });
  res.json({ ok: true });
});

/* ============================================================
 * PENGUMUMAN
 * ============================================================ */

router.get('/announcements', (req, res) => {
  res.json({
    announcements: db.prepare(`
      SELECT * FROM announcements WHERE user_id = ?
      ORDER BY is_pinned DESC, published_at DESC, id DESC
    `).all(req.user.id)
  });
});

router.post('/announcements', (req, res) => {
  const { title, content = '', source, is_pinned } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Judul pengumuman wajib diisi.' });
  const info = db.prepare(`
    INSERT INTO announcements (user_id, title, content, source, is_pinned)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, String(title).trim(), content || '', source || null, is_pinned ? 1 : 0);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

router.put('/announcements/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM announcements WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!a) return res.status(404).json({ error: 'Pengumuman tidak ditemukan.' });
  const updates = [], values = [];
  for (const key of ['title', 'content', 'source', 'is_pinned']) {
    if (key in req.body) {
      if (key === 'title' && !String(req.body.title || '').trim()) {
        return res.status(400).json({ error: 'Judul pengumuman wajib diisi.' });
      }
      updates.push(`${key} = ?`);
      values.push(key === 'is_pinned' ? (req.body[key] ? 1 : 0) : (req.body[key] || null));
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Tidak ada perubahan.' });
  db.prepare(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`).run(...values, a.id);
  res.json({ ok: true });
});

router.delete('/announcements/:id', (req, res) => {
  const info = db.prepare('DELETE FROM announcements WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Pengumuman tidak ditemukan.' });
  res.json({ ok: true });
});

/* ============================================================
 * KRS — RENCANA STUDI PER SEMESTER
 * ============================================================ */

router.get('/krs', (req, res) => {
  const sem = req.query.semester_id
    ? semesterOfUser(req.query.semester_id, req.user.id)
    : db.prepare('SELECT * FROM semesters WHERE user_id = ? AND is_active = 1').get(req.user.id);
  if (!sem) return res.json({ krs: null, courses: [], total_sks: 0 });

  const krs = db.prepare('SELECT * FROM krs WHERE user_id = ? AND semester_id = ?').get(req.user.id, sem.id) || null;
  const courses = db.prepare('SELECT * FROM courses WHERE semester_id = ? AND user_id = ? ORDER BY course_code')
    .all(sem.id, req.user.id);
  res.json({
    semester: sem,
    krs,
    courses,
    total_sks: courses.reduce((sum, c) => sum + (c.sks || 0), 0)
  });
});

router.put('/krs', (req, res) => {
  const { semester_id, status = 'draft', notes } = req.body || {};
  const sem = semesterOfUser(semester_id, req.user.id);
  if (!sem) return res.status(404).json({ error: 'Semester tidak ditemukan.' });
  const st = ['draft', 'diajukan', 'disetujui'].includes(status) ? status : 'draft';
  db.prepare(`
    INSERT INTO krs (user_id, semester_id, status, notes, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, semester_id) DO UPDATE SET
      status = excluded.status,
      notes = excluded.notes,
      updated_at = datetime('now')
  `).run(req.user.id, sem.id, st, notes || null);
  res.json({ ok: true });
});

/* ============================================================
 * TRANSCRIPT & GPA SUMMARY (Phase 1.1 + Phase 3)
 * ============================================================ */

// GET /api/academics/transcript — per-semester breakdown + cumulative IPK
function buildTranscript(userId) {
  const sems = db.prepare('SELECT * FROM semesters WHERE user_id = ? ORDER BY semester_number').all(userId);
  const courseStmt = db.prepare('SELECT * FROM courses WHERE semester_id = ? ORDER BY course_code');

  let cumPoints = 0, cumSks = 0;
  const rows = sems.map(s => {
    const courses = courseStmt.all(s.id);
    const ips = computeIps(courses);
    for (const c of courses) {
      if (!c.grade) continue;
      cumPoints += gradeToPoint(c.grade) * c.sks;
      cumSks += c.sks;
    }
    const ipkSoFar = cumSks > 0 ? +(cumPoints / cumSks).toFixed(2) : 0;
    return {
      ...s,
      courses,
      ips,
      ipk_running: ipkSoFar,
      total_sks: courses.reduce((a, c) => a + c.sks, 0),
      graded_sks: courses.filter(c => c.grade).reduce((a, c) => a + c.sks, 0)
    };
  });

  const ipk = cumSks > 0 ? +(cumPoints / cumSks).toFixed(2) : 0;
  return {
    rows,
    summary: {
      ipk,
      total_sks_taken: rows.reduce((a, r) => a + r.total_sks, 0),
      total_sks_graded: cumSks,
      max_sks_next: maxSksForIps(ipk),
      predikat: ipk >= 3.5 ? 'Cum Laude (Sangat Memuaskan)' : ipk >= 3.0 ? 'Memuaskan' : ipk >= 2.0 ? 'Cukup' : 'Perlu Peningkatan'
    }
  };
}

router.get('/transcript', (req, res) => {
  const { rows, summary } = buildTranscript(req.user.id);
  res.json({ transcript: rows, summary, target_gpa: req.user.target_gpa });
});

/* ============================================================
 * STUDENT ID CARD (KTM) — printable identity data
 * ============================================================ */

function computeCardValidity(user) {
  const graduationYear = parseInt(user.expected_graduation_year, 10);
  if (Number.isFinite(graduationYear) && graduationYear > 0) {
    return `${graduationYear}-08-31`;
  }

  // Fallback: normal S1 duration = 8 semesters, counted from current semester.
  const activeSemester = parseInt(user.active_semester, 10) || 1;
  const remainingSemesters = Math.max(8 - activeSemester, 0);
  const yearsLeft = Math.max(1, Math.ceil((remainingSemesters + 1) / 2));
  const now = new Date();
  const academicYearStart = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${academicYearStart + yearsLeft}-08-31`;
}

function buildVerificationCode(user, cardNumber) {
  return crypto
    .createHmac('sha256', CARD_SECRET)
    .update(`${user.id}|${cardNumber}|${user.email}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase()
    .match(/.{1,4}/g)
    .join('-');
}

function todayLocalIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// GET /api/academics/student-card — data for previewing & printing a KTM
router.get('/student-card', (req, res) => {
  const user = req.user;
  const { summary } = buildTranscript(user.id);
  const activeSemester = db.prepare(
    'SELECT academic_year FROM semesters WHERE user_id = ? AND is_active = 1 ORDER BY semester_number DESC LIMIT 1'
  ).get(user.id);

  const npm = (user.npm_nim || '').trim();
  const cardNumber = npm || `GRD-${String(user.id).padStart(6, '0')}`;
  const today = todayLocalIso();

  res.json({
    card_number: cardNumber,
    verification_code: buildVerificationCode(user, cardNumber),
    issued_at: (user.created_at || today).slice(0, 10),
    printed_at: today,
    valid_until: computeCardValidity(user),
    card_version: 'KTM-1.0',
    student: {
      full_name: user.full_name,
      npm_nim: npm || null,
      avatar_emoji: user.avatar_emoji || '🎓',
      avatar_url: user.avatar_url || null,
      faculty: user.faculty || null,
      study_program: user.study_program || null,
      campus_name: user.campus_name || 'Universitas Katolik Santo Thomas (UNIKA UST)',
      active_semester: user.active_semester
    },
    academic: {
      ...summary,
      academic_year: activeSemester?.academic_year || null
    }
  });
});

module.exports = router;
