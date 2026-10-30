"use client";

import { useEffect, useState } from "react";

import { formatJamDetik } from "@/lib/format";

/**
 * Jam berjalan WIB. Render pertama memakai waktu server (iso) agar tidak ada
 * hydration mismatch, lalu interval 1 detik mengambil waktu perangkat.
 */
export function JamBerjalan({
  iso,
  className,
}: {
  /** Waktu server saat halaman dirender (ISO string). */
  iso: string;
  className?: string;
}) {
  const [sekarang, setSekarang] = useState(() => new Date(iso));

  useEffect(() => {
    const id = setInterval(() => setSekarang(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <time
      dateTime={sekarang.toISOString()}
      suppressHydrationWarning
      className={className}
    >
      {formatJamDetik(sekarang)}
    </time>
  );
}
