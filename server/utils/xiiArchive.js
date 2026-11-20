/**
 * Gradify .xii archive — satu file portabel berisi database + semua upload.
 *
 * Format: ZIP container (ekstensi .xii) dengan isi:
 *   manifest.json   — metadata, versi format, jumlah tabel & file, checksum
 *   database.json   — seluruh tabel data (termasuk akun & hash password)
 *   uploads/...     — avatar, logo kampus/situs, lampiran tugas, materi kuliah
 *   README.txt      — penjelasan singkat format
 *
 * Modul ini sengaja tidak bergantung pada Express/admin route agar bisa
 * dipakai ulang dan diuji secara terpisah.
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const FORMAT = 'gradify-xii';
const FORMAT_VERSION = 1;

/* ============================================================
 * ZIP (store/deflate) — implementasi kecil tanpa dependency
 * ============================================================ */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function dosDateTime(date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const year = Math.min(Math.max(d.getFullYear(), 1980), 2107);
  return {
    dosTime: ((d.getHours() & 0x1F) << 11) | ((d.getMinutes() & 0x3F) << 5) | ((d.getSeconds() >> 1) & 0x1F),
    dosDate: (((year - 1980) & 0x7F) << 9) | (((d.getMonth() + 1) & 0x0F) << 5) | (d.getDate() & 0x1F)
  };
}

function createZip(entries) {
  if (entries.length > 0xFFFF) throw new Error('Arsip berisi terlalu banyak file untuk format ZIP standar.');

  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let totalBytes = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    totalBytes += data.length;
    if (totalBytes > 0xFFFFFFFF) throw new Error('Ukuran arsip melebihi batas 4 GB format ZIP standar.');
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const payload = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(data);
    const { dosTime, dosDate } = dosDateTime(entry.date);
    const flags = 0x0800; // UTF-8 filename

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    localParts.push(local, nameBuf, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + payload.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

function safeEntryPath(name) {
  const normalized = String(name || '').replaceAll('\\', '/');
  if (!normalized || normalized.includes('\0')) throw new Error('Nama file di dalam arsip tidak valid.');
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error('Arsip berisi path absolut yang tidak diizinkan.');
  }
  const parts = normalized.split('/');
  if (parts.some(p => p === '' || p === '.' || p === '..')) {
    throw new Error('Arsip berisi path traversal yang tidak diizinkan.');
  }
  return normalized;
}

function readZip(buffer, options = {}) {
  const maxEntries = options.maxEntries || 10000;
  const maxTotalBytes = options.maxTotalBytes || 1024 * 1024 * 1024;

  if (!Buffer.isBuffer(buffer) || buffer.length < 22) {
    throw new Error('File .xii tidak valid atau kosong.');
  }

  let eocd = -1;
  const start = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= start; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Struktur arsip .xii tidak dikenali.');

  const count = buffer.readUInt16LE(eocd + 10);
  const cdSize = buffer.readUInt32LE(eocd + 12);
  const cdOffset = buffer.readUInt32LE(eocd + 16);
  if (count > maxEntries) throw new Error(`Arsip berisi terlalu banyak file (${count}).`);
  if (cdOffset + cdSize > buffer.length) throw new Error('Direktori arsip rusak.');

  const entries = [];
  let pointer = cdOffset;
  let total = 0;

  for (let i = 0; i < count; i++) {
    if (pointer + 46 > buffer.length || buffer.readUInt32LE(pointer) !== 0x02014b50) {
      throw new Error('Direktori arsip rusak.');
    }

    const flags = buffer.readUInt16LE(pointer + 8);
    const method = buffer.readUInt16LE(pointer + 10);
    const crc = buffer.readUInt32LE(pointer + 16);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const uncompressedSize = buffer.readUInt32LE(pointer + 24);
    const nameLen = buffer.readUInt16LE(pointer + 28);
    const extraLen = buffer.readUInt16LE(pointer + 30);
    const commentLen = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const rawName = buffer.subarray(pointer + 46, pointer + 46 + nameLen).toString('utf8');

    pointer += 46 + nameLen + extraLen + commentLen;

    if (flags & 0x1) throw new Error('Arsip terenkripsi tidak didukung.');
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error('Header file di dalam arsip rusak.');
    }

    const localNameLen = buffer.readUInt16LE(localOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) throw new Error('Data file di dalam arsip terpotong.');

    const payload = buffer.subarray(dataStart, dataEnd);
    let data;
    if (method === 0) data = Buffer.from(payload);
    else if (method === 8) data = zlib.inflateRawSync(payload, { maxOutputLength: maxTotalBytes });
    else throw new Error(`Metode kompresi arsip (${method}) tidak didukung.`);

    if (data.length !== uncompressedSize) throw new Error('Ukuran file di dalam arsip tidak cocok.');
    if (crc32(data) !== crc) throw new Error('Checksum file di dalam arsip tidak cocok.');

    total += data.length;
    if (total > maxTotalBytes) throw new Error('Ukuran arsip setelah diekstrak terlalu besar.');

    const name = safeEntryPath(rawName);
    if (!name.endsWith('/')) entries.push({ name, data });
  }

  return entries;
}

/* ============================================================
 * FILESYSTEM HELPERS
 * ============================================================ */
function walkFiles(rootDir, base = '') {
  const out = [];
  if (!fs.existsSync(rootDir)) return out;

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const full = path.join(rootDir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walkFiles(full, rel));
    else if (entry.isFile()) out.push({ path: rel, full, stat: fs.statSync(full) });
  }
  return out;
}

const UPLOAD_RULES = [
  { prefix: 'uploads/avatars/', dir: 'avatars', pattern: /^avatar-\d+-[a-f0-9]{32}\.webp$/ },
  { prefix: 'uploads/logos/', dir: 'logos', pattern: /^(site|campus)-logo-\d+(?:-[a-f0-9]+)?\.(png|jpe?g|webp|svg)$/i },
  { prefix: 'uploads/files/', dir: 'files', pattern: /^u\d+-[a-f0-9]{16}\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|webp|txt|csv|zip|rar|7z)$/i }
];

/* ============================================================
 * BUILD
 * ============================================================ */
function buildXiiArchive({ db, tables, uploadsDir, appVersion = '1.0.0' }) {
  if (!db) throw new Error('Database tidak tersedia.');
  if (!Array.isArray(tables) || tables.length === 0) throw new Error('Daftar tabel tidak tersedia.');

  const exportedAt = new Date().toISOString();
  const data = {};

  for (const table of tables) {
    data[table] = db.prepare(`SELECT * FROM "${table}"`).all();
  }

  const databaseBuf = Buffer.from(JSON.stringify({ tables: data }), 'utf8');
  const files = walkFiles(uploadsDir);

  const manifest = {
    format: FORMAT,
    version: FORMAT_VERSION,
    app: 'Gradify',
    app_version: appVersion,
    exported_at: exportedAt,
    tables: Object.fromEntries(Object.entries(data).map(([name, rows]) => [name, rows.length])),
    uploads: {
      count: files.length,
      bytes: files.reduce((sum, file) => sum + file.stat.size, 0)
    },
    checksums: {
      database_sha256: sha256(databaseBuf)
    }
  };

  const readme = [
    'GRADIFY .xii DATA ARCHIVE',
    '',
    'File ini berisi salinan lengkap data Gradify:',
    '- database.json : seluruh tabel (akun, nilai, tugas, catatan, pengaturan, dll.)',
    '- uploads/      : foto avatar, logo kampus/situs, lampiran tugas, dan materi kuliah',
    '- manifest.json : metadata & checksum',
    '',
    `Dibuat: ${exportedAt}`,
    `Versi aplikasi: ${appVersion}`,
    '',
    'PERINGATAN KEAMANAN:',
    'File ini berisi akun dan hash password. Simpan di tempat aman dan jangan dibagikan.',
    'Import hanya dapat dilakukan oleh administrator melalui dashboard admin.',
    ''
  ].join('\n');

  const entries = [
    { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') },
    { name: 'database.json', data: databaseBuf },
    { name: 'README.txt', data: Buffer.from(readme, 'utf8') }
  ];

  for (const file of files) {
    entries.push({
      name: `uploads/${file.path}`,
      data: fs.readFileSync(file.full),
      date: file.stat.mtime
    });
  }

  return { buffer: createZip(entries), manifest };
}

/* ============================================================
 * READ / VALIDATE
 * ============================================================ */
function readXiiArchive(buffer, options = {}) {
  const entries = readZip(buffer, options);
  const map = new Map(entries.map(entry => [entry.name, entry.data]));

  const manifestBuf = map.get('manifest.json');
  const databaseBuf = map.get('database.json');
  if (!manifestBuf || !databaseBuf) {
    throw new Error('File .xii tidak lengkap: manifest.json atau database.json tidak ditemukan.');
  }

  let manifest;
  try { manifest = JSON.parse(manifestBuf.toString('utf8')); }
  catch { throw new Error('manifest.json tidak valid.'); }

  if (manifest?.format !== FORMAT) {
    throw new Error('File bukan arsip Gradify .xii yang valid.');
  }
  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    throw new Error('Versi arsip .xii tidak didukung.');
  }
  if (manifest.version > FORMAT_VERSION) {
    throw new Error(`Arsip dibuat oleh versi Gradify yang lebih baru (format v${manifest.version}).`);
  }

  const expectedHash = manifest?.checksums?.database_sha256;
  if (expectedHash && sha256(databaseBuf) !== expectedHash) {
    throw new Error('Checksum database pada arsip tidak cocok. File mungkin rusak.');
  }

  let parsed;
  try { parsed = JSON.parse(databaseBuf.toString('utf8')); }
  catch { throw new Error('database.json tidak valid.'); }

  const tables = parsed?.tables ?? parsed;
  if (!tables || typeof tables !== 'object' || Array.isArray(tables)) {
    throw new Error('Struktur database di dalam arsip tidak dikenali.');
  }
  for (const [name, rows] of Object.entries(tables)) {
    if (!Array.isArray(rows)) {
      throw new Error(`Tabel "${name}" pada arsip tidak berisi array.`);
    }
  }

  const files = entries.filter(entry => entry.name.startsWith('uploads/'));

  return { manifest, tables, files };
}

/**
 * Menulis file upload dari arsip ke folder uploads. Hanya path yang sesuai
 * pola resmi Gradify yang diterima; file asing dilewati.
 */
function restoreUploads(files, uploadsDir) {
  if (!Array.isArray(files)) return { restored: 0, skipped: 0 };
  if (!uploadsDir) throw new Error('Folder uploads tidak tersedia.');

  let restored = 0;
  let skipped = 0;

  for (const file of files) {
    const name = safeEntryPath(file.name);
    const rule = UPLOAD_RULES.find(item => name.startsWith(item.prefix));
    if (!rule) { skipped++; continue; }

    const basename = name.slice(rule.prefix.length);
    if (!basename || basename.includes('/') || !rule.pattern.test(basename)) {
      skipped++;
      continue;
    }

    const dir = path.join(uploadsDir, rule.dir);
    const target = path.resolve(dir, basename);
    if (!target.startsWith(`${path.resolve(dir)}${path.sep}`)) {
      skipped++;
      continue;
    }

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, file.data);
    restored++;
  }

  return { restored, skipped };
}

module.exports = {
  FORMAT,
  FORMAT_VERSION,
  buildXiiArchive,
  readXiiArchive,
  restoreUploads,
  // diekspor untuk pengujian
  crc32,
  createZip,
  readZip,
  safeEntryPath
};
