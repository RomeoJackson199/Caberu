import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:scale-105",
  {
    variants: {
      variant: {
        default: "border-transparent bg-dental-primary text-dental-primary-foreground hover:bg-dental-primary/80 shadow-soft hover:shadow-md",
        secondary: "border-transparent bg-dental-secondary text-dental-secondary-foreground hover:bg-dental-secondary/80 shadow-soft hover:shadow-md",
        destructive: "border-transparent bg-dental-error text-white hover:bg-dental-error/80 shadow-soft hover:shadow-md",
        outline: "text-foreground border-border hover:bg-accent hover:border-primary",
        gradient: "border-transparent bg-gradient-primary text-white shadow-glow hover:shadow-elegant",
        success: "border-transparent bg-dental-success text-white hover:bg-dental-success/80 shadow-soft hover:shadow-md",
        warning: "border-transparent bg-dental-warning text-white hover:bg-dental-warning/80 shadow-soft hover:shadow-md",
        info: "border-transparent bg-dental-info text-white hover:bg-dental-info/80 shadow-soft hover:shadow-md",
        glass: "border-white/20 bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 hover:border-white/40",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

// Tokens already define badge colors; keeping component as-is.
