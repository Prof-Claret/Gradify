/**
 * Integration tests for the admin dashboard API.
 * Uses an isolated temporary SQLite database.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gradify-admin-test-'));
process.env.GRADIFY_DB_PATH = path.join(TMP_DIR, 'gradify.db');

const adminRouter = require('../server/routes/admin');
const { router: authRouter } = require('../server/routes/auth');
const { db } = require('../server/db');
const { getPublicConfig } = require('../server/utils/settings');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.get('/api/config', (req, res) => res.json({ config: getPublicConfig() }));

let server;
let baseUrl;
let adminToken;

const ADMIN = {
  full_name: 'Admin Penguji',
  email: `admin_test_${Date.now()}@gradify.local`,
  password: 'AdminPassword123'
};

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  try { db.close(); } catch { /* ignore */ }
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

async function jsonFetch(url, options = {}) {
  const res = await fetch(`${baseUrl}${url}`, options);
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  return { res, data };
}

async function adminFetch(url, options = {}) {
  const headers = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${adminToken}`,
    ...(options.headers || {})
  };
  return jsonFetch(url, { ...options, headers });
}

test('admin setup is available only before the first administrator exists', async () => {
  const status = await jsonFetch('/api/admin/setup-status');
  assert.equal(status.res.status, 200);
  assert.equal(status.data.needsSetup, true);

  const setup = await jsonFetch('/api/admin/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN)
  });
  assert.equal(setup.res.status, 201);
  assert.ok(setup.data.token);
  assert.equal(setup.data.user.is_admin, 1);
  adminToken = setup.data.token;

  const second = await jsonFetch('/api/admin/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...ADMIN, email: 'second@gradify.local' })
  });
  assert.equal(second.res.status, 403);
});

test('admin endpoints require an admin token', async () => {
  const unauthorized = await jsonFetch('/api/admin/stats');
  assert.equal(unauthorized.res.status, 401);

  const admin = await adminFetch('/api/admin/me');
  assert.equal(admin.res.status, 200);
  assert.equal(admin.data.user.email, ADMIN.email);
});

test('dashboard stats and user management work', async () => {
  const stats = await adminFetch('/api/admin/stats');
  assert.equal(stats.res.status, 200);
  assert.equal(stats.data.users.total, 1);
  assert.equal(stats.data.users.admins, 1);
  assert.equal(stats.data.counts.users, 1);

  const register = await jsonFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `student_test_${Date.now()}@unika.ac.id`,
      password: 'StudentPassword123',
      full_name: 'Mahasiswa Uji Admin',
      campus_mode: 'preset',
      npm_nim: '220199001',
      faculty: 'Fakultas Ilmu Komputer (FIKOM)',
      study_program: 'Teknik Informatika (S1)'
    })
  });
  assert.equal(register.res.status, 201);

  const list = await adminFetch('/api/admin/users?search=Mahasiswa%20Uji');
  assert.equal(list.res.status, 200);
  assert.equal(list.data.total, 1);
  assert.equal(list.data.users[0].npm_nim, '220199001');

  const userId = list.data.users[0].id;
  const update = await adminFetch(`/api/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ full_name: 'Mahasiswa Diperbarui', target_gpa: 3.9 })
  });
  assert.equal(update.res.status, 200);
  assert.equal(update.data.user.full_name, 'Mahasiswa Diperbarui');

  const reset = await adminFetch(`/api/admin/users/${userId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ new_password: 'NewStudentPass123' })
  });
  assert.equal(reset.res.status, 200);

  const login = await jsonFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: register.data.user.email,
      password: 'NewStudentPass123'
    })
  });
  assert.equal(login.res.status, 200);
});

test('settings can be updated and affect public config', async () => {
  const before = await adminFetch('/api/admin/settings');
  assert.equal(before.res.status, 200);
  assert.equal(before.data.settings.site_name, 'Gradify');

  const update = await adminFetch('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({
      site_name: 'Gradify Kampus',
      registration_enabled: false,
      maintenance_mode: true,
      default_target_gpa: '3.75'
    })
  });
  assert.equal(update.res.status, 200);
  assert.equal(update.data.settings.site_name, 'Gradify Kampus');

  const config = await jsonFetch('/api/config');
  assert.equal(config.data.config.site_name, 'Gradify Kampus');
  assert.equal(config.data.config.registration_enabled, false);
  assert.equal(config.data.config.maintenance_mode, true);
  assert.equal(config.data.config.default_target_gpa, 3.75);

  const blocked = await jsonFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `blocked_${Date.now()}@unika.ac.id`,
      password: 'Password123',
      full_name: 'Registrasi Ditutup'
    })
  });
  assert.equal(blocked.res.status, 403);

  await adminFetch('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ registration_enabled: true, maintenance_mode: false })
  });

  const defaultGpa = await jsonFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `gpa_default_${Date.now()}@unika.ac.id`,
      password: 'Password123',
      full_name: 'Uji Target IPK Default',
      campus_mode: 'preset',
      faculty: 'Fakultas Ilmu Komputer (FIKOM)',
      study_program: 'Teknik Informatika (S1)'
    })
  });
  assert.equal(defaultGpa.res.status, 201);
  assert.equal(defaultGpa.data.user.target_gpa, 3.75);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(defaultGpa.data.user.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(defaultGpa.data.user.id);
});

test('database can be exported as JSON and SQLite', async () => {
  const json = await fetch(`${baseUrl}/api/admin/database/export?format=json`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(json.status, 200);
  assert.match(json.headers.get('content-disposition'), /gradify-backup-.*\.json/);
  const jsonBackup = await json.json();
  assert.equal(jsonBackup.meta.app, 'Gradify');
  assert.ok(Array.isArray(jsonBackup.data.users));
  assert.ok(jsonBackup.data.users.some(u => u.email === ADMIN.email));
  assert.ok(Array.isArray(jsonBackup.data.app_settings));

  const sqlite = await fetch(`${baseUrl}/api/admin/database/export?format=sqlite`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(sqlite.status, 200);
  assert.match(sqlite.headers.get('content-disposition'), /gradify-backup-.*\.db/);
  const bytes = Buffer.from(await sqlite.arrayBuffer());
  assert.equal(bytes.subarray(0, 16).toString('utf8'), 'SQLite format 3\u0000');
});

test('JSON backup can be imported and invalid backups are rejected', async () => {
  const exportRes = await fetch(`${baseUrl}/api/admin/database/export?format=json`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const backup = await exportRes.json();

  const invalid = {
    data: {
      users: [{ email: 'no-admin@gradify.local', full_name: 'No Admin', password_hash: 'x', salt: 'y', is_admin: 0 }]
    }
  };
  const invalidBody = new FormData();
  invalidBody.append('backup', new Blob([JSON.stringify(invalid)], { type: 'application/json' }), 'invalid.json');
  const invalidRes = await adminFetch('/api/admin/database/import', { method: 'POST', body: invalidBody });
  assert.equal(invalidRes.res.status, 400);
  assert.match(invalidRes.data.error, /administrator/i);

  const form = new FormData();
  form.append('backup', new Blob([JSON.stringify(backup)], { type: 'application/json' }), 'backup.json');
  const imported = await adminFetch('/api/admin/database/import', { method: 'POST', body: form });
  assert.equal(imported.res.status, 200);
  assert.equal(imported.data.ok, true);
  assert.equal(imported.data.reauth, true);
  assert.ok(imported.data.safety_backup);
  assert.ok(imported.data.counts.users >= 2);

  const oldSession = await adminFetch('/api/admin/me');
  assert.equal(oldSession.res.status, 401);

  const login = await jsonFetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password })
  });
  assert.equal(login.res.status, 200);
  adminToken = login.data.token;

  const backups = await adminFetch('/api/admin/database/backups');
  assert.equal(backups.res.status, 200);
  assert.ok(backups.data.backups.some(b => b.filename === imported.data.safety_backup));

  const download = await fetch(
    `${baseUrl}/api/admin/database/backups/${encodeURIComponent(imported.data.safety_backup)}`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  assert.equal(download.status, 200);
  const bytes = Buffer.from(await download.arrayBuffer());
  assert.equal(bytes.subarray(0, 16).toString('utf8'), 'SQLite format 3\u0000');
});

test('SQLite backup can be imported', async () => {
  const exportRes = await fetch(`${baseUrl}/api/admin/database/export?format=sqlite`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(exportRes.status, 200);
  const bytes = Buffer.from(await exportRes.arrayBuffer());

  const form = new FormData();
  form.append('backup', new Blob([bytes], { type: 'application/x-sqlite3' }), 'backup.db');
  const imported = await adminFetch('/api/admin/database/import', { method: 'POST', body: form });
  assert.equal(imported.res.status, 200);
  assert.equal(imported.data.ok, true);
  assert.ok(imported.data.counts.users >= 2);

  const login = await jsonFetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN.email, password: ADMIN.password })
  });
  assert.equal(login.res.status, 200);
  adminToken = login.data.token;

  const me = await adminFetch('/api/admin/me');
  assert.equal(me.res.status, 200);
});

test('admin can delete a non-admin user but not itself', async () => {
  const list = await adminFetch('/api/admin/users?search=Mahasiswa%20Diperbarui');
  const userId = list.data.users[0].id;

  const deleted = await adminFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
  assert.equal(deleted.res.status, 200);

  const me = await adminFetch('/api/admin/me');
  const selfDelete = await adminFetch(`/api/admin/users/${me.data.user.id}`, { method: 'DELETE' });
  assert.equal(selfDelete.res.status, 400);
});
