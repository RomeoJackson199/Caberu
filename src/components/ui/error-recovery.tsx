import { useState } from "react";
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, Loader2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type ErrorType = "network" | "server" | "unknown";

interface ErrorRecoveryProps {
  error: Error | string;
  onRetry: () => Promise<void> | void;
  className?: string;
  compact?: boolean;
}

function getErrorType(error: Error | string): ErrorType {
  const message = typeof error === "string" ? error : error.message;
  const lowerMessage = message.toLowerCase();
  
  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("fetch") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("offline")
  ) {
    return "network";
  }
  
  if (
    lowerMessage.includes("500") ||
    lowerMessage.includes("502") ||
    lowerMessage.includes("503") ||
    lowerMessage.includes("server")
  ) {
    return "server";
  }
  
  return "unknown";
}

const errorConfig = {
  network: {
    icon: WifiOff,
    title: "Connection Issue",
    description: "Please check your internet connection and try again.",
    buttonText: "Retry Connection",
  },
  server: {
    icon: ServerCrash,
    title: "Server Error",
    description: "Our servers are having issues. Please try again in a moment.",
    buttonText: "Try Again",
  },
  unknown: {
    icon: AlertCircle,
    title: "Something Went Wrong",
    description: "An unexpected error occurred. Please try again.",
    buttonText: "Retry",
  },
};

export function ErrorRecovery({ error, onRetry, className, compact = false }: ErrorRecoveryProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const errorType = getErrorType(error);
  const config = errorConfig[errorType];
  const Icon = config.icon;
  
  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20",
          className
        )}
      >
        <Icon className="h-5 w-5 text-destructive flex-shrink-0" />
        <p className="text-sm text-destructive flex-1">{config.title}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetry}
          disabled={isRetrying}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {isRetrying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        className
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="mb-4 p-4 rounded-full bg-destructive/10"
      >
        <Icon className="h-8 w-8 text-destructive" />
      </motion.div>
      
      <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{config.description}</p>
      
      <Button
        onClick={handleRetry}
        disabled={isRetrying}
        variant={retryCount > 2 ? "outline" : "default"}
      >
        {isRetrying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Retrying...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            {config.buttonText}
          </>
        )}
      </Button>
      
      {retryCount > 2 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-sm text-muted-foreground"
        >
          Still having issues? Try refreshing the page or contact support.
        </motion.p>
      )}
    </motion.div>
  );
}

// Hook for error recovery state
interface UseErrorRecoveryOptions {
  onError?: (error: Error) => void;
  maxRetries?: number;
}

export function useErrorRecovery<T>(
  asyncFn: () => Promise<T>,
  options: UseErrorRecoveryOptions = {}
) {
  const { onError, maxRetries = 3 } = options;
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const execute = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn();
      setData(result);
      setRetryCount(0);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      onError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const retry = async () => {
    if (retryCount >= maxRetries) {
      return;
    }
    setRetryCount((prev) => prev + 1);
    return execute();
  };

  return {
    data,
    error,
    isLoading,
    execute,
    retry,
    retryCount,
    canRetry: retryCount < maxRetries,
  };
}
