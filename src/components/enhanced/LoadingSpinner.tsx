import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  variant?: "inline" | "overlay" | "fullscreen" | "card";
  message?: string;
  description?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner = ({
  variant = "inline",
  message,
  description,
  className,
  size = "md",
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const spinner = (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );

  if (variant === "overlay") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  if (variant === "fullscreen") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        {spinner}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="flex w-full items-center justify-center p-8">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
