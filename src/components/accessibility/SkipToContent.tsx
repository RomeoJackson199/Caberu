/**
 * Skip to Content Component
 * Accessibility enhancement for keyboard users to bypass navigation.
 */

import { cn } from '@/lib/utils';

export function SkipToContent() {
    return (
        <a
            href="#main-content"
            className={cn(
                "sr-only focus:not-sr-only",
                "focus:absolute focus:top-4 focus:left-4 focus:z-[9999]",
                "focus:px-4 focus:py-2 focus:rounded-md",
                "focus:bg-primary focus:text-primary-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "transition-all"
            )}
        >
            Skip to main content
        </a>
    );
}
