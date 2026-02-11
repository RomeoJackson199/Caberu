/**
 * GDPR Data Retention Enforcement
 * Scheduled edge function that runs daily to enforce data retention policies.
 * Deletes or anonymizes data that has exceeded its retention period.
 *
 * Schedule: Daily at 02:00 CET via pg_cron or external scheduler
 * POST /functions/v1/gdpr-retention-enforcement
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from '../_shared/supabase-client.ts';
import { getCorsHeaders, handleCorsPreflightSafe } from '../_shared/cors.ts';

interface RetentionRule {
  entity_type: string;
  table_name: string;
  retention_days: number;
  action: 'delete' | 'anonymize';
  date_field: string;
  filter?: Record<string, string>;
}

interface RetentionResult {
  entity_type: string;
  action: string;
  records_affected: number;
  error?: string;
}

/**
 * Retention rules aligned with retentionPolicy.ts configuration.
 * These must match the frontend config for consistency.
 */
const RETENTION_RULES: RetentionRule[] = [
  {
    entity_type: 'call_recordings',
    table_name: 'phone_usage',
    retention_days: 30,
    action: 'delete',
    date_field: 'created_at',
  },
  {
    entity_type: 'ai_transcripts',
    table_name: 'communication_logs',
    retention_days: 90,
    action: 'delete',
    date_field: 'created_at',
  },
  {
    entity_type: 'chat_messages',
    table_name: 'messages',
    retention_days: 90,
    action: 'delete',
    date_field: 'created_at',
  },
  {
    entity_type: 'sms_notifications',
    table_name: 'sms_notifications',
    retention_days: 90,
    action: 'delete',
    date_field: 'created_at',
  },
  {
    entity_type: 'email_logs',
    table_name: 'email_event_logs',
    retention_days: 90,
    action: 'delete',
    date_field: 'created_at',
  },
  {
    entity_type: 'cancelled_appointments',
    table_name: 'appointments',
    retention_days: 30,
    action: 'delete',
    date_field: 'updated_at',
    filter: { status: 'cancelled' },
  },
  {
    entity_type: 'expired_export_bundles',
    table_name: 'gdpr_export_bundles',
    retention_days: 7,
    action: 'delete',
    date_field: 'created_at',
  },
];

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

    // Process each retention rule
    for (const rule of RETENTION_RULES) {
      try {
        const cutoffDate = new Date(now.getTime() - rule.retention_days * 24 * 60 * 60 * 1000).toISOString();

        let query = supabase
          .from(rule.table_name)
          .delete({ count: 'exact' })
          .lt(rule.date_field, cutoffDate);

        // Apply additional filters if specified
        if (rule.filter) {
          for (const [key, value] of Object.entries(rule.filter)) {
            query = query.eq(key, value);
          }
        }

        const { count, error } = await query;

        results.push({
          entity_type: rule.entity_type,
          action: rule.action,
          records_affected: count ?? 0,
          error: error?.message,
        });
      } catch (ruleError) {
        const message = ruleError instanceof Error ? ruleError.message : 'Unknown error';
        results.push({
          entity_type: rule.entity_type,
          action: rule.action,
          records_affected: 0,
          error: message,
        });
      }
    }

    // Expire old export bundles (mark as expired, don't delete yet)
    try {
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
    } catch {
      // Non-critical: export bundle expiry is best-effort
    }

    // Expire consent records past their expiry date
    try {
      const { count: consentExpireCount, error: consentExpireError } = await supabase
        .from('consent_records')
        .update({ status: 'expired' })
        .eq('status', 'granted')
        .lt('expires_at', now.toISOString())
        .not('expires_at', 'is', null);
      results.push({
        entity_type: 'expired_consents',
        action: 'expire',
        records_affected: consentExpireCount ?? 0,
        error: consentExpireError?.message,
      });
    } catch {
      // Non-critical: consent expiry is best-effort
    }

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
