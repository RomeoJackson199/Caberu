-- Fix search_path for SECURITY DEFINER functions to prevent search_path hijacking

-- Fix auto_create_dentist_record (no args)
ALTER FUNCTION public.auto_create_dentist_record() SET search_path = 'public';

-- Fix check_imaging_workflow_flags (p_appointment_id uuid)
ALTER FUNCTION public.check_imaging_workflow_flags(p_appointment_id uuid) SET search_path = 'public';

-- Fix encrypt_treatment_plan_trigger (no args)
ALTER FUNCTION public.encrypt_treatment_plan_trigger() SET search_path = 'public';

-- Fix generate_appointment_slots_safe (p_dentist_id uuid, p_date date, p_business_id uuid)
ALTER FUNCTION public.generate_appointment_slots_safe(p_dentist_id uuid, p_date date, p_business_id uuid) SET search_path = 'public';

-- Fix get_appointment_imaging_status (p_appointment_id uuid)
ALTER FUNCTION public.get_appointment_imaging_status(p_appointment_id uuid) SET search_path = 'public';

-- Fix get_dentist_available_slots (p_dentist_id uuid, p_date date, p_business_id uuid)
ALTER FUNCTION public.get_dentist_available_slots(p_dentist_id uuid, p_date date, p_business_id uuid) SET search_path = 'public';

-- Fix get_dentist_patients (p_dentist_id uuid, p_business_id uuid, p_cursor timestamp with time zone, p_limit integer, p_search text)
ALTER FUNCTION public.get_dentist_patients(p_dentist_id uuid, p_business_id uuid, p_cursor timestamp with time zone, p_limit integer, p_search text) SET search_path = 'public';

-- Fix get_treatment_plan_details (p_treatment_plan_id uuid)
ALTER FUNCTION public.get_treatment_plan_details(p_treatment_plan_id uuid) SET search_path = 'public';