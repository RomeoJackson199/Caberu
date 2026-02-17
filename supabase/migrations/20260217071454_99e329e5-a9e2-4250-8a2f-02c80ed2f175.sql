
-- Fix 1: Recreate secure_profiles_view with missing columns
DROP VIEW IF EXISTS public.secure_profiles_view CASCADE;

CREATE VIEW public.secure_profiles_view
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  email,
  first_name,
  last_name,
  phone,
  date_of_birth,
  avatar_url,
  avatar_url AS profile_picture_url,
  address,
  emergency_contact,
  medical_history,
  role,
  ai_opt_out,
  patient_status,
  profile_completion_status,
  import_session_id,
  created_at,
  updated_at
FROM profiles;

-- Fix 2: Drop and recreate leave_clinic
DROP FUNCTION IF EXISTS public.leave_clinic(uuid);

CREATE FUNCTION public.leave_clinic(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_user_id uuid;
  v_profile_id uuid;
  v_remaining integer := 0;
  v_total_members integer := 0;
  v_is_owner boolean := false;
  v_subscription_status text;
  v_next_owner_profile_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_business_id is null then
    raise exception 'No business context';
  end if;

  select id into v_profile_id from public.profiles where user_id = v_user_id;
  if v_profile_id is null then
    raise exception 'Profile not found';
  end if;

  select count(*) into v_total_members 
  from public.business_members
  where business_id = p_business_id;

  select exists(
    select 1 from public.businesses 
    where id = p_business_id and owner_profile_id = v_profile_id
  ) into v_is_owner;

  select subscription_status into v_subscription_status
  from public.businesses where id = p_business_id;

  if v_total_members <= 1 and v_subscription_status in ('active', 'trialing') then
    return jsonb_build_object(
      'success', false,
      'error', 'active_subscription',
      'message', 'You cannot leave as the last member while the subscription is active. Please cancel your subscription first.'
    );
  end if;

  if v_is_owner and v_total_members > 1 then
    select bm.profile_id into v_next_owner_profile_id
    from public.business_members bm
    where bm.business_id = p_business_id 
      and bm.profile_id != v_profile_id
    order by 
      case bm.role 
        when 'admin' then 1 
        when 'dentist' then 2 
        else 3 
      end,
      bm.created_at asc
    limit 1;

    if v_next_owner_profile_id is not null then
      update public.businesses 
      set owner_profile_id = v_next_owner_profile_id, updated_at = now()
      where id = p_business_id;

      update public.business_members 
      set role = 'owner', updated_at = now()
      where business_id = p_business_id and profile_id = v_next_owner_profile_id;

      insert into public.audit_logs (user_id, action, table_name, record_id, changes)
      values (v_user_id, 'ownership_transfer', 'businesses', p_business_id::text, 
        jsonb_build_object(
          'from_profile_id', v_profile_id,
          'to_profile_id', v_next_owner_profile_id,
          'reason', 'owner_left_clinic'
        )
      );
    end if;
  end if;

  delete from public.business_members
  where business_id = p_business_id and profile_id = v_profile_id;

  delete from public.session_business
  where user_id = v_user_id and business_id = p_business_id;

  select count(*) into v_remaining from public.business_members where profile_id = v_profile_id;

  if v_remaining = 0 then
    update public.dentists set is_active = false, status = 'inactive', updated_at = now()
    where profile_id = v_profile_id;
    delete from public.user_roles where user_id = v_user_id and role = 'provider'::public.app_role;
  end if;

  if v_total_members <= 1 then
    update public.businesses 
    set status = 'archived', subscription_status = 'cancelled', updated_at = now()
    where id = p_business_id;

    update public.appointments 
    set status = 'cancelled', updated_at = now()
    where business_id = p_business_id 
      and appointment_date > now()
      and status in ('pending', 'confirmed');

    insert into public.audit_logs (user_id, action, table_name, record_id, changes)
    values (v_user_id, 'archive', 'businesses', p_business_id::text,
      jsonb_build_object('reason', 'last_member_left'));

    return jsonb_build_object(
      'success', true, 
      'remaining_businesses', v_remaining,
      'business_deleted', true
    );
  end if;

  return jsonb_build_object(
    'success', true, 
    'remaining_businesses', v_remaining,
    'business_deleted', false,
    'ownership_transferred', v_is_owner and v_next_owner_profile_id is not null
  );
end;
$$;
