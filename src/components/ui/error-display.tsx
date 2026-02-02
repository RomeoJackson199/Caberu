/**
 * Standardized Error Display Components
 * Provides consistent error UI across the application
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, Home, ArrowLeft, WifiOff, ServerCrash, ShieldX, FileX } from 'lucide-react';
import { cn } from '@/lib/utils';

type ErrorVariant = 'card' | 'inline' | 'fullpage';
type ErrorType = 'generic' | 'network' | 'server' | 'auth' | 'notfound';

interface ErrorDisplayProps {
  /** Error title */
  title?: string;
  /** Error message/description */
  message: string;
  /** Display variant */
  variant?: ErrorVariant;
  /** Error type for icon selection */
  type?: ErrorType;
  /** Retry callback */
  onRetry?: () => void;
  /** Custom retry label */
  retryLabel?: string;
  /** Go back callback */
  onBack?: () => void;
  /** Go home callback */
  onHome?: () => void;
  /** Additional className */
  className?: string;
  /** Show icon */
  showIcon?: boolean;
}

const errorConfigs: Record<ErrorType, { icon: React.ElementType; defaultTitle: string }> = {
  generic: { icon: AlertCircle, defaultTitle: 'Something went wrong' },
  network: { icon: WifiOff, defaultTitle: 'Connection error' },
  server: { icon: ServerCrash, defaultTitle: 'Server error' },
  auth: { icon: ShieldX, defaultTitle: 'Access denied' },
  notfound: { icon: FileX, defaultTitle: 'Not found' },
};

export const ErrorDisplay = React.memo<ErrorDisplayProps>(({
  title,
  message,
  variant = 'card',
  type = 'generic',
  onRetry,
  retryLabel = 'Try again',
  onBack,
  onHome,
  className,
  showIcon = true,
}) => {
  const config = errorConfigs[type];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;

  const content = (
    <>
      {showIcon && (
        <div className="mb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Icon className="h-8 w-8 text-destructive" />
          </div>
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {displayTitle}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        {message}
      </p>
      
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="default" className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            {retryLabel}
          </Button>
        )}
        
        {onBack && (
          <Button onClick={onBack} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        )}
        
        {onHome && (
          <Button onClick={onHome} variant="ghost" className="gap-2">
            <Home className="h-4 w-4" />
            Go home
          </Button>
        )}
      </div>
    </>
  );

  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20", className)}>
        {showIcon && <Icon className="h-5 w-5 text-destructive shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">{displayTitle}</p>
          <p className="text-xs text-destructive/80 truncate">{message}</p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="ghost" size="sm" className="shrink-0">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'fullpage') {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted/20",
        className
      )}>
        <div className="text-center max-w-lg">
          {content}
        </div>
      </div>
    );
  }

  // Default: card variant
  return (
    <Card className={cn("max-w-md mx-auto", className)}>
      <CardContent className="pt-8 pb-6 text-center">
        {content}
      </CardContent>
    </Card>
  );
});

ErrorDisplay.displayName = 'ErrorDisplay';

/**
 * Inline error for form fields
 */
interface FieldErrorProps {
  message: string;
  className?: string;
}

export const FieldError = React.memo<FieldErrorProps>(({ message, className }) => (
  <p className={cn("text-sm text-destructive flex items-center gap-1 mt-1", className)}>
    <AlertCircle className="h-3 w-3" />
    {message}
  </p>
));

FieldError.displayName = 'FieldError';

/**
 * Error boundary fallback component
 */
interface ErrorBoundaryFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
}

export const ErrorBoundaryFallback = React.memo<ErrorBoundaryFallbackProps>(({ 
  error, 
  resetErrorBoundary 
}) => (
  <ErrorDisplay
    variant="fullpage"
    type="generic"
    title="Application Error"
    message={error.message || 'An unexpected error occurred. Please try refreshing the page.'}
    onRetry={resetErrorBoundary}
    retryLabel="Refresh"
    onHome={() => window.location.href = '/'}
  />
));

ErrorBoundaryFallback.displayName = 'ErrorBoundaryFallback';

export default ErrorDisplay;
