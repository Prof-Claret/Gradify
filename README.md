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