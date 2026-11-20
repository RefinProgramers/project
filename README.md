# HRIS Karyawan — direktori, akses, dan absensi

Proyek sebelumnya adalah halaman statis yang menyimpan akun dan data di `localStorage`. Implementasi ini menambahkan server Node.js, REST API, session tersimpan di MySQL, audit login, Passkeys/WebAuthn yang diverifikasi server, serta dashboard dan direktori karyawan. Data karyawan lama di browser tidak dihapus; setelah login admin, halaman menawarkan impor batch yang divalidasi dan dijalankan dalam satu transaksi.

## Persyaratan

- Node.js 20 atau lebih baru
- MySQL 8.0+ (database dan user aplikasi harus dibuat terlebih dahulu)
- HTTPS untuk deployment. `http://localhost` dapat dipakai untuk pengembangan WebAuthn.

## Menyiapkan database lokal di Windows

Jika MySQL Server sudah berjalan di komputer ini, buka terminal pada folder proyek dan jalankan:

```text
npm run setup:local
```

Masukkan password root MySQL saat diminta; karakter password tidak ditampilkan. Perintah ini membuat database, akun aplikasi dengan hak akses terbatas, skema tabel, dan `.env` dengan secret acak. Jangan hapus atau bagikan `.env`.

## Database remote atau setup manual

Untuk database yang sudah disediakan hosting, buat database dan user dengan hak akses minimum, lalu salin `.env.example` menjadi `.env`. Isi kredensial, `SESSION_SECRET` acak minimal 32 karakter, serta WebAuthn RP ID/origin yang cocok dengan alamat website.

```sql
CREATE DATABASE hris_karyawan CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'hris_app'@'localhost' IDENTIFIED BY 'gunakan-password-yang-kuat';
GRANT SELECT, INSERT, UPDATE, DELETE ON hris_karyawan.* TO 'hris_app'@'localhost';
CREATE USER 'hris_migrator'@'localhost' IDENTIFIED BY 'password-migrasi-yang-kuat';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON hris_karyawan.* TO 'hris_migrator'@'localhost';
```

Isi `DB_USER`/`DB_PASSWORD` dengan user runtime `hris_app`, serta `DB_MIGRATION_USER`/`DB_MIGRATION_PASSWORD` dengan user migrasi. Untuk MySQL remote, aktifkan `DB_SSL=1` dan berikan CA tepercaya melalui `DB_SSL_CA` bila penyedia database mensyaratkannya. Jalankan:

```text
npm install
npm run db:init
```

## Membuat akun admin dan menjalankan aplikasi

Setelah setup database lokal atau manual selesai, jalankan:

```text
npm run admin:create
npm start
```

Jika sistem sudah pernah disiapkan dan mendapatkan pembaruan skema, hentikan server dengan `Ctrl+C`, jalankan `npm run db:init`, lalu mulai lagi dengan `npm start`. Perintah ini menerapkan tabel baru yang belum ada dan tidak menghapus data.

Perintah pembuatan admin meminta username, email, nama, dan password (password tidak ditampilkan). Akun super admin hanya dapat dibuat bila belum ada. Jangan memakai kredensial contoh atau mengunggah `.env`.

Buka `http://localhost:3000`. Untuk deployment, gunakan reverse proxy HTTPS, atur `NODE_ENV=production`, `TRUST_PROXY=1` hanya bila berada di belakang proxy tepercaya, dan set `WEBAUTHN_ORIGIN`/`WEBAUTHN_RP_ID` ke domain produksi.

Ilustrasi panel login berasal dari `login-bg.png` di root proyek dan disajikan oleh server aplikasi.

## Fitur tahap ini

- Login username/email + password; hash bcrypt, CSRF token, cookie HttpOnly/SameSite, batas percobaan login, remember me dengan masa berlaku maksimum, idle timeout, dan logout.
- Form login responsif dengan pilihan label email/username/NIP, bantuan tampilkan password, tema, dan panel ilustrasi login.
- Pendaftaran/login passkey yang diverifikasi server (autentikator platform dapat meminta sidik jari, Face ID, PIN, atau metode perangkat lain yang tersedia).
- Role dasar `super_admin`, `admin`, `hr`, dan `employee`; dashboard/direktori dibatasi ke peran admin/HR. Payroll dan portal karyawan belum dibuat.
- CRUD direktori dengan detail personal/kontak, filter, validasi server, query parameter, serta audit log.
- Absensi harian admin/HR: pencatatan check-in/check-out memakai waktu server, total durasi kerja, status manual (termasuk terlambat, tidak hadir, cuti, sakit, dan izin), catatan, pencarian, serta rekap harian.
- Dashboard ringkasan total/aktif/nonaktif karyawan dan jumlah departemen; tema terang/gelap.

Absensi tahap ini dikelola admin/HR untuk karyawan aktif. Timestamp berasal dari server dan setiap perubahan diaudit. Status terlambat maupun status ketidakhadiran ditetapkan manual karena jam kerja/shift belum dikonfigurasi. Tindakan admin tidak membuktikan karyawan hadir secara fisik; passkey juga bukan validasi lokasi. Setelah pembaruan dipasang, tabel absensi baru dibuat saat migrasi skema dijalankan.

## Belum termasuk

Tahap ini belum mengimplementasikan portal check-in mandiri karyawan, konfigurasi shift/jam kerja, pengajuan dan persetujuan cuti, penggajian, foto profil, ekspor/impor Excel dan PDF, reset password melalui email, notifikasi, grafik HR, struktur organisasi, maupun CRUD departemen terpisah. Tidak ada endpoint pura-pura untuk fitur tersebut. Sebelum penggunaan perusahaan, siapkan MySQL dan HTTPS, gunakan impor terkontrol yang tersedia untuk data lama, atur backup/retensi, dan jalankan tinjauan keamanan serta pengujian integrasi di lingkungan target.

## Pengujian

`npm test` menjalankan pengujian validasi direktori dan pemetaan data lama tanpa koneksi database. Pengujian integrasi login/Passkey/API memerlukan database MySQL yang sudah disiapkan dan konfigurasi `.env` lokal.
