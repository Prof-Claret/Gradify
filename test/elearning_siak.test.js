/**
 * Integration tests for presensi, tugas upload, e-learning, dan SIAK.
 * Uses an isolated temporary SQLite database.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gradify-elearning-test-'));
process.env.GRADIFY_DB_PATH = path.join(TMP_DIR, 'gradify.db');

const { router: authRouter } = require('../server/routes/auth');
const academicsRouter = require('../server/routes/academics');
const { db, DB_PATH } = require('../server/db');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/academics', academicsRouter);

let server;
let baseUrl;
let token;
let userId;
let semesterCounter = 0;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  const info = db.prepare('INSERT INTO users (email, password_hash, salt, full_name) VALUES (?, ?, ?, ?)')
    .run(`student_${Date.now()}@gradify.local`, 'hash', 'salt', 'Mahasiswa Uji');
  userId = Number(info.lastInsertRowid);
  token = `test-token-${Date.now()}`;
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+1 day'))")
    .run(token, userId);
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  try { db.close(); } catch { /* ignore */ }
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

async function apiFetch(url, options = {}) {
  const headers = { Authorization: `Bearer ${token}`, ...(options.headers || {}) };
  const res = await fetch(`${baseUrl}${url}`, { ...options, headers });
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  return { res, data };
}

function json(url, method, body) {
  return apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function createSemesterAndCourse() {
  const number = ++semesterCounter;
  const sem = await json('/api/academics/semesters', 'POST', {
    semester_number: number, academic_year: 'Ganjil 2026/2027'
  });
  assert.equal(sem.res.status, 201);
  const semester = db.prepare('SELECT * FROM semesters WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId);

  const course = await json('/api/academics/courses', 'POST', {
    semester_id: semester.id, course_code: `TI10${number}`, course_name: 'Algoritma & Pemrograman', sks: 3
  });
  assert.equal(course.res.status, 201);
  return { semester, courseId: course.data.id };
}

test('fitur kampus baru tersedia di katalog fitur', () => {
  const keys = db.prepare('SELECT key FROM features').all().map(r => r.key);
  for (const key of ['presensi', 'tugas', 'elearning', 'siak']) {
    assert.ok(keys.includes(key), `feature ${key} harus terdaftar`);
  }
});

test('presensi: catat, upsert per tanggal, ubah status, dan hapus', async () => {
  const { courseId } = await createSemesterAndCourse();

  const created = await json('/api/academics/attendance', 'POST', {
    course_id: courseId, date: '2026-09-01', status: 'hadir', meeting_no: 1, notes: 'Pertemuan awal'
  });
  assert.equal(created.res.status, 201);

  let list = await apiFetch('/api/academics/attendance');
  assert.equal(list.res.status, 200);
  assert.equal(list.data.records.length, 1);
  assert.equal(list.data.summary.hadir, 1);
  assert.equal(list.data.summary.percentage, 100);

  // Tanggal yang sama harus meng-update, bukan menduplikasi
  await json('/api/academics/attendance', 'POST', {
    course_id: courseId, date: '2026-09-01', status: 'alfa'
  });
  list = await apiFetch('/api/academics/attendance');
  assert.equal(list.data.records.length, 1);
  assert.equal(list.data.summary.alfa, 1);

  const id = list.data.records[0].id;
  const updated = await json(`/api/academics/attendance/${id}`, 'PUT', { status: 'sakit' });
  assert.equal(updated.res.status, 200);
  list = await apiFetch('/api/academics/attendance');
  assert.equal(list.data.summary.sakit, 1);

  const removed = await apiFetch(`/api/academics/attendance/${id}`, { method: 'DELETE' });
  assert.equal(removed.res.status, 200);
  list = await apiFetch('/api/academics/attendance');
  assert.equal(list.data.records.length, 0);
});

test('tugas: unggah lampiran & jawaban, lalu bersihkan saat dihapus', async () => {
  const { courseId } = await createSemesterAndCourse();
  const created = await json('/api/academics/tasks', 'POST', {
    course_id: courseId, title: 'Laporan Praktikum', due_date: '2026-12-01', type: 'tugas'
  });
  assert.equal(created.res.status, 201);
  const taskId = created.data.id;

  const attach = new FormData();
  attach.append('file', new Blob(['isi soal'], { type: 'text/plain' }), 'soal.txt');
  const up1 = await apiFetch(`/api/academics/tasks/${taskId}/attachment`, { method: 'POST', body: attach });
  assert.equal(up1.res.status, 201);
  assert.match(up1.data.url, /^\/uploads\/files\/u\d+-[a-f0-9]{16}\.txt$/);

  const sub = new FormData();
  sub.append('file', new Blob(['jawaban saya'], { type: 'text/plain' }), 'jawaban.txt');
  const up2 = await apiFetch(`/api/academics/tasks/${taskId}/submission`, { method: 'POST', body: sub });
  assert.equal(up2.res.status, 201);
  assert.match(up2.data.url, /^\/uploads\/files\//);

  const tasks = await apiFetch('/api/academics/tasks?scope=all');
  const row = tasks.data.tasks.find(t => t.id === taskId);
  assert.equal(row.attachment_name, 'soal.txt');
  assert.equal(row.submission_name, 'jawaban.txt');
  assert.ok(row.submitted_at);

  const storedFile = path.join(path.dirname(DB_PATH), 'uploads', 'files', path.basename(up1.data.url));
  assert.ok(fs.existsSync(storedFile));

  const removed = await apiFetch(`/api/academics/tasks/${taskId}`, { method: 'DELETE' });
  assert.equal(removed.res.status, 200);
  assert.equal(fs.existsSync(storedFile), false, 'file lampiran harus terhapus');
});

test('materi: unggah file, daftar, dan hapus', async () => {
  const { courseId } = await createSemesterAndCourse();
  const fd = new FormData();
  fd.append('title', 'Slide Pertemuan 1');
  fd.append('description', 'Pengantar');
  fd.append('course_id', String(courseId));
  fd.append('file', new Blob(['materi'], { type: 'application/pdf' }), 'materi.pdf');

  const created = await apiFetch('/api/academics/materials', { method: 'POST', body: fd });
  assert.equal(created.res.status, 201);

  let list = await apiFetch('/api/academics/materials');
  assert.equal(list.data.materials.length, 1);
  assert.equal(list.data.materials[0].title, 'Slide Pertemuan 1');
  assert.equal(list.data.materials[0].file_name, 'materi.pdf');

  const storedFile = path.join(path.dirname(DB_PATH), 'uploads', 'files', path.basename(list.data.materials[0].file_url));
  assert.ok(fs.existsSync(storedFile));

  const removed = await apiFetch(`/api/academics/materials/${created.data.id}`, { method: 'DELETE' });
  assert.equal(removed.res.status, 200);
  assert.equal(fs.existsSync(storedFile), false);
});

test('ujian, kalender akademik, dan pengumuman: CRUD dasar', async () => {
  const { courseId } = await createSemesterAndCourse();

  // Ujian
  const exam = await json('/api/academics/exams', 'POST', {
    course_id: courseId, type: 'UTS', exam_date: '2026-10-15', start_time: '08:00', end_time: '09:40', room: 'I/3'
  });
  assert.equal(exam.res.status, 201);
  let exams = await apiFetch('/api/academics/exams');
  assert.equal(exams.data.exams.length, 1);
  const examPut = await json(`/api/academics/exams/${exam.data.id}`, 'PUT', { room: 'LAB A' });
  assert.equal(examPut.res.status, 200);
  exams = await apiFetch('/api/academics/exams');
  assert.equal(exams.data.exams[0].room, 'LAB A');
  assert.equal((await apiFetch(`/api/academics/exams/${exam.data.id}`, { method: 'DELETE' })).res.status, 200);

  // Kalender
  const event = await json('/api/academics/calendar', 'POST', {
    title: 'Registrasi Semester', start_date: '2026-08-20', end_date: '2026-08-25', type: 'registrasi'
  });
  assert.equal(event.res.status, 201);
  let cal = await apiFetch('/api/academics/calendar');
  assert.equal(cal.data.events.length, 1);
  assert.equal((await apiFetch(`/api/academics/calendar/${event.data.id}`, { method: 'DELETE' })).res.status, 200);

  // Pengumuman
  const ann = await json('/api/academics/announcements', 'POST', {
    title: 'Beasiswa Semester Ganjil', content: 'Segera daftar', source: 'BAAK', is_pinned: 1
  });
  assert.equal(ann.res.status, 201);
  let anns = await apiFetch('/api/academics/announcements');
  assert.equal(anns.data.announcements.length, 1);
  assert.equal(anns.data.announcements[0].is_pinned, 1);
  const annPut = await json(`/api/academics/announcements/${ann.data.id}`, 'PUT', { is_pinned: 0 });
  assert.equal(annPut.res.status, 200);
  assert.equal((await apiFetch(`/api/academics/announcements/${ann.data.id}`, { method: 'DELETE' })).res.status, 200);
});

test('KRS: simpan status per semester dan hitung total SKS', async () => {
  const { semester } = await createSemesterAndCourse();

  let krs = await apiFetch(`/api/academics/krs?semester_id=${semester.id}`);
  assert.equal(krs.res.status, 200);
  assert.equal(krs.data.total_sks, 3);
  assert.equal(krs.data.krs, null);

  const saved = await json('/api/academics/krs', 'PUT', {
    semester_id: semester.id, status: 'diajukan', notes: 'Menunggu PA'
  });
  assert.equal(saved.res.status, 200);

  krs = await apiFetch(`/api/academics/krs?semester_id=${semester.id}`);
  assert.equal(krs.data.krs.status, 'diajukan');
  assert.equal(krs.data.krs.notes, 'Menunggu PA');
});
