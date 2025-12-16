-- Migration: Create phone_usage table for tracking AI phone call minutes
-- Created: 2025-12-16

-- Phone usage table to track all AI phone calls per business
CREATE TABLE IF NOT EXISTS phone_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    call_id text UNIQUE, -- ElevenLabs call ID
    agent_id text, -- ElevenLabs agent ID
    call_started_at timestamptz,
    call_ended_at timestamptz,
    duration_seconds integer NOT NULL DEFAULT 0,
    caller_phone text,
    call_type text DEFAULT 'inbound', -- inbound, outbound
    transcript jsonb, -- Optional: store conversation transcript
    is_billable boolean DEFAULT true,
    included_in_plan boolean DEFAULT true, -- false if this is overage
    cost_cents integer DEFAULT 0, -- Pay-as-you-go cost for overage
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_phone_usage_business_date 
ON phone_usage(business_id, created_at);

CREATE INDEX IF NOT EXISTS idx_phone_usage_call_id 
ON phone_usage(call_id);

-- Note: For daily queries, use created_at range instead of ::date cast
-- Example: WHERE created_at >= date_trunc('day', now()) AND created_at < date_trunc('day', now()) + interval '1 day'

-- RLS policies
ALTER TABLE phone_usage ENABLE ROW LEVEL SECURITY;

-- Business admins can view their phone usage
CREATE POLICY "Business members can view phone usage"
ON phone_usage FOR SELECT
USING (
    business_id IN (
        SELECT business_id FROM business_members 
        WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    OR
    business_id IN (
        SELECT id FROM businesses WHERE owner_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
);

-- Only service role can insert (webhooks)
CREATE POLICY "Service role can insert phone usage"
ON phone_usage FOR INSERT
WITH CHECK (true);

-- Function to get daily phone usage for a business
CREATE OR REPLACE FUNCTION get_daily_phone_usage(p_business_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(
    total_seconds integer,
    total_calls integer,
    included_seconds integer,
    overage_seconds integer,
    overage_cost_cents integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(duration_seconds), 0)::integer as total_seconds,
        COUNT(*)::integer as total_calls,
        COALESCE(SUM(CASE WHEN included_in_plan THEN duration_seconds ELSE 0 END), 0)::integer as included_seconds,
        COALESCE(SUM(CASE WHEN NOT included_in_plan THEN duration_seconds ELSE 0 END), 0)::integer as overage_seconds,
        COALESCE(SUM(cost_cents), 0)::integer as overage_cost_cents
    FROM phone_usage
    WHERE business_id = p_business_id
    AND created_at::date = p_date
    AND is_billable = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if business has remaining daily phone minutes
CREATE OR REPLACE FUNCTION check_phone_minutes_available(p_business_id uuid)
RETURNS TABLE(
    daily_limit_seconds integer,
    used_seconds integer,
    remaining_seconds integer,
    can_make_call boolean,
    plan_tier text
) AS $$
DECLARE
    v_phone_minutes_daily integer;
    v_plan_name text;
    v_used integer;
BEGIN
    -- Get business plan's phone minutes per day
    SELECT sp.phone_minutes_daily, sp.name
    INTO v_phone_minutes_daily, v_plan_name
    FROM businesses b
    LEFT JOIN subscription_plans sp ON b.subscription_plan ILIKE '%' || sp.name || '%'
    WHERE b.id = p_business_id;
    
    -- Default to starter plan (5 min) if no plan found
    IF v_phone_minutes_daily IS NULL THEN
        v_phone_minutes_daily := 5;
        v_plan_name := 'starter';
    END IF;
    
    -- Get today's usage
    SELECT COALESCE(SUM(duration_seconds), 0)
    INTO v_used
    FROM phone_usage
    WHERE business_id = p_business_id
    AND created_at::date = CURRENT_DATE
    AND is_billable = true;
    
    RETURN QUERY
    SELECT 
        (v_phone_minutes_daily * 60)::integer as daily_limit_seconds,
        v_used::integer as used_seconds,
        GREATEST(0, (v_phone_minutes_daily * 60) - v_used)::integer as remaining_seconds,
        true as can_make_call, -- Always allow (pay-as-you-go)
        COALESCE(v_plan_name, 'starter')::text as plan_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ElevenLabs agents mapping table (links agent to business)
CREATE TABLE IF NOT EXISTS elevenlabs_agents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    agent_id text NOT NULL UNIQUE, -- ElevenLabs agent ID
    agent_name text,
    voice_id text,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elevenlabs_agents_business 
ON elevenlabs_agents(business_id);

CREATE INDEX IF NOT EXISTS idx_elevenlabs_agents_agent_id 
ON elevenlabs_agents(agent_id);

-- RLS for elevenlabs_agents
ALTER TABLE elevenlabs_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view their agents"
ON elevenlabs_agents FOR SELECT
USING (
    business_id IN (
        SELECT business_id FROM business_members 
        WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    OR
    business_id IN (
        SELECT id FROM businesses WHERE owner_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Business admins can manage agents"
ON elevenlabs_agents FOR ALL
USING (
    business_id IN (
        SELECT business_id FROM business_members 
        WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND role IN ('admin', 'owner')
    )
    OR
    business_id IN (
        SELECT id FROM businesses WHERE owner_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
);
