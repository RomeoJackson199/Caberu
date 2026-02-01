import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden touch-target",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:bg-primary/90 active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground shadow-md hover:shadow-lg hover:bg-destructive/90 active:scale-[0.98]",
        outline: "border-2 border-border bg-background shadow-sm hover:bg-muted hover:border-primary/50 hover:shadow-md active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground shadow-md hover:shadow-lg hover:bg-secondary/90 active:scale-[0.98]",
        ghost: "hover:bg-muted hover:text-foreground active:bg-muted/80",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        // Modern DentiBot variants
        gradient: "bg-gradient-primary text-white shadow-lg hover:shadow-glow active:scale-[0.98]",
        aqua: "bg-secondary text-white shadow-md hover:shadow-lg hover:bg-secondary/90 active:scale-[0.98]",
        lilac: "bg-accent text-accent-foreground shadow-md hover:shadow-lg hover:bg-accent/90 active:scale-[0.98]",
        glass: "bg-white/10 backdrop-blur-md border-2 border-white/20 text-foreground hover:bg-white/20 hover:border-white/30 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
        desktop: "h-11 px-8",
        mobile: "h-12 px-6 text-base",
        // WCAG AAA compliant touch target (48px minimum)
        touch: "h-12 min-w-[48px] px-6 text-base",
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
  loading?: boolean
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, icon, rightIcon, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const content = (
      <>
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        )}
        {!loading && icon && <span className="transition-transform duration-300 group-hover:scale-110">{icon}</span>}
        <span className={cn("transition-all duration-300", loading && "opacity-70")}>{children}</span>
        {!loading && rightIcon && <span className="transition-transform duration-300 group-hover:translate-x-0.5">{rightIcon}</span>}
      </>
    )

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), "group")}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? children : content}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
