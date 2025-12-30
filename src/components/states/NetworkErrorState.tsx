import React from "react";
import { WifiOff, RefreshCw, AlertTriangle, ServerCrash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorType = "offline" | "server" | "generic";

interface NetworkErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

const errorConfig: Record<ErrorType, { icon: React.ElementType; defaultTitle: string; defaultMessage: string; iconBg: string; iconColor: string }> = {
  offline: {
    icon: WifiOff,
    defaultTitle: "You're offline",
    defaultMessage: "Check your internet connection and try again.",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  server: {
    icon: ServerCrash,
    defaultTitle: "Server unavailable",
    defaultMessage: "We're having trouble connecting. Please try again later.",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
  },
  generic: {
    icon: AlertTriangle,
    defaultTitle: "Something went wrong",
    defaultMessage: "An unexpected error occurred. Please try again.",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
};

export function NetworkErrorState({
  type = "generic",
  title,
  message,
  onRetry,
  className,
  compact = false,
}: NetworkErrorStateProps) {
  const config = errorConfig[type];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 p-4 rounded-lg border border-dashed", className)}>
        <div className={cn("p-2 rounded-full", config.iconBg)}>
          <Icon className={cn("h-4 w-4", config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{title || config.defaultTitle}</p>
          <p className="text-xs text-muted-foreground truncate">{message || config.defaultMessage}</p>
        </div>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="flex-shrink-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="py-12 text-center space-y-4">
        {/* Icon */}
        <div className={cn("mx-auto w-16 h-16 rounded-full flex items-center justify-center", config.iconBg)}>
          <Icon className={cn("h-8 w-8", config.iconColor)} />
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold">{title || config.defaultTitle}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {message || config.defaultMessage}
          </p>
        </div>

        {/* Retry Button */}
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2 mt-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default NetworkErrorState;
