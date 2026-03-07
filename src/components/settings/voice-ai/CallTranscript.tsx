import { Bot, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { Json } from "@/integrations/supabase/types";

interface TranscriptEntry {
  role: string;
  content: string;
  timestamp?: string;
}

interface CallTranscriptProps {
  transcript: Json;
}

function parseTranscript(transcript: Json): TranscriptEntry[] {
  if (!transcript) return [];
  if (Array.isArray(transcript)) {
    return transcript
      .filter((e): e is Record<string, Json | undefined> =>
        typeof e === 'object' && e !== null && !Array.isArray(e)
      )
      .map((e) => ({
        role: String(e.role ?? 'unknown'),
        content: String(e.content ?? ''),
        timestamp: e.timestamp ? String(e.timestamp) : undefined,
      }))
      .filter((e) => e.content.trim().length > 0);
  }
  return [];
}

export function CallTranscript({ transcript }: CallTranscriptProps) {
  const entries = parseTranscript(transcript);

  if (entries.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        No transcript available for this call
      </div>
    );
  }

  return (
    <div className="space-y-2 py-3 px-2 max-h-[400px] overflow-y-auto">
      {entries.map((entry, i) => {
        const isAssistant = entry.role === 'assistant';
        const ts = entry.timestamp ? new Date(entry.timestamp) : null;

        return (
          <div
            key={i}
            className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`flex items-start gap-2 max-w-[85%] ${isAssistant ? '' : 'flex-row-reverse'}`}>
              <div className="flex-shrink-0 mt-0.5">
                {isAssistant ? (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                    <UserIcon className="w-3 h-3 text-secondary-foreground" />
                  </div>
                )}
              </div>
              <div
                className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  isAssistant
                    ? 'bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap">{entry.content}</p>
                {ts && !isNaN(ts.getTime()) && (
                  <p className={`text-[10px] mt-1 ${isAssistant ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
                    {format(ts, 'p')}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
