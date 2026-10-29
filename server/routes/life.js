/**
 * Gradify Life Routes — Budget, Skripsi Milestones, Portfolio (Phase 3 & 4)
 */
const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();
router.use(requireAuth);

/* ========== BUDGET / KOS EXPENSE TRACKER ========== */
const BUDGET_CATEGORIES = ['kos', 'makan', 'transport', 'buku', 'hiburan', 'lainnya'];

// GET /api/life/budget
router.get('/budget', (req, res) => {
  const items = db.prepare('SELECT * FROM budget_items WHERE user_id = ? ORDER BY occurred_at DESC, id DESC').all(req.user.id);
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const monthItems = items.filter(i => i.occurred_at.startsWith(month));
  const expenses = monthItems.filter(i => i.item_type === 'expense').reduce((a, i) => a + i.amount, 0);
  const income = monthItems.filter(i => i.item_type === 'income').reduce((a, i) => a + i.amount, 0);
  const byCategory = {};
  for (const cat of BUDGET_CATEGORIES) {
    byCategory[cat] = monthItems.filter(i => i.item_type === 'expense' && i.category === cat).reduce((a, i) => a + i.amount, 0);
  }
  res.json({ items, month, totals: { expenses, income, balance: income - expenses }, byCategory });
});

// POST /api/life/budget
router.post('/budget', (req, res) => {
  const { category, title, amount, item_type = 'expense', occurred_at } = req.body;
  if (!title || amount === undefined) return res.status(400).json({ error: 'Judul dan nominal wajib diisi.' });
  const cat = BUDGET_CATEGORIES.includes(category) ? category : 'lainnya';
  const it = ['expense', 'income'].includes(item_type) ? item_type : 'expense';
  const info = db.prepare('INSERT INTO budget_items (user_id, category, title, amount, item_type, occurred_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, cat, title, Math.abs(parseFloat(amount) || 0), it, occurred_at || new Date().toISOString().slice(0, 10));
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// DELETE /api/life/budget/:id
router.delete('/budget/:id', (req, res) => {
  const info = db.prepare('DELETE FROM budget_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Item tidak ditemukan.' });
  res.json({ ok: true });
});

/* ========== SKRIPSI / TA MILESTONE TRACKER ========== */
const SKRIPSI_TEMPLATE = [
  { title: 'Pengajuan Judul & Topik', stage: 'proposal', sort_order: 1 },
  { title: 'Proposal / Seminar 1', stage: 'proposal', sort_order: 2 },
  { title: 'Bab I - Pendahuluan', stage: 'bab1', sort_order: 3 },
  { title: 'Bab II - Landasan Teori', stage: 'bab2', sort_order: 4 },
  { title: 'Bab III - Metodologi', stage: 'bab3', sort_order: 5 },
  { title: 'Bab IV - Hasil & Pembahasan', stage: 'bab4', sort_order: 6 },
  { title: 'Bab V - Kesimpulan & Saran', stage: 'bab5', sort_order: 7 },
  { title: 'Ujian Skripsi / Munaqosah', stage: 'ujian', sort_order: 8 },
  { title: 'Sidang Akhir', stage: 'sidang', sort_order: 9 }
];

// GET /api/life/skripsi
router.get('/skripsi', (req, res) => {
  let milestones = db.prepare('SELECT * FROM skripsi_milestones WHERE user_id = ? ORDER BY sort_order').all(req.user.id);
  // auto-seed the template on first access
  if (milestones.length === 0) {
    const insert = db.prepare('INSERT INTO skripsi_milestones (user_id, title, stage, sort_order) VALUES (?, ?, ?, ?)');
    const tx = db.transaction(() => {
      for (const m of SKRIPSI_TEMPLATE) insert.run(req.user.id, m.title, m.stage, m.sort_order);
    });
    tx();
    milestones = db.prepare('SELECT * FROM skripsi_milestones WHERE user_id = ? ORDER BY sort_order').all(req.user.id);
  }
  const done = milestones.filter(m => m.status === 'selesai').length;
  res.json({ milestones, progress: Math.round((done / milestones.length) * 100) });
});

// PUT /api/life/skripsi/:id
router.put('/skripsi/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM skripsi_milestones WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!m) return res.status(404).json({ error: 'Milestone tidak ditemukan.' });
  const { title, stage, status, target_date, notes } = req.body;
  db.prepare(`UPDATE skripsi_milestones SET
      title = COALESCE(?, title), stage = COALESCE(?, stage),
      status = COALESCE(?, status), target_date = COALESCE(?, target_date), notes = COALESCE(?, notes)
    WHERE id = ?`).run(title, stage, status, target_date, notes, m.id);
  res.json({ ok: true });
});

// POST /api/life/skripsi — custom milestone
router.post('/skripsi', (req, res) => {
  const { title, stage = 'custom', status = 'belum', target_date = null, notes = null } = req.body;
  if (!title) return res.status(400).json({ error: 'Judul milestone wajib diisi.' });
  const max = db.prepare('SELECT MAX(sort_order) AS m FROM skripsi_milestones WHERE user_id = ?').get(req.user.id);
  const info = db.prepare('INSERT INTO skripsi_milestones (user_id, title, stage, status, target_date, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, title, stage, status, target_date, notes, (max.m || 0) + 1);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// DELETE /api/life/skripsi/:id
router.delete('/skripsi/:id', (req, res) => {
  const info = db.prepare('DELETE FROM skripsi_milestones WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Milestone tidak ditemukan.' });
  res.json({ ok: true });
});

/* ========== PORTFOLIO & CV AUTO-BUILDER ========== */
// GET /api/life/portfolio
router.get('/portfolio', (req, res) => {
  const items = db.prepare('SELECT * FROM portfolio_items WHERE user_id = ? ORDER BY year DESC, id DESC').all(req.user.id);
  res.json({ items });
});

// POST /api/life/portfolio
router.post('/portfolio', (req, res) => {
  const { item_type = 'proyek', title, description, year } = req.body;
  if (!title) return res.status(400).json({ error: 'Judul item wajib diisi.' });
  const info = db.prepare('INSERT INTO portfolio_items (user_id, item_type, title, description, year) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, item_type, title, description || null, year || null);
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// DELETE /api/life/portfolio/:id
router.delete('/portfolio/:id', (req, res) => {
  const info = db.prepare('DELETE FROM portfolio_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Item tidak ditemukan.' });
  res.json({ ok: true });
});

module.exports = router;
