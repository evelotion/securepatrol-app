import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-card hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Aksi destruktif/pemulihan di tabel: outline berwarna, bukan solid penuh.
        "outline-bahaya":
          "border border-[var(--status-bad)] bg-card text-[var(--status-bad-text)] hover:bg-[color-mix(in_oklab,var(--status-bad)_10%,transparent)]",
        "outline-ok":
          "border border-[var(--status-ok)] bg-card text-[var(--status-ok-text)] hover:bg-[color-mix(in_oklab,var(--status-ok)_10%,transparent)]",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-10 rounded-[var(--radius-sm)] px-3 text-xs",
        lg: "h-16 rounded-[var(--radius)] px-6 text-base",
        icon: "h-12 w-12",
        // Tombol aksi di tabel/kartu: tinggi dan lebar tetap agar sejajar antar baris.
        "aksi-ikon": "h-9 w-9 shrink-0 rounded-[var(--radius-sm)] px-0",
        aksi: "h-9 w-28 shrink-0 rounded-[var(--radius-sm)] px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
