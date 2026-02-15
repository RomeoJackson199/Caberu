
-- Update leave_clinic function to:
-- 1. Transfer ownership when owner leaves (if other members exist)
-- 2. Block leaving if last member with active subscription
CREATE OR REPLACE FUNCTION public.leave_clinic(p_business_id uuid DEFAULT get_current_business_id())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Count total members before removal
  select count(*) into v_total_members 
  from public.business_members
  where business_id = p_business_id;

  -- Check if this user is the owner
  select exists(
    select 1 from public.businesses 
    where id = p_business_id and owner_profile_id = v_profile_id
  ) into v_is_owner;

  -- Check subscription status
  select subscription_status into v_subscription_status
  from public.businesses where id = p_business_id;

  -- Block leaving if last member with active subscription
  if v_total_members <= 1 and v_subscription_status in ('active', 'trialing') then
    return jsonb_build_object(
      'success', false,
      'error', 'active_subscription',
      'message', 'You cannot leave as the last member while the subscription is active. Please cancel your subscription first.'
    );
  end if;

  -- If owner is leaving and there are other members, transfer ownership
  if v_is_owner and v_total_members > 1 then
    -- Pick the next owner: prefer admin, then dentist, then any other member
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
      -- Transfer business ownership
      update public.businesses 
      set owner_profile_id = v_next_owner_profile_id, updated_at = now()
      where id = p_business_id;

      -- Update the new owner's role to 'owner'
      update public.business_members 
      set role = 'owner', updated_at = now()
      where business_id = p_business_id and profile_id = v_next_owner_profile_id;

      -- Log the ownership transfer
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

  -- Remove membership for this user from this business
  delete from public.business_members
  where business_id = p_business_id and profile_id = v_profile_id;

  -- Check if user still belongs to other businesses
  select count(*) into v_remaining from public.business_members where profile_id = v_profile_id;

  if v_remaining = 0 then
    -- Deactivate dentist record
    update public.dentists set is_active = false where profile_id = v_profile_id;
    -- Remove provider role
    delete from public.user_roles where user_id = v_user_id and role = 'provider'::public.app_role;
  end if;

  -- If this was the last member, delete the business entirely
  if v_total_members <= 1 then
    BEGIN delete from public.homepage_settings where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.business_services where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.appointment_slots where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.dentist_availability where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.dentist_vacation_days where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.dentist_capacity_settings where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.appointment_types where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.medical_records where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.treatment_plans where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.payment_requests where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.appointments where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.messages where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.session_business where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.business_email_templates where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN delete from public.business_members where business_id = p_business_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    
    delete from public.businesses where id = p_business_id;
    
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
$function$;
