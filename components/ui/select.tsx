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
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export { Select };
