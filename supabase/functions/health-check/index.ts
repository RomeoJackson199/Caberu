/**
 * Health Check Edge Function
 * Monitors database connectivity and system status
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      latency_ms: number | null;
      error?: string;
    };
    storage: {
      status: 'ok' | 'error';
      error?: string;
    };
  };
  version: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: 'error',
        latency_ms: null,
      },
      storage: {
        status: 'error',
      },
    },
    version: '1.0.0',
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Database health check
    try {
      const dbStart = performance.now();
      
      // Simple query to check database connectivity
      const { error: dbError } = await supabase
        .from('businesses')
        .select('id')
        .limit(1);
      
      const dbLatency = Math.round(performance.now() - dbStart);
      
      if (dbError) {
        health.checks.database = {
          status: 'error',
          latency_ms: dbLatency,
          error: dbError.message,
        };
      } else {
        health.checks.database = {
          status: 'ok',
          latency_ms: dbLatency,
        };
      }
    } catch (dbErr) {
      health.checks.database = {
        status: 'error',
        latency_ms: null,
        error: dbErr instanceof Error ? dbErr.message : 'Database connection failed',
      };
    }

    // Storage health check
    try {
      const { data: buckets, error: storageError } = await supabase
        .storage
        .listBuckets();
      
      if (storageError) {
        health.checks.storage = {
          status: 'error',
          error: storageError.message,
        };
      } else {
        health.checks.storage = {
          status: 'ok',
        };
      }
    } catch (storageErr) {
      health.checks.storage = {
        status: 'error',
        error: storageErr instanceof Error ? storageErr.message : 'Storage check failed',
      };
    }

    // Determine overall status
    const allChecksOk = Object.values(health.checks).every(
      (check) => check.status === 'ok'
    );
    const anyCheckFailed = Object.values(health.checks).some(
      (check) => check.status === 'error'
    );

    if (allChecksOk) {
      health.status = 'healthy';
    } else if (anyCheckFailed) {
      // If database is down, unhealthy; otherwise degraded
      health.status = health.checks.database.status === 'error' ? 'unhealthy' : 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    return new Response(JSON.stringify(health), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: errorMessage,
        checks: health.checks,
        version: '1.0.0',
      }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
