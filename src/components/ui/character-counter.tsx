import { cn } from '@/lib/utils';

export interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
  warningThreshold?: number; // Show warning when this % is reached (default 90%)
}

/**
 * Character Counter Component
 *
 * Shows character count with visual feedback:
 * - Normal: under warning threshold
 * - Warning: at warning threshold
 * - Danger: at or over max
 */
export function CharacterCounter({
  current,
  max,
  className,
  warningThreshold = 0.9
}: CharacterCounterProps) {
  const percentage = current / max;
  const isWarning = percentage >= warningThreshold && percentage < 1;
  const isDanger = percentage >= 1;
  const isOverLimit = current > max;

  return (
    <div
      className={cn(
        'text-xs font-medium transition-colors',
        {
          'text-muted-foreground': !isWarning && !isDanger,
          'text-amber-600 dark:text-amber-400': isWarning,
          'text-destructive': isDanger
        },
        className
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {current} / {max}
      {isOverLimit && (
        <span className="ml-1 text-destructive font-semibold">
          ({current - max} over limit)
        </span>
      )}
    </div>
  );
}
