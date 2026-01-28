/**
 * Layout Components - Reusable page and section layouts
 * Common layout patterns extracted from screens for consistency and maintainability
 */

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TabsTrigger } from "@/components/ui/tabs";
import { AnimatedBackground, SectionHeader, StatCard } from "@/components/ui/polished-components";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

/**
 * Page Header with Gradient Background
 * Common pattern for patient pages with gradient, animated background, and section header
 */
interface PageHeaderWithGradientProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: string;
  iconGradient?: string;
  actions?: React.ReactNode;
  badge?: {
    label: string;
    className?: string;
  };
  stats?: Array<{
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    gradient?: string;
  }>;
  loading?: boolean;
}

export function PageHeaderWithGradient({
  icon,
  title,
  description,
  gradient = "from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20",
  iconGradient = "from-blue-600 to-purple-600",
  actions,
  badge,
  stats,
  loading,
}: PageHeaderWithGradientProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl p-6 border border-blue-100 bg-gradient-to-br", gradient)}>
      <AnimatedBackground />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <SectionHeader icon={icon} title={title} description={description} gradient={iconGradient} />

          <div className="flex items-center gap-2">
            {badge && <Badge className={badge.className}>{badge.label}</Badge>}
            {actions}
          </div>
        </div>

        {stats && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {stats.map((stat, index) => (
              <StatCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                description={stat.description}
                gradient={stat.gradient}
                loading={loading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Auth Split Layout
 * Two-column layout for authentication pages (form + hero section)
 */
interface AuthSplitLayoutProps {
  formSide: "left" | "right";
  formContent: React.ReactNode;
  heroContent: React.ReactNode;
  heroGradient?: string;
}

export function AuthSplitLayout({
  formSide = "right",
  formContent,
  heroContent,
  heroGradient = "from-primary via-primary/90 to-primary/80",
}: AuthSplitLayoutProps) {
  const heroSection = (
    <div className={cn("hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br", heroGradient)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
      <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
        {heroContent}
      </div>
    </div>
  );

  const formSection = (
    <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
      <div className="w-full max-w-sm">
        {formContent}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {formSide === "left" ? (
        <>
          {formSection}
          {heroSection}
        </>
      ) : (
        <>
          {heroSection}
          {formSection}
        </>
      )}
    </div>
  );
}

/**
 * Social Login Button
 * Reusable button for social authentication providers
 */
interface SocialLoginButtonProps {
  provider: "google" | "apple" | "microsoft";
  onClick: () => void;
  disabled?: boolean;
  size?: "default" | "lg" | "sm";
  children?: React.ReactNode;
}

export function SocialLoginButton({
  provider,
  onClick,
  disabled,
  size = "default",
  children,
}: SocialLoginButtonProps) {
  const configs = {
    google: {
      icon: (
        <svg className={cn(size === "lg" ? "h-5 w-5" : "h-4 w-4")} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      ),
      label: children || "Continue with Google",
    },
    apple: {
      icon: (
        <svg className={cn(size === "lg" ? "h-5 w-5" : "h-4 w-4")} fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      ),
      label: children || "Continue with Apple",
    },
    microsoft: {
      icon: (
        <svg className={cn(size === "lg" ? "h-5 w-5" : "h-4 w-4")} viewBox="0 0 24 24">
          <path fill="#f25022" d="M11.4 11.4H2V2h9.4v9.4z" />
          <path fill="#00a4ef" d="M22 11.4h-9.4V2H22v9.4z" />
          <path fill="#7fba00" d="M11.4 22H2v-9.4h9.4V22z" />
          <path fill="#ffb900" d="M22 22h-9.4v-9.4H22V22z" />
        </svg>
      ),
      label: children || "Continue with Microsoft",
    },
  };

  const config = configs[provider];

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn("w-full border-2 hover:bg-accent", size === "lg" && "h-12")}
    >
      <span className="mr-2">{config.icon}</span>
      {config.label}
    </Button>
  );
}

/**
 * Form Divider
 * Horizontal divider with text (commonly "or" in auth forms)
 */
interface FormDividerProps {
  text?: string;
}

export function FormDivider({ text = "or" }: FormDividerProps) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

/**
 * Profile Card
 * Reusable card with icon header for forms and settings sections
 */
interface ProfileCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  iconColor?: string;
  children: React.ReactNode;
}

export function ProfileCard({
  icon: Icon,
  title,
  description,
  iconColor = "bg-primary/10 text-primary",
  children,
}: ProfileCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Icon Tab Trigger
 * Tab trigger with icon and responsive text (hides text on mobile)
 */
interface IconTabTriggerProps {
  value: string;
  icon: LucideIcon;
  label: string;
  mobileLabel?: string;
}

export function IconTabTrigger({ value, icon: Icon, label, mobileLabel }: IconTabTriggerProps) {
  return (
    <TabsTrigger value={value} className="gap-2">
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
      {mobileLabel && <span className="sm:hidden">{mobileLabel}</span>}
    </TabsTrigger>
  );
}

/**
 * Hero Feature Card
 * Feature card for auth hero sections with icon, title, and description
 */
interface HeroFeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function HeroFeatureCard({ icon: Icon, title, description }: HeroFeatureCardProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
      <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h3 className="font-semibold mb-1 text-white">{title}</h3>
        <p className="text-sm text-white/80">{description}</p>
      </div>
    </div>
  );
}

/**
 * Stats Grid
 * Responsive grid container for stat cards
 */
interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function StatsGrid({ children, columns = 3 }: StatsGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return <div className={cn("grid gap-4", gridCols[columns])}>{children}</div>;
}

/**
 * Form Section
 * Container for form sections with consistent spacing
 */
interface FormSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ children, className }: FormSectionProps) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

/**
 * Page Container
 * Standard page container with consistent spacing
 */
interface PageContainerProps {
  children: React.ReactNode;
  spacing?: "default" | "comfortable" | "compact";
}

export function PageContainer({ children, spacing = "default" }: PageContainerProps) {
  const spacingClasses = {
    default: "space-y-6",
    comfortable: "space-y-8",
    compact: "space-y-4",
  };

  return <div className={cn(spacingClasses[spacing], "pb-8")}>{children}</div>;
}
