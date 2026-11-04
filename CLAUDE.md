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
- Satu fitur = satu branch + satu PR. Jangan merge sendiri; merge dilakukan pemilik repo.
- Kerjakan satu fitur per branch. Untuk fitur besar, tunjukkan rencana dulu sebelum menulis kode.
- Jangan menjalankan perintah ke database (migrate, seed, query) tanpa izin saya.

## Gaya Tampilan
Light glassmorphism, clean layout, responsif untuk mobile web.

## Progress
Urutan PR mengikuti docs/SPEC-perbaikan.md.
- [x] Live di main: Fase 1, Fase 2, Fase 3, F4-1 (PR #1)
- [x] PR #2 `feat/shift-rute` (F4-2 + F4-3): sudah di-review, siap merge
- [ ] Berikutnya: F4-4 + F4-5 (insiden & tombol darurat) — `feat/insiden-darurat`
- [ ] Lalu: F4-6 + F4-7 — `feat/pemantauan-laporan`
- [ ] Lalu: F4-8 — `feat/akun-audit`