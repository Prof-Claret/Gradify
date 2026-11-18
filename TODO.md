# 📋 Gradify — TODO & Feature Planning

> Dokumen ini adalah peta jalan (roadmap) fitur yang akan ditambahkan ke Gradify.
> Setiap fitur diberi status dan dipecah menjadi task yang bisa dicentang.
>
> **Status legend:** `⬜ Belum mulai` · `🟨 Sedang dikerjakan` · `✅ Selesai` · `⏸️ Ditunda`

---

## 🗂️ Daftar Feature (Prioritas)

| # | Feature | Status | Prioritas | Target |
|---|---------|--------|-----------|--------|
| 1 | **Multi-Kampus Default + Fitur Spesifik per Fakultas/Prodi** | ⬜ Belum mulai | 🔴 Tinggi | Sekarang |
| 2 | Pemisahan modul tools per prodi (lanjutan dari #1) | ⬜ Belum mulai | 🔴 Tinggi | Setelah #1 |
| 3 | Panel Admin: Kelola Kampus, Fakultas & Prodi | ⬜ Belum mulai | 🔴 Tinggi | Setelah #1 |
| 4 | **Presensi, Tugas Upload, E-Learning & SIAK** | ✅ Selesai | 🔴 Tinggi | Selesai |
| 5 | _TBD — next feature_ | ⬜ Belum mulai | 🟡 Sedang | — |

> 📝 Catatan: daftar #4 dan seterusnya akan diisi setelah fitur #1–#3 selesai.

---

# 🎯 Feature #1 — Multi-Kampus Default + Fitur Spesifik per Fakultas/Prodi

**Status:** ⬜ Belum mulai

## 1.1 Latar Belakang & Tujuan

Saat ini Gradify hanya punya **satu preset kampus** (`UNIKA_UST_PRESET` di `server/db.js`) dan **semua mahasiswa melihat semua tools** (Kalkulator, CS Math Toolkit, Matematika Diskrit, Dev Tools, dll) tanpa peduli fakultas/prodinya.

**Tujuan fitur ini:**

1. Tersedia **beberapa kampus default** lengkap dengan daftar **Fakultas → Program Studi (Prodi)** masing-masing.
2. Setiap **Prodi memiliki fitur/tools sendiri** yang relevan dengan bidangnya.
3. **Fitur dipisah per fakultas/prodi** — mahasiswa Teknik Informatika (TI) hanya melihat tools TI, mahasiswa Akuntansi hanya melihat tools Akuntansi, dan seterusnya. Tools TI **tidak boleh tercampur** ke fakultas lain.
4. Ada **fitur inti (core)** yang tetap tampil untuk semua prodi (semester, mata kuliah, tugas, catatan, IPK, KTM, skripsi, portofolio, profil).
5. Admin bisa **mengatur pemetaan fitur per prodi** dari dashboard admin.

### Contoh Hasil Akhir

```
Mahasiswa: Budi — UNIKA UST / FIKOM / Teknik Informatika (S1)
Sidebar:
  📊 Dashboard          (core)
  🗓️ Kelola Semester     (core)
  📚 Mata Kuliah        (core)
  📝 Catatan CS         (core)
  🎯 IPK & Transkrip    (core)
  🪪 Kartu Mahasiswa    (core)
  🧮 Kalkulator Ilmiah  (FIKOM — TI)
  🛠️ CS Math Toolkit   (FIKOM — TI)
  🔗 Matematika Diskrit (FIKOM — TI)
  💻 Dev Tools          (FIKOM — TI)
  📗 Skripsi            (core)
  🏅 Portofolio & CV    (core)

Mahasiswa: Sari — UNIKA UST / FEB / Akuntansi (S1)
Sidebar:
  ...core...
  🧾 Kalkulator Akuntansi   (FEB — Akuntansi)
  📈 Analisis Rasio Keuangan (FEB — Akuntansi)
  💰 Kalkulator Pajak PPh 21 (FEB — Akuntansi)
  🧮 Kalkulator Ilmiah      (umum — FEB)

Mahasiswa: Andi — UNIKA UST / FH / Ilmu Hukum (S1)
Sidebar:
  ...core...
  ⚖️ Referensi Hukum        (FH — Hukum)
  📅 Kalkulator Daluwarsa   (FH — Hukum)
```

---

## 1.2 Data Kampus Default (Proposal)

> ⚠️ **Perlu konfirmasi user**: daftar kampus di bawah adalah proposal awal. Kampus mana saja yang harus tersedia default?

| # | Kampus | Singkatan | Status |
|---|--------|-----------|--------|
| 1 | Universitas Katolik Santo Thomas | UNIKA UST | ✅ Sudah ada (lengkapi fakultas) |
| 2 | Universitas Sumatera Utara | USU | ⬜ Perlu data fakultas/prodi |
| 3 | Universitas Negeri Medan | Unimed | ⬜ Perlu data fakultas/prodi |
| 4 | Universitas Islam Negeri Sumatera Utara | UINSU | ⬜ Perlu data fakultas/prodi |
| 5 | Universitas Muhammadiyah Sumatera Utara | UMSU | ⬜ Perlu data fakultas/prodi |
| 6 | Universitas Prima Indonesia | UNPRI | ⬜ Perlu data fakultas/prodi |
| 7 | **Lainnya (custom)** | — | ✅ Tetap didukung (core features) |

**Aturan:**
- Kampus custom tetap boleh (jika `allow_custom_campus` aktif), tapi **hanya mendapat fitur core** + fitur umum (kalkulator).
- Fakultas/prodi custom tidak dapat tools khusus sampai admin memetakan fiturnya.

### 1.2.1 Data UNIKA UST (sudah ada, perlu finalisasi)

| Fakultas | Prodi |
|----------|-------|
| FIKOM | Teknik Informatika (S1), Sistem Informasi (S1), Sains Data (S1) |
| FEB | Manajemen (S1), Akuntansi (S1), Ekonomi Pembangunan (S1) |
| FT | Teknik Sipil (S1), Teknik Arsitektur (S1), Teknik Lingkungan (S1) |
| FP | Agroteknologi (S1), Teknologi Hasil Pertanian (S1), Agribisnis (S1) |
| FH | Ilmu Hukum (S1) |
| FF | Ilmu Filsafat (S1) |
| FIB | Sastra Inggris (S1), Sastra Indonesia (S1) |
| FKIP | Pendidikan Matematika (S1), Pendidikan Bahasa Inggris (S1), Pendidikan Sains (S1) |

> 📌 Catatan: `Pendidikam Sains` di `server/db.js` saat ini **typo** — perlu diperbaiki menjadi `Pendidikan Sains`.

---

## 1.3 Pemetaan Fitur per Prodi (Draft)

### A. Fitur Core (semua prodi, semua kampus)

| Key | Label | View |
|-----|-------|------|
| `dashboard` | Dashboard | `public/js/views/dashboard.js` |
| `semesters` | Kelola Semester | `semesters.js` |
| `courses` | Mata Kuliah | `courses.js` |
| `notes` | Catatan | `notes.js` |
| `gpa` | IPK & Transkrip | `gpa.js` |
| `student-card` | Kartu Mahasiswa | `student-card.js` |
| `skripsi` | Skripsi | `life.js` |
| `portfolio` | Portofolio & CV | `life.js` |
| `profile` | Pengaturan Akun | `profile.js` |
| `about` | Tentang | `about.js` |

### B. Fitur Umum (boleh untuk semua prodi, opsional per prodi)

| Key | Label | View |
|-----|-------|------|
| `calculator` | Kalkulator Ilmiah | `calculator.js` |

### C. Fitur Khusus per Fakultas/Prodi

| Fakultas / Prodi | Key fitur | Tools yang direncanakan | Status |
|------------------|-----------|--------------------------|--------|
| **FIKOM — Teknik Informatika** | `cs-toolkit`, `discrete-math`, `dev-tools` | CS Math Toolkit, Matematika Diskrit, Dev Tools (SQL, Regex, CIDR, Big-O) | ✅ view sudah ada |
| **FIKOM — Sistem Informasi** | `si-toolkit` | SQL/ERD visualizer, BPMN helper, analisis proses bisnis | ⬜ baru |
| **FIKOM — Sains Data** | `ds-toolkit` | Statistik deskriptif, regresi, visualisasi data, kalkulator ML metrik | ⬜ baru |
| **FEB — Akuntansi** | `acc-toolkit` | Kalkulator rasio keuangan, penyusutan, PPh 21, NPV/IRR, jurnal umum | ⬜ baru |
| **FEB — Manajemen** | `mgmt-toolkit` | Break-even analysis, SWOT template, kalkulator ROA/ROI | ⬜ baru |
| **FEB — Ekonomi Pembangunan** | `econ-toolkit` | Kalkulator inflasi, PDB, elastisitas, indeks Gini | ⬜ baru |
| **FT — Teknik Sipil** | `civil-toolkit` | Konversi satuan, volume beton/besi, kemiringan, RAB sederhana | ⬜ baru |
| **FT — Arsitektur** | `arch-toolkit` | Skala gambar, konversi satuan, estimator material | ⬜ baru |
| **FT — Teknik Lingkungan** | `env-toolkit` | Kalkulator BOD/COD, dosing, emisi | ⬜ baru |
| **FP — Agroteknologi** | `agro-toolkit` | Dosis pupuk, kalender tanam, konversi lahan | ⬜ baru |
| **FP — Agribisnis** | `agribiz-toolkit` | Analisis usahatani (BEP, R/C ratio), kalkulator harga komoditas | ⬜ baru |
| **FP — Teknologi Hasil Pertanian** | `thp-toolkit` | Kalkulator rendemen, kadar air, formulasi | ⬜ baru |
| **FH — Ilmu Hukum** | `law-toolkit` | Referensi pasal (bookmark), kalkulator daluwarsa, timeline kasus | ⬜ baru |
| **FF — Ilmu Filsafat** | `phil-toolkit` | Logika argumen (truth table), timeline filsuf, catatan esai | ⬜ baru |
| **FIB — Sastra Inggris** | `lit-toolkit` | Citation generator (APA/MLA), word counter, thesaurus | ⬜ baru |
| **FIB — Sastra Indonesia** | `lit-id-toolkit` | PUEBI checker, citation, word counter | ⬜ baru |
| **FKIP — Pendidikan Matematika** | `edu-math-toolkit` | Kalkulator pedagogik, generator soal, rubrik penilaian | ⬜ baru |
| **FKIP — Pendidikan Bahasa Inggris** | `edu-eng-toolkit` | RPP/lesson plan builder, rubric generator | ⬜ baru |
| **FKIP — Pendidikan Sains** | `edu-sci-toolkit` | Simulasi konsep sains, rubrik praktikum | ⬜ baru |

> 💡 **Prinsip:** fitur inti tetap sama untuk semua; fitur khusus **hanya muncul** untuk prodi yang dipetakan. Pemetaan bisa diatur **per prodi**, atau per fakultas (berlaku ke semua prodi di fakultas itu), atau global.

---

## 1.4 Arsitektur & Perubahan Teknis

### 1.4.1 Skema Database (baru)

```sql
-- Katalog kampus
CREATE TABLE IF NOT EXISTS campuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  short_name TEXT,
  is_default INTEGER DEFAULT 1,      -- 1 = preset bawaan, 0 = custom
  created_at TEXT DEFAULT (datetime('now'))
);

-- Fakultas milik kampus
CREATE TABLE IF NOT EXISTS faculties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campus_id INTEGER NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(campus_id, name)
);

-- Program studi milik fakultas
CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty_id INTEGER NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT DEFAULT 'S1',
  UNIQUE(faculty_id, name)
);

-- Katalog fitur/modul
CREATE TABLE IF NOT EXISTS features (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT,
  group_name TEXT,                   -- "Akademik", "Toolkit CS", dll
  module_path TEXT,                  -- /js/views/xxx.js
  description TEXT,
  is_core INTEGER DEFAULT 0,         -- 1 = tampil untuk semua prodi
  sort_order INTEGER DEFAULT 0
);

-- Pemetaan fitur ke prodi (many-to-many)
CREATE TABLE IF NOT EXISTS program_features (
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES features(key) ON DELETE CASCADE,
  PRIMARY KEY (program_id, feature_key)
);

-- Pemetaan fitur ke fakultas (opsional, berlaku ke semua prodi di fakultas)
CREATE TABLE IF NOT EXISTS faculty_features (
  faculty_id INTEGER NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES features(key) ON DELETE CASCADE,
  PRIMARY KEY (faculty_id, feature_key)
);
```

**Perubahan tabel `users`:**
- Tambah kolom: `campus_id INTEGER`, `faculty_id INTEGER`, `program_id INTEGER`
- **Pertahankan** kolom lama (`campus_name`, `faculty`, `study_program`) untuk backward-compat & tampilan.
- Migrasi: cocokkan teks lama ke ID hasil seed; jika tidak cocok → `NULL` + fallback core.

### 1.4.2 Seed Preset Kampus

- Buat file baru: `server/data/campusPresets.js` (atau `.json`) berisi struktur:

```js
module.exports = [
  {
    name: 'Universitas Katolik Santo Thomas (UNIKA UST)',
    short_name: 'UNIKA UST',
    faculties: [
      { name: 'Fakultas Ilmu Komputer (FIKOM)', programs: [
        { name: 'Teknik Informatika', level: 'S1', features: ['cs-toolkit','discrete-math','dev-tools'] },
        { name: 'Sistem Informasi', level: 'S1', features: ['si-toolkit'] },
        { name: 'Sains Data', level: 'S1', features: ['ds-toolkit'] }
      ]},
      // ... fakultas lain
    ]
  },
  // ... kampus default lain
];
```

- Seed idempotent saat startup (`INSERT OR IGNORE`), agar aman untuk database lama.
- `UNIKA_UST_PRESET` lama bisa diganti/dibungkus agar `/api/auth/presets` kompatibel.

### 1.4.3 API Baru

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `GET` | `/api/presets` (publik) | Semua kampus default + fakultas + prodi (untuk registrasi) |
| `GET` | `/api/me/features` | Daftar fitur yang boleh diakses user yang login (berdasarkan prodi) |
| `GET` | `/api/admin/campuses` | List kampus + fakultas + prodi |
| `POST` | `/api/admin/campuses` | Tambah kampus |
| `PUT` | `/api/admin/campuses/:id` | Edit kampus |
| `DELETE` | `/api/admin/campuses/:id` | Hapus kampus (cegah jika dipakai user) |
| `POST` | `/api/admin/faculties` | Tambah fakultas |
| `POST` | `/api/admin/programs` | Tambah prodi |
| `GET` | `/api/admin/features` | Katalog fitur |
| `PUT` | `/api/admin/programs/:id/features` | Set fitur yang tersedia untuk prodi |
| `PUT` | `/api/admin/faculties/:id/features` | Set fitur tingkat fakultas |

> Response `/api/me/features` contoh:
> ```json
> {
>   "features": [
>     { "key": "dashboard", "label": "Dashboard", "group": "Akademik", "is_core": true },
>     { "key": "cs-toolkit", "label": "CS Math Toolkit", "group": "Toolkit CS" }
>   ]
> }
> ```

### 1.4.4 Frontend

1. **`public/js/app.js` — route registry**
   - Tambah metadata `featureKey`, `group`, `tags` pada tiap route.
   - Saat boot, ambil `/api/me/features`, simpan di `state.features`.
   - `renderSidebar()` hanya merender route yang: `is_core` **atau** `featureKey` ada di daftar fitur user.
   - Guard di `navigate()`: jika route tidak diizinkan → tampilkan toast & arahkan balik ke dashboard.

2. **Registrasi (`public/js/views/auth.js`)**
   - Ganti `campuses[0]` menjadi dropdown kampus (bisa banyak).
   - Setelah pilih kampus → dropdown fakultas → dropdown prodi.
   - Kirim `campus_id`, `faculty_id`, `program_id` (plus teks lama untuk kompatibilitas).

3. **Profil (`public/js/views/profile.js`)**
   - Kampus, fakultas, dan prodi **hanya ditampilkan (read-only)** — mahasiswa tidak bisa mengubahnya sendiri.
   - Tampilkan keterangan: *"Kampus, fakultas, dan prodi hanya dapat diubah oleh administrator."*
   - Perubahan dilakukan admin lewat dashboard admin; sidebar fitur mahasiswa ikut menyesuaikan pada pemuatan berikutnya.

4. **Group sidebar**
   - Group "Toolkit CS" hanya muncul jika user punya minimal satu fitur di group itu.
   - Group baru per fakultas (mis. "Toolkit Akuntansi") dapat ditambahkan di registry.

### 1.4.5 Dashboard Admin

- Tab baru: **🏫 Kampus & Prodi**.
  - CRUD kampus, fakultas, prodi.
  - UI pemetaan fitur per prodi (checkbox per fitur, dikelompokkan).
  - Indikator jumlah mahasiswa per prodi.
  - Tombol "Terapkan ke seluruh fakultas" (isi fitur fakultas).
  - Mode read-only untuk kampus default (bisa dimatikan/dihidupkan), atau boleh diedit dengan konfirmasi.

### 1.4.6 Kompatibilitas & Migrasi

- User lama tanpa `program_id` → hanya dapat fitur **core + umum**, dengan banner "Lengkapi profil prodi untuk mengakses fitur khusus".
- Kampus custom lama tetap aman; data teks tidak diubah.
- Import/backup: tambahkan tabel baru ke `DATA_TABLES` di `server/routes/admin.js` (urutan: `campuses`, `faculties`, `programs`, `features`, `faculty_features`, `program_features`).
- Seed berjalan juga setelah restore, agar katalog fitur tidak kosong.

---

## 1.5 Breakdown Task

### Phase 1 — Fondasi Data (Database & Seed)
- [x] Buat tabel `campuses`, `faculties`, `programs`, `features`, `program_features`, `faculty_features`
- [x] Tambah kolom `campus_id`, `faculty_id`, `program_id` di `users`
- [x] Buat `server/data/campusPresets.js` (kampus + fakultas + prodi + fitur)
- [x] Lengkapi & finalisasi data UNIKA UST (fix typo `Pendidikam`)
- [x] Seed idempotent saat startup (`server/utils/campusCatalog.js`)
- [x] Migrasi user lama: map teks kampus/fakultas/prodi → ID
- [x] Tambahkan tabel baru ke backup/restore (`DATA_TABLES`)

### Phase 2 — API
- [x] `GET /api/auth/presets` (multi-kampus)
- [x] `GET /api/auth/features` (fitur sesuai prodi)
- [x] Update `POST /api/auth/register` & `PUT /api/auth/profile` menerima ID
- [x] CRUD admin kampus/fakultas/prodi
- [x] Endpoint pemetaan fitur per prodi/fakultas
- [x] Test API (registrasi, fitur user, admin CRUD)

### Phase 3 — Frontend Mahasiswa
- [x] Update wizard registrasi: dropdown kampus → fakultas → prodi dinamis
- [x] Update halaman profil: kampus/fakultas/prodi **read-only** (admin only)
- [x] Route registry dengan metadata `featureKey`
- [x] Sidebar filter berdasarkan fitur user
- [x] Guard navigasi (URL langsung ke tools yang tidak diizinkan)
- [x] Empty state: "Prodi Anda belum punya tools khusus — hubungi admin"

### Phase 4 — Dashboard Admin
- [x] Tab "Kampus & Prodi"
- [x] CRUD kampus/fakultas/prodi
- [x] Nonaktifkan kampus default (hapus hanya untuk kampus custom)
- [x] UI pemetaan fitur per prodi (checkbox)
- [x] Terapkan fitur ke tingkat fakultas
- [x] Form edit pengguna: ganti kampus/fakultas/prodi user via dropdown (admin only)
- [x] Konfirmasi & validasi (tidak bisa hapus jika dipakai user)

### Phase 5 — Modul Tools per Prodi (bertahap)
- [x] Pindahkan tools CS yang ada ke grup "Toolkit CS" dengan mapping FIKOM-TI
- [x] Buat view baru: `acc-toolkit` (Akuntansi & Manajemen)
- [x] Toolkit Manajemen tercakup dalam `acc-toolkit`
- [x] Buat view baru: `civil-toolkit` (Teknik Sipil & Arsitektur)
- [x] Buat view baru: `law-toolkit` (Ilmu Hukum & Hukum Ekonomi Syariah)
- [ ] Buat view baru: `lit-toolkit` (Sastra) & `edu-*-toolkit` (FKIP)
- [x] Daftarkan view baru di route registry + seed fitur

### Phase 6 — QA & Dokumentasi
- [x] Test end-to-end per prodi (sidebar, guard, akses API)
- [x] Test migrasi database lama & restore backup
- [x] Update README (fitur multi-kampus & fitur per prodi)
- [ ] Update PRD bila perlu

---

### Status Implementasi (Feature #1 — selesai)

| Area | Status | Catatan |
|------|--------|---------|
| Database & seed | ✅ | 6 kampus default, 59 fakultas, 137 prodi, 17 fitur |
| API kampus/prodi/fitur | ✅ | CRUD + mapping per prodi & fakultas |
| Registrasi & profil | ✅ | Dropdown dinamis; profil read-only untuk data akademik |
| Sidebar & guard | ✅ | Filter fitur + penolakan URL langsung |
| Dashboard admin | ✅ | Tab **Kampus & Prodi**, modal pemetaan fitur, edit user via dropdown |
| Tools per prodi | ✅ | `acc-toolkit`, `civil-toolkit`, `law-toolkit`, tools CS existing |
| Test | ✅ | 23 test lulus (5 test baru untuk fitur ini) |

**Belum dikerjakan (kandidat fitur berikutnya):**
- `lit-toolkit` (Sastra) dan `edu-*-toolkit` (FKIP) — tinggal menambah view + mapping via admin.
- Tools khusus tingkat lanjut yang membutuhkan data/API eksternal (mis. database pasal lengkap, data harga material real-time).

---

## 1.6 Acceptance Criteria

- [x] Registrasi menampilkan **lebih dari satu kampus default**, dengan fakultas & prodi dinamis per kampus.
- [x] Mahasiswa TI hanya melihat tools TI + core; **tidak ada** tools Akuntansi/Hukum/dll.
- [x] Mahasiswa Akuntansi hanya melihat tools Akuntansi + core.
- [x] Kampus custom / prodi tanpa mapping hanya mendapat **core + kalkulator umum**.
- [x] Mahasiswa **tidak dapat** mengubah kampus/fakultas/prodi sendiri (read-only di profil); perubahan hanya oleh admin.
- [x] Admin dapat mengubah kampus/fakultas/prodi mahasiswa lewat form edit pengguna di dashboard.
- [x] Akses langsung via URL (`#/devtools`) oleh user non-TI → ditolak dengan pesan jelas.
- [x] Admin dapat menambah kampus/fakultas/prodi dan memetakan fitur tanpa mengubah kode.
- [x] User lama tetap bisa login; fitur default aman (core).
- [x] Backup/restore menyertakan seluruh tabel kampus & pemetaan fitur.
- [x] Semua test lama tetap lulus; test baru untuk fitur ini ditambahkan.

---

## 1.7 Risiko & Pertimbangan

| Risiko | Mitigasi |
|--------|----------|
| URL lama (mis. `#/toolkit`) dipakai user lain | Guard menampilkan pesan, bukan error; fitur tetap ada untuk prodi berhak |
| Data fakultas/prodi kampus berbeda-beda & bisa berubah | Admin CRUD + seed dapat diperbarui tanpa migrasi manual |
| User lama tidak punya prodi | Fallback core + prompt lengkapi profil |
| Sidebar terlalu dinamis / cache | Simpan fitur di `state`; refresh saat profil berubah |
| Tools per prodi menambah bundle request | Lazy import per view (sudah pola existing `import(def.module)`) |
| Nama prodi duplikat antar kampus | Unik per fakultas/kampus, bukan global |

---

## 1.8 Keputusan (sudah dikonfirmasi)

| # | Pertanyaan | Keputusan |
|---|------------|-----------|
| 1 | Kampus default selain UNIKA UST | ✅ Pakai daftar proposal §1.2: UNIKA UST, USU, Unimed, UINSU, UMSU, UNPRI + opsi custom |
| 2 | Fitur per prodi atau per fakultas? | ✅ **Dukung keduanya** — fitur bisa dipetakan ke prodi, fakultas (berlaku semua prodi di fakultas itu), atau global |
| 3 | Hapus kampus default? | ✅ Kampus **default tidak dihapus permanen** — hanya bisa **dinonaktifkan**. Kampus **custom** boleh dihapus (jika tidak dipakai user) |
| 4 | Mahasiswa pindah kampus/prodi sendiri? | ✅ **TIDAK — admin only.** Mahasiswa **tidak dapat** mengubah kampus, fakultas, atau prodi sendiri. Perubahan hanya bisa dilakukan administrator lewat dashboard admin |
| 5 | Tools khusus butuh API khusus? | ✅ Mulai dari **modul frontend** dulu; API/data khusus per prodi menyusul bila memang dibutuhkan |
| 6 | Prioritas tools pertama | ✅ Selesaikan arsitektur + migrasi tools CS/FIKOM yang sudah ada, lalu **Akuntansi → Teknik Sipil → Hukum** |

### Dampak keputusan #4 (admin only)

- Di halaman **Profil mahasiswa**: kampus, fakultas, dan prodi **read-only** (hanya tampil, tidak bisa diubah) + keterangan *"Hubungi admin untuk mengubah data kampus/prodi."*
- Kolom kampus/fakultas/prodi di form edit pengguna **dashboard admin** menjadi satu-satunya tempat perubahan (pilih dari dropdown kampus → fakultas → prodi, bukan input teks bebas).
- API `PUT /api/auth/profile` **menolak** perubahan `campus_name`/`faculty`/`study_program`/`campus_id`/`faculty_id`/`program_id` dari mahasiswa (selain admin).
- Admin mengubah prodi mahasiswa → fitur sidebar mahasiswa tersebut ikut berubah pada pemuatan berikutnya.

---

# 📌 Feature #2 — _(placeholder)_

> Diisi setelah #1 selesai.

# 📌 Feature #3 — _(placeholder)_

> Diisi setelah #1 selesai.

---

# ✅ Feature #4 — Presensi, Tugas Upload, E-Learning & SIAK

**Status:** ✅ Selesai

## Tujuan

Menambahkan fitur yang lazim ada di situs e-learning dan SIAK kampus, serta memperbaiki pelacak tugas agar mendukung unggah file.

## 4.1 Presensi

- Tabel `attendance` (unik per mata kuliah + tanggal).
- Status: **hadir, izin, sakit, alfa**; nomor pertemuan dan catatan opsional.
- Halaman **Presensi** (`/js/views/presensi.js`): rekap per mata kuliah, persentase kehadiran, filter per matkul/semester, edit status inline, dan hapus catatan.
- API: `GET/POST /api/academics/attendance`, `PUT/DELETE /api/academics/attendance/:id`.

## 4.2 Tugas & Upload

- Kolom baru pada `tasks`: `attachment_url`, `attachment_name`, `submission_url`, `submission_name`, `submitted_at`.
- Halaman **Tugas & Upload** (`/js/views/tugas.js`): filter jenis/status, statistik, lampiran soal, unggah jawaban, hapus file, dan tandai selesai.
- API: `POST/DELETE /api/academics/tasks/:id/attachment` dan `POST/DELETE /api/academics/tasks/:id/submission`.
- File disimpan di `data/uploads/files/` dengan nama acak dan disajikan melalui `/uploads/files/:filename` (validasi nama, `nosniff`, dipaksa unduh).

## 4.3 E-Learning

- Tabel `materials`, `exams`, `announcements`.
- Halaman **E-Learning** (`/js/views/elearning.js`) dengan tab **Materi Kuliah**, **Jadwal Ujian** (UTS/UAS/Quiz/Remedial), dan **Pengumuman** (bisa disematkan).
- Materi mendukung unggah file (maks 20 MB) dan/atau tautan.

## 4.4 SIAK

- Tabel `krs` (status per semester) dan `calendar_events`.
- Halaman **SIAK** (`/js/views/siak.js`) dengan tab **KRS** (status draft/diajukan/disetujui + total SKS), **Kalender Akademik**, dan **Ringkasan Studi** per semester.
- API: `GET/PUT /api/academics/krs`, `GET/POST/PUT/DELETE /api/academics/calendar`.

## 4.5 Integrasi

- Empat fitur baru ditambahkan ke katalog `features` sebagai `is_general = 1` sehingga tersedia untuk semua prodi, dan muncul di grup sidebar **Kampus**.
- Backup/restore admin menyertakan seluruh tabel baru.
- 6 integration test baru di `test/elearning_siak.test.js` (total 29 test lulus).

---

_Dokumen ini akan diperbarui seiring progres. Terakhir diperbarui: 19 November 2026._
