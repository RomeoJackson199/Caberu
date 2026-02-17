import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface FocusRingProps {
  children: React.ReactNode;
  className?: string;
  offset?: "none" | "sm" | "md";
  color?: "primary" | "accent" | "destructive";
  asChild?: boolean;
}

/**
 * Enhanced focus ring component for accessibility
 * Wraps interactive elements with consistent focus styles
 */
export function FocusRing({
  children,
  className,
  offset = "sm",
  color = "primary",
}: FocusRingProps) {
  const offsetClasses = {
    none: "focus-within:ring-offset-0",
    sm: "focus-within:ring-offset-2",
    md: "focus-within:ring-offset-4",
  };

  const colorClasses = {
    primary: "focus-within:ring-ring",
    accent: "focus-within:ring-accent",
    destructive: "focus-within:ring-destructive",
  };

  return (
    <div
      className={cn(
        "rounded-md focus-within:ring-2 focus-within:ring-offset-background transition-shadow",
        offsetClasses[offset],
        colorClasses[color],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * CSS classes for consistent focus styling
 * Apply these directly to interactive elements
 */
export const focusRingClasses = {
  default: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  subtle: "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
  inset: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
  none: "focus-visible:outline-none",
};

/**
 * Enhanced keyboard navigation indicator
 * Shows visual feedback for keyboard users
 */
export function useKeyboardNavigation() {
  useEffect(() => {
    const handleFirstTab = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        document.body.classList.add("keyboard-navigation");
        window.removeEventListener("keydown", handleFirstTab);
        window.addEventListener("mousedown", handleMouseDown);
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove("keyboard-navigation");
      window.removeEventListener("mousedown", handleMouseDown);
      window.addEventListener("keydown", handleFirstTab);
    };

    window.addEventListener("keydown", handleFirstTab);

    return () => {
      window.removeEventListener("keydown", handleFirstTab);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);
}
