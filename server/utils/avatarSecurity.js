/**
 * Gradify Avatar Security & Upload Engine
 * 
 * Multi-layer Defense-in-Depth against file upload vulnerabilities:
 * 1. Memory-Only Buffering: Files are never written to disk uninspected (Multer memoryStorage).
 * 2. Strict Whitelisting: Only image/jpeg, image/png, image/webp accepted.
 * 3. Binary Magic Bytes Validation: Verifies file headers at binary byte level to reject disguised scripts.
 * 4. Anti-DoS / Decompression Bomb Protection: 2MB hard limit, max 4096x4096px, limitInputPixels enforced.
 * 5. Complete Re-Encoding & Sanitization (Sharp): Strips all metadata, EXIF, GPS tags, comments,
 *    and polyglot webshell payloads by rasterizing raw pixels into fresh WebP format.
 * 6. Cryptographic Random Filename & Path Traversal Immunity: No user input touches the filesystem.
 * 7. Hardened Delivery Headers: nosniff, CSP sandbox, cache control, immutable serving.
 * 8. Rate Limiting: Sliding window prevents brute-force uploads or disk exhaustion.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const sharp = require('sharp');

/* ============================================================
 * DIRECTORY SETUP
 * ============================================================ */
const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'data', 'uploads', 'avatars');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o755 });
}

/* ============================================================
 * RATE LIMITING (In-Memory Sliding Window)
 * ============================================================ */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 10;

function checkAvatarRateLimit(identifier) {
  const now = Date.now();
  const history = rateLimitMap.get(identifier) || [];
  const validHistory = history.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (validHistory.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  validHistory.push(now);
  rateLimitMap.set(identifier, validHistory);
  return true;
}

// Clean up stale rate limit entries periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, history] of rateLimitMap.entries()) {
    const fresh = history.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    if (fresh.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, fresh);
  }
}, 10 * 60 * 1000).unref();

/* ============================================================
 * BINARY MAGIC BYTES VALIDATION
 * ============================================================ */
function detectImageMagicBytes(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG signature: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const pngSig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  if (pngSig.every((b, i) => buffer[i] === b)) {
    return 'image/png';
  }

  // WebP signature: RIFF at [0..3] and WEBP at [8..11]
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/* ============================================================
 * MULTER IN-MEMORY INGESTION & WHITELISTING
 * ============================================================ */
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const multerInstance = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 Megabytes strict limit
    files: 1,
    fields: 5,
    parts: 10
  },
  fileFilter: (req, file, cb) => {
    // 1. Verify declared MIME type
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Format file tidak didukung. Hanya gambar JPG, PNG, atau WebP yang diperbolehkan.'));
    }

    // 2. Verify file extension
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('Ekstensi file tidak valid. Hanya .jpg, .jpeg, .png, dan .webp yang diperbolehkan.'));
    }

    // 3. Reject suspicious filenames (double extensions, null bytes, path characters)
    const baseName = path.basename(file.originalname || '');
    if (baseName.includes('\0') || baseName.split('.').length > 2) {
      // Possible double extension trick like evil.php.jpg
      const parts = baseName.toLowerCase().split('.');
      const dangerousExts = ['php', 'phtml', 'phar', 'exe', 'sh', 'js', 'html', 'htm', 'svg', 'asp', 'aspx', 'jsp', 'cgi', 'pl'];
      if (parts.some(p => dangerousExts.includes(p))) {
        return cb(new Error('Nama file mencurigakan dan ditolak demi keamanan sistem.'));
      }
    }

    cb(null, true);
  }
}).single('avatar');

function handleAvatarUploadMiddleware(req, res, next) {
  multerInstance(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Ukuran file terlalu besar. Maksimal 2 MB.' });
        }
        return res.status(400).json({ error: `Kesalahan upload: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'File upload tidak valid.' });
    }
    next();
  });
}

/* ============================================================
 * PROCESS & SANITIZE AVATAR WITH SHARP
 * ============================================================ */
async function processAndSanitizeAvatar(fileBuffer, userId) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error('Data gambar tidak ditemukan.');
  }

  // 1. Check Magic Bytes at binary level
  const detectedMime = detectImageMagicBytes(fileBuffer);
  if (!detectedMime) {
    throw new Error('File terindikasi bukan gambar valid (signature mismatch). Upload ditolak.');
  }

  // 2. Validate Image Dimensions & Structure (Prevent Pixel Bombs / Decompression Bombs)
  const sharpProbe = sharp(fileBuffer, {
    failOnError: true,
    limitInputPixels: 16777216 // 16 Megapixels max (protects against pixel decompression bombs)
  });

  const metadata = await sharpProbe.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Gambar tidak dapat didekode atau korup.');
  }

  // Max 4096 x 4096 pixels, Min 16 x 16 pixels
  if (metadata.width > 4096 || metadata.height > 4096) {
    throw new Error('Dimensi gambar terlalu besar. Maksimal 4096 x 4096 piksel.');
  }
  if (metadata.width < 16 || metadata.height < 16) {
    throw new Error('Dimensi gambar terlalu kecil. Minimal 16 x 16 piksel.');
  }

  // Reject multi-page files (e.g. animated GIF/WebP with multi-frames to avoid frame stuffing)
  if (metadata.pages && metadata.pages > 1) {
    throw new Error('Gambar animasi atau multi-frame tidak didukung.');
  }

  // 3. Re-encode and Transcode Image
  // Discards ALL original metadata, EXIF, GPS coords, comments, and polyglot payloads.
  // Resizes to standard 400x400 cover square for optimized delivery.
  const sanitizedBuffer = await sharp(fileBuffer, {
    failOnError: true,
    limitInputPixels: 16777216
  })
    .rotate() // Auto-orient based on EXIF before stripping metadata
    .resize(400, 400, {
      fit: 'cover',
      position: 'center'
    })
    .webp({
      quality: 85,
      effort: 4
    })
    .toBuffer();

  // 4. Generate Cryptographically Secure Filename
  // Never use original filename. Tied strictly to userId + 128-bit random hex
  const safeFilename = `avatar-${userId}-${crypto.randomBytes(16).toString('hex')}.webp`;
  const safePath = path.resolve(UPLOAD_DIR, safeFilename);

  // Path traversal assertion
  if (!safePath.startsWith(UPLOAD_DIR)) {
    throw new Error('Integritas path penyimpanan terganggu.');
  }

  // 5. Write to disk securely
  await fs.promises.writeFile(safePath, sanitizedBuffer);

  return {
    filename: safeFilename,
    avatarUrl: `/api/auth/avatar/${safeFilename}`
  };
}

/* ============================================================
 * SAFE OLD AVATAR CLEANUP
 * ============================================================ */
function deleteOldAvatarFile(avatarUrl, userId) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return;

  const baseName = path.basename(avatarUrl);
  // Strict regex match: only avatar-<userId>-<32 hex chars>.webp
  const expectedPrefix = `avatar-${userId}-`;
  const validPattern = /^avatar-\d+-[a-f0-9]{32}\.webp$/;

  if (!validPattern.test(baseName) || !baseName.startsWith(expectedPrefix)) {
    // Does not belong to this user or invalid pattern; do not delete
    return;
  }

  const targetPath = path.resolve(UPLOAD_DIR, baseName);
  if (!targetPath.startsWith(UPLOAD_DIR)) return;

  try {
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  } catch (err) {
    console.error('[Avatar Cleanup Warning]', err.message);
  }
}

/* ============================================================
 * SAFE AVATAR SERVING WITH SECURITY HEADERS
 * ============================================================ */
const VALID_AVATAR_FILENAME = /^avatar-\d+-[a-f0-9]{32}\.webp$/;

function serveAvatarFile(filename, req, res) {
  if (!filename || !VALID_AVATAR_FILENAME.test(filename)) {
    return res.status(400).json({ error: 'Nama file foto tidak valid.' });
  }

  const targetPath = path.resolve(UPLOAD_DIR, filename);
  if (!targetPath.startsWith(UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'Foto profil tidak ditemukan.' });
  }

  // Hardened HTTP security headers to prevent XSS, MIME sniffing, and Clickjacking
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');

  res.sendFile(targetPath);
}

module.exports = {
  UPLOAD_DIR,
  checkAvatarRateLimit,
  detectImageMagicBytes,
  handleAvatarUploadMiddleware,
  processAndSanitizeAvatar,
  deleteOldAvatarFile,
  serveAvatarFile
};
