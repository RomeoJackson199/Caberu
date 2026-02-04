-- Ensure authenticated users can write to profiles (RLS still enforces row access).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
