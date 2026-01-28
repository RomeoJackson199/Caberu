import { cn } from "@/lib/utils";

/**
 * SkipNavigation Component
 *
 * Provides a keyboard-accessible link that allows users to skip repetitive
 * navigation and jump directly to the main content.
 *
 * Features:
 * - Only visible when focused (keyboard navigation)
 * - WCAG 2.1 Level A compliance
 * - High contrast focus indicator
 * - Smooth scroll to target
 *
 * Usage:
 * Place at the very top of your app layout, before any other content.
 * Ensure your main content has id="main-content"
 */

interface SkipNavigationProps {
  /** Target element ID to skip to (default: "main-content") */
  targetId?: string;
  /** Custom text for the skip link (default: "Skip to main content") */
  text?: string;
  /** Additional CSS classes */
  className?: string;
}

export function SkipNavigation({
  targetId = "main-content",
  text = "Skip to main content",
  className,
}: SkipNavigationProps) {
  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleSkip}
      className={cn(
        // Hidden by default
        "sr-only",
        // Visible on focus
        "focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[10000]",
        // Styling
        "inline-block px-6 py-3 rounded-lg",
        "bg-primary text-primary-foreground font-semibold text-sm",
        // Enhanced focus indicator
        "focus:ring-[3px] focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        "focus:shadow-[0_0_0_4px_rgba(37,99,235,0.3)]",
        // Animation
        "transition-all duration-200",
        "focus:scale-105",
        className
      )}
      tabIndex={0}
    >
      {text}
    </a>
  );
}

/**
 * SkipToSection Component
 *
 * Provides multiple skip links for complex layouts with multiple sections.
 */

interface SkipToSectionLink {
  id: string;
  label: string;
}

interface SkipToSectionProps {
  links: SkipToSectionLink[];
  className?: string;
}

export function SkipToSection({ links, className }: SkipToSectionProps) {
  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      aria-label="Skip navigation"
      className={cn(
        "sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-4 focus-within:left-4 focus-within:z-[10000]",
        "bg-background border-2 border-primary rounded-lg p-4 shadow-xl",
        className
      )}
    >
      <p className="text-sm font-semibold mb-2 text-foreground">Skip to:</p>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={`#${link.id}`}
              onClick={(e) => handleSkip(e, link.id)}
              className={cn(
                "inline-block px-4 py-2 rounded-md text-sm font-medium",
                "bg-muted hover:bg-primary hover:text-primary-foreground",
                "focus:ring-[3px] focus:ring-primary focus:ring-offset-2",
                "transition-colors duration-150"
              )}
              tabIndex={0}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
