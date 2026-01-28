/**
 * Form Components - Reusable form patterns and elements
 * Common form patterns extracted from auth and settings pages
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LucideIcon, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

/**
 * Auth Card Container
 * Card wrapper for auth forms with consistent styling
 */
interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div className={cn("rounded-2xl border bg-card p-6 shadow-sm", className)}>
      {children}
    </div>
  );
}

/**
 * Auth Header
 * Header section for auth pages with title and description
 */
interface AuthHeaderProps {
  title: string;
  description?: string;
  showLogo?: boolean;
  logoIcon?: LucideIcon;
  logoText?: string;
  isReturningUser?: boolean;
  userName?: string;
  userEmail?: string;
}

export function AuthHeader({
  title,
  description,
  showLogo = false,
  logoIcon: LogoIcon,
  logoText = "Caberu",
  isReturningUser = false,
  userName,
  userEmail,
}: AuthHeaderProps) {
  return (
    <div className="text-center space-y-2">
      {showLogo && LogoIcon && (
        <div className="flex lg:hidden items-center justify-center gap-2 mb-6">
          <LogoIcon className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">{logoText}</span>
        </div>
      )}

      {isReturningUser && userName ? (
        <>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back{userName ? `, ${userName}` : ""}</h1>
          {userEmail && <p className="text-sm text-muted-foreground">{userEmail}</p>}
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </>
      )}
    </div>
  );
}

/**
 * Form Error Display
 * Consistent error message display for forms
 */
interface FormErrorProps {
  message: string;
}

export function FormError({ message }: FormErrorProps) {
  return (
    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
      <p className="text-sm text-destructive font-medium">{message}</p>
    </div>
  );
}

/**
 * Submit Button with Loading State
 * Reusable submit button with loading spinner
 */
interface SubmitButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "submit" | "button";
}

export function SubmitButton({
  isLoading,
  loadingText = "Loading...",
  children,
  className,
  disabled,
  type = "submit",
}: SubmitButtonProps) {
  return (
    <Button
      type={type}
      className={cn("h-12 w-full text-base font-semibold", className)}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * Form Footer Links
 * Common footer pattern with sign up/sign in links and terms
 */
interface FormFooterLinksProps {
  type: "login" | "signup";
  showTerms?: boolean;
}

export function FormFooterLinks({ type, showTerms = true }: FormFooterLinksProps) {
  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        {type === "login" ? (
          <>
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>

      {showTerms && (
        <p className="text-center text-xs text-muted-foreground">
          By {type === "login" ? "signing in" : "signing up"}, you agree to our{" "}
          <Link to="/terms" className="underline hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      )}
    </div>
  );
}

/**
 * User Type Selection Card
 * Card for selecting user type during signup
 */
interface UserTypeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  iconBgColor?: string;
  iconColor?: string;
}

export function UserTypeCard({
  icon: Icon,
  title,
  description,
  onClick,
  iconBgColor = "bg-blue-100 dark:bg-blue-900/30",
  iconColor = "text-blue-600 dark:text-blue-400",
}: UserTypeCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border-2 border-muted hover:border-primary transition-all p-6 text-left bg-background hover:bg-accent w-full"
    >
      <div className="flex items-start gap-4">
        <div className={cn("rounded-full p-3", iconBgColor)}>
          <Icon className={cn("h-6 w-6", iconColor)} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

/**
 * Password Requirements List
 * Display password requirements with checkmarks
 */
interface PasswordRequirement {
  text: string;
  met: boolean;
}

interface PasswordRequirementsProps {
  requirements: PasswordRequirement[];
}

export function PasswordRequirements({ requirements }: PasswordRequirementsProps) {
  return (
    <div className="space-y-2 text-xs">
      {requirements.map((req, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className={cn(
              "h-4 w-4 rounded-full flex items-center justify-center",
              req.met ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
            )}
          >
            {req.met && "✓"}
          </div>
          <span className={req.met ? "text-green-600" : "text-muted-foreground"}>{req.text}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Account Switch Button
 * Button to switch between accounts (for returning users)
 */
interface AccountSwitchButtonProps {
  currentUserName?: string;
  currentUserEmail?: string;
  onSwitch: () => void;
}

export function AccountSwitchButton({ currentUserName, currentUserEmail, onSwitch }: AccountSwitchButtonProps) {
  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={onSwitch}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Not {currentUserName || currentUserEmail}?{" "}
        <span className="text-primary font-medium">Use a different account</span>
      </button>
    </div>
  );
}

/**
 * Feature Grid for Auth Hero
 * Grid of small feature cards for hero sections
 */
interface FeatureGridItemProps {
  icon: LucideIcon;
  label: string;
}

export function FeatureGridItem({ icon: Icon, label }: FeatureGridItemProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
      <Icon className="h-6 w-6 mb-2 text-white" />
      <p className="text-sm font-medium text-white">{label}</p>
    </div>
  );
}

interface FeatureGridProps {
  features: FeatureGridItemProps[];
}

export function FeatureGrid({ features }: FeatureGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {features.map((feature, index) => (
        <FeatureGridItem key={index} {...feature} />
      ))}
    </div>
  );
}

/**
 * Testimonial Card for Auth Hero
 * Testimonial display for hero sections
 */
interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  avatarSeed?: string;
}

export function TestimonialCard({ quote, author, role, avatarSeed = "User" }: TestimonialCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 max-w-md border border-white/20">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
            alt={author}
            className="w-full h-full rounded-full"
          />
        </div>
        <div>
          <p className="text-white/95 mb-3 leading-relaxed">{quote}</p>
          <p className="font-semibold text-white">{author}</p>
          <p className="text-sm text-white/70">{role}</p>
        </div>
      </div>
    </div>
  );
}
