import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, elevenlabs-signature',
};

// Pay-as-you-go rate: $0.10 per minute overage (10 cents)
const OVERAGE_RATE_CENTS_PER_MINUTE = 10;

interface ElevenLabsWebhookPayload {
    type: 'post_call_transcription' | 'post_call_audio' | 'call_initiation_failure';
    event_timestamp: number;
    data: {
        agent_id: string;
        conversation_id: string;
        call_id?: string;
        call_duration_secs?: number;
        call_successful?: boolean;
        transcript?: Array<{
            role: string;
            message: string;
            time_in_call_secs: number;
        }>;
        analysis?: {
            call_successful: boolean;
            transcript_summary?: string;
        };
        metadata?: {
            start_time_unix_secs?: number;
            end_time_unix_secs?: number;
            caller_phone?: string;
            business_id?: string;
        };
    };
}

// Verify ElevenLabs webhook signature
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
    if (!signature || !secret) return false;

    try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
        const computedSignature = Array.from(new Uint8Array(signatureBytes))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        return signature === computedSignature;
    } catch (e) {
        console.error('Signature verification error:', e);
        return false;
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const webhookSecret = Deno.env.get('ELEVENLABS_WEBHOOK_SECRET');

        const rawBody = await req.text();
        console.log('ElevenLabs webhook received:', rawBody.substring(0, 500));

        // Verify signature if secret is configured
        if (webhookSecret) {
            const signature = req.headers.get('elevenlabs-signature') || '';
            const isValid = await verifySignature(rawBody, signature, webhookSecret);
            if (!isValid) {
                console.error('Invalid webhook signature');
                return new Response(
                    JSON.stringify({ error: 'Invalid signature' }),
                    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        const payload: ElevenLabsWebhookPayload = JSON.parse(rawBody);
        console.log('Webhook type:', payload.type);

        // Only process post-call events
        if (payload.type !== 'post_call_transcription') {
            return new Response(
                JSON.stringify({ message: 'Event type not processed', type: payload.type }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const data = payload.data;
        const callId = data.call_id || data.conversation_id;
        const durationSeconds = data.call_duration_secs || 0;
        const callerPhone = data.metadata?.caller_phone || null;
        let businessId = data.metadata?.business_id || null;

        // If no business_id in metadata, try to infer from agent configuration
        if (!businessId && data.agent_id) {
            // Look up agent -> business mapping (you may need to create this table)
            const { data: agentMapping } = await supabase
                .from('elevenlabs_agents')
                .select('business_id')
                .eq('agent_id', data.agent_id)
                .maybeSingle();

            businessId = agentMapping?.business_id || null;
        }

        if (!businessId) {
            console.error('No business_id found for call:', callId);
            return new Response(
                JSON.stringify({ error: 'Missing business_id' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check current daily usage to determine if this is overage
        const { data: usageCheck } = await supabase
            .rpc('check_phone_minutes_available', { p_business_id: businessId });

        const dailyLimitSeconds = usageCheck?.[0]?.daily_limit_seconds || 300; // Default 5 min
        const usedSeconds = usageCheck?.[0]?.used_seconds || 0;
        const remainingSeconds = usageCheck?.[0]?.remaining_seconds || 0;

        // Calculate overage
        let includedInPlan = true;
        let costCents = 0;
        let includedSeconds = durationSeconds;
        let overageSeconds = 0;

        if (durationSeconds > remainingSeconds) {
            // Some or all of this call is overage
            includedSeconds = Math.max(0, remainingSeconds);
            overageSeconds = durationSeconds - includedSeconds;
            includedInPlan = includedSeconds > 0;

            // Calculate cost for overage (per minute, rounded up)
            const overageMinutes = Math.ceil(overageSeconds / 60);
            costCents = overageMinutes * OVERAGE_RATE_CENTS_PER_MINUTE;
        }

        // Prepare transcript for storage
        const transcript = data.transcript ? {
            messages: data.transcript,
            summary: data.analysis?.transcript_summary || null
        } : null;

        // Record the phone usage
        const { data: insertedUsage, error: insertError } = await supabase
            .from('phone_usage')
            .insert({
                business_id: businessId,
                call_id: callId,
                agent_id: data.agent_id,
                call_started_at: data.metadata?.start_time_unix_secs
                    ? new Date(data.metadata.start_time_unix_secs * 1000).toISOString()
                    : null,
                call_ended_at: data.metadata?.end_time_unix_secs
                    ? new Date(data.metadata.end_time_unix_secs * 1000).toISOString()
                    : new Date().toISOString(),
                duration_seconds: durationSeconds,
                caller_phone: callerPhone,
                call_type: 'inbound',
                transcript: transcript,
                is_billable: true,
                included_in_plan: includedInPlan,
                cost_cents: costCents,
                metadata: {
                    analysis: data.analysis,
                    overage_seconds: overageSeconds,
                    included_seconds: includedSeconds
                }
            })
            .select()
            .single();

        if (insertError) {
            // Check if it's a duplicate
            if (insertError.code === '23505') {
                console.log('Call already recorded:', callId);
                return new Response(
                    JSON.stringify({ message: 'Call already recorded', call_id: callId }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            throw insertError;
        }

        console.log('Phone usage recorded:', {
            call_id: callId,
            business_id: businessId,
            duration: durationSeconds,
            overage: overageSeconds,
            cost: costCents
        });

        return new Response(
            JSON.stringify({
                success: true,
                call_id: callId,
                duration_seconds: durationSeconds,
                included_in_plan: includedInPlan,
                overage_seconds: overageSeconds,
                cost_cents: costCents
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error processing ElevenLabs webhook:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
