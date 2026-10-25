/** Halaman fallback ketika pengguna offline (dirujuk service worker). */
export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="glass rounded-3xl p-8 max-w-sm">
        <div className="text-4xl">📡</div>
        <h1 className="mt-3 text-xl font-semibold text-slate-800">
          Anda sedang offline
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Koneksi internet terputus. Silakan coba lagi setelah jaringan
          pulih.
        </p>
        <a href="/dashboard" className="btn btn-primary mt-5 w-full">
          Coba lagi
        </a>
      </div>
    </main>
  );
}
