

# Bug Fix Plan: Auth Flow and Code Quality Issues

## Summary
After thorough exploration, I found several bugs and inconsistencies related to the recent transition to OTP-based (passwordless) authentication, plus some code quality issues.

---

## Bug 1: ForgotPassword page is now broken (Critical)

The `/forgot-password` page asks users to set a **new password** -- but passwords no longer exist in the system. This page is completely incompatible with the OTP-only architecture.

**Fix:** Replace the ForgotPassword page with a simple "Account Recovery" page that sends an OTP to the user's email to sign them in directly. No password reset needed since auth is OTP-based.

---

## Bug 2: PatientSecuritySettings still has password change logic (Medium)

While the UI was updated to show an "OTP-based authentication" info card, the component still contains all the password change handler code (`handlePasswordChange`, `currentPassword`, `newPassword`, `confirmPassword` state variables, and the `send-password-change-notification` function call). This dead code bloats the component and could confuse future developers.

**Fix:** Remove all password-related state variables and the `handlePasswordChange` function from `PatientSecuritySettings.tsx`.

---

## Bug 3: Signup page still uses email+password flow (Medium)

The `SignupFormWithPhone` component still contains a full email/password signup form with password validation, breach checking, and confirmation. While it's hidden behind an "Other options" toggle, it's inconsistent with the OTP-only approach and creates accounts with passwords that can never be used for login.

**Fix:** Remove the email/password form from `SignupFormWithPhone`. Keep only Phone OTP (primary), Google, and Apple as signup options.

---

## Bug 4: Login.tsx has leftover `password` field in formData (Low)

The login page's `formData` state still includes a `password` field (`{ email: "", password: "" }`) which is never used since login is now OTP-based. Minor but should be cleaned up.

**Fix:** Remove `password` from the formData state in Login.tsx.

---

## Bug 5: console.error/console.log used instead of logger (Low)

Several files still use `console.error` instead of the project's `logger` utility:
- `Login.tsx` (line 248)
- `Onboarding.tsx` (lines 112, 161, 189)
- `PatientSecuritySettings.tsx` (multiple lines)
- `Invite.tsx`, `Chat.tsx`, `BusinessPortal.tsx`

**Fix:** Replace `console.error`/`console.log` with `logger.error`/`logger.log` in these files, adding the logger import where missing.

---

## Bug 6: Onboarding email info text is misleading (Low)

The onboarding email step says "sign in with email & password" but the system is passwordless. The text should say "sign in with email" or "sign in with email OTP".

**Fix:** Update the info banner text in Onboarding.tsx from "sign in with email & password" to "sign in with email".

---

## Implementation Order

1. Fix ForgotPassword page (replace with account recovery)
2. Clean up Signup page (remove email/password form)
3. Clean up PatientSecuritySettings (remove dead password code)
4. Fix Login.tsx formData and console.error
5. Fix Onboarding.tsx text and console.error calls
6. Fix remaining console.error calls in other files

---

## Technical Details

### ForgotPassword.tsx rewrite
- Remove password fields and `validatePassword` import
- Change flow to: Enter email -> Send OTP via `signInWithOtp` -> User is signed in directly
- Update UI text to "Account Recovery" instead of "Forgot Password"

### SignupFormWithPhone.tsx cleanup
- Remove the email/password form section (lines 134-227)
- Remove unused props: `handleSignUp`, `formData`, `setFormData`, `passwordStrength`, `isCheckingBreach`
- Keep: Phone OTP, Google, Apple buttons

### Signup.tsx cleanup
- Remove `handleSignUp` function and all password-related state
- Remove `validatePassword`, `checkPasswordBreach` imports
- Simplify the component to just pass Google/Apple handlers to `SignupFormWithPhone`

### PatientSecuritySettings.tsx cleanup
- Remove: `currentPassword`, `newPassword`, `confirmPassword` state
- Remove: `handlePasswordChange` function
- Remove: `send-password-change-notification` function call

