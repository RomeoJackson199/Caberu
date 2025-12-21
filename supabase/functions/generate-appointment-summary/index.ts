import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { patientName, reason, urgency, notes, date, time } = appointmentData;

    // Generate both summaries in parallel
    const [shortSummary, longSummary] = await Promise.all([
      generateSummary("short", appointmentData, LOVABLE_API_KEY),
      generateSummary("long", appointmentData, LOVABLE_API_KEY)
    ]);

    return new Response(
      JSON.stringify({ shortSummary, longSummary }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating appointment summary:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        shortSummary: "Unable to generate summary",
        longSummary: "Unable to generate detailed summary at this time."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function generateSummary(
  type: "short" | "long",
  data: any,
  apiKey: string
): Promise<string> {
  const systemPrompt = type === "short"
    ? "You are a medical assistant. Create a brief 1-2 sentence summary of the appointment."
    : "You are a medical assistant. Create a detailed 3-4 sentence summary of the appointment including the chief complaint, planned procedures, and any relevant notes.";

  const userPrompt = `
Patient: ${data.patientName}
Date: ${data.date}
Time: ${data.time}
Reason: ${data.reason}
Urgency: ${data.urgency}
${data.notes ? `Notes: ${data.notes}` : ""}

Generate a ${type} summary of what will be done in this appointment.
  `.trim();

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("Payment required. Please add credits to your workspace.");
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "Unable to generate summary";
}
