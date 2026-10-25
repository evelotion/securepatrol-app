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
