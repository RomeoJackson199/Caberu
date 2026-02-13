import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

// Override getCorsHeaders to include elevenlabs-specific headers
function getWebhookCorsHeaders(origin: string | null): Record<string, string> {
    const base = getCorsHeaders(origin);
    return {
        ...base,
        'Access-Control-Allow-Headers': base['Access-Control-Allow-Headers'] + ', elevenlabs-signature, x-elevenlabs-signature',
    };
}

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
            accepted_time_unix_secs?: number;
            call_duration_secs?: number;
            caller_phone?: string;
            phone_number?: string;
            business_id?: string;
            phone_call?: {
                direction?: string;
                phone_number_id?: string;
                agent_number?: string;
                external_number?: string;
                type?: string;
                call_sid?: string;
            };
        };
    };
}

// Verify ElevenLabs webhook signature using HMAC-SHA256
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

        // Constant-time comparison to prevent timing attacks
        if (signature.length !== computedSignature.length) return false;
        
        let result = 0;
        for (let i = 0; i < signature.length; i++) {
            result |= signature.charCodeAt(i) ^ computedSignature.charCodeAt(i);
        }
        return result === 0;
    } catch (e) {
        console.error('Signature verification error:', e);
        return false;
    }
}

serve(async (req) => {
    const origin = req.headers.get('Origin');
    const corsHeaders = getWebhookCorsHeaders(origin);

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const webhookSecret = Deno.env.get('ELEVENLABS_WEBHOOK_SECRET');

        const rawBody = await req.text();
        console.log('ElevenLabs webhook received');

        // =====================================================
        // SECURITY: Enforce signature verification
        // =====================================================
        const signature = req.headers.get('elevenlabs-signature') || req.headers.get('x-elevenlabs-signature');
        
        if (!webhookSecret) {
            console.error('ELEVENLABS_WEBHOOK_SECRET not configured - REJECTING webhook for security');
            return new Response(
                JSON.stringify({ error: 'Webhook authentication not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!signature) {
            console.error('Missing webhook signature - REJECTING request');
            return new Response(
                JSON.stringify({ error: 'Signature required' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const isValid = await verifySignature(rawBody, signature, webhookSecret);
        if (!isValid) {
            console.error('Invalid webhook signature - potential security issue');
            return new Response(
                JSON.stringify({ error: 'Invalid signature' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        
        console.log('Webhook signature verified successfully');

        const payload: ElevenLabsWebhookPayload = JSON.parse(rawBody);
        console.log('Webhook type:', payload.type);

        // SECURITY: Validate event timestamp to prevent replay attacks (5 minute window)
        const eventTimestamp = payload.event_timestamp;
        const now = Math.floor(Date.now() / 1000);
        const maxAgeSeconds = 300; // 5 minutes

        if (eventTimestamp && Math.abs(now - eventTimestamp) > maxAgeSeconds) {
            console.error('Webhook timestamp too old or in future - potential replay attack');
            return new Response(
                JSON.stringify({ error: 'Webhook expired' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

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
        
        // Extract duration - ElevenLabs puts it in metadata.call_duration_secs
        const durationSeconds = data.metadata?.call_duration_secs || data.call_duration_secs || 0;
        
        // Extract phone number - ElevenLabs puts it in metadata.phone_call.external_number
        const callerPhone = data.metadata?.phone_call?.external_number 
            || data.metadata?.caller_phone 
            || data.metadata?.phone_number
            || null;
        
        // Extract call times
        const startTime = data.metadata?.start_time_unix_secs || data.metadata?.accepted_time_unix_secs;
        const endTime = data.metadata?.end_time_unix_secs;
        
        console.log('Extracted call data:', {
            callId,
            durationSeconds,
            callerPhone,
            startTime,
            endTime,
            rawMetadata: data.metadata
        });
        
        let businessId = data.metadata?.business_id || null;

        // If no business_id in metadata, try to infer from agent configuration
        if (!businessId && data.agent_id) {
            // Look up agent -> business mapping
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
                call_started_at: startTime
                    ? new Date(startTime * 1000).toISOString()
                    : null,
                call_ended_at: endTime
                    ? new Date(endTime * 1000).toISOString()
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
                    included_seconds: includedSeconds,
                    raw_data_keys: Object.keys(data),
                    signature_verified: true
                }
            })
            .select()
            .single();

        if (insertError) {
            // Check if it's a duplicate (replay protection)
            if (insertError.code === '23505') {
                console.log('Call already recorded (replay protection):', callId);
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
