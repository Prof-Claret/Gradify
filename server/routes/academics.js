/**
 * Gradify Academic Routes — Semesters, Courses, Tasks, Transcript
 */
const express = require('express');
const { db, computeIps, maxSksForIps, gradeToPoint } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();
router.use(requireAuth);

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
  const { semester_id, course_code, course_name, sks = 3, day, start_time, end_time, room, lecturer, lecturer_contact, grade } = req.body;
  if (!course_code || !course_name) return res.status(400).json({ error: 'Kode dan nama matkul wajib diisi.' });

  const sem = db.prepare('SELECT id FROM semesters WHERE id = ? AND user_id = ?').get(semester_id, req.user.id);
  if (!sem) return res.status(404).json({ error: 'Semester tidak valid.' });

  const info = db.prepare(`
    INSERT INTO courses (user_id, semester_id, course_code, course_name, sks, day, start_time, end_time, room, lecturer, lecturer_contact, grade)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, semester_id, course_code, course_name,
    Math.min(Math.max(parseInt(sks) || 3, 1), 12),
    day || null, start_time || null, end_time || null, room || null,
    lecturer || null, lecturer_contact || null, grade || null);

  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// PUT /api/academics/courses/:id — edit incl. grade entry
router.put('/courses/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!c) return res.status(404).json({ error: 'Matkul tidak ditemukan.' });

  const allowed = ['course_code', 'course_name', 'sks', 'day', 'start_time', 'end_time', 'room', 'lecturer', 'lecturer_contact', 'grade'];
  const updates = [], values = [];
  for (const key of allowed) {
    if (key in req.body) {
      updates.push(`${key} = ?`);
      values.push(key === 'sks' ? Math.min(Math.max(parseInt(req.body[key]) || 3, 1), 12) : req.body[key]);
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
  const info = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
  res.json({ ok: true });
});

/* ============================================================
 * TRANSCRIPT & GPA SUMMARY (Phase 1.1 + Phase 3)
 * ============================================================ */

// GET /api/academics/transcript — per-semester breakdown + cumulative IPK
router.get('/transcript', (req, res) => {
  const sems = db.prepare('SELECT * FROM semesters WHERE user_id = ? ORDER BY semester_number').all(req.user.id);
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
  res.json({
    transcript: rows,
    summary: {
      ipk,
      total_sks_taken: rows.reduce((a, r) => a + r.total_sks, 0),
      total_sks_graded: cumSks,
      max_sks_next: maxSksForIps(ipk),
      predikat: ipk >= 3.5 ? 'Cum Laude (Sangat Memuaskan)' : ipk >= 3.0 ? 'Memuaskan' : ipk >= 2.0 ? 'Cukup' : 'Perlu Peningkatan'
    },
    target_gpa: req.user.target_gpa
  });
});

module.exports = router;
