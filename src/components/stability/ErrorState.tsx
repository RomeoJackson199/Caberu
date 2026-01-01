import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, WifiOff, ShieldAlert, Home } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ErrorType = "network" | "auth" | "permission" | "notFound" | "generic";

interface ErrorStateProps {
  title?: string;
  message?: string;
  type?: ErrorType;
  onRetry?: () => void;
  onGoHome?: () => void;
  retrying?: boolean;
  className?: string;
  compact?: boolean;
}

const errorConfig: Record<ErrorType, { icon: React.ElementType; defaultTitle: string; defaultMessage: string; color: string }> = {
  network: {
    icon: WifiOff,
    defaultTitle: "Connection Issue",
    defaultMessage: "We couldn't connect to our servers. Please check your internet connection and try again.",
    color: "text-orange-500",
  },
  auth: {
    icon: ShieldAlert,
    defaultTitle: "Session Expired",
    defaultMessage: "Your session has expired. Please log in again to continue.",
    color: "text-red-500",
  },
  permission: {
    icon: ShieldAlert,
    defaultTitle: "Access Denied",
    defaultMessage: "You don't have permission to view this content. Please contact your administrator.",
    color: "text-red-500",
  },
  notFound: {
    icon: AlertCircle,
    defaultTitle: "Not Found",
    defaultMessage: "The content you're looking for doesn't exist or has been removed.",
    color: "text-gray-500",
  },
  generic: {
    icon: AlertCircle,
    defaultTitle: "Something Went Wrong",
    defaultMessage: "We encountered an unexpected error. Please try again or contact support if the issue persists.",
    color: "text-red-500",
  },
};

/**
 * Renders an error UI tailored to a specific error `type`, with optional actions and a compact mode.
 *
 * Displays a type-specific icon, title, and message; when `compact` is true it renders a condensed inline row,
 * otherwise it renders a centered card with action buttons as provided.
 *
 * @param type - The error variant to display (affects icon, default title/message, and styling)
 * @param title - Optional override for the displayed title; falls back to the type's default title
 * @param message - Optional override for the displayed message; falls back to the type's default message
 * @param onRetry - Optional callback shown as a "Retry"/"Try Again" action when provided
 * @param onGoHome - Optional callback shown as a "Go Home" action when provided
 * @param retrying - When true, indicates a retry is in progress and updates button states/labels accordingly
 * @param compact - When true, render a compact inline error row instead of the full centered card
 * @param className - Optional additional CSS classes applied to the root container
 * @returns A React element representing the configured error state UI
 */
export function ErrorState({
  title,
  message,
  type = "generic",
  onRetry,
  onGoHome,
  retrying = false,
  className,
  compact = false,
}: ErrorStateProps) {
  const config = errorConfig[type];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex items-center gap-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800", className)}
      >
        <Icon className={cn("h-6 w-6 flex-shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">{displayTitle}</p>
          <p className="text-xs text-red-600 dark:text-red-400 truncate">{displayMessage}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={retrying}
            className="flex-shrink-0 border-red-200 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900"
          >
            {retrying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </>
            )}
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("flex items-center justify-center p-6", className)}
    >
      <Card className="max-w-md w-full border-2 shadow-lg">
        <CardHeader className="text-center pb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className={cn(
              "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4",
              type === "network" ? "bg-orange-100 dark:bg-orange-950" :
              type === "auth" || type === "permission" ? "bg-red-100 dark:bg-red-950" :
              "bg-gray-100 dark:bg-gray-800"
            )}
          >
            <Icon className={cn("h-8 w-8", config.color)} />
          </motion.div>
          <CardTitle className="text-xl">{displayTitle}</CardTitle>
          <CardDescription className="text-base mt-2">{displayMessage}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          {onRetry && (
            <Button
              onClick={onRetry}
              disabled={retrying}
              className="gap-2"
            >
              {retrying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
          )}
          {onGoHome && (
            <Button variant="outline" onClick={onGoHome} className="gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Empty state component for when data is empty (not an error)
interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Renders a centered empty-state UI with an icon, title, description, and an optional action button.
 *
 * @param icon - React component used as the large icon inside the circular background.
 * @param title - Primary heading text displayed below the icon.
 * @param description - Supporting descriptive text displayed under the title.
 * @param action - Optional action containing `label` and `onClick`; when provided, a button is rendered.
 * @param className - Additional CSS classes applied to the root container.
 * @returns A JSX element that presents the empty-state UI.
 */
export function EmptyState({
  icon: Icon = AlertCircle,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col items-center justify-center p-8 text-center", className)}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4"
      >
        <Icon className="h-8 w-8 text-gray-400" />
      </motion.div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </motion.div>
  );
}