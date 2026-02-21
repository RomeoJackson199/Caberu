import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PhoneOTPAuth } from "@/components/auth/PhoneOTPAuth";
import { getStrengthLabel, type PasswordStrength } from "@/utils/passwordValidation";

const GoogleIcon = () => (
  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

interface Props {
  userType: "client" | "business";
  setUserType: (t: "client" | "business" | null) => void;
  handleGoogleSignIn: () => void;
  handleSignUp: (e: React.FormEvent) => void;
  formData: { email: string; password: string; confirmPassword: string };
  setFormData: (d: { email: string; password: string; confirmPassword: string }) => void;
  isLoading: boolean;
  passwordStrength: PasswordStrength | null;
  isCheckingBreach: boolean;
}

export function SignupFormWithPhone({
  userType,
  setUserType,
  handleGoogleSignIn,
  handleSignUp,
  formData,
  setFormData,
  isLoading,
  passwordStrength,
  isCheckingBreach,
}: Props) {
  const [showMore, setShowMore] = useState(false);

  const roleType = userType === "client" ? "patient" : "owner";

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setUserType(null)}
        className="mb-4"
      >
        ← Change account type
      </Button>

      <div className="space-y-4">
        {/* Phone OTP - Primary */}
        <PhoneOTPAuth
          variant="default"
          signupMetadata={{ role_type: roleType }}
          redirectTo={userType === "business" ? "/create-business" : "/auth-redirect"}
        />

        {/* Other Options Toggle */}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="w-full flex items-center justify-center gap-2 text-xs uppercase text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <span className="flex-1 border-t border-border" />
          <span className="px-3 font-medium flex items-center gap-1">
            Other options
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${showMore ? "rotate-180" : ""}`}
            />
          </span>
          <span className="flex-1 border-t border-border" />
        </button>

        <AnimatePresence>
          {showMore && (
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

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleSignUp} className="space-y-4" role="form" aria-label="Sign up form">
                <div className="space-y-2">
                  <Label htmlFor="email">Your Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">Create Password</Label>
                  <FormField
                    id="password"
                    type="password"
                    placeholder="Minimum 12 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-12"
                    required
                    showPasswordToggle={true}
                    showCharacterCount={false}
                  />
                  {passwordStrength && formData.password && (
                    <div className="space-y-2">
                      <Progress value={(passwordStrength.score / 5) * 100} className="h-2" />
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${getStrengthLabel(passwordStrength.score).color}`}>
                          {getStrengthLabel(passwordStrength.score).label}
                        </span>
                        {isCheckingBreach && (
                          <span className="text-xs text-muted-foreground">Checking security...</span>
                        )}
                      </div>
                      {passwordStrength.feedback.length > 0 && (
                        <ul className="text-xs text-destructive space-y-1">
                          {passwordStrength.feedback.slice(0, 3).map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    12+ characters with uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <FormField
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="h-12"
                    required
                    showPasswordToggle={true}
                    showCharacterCount={false}
                    validate={(value) => {
                      if (value && formData.password && value !== formData.password) {
                        return "Passwords don't match";
                      }
                      return undefined;
                    }}
                    success={!!(formData.confirmPassword && formData.password && formData.confirmPassword === formData.password)}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "CREATE ACCOUNT"
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Log in
                  </Link>
                </p>
              </form>

              <p className="text-xs text-center text-muted-foreground pt-4">
                I agree to the{" "}
                <Link to="/terms" className="underline hover:text-foreground">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="underline hover:text-foreground">
                  Privacy Policy
                </Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
