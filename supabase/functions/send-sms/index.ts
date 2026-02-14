import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';
import { sendSms } from '../_shared/sms.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  try {
    const { to, message, messageType } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'to and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendSms({ to, message, messageType: messageType || 'test' });

    return new Response(
      JSON.stringify(result),
      { status: result.success ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
