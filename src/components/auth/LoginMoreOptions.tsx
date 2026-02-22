import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Loader2, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const GoogleIcon = ({ className = "mr-2 h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const AppleIcon = ({ className = "mr-2 h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

interface LoginMoreOptionsProps {
  isReturningUser: boolean;
  isLoading: boolean;
  handleGoogleSignIn: () => void;
  handleAppleSignIn: () => void;
  formData: { email: string; password: string };
  setFormData: (data: { email: string; password: string }) => void;
  handleSignIn: (e: React.FormEvent) => void;
  authError: string | null;
  rememberedName: string;
  rememberedEmail: string;
  setIsReturningUser: (val: boolean) => void;
}

export function LoginMoreOptions({
  isReturningUser,
  isLoading,
  handleGoogleSignIn,
  handleAppleSignIn,
  formData,
  setFormData,
  handleSignIn,
  authError,
  rememberedName,
  rememberedEmail,
  setIsReturningUser,
}: LoginMoreOptionsProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Divider toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 text-xs uppercase text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <span className="flex-1 border-t border-border" />
        <span className="px-3 font-medium flex items-center gap-1">
          Other options
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </span>
        <span className="flex-1 border-t border-border" />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden space-y-4"
          >
            {/* Google */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-12 border-2 hover:bg-accent"
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            {/* Apple */}
            <Button
              type="button"
              variant="outline"
              onClick={handleAppleSignIn}
              disabled={isLoading}
              className="w-full h-12 border-2 hover:bg-accent"
            >
              <AppleIcon />
              Continue with Apple
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSignIn} className="space-y-4" role="form" aria-label="Sign in form">
              {!isReturningUser && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12"
                    required
                    autoComplete="email"
                    aria-label="Email address"
                    aria-required="true"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Password</span>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    Forgot?
                  </Link>
                </div>
                <FormField
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-12"
                  required
                  autoComplete="current-password"
                  showPasswordToggle={true}
                  showCharacterCount={false}
                  error={authError && formData.password ? "Please check your password and try again" : undefined}
                  aria-label="Password"
                  aria-required="true"
                />
              </div>

              {authError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">{authError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Sign in with Email"
                )}
              </Button>
            </form>

            {/* Returning user switch */}
            {isReturningUser && (
              <button
                type="button"
                onClick={() => {
                  setIsReturningUser(false);
                  setFormData({ email: "", password: "" });
                }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Not {rememberedName || rememberedEmail}?{" "}
                <span className="text-primary font-medium">Use a different account</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
