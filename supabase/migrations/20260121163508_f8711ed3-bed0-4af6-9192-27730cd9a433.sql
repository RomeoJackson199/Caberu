-- Add missing UPDATE policy for push_subscriptions table
-- This fixes RLS violations when users try to update their push notification subscriptions

CREATE POLICY "Users can update their own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);