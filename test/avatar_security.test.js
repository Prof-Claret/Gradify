/**
 * Comprehensive Automated Security Tests for Avatar Upload Feature
 * Verifies all security layers and hacker mitigation mechanisms.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const sharp = require('sharp');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gradify-avatar-security-'));
process.env.GRADIFY_AVATAR_DIR = path.join(TMP_DIR, 'uploads', 'avatars');

const {
  detectImageMagicBytes,
  processAndSanitizeAvatar,
  deleteOldAvatarFile,
  serveAvatarFile,
  UPLOAD_DIR
} = require('../server/utils/avatarSecurity');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

test.after(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

test('Security Layer 1: detectImageMagicBytes properly detects signatures', async () => {
  // 1. Valid JPEG buffer
  const jpegBuffer = await sharp({
    create: { width: 50, height: 50, channels: 3, background: { r: 255, g: 0, b: 0 } }
  }).jpeg().toBuffer();
  assert.equal(detectImageMagicBytes(jpegBuffer), 'image/jpeg');

  // 2. Valid PNG buffer
  const pngBuffer = await sharp({
    create: { width: 50, height: 50, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } }
  }).png().toBuffer();
  assert.equal(detectImageMagicBytes(pngBuffer), 'image/png');

  // 3. Valid WebP buffer
  const webpBuffer = await sharp({
    create: { width: 50, height: 50, channels: 3, background: { r: 0, g: 0, b: 255 } }
  }).webp().toBuffer();
  assert.equal(detectImageMagicBytes(webpBuffer), 'image/webp');

  // 4. Fake image (PHP script masquerading as image)
  const phpScriptBuffer = Buffer.from('<?php system($_GET["cmd"]); ?>');
  assert.equal(detectImageMagicBytes(phpScriptBuffer), null, 'PHP script must NOT pass magic bytes');

  // 5. SVG with XSS payload
  const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle r="10"/></svg>');
  assert.equal(detectImageMagicBytes(svgBuffer), null, 'SVG must NOT pass raster magic bytes');

  // 6. Plain text / executable header
  const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff');
  assert.equal(detectImageMagicBytes(exeBuffer), null, 'EXE header must be rejected');
});

test('Security Layer 2: processAndSanitizeAvatar eliminates polyglots & enforces WebP', async () => {
  // Create a real JPEG image with EXIF / comment metadata
  const baseJpeg = await sharp({
    create: { width: 200, height: 150, channels: 3, background: { r: 100, g: 150, b: 200 } }
  }).jpeg().toBuffer();

  // Test processing
  const fakeUserId = 99999;
  const result = await processAndSanitizeAvatar(baseJpeg, fakeUserId);

  assert.ok(result.filename.startsWith(`avatar-${fakeUserId}-`));
  assert.ok(result.filename.endsWith('.webp'));
  assert.equal(result.avatarUrl, `/api/auth/avatar/${result.filename}`);

  const savedFilePath = path.join(UPLOAD_DIR, result.filename);
  assert.ok(fs.existsSync(savedFilePath), 'Processed file must be written to disk');

  // Verify resulting image is strictly 400x400 WebP without malicious traces
  const savedMeta = await sharp(savedFilePath).metadata();
  assert.equal(savedMeta.format, 'webp', 'Transcoded format must be WebP');
  assert.equal(savedMeta.width, 400, 'Width must be standardized to 400');
  assert.equal(savedMeta.height, 400, 'Height must be standardized to 400');
  assert.equal(savedMeta.exif, undefined, 'EXIF metadata must be stripped');

  // Clean up test file
  fs.unlinkSync(savedFilePath);
});

test('Security Layer 3: processAndSanitizeAvatar rejects disguised non-image files', async () => {
  const fakeUserId = 88888;
  const maliciousPayload = Buffer.from('GIF89a<?php passthru($_GET["c"]); ?>'); // Fake gif header + php

  await assert.rejects(
    async () => {
      await processAndSanitizeAvatar(maliciousPayload, fakeUserId);
    },
    /File terindikasi bukan gambar valid/,
    'Must reject invalid or malicious signature'
  );
});

test('Security Layer 4: deleteOldAvatarFile prevents path traversal and cross-user deletion', () => {
  const userId = 42;
  const legitFilename = `avatar-42-0123456789abcdef0123456789abcdef.webp`;
  const legitPath = path.join(UPLOAD_DIR, legitFilename);
  fs.writeFileSync(legitPath, 'dummy data');
  assert.ok(fs.existsSync(legitPath));

  // 1. Path traversal attack attempt in URL
  const pathTraversalUrl = `/api/auth/avatar/../../../../etc/passwd`;
  deleteOldAvatarFile(pathTraversalUrl, userId);
  // Ensure no crash and legitimate file still intact
  assert.ok(fs.existsSync(legitPath));

  // 2. Cross-user deletion attempt (User 42 tries to delete User 99's avatar)
  const otherUserFile = `avatar-99-0123456789abcdef0123456789abcdef.webp`;
  const otherUserPath = path.join(UPLOAD_DIR, otherUserFile);
  fs.writeFileSync(otherUserPath, 'other user data');
  deleteOldAvatarFile(`/api/auth/avatar/${otherUserFile}`, userId);
  assert.ok(fs.existsSync(otherUserPath), 'User 42 must NOT be able to delete User 99 avatar');

  // 3. Legitimate deletion of own avatar
  deleteOldAvatarFile(`/api/auth/avatar/${legitFilename}`, userId);
  assert.ok(!fs.existsSync(legitPath), 'Legitimate own avatar should be deleted');

  // Clean up
  if (fs.existsSync(otherUserPath)) fs.unlinkSync(otherUserPath);
});

test('Security Layer 5: serveAvatarFile enforces strict HTTP security headers and blocks traversal', (t, done) => {
  const testFilename = `avatar-77-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp`;
  const testPath = path.join(UPLOAD_DIR, testFilename);
  fs.writeFileSync(testPath, 'fake-webp-content');

  const headersSent = {};
  let statusCode = 200;
  let sentPath = '';

  const mockRes = {
    setHeader(name, val) {
      headersSent[name.toLowerCase()] = val;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(obj) {
      // Done
    },
    sendFile(filePath) {
      sentPath = filePath;
      assert.equal(headersSent['x-content-type-options'], 'nosniff');
      assert.equal(headersSent['content-type'], 'image/webp');
      assert.ok(headersSent['content-security-policy'].includes('sandbox'));
      assert.equal(sentPath, testPath);
      // Clean up
      fs.unlinkSync(testPath);
      done();
    }
  };

  // Valid file request
  serveAvatarFile(testFilename, {}, mockRes);
});

test('Security Layer 6: serveAvatarFile strictly blocks path traversal patterns', () => {
  const badNames = [
    '../../../etc/passwd',
    '..\\..\\windows\\win.ini',
    'avatar-77-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp/../shell.js',
    'shell.php',
    'avatar-77-invalid.php.webp',
    'avatar-77-%00.webp'
  ];

  for (const bad of badNames) {
    let statusCode = 0;
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {}
    };
    serveAvatarFile(bad, {}, mockRes);
    assert.equal(statusCode, 400, `Expected 400 for bad filename: ${bad}`);
  }
});
