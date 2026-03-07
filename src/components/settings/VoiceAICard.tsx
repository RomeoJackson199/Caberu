import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Clock, PhoneCall, Copy, Check, DollarSign, Bot, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useToast } from "@/hooks/use-toast";
import { PhoneSetupCard } from "./voice-ai/PhoneSetupCard";
import { VoiceAICallLog, CallLog } from "./voice-ai/VoiceAICallLog";

const AI_AGENT_PHONE = "+1 360 967 0625";

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
          .select('id, call_sid, status, duration_seconds, patient_phone, started_at, ended_at, appointment_booked, total_cost_eur, openai_cost_eur, twilio_cost_eur, tools_used, errors, transcript, created_at')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setCalls((data as CallLog[]) || []);
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

      {/* Phone Number Setup */}
      {businessId && <PhoneSetupCard businessId={businessId} />}

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

      {/* Call Log with expandable transcripts */}
      <VoiceAICallLog
        calls={calls}
        avgDuration={avgDuration}
        appointmentsBooked={appointmentsBooked}
      />
    </div>
  );
}
