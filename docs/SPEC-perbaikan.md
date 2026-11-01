# SecurePatrol — Spec Fix, Redesign & Fitur Baru

Oct 27, 2026 · @evelotion

## Cara pakai dokumen ini

Kerjakan fase berurutan: Fase 1 (bug & keamanan) wajib selesai dulu sebelum redesign dan fitur baru. Satu fase = satu branch/PR, dan setiap item punya kriteria terima yang harus lolos.

Repo: `evelotion/securepatrol-app` (Next.js 16 App Router, React 19, Prisma 7 + PostgreSQL Neon, Tailwind v4, shadcn/ui). Baca `CLAUDE.md` dan `docs/PRD-SecurePatrol.md` sebelum mulai.

Aturan yang tetap berlaku di semua fase:

- Soft delete saja (kolom `aktif`), tidak ada hapus permanen.
- Setiap mutasi data memanggil `writeAudit()` dari `lib/audit.ts`.
- Cek role di server lewat `requireRole()` di setiap Server Action dan fungsi data, bukan hanya di proxy.
- `Decimal` diubah ke string sebelum dikirim ke client component.
- TypeScript strict, tanpa `any`. Rahasia hanya di `.env`.
- Semua jam dan batas "hari" dihitung dalam zona `Asia/Jakarta`, bukan zona server.
- Perubahan skema lewat `prisma migrate dev` dengan nama migrasi yang jelas, plus update `prisma/seed.mjs` bila perlu.

Definisi selesai per PR: `npm run typecheck` dan `npm run lint` bersih, `npm run build` sukses, unit test baru lulus, dan alur manual di bagian Testing sudah dicoba di HP (HTTPS).

## Fase 1 — Perbaikan bug & keamanan

Sembilan item, F1-1 sampai F1-3 paling kritis. Semua dikerjakan di satu PR `fix/fase-1`.

| ID | Prioritas | File | Masalah | Solusi |
| --- | --- | --- | --- | --- |
| F1-1 | Kritis | `lib/bukti.ts`, `app/actions/absensi.ts`, `lib/data.ts` | `startOfHari()` pakai jam server (UTC di Vercel), jadi "hari ini" ganti jam 07:00 WIB. Check-out shift malam setelah tengah malam gagal. | Buat `lib/waktu.ts` dengan `startOfHariWIB()` berbasis `Asia/Jakarta`. Check-out mencari absensi terbuka (`waktuKeluar: null`) milik user dalam 16 jam terakhir, bukan "hari ini". |
| F1-2 | Kritis | `public/sw.js`, `app/actions/auth.ts` | `PAGE_CACHE` menyimpan halaman login-only (dashboard, absensi + selfie base64) dan tidak dihapus saat logout. | Hapus cache navigasi; hanya `/offline` + aset `/_next/static`. Naikkan versi cache ke `v2` agar cache lama terhapus di `activate`. Saat logout, client kirim `postMessage({type:"CLEAR"})` ke SW untuk `caches.delete` semua. |
| F1-3 | Kritis | `app/actions/auth.ts` | Login tanpa rate limit. User tidak ditemukan tidak menjalankan scrypt, jadi beda waktu respons bocorkan email terdaftar. | Tabel `LoginAttempt` (identifier, ip, waktu, sukses). Tolak setelah 5 gagal dalam 15 menit per identifier atau 20 per IP. Saat user tidak ada, tetap jalankan `verifyPassword` terhadap hash dummy. Catat `LOGIN_GAGAL` ke AuditLog. |
| F1-4 | Tinggi | `app/actions/absensi.ts`, `schema.prisma` | Double tap bisa membuat 2 baris absensi terbuka. | Partial unique index via SQL migrasi manual: `CREATE UNIQUE INDEX absensi_satu_terbuka ON "Absensi"(user_id) WHERE waktu_keluar IS NULL;`. Tangkap error P2002 jadi pesan "Sudah absen masuk". Tombol submit disabled saat pending. |
| F1-5 | Tinggi | `app/actions/checkpoints.ts` | `updateCheckpoint` menerima kode barcode kosong dan menyimpannya sebagai string kosong. | Saat update, `kodeBarcode` wajib diisi dan lolos regex. |
| F1-6 | Sedang | `app/actions/users.ts` | Super admin bisa menurunkan role dirinya sendiri, atau menonaktifkan super admin terakhir. | Tolak bila `id === actor.id` dan role berubah. Tolak bila perubahan membuat jumlah SUPER\_ADMIN aktif = 0. |
| F1-7 | Sedang | `app/actions/users.ts`, `lib/session.ts` | Ganti password atau nonaktifkan user tidak menghapus sesi lama. | Tambah `destroyAllSessions(userId)`; panggil saat password diganti atau user dinonaktifkan. |
| F1-8 | Sedang | `prisma/seed.mjs` | Password default `Admin123!` dipakai bila env kosong. | Seed gagal dengan pesan jelas bila `SEED_ADMIN_PASSWORD` tidak di-set atau kurang dari 12 karakter. |
| F1-9 | Rendah | `lib/auth.ts`, `lib/data.ts` | Sesi kedaluwarsa tidak pernah dihapus. Query absensi ikut mengambil kolom foto tanpa perlu. | Hapus sesi expired milik user saat login. Pakai `select` tanpa kolom foto di `absensiHariIni`. |

Kriteria terima Fase 1:

- [ ] Check-in 22:00 WIB lalu check-out 06:00 WIB besoknya berhasil, dan tercatat sebagai satu baris.
- [ ] Setelah logout, mode pesawat, buka /dashboard: yang muncul halaman offline, bukan data user sebelumnya.
- [ ] Login gagal ke-6 dalam 15 menit ditolak dengan pesan "Terlalu banyak percobaan, coba lagi dalam X menit".
- [ ] Dua request check-in paralel hanya menghasilkan satu baris.
- [ ] Super admin terakhir tidak bisa diturunkan atau dinonaktifkan.
- [ ] Setelah password diganti, sesi di perangkat lain langsung ter-logout.

## Fase 2 — Anti-kecurangan patroli

GPS dan foto saat ini dipercaya mentah dari client, dan checkpoint tanpa koordinat selalu dianggap valid. Fase ini mengganti `statusValid` (boolean) dengan status bertingkat plus alasan, supaya Danru bisa lihat kenapa sebuah scan dicurigai.

Perubahan skema `PatroliLog`:

- Ganti `statusValid Boolean` jadi `status StatusScan` dengan enum `VALID`, `TIDAK_VALID`, `BELUM_TERVERIFIKASI`. Migrasi data lama: `true` → `VALID`, `false` → `TIDAK_VALID`.
- Tambah kolom `akurasiM Int?`, `jarakM Int?`, `alasan String?` (mis. "di luar radius", "akurasi GPS buruk", "terlalu cepat").

Aturan validasi di `catatPatroli` (dievaluasi berurutan, alasan pertama yang kena dipakai):

1. Checkpoint tanpa koordinat → `BELUM_TERVERIFIKASI`, alasan "titik belum dipetakan". Bukan lagi otomatis valid.
2. HP tidak kirim lokasi → `TIDAK_VALID`.
3. `accuracy` dari Geolocation lebih dari 50 m (env `PATROL_MAX_ACCURACY_M`) → `TIDAK_VALID`, alasan "akurasi GPS buruk". Client wajib kirim `accuracy` dan pakai `enableHighAccuracy: true`, `maximumAge: 0`.
4. Jarak lebih dari `PATROL_RADIUS_M` → `TIDAK_VALID`.
5. Scan checkpoint yang sama oleh user yang sama kurang dari 10 menit setelah scan sebelumnya → tolak (tidak disimpan), pesan "Titik ini baru saja dipindai".
6. Dua scan berturut-turut dengan kecepatan perpindahan di atas 3 m/detik (lebih cepat dari jalan kaki) → `TIDAK_VALID`, alasan "perpindahan tidak wajar".
7. Patroli hanya boleh dilakukan saat user punya absensi terbuka (sedang bertugas).

Opsional (Fase 2b), QR dinamis untuk titik rawan: kolom `Checkpoint.qrMode` (`STATIS` | `DINAMIS`). Mode dinamis menampilkan QR di tablet murah yang ditempel di titik, berisi `kode.timestamp.hmac` dan berganti tiap 60 detik. Server menolak bila HMAC salah atau umur lebih dari 120 detik. Ini menutup celah "foto QR lalu scan dari pos".

Kriteria terima:

- [ ] Unit test `lib/geo.ts` mencakup 7 aturan di atas dengan input sintetis.
- [ ] Dashboard dan log menampilkan tiga warna status dan teks alasan.
- [ ] Scan tanpa absensi terbuka ditolak.

## Fase 3 — Redesign UI

Arah baru: dua wajah untuk dua jenis pengguna. Staf lapangan dapat tampilan seperti aplikasi HP: satu aksi besar per layar, dipakai satu tangan, terbaca di bawah matahari atau lorong gelap. Danru, Chief, dan Admin dapat tampilan "ruang kontrol": padat informasi dan fokus ke status.

Glassmorphism dikurangi. Blur dan transparansi hanya untuk header dan bottom bar. Kartu jadi solid putih karena konten di atas blur sulit dibaca di HP murah dan berat di GPU.

### Design token (ganti di `app/globals.css`)

| Token | Light | Dark | Dipakai untuk |
| --- | --- | --- | --- |
| `--background` | `#F3F5F8` | `#0B1220` | Latar halaman |
| `--card` | `#FFFFFF` | `#111A2E` | Kartu, panel |
| `--foreground` | `#0F172A` | `#E6EBF5` | Teks utama |
| `--primary` | `#1D4ED8` (biru navy) | `#3B82F6` | Aksi utama, link |
| `--status-ok` | `#15803D` | `#22C55E` | Valid, hadir, sudah dipatroli |
| `--status-warn` | `#B45309` | `#F59E0B` | Belum terverifikasi, telat |
| `--status-bad` | `#B91C1C` | `#EF4444` | Tidak valid, terlewat, insiden |
| `--radius` | `0.875rem` | sama | Kartu dan tombol |

Aturan tampilan:

- Dark mode ikut sistem (`prefers-color-scheme`) plus toggle manual, karena shift malam.
- Font: Geist untuk UI, Geist Mono untuk jam, kode barcode, dan angka di tabel (`tabular-nums`).
- Target sentuh minimal 48 px. Tombol aksi utama staf tinggi 64 px, lebar penuh.
- Status selalu warna + ikon + teks (jangan hanya warna).
- Ikon dari `lucide-react` yang sudah terpasang.

### Layout per halaman

| Halaman | Layout baru |
| --- | --- |
| Navigasi (role SECURITY) | Bottom tab bar di HP: Beranda, Patroli, Insiden, Profil. Sidebar hanya untuk role manager di layar md ke atas. |
| `/login` | Satu kolom tengah: logo, nama gedung, form, tombol "Masuk" lebar penuh. Tampilkan sisa percobaan saat kena rate limit. |
| `/beranda` (SECURITY, baru) | Kartu besar status shift ("Bertugas sejak 22:03 · Shift Malam") + jam berjalan. Tombol utama berubah konteks: Absen Masuk → Mulai Patroli → Absen Keluar. Di bawahnya progres patroli "5/12 titik" dengan ring progress. |
| `/absensi` | Kamera selfie layar penuh dengan bingkai wajah, indikator GPS (akurasi dalam meter, warna status), lalu layar konfirmasi berisi foto, jam, lokasi, dan tombol Kirim. |
| `/patroli` | Scanner layar penuh dengan kotak bidik dan senter (torch) bila didukung. Setelah scan: nama titik, jarak, foto area, catatan opsional. Daftar rute di bawah sebagai checklist berurutan dengan status tiap titik. |
| `/dashboard` (manager) | Baris 4 KPI (Hadir, Bertugas, Titik terpatroli %, Scan tidak valid). Kiri: grid titik berwarna status. Kanan: feed aktivitas real-time. Bawah: tabel personel bertugas. Filter regu dan tanggal di header. |
| `/master/*` | Tabel dengan pencarian, filter aktif/nonaktif, dan pagination. Form tambah/ubah di Sheet samping, bukan inline. Checkpoint punya peta kecil untuk pilih koordinat dan tombol "Cetak semua QR" (layout A4, 6 per halaman). |

Kriteria terima:

- [ ] Semua halaman lolos di lebar 360 px tanpa scroll horizontal.
- [ ] Kontras teks minimal 4.5:1 di light dan dark.
- [ ] Lighthouse mobile: Accessibility ≥ 90, Performance ≥ 80.

## Fase 4 — Fitur baru

Delapan fitur, diurutkan dari yang paling dibutuhkan operasional. F4-1 (penyimpanan foto) harus duluan karena fitur lain menambah foto.

### F4-1 Penyimpanan foto di object storage

Foto base64 di Postgres bikin database Neon cepat penuh dan query lambat. Pindahkan ke Cloudinary atau Supabase Storage (sesuai PRD §11).

- Skema: kolom foto berisi URL/key, bukan base64. Tabel baru `Foto` (id, key, mime, ukuran, userId, dibuatPada) opsional.
- Client kompres gambar ke JPEG maks 1280 px, kualitas 0.7, sebelum upload. Watermark jam + koordinat + nama di pojok gambar (canvas).
- Upload via signed URL dari Server Action; file privat, ditampilkan lewat URL bertanda tangan berumur 10 menit.
- Skrip migrasi satu kali memindahkan base64 lama ke storage.

### F4-2 Shift & jadwal jaga

- Tabel `Shift` (nama, jamMulai, jamSelesai, toleransiTelatMenit, aktif) dan `Jadwal` (userId, shiftId, tanggal).
- Absensi menyimpan `shiftId` dan `statusHadir`: `TEPAT_WAKTU`, `TELAT`, `PULANG_CEPAT`, `TIDAK_HADIR` (diisi job harian untuk jadwal tanpa absensi).
- Halaman `/jadwal`: kalender mingguan per regu, Danru atur jadwal regunya, Admin semua regu. Staf lihat jadwalnya sendiri di beranda.

### F4-3 Rute patroli & target putaran

- Tabel `Rute` (nama, shiftId?, targetPutaran, intervalMenit) dan `RuteTitik` (ruteId, checkpointId, urutan).
- Contoh: Rute Malam, 12 titik, 4 putaran per shift, tiap 2 jam.
- Progres dihitung per putaran. Titik yang lewat jendela waktu ditandai `TERLEWAT` dan muncul merah di dashboard.

### F4-4 Laporan insiden

- Tabel `Insiden` (userId, kategori, prioritas, deskripsi, fotoKeys\[\], lat, long, checkpointId?, status, ditanganiOleh?, catatanTindakLanjut).
- Kategori: Kerusakan, Tamu mencurigakan, Kebakaran/asap, Kehilangan, Lainnya. Prioritas: Rendah, Sedang, Tinggi, Darurat.
- Status: `BARU` → `DITANGANI` → `SELESAI`. Setiap perubahan status tercatat di AuditLog.
- Bisa dibuat dari menu Insiden atau langsung setelah scan titik.

### F4-5 Tombol darurat (panic button)

- Tombol merah di beranda staf, tahan 2 detik untuk kirim (mencegah salah pencet).
- Membuat insiden prioritas `DARURAT` dengan lokasi terkini.
- Notifikasi Web Push ke semua Danru dan Chief yang bertugas (simpan `PushSubscription` per user). Dashboard manager menampilkan banner merah sampai ada yang klik "Saya tangani".

### F4-6 Pemantauan per regu, foto bukti & real-time

- Perbaiki scope: DANRU hanya melihat anggota regunya (sesuai PRD §2), CHIEF dan SUPER\_ADMIN semua regu.
- Manager bisa membuka detail absensi/patroli: foto, peta titik vs posisi HP, jarak, akurasi, alasan status.
- Dashboard refresh otomatis tiap 30 detik (polling ringan via `router.refresh()`), atau Server-Sent Events bila sempat.

### F4-7 Rekap & export

- Halaman `/laporan`: filter rentang tanggal, regu, user.
- Rekap kehadiran (hadir, telat, tidak hadir per orang) dan rekap patroli (persentase titik terpatroli, jumlah tidak valid).
- Export Excel (`exceljs`) dan PDF (laporan harian siap cetak dengan tanda tangan Danru/Chief).

### F4-8 Akun & audit

- `/profil`: ganti password sendiri (wajib password lama), lihat sesi aktif, logout dari semua perangkat.
- Wajib ganti password saat login pertama untuk user yang dibuat admin (kolom `harusGantiPassword`).
- `/master/audit` (SUPER\_ADMIN): tabel AuditLog dengan filter aksi, tabel, user, dan tanggal; tampilkan diff dataLama vs dataBaru.

Kriteria terima Fase 4:

- [ ] Ukuran baris `Absensi` dan `PatroliLog` di bawah 2 KB setelah F4-1.
- [ ] Staf telat 20 menit (toleransi 15) tercatat `TELAT`.
- [ ] Panic button memunculkan notifikasi di HP Danru dalam 10 detik.
- [ ] Danru Regu A tidak bisa melihat data Regu B, termasuk lewat panggilan Server Action langsung.
- [ ] Export Excel rekap satu bulan untuk 30 personel selesai di bawah 10 detik.

## Testing & urutan PR

Pasang Vitest untuk unit test logika murni. Uji alur lengkap secara manual di HP lewat HTTPS (preview Vercel), karena kamera dan GPS tidak bisa diuji di localhost HP.

Urutan PR:

1. `fix/fase-1` — F1-1 sampai F1-9 + setup Vitest + test `lib/waktu.ts`, `lib/password.ts`.
2. `feat/anti-kecurangan` — Fase 2 + test `lib/geo.ts`.
3. `feat/storage-foto` — F4-1 + skrip migrasi base64.
4. `design/redesign` — Fase 3 (token, navigasi, semua halaman yang ada).
5. `feat/shift-rute` — F4-2, F4-3.
6. `feat/insiden-darurat` — F4-4, F4-5.
7. `feat/pemantauan-laporan` — F4-6, F4-7.
8. `feat/akun-audit` — F4-8, lalu update `README.md` (setup, env, perintah, cara deploy) yang saat ini masih template bawaan.

Alur manual wajib dicoba sebelum merge tiap PR:

- [ ] Login → absen masuk → patroli 3 titik → lapor insiden → absen keluar, sebagai SECURITY.
- [ ] Ulangi dengan jam check-out setelah tengah malam.
- [ ] Login sebagai DANRU Regu A: dashboard hanya berisi Regu A, foto bukti bisa dibuka.
- [ ] Login sebagai SUPER\_ADMIN: CRUD user dan checkpoint, cetak QR, lihat audit log.
- [ ] Logout lalu mode pesawat: tidak ada data user tersisa di layar.

Variabel env baru yang perlu didokumentasikan di `.env.example`: `PATROL_RADIUS_M`, `PATROL_MAX_ACCURACY_M`, `QR_HMAC_SECRET`, kredensial storage foto, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
