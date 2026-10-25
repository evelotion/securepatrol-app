import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { listUsers } from "@/lib/data";

import { UsersClient } from "./users-client";

export const metadata = { title: "Master User" };

export default function MasterUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-72 rounded-xl" />
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Master User</h1>
          <p className="page-sub mt-1">
            Kelola akun Security, Danru, Chief, dan Super Admin.
          </p>
        </div>
        <span className="badge badge-slate">{users.length} akun</span>
      </header>

      <UsersClient actorId={actor.id} users={users} />
    </div>
  );
}
