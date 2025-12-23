import { cn } from "@/lib/utils";

interface ShimmerProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Shimmer({ className, width = "100%", height = "1rem" }: ShimmerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        className
      )}
      style={{ width, height }}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}

interface ShimmerTextProps {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}

export function ShimmerText({ lines = 3, className, lastLineWidth = "75%" }: ShimmerTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          height="0.875rem"
          width={i === lines - 1 ? lastLineWidth : "100%"}
        />
      ))}
    </div>
  );
}

interface ShimmerCardProps {
  className?: string;
  showImage?: boolean;
  showHeader?: boolean;
  lines?: number;
}

export function ShimmerCard({ 
  className, 
  showImage = false, 
  showHeader = true,
  lines = 2 
}: ShimmerCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-4", className)}>
      {showImage && (
        <Shimmer height="8rem" className="rounded-md" />
      )}
      {showHeader && (
        <div className="space-y-2">
          <Shimmer height="1.25rem" width="60%" />
          <Shimmer height="0.875rem" width="40%" />
        </div>
      )}
      <ShimmerText lines={lines} />
    </div>
  );
}

interface ShimmerAvatarProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ShimmerAvatar({ size = "md", className }: ShimmerAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <Shimmer 
      className={cn("rounded-full", sizeClasses[size], className)} 
    />
  );
}

interface ShimmerButtonProps {
  className?: string;
  width?: string;
}

export function ShimmerButton({ className, width = "6rem" }: ShimmerButtonProps) {
  return (
    <Shimmer 
      className={cn("rounded-md", className)} 
      width={width}
      height="2.5rem"
    />
  );
}

interface ShimmerTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function ShimmerTable({ rows = 5, columns = 4, className }: ShimmerTableProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Shimmer key={i} height="0.875rem" className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Shimmer 
              key={colIndex} 
              height="1rem" 
              className="flex-1"
              width={colIndex === 0 ? "80%" : "100%"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
