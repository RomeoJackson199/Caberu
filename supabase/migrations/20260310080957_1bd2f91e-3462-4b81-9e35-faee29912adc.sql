
CREATE OR REPLACE FUNCTION public.ensure_daily_slots(p_dentist_id uuid, p_date date, p_business_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_exists boolean;
  v_business_id uuid;
BEGIN
  -- If business_id not provided, look it up from business_members
  IF p_business_id IS NULL THEN
    SELECT bm.business_id INTO v_business_id
    FROM business_members bm
    JOIN dentists d ON d.profile_id = bm.profile_id
    WHERE d.id = p_dentist_id
    LIMIT 1;
  ELSE
    v_business_id := p_business_id;
  END IF;

  IF v_business_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.appointment_slots
    WHERE dentist_id = p_dentist_id AND slot_date = p_date AND business_id = v_business_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    PERFORM public.generate_daily_slots(p_dentist_id, p_date, v_business_id);
  END IF;
END;
$$;
