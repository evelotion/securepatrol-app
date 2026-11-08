"use client";

import { useState } from "react";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Tombol export Excel + opsi thumbnail foto. Thumbnail hanya ditawarkan untuk
 * rentang ≤ 7 hari (dicek ulang di server) agar file tetap ringan.
 */
export function ExportExcel({
  query,
  bolehThumbnail,
}: {
  /** Query string filter (dari, sampai, regu, user). */
  query: string;
  bolehThumbnail: boolean;
}) {
  const [denganFoto, setDenganFoto] = useState(false);
  const href = `/api/laporan/excel?${query}${denganFoto && bolehThumbnail ? "&foto=1" : ""}`;

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <Button asChild>
        <a href={href}>
          <Download className="size-4" aria-hidden="true" />
          Export Excel
        </a>
      </Button>
      <label
        className={`flex items-center gap-2 text-xs ${
          bolehThumbnail ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <input
          type="checkbox"
          checked={denganFoto && bolehThumbnail}
          disabled={!bolehThumbnail}
          onChange={(e) => setDenganFoto(e.target.checked)}
          className="size-4 accent-[var(--primary)]"
        />
        Sertakan thumbnail foto
        <span className="text-muted-foreground">
          {bolehThumbnail ? "(maks. 60 foto)" : "(hanya rentang ≤ 7 hari)"}
        </span>
      </label>
    </div>
  );
}
