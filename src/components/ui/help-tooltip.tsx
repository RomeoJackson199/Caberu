import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, Info, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HelpTooltipProps {
  content: string | React.ReactNode;
  variant?: 'help' | 'info' | 'tip';
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
}

/**
 * Contextual Help Tooltip Component
 *
 * Provides contextual help for complex features with different visual styles:
 * - help: Question mark icon (for help/documentation)
 * - info: Info icon (for additional information)
 * - tip: Lightbulb icon (for tips and best practices)
 *
 * @example
 * <HelpTooltip content="This feature helps you manage...">
 *   <Button>Complex Feature</Button>
 * </HelpTooltip>
 *
 * @example
 * <HelpTooltip
 *   variant="tip"
 *   content="Pro tip: Use Cmd+K to open the command palette"
 * />
 */
export function HelpTooltip({
  content,
  variant = 'help',
  side = 'top',
  className,
  iconClassName,
  children,
}: HelpTooltipProps) {
  const Icon = variant === 'help' ? HelpCircle : variant === 'info' ? Info : Lightbulb;

  const iconColors = {
    help: 'text-blue-500 dark:text-blue-400',
    info: 'text-gray-500 dark:text-gray-400',
    tip: 'text-amber-500 dark:text-amber-400',
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {children || (
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center',
                'transition-colors hover:opacity-70',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full',
                className
              )}
              aria-label={`Show ${variant}`}
            >
              <Icon className={cn('h-4 w-4', iconColors[variant], iconClassName)} />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-xs text-sm"
          sideOffset={5}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline Help Text - For longer explanations below form fields
 */
export interface HelpTextProps {
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'success';
  className?: string;
}

export function HelpText({ children, variant = 'default', className }: HelpTextProps) {
  const variantStyles = {
    default: 'text-muted-foreground',
    warning: 'text-amber-600 dark:text-amber-400',
    success: 'text-green-600 dark:text-green-400',
  };

  return (
    <p className={cn('text-sm', variantStyles[variant], className)}>
      {children}
    </p>
  );
}
