

# Dead Code Removal Plan

## Files to delete entirely
1. **`src/components/auth/TwoFactorVerificationDialog.tsx`** — 2FA dialog, no longer used anywhere meaningful
2. **`src/components/auth/LoginMoreOptions.tsx`** — password-based login form, not imported anywhere

## Files to rewrite
3. **`src/pages/ForgotPassword.tsx`** — Still has full password reset flow with `validatePassword`, `reset-password-with-code` edge function, and "New Password" field. Rewrite to OTP-based account recovery: email input → `signInWithOtp` → success message → redirect to `/auth-redirect`. Remove `validatePassword` import.

## Files to clean up

4. **`src/pages/Login.tsx`** — Remove all 2FA dead code:
   - Remove `TwoFactorVerificationDialog` import and JSX (lines 10, 614-621)
   - Remove `show2FADialog`, `userEmail`, `is2FAPending` state (lines 49-51)
   - Remove `handle2FASuccess` function (lines 234-255)
   - Remove `two_factor_enabled` metadata checks (lines 113-114, 124-125, 184-191)
   - Remove `is2FAPending` from auth state check dependencies (lines 111, 122, 129)
   - Fix biometric error message line 92: "email and password" → "your phone number"

5. **`src/components/onboarding/DentistOnboardingFlow.tsx`** — Remove `enable2FA` from:
   - Type definition (line 97)
   - Initial state (line 146)
   - Switch UI (lines 970-984 area)

6. **`src/pages/__tests__/Login.test.tsx`** — Remove 2FA mock and 2FA-related test cases
7. **`src/pages/__tests__/ForgotPassword.test.tsx`** — Update to match rewritten page

