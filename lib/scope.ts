import type { Role } from "@/generated/prisma/client";

/**
 * Cakupan data per role (F4-6).
 *
 * - SUPER_ADMIN & CHIEF_SECURITY: semua regu.
 * - DANRU: hanya anggota regunya sendiri (Danru tanpa regu hanya melihat dirinya).
 * - SECURITY: hanya dirinya sendiri.
 */
export type ScopeActor = { id: string; role: Role; regu: string | null };

/** Filter Prisma untuk model `User` (pakai sebagai `where` atau di relasi `user: {...}`). */
export type UserScopeWhere =
  | Record<string, never>
  | { regu: string }
  | { id: string };

export function whereUserDalamScope(actor: ScopeActor): UserScopeWhere {
  if (actor.role === "SUPER_ADMIN" || actor.role === "CHIEF_SECURITY") {
    return {};
  }
  if (actor.role === "DANRU" && actor.regu) return { regu: actor.regu };
  return { id: actor.id };
}

/** Cek satu user target (mis. pelapor) berada dalam cakupan actor. */
export function userDalamScope(
  actor: ScopeActor,
  target: { id: string; regu: string | null },
): boolean {
  if (actor.role === "SUPER_ADMIN" || actor.role === "CHIEF_SECURITY") {
    return true;
  }
  if (target.id === actor.id) return true;
  return actor.role === "DANRU" && actor.regu !== null && target.regu === actor.regu;
}
