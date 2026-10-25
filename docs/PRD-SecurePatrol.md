# PRD — Sistem Absensi & Patroli Sekuriti (SecurePatrol)

## 1. Ringkasan
- **Nama project:** SecurePatrol (Bisa disesuaikan nanti)
- **Deskripsi singkat:** Aplikasi berbasis web (*mobile-first* / PWA) untuk mencatat absensi kehadiran dan *checklist* patroli staf *security* gedung menggunakan pemindaian *barcode*/QR code, divalidasi dengan GPS dan foto *timestamp*.
- **Masalah yang diselesaikan:** Mencegah kecurangan absensi, memastikan staf *security* benar-benar melakukan patroli fisik ke titik yang ditentukan, dan mendigitalkan pelaporan agar mudah dipantau.

## 2. Target Pengguna & Role
Pengguna adalah tim keamanan dan manajemen gedung.
- **Role:**
  1. **SUPER_ADMIN (Karyawan Gedung):** Punya akses penuh, kelola data master (User & Titik Checkpoint), dan lihat semua laporan.
  2. **CHIEF_SECURITY:** Bisa melihat seluruh laporan dan analitik performa patroli seluruh regu.
  3. **DANRU (Komandan Regu):** Memantau status absensi dan *real-time* progress patroli dari staf di bawah regunya.
  4. **SECURITY (Staf):** Akses *mobile web* untuk melakukan absen (in/out) dan *scan barcode* saat patroli keliling gedung.

## 3. Tujuan & Ukuran Keberhasilan
- Kehadiran dan aktivitas patroli terekam 100% secara digital.
- Lokasi patroli terverifikasi akurat melalui perpaduan *scan barcode*, koordinat GPS, dan bukti foto.

## 4. Fitur MVP
| No | Fitur | Deskripsi | Role |
|----|-------|-----------|------|
| 1 | Autentikasi | Login menggunakan Email/Username & Password. | Semua |
| 2 | Absensi Harian | *Check-in* dan *Check-out* dengan mengambil foto *selfie* & tag lokasi (GPS). | SECURITY |
| 3 | Patroli (Checkpoints) | Fitur *scanner* kamera web untuk *scan barcode* di dinding, mengambil foto kondisi sekitar (*timestamped*), dan merekam titik GPS. | SECURITY |
| 4 | Dashboard Pemantauan | Halaman ringkasan status siapa yang sedang bertugas dan titik mana saja yang sudah/belum dipatroli hari ini. | DANRU, CHIEF, SUPER_ADMIN |
| 5 | Master Data User | CRUD data *security*, Danru, dan Chief. | SUPER_ADMIN |
| 6 | Master Titik Patroli | CRUD data titik lokasi (Generate Barcode/QR Code untuk dicetak dan ditempel di gedung). | SUPER_ADMIN |

## 5. Fitur Nanti (di luar MVP)
- Manajemen *shift* kerja kompleks.
- Tombol *panic button* darurat.
- Pelaporan insiden/kejadian (kerusakan barang, tamu tak dikenal, dll) di luar jadwal patroli rutin.

## 6. Alur Pengguna
1. **Staf Security:** Login lewat HP -> klik "Absen Masuk" -> Kamera terbuka untuk *selfie* -> Sistem catat jam dan lokasi.
2. **Saat Patroli:** Staf keliling gedung -> sampai di titik A, klik "Scan Titik" -> arahkan kamera ke *barcode* -> *scan* berhasil -> ambil foto area sekitar -> Sistem verifikasi jika lokasi HP sesuai dengan lokasi *barcode* -> Simpan.
3. **Danru / Chief:** Buka dashboard dari PC/Tablet -> lihat indikator hijau untuk titik yang sudah divisit, merah untuk yang terlewat.

## 7. Daftar Halaman
| Halaman | Isi | Akses |
|---------|-----|-------|
| `/login` | Form login | Semua |
| `/dashboard` | Ringkasan absensi & progres patroli hari ini | DANRU, CHIEF, SUPER_ADMIN |
| `/absensi` | Tombol In/Out, *preview* kamera, peta kecil lokasi | SECURITY |
| `/patroli` | *Scanner barcode*, *preview* foto bukti, *list* rute | SECURITY |
| `/master/users` | Tabel kelola *user* gedung & regu | SUPER_ADMIN |
| `/master/checkpoints` | Tabel kelola titik *barcode* & cetak QR | SUPER_ADMIN |

## 8. Data yang Disimpan
| Tabel | Kolom penting | Keterangan |
|-------|---------------|------------|
| `User` | id, nama, email, password, role, regu, aktif | |
| `Checkpoint` | id, nama_titik, kode_barcode, lat, long, aktif | Titik validasi GPS |
| `Absensi` | id, userId, waktu_masuk, waktu_keluar, foto_masuk, foto_keluar, lat_masuk, long_masuk, lat_keluar, long_keluar | |
| `PatroliLog` | id, userId, checkpointId, waktu, foto, lat, long, status_valid | `status_valid` untuk cek jika GPS melenceng |
| `AuditLog` | id, userId, aksi, tabel, dataLama, dataBaru, waktu | Sesuai standar wajib |

## 9. Tech Stack
Next.js (App Router), PWA setup, TypeScript, Tailwind CSS (*light glassmorphism*), Prisma, PostgreSQL (Neon), GitHub, Vercel.

## 10. Milestone
- **Blok 1:** Setup project, PWA config, koneksi *database* (Prisma Schema).
- **Blok 2:** Autentikasi & manajemen role.
- **Blok 3:** Master Data (Users & Checkpoints).
- **Blok 4:** Fitur Absensi Kehadiran (Integrasi Camera & Geolocation API).
- **Blok 5:** Fitur Patroli (Integrasi Barcode Scanner, Camera & Geolocation).
- **Blok 6:** Dashboard & Laporan Pemantauan.
- **Blok 7:** Deploy (Vercel).

## 11. Batasan & Catatan
- Akses kamera dan lokasi (**HTTPS wajib**).
- Gambar akan disimpan menggunakan solusi *cloud storage* pihak ketiga (misal: Cloudinary/Supabase Storage) atau *base64* jika sementara, karena Vercel tidak bisa simpan file lokal. Nanti akan kita atur di Blok 4.
