import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS configuration - secure origins only (HIPAA/GDPR compliant)
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

// Helper to get CORS headers from request
const getRequestCorsHeaders = (req: Request) => getCorsHeaders(req.headers.get('Origin'));

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversation_history, current_step, business_data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a friendly AI assistant helping users create their healthcare business. Your role is to guide them through the setup process conversationally and extract information to auto-fill forms.

Current Step: ${current_step}
Business Data Collected: ${JSON.stringify(business_data || {})}

Guidelines:
- Be warm, encouraging, and conversational
- Ask clarifying questions to understand their needs
- Keep responses concise (2-3 sentences max)
- Use emojis occasionally to be friendly 😊

Step-specific guidance:
- Template (step 2): Ask about their practice type and specializations
- Details (step 3): Help craft compelling business name, tagline, and bio
- Services (step 4): Suggest relevant services based on their practice type
- Subscription (step 5): Explain plan benefits

CRITICAL: Extract information from user messages and use the extract_business_info tool to auto-fill forms.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "extract_business_info",
          description: "Extract business information from user's message to auto-fill form fields",
          parameters: {
            type: "object",
            properties: {
              name: { 
                type: "string", 
                description: "Business/practice name mentioned by user" 
              },
              tagline: { 
                type: "string", 
                description: "Tagline or slogan for the business" 
              },
              bio: { 
                type: "string", 
                description: "Bio or description of the practice" 
              },
              template: {
                type: "string",
                enum: ["healthcare"],
                description: "Business template type"
              },
              services: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    price: { type: "number" },
                    duration: { type: "number" }
                  }
                },
                description: "Services offered by the business"
              }
            }
          }
        }
      }
    ];

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
        tools: tools,
        tool_choice: "auto",
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
    const toolCalls = data.choices?.[0]?.message?.tool_calls;

    let suggestedData = null;
    
    // If AI used the tool to extract data
    if (toolCalls && toolCalls.length > 0) {
      const extractCall = toolCalls.find((tc: any) => tc.function?.name === "extract_business_info");
      if (extractCall) {
        try {
          const extracted = JSON.parse(extractCall.function.arguments);
          // Only include non-null values
          suggestedData = Object.fromEntries(
            Object.entries(extracted).filter(([_, v]) => v != null && v !== "")
          );
        } catch (e) {
          console.error("Failed to parse tool call arguments:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: aiMessage, 
        suggested_data: suggestedData 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("business-creation-ai error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
