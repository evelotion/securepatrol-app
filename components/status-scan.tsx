import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  XCircle,
} from "lucide-react";

import type { StatusScan } from "@/lib/geo";
import { labelStatusScan, type Tone } from "@/lib/ui";

const BADGE: Record<Tone, string> = {
  ok: "badge-green",
  warn: "badge-amber",
  bad: "badge-red",
  neutral: "badge-slate",
};

const IKON: Record<Tone, typeof CheckCircle2> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
  neutral: CircleDashed,
};

/** Status scan selalu ditampilkan sebagai warna + ikon + teks. */
export function StatusScanBadge({ status }: { status: StatusScan | null }) {
  const { label, tone } = labelStatusScan(status);
  const Ikon = IKON[tone];

  return (
    <span className={`badge ${BADGE[tone]}`}>
      <Ikon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
