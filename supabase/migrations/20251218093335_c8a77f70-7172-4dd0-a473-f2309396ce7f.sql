-- Make user_id nullable in profiles table for unclaimed patient profiles
ALTER TABLE public.profiles 
ALTER COLUMN user_id DROP NOT NULL;