import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

interface PolishedAvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string | null;
  alt?: string;
  fallbackText?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showBorder?: boolean;
  status?: "online" | "offline" | "busy" | "away";
}

const sizeMap = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-16 w-16 text-xl",
};

const statusColors = {
  online: "bg-success",
  offline: "bg-muted-foreground",
  busy: "bg-destructive",
  away: "bg-warning",
};

const statusSizes = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-3.5 w-3.5",
};

/**
 * Polished Avatar component with:
 * - Enforced 1:1 aspect ratio
 * - object-cover for proper image fitting
 * - Consistent sizing across the app
 * - Optional status indicator
 * - Proper fallback with initials
 */
export const PolishedAvatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  PolishedAvatarProps
>(({ 
  className, 
  src, 
  alt, 
  fallbackText, 
  size = "md", 
  showBorder = false,
  status,
  ...props 
}, ref) => {
  const initials = React.useMemo(() => {
    if (!fallbackText) return "?";
    const parts = fallbackText.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fallbackText.slice(0, 2).toUpperCase();
  }, [fallbackText]);

  return (
    <div className="relative inline-flex">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full",
          sizeMap[size],
          showBorder && "ring-2 ring-background shadow-sm",
          className
        )}
        {...props}
      >
        <AvatarPrimitive.Image
          src={src || undefined}
          alt={alt || fallbackText || "Avatar"}
          className="aspect-square h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
        <AvatarPrimitive.Fallback
          className={cn(
            "flex h-full w-full items-center justify-center rounded-full",
            "bg-primary/10 text-primary font-medium"
          )}
          delayMs={0}
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {/* Status indicator */}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-background",
            statusColors[status],
            statusSizes[size]
          )}
        />
      )}
    </div>
  );
});

PolishedAvatar.displayName = "PolishedAvatar";

/**
 * Avatar group for showing multiple users
 */
interface AvatarGroupProps {
  avatars: Array<{
    src?: string | null;
    fallbackText?: string;
    alt?: string;
  }>;
  size?: "xs" | "sm" | "md" | "lg";
  max?: number;
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  size = "sm",
  max = 4,
  className,
}) => {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const overlapMap = {
    xs: "-ml-1.5",
    sm: "-ml-2",
    md: "-ml-2.5",
    lg: "-ml-3",
  };

  return (
    <div className={cn("flex items-center", className)}>
      {visible.map((avatar, index) => (
        <PolishedAvatar
          key={index}
          src={avatar.src}
          fallbackText={avatar.fallbackText}
          alt={avatar.alt}
          size={size}
          showBorder
          className={cn(index > 0 && overlapMap[size])}
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ring-2 ring-background",
            sizeMap[size],
            overlapMap[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};
