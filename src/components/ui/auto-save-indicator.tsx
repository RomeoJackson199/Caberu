import { useState, useEffect } from "react";
import { Check, Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  className?: string;
  showText?: boolean;
  onRetry?: () => void;
}

export function AutoSaveIndicator({ 
  status, 
  className, 
  showText = true,
  onRetry 
}: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (status === "saved") {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const getContent = () => {
    switch (status) {
      case "saving":
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            {showText && <span>Saving...</span>}
          </>
        );
      case "saved":
        return (
          <>
            <Check className="h-4 w-4 text-green-500" />
            {showText && <span>Saved</span>}
          </>
        );
      case "error":
        return (
          <>
            <CloudOff className="h-4 w-4 text-destructive" />
            {showText && (
              <span>
                Save failed
                {onRetry && (
                  <button 
                    onClick={onRetry}
                    className="ml-1 underline hover:no-underline"
                  >
                    Retry
                  </button>
                )}
              </span>
            )}
          </>
        );
      default:
        return (
          <>
            <Cloud className="h-4 w-4 text-muted-foreground/50" />
            {showText && <span className="text-muted-foreground/50">Auto-save enabled</span>}
          </>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className={cn(
          "flex items-center gap-2 text-sm",
          status === "error" && "text-destructive",
          status === "saved" && "text-green-500",
          status === "saving" && "text-muted-foreground",
          className
        )}
      >
        {getContent()}
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for auto-save functionality
interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({ 
  data, 
  onSave, 
  delay = 1000, 
  enabled = true 
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedData, setLastSavedData] = useState<T>(data);

  useEffect(() => {
    if (!enabled) return;
    
    // Skip if data hasn't changed
    if (JSON.stringify(data) === JSON.stringify(lastSavedData)) return;

    setStatus("saving");
    
    const timer = setTimeout(async () => {
      try {
        await onSave(data);
        setLastSavedData(data);
        setStatus("saved");
      } catch (error) {
        setStatus("error");
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [data, lastSavedData, onSave, delay, enabled]);

  const retry = async () => {
    setStatus("saving");
    try {
      await onSave(data);
      setLastSavedData(data);
      setStatus("saved");
    } catch (error) {
      setStatus("error");
    }
  };

  return { status, retry };
}
