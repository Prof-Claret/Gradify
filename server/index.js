/**
 * Gradify — Academic & Computer Science Super-App
 * Entry point: Express server + SQLite + static frontend
 */
const express = require('express');
const path = require('node:path');
const { DB_PATH } = require('./db');
const { router: authRoutes } = require('./routes/auth');
const academicsRoutes = require('./routes/academics');
const notesRoutes = require('./routes/notes');
const lifeRoutes = require('./routes/life');
const adminRoutes = require('./routes/admin');
const { getPublicConfig } = require('./utils/settings');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));

/* ---------- API routes ---------- */
app.use('/api/auth', authRoutes);
app.use('/api/academics', academicsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/life', lifeRoutes);
app.use('/api/admin', adminRoutes);

/* Public app configuration (branding, registration, maintenance) */
app.get('/api/config', (req, res) => res.json({ config: getPublicConfig() }));

/* Health check */
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Gradify', version: '1.0.0' }));

/* ---------- Static frontend ---------- */
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

/* SPA fallback for client-side routing */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
  }
  if (req.path === '/admin' || req.path.startsWith('/admin/')) {
    return res.sendFile(path.join(publicDir, 'admin', 'index.html'));
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

/* ---------- Error handler ---------- */
app.use((err, req, res, next) => {
  console.error('[Gradify Error]', err.message);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => {
  console.log(``);
  console.log(`  🎓 Gradify v1.0.0 — Simplify Your Academic Journey`);
  console.log(`  ➜  Server berjalan di:  http://localhost:${PORT}`);
  console.log(`  ➜  Dashboard admin:     http://localhost:${PORT}/admin`);
  console.log(`  ➜  Database:            ${DB_PATH} (SQLite)`);
  console.log(`  © 2026 Gradify — Built for Academic & Educational Excellence`);
});
