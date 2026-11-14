/**
 * Katalog akademik: kampus → fakultas → prodi + pemetaan fitur per prodi/fakultas.
 *
 * Modul ini melakukan seed idempotent dari `server/data/campusPresets.js`.
 * Pemetaan fitur hanya di-seed saat tabel `program_features` masih kosong,
 * sehingga perubahan yang dilakukan admin tidak ditimpa saat server restart.
 */
const { db } = require('../db');
const { CAMPUSES, FEATURES } = require('../data/campusPresets');

/* ---------- helpers ---------- */
function normalizeName(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/\((s|d)\s*\d\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function programFullName(name, level) {
  const n = String(name || '').trim();
  if (!level) return n;
  if (/\((s|d)\s*\d\)$/i.test(n)) return n;
  return `${n} (${level})`;
}

function featureRow(row) {
  if (!row) return null;
  return {
    key: row.key,
    label: row.label,
    icon: row.icon,
    group: row.group_name,
    module: row.module_path,
    description: row.description,
    isCore: !!row.is_core,
    isGeneral: !!row.is_general,
    sortOrder: row.sort_order
  };
}

/* ============================================================
 * SEED
 * ============================================================ */
function seedPresets() {
  db.exec('BEGIN');
  try {
    /* 1. Katalog fitur */
    const upsertFeature = db.prepare(`
      INSERT INTO features (key, label, icon, group_name, module_path, description, is_core, is_general, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        label = excluded.label,
        icon = excluded.icon,
        group_name = excluded.group_name,
        module_path = excluded.module_path,
        description = excluded.description,
        is_core = excluded.is_core,
        is_general = excluded.is_general,
        sort_order = excluded.sort_order
    `);
    for (const f of FEATURES) {
      upsertFeature.run(
        f.key, f.label, f.icon || '🧩', f.group || null, f.module || null,
        f.description || '', f.is_core ? 1 : 0, f.is_general ? 1 : 0, f.sort_order || 0
      );
    }

    /* 2-3. Kampus → fakultas → prodi + pemetaan fitur.
       Hanya dijalankan saat katalog masih kosong. Setelah itu admin memegang
       kendali penuh: restart tidak menghidupkan kembali data yang sudah
       diubah atau dihapus. */
    const campusCount = db.prepare('SELECT COUNT(*) AS c FROM campuses').get().c;
    if (campusCount === 0) {
      const insertCampus = db.prepare(`
        INSERT INTO campuses (name, short_name, is_default, is_active, sort_order)
        VALUES (?, ?, 1, 1, ?)
      `);
      const selectCampus = db.prepare('SELECT id FROM campuses WHERE name = ?');
      const insertFaculty = db.prepare('INSERT OR IGNORE INTO faculties (campus_id, name, sort_order) VALUES (?, ?, ?)');
      const selectFaculty = db.prepare('SELECT id FROM faculties WHERE campus_id = ? AND name = ?');
      const insertProgram = db.prepare('INSERT OR IGNORE INTO programs (faculty_id, name, level, sort_order) VALUES (?, ?, ?, ?)');
      const selectProgram = db.prepare('SELECT id FROM programs WHERE faculty_id = ? AND name = ?');

      let campusOrder = 0;
      const programFeaturePairs = [];

      for (const campus of CAMPUSES) {
        insertCampus.run(campus.name, campus.short_name || null, campusOrder++ * 10);
        const campusRow = selectCampus.get(campus.name);

        let facultyOrder = 0;
        for (const faculty of campus.faculties || []) {
          insertFaculty.run(campusRow.id, faculty.name, facultyOrder++ * 10);
          const facultyRow = selectFaculty.get(campusRow.id, faculty.name);

          let programOrder = 0;
          for (const program of faculty.programs || []) {
            const level = program.level || 'S1';
            insertProgram.run(facultyRow.id, program.name, level, programOrder++ * 10);
            const programRow = selectProgram.get(facultyRow.id, program.name);
            for (const key of program.features || []) {
              programFeaturePairs.push([programRow.id, key]);
            }
          }
        }
      }

      if (programFeaturePairs.length) {
        const insertMapping = db.prepare('INSERT OR IGNORE INTO program_features (program_id, feature_key) VALUES (?, ?)');
        for (const [programId, key] of programFeaturePairs) insertMapping.run(programId, key);
      }
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/* ============================================================
 * MIGRASI USER LAMA (kolom teks → ID)
 * ============================================================ */
function findCampusByName(text) {
  if (!text) return null;
  const target = normalizeName(text);
  const campuses = db.prepare('SELECT * FROM campuses').all();
  let match = campuses.find(c => normalizeName(c.name) === target);
  if (match) return match;
  match = campuses.find(c => normalizeName(c.short_name) === target);
  if (match) return match;
  match = campuses.find(c => {
    const shortName = normalizeName(c.short_name);
    return shortName && target && (shortName.includes(target) || target.includes(shortName));
  });
  return match || null;
}

function findFacultyByName(campusId, text) {
  if (!campusId || !text) return null;
  const target = normalizeName(text);
  const faculties = db.prepare('SELECT * FROM faculties WHERE campus_id = ?').all(campusId);
  let match = faculties.find(f => normalizeName(f.name) === target);
  if (match) return match;
  match = faculties.find(f => target && (normalizeName(f.name).includes(target) || target.includes(normalizeName(f.name))));
  return match || null;
}

function findProgramByName(facultyId, text) {
  if (!facultyId || !text) return null;
  const target = normalizeName(text);
  const programs = db.prepare('SELECT * FROM programs WHERE faculty_id = ?').all(facultyId);
  const match = programs.find(p => normalizeName(programFullName(p.name, p.level)) === target || normalizeName(p.name) === target);
  return match || null;
}

function migrateUserAcademicLinks() {
  const users = db.prepare('SELECT id, campus_name, faculty, study_program FROM users WHERE campus_id IS NULL').all();
  if (!users.length) return 0;

  const update = db.prepare('UPDATE users SET campus_id = ?, faculty_id = ?, program_id = ? WHERE id = ?');
  let migrated = 0;

  for (const user of users) {
    const campus = findCampusByName(user.campus_name);
    if (!campus) continue;
    const faculty = findFacultyByName(campus.id, user.faculty);
    const program = faculty ? findProgramByName(faculty.id, user.study_program) : null;
    update.run(campus.id, faculty ? faculty.id : null, program ? program.id : null, user.id);
    migrated++;
  }
  return migrated;
}

/* ============================================================
 * QUERY: PRESET PUBLIK (untuk registrasi)
 * ============================================================ */
function listPublicPresets() {
  const campuses = db.prepare(`
    SELECT id, name, short_name FROM campuses
    WHERE is_active = 1
    ORDER BY is_default DESC, sort_order, name
  `).all();

  return campuses.map(campus => {
    const faculties = db.prepare('SELECT id, name FROM faculties WHERE campus_id = ? ORDER BY sort_order, name').all(campus.id);
    return {
      id: campus.id,
      name: campus.name,
      short_name: campus.short_name,
      faculties: faculties.map(faculty => ({
        id: faculty.id,
        name: faculty.name,
        faculty: faculty.name, // kompatibilitas nama lama
        programs: db.prepare('SELECT id, name, level FROM programs WHERE faculty_id = ? ORDER BY sort_order, name').all(faculty.id)
          .map(p => ({ id: p.id, name: p.name, level: p.level, full_name: programFullName(p.name, p.level) }))
      }))
    };
  });
}

/* ============================================================
 * QUERY: TREE ADMIN (termasuk nonaktif & jumlah user)
 * ============================================================ */
function getCampusTree({ includeInactive = true } = {}) {
  const where = includeInactive ? '' : 'WHERE c.is_active = 1';
  const campuses = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM users u WHERE u.campus_id = c.id) AS user_count,
      (SELECT logo_url FROM campus_logos cl WHERE cl.campus_name = c.name) AS logo_url
    FROM campuses c
    ${where}
    ORDER BY c.is_default DESC, c.sort_order, c.name
  `).all();

  return campuses.map(campus => {
    const faculties = db.prepare(`
      SELECT f.*, (SELECT COUNT(*) FROM users u WHERE u.faculty_id = f.id) AS user_count
      FROM faculties f WHERE f.campus_id = ? ORDER BY f.sort_order, f.name
    `).all(campus.id);

    return {
      id: campus.id,
      name: campus.name,
      campus_name: campus.name, // kompatibilitas UI logo lama
      short_name: campus.short_name,
      isDefault: !!campus.is_default,
      isActive: !!campus.is_active,
      userCount: campus.user_count,
      user_count: campus.user_count, // kompatibilitas UI logo lama
      logoUrl: campus.logo_url || '',
      logo_url: campus.logo_url || '',
      faculties: faculties.map(faculty => ({
        id: faculty.id,
        name: faculty.name,
        userCount: faculty.user_count,
        programs: db.prepare(`
          SELECT p.*, (SELECT COUNT(*) FROM users u WHERE u.program_id = p.id) AS user_count
          FROM programs p WHERE p.faculty_id = ? ORDER BY p.sort_order, p.name
        `).all(faculty.id).map(p => ({
          id: p.id,
          name: p.name,
          level: p.level,
          fullName: programFullName(p.name, p.level),
          userCount: p.user_count
        }))
      }))
    };
  });
}

/* ============================================================
 * QUERY: FITUR USER
 * ============================================================ */
function getFeaturesForUser(user) {
  const programId = user && user.program_id ? user.program_id : -1;
  const facultyId = user && user.faculty_id ? user.faculty_id : -1;
  const rows = db.prepare(`
    SELECT * FROM features f
    WHERE f.is_core = 1 OR f.is_general = 1
       OR f.key IN (
         SELECT feature_key FROM program_features WHERE program_id = ?
         UNION
         SELECT feature_key FROM faculty_features WHERE faculty_id = ?
       )
    ORDER BY f.sort_order, f.label
  `).all(programId, facultyId);
  return rows.map(featureRow);
}

function getAllFeatures() {
  return db.prepare('SELECT * FROM features ORDER BY sort_order, label').all().map(featureRow);
}

function getUserAcademic(userId) {
  const row = db.prepare(`
    SELECT u.campus_id, u.faculty_id, u.program_id,
           c.name AS campus_name, f.name AS faculty_name, p.name AS program_name, p.level AS program_level
    FROM users u
    LEFT JOIN campuses c ON c.id = u.campus_id
    LEFT JOIN faculties f ON f.id = u.faculty_id
    LEFT JOIN programs p ON p.id = u.program_id
    WHERE u.id = ?
  `).get(userId);
  if (!row) return null;
  return {
    campusId: row.campus_id,
    facultyId: row.faculty_id,
    programId: row.program_id,
    campusName: row.campus_name,
    facultyName: row.faculty_name,
    programName: row.program_name ? programFullName(row.program_name, row.program_level) : null
  };
}

/* ============================================================
 * RESOLVE UNIT (registrasi / admin)
 * ============================================================ */
function resolveAcademicUnit({ campus_id, faculty_id, program_id, campus_name, faculty, study_program }) {
  if (program_id) {
    const program = db.prepare(`
      SELECT p.id, p.name, p.level, f.id AS faculty_id, f.name AS faculty_name,
             c.id AS campus_id, c.name AS campus_name, c.is_active
      FROM programs p
      JOIN faculties f ON f.id = p.faculty_id
      JOIN campuses c ON c.id = f.campus_id
      WHERE p.id = ?
    `).get(Number(program_id));

    if (!program) return { error: 'Prodi tidak ditemukan.' };
    if (!program.is_active) return { error: 'Kampus tidak aktif.' };
    if (campus_id && Number(campus_id) !== program.campus_id) return { error: 'Kampus tidak cocok dengan prodi.' };
    if (faculty_id && Number(faculty_id) !== program.faculty_id) return { error: 'Fakultas tidak cocok dengan prodi.' };

    return {
      campus_id: program.campus_id,
      faculty_id: program.faculty_id,
      program_id: program.id,
      campus_name: program.campus_name,
      faculty_name: program.faculty_name,
      study_program: programFullName(program.name, program.level)
    };
  }

  /* Mode custom: cari atau buat kampus/fakultas/prodi */
  const cName = String(campus_name || '').trim();
  if (!cName) return { error: 'Nama kampus wajib diisi.' };

  let campus = findCampusByName(cName);
  if (!campus) {
    const res = db.prepare('INSERT INTO campuses (name, short_name, is_default, is_active, sort_order) VALUES (?, ?, 0, 1, 9999)')
      .run(cName, cName);
    campus = { id: Number(res.lastInsertRowid) };
  }
  if (!campus.is_active && campus.is_active !== undefined) return { error: 'Kampus tidak aktif.' };

  const fName = String(faculty || '').trim() || 'Fakultas Tidak Ditetapkan';
  let facultyRow = findFacultyByName(campus.id, fName);
  if (!facultyRow) {
    const res = db.prepare('INSERT INTO faculties (campus_id, name, sort_order) VALUES (?, ?, 9999)').run(campus.id, fName);
    facultyRow = { id: Number(res.lastInsertRowid) };
  }

  const pName = String(study_program || '').trim() || 'Prodi Tidak Ditetapkan';
  let programRow = findProgramByName(facultyRow.id, pName);
  if (!programRow) {
    const res = db.prepare('INSERT INTO programs (faculty_id, name, level, sort_order) VALUES (?, ?, ?, 9999)')
      .run(facultyRow.id, pName.replace(/\((s|d)\s*\d\)$/i, '').trim(), 'S1');
    programRow = { id: Number(res.lastInsertRowid) };
  }

  return {
    campus_id: campus.id,
    faculty_id: facultyRow.id,
    program_id: programRow.id,
    campus_name: cName,
    faculty_name: fName,
    study_program: programFullName(pName.replace(/\((s|d)\s*\d\)$/i, '').trim(), 'S1')
  };
}

function setUserAcademic(userId, { campus_id, faculty_id, program_id }) {
  const unit = resolveAcademicUnit({ campus_id, faculty_id, program_id });
  if (unit.error) return { error: unit.error };

  db.prepare(`
    UPDATE users SET campus_id = ?, faculty_id = ?, program_id = ?,
      campus_name = ?, faculty = ?, study_program = ?
    WHERE id = ?
  `).run(unit.campus_id, unit.faculty_id, unit.program_id, unit.campus_name, unit.faculty_name, unit.study_program, userId);

  return { unit };
}

/* ============================================================
 * PEMETAAN FITUR
 * ============================================================ */
function getProgramFeatures(programId) {
  return db.prepare('SELECT feature_key FROM program_features WHERE program_id = ? ORDER BY feature_key')
    .all(programId).map(r => r.feature_key);
}

function setProgramFeatures(programId, keys) {
  const program = db.prepare('SELECT id FROM programs WHERE id = ?').get(programId);
  if (!program) return { error: 'Prodi tidak ditemukan.' };

  const valid = new Set(db.prepare('SELECT key FROM features').all().map(r => r.key));
  const clean = [...new Set((keys || []).filter(k => valid.has(k)))];

  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM program_features WHERE program_id = ?').run(programId);
    const insert = db.prepare('INSERT OR IGNORE INTO program_features (program_id, feature_key) VALUES (?, ?)');
    for (const key of clean) insert.run(programId, key);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { features: clean };
}

function getFacultyFeatures(facultyId) {
  return db.prepare('SELECT feature_key FROM faculty_features WHERE faculty_id = ? ORDER BY feature_key')
    .all(facultyId).map(r => r.feature_key);
}

function setFacultyFeatures(facultyId, keys) {
  const faculty = db.prepare('SELECT id FROM faculties WHERE id = ?').get(facultyId);
  if (!faculty) return { error: 'Fakultas tidak ditemukan.' };

  const valid = new Set(db.prepare('SELECT key FROM features').all().map(r => r.key));
  const clean = [...new Set((keys || []).filter(k => valid.has(k)))];

  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM faculty_features WHERE faculty_id = ?').run(facultyId);
    const insert = db.prepare('INSERT OR IGNORE INTO faculty_features (faculty_id, feature_key) VALUES (?, ?)');
    for (const key of clean) insert.run(facultyId, key);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { features: clean };
}

/* ============================================================
 * CRUD ADMIN
 * ============================================================ */
function createCampus({ name, short_name }) {
  const clean = String(name || '').trim();
  if (!clean) return { error: 'Nama kampus wajib diisi.' };
  const exists = db.prepare('SELECT id FROM campuses WHERE name = ?').get(clean);
  if (exists) return { error: 'Kampus sudah ada.' };

  const res = db.prepare('INSERT INTO campuses (name, short_name, is_default, is_active, sort_order) VALUES (?, ?, 0, 1, 9999)')
    .run(clean, String(short_name || '').trim() || clean);
  return { id: Number(res.lastInsertRowid) };
}

function updateCampus(id, { name, short_name, is_active }) {
  const campus = db.prepare('SELECT * FROM campuses WHERE id = ?').get(id);
  if (!campus) return { error: 'Kampus tidak ditemukan.' };

  const nextName = String(name || campus.name).trim();
  if (!nextName) return { error: 'Nama kampus wajib diisi.' };
  if (campus.is_default && nextName !== campus.name) {
    return { error: 'Nama kampus default tidak dapat diubah — hanya nama singkat yang dapat disunting.' };
  }
  if (nextName !== campus.name) {
    const dup = db.prepare('SELECT id FROM campuses WHERE name = ? AND id != ?').get(nextName, id);
    if (dup) return { error: 'Nama kampus sudah dipakai.' };
    // Selaraskan logo & data teks user
    db.prepare('UPDATE campus_logos SET campus_name = ? WHERE campus_name = ?').run(nextName, campus.name);
    db.prepare('UPDATE users SET campus_name = ? WHERE campus_id = ?').run(nextName, id);
  }

  db.prepare('UPDATE campuses SET name = ?, short_name = ?, is_active = ? WHERE id = ?')
    .run(nextName, String(short_name ?? campus.short_name ?? '').trim(), is_active === undefined ? campus.is_active : (is_active ? 1 : 0), id);

  return { id };
}

function deleteCampus(id) {
  const campus = db.prepare('SELECT * FROM campuses WHERE id = ?').get(id);
  if (!campus) return { error: 'Kampus tidak ditemukan.' };
  if (campus.is_default) return { error: 'Kampus default tidak dapat dihapus — nonaktifkan saja.' };

  const used = db.prepare('SELECT COUNT(*) AS c FROM users WHERE campus_id = ?').get(id).c;
  if (used > 0) return { error: `Kampus masih dipakai ${used} pengguna.` };

  db.prepare('DELETE FROM campus_logos WHERE campus_name = ?').run(campus.name);
  db.prepare('DELETE FROM campuses WHERE id = ?').run(id);
  return { id };
}

function createFaculty({ campus_id, name }) {
  const campus = db.prepare('SELECT id FROM campuses WHERE id = ?').get(campus_id);
  if (!campus) return { error: 'Kampus tidak ditemukan.' };
  const clean = String(name || '').trim();
  if (!clean) return { error: 'Nama fakultas wajib diisi.' };
  const dup = db.prepare('SELECT id FROM faculties WHERE campus_id = ? AND name = ?').get(campus_id, clean);
  if (dup) return { error: 'Fakultas sudah ada di kampus ini.' };

  const res = db.prepare('INSERT INTO faculties (campus_id, name, sort_order) VALUES (?, ?, 9999)').run(campus_id, clean);
  return { id: Number(res.lastInsertRowid) };
}

function updateFaculty(id, { name }) {
  const faculty = db.prepare('SELECT * FROM faculties WHERE id = ?').get(id);
  if (!faculty) return { error: 'Fakultas tidak ditemukan.' };
  const clean = String(name || '').trim();
  if (!clean) return { error: 'Nama fakultas wajib diisi.' };
  const dup = db.prepare('SELECT id FROM faculties WHERE campus_id = ? AND name = ? AND id != ?')
    .get(faculty.campus_id, clean, id);
  if (dup) return { error: 'Fakultas sudah ada di kampus ini.' };

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE faculties SET name = ? WHERE id = ?').run(clean, id);
    db.prepare('UPDATE users SET faculty = ? WHERE faculty_id = ?').run(clean, id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { id };
}

function deleteFaculty(id) {
  const faculty = db.prepare('SELECT * FROM faculties WHERE id = ?').get(id);
  if (!faculty) return { error: 'Fakultas tidak ditemukan.' };
  const used = db.prepare('SELECT COUNT(*) AS c FROM users WHERE faculty_id = ?').get(id).c;
  if (used > 0) return { error: `Fakultas masih dipakai ${used} pengguna.` };

  db.prepare('DELETE FROM faculties WHERE id = ?').run(id);
  return { id };
}

function createProgram({ faculty_id, name, level, features }) {
  const faculty = db.prepare('SELECT id FROM faculties WHERE id = ?').get(faculty_id);
  if (!faculty) return { error: 'Fakultas tidak ditemukan.' };
  const clean = String(name || '').replace(/\((s|d)\s*\d\)$/i, '').trim();
  if (!clean) return { error: 'Nama prodi wajib diisi.' };
  const dup = db.prepare('SELECT id FROM programs WHERE faculty_id = ? AND name = ?').get(faculty_id, clean);
  if (dup) return { error: 'Prodi sudah ada di fakultas ini.' };

  const res = db.prepare('INSERT INTO programs (faculty_id, name, level, sort_order) VALUES (?, ?, ?, 9999)')
    .run(faculty_id, clean, String(level || 'S1').toUpperCase());
  const id = Number(res.lastInsertRowid);
  if (Array.isArray(features) && features.length) setProgramFeatures(id, features);
  return { id };
}

function updateProgram(id, { name, level }) {
  const program = db.prepare('SELECT * FROM programs WHERE id = ?').get(id);
  if (!program) return { error: 'Prodi tidak ditemukan.' };
  const clean = String(name || '').replace(/\((s|d)\s*\d\)$/i, '').trim();
  if (!clean) return { error: 'Nama prodi wajib diisi.' };
  const dup = db.prepare('SELECT id FROM programs WHERE faculty_id = ? AND name = ? AND id != ?')
    .get(program.faculty_id, clean, id);
  if (dup) return { error: 'Prodi sudah ada di fakultas ini.' };

  const nextLevel = String(level || program.level || 'S1').toUpperCase();
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE programs SET name = ?, level = ? WHERE id = ?').run(clean, nextLevel, id);
    db.prepare('UPDATE users SET study_program = ? WHERE program_id = ?')
      .run(programFullName(clean, nextLevel), id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { id };
}

function deleteProgram(id) {
  const program = db.prepare('SELECT * FROM programs WHERE id = ?').get(id);
  if (!program) return { error: 'Prodi tidak ditemukan.' };
  const used = db.prepare('SELECT COUNT(*) AS c FROM users WHERE program_id = ?').get(id).c;
  if (used > 0) return { error: `Prodi masih dipakai ${used} pengguna.` };

  db.prepare('DELETE FROM programs WHERE id = ?').run(id);
  return { id };
}

/* ============================================================
 * BOOTSTRAP — dijalankan sekali saat modul dimuat
 * ============================================================ */
seedPresets();
migrateUserAcademicLinks();

module.exports = {
  normalizeName,
  programFullName,
  seedPresets,
  migrateUserAcademicLinks,
  listPublicPresets,
  getCampusTree,
  getFeaturesForUser,
  getAllFeatures,
  getUserAcademic,
  resolveAcademicUnit,
  setUserAcademic,
  getProgramFeatures,
  setProgramFeatures,
  getFacultyFeatures,
  setFacultyFeatures,
  createCampus,
  updateCampus,
  deleteCampus,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  createProgram,
  updateProgram,
  deleteProgram
};
