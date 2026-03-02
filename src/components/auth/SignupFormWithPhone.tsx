import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PhoneOTPAuth } from "@/components/auth/PhoneOTPAuth";

interface Props {
  userType: "client" | "business";
  setUserType: (t: "client" | "business" | null) => void;
}

export function SignupFormWithPhone({
  userType,
  setUserType,
}: Props) {
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
        {/* Phone OTP - Only signup method */}
        <PhoneOTPAuth
          variant="default"
          signupMetadata={{ role_type: roleType }}
          redirectTo={userType === "business" ? "/create-business" : "/auth-redirect"}
        />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Log in
          </Link>
        </p>

        <p className="text-xs text-center text-muted-foreground pt-2">
          You can link your email, Google, or Apple account later in Settings.
        </p>

        <p className="text-xs text-center text-muted-foreground">
          I agree to the{" "}
          <Link to="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
