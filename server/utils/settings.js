/**
 * App settings helpers — key/value store backed by SQLite.
 */
const { db, DEFAULT_APP_SETTINGS } = require('../db');

const BOOLEAN_SETTINGS = new Set([
  'registration_enabled',
  'maintenance_mode',
  'allow_custom_campus'
]);

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM app_settings').all();
  const settings = { ...DEFAULT_APP_SETTINGS };
  for (const row of rows) settings[row.key] = row.value === null ? '' : String(row.value);
  return settings;
}

function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  if (!row) return fallback ?? DEFAULT_APP_SETTINGS[key] ?? null;
  return row.value === null ? '' : String(row.value);
}

function isEnabled(key) {
  return String(getSetting(key, '0')) === '1';
}

function setSettings(patch) {
  const upsert = db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const [key, value] of Object.entries(patch)) {
      if (!(key in DEFAULT_APP_SETTINGS)) continue;
      let v = value;
      if (BOOLEAN_SETTINGS.has(key)) v = value ? '1' : '0';
      if (key === 'default_target_gpa') {
        const parsed = parseFloat(value);
        const n = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 4) : 3.5;
        v = n.toFixed(2);
      }
      upsert.run(key, v === undefined || v === null ? '' : String(v));
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return getSettings();
}

function ensureDefaultSettings() {
  for (const [key, value] of Object.entries(DEFAULT_APP_SETTINGS)) {
    db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
  }
}

function getPublicConfig() {
  const s = getSettings();
  return {
    site_name: s.site_name,
    site_tagline: s.site_tagline,
    support_email: s.support_email,
    registration_enabled: s.registration_enabled === '1',
    maintenance_mode: s.maintenance_mode === '1',
    maintenance_message: s.maintenance_message,
    allow_custom_campus: s.allow_custom_campus === '1',
    default_target_gpa: Number(s.default_target_gpa) || 3.5,
    announcement: s.announcement || ''
  };
}

module.exports = {
  BOOLEAN_SETTINGS,
  getSettings,
  getSetting,
  isEnabled,
  setSettings,
  ensureDefaultSettings,
  getPublicConfig
};
