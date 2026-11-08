import { TEKS_HAK_CIPTA } from "@/lib/app-info";

/** Baris hak cipta kecil untuk footer login, sidebar, dan halaman Profil. */
export function HakCipta({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-center text-[11px] leading-4 text-muted-foreground ${className}`}
    >
      {TEKS_HAK_CIPTA}
    </p>
  );
}
