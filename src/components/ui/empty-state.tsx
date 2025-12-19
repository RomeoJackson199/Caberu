import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  variant?: "default" | "compact";
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = "default",
}: EmptyStateProps) => {
  if (variant === "compact") {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button onClick={onAction} size="sm">
            {actionLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-2xl flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-md mb-8">
        {description}
      </p>
      <div className="flex gap-3">
        {actionLabel && onAction && (
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button onClick={onSecondaryAction} variant="outline">
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </Card>
  );
};
