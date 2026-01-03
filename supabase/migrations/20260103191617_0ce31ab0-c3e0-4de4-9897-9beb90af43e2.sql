-- Enable RLS on email_logs table
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_logs
CREATE POLICY "Business members can view their email logs" ON public.email_logs
FOR SELECT USING (
  public.is_user_member_of_business(auth.uid(), business_id)
);

CREATE POLICY "Business members can insert email logs" ON public.email_logs
FOR INSERT WITH CHECK (
  public.is_user_member_of_business(auth.uid(), business_id)
);

-- Fix remaining functions that need search_path set
-- These are the security-critical SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION public.generate_daily_slots(p_dentist_id uuid, p_date date, p_business_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_day_of_week INT;
  v_start_time TIME;
  v_end_time TIME;
  v_break_start TIME;
  v_break_end TIME;
  v_is_available BOOLEAN;
  v_slot_duration INT := 30;
  v_current_time TIME;
  v_availability_updated TIMESTAMPTZ;
  v_slots_created TIMESTAMPTZ;
  v_resolved_business_id uuid;
BEGIN
  IF NOT pg_try_advisory_xact_lock(
    hashtext(p_dentist_id::text || p_date::text)
  ) THEN
    RETURN;
  END IF;

  v_resolved_business_id := COALESCE(p_business_id, (
    SELECT bm.business_id FROM public.business_members bm
    JOIN public.dentists d ON d.profile_id = bm.profile_id
    WHERE d.id = p_dentist_id
    LIMIT 1
  ));

  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  SELECT start_time, end_time, break_start_time, break_end_time, is_available, updated_at
  INTO v_start_time, v_end_time, v_break_start, v_break_end, v_is_available, v_availability_updated
  FROM public.dentist_availability
  WHERE dentist_id = p_dentist_id
  AND day_of_week = v_day_of_week
  AND (p_business_id IS NULL OR business_id = p_business_id)
  ORDER BY updated_at DESC
  LIMIT 1;
  
  IF v_is_available = false THEN
    DELETE FROM public.appointment_slots 
    WHERE dentist_id = p_dentist_id 
    AND slot_date = p_date
    AND (p_business_id IS NULL OR business_id = p_business_id)
    AND appointment_id IS NULL;
    RETURN;
  END IF;
  
  IF v_start_time IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.dentist_vacation_days
      WHERE dentist_id = p_dentist_id
      AND p_date BETWEEN start_date AND end_date
      AND is_approved = true
    ) THEN
      DELETE FROM public.appointment_slots 
      WHERE dentist_id = p_dentist_id 
      AND slot_date = p_date
      AND appointment_id IS NULL;
      RETURN;
    END IF;
    
    IF v_day_of_week IN (0, 6) THEN
      RETURN;
    END IF;
    v_start_time := '09:00:00'::TIME;
    v_end_time := '17:00:00'::TIME;
    v_is_available := true;
  END IF;
  
  SELECT MIN(created_at) INTO v_slots_created
  FROM public.appointment_slots 
  WHERE dentist_id = p_dentist_id 
  AND slot_date = p_date 
  AND (p_business_id IS NULL OR business_id = p_business_id);
  
  IF v_slots_created IS NOT NULL THEN
    IF v_availability_updated IS NOT NULL AND v_availability_updated > v_slots_created THEN
      DELETE FROM public.appointment_slots 
      WHERE dentist_id = p_dentist_id 
      AND slot_date = p_date 
      AND (p_business_id IS NULL OR business_id = p_business_id)
      AND appointment_id IS NULL;
    ELSE
      RETURN;
    END IF;
  END IF;
  
  v_current_time := v_start_time;
  WHILE v_current_time < v_end_time LOOP
    IF v_break_start IS NOT NULL AND v_break_end IS NOT NULL THEN
      IF v_current_time >= v_break_start AND v_current_time < v_break_end THEN
        v_current_time := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
        CONTINUE;
      END IF;
    END IF;
    
    INSERT INTO public.appointment_slots (dentist_id, business_id, slot_date, slot_time, is_available)
    VALUES (
      p_dentist_id, 
      v_resolved_business_id,
      p_date, 
      v_current_time, 
      true
    )
    ON CONFLICT (dentist_id, slot_date, slot_time) DO UPDATE
    SET 
      is_available = CASE 
        WHEN public.appointment_slots.appointment_id IS NOT NULL THEN false
        ELSE true
      END,
      updated_at = now()
    WHERE public.appointment_slots.appointment_id IS NULL;
    
    v_current_time := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_email_count(business_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    UPDATE public.businesses 
    SET emails_sent_count = COALESCE(emails_sent_count, 0) + 1
    WHERE id = business_uuid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_gdpr_deletion(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result JSONB := '{}';
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name)
  VALUES (target_user_id, 'delete', 'GDPR_DELETION');
  
  UPDATE public.profiles
  SET 
    first_name = 'DELETED',
    last_name = 'USER',
    phone = NULL,
    avatar_url = NULL,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  result := jsonb_build_object(
    'success', true,
    'anonymized_at', NOW(),
    'message', 'User data has been anonymized per GDPR requirements'
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_daily_phone_usage(p_business_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(total_seconds integer, total_calls integer, included_seconds integer, overage_seconds integer, overage_cost_cents integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(duration_seconds), 0)::integer as total_seconds,
        COUNT(*)::integer as total_calls,
        COALESCE(SUM(CASE WHEN included_in_plan THEN duration_seconds ELSE 0 END), 0)::integer as included_seconds,
        COALESCE(SUM(CASE WHEN NOT included_in_plan THEN duration_seconds ELSE 0 END), 0)::integer as overage_seconds,
        COALESCE(SUM(cost_cents), 0)::integer as overage_cost_cents
    FROM public.phone_usage
    WHERE business_id = p_business_id
    AND created_at::date = p_date
    AND is_billable = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_phone_minutes_available(p_business_id uuid)
RETURNS TABLE(daily_limit_seconds integer, used_seconds integer, remaining_seconds integer, can_make_call boolean, plan_tier text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_phone_minutes_daily integer;
    v_plan_name text;
    v_used integer;
BEGIN
    SELECT sp.phone_minutes_daily, sp.name
    INTO v_phone_minutes_daily, v_plan_name
    FROM public.businesses b
    LEFT JOIN public.subscription_plans sp ON b.subscription_plan ILIKE '%' || sp.name || '%'
    WHERE b.id = p_business_id;
    
    IF v_phone_minutes_daily IS NULL THEN
        v_phone_minutes_daily := 5;
        v_plan_name := 'starter';
    END IF;
    
    SELECT COALESCE(SUM(duration_seconds), 0)
    INTO v_used
    FROM public.phone_usage
    WHERE business_id = p_business_id
    AND created_at::date = CURRENT_DATE
    AND is_billable = true;
    
    RETURN QUERY
    SELECT 
        (v_phone_minutes_daily * 60)::integer as daily_limit_seconds,
        v_used::integer as used_seconds,
        GREATEST(0, (v_phone_minutes_daily * 60) - v_used)::integer as remaining_seconds,
        true as can_make_call,
        COALESCE(v_plan_name, 'starter')::text as plan_tier;
END;
$function$;