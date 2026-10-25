import type { Role } from "@/generated/prisma/client";

/** DTO user yang aman dikirim ke client component (tanpa hash password). */
export type UserRow = {
  id: string;
  nama: string;
  email: string;
  username: string | null;
  role: Role;
  regu: string | null;
  aktif: boolean;
  createdAt: string;
};

/** DTO checkpoint — Decimal sudah dikonversi ke string (aturan CLAUDE.md). */
export type CheckpointRow = {
  id: string;
  namaTitik: string;
  kodeBarcode: string;
  lat: string | null;
  long: string | null;
  keterangan: string | null;
  aktif: boolean;
  qrSvg: string;
};

export type DashboardStats = {
  totalUser: number;
  userAktif: number;
  totalCheckpoint: number;
  checkpointAktif: number;
};
