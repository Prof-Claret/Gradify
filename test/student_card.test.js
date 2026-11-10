/**
 * Integration tests for GET /api/academics/student-card
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { router: authRouter } = require('../server/routes/auth');
const academicsRouter = require('../server/routes/academics');
const { db } = require('../server/db');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/academics', academicsRouter);

let server;
let baseUrl;

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
});

async function registerStudent(overrides = {}) {
  const email = `ktm_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@unika.ac.id`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'KtmPassword123',
      full_name: 'Mahasiswa Uji Kartu',
      campus_mode: 'preset',
      faculty: 'Fakultas Ilmu Komputer (FIKOM)',
      study_program: 'Teknik Informatika (S1)',
      ...overrides
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.ok(data.token);
  return { ...data, email };
}

function cleanupUser(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

test('student card requires authentication', async () => {
  const res = await fetch(`${baseUrl}/api/academics/student-card`);
  assert.equal(res.status, 401);
});

test('student card returns printable identity data with stable verification code', async () => {
  const { token, user } = await registerStudent({
    npm_nim: '220123456',
    active_semester: 3,
    expected_graduation_year: 2029
  });

  try {
    const res = await fetch(`${baseUrl}/api/academics/student-card`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res.status, 200);

    const card = await res.json();
    assert.equal(card.card_number, '220123456');
    assert.equal(card.student.full_name, 'Mahasiswa Uji Kartu');
    assert.equal(card.student.npm_nim, '220123456');
    assert.equal(card.student.faculty, 'Fakultas Ilmu Komputer (FIKOM)');
    assert.equal(card.student.study_program, 'Teknik Informatika (S1)');
    assert.equal(card.valid_until, '2029-08-31');
    assert.match(card.verification_code, /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
    assert.match(card.issued_at, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(card.printed_at, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(card.academic.ipk, 0);
    assert.equal(card.academic.total_sks_taken, 0);
    assert.ok(card.academic.predikat);
    assert.ok(card.academic.academic_year);

    const second = await fetch(`${baseUrl}/api/academics/student-card`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());
    assert.equal(second.verification_code, card.verification_code, 'verification code must be stable');
  } finally {
    cleanupUser(user.id);
  }
});

test('student card falls back to generated card number when NIM is empty', async () => {
  const { token, user } = await registerStudent({ active_semester: 1 });

  try {
    const card = await fetch(`${baseUrl}/api/academics/student-card`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());

    assert.equal(card.student.npm_nim, null);
    assert.match(card.card_number, /^GRD-\d{6}$/);
    assert.match(card.valid_until, /^\d{4}-08-31$/);
    assert.ok(new Date(`${card.valid_until}T00:00:00`).getFullYear() >= new Date().getFullYear());
  } finally {
    cleanupUser(user.id);
  }
});
