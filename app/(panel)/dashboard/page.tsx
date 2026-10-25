import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/data";
import { ROLE_LABEL } from "@/lib/roles";

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
      <div className="skeleton h-24 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

async function Dashboard() {
  const [user, stats] = await Promise.all([
    getCurrentUser(),
    getDashboardStats(),
  ]);

  const cards = [
    { label: "Total User", value: stats.totalUser, hint: "terdaftar" },
    { label: "User Aktif", value: stats.userAktif, hint: "dapat login" },
    {
      label: "Total Checkpoint",
      value: stats.totalCheckpoint,
      hint: "titik patroli",
    },
    {
      label: "Checkpoint Aktif",
      value: stats.checkpointAktif,
      hint: "dipantau",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="glass rounded-3xl p-5 sm:p-6">
        <span className="badge badge-indigo">
          {ROLE_LABEL[user.role]}
          {user.regu ? ` · ${user.regu}` : ""}
        </span>
        <h1 className="page-title mt-3">Selamat datang, {user.nama} 👋</h1>
        <p className="page-sub mt-1">
          Ringkasan data SecurePatrol gedung Anda hari ini.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="glass rounded-3xl p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <p className="stat-value mt-2">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
          </article>
        ))}
      </section>

      {user.role === "SUPER_ADMIN" ? (
        <section className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="section-title">Kelola data master</h2>
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
