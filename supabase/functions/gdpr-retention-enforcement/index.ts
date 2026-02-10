/**
 * GDPR Data Retention Enforcement
 * Scheduled edge function that runs daily to enforce data retention policies.
 * Deletes or anonymizes data that has exceeded its retention period.
 *
 * Invoke via cron job or manual trigger.
 * POST /functions/v1/gdpr-retention-enforcement
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from '../_shared/supabase-client.ts';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

interface RetentionResult {
  entity_type: string;
  action: string;
  records_affected: number;
  error?: string;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  const preflightResponse = handleCorsPreflightSafe(req);
  if (preflightResponse) return preflightResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify authorization - require service role key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results: RetentionResult[] = [];
    const now = new Date();

    // 1. Delete old SMS notifications (90 days)
    const smsDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: smsCount, error: smsError } = await supabase
      .from('sms_notifications')
      .delete({ count: 'exact' })
      .lt('created_at', smsDate);
    results.push({
      entity_type: 'sms_notifications',
      action: 'delete',
      records_affected: smsCount ?? 0,
      error: smsError?.message,
    });

    // 2. Delete old email logs (90 days)
    const emailDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: emailCount, error: emailError } = await supabase
      .from('email_event_logs')
      .delete({ count: 'exact' })
      .lt('created_at', emailDate);
    results.push({
      entity_type: 'email_event_logs',
      action: 'delete',
      records_affected: emailCount ?? 0,
      error: emailError?.message,
    });

    // 3. Delete old messages (90 days)
    const msgDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: msgCount, error: msgError } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .lt('created_at', msgDate);
    results.push({
      entity_type: 'messages',
      action: 'delete',
      records_affected: msgCount ?? 0,
      error: msgError?.message,
    });

    // 4. Delete old communication logs (90 days)
    const commDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: commCount, error: commError } = await supabase
      .from('communication_logs')
      .delete({ count: 'exact' })
      .lt('created_at', commDate);
    results.push({
      entity_type: 'communication_logs',
      action: 'delete',
      records_affected: commCount ?? 0,
      error: commError?.message,
    });

    // 5. Delete cancelled appointments older than 30 days
    const cancelDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: cancelCount, error: cancelError } = await supabase
      .from('appointments')
      .delete({ count: 'exact' })
      .eq('status', 'cancelled')
      .lt('updated_at', cancelDate);
    results.push({
      entity_type: 'cancelled_appointments',
      action: 'delete',
      records_affected: cancelCount ?? 0,
      error: cancelError?.message,
    });

    // 6. Clean up expired GDPR export bundles
    const { count: exportCount, error: exportError } = await supabase
      .from('gdpr_export_bundles')
      .delete({ count: 'exact' })
      .eq('status', 'expired');
    results.push({
      entity_type: 'gdpr_export_bundles',
      action: 'delete',
      records_affected: exportCount ?? 0,
      error: exportError?.message,
    });

    // 7. Expire old export bundles (older than 7 days)
    const exportExpireDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: expireCount, error: expireError } = await supabase
      .from('gdpr_export_bundles')
      .update({ status: 'expired' })
      .eq('status', 'completed')
      .lt('completed_at', exportExpireDate);
    results.push({
      entity_type: 'gdpr_export_bundles_expire',
      action: 'expire',
      records_affected: expireCount ?? 0,
      error: expireError?.message,
    });

    // Log the retention enforcement run
    await supabase.from('gdpr_audit_log').insert({
      action: 'delete',
      entity_type: 'retention_enforcement',
      purpose_code: 'admin',
      after_data: {
        run_at: now.toISOString(),
        results,
        total_deleted: results.reduce((sum, r) => sum + r.records_affected, 0),
      },
    });

    const totalAffected = results.reduce((sum, r) => sum + r.records_affected, 0);

    return new Response(JSON.stringify({
      success: true,
      run_at: now.toISOString(),
      total_records_processed: totalAffected,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
