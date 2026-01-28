import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { checkRateLimitMemory, getUserRateLimitKey, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  // SECURITY: Per-user rate limiting for support chat (uses user ID from JWT + IP)
  const userKey = getUserRateLimitKey(req);
  const rateLimitResult = checkRateLimitMemory(userKey, RATE_LIMITS.SUPPORT_CHAT);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const { message, conversation_history, context = "general" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const generalSystemPrompt = `You are Caberu Support AI, a friendly and helpful assistant for the Caberu healthcare business management platform.

Your role is to help users with:
- Understanding platform features and capabilities
- Answering questions about appointments, services, and billing
- Explaining subscription plans and pricing
- Providing guidance on getting started
- Troubleshooting common issues
- General support questions

Guidelines:
- Be warm, friendly, and professional
- Keep responses concise and clear (2-4 sentences)
- Use emojis occasionally to be friendly 😊
- If you don't know something specific, direct users to contact support
- Focus on being helpful and solutions-oriented`;

    const onboardingSystemPrompt = `You are Caberu Onboarding AI, a friendly assistant helping users set up their healthcare business.

Your role is to help with:
- Choosing the right business name
- Creating compelling taglines
- Writing professional business bios
- Understanding the business creation process
- Selecting subscription plans
- Navigating the setup steps

Guidelines:
- Be encouraging and supportive
- Provide creative suggestions when asked
- Keep responses concise (2-3 sentences)
- Use emojis to be friendly 😊
- Help users feel confident about their choices`;

    const systemPrompt = context === "onboarding" ? onboardingSystemPrompt : generalSystemPrompt;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...(conversation_history || []),
          { role: "user", content: message },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "I'm here to help! How can I assist you?";

    return new Response(
      JSON.stringify({ message: aiMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("caberu-support-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
