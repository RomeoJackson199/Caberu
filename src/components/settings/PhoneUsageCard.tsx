import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Clock, AlertTriangle, TrendingUp, PhoneCall, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// AI Voice Agent Configuration
const AI_AGENT_PHONE = "+1 360 967 0625";
const AI_AGENT_ID = "agent_0601kabr6jxseqr9deax9c7ft5rq";

interface PhoneUsageData {
  minutes_used: number;
  minutes_limit: number;
  minutes_remaining: number;
  is_over_limit: boolean;
  overage_minutes: number;
  overage_cost_cents: number;
}

interface CallRecord {
  id: string;
  duration_seconds: number;
  caller_phone: string | null;
  call_type: string | null;
  created_at: string;
  cost_cents: number | null;
  included_in_plan: boolean | null;
}

export function PhoneUsageCard() {
  const { businessId } = useBusinessContext();
  const { toast } = useToast();
  const [usage, setUsage] = useState<PhoneUsageData | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    
    const fetchUsage = async () => {
      setLoading(true);
      try {
        // Get current phone minutes available
        const { data: usageData, error: usageError } = await supabase
          .rpc('check_phone_minutes_available', { p_business_id: businessId });
        
        if (usageError) throw usageError;
        
        if (usageData) {
          setUsage(usageData as PhoneUsageData);
        }

        // Get recent calls
        const { data: callData, error: callError } = await supabase
          .from('phone_usage')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (callError) throw callError;
        setCalls(callData || []);
      } catch (error) {
        console.error('Failed to load phone usage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [businessId]);

  const copyPhoneNumber = async () => {
    await navigator.clipboard.writeText(AI_AGENT_PHONE.replace(/\s/g, ''));
    setCopied(true);
    toast({ title: "Copied!", description: "Phone number copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCost = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  const usagePercentage = usage 
    ? Math.min(100, (usage.minutes_used / usage.minutes_limit) * 100)
    : 0;

  const isNearLimit = usagePercentage >= 80;
  const isOverLimit = usage?.is_over_limit || false;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            AI Voice Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          AI Voice Agent
        </CardTitle>
        <CardDescription>
          Your AI receptionist for appointment booking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agent Phone Number */}
        <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Call Your AI Agent</p>
              <p className="text-2xl font-bold tracking-wide">{AI_AGENT_PHONE}</p>
              <p className="text-xs text-muted-foreground">
                Agent ID: {AI_AGENT_ID.slice(0, 20)}...
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={copyPhoneNumber}
                className="gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                size="sm"
                asChild
                className="gap-2"
              >
                <a href={`tel:${AI_AGENT_PHONE.replace(/\s/g, '')}`}>
                  <PhoneCall className="h-4 w-4" />
                  Call Now
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Usage Meter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Daily Usage</span>
            <span className="font-medium">
              {usage?.minutes_used ?? 0} / {usage?.minutes_limit ?? 0} minutes
            </span>
          </div>
          
          <Progress 
            value={usagePercentage} 
            className={`h-3 ${isOverLimit ? 'bg-destructive/20' : isNearLimit ? 'bg-warning/20' : ''}`}
          />
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {usage?.minutes_remaining ?? 0} minutes remaining
            </span>
            {isOverLimit && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Over limit
              </Badge>
            )}
            {isNearLimit && !isOverLimit && (
              <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning-foreground">
                <TrendingUp className="h-3 w-3" />
                Near limit
              </Badge>
            )}
          </div>
        </div>

        {/* Overage Cost */}
        {usage?.overage_minutes > 0 && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-destructive">Overage Charges</p>
                <p className="text-xs text-muted-foreground">
                  {usage.overage_minutes} extra minutes used
                </p>
              </div>
              <span className="text-lg font-bold text-destructive">
                {formatCost(usage.overage_cost_cents)}
              </span>
            </div>
          </div>
        )}

        {/* Recent Calls */}
        {calls.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Calls
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {call.caller_phone || 'Unknown Caller'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(call.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {formatDuration(call.duration_seconds)}
                    </span>
                    {call.cost_cents !== null && call.cost_cents > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {formatCost(call.cost_cents)}
                      </Badge>
                    )}
                    {call.included_in_plan && (
                      <Badge variant="secondary" className="text-xs">
                        Included
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {calls.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No calls recorded yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
