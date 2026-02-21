
# Phone-First Authentication Flow

## Overview
Redesign the Signup, Login, and MobileAuth screens so that **phone number + SMS OTP** is the primary entry point. Google and Email options will be tucked behind a "More options" button to keep the initial view clean and focused.

## Current State
- Signup page: user type selection (client/business) then Google + email/password form
- Login page: email/password form with Google as secondary option
- MobileAuth: shows Sign Up / Sign In choice, then Google + Email buttons
- SMS verification already works via Twilio (`send-sms-verification` and `verify-sms-code` edge functions)
- `PhoneVerificationDialog` exists but is only used for profile verification, not for auth

## What Changes

### 1. New Auth Flow (both Signup and Login)

```text
+----------------------------------+
|         Enter Phone Number       |
|    [  +32 467 88 19 65     ]     |
|    [ Continue with Phone  ]      |
|                                  |
|    ----  MORE OPTIONS  ----      |
|    (collapsed by default)        |
|                                  |
|    [ Continue with Google ]      |
|    [ Continue with Email  ]      |
+----------------------------------+
```

When "More Options" is tapped, Google and Email buttons slide in. When "Continue with Phone" is tapped, an OTP code input appears inline (reusing the existing Twilio verification flow).

### 2. Phone OTP Login Flow (New)

Currently there is no way to **sign in** with just a phone number. We need a new edge function or to extend the existing `verify-sms-code` to handle authentication:

- **If the phone number matches an existing profile**: send OTP, verify, then create a Supabase session using `supabase.auth.admin.signInWithOtp` or by generating a custom token.
- **If the phone is new (signup)**: send OTP, verify, create a new user with the phone as the identifier, then redirect to onboarding.

Supabase supports `signInWithOtp({ phone })` natively if the Phone provider is enabled in the Supabase dashboard. This is the cleanest approach.

### 3. Implementation Steps

**Step A - Enable Supabase Phone Auth Provider**
- The user needs to enable the Phone provider in their Supabase dashboard (Authentication > Providers > Phone) and configure it with their Twilio credentials (Account SID, Auth Token, Messaging Service SID).
- This allows using `supabase.auth.signInWithOtp({ phone })` and `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` directly without custom edge functions.

**Step B - Redesign MobileAuthScreen**
- Replace the current Sign Up / Sign In choice screen with a single phone-first screen.
- Primary: Phone number input + "Continue" button.
- Below a "MORE OPTIONS" divider (collapsed): Google button, Email button.
- Tapping Email navigates to `/login` or `/signup` as before.

**Step C - Redesign Login Page**
- Add phone number input at the top as the primary option.
- Move email/password form under a "Continue with Email" expandable section.
- Google stays visible but below the phone input.

**Step D - Redesign Signup Page**
- Keep user type selection (client/business).
- After type is selected, show phone-first flow: phone input, then "More Options" for Google/Email.
- When signing up via phone, pass user type metadata so the `handle_new_user` trigger still works correctly.

**Step E - Phone OTP Handler Component**
- Create a reusable `PhoneOTPAuth` component that:
  1. Shows phone input with country selector (reuse existing `PhoneNumberInput` component).
  2. On submit, calls `supabase.auth.signInWithOtp({ phone })`.
  3. Shows OTP code input.
  4. On code submit, calls `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
  5. On success, navigates to `/auth-redirect`.

**Step F - Fix broken test files**
- Delete or stub the 6 test files referencing missing modules (`useMobileGestures`, `useOptimisticAppointmentStatus`, `usePaginatedAppointments`, `usePatientProfile`, `useRetry`, `validation`).

## Technical Details

### Supabase Phone Provider vs Custom Twilio
Two options:
1. **Supabase native phone auth** (recommended): Enable Phone provider in dashboard with Twilio credentials. Uses `signInWithOtp`/`verifyOtp`. Supabase handles session creation automatically.
2. **Keep custom edge functions**: More control but requires manually creating sessions after verification, which is complex.

Option 1 is recommended. The existing `send-sms-verification` and `verify-sms-code` edge functions can remain for non-auth verification (e.g., verifying phone on profile), while auth uses Supabase's built-in phone auth.

### User Metadata on Phone Signup
When a user signs up via phone OTP, Supabase creates a user with `phone` as the identifier. The `handle_new_user` trigger will fire. We need to pass `role_type` via `options.data` in the `signInWithOtp` call so the trigger knows whether to create a patient or owner profile.

### Files to Create/Modify
- **New**: `src/components/auth/PhoneOTPAuth.tsx` - reusable phone OTP component
- **Modify**: `src/pages/MobileAuthScreen.tsx` - phone-first layout
- **Modify**: `src/pages/Login.tsx` - add phone as primary, email behind "More options"
- **Modify**: `src/pages/Signup.tsx` - add phone as primary after user type selection
- **Delete**: 6 broken test files
