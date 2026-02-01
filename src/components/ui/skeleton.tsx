import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Enhanced Skeleton Component with Shimmer Effect
 * 
 * Features:
 * - Smooth shimmer animation (gradient sweep)
 * - Multiple variants: default, avatar, text, card, button, image
 * - Multiple sizes: sm, md, lg, xl
 * - Animation modes: pulse, shimmer, wave
 * - Staggered animation delays
 * - Dark mode compatible
 */

type SkeletonVariant = "default" | "avatar" | "text" | "card" | "button" | "image";
type SkeletonSize = "sm" | "md" | "lg" | "xl";
type SkeletonAnimation = "pulse" | "shimmer" | "wave" | "none";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Skeleton variant */
  variant?: SkeletonVariant;
  /** Skeleton size */
  size?: SkeletonSize;
  /** Animation type */
  animation?: SkeletonAnimation;
  /** Animation delay in milliseconds for staggered effects */
  delay?: number;
  /** Show skeleton only when loading is true */
  loading?: boolean;
  /** Children to render when not loading */
  children?: React.ReactNode;
}

function getVariantClasses(variant: SkeletonVariant): string {
  switch (variant) {
    case "avatar": return "rounded-full aspect-square";
    case "text": return "h-4 rounded";
    case "card": return "rounded-xl";
    case "button": return "rounded-lg";
    case "image": return "rounded-lg aspect-video";
    default: return "";
  }
}

function getSizeClasses(variant: SkeletonVariant, size: SkeletonSize): string {
  if (variant === "avatar") {
    switch (size) {
      case "sm": return "h-8 w-8";
      case "md": return "h-10 w-10";
      case "lg": return "h-12 w-12";
      case "xl": return "h-16 w-16";
    }
  }
  if (variant === "button") {
    switch (size) {
      case "sm": return "h-8 w-20";
      case "md": return "h-10 w-24";
      case "lg": return "h-12 w-32";
      default: return "h-10 w-24";
    }
  }
  if (variant === "text") {
    switch (size) {
      case "sm": return "h-3";
      case "md": return "h-4";
      case "lg": return "h-5";
      case "xl": return "h-6";
    }
  }
  return "";
}

function getAnimationClasses(animation: SkeletonAnimation): string {
  switch (animation) {
    case "pulse": return "animate-pulse";
    case "shimmer": return "skeleton-shimmer";
    case "wave": return "skeleton-wave";
    case "none": return "";
    default: return "skeleton-shimmer";
  }
}

function Skeleton({
  className,
  variant = "default",
  size = "md",
  animation = "shimmer",
  delay = 0,
  loading = true,
  children,
  style,
  ...props
}: SkeletonProps) {
  // If not loading and has children, render children
  if (!loading && children) {
    return <>{children}</>;
  }

  const variantClasses = getVariantClasses(variant);
  const sizeClasses = getSizeClasses(variant, size);
  const animationClasses = getAnimationClasses(animation);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted isolate",
        variantClasses,
        sizeClasses,
        animationClasses,
        className
      )}
      style={{
        ...style,
        animationDelay: delay ? `${delay}ms` : undefined,
      }}
      aria-hidden="true"
      {...props}
    >
      {/* Shimmer overlay */}
      {animation === "shimmer" && (
        <div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent skeleton-shimmer-gradient"
          style={{ animationDelay: delay ? `${delay}ms` : undefined }}
        />
      )}
      {/* Wave overlay */}
      {animation === "wave" && (
        <div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 dark:via-white/15 to-transparent skeleton-wave-gradient"
          style={{ animationDelay: delay ? `${delay}ms` : undefined }}
        />
      )}
    </div>
  );
}

/**
 * SkeletonText - For text content placeholders
 */
interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  className?: string;
  delay?: number;
  animation?: SkeletonAnimation;
}

function SkeletonText({
  lines = 3,
  className,
  lastLineWidth = "60%",
  delay = 0,
  animation = "shimmer",
}: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          animation={animation}
          delay={delay + i * 75}
          style={{
            width: i === lines - 1 ? lastLineWidth : "100%",
          }}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCard - For card placeholders with header and content
 */
interface SkeletonCardProps {
  showHeader?: boolean;
  showContent?: boolean;
  contentLines?: number;
  className?: string;
  delay?: number;
  animation?: SkeletonAnimation;
}

function SkeletonCard({
  className,
  showHeader = true,
  showContent = true,
  contentLines = 2,
  delay = 0,
  animation = "shimmer",
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 space-y-4",
        className
      )}
    >
      {showHeader && (
        <div className="flex items-center gap-3">
          <Skeleton variant="avatar" size="md" animation={animation} delay={delay} />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/2" animation={animation} delay={delay + 50} />
            <Skeleton className="h-3 w-1/3" animation={animation} delay={delay + 100} />
          </div>
        </div>
      )}
      {showContent && (
        <SkeletonText lines={contentLines} animation={animation} delay={delay + 150} />
      )}
    </div>
  );
}

/**
 * SkeletonAvatar - For avatar placeholders
 */
interface SkeletonAvatarProps {
  size?: SkeletonSize;
  withText?: boolean;
  className?: string;
  delay?: number;
  animation?: SkeletonAnimation;
}

function SkeletonAvatar({
  size = "md",
  withText = false,
  className,
  delay = 0,
  animation = "shimmer",
}: SkeletonAvatarProps) {
  if (withText) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Skeleton variant="avatar" size={size} animation={animation} delay={delay} />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" animation={animation} delay={delay + 50} />
          <Skeleton className="h-3 w-16" animation={animation} delay={delay + 100} />
        </div>
      </div>
    );
  }

  return (
    <Skeleton
      variant="avatar"
      size={size}
      className={className}
      animation={animation}
      delay={delay}
    />
  );
}

/**
 * SkeletonButton - For button placeholders
 */
interface SkeletonButtonProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  delay?: number;
  animation?: SkeletonAnimation;
}

function SkeletonButton({
  size = "md",
  className,
  delay = 0,
  animation = "shimmer",
}: SkeletonButtonProps) {
  return (
    <Skeleton
      variant="button"
      size={size}
      className={className}
      animation={animation}
      delay={delay}
    />
  );
}

/**
 * SkeletonImage - For image placeholders
 */
interface SkeletonImageProps {
  aspectRatio?: "video" | "square" | "portrait" | "wide";
  className?: string;
  delay?: number;
  animation?: SkeletonAnimation;
}

function SkeletonImage({
  aspectRatio = "video",
  className,
  delay = 0,
  animation = "shimmer",
}: SkeletonImageProps) {
  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    wide: "aspect-[21/9]",
  };

  return (
    <Skeleton
      variant="image"
      className={cn(aspectClasses[aspectRatio], className)}
      animation={animation}
      delay={delay}
    />
  );
}

/**
 * SkeletonList - For list item placeholders
 */
interface SkeletonListProps {
  count?: number;
  showAvatar?: boolean;
  showAction?: boolean;
  className?: string;
  delay?: number;
  animation?: SkeletonAnimation;
}

function SkeletonList({
  count = 5,
  showAvatar = true,
  showAction = true,
  className,
  delay = 0,
  animation = "shimmer",
}: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 rounded-lg border bg-card"
        >
          {showAvatar && (
            <Skeleton
              variant="avatar"
              size="md"
              animation={animation}
              delay={delay + i * 50}
            />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" animation={animation} delay={delay + i * 50 + 25} />
            <Skeleton className="h-3 w-1/2" animation={animation} delay={delay + i * 50 + 50} />
          </div>
          {showAction && (
            <Skeleton
              variant="button"
              size="sm"
              animation={animation}
              delay={delay + i * 50 + 75}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonTable - For table placeholders
 */
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
  delay?: number;
  animation?: SkeletonAnimation;
}

function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
  delay = 0,
  animation = "shimmer",
}: SkeletonTableProps) {
  return (
    <div className={cn("w-full", className)}>
      {showHeader && (
        <div className="flex gap-4 p-3 border-b bg-muted/30 rounded-t-lg">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              className="h-4 flex-1"
              animation={animation}
              delay={delay + i * 25}
            />
          ))}
        </div>
      )}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 p-3">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className="h-4 flex-1"
                animation={animation}
                delay={delay + rowIndex * 50 + colIndex * 25}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonStats - For stat cards on dashboards
 */
interface SkeletonStatsProps {
  count?: number;
  className?: string;
  delay?: number;
  animation?: SkeletonAnimation;
}

function SkeletonStats({
  count = 4,
  className,
  delay = 0,
  animation = "shimmer",
}: SkeletonStatsProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl border bg-card space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" animation={animation} delay={delay + i * 75} />
            <Skeleton
              className="h-8 w-8 rounded-lg"
              animation={animation}
              delay={delay + i * 75 + 25}
            />
          </div>
          <Skeleton className="h-7 w-20" animation={animation} delay={delay + i * 75 + 50} />
          <Skeleton className="h-3 w-24" animation={animation} delay={delay + i * 75 + 75} />
        </div>
      ))}
    </div>
  );
}

/**
 * LoadingSkeleton - Simple loading skeleton (consolidated from loading-skeleton.tsx)
 */
function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/**
 * AppointmentSkeleton - Appointment form loading skeleton
 */
function AppointmentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * ChatSkeleton - Chat interface loading skeleton
 */
function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start space-x-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="flex items-start space-x-2 justify-end">
        <div className="space-y-2 flex-1 max-w-xs">
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonImage,
  SkeletonList,
  SkeletonTable,
  SkeletonStats,
  // Consolidated from loading-skeleton.tsx
  LoadingSkeleton,
  AppointmentSkeleton,
  ChatSkeleton,
};
