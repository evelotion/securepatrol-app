import { Suspense } from "react";

import { getDashboardHariIni } from "@/lib/data";
import { formatJam } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="skeleton h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-64 w-full rounded-2xl" />
    </div>
  );
}

async function Dashboard() {
  const { actor, scope, data, stats } = await getDashboardHariIni();
  const { summary, absensi, checkpoints, logs } = data;
  const isTim = scope === "tim";

  const cards = [
    {
      label: "Hadir hari ini",
      value: summary.totalHadir,
      hint: "staf terabsen",
    },
    {
      label: "Sedang bertugas",
      value: summary.sedangBertugas,
      hint: "belum absen keluar",
    },
    {
      label: "Sudah pulang",
      value: summary.sudahPulang,
      hint: "absen keluar",
    },
    {
      label: "Titik terpatroli",
      value: `${summary.checkpointTerpatroli}/${summary.totalCheckpointAktif}`,
      hint: "checkpoint hari ini",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="page-title">Selamat datang, {actor.nama}</h1>
            <p className="page-sub mt-1">
              {isTim
                ? "Ringkasan kehadiran & patroli tim hari ini."
                : "Ringkasan kehadiran & patroli Anda hari ini."}
            </p>
          </div>
          <span className="badge badge-slate">
            {summary.logHariIni} kunjungan · {summary.logValid} valid
            {summary.logInvalid > 0 ? ` · ${summary.logInvalid} invalid` : ""}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="glass rounded-2xl p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <p className="stat-value mt-2">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
          </article>
        ))}
      </section>

      {isTim && absensi.length > 0 ? (
        <section className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Status absensi tim</h2>
            <span className="badge badge-indigo">{absensi.length} orang</span>
          </div>
          <div className="table-wrap mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Regu</th>
                  <th>Masuk</th>
                  <th>Keluar</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {absensi.map((row) => (
                  <tr key={row.userId}>
                    <td className="font-semibold text-slate-800">{row.nama}</td>
                    <td>{row.regu ?? "-"}</td>
                    <td>{formatJam(row.waktuMasuk)}</td>
                    <td>
                      {row.waktuKeluar ? formatJam(row.waktuKeluar) : "-"}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          row.waktuKeluar ? "badge-slate" : "badge-green"
                        }`}
                      >
                        {row.waktuKeluar ? "Pulang" : "Bertugas"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Progres patroli</h2>
            <span className="badge badge-amber">
              {summary.checkpointTerpatroli}/{summary.totalCheckpointAktif}
            </span>
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {checkpoints.length === 0 ? (
              <li className="text-sm text-slate-500">
                Belum ada titik patroli aktif.
              </li>
            ) : (
              checkpoints.map((cp) => (
                <li
                  key={cp.id}
                  className="glass-inset flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {cp.namaTitik}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {cp.dikunjungi
                        ? `${cp.pengunjung ?? "-"}${
                            cp.kunjunganTerakhir
                              ? ` · ${formatJam(cp.kunjunganTerakhir)}`
                              : ""
                          }${cp.jumlahInvalid > 0 ? ` · ${cp.jumlahInvalid} invalid` : ""}`
                        : "Belum dikunjungi"}
                    </p>
                  </div>
                  <span
                    className={`badge shrink-0 ${
                      cp.dikunjungi ? "badge-green" : "badge-amber"
                    }`}
                  >
                    {cp.dikunjungi ? "Sudah" : "Belum"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Kunjungan terbaru</h2>
            <span className="badge badge-slate">{logs.length} log</span>
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {logs.length === 0 ? (
              <li className="text-sm text-slate-500">
                Belum ada kunjungan patroli hari ini.
              </li>
            ) : (
              logs.map((log) => (
                <li
                  key={log.id}
                  className="glass-inset flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {log.namaCheckpoint}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatJam(log.waktu)} · {log.namaUser}
                    </p>
                  </div>
                  <span
                    className={`badge shrink-0 ${
                      log.statusValid ? "badge-green" : "badge-amber"
                    }`}
                  >
                    {log.statusValid ? "Valid" : "Invalid"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      {actor.role === "SUPER_ADMIN" ? (
        <section className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">Kelola data master</h2>
            {stats ? (
              <span className="badge badge-indigo">
                {stats.userAktif}/{stats.totalUser} user ·{" "}
                {stats.checkpointAktif}/{stats.totalCheckpoint} checkpoint
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <a href="/master/users" className="btn btn-primary btn-sm">
              Kelola User
            </a>
            <a href="/master/checkpoints" className="btn btn-ghost btn-sm">
              Kelola Checkpoint
            </a>
          </div>
        </section>
      ) : null}
    </div>
  );
}
