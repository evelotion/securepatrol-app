import { Suspense } from "react";

import { listUsers } from "@/lib/data";

import { UsersClient } from "./users-client";

export const metadata = { title: "Master User" };

export default function MasterUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <div className="skeleton h-20 w-full rounded-3xl" />
          <div className="skeleton h-72 w-full rounded-3xl" />
        </div>
      }
    >
      <UsersSection />
    </Suspense>
  );
}

async function UsersSection() {
  const { actor, users } = await listUsers();

  return (
    <div className="flex flex-col gap-5">
      <header className="glass rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="page-title">Master User</h1>
            <p className="page-sub mt-1">
              Kelola akun Security, Danru, Chief, dan Super Admin.
            </p>
          </div>
          <span className="badge badge-slate">{users.length} akun</span>
        </div>
      </header>

      <UsersClient actorId={actor.id} users={users} />
    </div>
  );
}
