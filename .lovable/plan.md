

## Root Cause: `secure_profiles_view` maps `avatar_url` as `profile_picture_url`

The **`secure_profiles_view`** has this line:

```sql
avatar_url AS profile_picture_url,
```

But when the app **writes** profile pictures, it writes to the real `profile_picture_url` column on the `profiles` table. The view **reads** from `avatar_url` (which is always NULL) and aliases it as `profile_picture_url`. So:

1. **Upload succeeds** -- `profile_picture_url` column gets the URL correctly (confirmed: the DB has real URLs in `profile_picture_url`)
2. **Read fails** -- the view returns `avatar_url` (NULL) as `profile_picture_url`, so the photo appears missing on reload/re-login
3. **Unsaved changes warning** -- Since the loaded profile has `profile_picture_url: ''` (from NULL avatar_url) but formData still has the URL, a mismatch is detected

## Plan

### 1. Fix the `secure_profiles_view` (SQL migration)
Recreate the view so it reads the **actual** `profile_picture_url` column instead of aliasing `avatar_url`:

```sql
DROP VIEW IF EXISTS public.secure_profiles_view;

CREATE VIEW public.secure_profiles_view
WITH (security_invoker = true)
AS
SELECT 
  id, user_id, email, first_name, last_name, phone,
  date_of_birth,
  avatar_url,
  profile_picture_url,   -- use the REAL column, not avatar_url alias
  address, emergency_contact, medical_history,
  role, ai_opt_out, patient_status, profile_completion_status,
  import_session_id, phone_verified, onboarding_completed,
  bio,
  created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.secure_profiles_view TO authenticated;
GRANT SELECT ON public.secure_profiles_view TO anon;
GRANT SELECT ON public.secure_profiles_view TO service_role;
```

### 2. No code changes needed
The app code already writes to `profile_picture_url` on the `profiles` table and reads from `secure_profiles_view.profile_picture_url`. Once the view returns the correct column, everything will work: persistence, display across the app, and no false unsaved-changes warnings.

