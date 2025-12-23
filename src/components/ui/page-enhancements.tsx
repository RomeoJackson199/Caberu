/**
 * Page Enhancement Components
 * Reusable components for improving page UX across the application
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  Sun, Moon, Cloud, Sparkles, Search, X, Filter,
  ArrowRight, ChevronRight, Clock, Calendar, 
  CheckCircle2, AlertCircle, Bell, MessageSquare,
  Zap, TrendingUp, Users, Star
} from "lucide-react";
import { AnimatedCounter, PulseIndicator, TypingIndicator } from "./micro-interactions";

/**
 * Time of Day Greeting
 */
interface TimeGreetingProps {
  name?: string;
  className?: string;
  showDate?: boolean;
}

export function TimeGreeting({ name, className, showDate = true }: TimeGreetingProps) {
  const [greeting, setGreeting] = useState({ text: "Good day", icon: Sun });
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting({ text: "Good morning", icon: Sun });
    } else if (hour >= 12 && hour < 17) {
      setGreeting({ text: "Good afternoon", icon: Cloud });
    } else if (hour >= 17 && hour < 21) {
      setGreeting({ text: "Good evening", icon: Moon });
    } else {
      setGreeting({ text: "Good night", icon: Moon });
    }
  }, []);

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <motion.div 
      className={cn("space-y-1", className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2">
        <greeting.icon className="h-6 w-6 text-warning-600" />
        <h1 className="text-2xl font-bold text-foreground">
          {greeting.text}{name && `, ${name}`}
        </h1>
      </div>
      {showDate && (
        <p className="text-muted-foreground text-sm">{today}</p>
      )}
    </motion.div>
  );
}

/**
 * Quick Actions Grid
 */
interface QuickAction {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
  color?: string;
  badge?: string | number;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
  columns?: 2 | 3 | 4;
}

export function QuickActions({ actions, className, columns = 4 }: QuickActionsProps) {
  const colsClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-3", colsClass[columns], className)}>
      {actions.map((action, index) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <Button
            variant="outline"
            className={cn(
              "h-auto p-4 flex flex-col items-center gap-2 w-full relative",
              "hover:shadow-md hover:border-primary/30 transition-all duration-200",
              "group"
            )}
            onClick={action.onClick}
          >
            {action.badge !== undefined && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs"
              >
                {action.badge}
              </Badge>
            )}
            <div className={cn(
              "p-2 rounded-lg transition-transform group-hover:scale-110",
              action.color || "bg-primary/10"
            )}>
              <action.icon className={cn(
                "h-5 w-5",
                action.color?.includes("bg-") ? "text-white" : "text-primary"
              )} />
            </div>
            <span className="text-sm font-medium">{action.label}</span>
            {action.description && (
              <span className="text-xs text-muted-foreground">{action.description}</span>
            )}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Animated Stat Card with Counter
 */
interface AnimatedStatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: number;
  prefix?: string;
  suffix?: string;
  gradient?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function AnimatedStatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  prefix = "",
  suffix = "",
  gradient = "from-primary to-primary/80",
  loading,
  onClick
}: AnimatedStatCardProps) {
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={cn(
          "overflow-hidden cursor-pointer transition-shadow hover:shadow-lg",
          onClick && "cursor-pointer"
        )}
        onClick={onClick}
      >
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold tracking-tight">
                <AnimatedCounter value={value} prefix={prefix} suffix={suffix} duration={1.2} />
              </p>
              {trend !== undefined && (
                <div className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  trend >= 0 ? "text-success-600" : "text-danger-600"
                )}>
                  <TrendingUp className={cn("h-3 w-3", trend < 0 && "rotate-180")} />
                  <span>{Math.abs(trend)}%</span>
                  <span className="text-muted-foreground">vs last week</span>
                </div>
              )}
            </div>
            <div className={cn(
              "p-3 rounded-xl bg-gradient-to-br",
              gradient
            )}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Search with Debounce
 */
interface DebouncedSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  delay?: number;
  className?: string;
  showClear?: boolean;
}

export function DebouncedSearch({ 
  placeholder = "Search...", 
  onSearch, 
  delay = 300,
  className,
  showClear = true
}: DebouncedSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Memoize the onSearch callback to prevent infinite re-renders
  const stableOnSearch = useMemo(() => onSearch, []);

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      stableOnSearch(query);
      setIsSearching(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay, stableOnSearch]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
      />
      <AnimatePresence>
        {isSearching && query && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
        {showClear && query && !isSearching && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setQuery("")}
          >
            <X className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Avatar with Fallback Initials
 */
interface AvatarWithInitialsProps {
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatus?: boolean;
  status?: "online" | "offline" | "busy";
}

export function AvatarWithInitials({ 
  name, 
  imageUrl, 
  size = "md", 
  className,
  showStatus,
  status = "offline"
}: AvatarWithInitialsProps) {
  const [imageError, setImageError] = useState(false);
  
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };

  const statusColors = {
    online: "bg-success-600",
    offline: "bg-muted-foreground",
    busy: "bg-danger-600",
  };

  // Generate consistent color based on name
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 5;
  const gradients = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-green-500 to-emerald-500",
    "from-orange-500 to-amber-500",
    "from-rose-500 to-red-500",
  ];

  return (
    <div className={cn("relative", className)}>
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={name}
          className={cn(
            "rounded-full object-cover",
            sizeClasses[size]
          )}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className={cn(
            "rounded-full bg-gradient-to-br flex items-center justify-center font-semibold text-white",
            gradients[colorIndex],
            sizeClasses[size]
          )}
        >
          {initials}
        </div>
      )}
      {showStatus && (
        <span 
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-background",
            statusColors[status],
            size === "sm" ? "h-2 w-2" : "h-3 w-3"
          )}
        />
      )}
    </div>
  );
}

/**
 * Last Visit Indicator with Relative Time
 */
interface LastVisitProps {
  date: Date | string;
  className?: string;
}

export function LastVisit({ date, className }: LastVisitProps) {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  
  const getRelativeTime = (d: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const relativeTime = getRelativeTime(parsedDate);
  const isRecent = parsedDate.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

  return (
    <div className={cn("flex items-center gap-1.5 text-sm", className)}>
      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      <span className={cn(
        isRecent ? "text-foreground" : "text-muted-foreground"
      )}>
        {relativeTime}
      </span>
    </div>
  );
}

/**
 * Status Badge with Pulse for "Now"
 */
interface AppointmentStatusBadgeProps {
  status: "upcoming" | "in-progress" | "completed" | "cancelled" | "no-show";
  time?: string;
  className?: string;
}

export function AppointmentStatusBadge({ status, time, className }: AppointmentStatusBadgeProps) {
  const configs: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive"; className: string; pulse?: boolean }> = {
    "upcoming": { 
      label: "Upcoming", 
      variant: "outline",
      className: "border-primary/30 text-primary"
    },
    "in-progress": { 
      label: "In Progress", 
      variant: "default",
      className: "bg-success-600 hover:bg-success-600",
      pulse: true
    },
    "completed": { 
      label: "Completed", 
      variant: "secondary",
      className: "bg-muted text-muted-foreground"
    },
    "cancelled": { 
      label: "Cancelled", 
      variant: "destructive",
      className: ""
    },
    "no-show": { 
      label: "No Show", 
      variant: "destructive",
      className: "bg-warning-600 hover:bg-warning-600"
    },
  };

  const config = configs[status];

  return (
    <Badge 
      variant={config.variant}
      className={cn("gap-1.5", config.className, className)}
    >
      {config.pulse && <PulseIndicator size="sm" color="success" />}
      {time && <span className="font-normal">{time}</span>}
      {config.label}
    </Badge>
  );
}

/**
 * Quick Peek Card (for hover previews)
 */
interface QuickPeekCardProps {
  children: React.ReactNode;
  preview: React.ReactNode;
  className?: string;
}

export function QuickPeekCard({ children, preview, className }: QuickPeekCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div 
      className={cn("relative", className)}
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      {children}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-50 left-full top-0 ml-2"
          >
            <Card className="shadow-xl border-2 min-w-[280px]">
              <CardContent className="p-4">
                {preview}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Message Status Indicator
 */
interface MessageStatusProps {
  status: "sending" | "sent" | "delivered" | "read" | "error";
  className?: string;
}

export function MessageStatus({ status, className }: MessageStatusProps) {
  const configs = {
    sending: { 
      icon: <div className="h-3 w-3 border border-muted-foreground border-t-transparent rounded-full animate-spin" />,
      label: "Sending"
    },
    sent: { 
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />,
      label: "Sent"
    },
    delivered: { 
      icon: (
        <div className="relative">
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground absolute -right-1" />
        </div>
      ),
      label: "Delivered"
    },
    read: { 
      icon: (
        <div className="relative">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <CheckCircle2 className="h-3.5 w-3.5 text-primary absolute -right-1" />
        </div>
      ),
      label: "Read"
    },
    error: { 
      icon: <AlertCircle className="h-3.5 w-3.5 text-danger-600" />,
      label: "Failed"
    },
  };

  const config = configs[status];

  return (
    <div className={cn("flex items-center gap-1", className)} title={config.label}>
      {config.icon}
    </div>
  );
}

/**
 * Unread Badge with Animation
 */
interface UnreadBadgeProps {
  count: number;
  className?: string;
  max?: number;
}

export function UnreadBadge({ count, className, max = 99 }: UnreadBadgeProps) {
  if (count <= 0) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold",
        "bg-danger-600 text-white rounded-full",
        className
      )}
    >
      {count > max ? `${max}+` : count}
    </motion.span>
  );
}

/**
 * Section with Smooth Scroll Anchor
 */
interface SectionAnchorProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionAnchor({ id, title, description, children, className }: SectionAnchorProps) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Form Progress Indicator
 */
interface FormProgressProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function FormProgress({ steps, currentStep, className }: FormProgressProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center gap-2">
            <motion.div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors",
                index < currentStep && "bg-primary text-primary-foreground",
                index === currentStep && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                index > currentStep && "bg-muted text-muted-foreground"
              )}
              animate={index === currentStep ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {index < currentStep ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                index + 1
              )}
            </motion.div>
            <span className={cn(
              "text-xs font-medium text-center max-w-20",
              index <= currentStep ? "text-foreground" : "text-muted-foreground"
            )}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 h-0.5 mx-2 mt-[-24px]">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: index < currentStep ? "100%" : "0%" }}
                transition={{ duration: 0.3 }}
              />
              <div className="h-full bg-muted -mt-0.5" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Confirmation Dialog for Destructive Actions
 */
interface ConfirmationPromptProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationPrompt({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmationPromptProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-50"
      >
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              {variant === "destructive" && (
                <div className="p-2 rounded-full bg-danger-100">
                  <AlertCircle className="h-5 w-5 text-danger-600" />
                </div>
              )}
              <CardTitle>{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">{description}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button 
                variant={variant === "destructive" ? "destructive" : "default"}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

/**
 * Animated Toggle Switch
 */
interface AnimatedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function AnimatedToggle({ 
  checked, 
  onChange, 
  label, 
  description,
  disabled,
  className 
}: AnimatedToggleProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      {(label || description) && (
        <div className="space-y-0.5">
          {label && <p className="text-sm font-medium">{label}</p>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <motion.span
          className="pointer-events-none h-5 w-5 rounded-full bg-background shadow-lg"
          animate={{ x: checked ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

/**
 * Success Toast Animation
 */
interface SuccessToastProps {
  message: string;
  description?: string;
  isVisible: boolean;
  onClose: () => void;
}

export function SuccessToast({ message, description, isVisible, onClose }: SuccessToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Card className="shadow-2xl border-success-300 bg-success-50 dark:bg-success-900/20">
            <CardContent className="p-4 flex items-start gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
                className="p-1 rounded-full bg-success-600"
              >
                <CheckCircle2 className="h-4 w-4 text-white" />
              </motion.div>
              <div className="flex-1">
                <p className="font-medium text-success-900 dark:text-success-100">{message}</p>
                {description && (
                  <p className="text-sm text-success-700 dark:text-success-300 mt-0.5">{description}</p>
                )}
              </div>
              <button onClick={onClose} className="text-success-600 hover:text-success-800">
                <X className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
