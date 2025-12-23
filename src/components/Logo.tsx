/**
 * Caberu Logo Component
 * Professional logo with multiple size variants
 * Logos are served from Supabase public storage
 */

import { getCaberuLogo } from "@/lib/caberu-branding";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
  className?: string;
  /** Set to true for LCP-critical logos (e.g., header) to disable lazy loading */
  priority?: boolean;
}

const sizeMap = {
  sm: { height: 48, width: 140 },
  md: { height: 64, width: 190 },
  lg: { height: 80, width: 240 },
  xl: { height: 96, width: 280 },
};

export function Logo({ size = "md", variant = "full", className = "", priority = false }: LogoProps) {
  const logoSize = sizeMap[size];
  const logoSrc = getCaberuLogo(variant);

  return (
    <img
      src={logoSrc}
      alt={variant === "full" ? "Caberu Healthcare Solutions" : "Caberu"}
      width={logoSize.width}
      height={logoSize.height}
      style={{
        maxHeight: logoSize.height,
        maxWidth: logoSize.width,
        width: "100%",
        height: "auto",
      }}
      className={`object-contain ${className}`}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      draggable={false}
    />
  );
}

/**
 * Animated Logo for splash screens and loading states
 */
export function AnimatedLogo({ size = "lg", variant = "full" }: { size?: "sm" | "md" | "lg" | "xl"; variant?: "full" | "icon" }) {
  const logoSize = sizeMap[size];
  const logoSrc = getCaberuLogo(variant);

  return (
    <div className="flex flex-col items-center gap-4 animate-pulse">
      <img
        src={logoSrc}
        alt={variant === "full" ? "Caberu Healthcare Solutions" : "Caberu"}
        style={{
          maxHeight: logoSize.height * 1.5,
          maxWidth: logoSize.width * 1.5,
          width: "100%",
          height: "auto",
        }}
        className="object-contain"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

/**
 * Favicon-ready icon (simplified for small sizes)
 */
export function FaviconIcon() {
  const logoSrc = getCaberuLogo("icon");

  return (
    <img
      src={logoSrc}
      alt="Caberu Icon"
      width="32"
      height="32"
      className="object-contain"
    />
  );
}
