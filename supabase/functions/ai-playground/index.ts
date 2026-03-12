import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { checkRateLimitMemory, getClientIP, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimitMemory(clientIP, RATE_LIMITS.AI_HEAVY);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    // Verify caller is a super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT and check super admin role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: hasRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'super_admin',
    });

    if (!hasRole) {
      return new Response(JSON.stringify({ error: 'Super admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      action,
      messages,
      model,
      system_prompt,
      business_id,
      stream,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const selectedModel = model || 'google/gemini-2.5-flash';

    // ─── Chat action (supports streaming and non-streaming) ──────
    if (action === 'chat') {
      if (!messages || !Array.isArray(messages)) {
        throw new Error('messages array is required');
      }

      // Build system prompt: use custom or load from business
      let finalSystemPrompt = system_prompt || '';

      if (!finalSystemPrompt && business_id) {
        // Load business AI settings for context
        const { data: biz } = await supabase
          .from('businesses')
          .select('name, ai_system_behavior, ai_greeting, ai_personality_traits, ai_tone, specialty_type')
          .eq('id', business_id)
          .single();

        if (biz) {
          finalSystemPrompt = `You are an AI assistant for ${biz.name} (${biz.specialty_type || 'dental'} clinic).
${biz.ai_system_behavior || 'Be professional, helpful, and empathetic.'}
${biz.ai_personality_traits ? `Personality: ${JSON.stringify(biz.ai_personality_traits)}` : ''}
Tone: ${biz.ai_tone || 'professional'}
You can help patients book appointments, answer questions about services, and provide general dental information.`;
        }
      }

      if (!finalSystemPrompt) {
        finalSystemPrompt = 'You are a helpful dental clinic AI assistant. Help patients with appointment booking, dental questions, and clinic information. Be professional and empathetic.';
      }

      const aiMessages = [
        { role: 'system', content: finalSystemPrompt },
        ...messages,
      ];

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: aiMessages,
          stream: !!stream,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      if (stream) {
        return new Response(response.body, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        });
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';
      return new Response(JSON.stringify({
        response: content,
        model: selectedModel,
        usage: result.usage || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Compare action (two models, same prompt) ────────────────
    if (action === 'compare') {
      const { model_a, model_b, prompt, system_prompt: cmpSystemPrompt } = await req.json().catch(() => ({}));

      // We already parsed the body above, so use the values from there
      const body = { messages, model, system_prompt, business_id, stream, action };

      // Re-read from original request isn't possible, so use messages from the parsed body
      if (!messages || messages.length === 0) {
        throw new Error('messages array required for comparison');
      }

      const sysPrompt = system_prompt || 'You are a helpful dental clinic AI assistant.';
      const aiMessages = [
        { role: 'system', content: sysPrompt },
        ...messages,
      ];

      // model field will contain model_a, we need model_b from the body
      // The frontend will send two separate requests for comparison
      throw new Error('Use separate chat requests for model comparison');
    }

    // ─── List available models ───────────────────────────────────
    if (action === 'list_models') {
      return new Response(JSON.stringify({
        models: [
          { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'fast' },
          { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'standard' },
          { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', tier: 'fast' },
          { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', tier: 'premium' },
          { id: 'openai/gpt-5', name: 'GPT-5', tier: 'premium' },
          { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', tier: 'standard' },
          { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', tier: 'fast' },
        ],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('Error in ai-playground:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
