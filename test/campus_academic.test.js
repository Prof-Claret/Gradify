/**
 * Integration tests for multi-campus, faculty/prodi, and per-program features.
 * Uses an isolated temporary SQLite database.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gradify-campus-test-'));
process.env.GRADIFY_DB_PATH = path.join(TMP_DIR, 'gradify.db');

const adminRouter = require('../server/routes/admin');
const { router: authRouter } = require('../server/routes/auth');
const { db } = require('../server/db');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);

let server;
let baseUrl;
let adminToken;
let presets;

const ADMIN = {
  full_name: 'Admin Kampus',
  email: `admin_campus_${Date.now()}@gradify.local`,
  password: 'AdminPassword123'
};

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  const setup = await jsonFetch('/api/admin/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN)
  });
  assert.equal(setup.res.status, 201);
  adminToken = setup.data.token;
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

function adminFetch(url, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${adminToken}`,
    ...(options.headers || {})
  };
  return jsonFetch(url, { ...options, headers });
}

async function registerUser(email, unit) {
  const res = await jsonFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'rahasia123',
      full_name: 'Mahasiswa Uji',
      campus_mode: 'preset',
      ...unit,
      active_semester: 1,
      target_gpa: 3.5
    })
  });
  assert.equal(res.res.status, 201, JSON.stringify(res.data));
  return res.data;
}

async function featuresFor(token) {
  const res = await jsonFetch('/api/auth/features', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(res.res.status, 200);
  return res.data.features.map(f => f.key);
}

function findProgram(campusName, facultyName, programName) {
  const campus = presets.campuses.find(c => c.name === campusName);
  assert.ok(campus, `kampus ${campusName} tidak ditemukan`);
  const faculty = campus.faculties.find(f => f.name === facultyName);
  assert.ok(faculty, `fakultas ${facultyName} tidak ditemukan`);
  const program = faculty.programs.find(p => p.name === programName);
  assert.ok(program, `prodi ${programName} tidak ditemukan`);
  return { campus, faculty, program };
}

test('presets expose default campuses with faculties and programs', async () => {
  const res = await jsonFetch('/api/auth/presets');
  assert.equal(res.res.status, 200);
  presets = res.data;

  const names = presets.campuses.map(c => c.name);
  assert.ok(names.some(n => n.includes('UNIKA UST')));
  assert.ok(names.some(n => n.includes('USU')));
  assert.ok(names.some(n => n.includes('Unimed')));
  assert.ok(presets.campuses.length >= 6);

  const unika = presets.campuses.find(c => c.name.includes('UNIKA UST'));
  const fikom = unika.faculties.find(f => f.name.includes('FIKOM'));
  assert.ok(fikom);
  assert.ok(fikom.programs.length >= 3);
  assert.ok(fikom.programs[0].id);
  assert.ok(fikom.programs[0].full_name.includes('(S1)'));
});

test('features follow the registered program study', async () => {
  const ti = findProgram('Universitas Katolik Santo Thomas (UNIKA UST)', 'Fakultas Ilmu Komputer (FIKOM)', 'Teknik Informatika');
  const akun = findProgram('Universitas Katolik Santo Thomas (UNIKA UST)', 'Fakultas Ekonomi dan Bisnis (FEB)', 'Akuntansi');

  const tiUser = await registerUser(`ti_${Date.now()}@test.local`, {
    campus_id: ti.campus.id, faculty_id: ti.faculty.id, program_id: ti.program.id
  });
  const accUser = await registerUser(`acc_${Date.now()}@test.local`, {
    campus_id: akun.campus.id, faculty_id: akun.faculty.id, program_id: akun.program.id
  });

  const tiFeatures = await featuresFor(tiUser.token);
  const accFeatures = await featuresFor(accUser.token);

  assert.ok(tiFeatures.includes('cs-toolkit'));
  assert.ok(tiFeatures.includes('dev-tools'));
  assert.ok(!tiFeatures.includes('acc-toolkit'));
  assert.ok(accFeatures.includes('acc-toolkit'));
  assert.ok(!accFeatures.includes('cs-toolkit'));
  assert.ok(accFeatures.includes('calculator'));
  assert.ok(accFeatures.includes('dashboard'));
});

test('students cannot change their own campus, faculty, or program', async () => {
  const ti = findProgram('Universitas Katolik Santo Thomas (UNIKA UST)', 'Fakultas Ilmu Komputer (FIKOM)', 'Teknik Informatika');
  const user = await registerUser(`profile_${Date.now()}@test.local`, {
    campus_id: ti.campus.id, faculty_id: ti.faculty.id, program_id: ti.program.id
  });

  const res = await jsonFetch('/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.token}`
    },
    body: JSON.stringify({ campus_name: 'Kampus Lain', study_program: 'Prodi Lain' })
  });
  assert.equal(res.res.status, 403);
  assert.match(res.data.error, /administrator/i);
});

test('admin can create campus units, map features, and move a student', async () => {
  const suffix = Date.now();
  const campus = await adminFetch('/api/admin/campuses', {
    method: 'POST',
    body: JSON.stringify({ name: `Universitas Uji ${suffix}`, short_name: `UU${suffix}` })
  });
  assert.equal(campus.res.status, 201);

  const faculty = await adminFetch('/api/admin/faculties', {
    method: 'POST',
    body: JSON.stringify({ campus_id: campus.data.id, name: 'Fakultas Hukum Uji' })
  });
  assert.equal(faculty.res.status, 201);

  const program = await adminFetch('/api/admin/programs', {
    method: 'POST',
    body: JSON.stringify({ faculty_id: faculty.data.id, name: 'Ilmu Hukum Uji', level: 'S1', features: ['law-toolkit'] })
  });
  assert.equal(program.res.status, 201);

  const student = await registerUser(`newcampus_${suffix}@test.local`, {
    campus_id: campus.data.id, faculty_id: faculty.data.id, program_id: program.data.id
  });
  const features = await featuresFor(student.token);
  assert.ok(features.includes('law-toolkit'));
  assert.ok(!features.includes('cs-toolkit'));

  // Program still used by the student -> deletion must be blocked
  const blocked = await adminFetch(`/api/admin/programs/${program.data.id}`, { method: 'DELETE' });
  assert.equal(blocked.res.status, 400);

  // Move the same student to Akuntansi UNIKA UST via admin endpoint
  const akun = findProgram('Universitas Katolik Santo Thomas (UNIKA UST)', 'Fakultas Ekonomi dan Bisnis (FEB)', 'Akuntansi');
  const moved = await adminFetch(`/api/admin/users/${student.user.id}`, {
    method: 'PUT',
    body: JSON.stringify({ campus_id: akun.campus.id, faculty_id: akun.faculty.id, program_id: akun.program.id })
  });
  assert.equal(moved.res.status, 200);
  assert.equal(moved.data.user.campus_id, akun.campus.id);
  assert.equal(moved.data.user.faculty_id, akun.faculty.id);
  assert.equal(moved.data.user.program_id, akun.program.id);
  assert.match(moved.data.user.study_program, /Akuntansi/);

  const movedFeatures = await featuresFor(student.token);
  assert.ok(movedFeatures.includes('acc-toolkit'));
  assert.ok(!movedFeatures.includes('law-toolkit'));

  // Deactivate the custom campus then reject new registrations
  const deactivated = await adminFetch(`/api/admin/campuses/${campus.data.id}`, {
    method: 'PUT', body: JSON.stringify({ is_active: false })
  });
  assert.equal(deactivated.res.status, 200);

  const rejected = await jsonFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `inactive_${suffix}@test.local`,
      password: 'rahasia123',
      full_name: 'Mahasiswa Nonaktif',
      campus_mode: 'preset',
      campus_id: campus.data.id,
      faculty_id: faculty.data.id,
      program_id: program.data.id
    })
  });
  assert.equal(rejected.res.status, 400);
  assert.match(rejected.data.error, /tidak aktif/i);
});

test('admin feature mapping endpoint validates and replaces program features', async () => {
  const ti = findProgram('Universitas Katolik Santo Thomas (UNIKA UST)', 'Fakultas Ilmu Komputer (FIKOM)', 'Sistem Informasi');

  const current = await adminFetch(`/api/admin/programs/${ti.program.id}/features`);
  assert.equal(current.res.status, 200);
  assert.ok(current.data.features.length >= 1);

  const list = await adminFetch('/api/admin/features');
  assert.equal(list.res.status, 200);
  assert.ok(list.data.features.some(f => f.key === 'acc-toolkit'));

  const updated = await adminFetch(`/api/admin/programs/${ti.program.id}/features`, {
    method: 'PUT',
    body: JSON.stringify({ features: ['dev-tools', 'acc-toolkit', 'tidak-ada'] })
  });
  assert.equal(updated.res.status, 200);
  assert.deepEqual(updated.data.features.sort(), ['acc-toolkit', 'dev-tools']);

  const after = await adminFetch(`/api/admin/programs/${ti.program.id}/features`);
  assert.deepEqual(after.data.features.sort(), ['acc-toolkit', 'dev-tools']);
});
