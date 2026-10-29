/**
 * Gradify Notes Routes — CS Code & Lecture Notes Engine (Phase 1.4)
 */
const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/notes/list
router.get('/list', (req, res) => {
  const notes = db.prepare(`
    SELECT n.id, n.title, n.created_at, n.updated_at, n.course_id, c.course_name
    FROM notes n LEFT JOIN courses c ON c.id = n.course_id
    WHERE n.user_id = ? ORDER BY n.updated_at DESC
  `).all(req.user.id);
  res.json({ notes });
});

// GET /api/notes/:id — full note with course info
router.get('/:id', (req, res) => {
  const note = db.prepare(`
    SELECT n.*, c.course_name, c.course_code
    FROM notes n LEFT JOIN courses c ON c.id = n.course_id
    WHERE n.id = ? AND n.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!note) return res.status(404).json({ error: 'Catatan tidak ditemukan.' });
  res.json({ note });
});

// POST /api/notes
router.post('/', (req, res) => {
  const { course_id, title, content = '' } = req.body;
  if (!title) return res.status(400).json({ error: 'Judul catatan wajib diisi.' });

  let cid = null;
  if (course_id) {
    const c = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(course_id, req.user.id);
    if (c) cid = c.id;
  }
  const info = db.prepare('INSERT INTO notes (user_id, course_id, title, content) VALUES (?, ?, ?, ?)')
    .run(req.user.id, cid, title, content);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// PUT /api/notes/:id
router.put('/:id', (req, res) => {
  const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!note) return res.status(404).json({ error: 'Catatan tidak ditemukan.' });

  const { course_id, title, content } = req.body;
  let cid = note.course_id;
  if (course_id !== undefined) {
    if (course_id === null || course_id === '') cid = null;
    else {
      const c = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(course_id, req.user.id);
      cid = c ? c.id : null;
    }
  }
  db.prepare(`UPDATE notes SET course_id = ?, title = ?, content = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(cid, title ?? '', content ?? '', note.id);
  res.json({ ok: true });
});

// DELETE /api/notes/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Catatan tidak ditemukan.' });
  res.json({ ok: true });
});

module.exports = router;
