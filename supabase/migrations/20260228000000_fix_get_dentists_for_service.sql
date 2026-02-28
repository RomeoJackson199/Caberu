-- Fix: get_dentists_for_service returned no dentists when dentist_services records
-- were absent. The original function used an implicit INNER JOIN that excluded all
-- dentists who hadn't been explicitly linked to a service via dentist_services.
-- This caused the booking flow to show "No Dentists Available" for every service.
--
-- Fix: Use LEFT JOINs so that all active dentists for the business are returned,
-- falling back to the business-level service defaults when no dentist-specific
-- override exists.

CREATE OR REPLACE FUNCTION public.get_dentists_for_service(
  p_service_id   UUID,
  p_business_id  UUID,
  p_from_date    DATE    DEFAULT CURRENT_DATE,
  p_days_ahead   INTEGER DEFAULT 60
)
RETURNS TABLE(
  dentist_id             UUID,
  dentist_first_name     TEXT,
  dentist_last_name      TEXT,
  specialization         TEXT,
  profile_picture_url    TEXT,
  service_duration_minutes INTEGER,
  service_price_cents    INTEGER,
  next_available_date    DATE,
  next_available_time    TIME
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_svc_duration INTEGER;
  v_svc_price    INTEGER;
BEGIN
  -- Resolve business-level service defaults (used when no dentist override exists)
  SELECT bs.duration_minutes, bs.price_cents
    INTO v_svc_duration, v_svc_price
    FROM business_services bs
   WHERE bs.id = p_service_id
     AND bs.business_id = p_business_id
     AND bs.is_active = true;

  -- Return every active dentist who is a member of the business.
  -- LEFT JOIN dentist_services so dentists without explicit service mappings
  -- are still included (they will use the business-level service defaults).
  RETURN QUERY
  SELECT
    d.id                                                        AS dentist_id,
    COALESCE(d.first_name, '')                                  AS dentist_first_name,
    COALESCE(d.last_name, '')                                   AS dentist_last_name,
    COALESCE(d.specialization, '')                              AS specialization,
    d.profile_picture_url                                       AS profile_picture_url,
    COALESCE(ds.custom_duration_minutes, v_svc_duration, 30)    AS service_duration_minutes,
    COALESCE(ds.custom_price_cents, v_svc_price, 0)             AS service_price_cents,
    NULL::DATE                                                  AS next_available_date,
    NULL::TIME                                                  AS next_available_time
  FROM dentists d
  JOIN business_members bm
    ON bm.profile_id = d.profile_id
   AND bm.business_id = p_business_id
  LEFT JOIN dentist_services ds
    ON ds.dentist_id = d.id
   AND ds.service_id = p_service_id
   AND ds.is_active = true
  WHERE d.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dentists_for_service(UUID, UUID, DATE, INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dentists_for_service(UUID, UUID, DATE, INTEGER)
  TO anon;
