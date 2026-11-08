This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database (Neon) dan migrasi

Ada dua database Neon yang terpisah. Jangan tertukar:

| Lingkungan | Database | `DATABASE_URL` diset di |
| --- | --- | --- |
| Production (deploy dari `main`) | Neon branch `main` — database utama | Vercel: environment **Production** |
| Preview deployment | Neon branch `dev` | Vercel: environment **Preview** |
| Development lokal (`npm run dev`) | Neon branch `dev` | `.env` lokal |

Aturan:

- **Migrasi Production hanya lewat `npx prisma migrate deploy`** (atau `npm run db:deploy`) **setelah PR di-merge ke `main`**. Jangan pernah menjalankan `prisma migrate dev`, `prisma db push`, atau `prisma migrate reset` terhadap branch `main` — perintah itu bisa menghapus data produksi.
- `prisma migrate dev` hanya untuk branch `dev` (lokal/preview), dan setiap perubahan skema tetap harus masuk sebagai file migrasi di `prisma/migrations/` yang ikut di-commit.
- Seed (`npm run db:seed`) hanya membuat akun SUPER_ADMIN; jalankan hanya di branch `dev`, atau di Production saat inisialisasi pertama dengan `SEED_ADMIN_PASSWORD` yang kuat.
- Data uji (absensi, patroli, foto) dijalankan di branch `dev`, supaya database Production bersih.
- Foto disimpan di Cloudinary sebagai aset `private`; baris `Foto` hanya menyimpan metadata dan key, bukan isi gambar.

## Shift, jadwal, dan rute (F4-2 / F4-3)

- `Shift` menyimpan jam jaga dan toleransi telat; `Jadwal` menugaskan satu shift per personel per tanggal WIB.
- `Absensi` menyimpan `shift_id` dan `status_hadir`: `TEPAT_WAKTU`, `TELAT`, `PULANG_CEPAT`, `TIDAK_HADIR`.
- Danru hanya bisa mengatur jadwal anggota regunya sendiri; Chief Security dan Super Admin semua regu.
- `Rute` + `RuteTitik` menentukan urutan titik dan target putaran per shift. Progres dihitung per putaran; titik yang jendela waktunya lewat tanpa scan ditandai `TERLEWAT` dan tampil merah di dashboard.
- Halaman: `/jadwal` (Danru, Chief, Super Admin), `/master/shifts` dan `/master/rute` (Super Admin). Staf melihat jadwal hari ini di `/beranda` dan progres putaran di `/patroli`.

Cron harian menandai jadwal tanpa absensi sebagai `TIDAK_HADIR`:

- Endpoint `GET /api/cron/tidak-hadir`, jadwal `vercel.json` pukul 17:10 UTC (00:10 WIB).
- Wajib set env `CRON_SECRET` di Vercel (Preview & Production). Panggilan manual juga harus mengirim header `Authorization: Bearer <CRON_SECRET>`; tanpa env tersebut endpoint menolak semua permintaan.

## Insiden dan tombol darurat (F4-4 / F4-5)

- `Insiden` menyimpan kategori, prioritas, deskripsi, foto (key Cloudinary private), lokasi, titik terkait, dan status `BARU` → `DITANGANI` → `SELESAI`. Setiap perubahan tercatat di `AuditLog`.
- SECURITY melapor lewat tab **Insiden** (atau tautan "Laporkan insiden di titik ini" setelah scan). Danru hanya melihat insiden regunya; Chief dan Super Admin semua regu.
- Tombol darurat di `/beranda` harus ditahan 2 detik. Hasilnya insiden `DARURAT`; sinyal berulang dari orang yang sama dalam 5 menit tidak digandakan.
- Dashboard manager menampilkan banner merah untuk darurat yang belum ditangani dan menyegarkan diri tiap 15 detik, sampai ada yang menekan **Saya tangani**. Web Push belum ada.
- Foto insiden dibuka lewat `/api/foto/[id]`: pemilik, atau manager yang pelapornya ada dalam cakupannya.

## Pemantauan, laporan, dan akun (F4-6 / F4-7 / F4-8)

- **Cakupan data**: Danru hanya melihat anggota regunya; Chief dan Super Admin semua regu (`lib/scope.ts`). Dicek di server pada dashboard, insiden, laporan, detail bukti, dan foto, bukan hanya di UI. Id yang ditebak dari regu lain mengembalikan 404.
- **Detail bukti**: nama personel dan titik di dashboard membuka `/detail/absensi/[id]` dan `/detail/patroli/[id]` (foto, jarak, akurasi, alasan status, diagram posisi HP terhadap titik). Dashboard menyegarkan diri tiap 15 detik.
- **Laporan** (`/laporan`): filter rentang tanggal (maks 93 hari, WIB), regu, dan personel. Rekap kehadiran (hadir, telat, pulang cepat, tidak hadir) dan patroli (scan, tidak valid, persentase titik aktif yang dipindai). `Export Excel` memanggil `GET /api/laporan/excel` dengan filter yang sama, dengan cakupan role yang sama. PDF belum ada.
- **Akun** (`/profil`): ganti password (wajib password lama, maksimal 5 kali salah per 15 menit), daftar sesi aktif, keluar dari semua perangkat. Ganti password mengeluarkan perangkat lain.
- **Wajib ganti password**: user yang dibuat admin, atau yang password-nya direset admin, ditandai `harusGantiPassword` dan hanya bisa membuka `/profil` sampai password diganti.
- **Audit log** (`/master/audit`, Super Admin): filter aksi, tabel, user, tanggal; setiap entri menampilkan beda `dataLama` dan `dataBaru`.

## Setup lokal

```bash
npm install
cp .env.example .env      # isi DATABASE_URL (Neon branch dev) dan kredensial Cloudinary
npx prisma migrate dev    # hanya terhadap branch dev
npm run db:seed           # membuat SUPER_ADMIN dari SEED_ADMIN_*
npm run dev
```

Perintah lain: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`. Variabel env lengkap ada di `.env.example`.

## Deploy

1. Push ke GitHub; Vercel membangun branch `main` sebagai Production dan branch lain sebagai Preview.
2. Set env di Vercel (Production: Neon branch `main`; Preview: Neon branch `dev`), termasuk `CRON_SECRET`.
3. Setelah PR di-merge, jalankan `npx prisma migrate deploy` terhadap database Production.
4. Uji kamera dan GPS di HP lewat HTTPS (URL Preview/Production), bukan localhost.

## Tes E2E (Playwright)

Tes alur lapangan HP (login → absen masuk → patroli → insiden → tombol darurat → banner Danru → isolasi regu → Excel → absen keluar) ada di `e2e/`. Chromium mobile (Pixel 7) dengan kamera palsu (`--use-fake-device-for-media-stream`) dan GPS tiruan.

```bash
npx playwright install chromium          # sekali saja
npm run test:e2e                          # target default http://localhost:3000
BASE_URL=https://<preview>.vercel.app npm run test:e2e
```

- Butuh `DATABASE_URL` (untuk setup/teardown) dan akun `uji.*@uji.test`. Password dibaca dari `E2E_PASSWORD_SEC_A`, `E2E_PASSWORD_DANRU_A`, `E2E_PASSWORD_CHIEF`, atau `.tmp-uji/akun.txt`.
- Setup/teardown hanya menghapus absensi, patroli, insiden, dan foto milik `uji.sec.a@uji.test` (AuditLog tidak dihapus). `DATABASE_URL` harus menunjuk DB yang sama dengan `BASE_URL`.
- Yang ditiru: kamera (pola uji, bukan QR), GPS, dan hasil scan QR (kolom kode diisi langsung). Unggahan foto ke Cloudinary nyata, tidak di-mock; asetnya tetap tinggal di Cloudinary.
- CI (`.github/workflows/ci.yml`) hanya menjalankan typecheck, lint, dan unit test. E2E dijalankan manual.
