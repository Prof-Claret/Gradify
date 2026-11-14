# Gradify

**Simplify Your Academic Journey**

Gradify adalah aplikasi akademik all-in-one untuk mahasiswa yang menggabungkan pengelolaan semester, mata kuliah, tugas, catatan perkuliahan, kalkulator IPK/IPS, dan bantuan akademik lainnya dalam satu platform. Gradify memiliki preset kampus Universitas Katolik Santo Thomas (UNIKA UST) Medan serta dukungan profil kampus custom.

> Versi saat ini: **v1.0.0**  
> Lisensi: **MIT**

## Fitur Utama

### Akademik

- Registrasi dan login dengan profil mahasiswa.
- Enam kampus default (UNIKA UST, USU, Unimed, UINSU, UMSU, UNPRI) dengan fakultas dan prodi dinamis.
- Dukungan kampus, fakultas, dan prodi custom; data akademik mahasiswa hanya dapat diubah admin.
- Pengelolaan semester aktif, tahun akademik, dan arsip semester.
- CRUD mata kuliah beserta kode, SKS, jadwal, ruangan, dosen, dan nilai.
- Pelacak tugas dengan jenis, prioritas, tenggat waktu, dan status.
- Transkrip akademik, perhitungan IPS, IPK, serta simulasi target IPK.
- Kartu mahasiswa (KTM) digital ukuran CR80 dengan barcode Code 39, kode verifikasi, mode cetak dua sisi, dan ekspor PNG 300 DPI.
- Kalkulator batas maksimal SKS berdasarkan IPS.

### Catatan dan Kehidupan Mahasiswa

- Catatan Markdown per mata kuliah.
- Label bahasa pemrograman dan blok kode untuk catatan CS.
- Dasbor agenda dan tugas mendatang.
- Pencatatan pemasukan dan pengeluaran mahasiswa.
- Pelacak milestone skripsi/final project.
- Penyimpanan item portfolio atau pencapaian mahasiswa.

### Toolkit per Prodi

Fitur khusus muncul di sidebar sesuai program studi mahasiswa. Mahasiswa tidak dapat membuka tools prodi lain lewat URL langsung.

- **Toolkit CS** — CS Math Toolkit, Matematika Diskrit, dan Dev Tools (Teknik Informatika, Ilmu Komputer, Sistem Informasi, Teknologi Informasi).
- **Toolkit Keuangan & Akuntansi** — rasio keuangan, penyusutan, NPV/IRR, BEP, HPP, dan estimasi PPh 21 (Akuntansi, Manajemen, Ekonomi, Perbankan Syariah).
- **Toolkit Teknik Sipil** — konversi satuan, volume & material beton, berat besi, kemiringan, RAB, dan referensi mutu beton (Teknik Sipil, Arsitektur).
- **Toolkit Hukum** — kalkulator daluwarsa, tenggat proses, timeline kasus, checklist berkas, dan referensi pasal (Ilmu Hukum, Hukum Ekonomi Syariah).
- **Fitur core & umum** — dashboard, semester, mata kuliah, catatan, IPK, KTM, skripsi, portofolio, profil, dan kalkulator ilmiah selalu tersedia.

### Dashboard Admin

- Halaman admin terpisah di `/admin` dengan autentikasi khusus administrator.
- Setup administrator pertama melalui halaman awal dashboard.
- Manajemen pengguna: pencarian, edit profil, ubah role admin, reset password, dan hapus akun.
- Statistik website, pengguna aktif, aktivitas terbaru, dan informasi sistem.
- Pengaturan situs: nama, tagline, email dukungan, pengumuman global, registrasi, kampus custom, dan target IPK default.
- Mode pemeliharaan dengan pesan khusus; dashboard admin tetap dapat diakses.
- Backup database ke JSON atau SQLite, restore dari file `.json`, `.db`, atau `.sqlite`, serta backup otomatis sebelum import.
- Optimasi database dengan `VACUUM` dan pengelolaan backup otomatis.

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

## Dashboard Admin

Buka `http://localhost:3000/admin`. Saat belum ada administrator, dashboard akan menampilkan form **Setup Administrator Pertama**. Buat akun admin dengan password minimal 8 karakter, lalu gunakan akun tersebut untuk login.

> [!IMPORTANT]
> Form setup admin hanya terbuka ketika belum ada akun administrator. Setelah admin pertama dibuat, form tersebut terkunci. Segera lakukan setup setelah deployment pertama.

Fitur utama dashboard:

- **Dashboard** — ringkasan pengguna, mata kuliah, tugas, ukuran database, statistik tabel, dan informasi sistem.
- **Pengguna** — cari dan edit profil mahasiswa (termasuk kampus/fakultas/prodi via dropdown), jadikan administrator, reset password, atau hapus akun beserta datanya.
- **Kampus & Prodi** — CRUD kampus, fakultas, dan prodi; aktif/nonaktifkan kampus; petakan fitur per prodi maupun per fakultas.
- **Backup & Restore** — ekspor database ke JSON/SQLite, import backup, unduh backup otomatis, dan jalankan `VACUUM`.
- **Pengaturan** — identitas situs, email dukungan, pengumuman global, registrasi, kampus custom, target IPK default, serta mode pemeliharaan.

Catatan keamanan backup:

- File backup berisi akun dan hash password. Simpan di tempat aman dan jangan dibagikan.
- Backup database tidak menyertakan file avatar di `data/uploads`. Salin folder tersebut secara terpisah jika ingin memindahkan seluruh aset.
- Import akan mengganti seluruh data, membuat backup otomatis di `data/backups/`, dan menghentikan semua sesi login.

## API Utama

| Kelompok | Path | Keterangan |
| --- | --- | --- |
| Kesehatan | `GET /api/health` | Status aplikasi dan versi |
| Konfigurasi | `GET /api/config` | Branding, registrasi, pengumuman, dan mode pemeliharaan publik |
| Autentikasi | `/api/auth/*` | Registrasi, login, profil, logout, preset kampus, dan fitur per prodi (`/api/auth/features`) |
| Akademik | `/api/academics/*` | Semester, mata kuliah, tugas, transkrip, dan data kartu mahasiswa |
| Catatan | `/api/notes/*` | Daftar, pembuatan, pembaruan, dan penghapusan catatan |
| Kehidupan | `/api/life/*` | Anggaran, skripsi, dan portfolio |
| Admin | `/api/admin/*` | Setup/login admin, statistik, pengguna, kampus/fakultas/prodi, pemetaan fitur, pengaturan, dan backup/restore |

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
│   ├── admin/
│   │   ├── index.html
│   │   ├── admin.css
│   │   └── admin.js
│   └── js/
│       ├── app.js
│       ├── api.js
│       └── views/
├── server/
│   ├── index.js
│   ├── db.js
│   ├── routes/
│   │   └── admin.js
│   └── utils/
│       └── settings.js
├── test/
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

## Kampus, Fakultas & Prodi

Registrasi menyediakan enam kampus default:

- Universitas Katolik Santo Thomas (UNIKA UST)
- Universitas Sumatera Utara (USU)
- Universitas Negeri Medan (Unimed)
- Universitas Islam Negeri Sumatera Utara (UINSU)
- Universitas Muhammadiyah Sumatera Utara (UMSU)
- Universitas Prima Indonesia (UNPRI)

Setiap kampus memiliki fakultas dan program studi sendiri. Admin dapat menambah, mengubah, menonaktifkan, atau menghapus data kampus/fakultas/prodi melalui tab **Kampus & Prodi**, lalu memetakan fitur khusus ke prodi atau fakultas tanpa mengubah kode.

Kampus custom tetap dapat didaftarkan saat registrasi (jika diizinkan admin). Setelah akun dibuat, perubahan kampus/fakultas/prodi hanya dapat dilakukan administrator.

### Seed & migrasi

- Data preset di-seed otomatis dan idempotent saat server pertama kali berjalan.
- Pemetaan fitur tidak ditimpa saat restart setelah admin mengubahnya.
- User lama dimigrasikan dari kolom teks `campus_name`/`faculty`/`study_program` ke ID kampus/fakultas/prodi.
- Backup JSON/SQLite menyertakan tabel kampus, fakultas, prodi, fitur, dan pemetaan fitur.

## Roadmap

PRD membagi pengembangan menjadi beberapa fase:

- **Phase 0:** registrasi, wizard onboarding, profil identitas, dan keamanan akun.
- **Phase 1:** semester, mata kuliah, dashboard tugas, dan catatan perkuliahan CS.
- **Phase 2:** kalkulator ilmiah, toolkit matematika dan matematika diskrit, serta tools SQL, regex, CIDR, dan Big-O.
- **Phase 3-4:** target GPA lanjutan, milestone skripsi, dan builder portfolio/CV.
- **Phase 5 (selesai):** multi-kampus, fakultas/prodi per kampus, fitur per prodi, serta toolkit Akuntansi, Teknik Sipil, dan Hukum.

Beberapa fitur roadmap, termasuk OAuth Google/Apple, dapat memerlukan integrasi pihak ketiga atau implementasi lanjutan dan belum menjadi bagian wajib dari aplikasi lokal saat ini.

## Pengembangan

Jalankan server development:

```bash
npm run dev
```

Endpoint API yang memerlukan autentikasi menggunakan token sesi yang dikembalikan saat login atau registrasi. Header HTTP yang digunakan oleh klien harus sesuai dengan implementasi route pada folder `server/routes`.

## Panduan Deployment (Meng-online-kan Aplikasi)

> [!IMPORTANT]
> **Catatan Penting Sebelum Deploy:**
> 1. **Node.js 22+ Wajib**: Server wajib menggunakan Node.js versi 22 atau lebih baru karena Gradify menggunakan modul bawaan `node:sqlite`.
> 2. **Penyimpanan Lokal (Stateful)**: Database (`data/gradify.db`) dan berkas unggahan avatar (`data/uploads/avatars/`) tersimpan pada disk lokal. Gunakan platform dengan *Persistent Storage/Volume* atau VPS agar data tidak hilang saat server melakukan restart atau redeploy. Platform serverless murni (seperti Vercel atau Netlify standar) tidak disarankan.

---

### Opsi 1: Demo / Presentasi Cepat dari Laptop (Gratis & Instan)

Gunakan metode ini jika Anda ingin mendemokan aplikasi ke dosen, penguji, atau rekan mahasiswa langsung dari laptop tanpa perlu sewa server:

1. Jalankan server lokal:
   ```bash
   npm start
   ```
2. Di terminal baru, jalankan **Cloudflare Tunnel** (tanpa batasan waktu, gratis, dan otomatis HTTPS):
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
3. Terminal akan menampilkan URL publik acak (misal: `https://xxxx.trycloudflare.com`) yang bisa langsung dibuka dari internet pada perangkat mana pun.

---

### Opsi 2: Deploy Cloud PaaS (Railway / Render)

Cocok untuk aplikasi yang ingin online 24 jam tanpa repot mengelola sistem operasi server.

#### Langkah Deploy di Railway:
1. Masuk ke [Railway.app](https://railway.app/) menggunakan akun GitHub.
2. Klik **New Project** $\rightarrow$ **Deploy from GitHub repo** $\rightarrow$ pilih repositori `Gradify`.
3. Buka tab **Settings** $\rightarrow$ **Variables**, lalu tambahkan:
   - `PORT`: `3000`
   - `NODE_VERSION`: `22`
4. **PENTING: Pasang Persistent Volume** agar database SQLite tidak hilang saat redeploy:
   - Tambahkan **Volume** pada service Gradify.
   - Set **Mount Path** ke: `/app/data`
5. Pada menu **Networking**, klik **Generate Domain** untuk mendapatkan URL publik gratis.

---

### Opsi 3: Deploy di VPS Ubuntu (Paling Stabil & Standar Industri)

Pilihan terbaik untuk deployment jangka panjang di VPS mandiri (DigitalOcean, AWS EC2, IDCloudHost, Niagahoster, Biznet Gio, dll).

#### 1. Persiapan Server & Node.js 22 LTS
Masuk ke VPS via SSH lalu instal Node.js 22, Git, Nginx, dan PM2:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git build-essential nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

#### 2. Clone Repository & Install Dependensi
```bash
cd /var/www
git clone https://github.com/Prof-Claret/Gradify.git
cd Gradify
npm install --omit=dev
```

#### 3. Jalankan Aplikasi dengan PM2 (Background Process)
```bash
pm2 start server/index.js --name "gradify"
pm2 save
pm2 startup
```

#### 4. Konfigurasi Nginx Reverse Proxy
Buat file konfigurasi Nginx:
```bash
sudo nano /etc/nginx/sites-available/gradify
```
Tambahkan konfigurasi berikut (sesuaikan nama domain/IP Anda):
```nginx
server {
    listen 80;
    server_name domainanda.com www.domainanda.com;

    client_max_body_size 5M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Aktifkan konfigurasi Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/gradify /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Pasang Sertifikat SSL / HTTPS Gratis (Let's Encrypt)
```bash
sudo certbot --nginx -d domainanda.com -d www.domainanda.com
```

---

## Tentang Developer & Status Proyek

- **Creator / Lead Developer:** XII DEV / SCARLET DEV
- **GitHub:** [@Prof-Claret](https://github.com/Prof-Claret)
- **Status Proyek:** Proyek Pribadi / Mandiri (Bukan atas nama kampus / institusi)
- **Email:** `claretianovfx@gmail.com`

## Lisensi

Gradify didistribusikan di bawah lisensi MIT seperti yang tercantum pada `package.json`.

## Hak Cipta

© 2026 Gradify by XII DEV / SCARLET DEV (@Prof-Claret). Proyek independen untuk keunggulan akademik & Computer Science.