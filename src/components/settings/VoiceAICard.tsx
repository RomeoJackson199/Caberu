import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Clock, PhoneCall, Copy, Check, DollarSign, Bot, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const AI_AGENT_PHONE = "+1 360 967 0625";

interface CallLog {
  id: string;
  call_sid: string;
  status: string | null;
  duration_seconds: number | null;
  patient_phone: string | null;
  started_at: string | null;
  ended_at: string | null;
  appointment_booked: boolean | null;
  total_cost_eur: number | null;
  openai_cost_eur: number | null;
  twilio_cost_eur: number | null;
  tools_used: any;
  errors: any;
  created_at: string | null;
}

export function VoiceAICard() {
  const { businessId } = useBusinessContext();
  const { toast } = useToast();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!businessId) return;

    const fetchCalls = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('call_logs')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setCalls(data || []);
      } catch (error) {
        console.error('Failed to load call logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [businessId]);

  const copyPhoneNumber = async () => {
    await navigator.clipboard.writeText(AI_AGENT_PHONE.replace(/\s/g, ''));
    setCopied(true);
    toast({ title: "Copied!", description: "Phone number copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCost = (eur: number | null) => {
    if (!eur) return '€0.00';
    return `€${eur.toFixed(4)}`;
  };

  const maskPhone = (phone: string | null) => {
    if (!phone) return 'Unknown';
    return phone.slice(0, 4) + '***' + phone.slice(-2);
  };

  // Stats
  const totalCalls = calls.length;
  const completedCalls = calls.filter(c => c.status === 'completed').length;
  const appointmentsBooked = calls.filter(c => c.appointment_booked).length;
  const totalCost = calls.reduce((s, c) => s + (c.total_cost_eur || 0), 0);
  const totalMinutes = calls.reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60;
  const avgDuration = totalCalls > 0 ? calls.reduce((s, c) => s + (c.duration_seconds || 0), 0) / totalCalls : 0;
  const bookingRate = completedCalls > 0 ? Math.round((appointmentsBooked / completedCalls) * 100) : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Voice AI Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Voice AI Agent
          </CardTitle>
          <CardDescription>Your AI receptionist powered by Twilio + OpenAI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Call Your AI Agent</p>
                <p className="text-2xl font-bold tracking-wide">{AI_AGENT_PHONE}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" onClick={copyPhoneNumber} className="gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" asChild className="gap-2">
                  <a href={`tel:${AI_AGENT_PHONE.replace(/\s/g, '')}`}>
                    <PhoneCall className="h-4 w-4" />
                    Call Now
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalCalls}</p>
                <p className="text-xs text-muted-foreground">Total Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalMinutes.toFixed(1)}m</p>
                <p className="text-xs text-muted-foreground">Total Minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{bookingRate}%</p>
                <p className="text-xs text-muted-foreground">Booking Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">€{totalCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Recent Calls
          </CardTitle>
          <CardDescription>
            Avg duration: {formatDuration(Math.round(avgDuration))} · {appointmentsBooked} appointments booked
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calls.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {calls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      call.status === 'completed' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      <Phone className={`h-4 w-4 ${
                        call.status === 'completed' ? 'text-green-500' : 'text-red-500'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{maskPhone(call.patient_phone)}</p>
                      <p className="text-xs text-muted-foreground">
                        {call.started_at
                          ? formatDistanceToNow(new Date(call.started_at), { addSuffix: true })
                          : 'Unknown time'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{formatDuration(call.duration_seconds)}</span>
                    {call.appointment_booked && (
                      <Badge variant="default" className="text-xs">Booked</Badge>
                    )}
                    {call.errors && Array.isArray(call.errors) && call.errors.length > 0 && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {formatCost(call.total_cost_eur)}
                    </Badge>
                    <Badge
                      variant={call.status === 'completed' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {call.status || 'unknown'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No calls recorded yet</p>
              <p className="text-xs mt-1">Try calling your AI agent to test it</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
