import { LucideIcon, Plus, FileText, Calendar, Users, Package, CreditCard, MessageSquare } from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";
import { cn } from "@/lib/utils";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  variant?: "default" | "compact" | "illustrated";
  actions?: EmptyStateAction[];
  illustration?: "documents" | "calendar" | "users" | "inventory" | "payments" | "messages";
  className?: string;
}

// Simple decorative illustrations using icons
const illustrations = {
  documents: [FileText, FileText, FileText],
  calendar: [Calendar],
  users: [Users],
  inventory: [Package, Package, Package],
  payments: [CreditCard],
  messages: [MessageSquare, MessageSquare],
};

const IllustratedIcon = ({
  type,
  mainIcon: MainIcon
}: {
  type?: keyof typeof illustrations;
  mainIcon: LucideIcon;
}) => {
  const decorativeIcons = type ? illustrations[type] : null;

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl" />

      {/* Decorative floating icons */}
      {decorativeIcons && decorativeIcons.slice(0, 3).map((DecorIcon, i) => (
        <DecorIcon
          key={i}
          className={cn(
            "absolute h-5 w-5 text-primary/30 animate-pulse-soft",
            i === 0 && "top-2 left-4",
            i === 1 && "bottom-4 right-2",
            i === 2 && "top-8 right-6"
          )}
          style={{ animationDelay: `${i * 300}ms` }}
        />
      ))}

      {/* Main icon */}
      <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
        <MainIcon className="h-10 w-10 text-primary animate-pulse-soft" />
      </div>
    </div>
  );
};

/**
 * Enhanced Empty State Component
 * 
 * Features:
 * - Subtle breathing animation on icon
 * - Gradient background on icon container
 * - Smooth hover effects on buttons
 * - Three variants: default, compact, illustrated
 * - Support for actions array or legacy props
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = "default",
  actions,
  illustration,
  className,
}: EmptyStateProps) => {
  // Convert legacy props to actions array
  const allActions: EmptyStateAction[] = actions || [];
  if (actionLabel && onAction && !actions) {
    allActions.push({ label: actionLabel, onClick: onAction, variant: "default", icon: Plus });
  }
  if (secondaryActionLabel && onSecondaryAction && !actions) {
    allActions.push({ label: secondaryActionLabel, onClick: onSecondaryAction, variant: "outline" });
  }

  if (variant === "compact") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-8 text-center animate-fade-in",
        className
      )}>
        <div className="relative w-12 h-12 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center mb-3 shadow-sm group">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Icon className="h-6 w-6 text-muted-foreground animate-pulse-soft" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
        {allActions.length > 0 && (
          <div className="flex gap-2">
            {allActions.map((action, i) => (
              <Button
                key={i}
                onClick={action.onClick}
                size="sm"
                variant={action.variant || "default"}
                className="transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {action.icon && <action.icon className="h-4 w-4 mr-1.5" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === "illustrated") {
    return (
      <Card className={cn(
        "flex flex-col items-center justify-center py-20 px-8 text-center border-dashed border-2 bg-muted/5 animate-fade-in relative overflow-hidden",
        className
      )}>
        {/* Floating orbs for visual interest */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-float" />
        <div className="absolute bottom-10 left-10 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none animate-float" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 group">
          <IllustratedIcon type={illustration} mainIcon={Icon} />
        </div>

        <h3 className="relative z-10 text-2xl font-bold text-foreground mb-3 mt-6">
          {title}
        </h3>
        <p className="relative z-10 text-muted-foreground max-w-md mb-8 leading-relaxed">
          {description}
        </p>

        {allActions.length > 0 && (
          <div className="relative z-10 flex flex-wrap gap-3 justify-center">
            {allActions.map((action, i) => (
              <Button
                key={i}
                onClick={action.onClick}
                variant={action.variant || "default"}
                size="lg"
                className="transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </Card>
    );
  }

  // Default variant
  return (
    <Card className={cn(
      "flex flex-col items-center justify-center py-16 px-6 text-center relative overflow-hidden animate-fade-in",
      className
    )}>
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] pointer-events-none" />

      {/* Floating orbs for visual interest */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="absolute bottom-10 left-10 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none animate-float" style={{ animationDelay: '1s' }} />

      {/* Icon container with breathing animation */}
      <div className="relative z-10">
        <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center mb-6 group">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 dark:from-primary/25 dark:via-primary/15 dark:to-primary/10 rounded-2xl transition-all duration-300 group-hover:scale-110" />
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_30px_-5px] shadow-primary/30" />
          {/* Icon */}
          <Icon className="relative h-10 w-10 text-primary animate-pulse-soft" />
        </div>
      </div>

      <h3 className="relative z-10 text-xl font-bold text-foreground mb-2">
        {title}
      </h3>
      <p className="relative z-10 text-muted-foreground max-w-md mb-8">
        {description}
      </p>

      {allActions.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-3 justify-center">
          {allActions.map((action, i) => (
            <Button
              key={i}
              onClick={action.onClick}
              variant={action.variant || "default"}
              className="transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            >
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
};
