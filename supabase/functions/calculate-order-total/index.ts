import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    // Get all order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('quantity, unit_price_cents')
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price_cents), 0
    );

    // Calculate tax (8% for example - should be configurable per business)
    const tax = Math.round(subtotal * 0.08);
    const total = subtotal + tax;

    // Update order with calculated totals
    const { error: updateError } = await supabase
      .from('restaurant_orders')
      .update({
        subtotal_cents: subtotal,
        tax_cents: tax,
        total_cents: total,
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        subtotal_cents: subtotal,
        tax_cents: tax,
        total_cents: total,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating order total:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
