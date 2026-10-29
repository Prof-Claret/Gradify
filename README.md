# Gradify

**Simplify Your Academic Journey**

Gradify adalah aplikasi akademik all-in-one untuk mahasiswa yang menggabungkan pengelolaan semester, mata kuliah, tugas, catatan perkuliahan, kalkulator IPK/IPS, dan bantuan akademik lainnya dalam satu platform. Gradify memiliki preset kampus Universitas Katolik Santo Thomas (UNIKA UST) Medan serta dukungan profil kampus custom.

> Versi saat ini: **v1.0.0 Beta**  
> Lisensi: **MIT**

## Fitur Utama

### Akademik

- Registrasi dan login dengan profil mahasiswa.
- Preset UNIKA UST untuk fakultas dan program studi.
- Dukungan kampus, fakultas, dan prodi custom.
- Pengelolaan semester aktif, tahun akademik, dan arsip semester.
- CRUD mata kuliah beserta kode, SKS, jadwal, ruangan, dosen, dan nilai.
- Pelacak tugas dengan jenis, prioritas, tenggat waktu, dan status.
- Transkrip akademik, perhitungan IPS, IPK, serta simulasi target IPK.
- Kalkulator batas maksimal SKS berdasarkan IPS.

### Catatan dan Kehidupan Mahasiswa

- Catatan Markdown per mata kuliah.
- Label bahasa pemrograman dan blok kode untuk catatan CS.
- Dasbor agenda dan tugas mendatang.
- Pencatatan pemasukan dan pengeluaran mahasiswa.
- Pelacak milestone skripsi/final project.
- Penyimpanan item portfolio atau pencapaian mahasiswa.

## Teknologi

- HTML5 dan CSS modern
- JavaScript ES Modules tanpa framework frontend
- Tailwind CSS melalui CDN
- Express.js
- Node.js Built-in SQLite (`node:sqlite`)
- REST API berbasis Express
- MathJax untuk notasi matematika

## Persyaratan

- Node.js **22 atau lebih baru** karena aplikasi menggunakan modul bawaan `node:sqlite`.
- npm yang tersedia bersama Node.js.

## Instalasi dan Menjalankan

```bash
git clone <url-repository-gradify>
cd Gradify
npm install
npm start
```

Aplikasi tersedia di:

```text
http://localhost:3000
```

Untuk development dengan pemuatan ulang server otomatis:

```bash
npm run dev
```

Database SQLite dibuat otomatis di:

```text
data/gradify.db
```

## Penggunaan Dasar

1. Buka aplikasi melalui `http://localhost:3000`.
2. Daftar akun baru melalui wizard registrasi.
3. Pilih UNIKA UST atau masukkan kampus custom secara manual.
4. Lengkapi NPM/NIM, semester aktif, target IPK, dan tahun kelulusan.
5. Kelola semester dan mata kuliah dari menu akademik.
6. Tambahkan tugas, nilai, catatan, transaksi, milestone skripsi, dan portfolio dari menu terkait.

## API Utama

| Kelompok | Path | Keterangan |
| --- | --- | --- |
| Kesehatan | `GET /api/health` | Status aplikasi dan versi |
| Autentikasi | `/api/auth/*` | Registrasi, login, profil, logout, dan preset kampus |
| Akademik | `/api/academics/*` | Semester, mata kuliah, tugas, dan transkrip |
| Catatan | `/api/notes/*` | Daftar, pembuatan, pembaruan, dan penghapusan catatan |
| Kehidupan | `/api/life/*` | Anggaran, skripsi, dan portfolio |

Contoh pemeriksaan kesehatan aplikasi:

```bash
curl http://localhost:3000/api/health
```

## Struktur Proyek

```text
Gradify/
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       └── views/
├── server/
│   ├── index.js
│   ├── db.js
│   └── routes/
├── data/
├── PRD.md
└── package.json
```

## Skala Nilai dan Kalkulasi

Gradify mendukung skala nilai UNIKA UST dalam rentang 0,00 hingga 4,00:

| Nilai | Bobot |
| --- | ---: |
| A | 4.00 |
| A- | 3.75 |
| B+ | 3.50 |
| B | 3.00 |
| B- | 2.75 |
| C+ | 2.50 |
| C | 2.00 |
| C- | 1.75 |
| D | 1.00 |
| E | 0.00 |

Batas maksimal SKS dihitung berdasarkan IPS aktif:

| IPS | Maksimal SKS |
| --- | ---: |
| >= 3.00 | 24 |
| 2.50 - 2.99 | 21 |
| 2.00 - 2.49 | 18 |
| < 2.00 | 15 |

## Preset Kampus UNIKA UST

Registrasi menyediakan preset untuk kedelapan fakultas yang tercantum dalam PRD. Fakultas Ilmu Komputer mencakup:

- Teknik Informatika (S1)
- Sistem Informasi (S1)
- Sains Data (S1)

Akun di kampus selain UNIKA UST dapat menggunakan input nama kampus, fakultas, dan program studi secara manual.

## Roadmap

PRD membagi pengembangan menjadi beberapa fase:

- **Phase 0:** registrasi, wizard onboarding, profil identitas, dan keamanan akun.
- **Phase 1:** semester, mata kuliah, dashboard tugas, dan catatan perkuliahan CS.
- **Phase 2:** kalkulator ilmiah, toolkit matematika dan matematika diskrit, serta tools SQL, regex, CIDR, dan Big-O.
- **Phase 3-4:** target GPA lanjutan, milestone skripsi, budget mahasiswa, dan builder portfolio/CV.

Beberapa fitur roadmap, termasuk OAuth Google/Apple, dapat memerlukan integrasi pihak ketiga atau implementasi lanjutan dan belum menjadi bagian wajib dari aplikasi lokal saat ini.

## Pengembangan

Jalankan server development:

```bash
npm run dev
```

Endpoint API yang memerlukan autentikasi menggunakan token sesi yang dikembalikan saat login atau registrasi. Header HTTP yang digunakan oleh klien harus sesuai dengan implementasi route pada folder `server/routes`.

## Tentang Developer

- **Lead Developer:** Student Developer Team
- **Program Studi:** Teknik Informatika, Fakultas Ilmu Komputer
- **Institusi:** Universitas Katolik Santo Thomas (UNIKA UST), Medan
- **Email:** `claretianovfx@gmail.com`

## Lisensi

Gradify didistribusikan di bawah lisensi MIT seperti yang tercantum pada `package.json`.

## Hak Cipta

© 2026 Gradify. All rights reserved. Built for Academic & Educational Excellence.