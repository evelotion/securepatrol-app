# CLAUDE.md

## Tentang Project
Aplikasi web SecurePatrol untuk absensi dan patroli sekuriti. Baca dulu sebelum mengerjakan apa pun: docs/PRD-SecurePatrol.md (kebutuhan produk), docs/SPEC-perbaikan.md (fase, fitur F4-x, urutan PR), dan README.md (database & migrasi, shift/rute, cron).

## Tech Stack
Next.js (App Router), TypeScript, Tailwind CSS, Prisma, PostgreSQL (Neon, ap-southeast-1). Deploy ke Vercel.

## Perintah
- Dev server: npm run dev
- Migrasi DB: npx prisma migrate dev
- Lihat data: npx prisma studio
- Unit test: npm run test
- Cek tipe: npm run typecheck
- Migrasi Production (hanya setelah merge ke main): npx prisma migrate deploy

## Aturan Wajib
- Soft delete saja (toggle kolom aktif), jangan hapus permanen.
- Semua perubahan data dicatat ke tabel AuditLog.
- Cek role (SUPER_ADMIN, CHIEF_SECURITY, DANRU, SECURITY) di server.
- Decimal diubah ke string sebelum dikirim ke client component.
- Rahasia hanya di .env.
- Pakai TypeScript, hindari any.
- Database lokal dan preview = Neon branch `dev`. Production (branch `main`) hanya diubah lewat `npx prisma migrate deploy` setelah PR di-merge. Jangan jalankan `migrate dev`, `db push`, atau `migrate reset` ke Production.
- Satu fitur = satu branch + satu PR. Untuk fitur besar, tunjukkan rencana dulu sebelum menulis kode. Jangan merge sendiri; merge dilakukan pemilik repo.
- Sebelum rilis ke pengguna nyata: pisahkan DB dev dari Production (Neon branch dev).
- Jangan menjalankan perintah ke database (migrate, seed, query) tanpa izin saya.

## Gaya Tampilan
Light glassmorphism, clean layout, responsif untuk mobile web.

## Progress
Urutan PR mengikuti docs/SPEC-perbaikan.md.
- [x] Live di main: Fase 1, Fase 2, Fase 3, dan seluruh Fase 4 (F4-1 sampai F4-8)
- [x] 7 migrasi sudah diterapkan ke database Production
- [ ] Ditunda: Web Push untuk tombol darurat (VAPID), QR dinamis (Fase 2b), export PDF laporan
- [ ] Sebelum rilis ke pengguna nyata: pisahkan DB dev dari Production, dan nonaktifkan akun uji (`uji.*@uji.test`)

## Catatan operasional
- Merge PR bertingkat (stacked): merge dari yang paling bawah dan ubah base PR berikutnya ke `main` dulu. Merge ke branch induk yang sudah masuk `main` tidak membawa perubahannya ke `main`.
- Env Vercel yang baru ditambah (mis. `CRON_SECRET`) baru berlaku setelah redeploy.
- Redirect dan `notFound()` di dalam Suspense mengembalikan status HTTP 200 dengan isi pengalihan/404, bukan 307/404. Jangan menguji akses halaman hanya dari status HTTP; periksa isinya.
- Region function Vercel = `sin1` (Singapura), sejalan dengan DB Neon di ap-southeast-1. Diatur lewat `regions` di vercel.json; tanpa itu function jalan di iad1 (AS) dan tiap query DB lintas benua.
