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
            "absolute h-5 w-5 text-primary/30 animate-pulse",
            i === 0 && "top-2 left-4",
            i === 1 && "bottom-4 right-2",
            i === 2 && "top-8 right-6"
          )}
          style={{ animationDelay: `${i * 300}ms` }}
        />
      ))}
      
      {/* Main icon */}
      <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center shadow-lg">
        <MainIcon className="h-10 w-10 text-primary" />
      </div>
    </div>
  );
};

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
        "flex flex-col items-center justify-center py-8 text-center animate-in fade-in-50 duration-300",
        className
      )}>
        <div className="w-12 h-12 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center mb-3 shadow-sm">
          <Icon className="h-6 w-6 text-muted-foreground" />
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
                className="hover-scale"
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
        "flex flex-col items-center justify-center py-20 px-8 text-center border-dashed border-2 bg-muted/5 animate-in fade-in-50 duration-500",
        className
      )}>
        <IllustratedIcon type={illustration} mainIcon={Icon} />
        
        <h3 className="text-2xl font-bold text-foreground mb-3 mt-6">
          {title}
        </h3>
        <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
          {description}
        </p>
        
        {allActions.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center">
            {allActions.map((action, i) => (
              <Button 
                key={i}
                onClick={action.onClick}
                variant={action.variant || "default"}
                size="lg"
                className="hover-scale"
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
      "flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in-50 duration-300",
      className
    )}>
      <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform">
        <Icon className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-md mb-8">
        {description}
      </p>
      {allActions.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center">
          {allActions.map((action, i) => (
            <Button 
              key={i}
              onClick={action.onClick}
              variant={action.variant || "default"}
              className="hover-scale"
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
