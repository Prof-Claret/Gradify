/**
 * Campus logo helpers — one logo per campus name, backed by SQLite.
 */
const { db } = require('../db');

function ensureCampusLogosTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campus_logos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campus_name TEXT UNIQUE NOT NULL,
      logo_url TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
ensureCampusLogosTable();

/** Daftar semua kampus yang dikenal database (dari tabel users) + logo masing-masing. */
function listCampuses() {
  return db.prepare(`
    SELECT u.campus_name,
           COUNT(*) AS user_count,
           cl.logo_url
    FROM users u
    LEFT JOIN campus_logos cl ON cl.campus_name = u.campus_name
    WHERE u.campus_name IS NOT NULL AND u.campus_name <> ''
    GROUP BY u.campus_name
    ORDER BY user_count DESC, u.campus_name ASC
  `).all();
}

/** Map nama kampus -> URL logo (untuk konsumsi publik). */
function getCampusLogoMap() {
  const rows = db.prepare('SELECT campus_name, logo_url FROM campus_logos').all();
  const map = {};
  for (const row of rows) map[row.campus_name] = row.logo_url;
  return map;
}

function getCampusLogo(campusName) {
  const row = db.prepare('SELECT logo_url FROM campus_logos WHERE campus_name = ?').get(campusName);
  return row?.logo_url || '';
}

function setCampusLogo(campusName, logoUrl) {
  db.prepare(`
    INSERT INTO campus_logos (campus_name, logo_url, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(campus_name) DO UPDATE SET
      logo_url = excluded.logo_url,
      updated_at = datetime('now')
  `).run(campusName, logoUrl);
}

function deleteCampusLogo(campusName) {
  const row = db.prepare('SELECT logo_url FROM campus_logos WHERE campus_name = ?').get(campusName);
  if (!row) return null;
  db.prepare('DELETE FROM campus_logos WHERE campus_name = ?').run(campusName);
  return row.logo_url;
}

module.exports = {
  listCampuses,
  getCampusLogoMap,
  getCampusLogo,
  setCampusLogo,
  deleteCampusLogo
};
