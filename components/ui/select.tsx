import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Select native dengan gaya identik Input shadcn.
 * Sengaja native (bukan Radix) — hanya butuh pilihan sederhana, tanpa dependensi.
 */
const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-[var(--radius-sm)] border border-input bg-card px-3 py-2 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export { Select };
