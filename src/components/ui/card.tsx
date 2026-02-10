import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-[var(--radius-card)] text-card-foreground transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        default: "bg-card border border-border/60 shadow-md hover:shadow-lg",
        glass: "glass-card border-white/20 shadow-soft",
        "glass-strong": "glass-card-strong border-white/30 shadow-medium",
        floating: "floating-card shadow-large",
        elevated: "card-elevated shadow-elegant",
        interactive: "card-interactive shadow-medium hover:shadow-large",
        outline: "border-2 border-primary/20 bg-card/50 hover:border-primary/40 shadow-soft hover:shadow-md",
        gradient: "bg-gradient-card border-0 text-white shadow-elegant hover:shadow-glow",
      },
      padding: {
        none: "",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
        xl: "p-12",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-[calc(var(--radius-card)-2px)]",
        default: "rounded-[var(--radius-card)]",
        lg: "rounded-[calc(var(--radius-card)+4px)]",
        xl: "rounded-[calc(var(--radius-card)+8px)]",
        "2xl": "rounded-[calc(var(--radius-card)+12px)]",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
      rounded: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
  hover?: boolean
  glow?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, rounded, hover, glow, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, padding, rounded }),
        hover && "hover:shadow-elegant hover:-translate-y-1 cursor-pointer",
        glow && "hover:shadow-glow",
        "group",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    gradient?: boolean
  }
>(({ className, gradient, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-2 p-6",
      gradient && "bg-gradient-primary text-white rounded-t-[var(--radius-card)] -m-6 mb-6 p-6",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    gradient?: boolean
    size?: "sm" | "default" | "lg" | "xl"
  }
>(({ className, gradient, size = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: "text-lg font-semibold",
    default: "text-2xl font-semibold",
    lg: "text-3xl font-bold", 
    xl: "text-4xl font-bold",
  }

  return (
    <h3
      ref={ref}
      className={cn(
        sizeClasses[size],
        "leading-none tracking-tight",
        gradient && "gradient-text",
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    size?: "sm" | "default" | "lg"
  }
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: "text-xs",
    default: "text-sm",
    lg: "text-base",
  }

  return (
    <p
      ref={ref}
      className={cn(
        sizeClasses[size],
        "text-muted-foreground leading-relaxed",
        className
      )}
      {...props}
    />
  )
})
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    padding?: "none" | "sm" | "default" | "lg"
  }
>(({ className, padding = "default", ...props }, ref) => {
  const paddingClasses = {
    none: "",
    sm: "p-4 pt-0",
    default: "p-6 pt-0",
    lg: "p-8 pt-0",
  }

  return (
    <div 
      ref={ref} 
      className={cn(paddingClasses[padding], className)} 
      {...props} 
    />
  )
})
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    gradient?: boolean
    padding?: "none" | "sm" | "default" | "lg"
  }
>(({ className, gradient, padding = "default", ...props }, ref) => {
  const paddingClasses = {
    none: "pt-0",
    sm: "flex items-center p-4 pt-0",
    default: "flex items-center p-6 pt-0",
    lg: "flex items-center p-8 pt-0",
  }

  return (
    <div
      ref={ref}
      className={cn(
        paddingClasses[padding],
        gradient && "bg-gradient-secondary text-white rounded-b-[var(--radius-card)] -m-6 mt-6 p-6",
        className
      )}
      {...props}
    />
  )
})
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
