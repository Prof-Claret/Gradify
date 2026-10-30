/**
 * Full HTTP Integration Tests for /api/auth/avatar Endpoints
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const sharp = require('sharp');
const express = require('express');

const { router: authRouter } = require('../server/routes/auth');
const { db } = require('../server/db');
const { UPLOAD_DIR } = require('../server/utils/avatarSecurity');

// Setup isolated express test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// Helper to create test multipart body
function createMultipartFormData(boundary, fields, file) {
  const parts = [];

  for (const [key, value] of Object.entries(fields || {})) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
      `${value}\r\n`
    );
  }

  if (file) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\n` +
      `Content-Type: ${file.mimetype}\r\n\r\n`
    );
  }

  const headerBuffer = Buffer.from(parts.join(''), 'utf-8');
  const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');

  return file ? Buffer.concat([headerBuffer, file.buffer, footerBuffer]) : headerBuffer;
}

test('HTTP Integration: User registration & profile picture upload flow', async () => {
  const uniqueEmail = `sec_test_${Date.now()}@unika.ac.id`;
  const password = 'SecretPassword123';

  // 1. Register test user
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: password,
      full_name: 'Security Test Student',
      campus_mode: 'preset',
      faculty: 'Fakultas Ilmu Komputer',
      study_program: 'Teknik Informatika'
    })
  });
  assert.equal(regRes.status, 201);
  const { token, user } = await regRes.json();
  assert.ok(token);
  assert.equal(user.avatar_url, null);

  // 2. Unauthenticated upload attempt (No token) -> 401
  const unauthRes = await fetch(`${baseUrl}/api/auth/avatar`, { method: 'POST' });
  assert.equal(unauthRes.status, 401, 'Must reject unauthenticated upload');

  // 3. Upload valid JPEG photo
  const testJpeg = await sharp({
    create: { width: 120, height: 120, channels: 3, background: { r: 50, g: 100, b: 200 } }
  }).jpeg().toBuffer();

  const boundary = `----WebKitFormBoundary${Date.now()}`;
  const multipartBody = createMultipartFormData(boundary, {}, {
    fieldname: 'avatar',
    filename: 'my_photo.jpg',
    mimetype: 'image/jpeg',
    buffer: testJpeg
  });

  const uploadRes = await fetch(`${baseUrl}/api/auth/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: multipartBody
  });

  assert.equal(uploadRes.status, 200);
  const uploadData = await uploadRes.json();
  assert.equal(uploadData.ok, true);
  assert.ok(uploadData.avatar_url.startsWith('/api/auth/avatar/avatar-'));
  assert.ok(uploadData.avatar_url.endsWith('.webp'));
  assert.equal(uploadData.user.avatar_url, uploadData.avatar_url);

  // 4. Test serving the uploaded avatar with hardened security headers
  const serveRes = await fetch(`${baseUrl}${uploadData.avatar_url}`);
  assert.equal(serveRes.status, 200);
  assert.equal(serveRes.headers.get('content-type'), 'image/webp');
  assert.equal(serveRes.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(serveRes.headers.get('content-security-policy').includes('sandbox'));
  assert.ok(serveRes.headers.get('cache-control').includes('public'));

  // 5. Test malicious upload: SVG disguised as JPEG
  const fakeBoundary = `----WebKitFormBoundary${Date.now()}_fake`;
  const fakeBody = createMultipartFormData(fakeBoundary, {}, {
    fieldname: 'avatar',
    filename: 'exploit.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('<svg onload="alert(document.cookie)"></svg>')
  });

  const exploitRes = await fetch(`${baseUrl}/api/auth/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${fakeBoundary}`
    },
    body: fakeBody
  });

  assert.equal(exploitRes.status, 400);
  const exploitData = await exploitRes.json();
  assert.ok(exploitData.error.includes('bukan gambar valid'));

  // 6. Test malicious upload: PHP webshell with double extension
  const phpBoundary = `----WebKitFormBoundary${Date.now()}_php`;
  const phpBody = createMultipartFormData(phpBoundary, {}, {
    fieldname: 'avatar',
    filename: 'shell.php.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('<?php echo system($_GET["cmd"]); ?>')
  });

  const phpRes = await fetch(`${baseUrl}/api/auth/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${phpBoundary}`
    },
    body: phpBody
  });

  assert.equal(phpRes.status, 400);

  // 7. Test delete avatar
  const deleteRes = await fetch(`${baseUrl}/api/auth/avatar`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  assert.equal(deleteRes.status, 200);
  const deleteData = await deleteRes.json();
  assert.equal(deleteData.ok, true);
  assert.equal(deleteData.user.avatar_url, null);

  // Verify file has been unlinked from disk
  const oldFilename = path.basename(uploadData.avatar_url);
  assert.equal(fs.existsSync(path.join(UPLOAD_DIR, oldFilename)), false);
});
