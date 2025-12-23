import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";

interface MobilePageWrapperProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showNav?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  headerVariant?: "default" | "transparent" | "blur";
  navVariant?: "default" | "patient" | "dentist";
  headerActions?: ReactNode;
  className?: string;
  contentClassName?: string;
  fullHeight?: boolean;
}

export function MobilePageWrapper({
  children,
  title,
  subtitle,
  showHeader = true,
  showNav = true,
  showBack = false,
  onBack,
  headerVariant = "blur",
  navVariant = "default",
  headerActions,
  className,
  contentClassName,
  fullHeight = true,
}: MobilePageWrapperProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div 
      className={cn(
        "min-h-screen bg-background",
        fullHeight && "flex flex-col",
        className
      )}
    >
      {/* Header */}
      {showHeader && title && (
        <MobileHeader
          title={title}
          subtitle={subtitle}
          showBack={showBack}
          onBack={onBack}
          variant={headerVariant}
          actions={headerActions}
        />
      )}

      {/* Main Content */}
      <motion.main
        className={cn(
          "flex-1",
          showNav && "pb-24", // Space for bottom nav
          showHeader && title && "pt-0", // Header handles its own spacing
          contentClassName
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>

      {/* Bottom Navigation */}
      {showNav && <MobileBottomNav variant={navVariant} />}
    </div>
  );
}

// Mobile section component for consistent spacing
interface MobileSectionProps {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function MobileSection({
  children,
  title,
  action,
  className,
  noPadding = false,
}: MobileSectionProps) {
  return (
    <section className={cn("mb-6", className)}>
      {(title || action) && (
        <div className={cn(
          "flex items-center justify-between mb-3",
          !noPadding && "px-4"
        )}>
          {title && (
            <h2 className="text-lg font-semibold">{title}</h2>
          )}
          {action}
        </div>
      )}
      <div className={cn(!noPadding && "px-4")}>
        {children}
      </div>
    </section>
  );
}

// Mobile horizontal scroll container
interface MobileScrollRowProps {
  children: ReactNode;
  className?: string;
}

export function MobileScrollRow({ children, className }: MobileScrollRowProps) {
  return (
    <div 
      className={cn(
        "flex gap-3 overflow-x-auto pb-2 -mx-4 px-4",
        "scrollbar-hide snap-x snap-mandatory",
        className
      )}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {children}
    </div>
  );
}

// Mobile card with consistent styling
interface MobileCardItemProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MobileCardItem({ children, className, onClick }: MobileCardItemProps) {
  return (
    <motion.div
      className={cn(
        "bg-card border border-border rounded-2xl p-4",
        "transition-all duration-200",
        onClick && "cursor-pointer active:scale-[0.98] active:bg-muted/50",
        className
      )}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {children}
    </motion.div>
  );
}
