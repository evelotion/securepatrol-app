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
