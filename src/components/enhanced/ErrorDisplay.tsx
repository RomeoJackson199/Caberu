import { AlertCircle, RefreshCw, XCircle, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useRetry } from '@/hooks/useRetry';
import { getUserFriendlyErrorMessage, isNetworkError } from '@/lib/errorHandling';

export interface ErrorDisplayProps {
  error: Error | unknown;
  onRetry?: () => void | Promise<void>;
  title?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'warning';
  showRetry?: boolean;
  retryText?: string;
  maxRetries?: number;
}

/**
 * Enhanced Error Display Component
 *
 * Features:
 * - User-friendly error messages
 * - Automatic retry with exponential backoff
 * - Network error detection
 * - Visual feedback during retry
 * - Accessible error messaging
 */
export function ErrorDisplay({
  error,
  onRetry,
  title,
  className,
  variant = 'destructive',
  showRetry = true,
  retryText = 'Try Again',
  maxRetries = 3
}: ErrorDisplayProps) {
  const { retry, isRetrying, retryCount } = useRetry({
    maxRetries,
    delay: 1000,
    backoff: true
  });

  const errorMessage = getUserFriendlyErrorMessage(
    error,
    'An unexpected error occurred. Please try again.'
  );

  const isNetwork = isNetworkError(error);

  const handleRetry = async () => {
    if (!onRetry) return;

    try {
      await retry(async () => {
        await onRetry();
      });
    } catch (err) {
      // Error will be displayed by the component
    }
  };

  const Icon = isNetwork ? WifiOff : variant === 'warning' ? AlertCircle : XCircle;

  return (
    <Alert
      variant={variant}
      className={cn('animate-in fade-in-0 slide-in-from-top-2', className)}
    >
      <Icon className="h-5 w-5" />
      <div className="flex-1">
        <AlertTitle className="font-semibold">
          {title || (isNetwork ? 'Network Error' : 'Error')}
        </AlertTitle>
        <AlertDescription className="mt-2">
          {errorMessage}
          {retryCount > 0 && (
            <span className="block mt-1 text-sm opacity-75">
              Retry attempt {retryCount} of {maxRetries}
            </span>
          )}
        </AlertDescription>
        {showRetry && onRetry && (
          <div className="mt-4">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  {isNetwork ? <Wifi className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                  {retryText}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Alert>
  );
}

/**
 * Compact Error Display - For inline errors in forms or smaller spaces
 */
export interface CompactErrorProps {
  error?: string | Error;
  className?: string;
}

export function CompactError({ error, className }: CompactErrorProps) {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;

  return (
    <div
      className={cn(
        'flex items-start gap-2 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1',
        className
      )}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
