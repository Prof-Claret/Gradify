/**
 * Integration tests for Export/Import Data (.xii).
 * Arsip .xii = ZIP berisi manifest.json + database.json + seluruh upload.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gradify-xii-test-'));
process.env.GRADIFY_DB_PATH = path.join(TMP_DIR, 'gradify.db');

const { router: authRouter } = require('../server/routes/auth');
const adminRouter = require('../server/routes/admin');
const { db, DB_PATH } = require('../server/db');
const {
  readXiiArchive,
  restoreUploads,
  createZip,
  safeEntryPath
} = require('../server/utils/xiiArchive');

const UPLOADS_DIR = path.join(path.dirname(DB_PATH), 'uploads');
const AVATAR_NAME = 'avatar-1-' + 'a'.repeat(32) + '.webp';
const LOGO_NAME = 'site-logo-123456.png';
const FILE_NAME = 'u1-' + 'b'.repeat(16) + '.pdf';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

let server;
let baseUrl;
let token;
let userId;

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

function ensureSession() {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  token = `xii-token-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+1 day'))")
    .run(token, userId);
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  const info = db.prepare(`
    INSERT INTO users (email, password_hash, salt, full_name, is_admin, campus_name, faculty, study_program)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    'admin-xii@gradify.local', 'hash', 'salt', 'Admin Uji',
    'Universitas Katolik Santo Thomas (UNIKA UST)',
    'Fakultas Ilmu Komputer (FIKOM)', 'Teknik Informatika (S1)'
  );
  userId = Number(info.lastInsertRowid);

  token = `xii-token-${Date.now()}`;
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+1 day'))")
    .run(token, userId);

  db.prepare('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)')
    .run(userId, 'Catatan Penting', 'Isi catatan yang harus ikut ter-export.');

  fs.mkdirSync(path.join(UPLOADS_DIR, 'avatars'), { recursive: true });
  fs.mkdirSync(path.join(UPLOADS_DIR, 'logos'), { recursive: true });
  fs.mkdirSync(path.join(UPLOADS_DIR, 'files'), { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, 'avatars', AVATAR_NAME), Buffer.from('avatar-bytes'));
  fs.writeFileSync(path.join(UPLOADS_DIR, 'logos', LOGO_NAME), Buffer.from('logo-bytes'));
  fs.writeFileSync(path.join(UPLOADS_DIR, 'files', FILE_NAME), Buffer.from('pdf-bytes'));
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  try { db.close(); } catch { /* ignore */ }
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

test('export .xii menghasilkan ZIP berisi database dan upload', async () => {
  const res = await fetch(`${baseUrl}/api/admin/database/export-xii`, {
    headers: authHeaders()
  });

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-disposition') || '', /\.xii"?$/);
  assert.equal(res.headers.get('content-type'), 'application/zip');

  const buffer = Buffer.from(await res.arrayBuffer());
  assert.equal(buffer.subarray(0, 4).toString('binary'), 'PK\x03\x04');

  const archive = readXiiArchive(buffer);
  assert.equal(archive.manifest.format, 'gradify-xii');
  assert.equal(archive.manifest.version, 1);
  assert.ok(archive.tables.users.some(u => u.id === userId));
  assert.ok(archive.tables.notes.some(n => n.title === 'Catatan Penting'));

  const names = archive.files.map(f => f.name);
  assert.ok(names.includes(`uploads/avatars/${AVATAR_NAME}`));
  assert.ok(names.includes(`uploads/logos/${LOGO_NAME}`));
  assert.ok(names.includes(`uploads/files/${FILE_NAME}`));
});

test('import .xii memulihkan database, akun, dan file upload', async () => {
  const exportRes = await fetch(`${baseUrl}/api/admin/database/export-xii`, {
    headers: authHeaders()
  });
  const buffer = Buffer.from(await exportRes.arrayBuffer());

  // Rusak data setelah export
  db.prepare('DELETE FROM notes WHERE user_id = ?').run(userId);
  db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run('Nama Sudah Diubah', userId);
  fs.rmSync(path.join(UPLOADS_DIR, 'avatars', AVATAR_NAME), { force: true });

  const fd = new FormData();
  fd.append('backup', new Blob([buffer], { type: 'application/zip' }), 'gradify-data.xii');

  const res = await fetch(`${baseUrl}/api/admin/database/import-xii`, {
    method: 'POST',
    headers: authHeaders(),
    body: fd
  });
  const data = await res.json();

  assert.equal(res.status, 200, JSON.stringify(data));
  assert.equal(data.ok, true);
  assert.equal(data.reauth, true);
  assert.match(data.safety_backup, /^gradify-pre-import-.*\.db$/);
  assert.ok(data.uploads.restored >= 3);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  assert.equal(user.full_name, 'Admin Uji');

  const notes = db.prepare('SELECT * FROM notes WHERE user_id = ?').all(userId);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, 'Catatan Penting');

  assert.equal(fs.existsSync(path.join(UPLOADS_DIR, 'avatars', AVATAR_NAME)), true);
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM sessions').get().c, 0);
});

test('import menolak file selain .xii', async () => {
  ensureSession();
  const fd = new FormData();
  fd.append('backup', new Blob(['bukan arsip']), 'backup.zip');

  const res = await fetch(`${baseUrl}/api/admin/database/import-xii`, {
    method: 'POST',
    headers: authHeaders(),
    body: fd
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.match(data.error, /\.xii/i);
});

test('arsip dengan checksum salah ditolak', () => {
  const database = Buffer.from(JSON.stringify({ tables: { users: [] } }));
  const manifest = Buffer.from(JSON.stringify({
    format: 'gradify-xii',
    version: 1,
    checksums: { database_sha256: 'deadbeef' }
  }));
  const zip = createZip([
    { name: 'manifest.json', data: manifest },
    { name: 'database.json', data: database }
  ]);

  assert.throws(() => readXiiArchive(zip), /Checksum/i);
});

test('restoreUploads menolak path traversal dan melewati file asing', () => {
  assert.throws(
    () => restoreUploads([{ name: 'uploads/avatars/../evil.txt', data: Buffer.from('x') }], UPLOADS_DIR),
    /path traversal/i
  );

  const result = restoreUploads(
    [{ name: 'uploads/evil.txt', data: Buffer.from('x') }],
    UPLOADS_DIR
  );
  assert.equal(result.restored, 0);
  assert.equal(result.skipped, 1);
});

test('safeEntryPath menolak path absolut', () => {
  assert.throws(() => safeEntryPath('/etc/passwd'), /absolut|tidak diizinkan/i);
  assert.throws(() => safeEntryPath('C:\\Windows\\evil.txt'), /absolut|tidak diizinkan/i);
});
