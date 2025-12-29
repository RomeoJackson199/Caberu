import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A stable skeleton component that matches final layout dimensions
 * and uses opacity transitions instead of shimmer effects to prevent
 * layout shift and visual flashing.
 */
interface StableSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton - can be a tailwind class or explicit value */
  width?: string;
  /** Height of the skeleton - can be a tailwind class or explicit value */
  height?: string;
  /** Border radius - defaults to rounded-md */
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /** Whether to show a subtle pulse animation (default: true) */
  animated?: boolean;
}

const roundedMap = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

export function StableSkeleton({
  className,
  width,
  height,
  rounded = "md",
  animated = true,
  style,
  ...props
}: StableSkeletonProps) {
  return (
    <div
      className={cn(
        "bg-muted/60",
        animated && "animate-pulse",
        roundedMap[rounded],
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Pre-built skeleton layouts that match common UI patterns
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-4 rounded-xl border bg-card space-y-3", className)}>
      <StableSkeleton className="h-4 w-24" />
      <StableSkeleton className="h-8 w-16" />
      <StableSkeleton className="h-3 w-32" />
    </div>
  );
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-5 rounded-xl border bg-card", className)}>
      <div className="flex items-center justify-between mb-3">
        <StableSkeleton className="h-4 w-28" />
        <StableSkeleton className="h-8 w-8" rounded="lg" />
      </div>
      <StableSkeleton className="h-8 w-20 mb-2" />
      <StableSkeleton className="h-3 w-36" />
    </div>
  );
}

export function AppointmentCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-4 rounded-lg border bg-card flex items-center gap-4", className)}>
      <div className="flex flex-col items-center min-w-[50px]">
        <StableSkeleton className="h-3 w-3 mb-1" rounded="full" />
        <StableSkeleton className="h-4 w-10" />
      </div>
      <div className="flex-1 space-y-2">
        <StableSkeleton className="h-4 w-32" />
        <StableSkeleton className="h-3 w-48" />
      </div>
      <StableSkeleton className="h-6 w-16" rounded="full" />
    </div>
  );
}

export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 p-3", className)}>
      <StableSkeleton className="h-10 w-10" rounded="full" />
      <div className="flex-1 space-y-2">
        <StableSkeleton className="h-4 w-32" />
        <StableSkeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4, className }: { columns?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 p-4 border-b", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <StableSkeleton 
          key={i} 
          className="h-4 flex-1" 
          style={{ maxWidth: i === 0 ? '150px' : undefined }}
        />
      ))}
    </div>
  );
}

export function AvatarSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };
  
  return <StableSkeleton className={sizeMap[size]} rounded="full" />;
}

/**
 * Dashboard skeleton that matches the dentist dashboard layout
 */
export function DashboardGridSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <StableSkeleton className="h-6 w-48" />
          <StableSkeleton className="h-4 w-32" />
        </div>
        <StableSkeleton className="h-10 w-32" rounded="lg" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border bg-card space-y-4">
          <StableSkeleton className="h-5 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <AppointmentCardSkeleton key={i} />
          ))}
        </div>
        <div className="p-6 rounded-xl border bg-card space-y-4">
          <StableSkeleton className="h-5 w-40" />
          <StableSkeleton className="h-48 w-full" rounded="lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Patient home skeleton that matches card layout
 */
export function PatientHomeSkeleton() {
  return (
    <div className="px-4 md:px-6 py-4 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center gap-4">
        <AvatarSkeleton size="lg" />
        <div className="space-y-2">
          <StableSkeleton className="h-6 w-40" />
          <StableSkeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Appointment Card - spans 2 cols */}
        <div className="md:col-span-2 lg:col-span-2 p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <StableSkeleton className="h-5 w-32" />
            <StableSkeleton className="h-5 w-16" rounded="full" />
          </div>
          <StableSkeleton className="h-6 w-40" />
          <StableSkeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <StableSkeleton className="h-9 w-24" rounded="lg" />
            <StableSkeleton className="h-9 w-24" rounded="lg" />
          </div>
        </div>

        {/* Prescriptions Card */}
        <div className="p-6 rounded-xl border bg-card space-y-3">
          <StableSkeleton className="h-5 w-28" />
          <StableSkeleton className="h-8 w-12" />
          <StableSkeleton className="h-3 w-32" />
        </div>

        {/* Balance Card */}
        <div className="p-6 rounded-xl border bg-card space-y-3">
          <StableSkeleton className="h-5 w-20" />
          <StableSkeleton className="h-8 w-16" />
          <StableSkeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * Agenda/Calendar skeleton
 */
export function AgendaSkeleton() {
  return (
    <div className="flex flex-col h-full bg-background border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="space-y-1">
          <StableSkeleton className="h-4 w-20" />
          <StableSkeleton className="h-6 w-40" />
        </div>
        <StableSkeleton className="h-4 w-24" />
      </div>

      {/* Time slots */}
      <div className="flex-1 p-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <StableSkeleton className="h-4 w-12" />
            <StableSkeleton className="h-16 flex-1" rounded="lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
