import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CallTranscript } from "./CallTranscript";
import { Json } from "@/integrations/supabase/types";

export interface CallLog {
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
  tools_used: Json;
  errors: Json;
  transcript: Json;
  created_at: string | null;
}

interface VoiceAICallLogProps {
  calls: CallLog[];
  avgDuration: number;
  appointmentsBooked: number;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatCost(eur: number | null) {
  if (!eur) return '€0.00';
  return `€${eur.toFixed(4)}`;
}

function maskPhone(phone: string | null) {
  if (!phone) return 'Unknown';
  return phone.slice(0, 4) + '***' + phone.slice(-2);
}

export function VoiceAICallLog({ calls, avgDuration, appointmentsBooked }: VoiceAICallLogProps) {
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  return (
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
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {calls.map((call) => {
              const isExpanded = expandedCallId === call.id;
              const hasTranscript = call.transcript && Array.isArray(call.transcript) && call.transcript.length > 0;

              return (
                <Collapsible
                  key={call.id}
                  open={isExpanded}
                  onOpenChange={() => setExpandedCallId(isExpanded ? null : call.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? 'border-primary/30 bg-muted/30' : ''}`}>
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
                        {hasTranscript && (
                          isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  {hasTranscript && (
                    <CollapsibleContent>
                      <div className="border border-t-0 rounded-b-lg px-3">
                        <CallTranscript transcript={call.transcript} />
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              );
            })}
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
  );
}
