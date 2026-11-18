/**
 * Gradify — Academic & Computer Science Super-App
 * Entry point: Express server + SQLite + static frontend
 */
const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { DB_PATH } = require('./db');
const { router: authRoutes } = require('./routes/auth');
const academicsRoutes = require('./routes/academics');
const notesRoutes = require('./routes/notes');
const lifeRoutes = require('./routes/life');
const adminRoutes = require('./routes/admin');
const { getPublicConfig } = require('./utils/settings');
const { getCampusLogoMap } = require('./utils/campusLogos');

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

/* Public campus logo map: { "Nama Kampus": "/uploads/logos/..." } */
app.get('/api/campus-logos', (req, res) => res.json({ logos: getCampusLogoMap() }));

/* ---------- Static logo uploads (site & campus logos) ---------- */
const LOGO_DIR = path.join(path.dirname(DB_PATH), 'uploads', 'logos');
const LOGO_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};
const VALID_LOGO_FILENAME = /^(site|campus)-logo-\d+(?:-[a-f0-9]+)?\.(png|jpe?g|webp|svg)$/;

app.get('/uploads/logos/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!VALID_LOGO_FILENAME.test(filename)) {
    return res.status(400).json({ error: 'Nama file logo tidak valid.' });
  }

  const targetPath = path.resolve(LOGO_DIR, filename);
  if (!targetPath.startsWith(path.resolve(LOGO_DIR))) {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }
  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'Logo tidak ditemukan.' });
  }

  const ext = path.extname(filename).toLowerCase();
  res.setHeader('Content-Type', LOGO_MIME[ext] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // SVG dapat berisi skrip — sandbox CSP menetralkannya saat dirender sebagai <img>.
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.sendFile(targetPath);
});

/* ---------- Static uploads for tugas/materi (dokumen & gambar) ---------- */
const FILE_DIR = path.join(path.dirname(DB_PATH), 'uploads', 'files');
const FILE_MIME = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed'
};
const VALID_FILE_FILENAME = /^u\d+-[a-f0-9]{16}\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|webp|txt|csv|zip|rar|7z)$/i;

app.get('/uploads/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!VALID_FILE_FILENAME.test(filename)) {
    return res.status(400).json({ error: 'Nama file tidak valid.' });
  }

  const targetPath = path.resolve(FILE_DIR, filename);
  if (!targetPath.startsWith(path.resolve(FILE_DIR))) {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }
  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'File tidak ditemukan.' });
  }

  const ext = path.extname(filename).toLowerCase();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  res.setHeader('Content-Type', FILE_MIME[ext] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  res.setHeader('Cache-Control', 'private, max-age=604800');
  res.sendFile(targetPath);
});

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
