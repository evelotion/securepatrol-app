import type { Role } from "@/generated/prisma/client";

/** Semua role sesuai PRD bagian 2. */
export const ROLES: Role[] = [
  "SUPER_ADMIN",
  "CHIEF_SECURITY",
  "DANRU",
  "SECURITY",
];

/** Role yang boleh mengelola master data. */
export const MASTER_ROLES: Role[] = ["SUPER_ADMIN"];

/**
 * Role lapangan: mengisi absensi (Blok 4) dan melakukan patroli (Blok 5).
 * PRD bagian 4 menugaskan keduanya ke SECURITY.
 */
export const FIELD_ROLES: Role[] = ["SECURITY"];

/** Role yang memantau dashboard (Blok 6) — PRD bagian 7. */
export const DASHBOARD_ROLES: Role[] = [
  "DANRU",
  "CHIEF_SECURITY",
  "SUPER_ADMIN",
];

/** true bila role boleh melihat panel pemantauan tim (bukan data pribadi). */
export function isManager(role: Role): boolean {
  return DASHBOARD_ROLES.includes(role);
}

/** Label role untuk ditampilkan di UI. */
export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  CHIEF_SECURITY: "Chief Security",
  DANRU: "Danru",
  SECURITY: "Security",
};

/** Warna badge per role. */
export const ROLE_BADGE: Record<Role, string> = {
  SUPER_ADMIN: "badge-indigo",
  CHIEF_SECURITY: "badge-amber",
  DANRU: "badge-slate",
  SECURITY: "badge-green",
};
