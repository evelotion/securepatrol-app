# CLAUDE.md

## Tentang Project
Aplikasi web SecurePatrol untuk absensi dan patroli sekuriti. Detail lengkap di docs/PRD-SecurePatrol.md — baca dulu sebelum mengerjakan apa pun.

## Tech Stack
Next.js (App Router), TypeScript, Tailwind CSS, Prisma, PostgreSQL (Neon, ap-southeast-1). Deploy ke Vercel.

## Perintah
- Dev server: npm run dev
- Migrasi DB: npx prisma migrate dev
- Lihat data: npx prisma studio

## Aturan Wajib
- Soft delete saja (toggle kolom aktif), jangan hapus permanen.
- Semua perubahan data dicatat ke tabel AuditLog.
- Cek role (SUPER_ADMIN, CHIEF_SECURITY, DANRU, SECURITY) di server.
- Decimal diubah ke string sebelum dikirim ke client component.
- Rahasia hanya di .env.
- Pakai TypeScript, hindari any.
- Eksekusi kode secepat mungkin. Kerjakan beberapa blok fitur sekaligus tanpa perlu meminta persetujuan saya di setiap langkah.

## Gaya Tampilan
Light glassmorphism, clean layout, responsif untuk mobile web.

## Progress
- [x] Blok 1: Setup project, PWA config, koneksi database (Prisma Schema)
- [x] Blok 2: Autentikasi & manajemen role
- [x] Blok 3: Master Data (Users & Checkpoints)
- [x] Blok 4: Fitur Absensi Kehadiran
- [x] Blok 5: Fitur Patroli (Barcode Scanner & GPS)
- [x] Blok 6: Dashboard & Laporan
- [ ] Blok 7: Deploy Vercel