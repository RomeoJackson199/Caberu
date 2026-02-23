/**
 * Detects duplicate-account / identity-conflict errors from Supabase Auth
 * and returns a user-friendly message if applicable.
 */
export function getDuplicateAccountMessage(error: unknown): string | null {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Supabase returns these when a user tries to sign up with an identity
  // that conflicts with an existing account
  const duplicatePatterns = [
    "user already registered",
    "a user with this email address has already been registered",
    "identity already exists",
    "an account with this email already exists",
    "email address already in use",
    "phone number already in use",
    "a user with this phone",
  ];

  if (duplicatePatterns.some((p) => msg.includes(p))) {
    return "An account with this email or phone already exists using a different sign-in method. Please log in with your original method first, then link additional methods in Settings → Security → Linked Accounts.";
  }

  return null;
}
