import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/lib/logger';
import { useBusinessTemplate } from '@/hooks/useBusinessTemplate';

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AppointmentAIAssistantProps {
  appointmentData: any;
  treatmentContext?: any;
  hideSummary?: boolean;
}

export function AppointmentAIAssistant({ appointmentData, treatmentContext, hideSummary = false }: AppointmentAIAssistantProps) {
  const { hasFeature, loading } = useBusinessTemplate();
  const hasAIChat = !loading && hasFeature('aiChat');

  // If AI chat is disabled or template is still loading, don't render
  if (loading || !hasAIChat) {
    return null;
  }

  const [summary, setSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate summary on mount
  useEffect(() => {
    generateSummary();
  }, [appointmentData]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateSummary = async () => {
    try {
      setLoadingSummary(true);
      const { data, error } = await supabase.functions.invoke("appointment-ai-assistant", {
        body: {
          action: "generate_summary",
          appointmentData,
        },
      });

      if (error) throw error;
      setSummary(data.summary);
    } catch (error: any) {
      console.error("Error generating summary:", error);
      toast({
        title: "Failed to generate summary",
        description: error.message,
        variant: "destructive",
      });
      setSummary("Unable to generate appointment summary at this time.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    // Create placeholder for assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/appointment-ai-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "chat",
            appointmentData,
            treatmentContext,
            messages: [...messages, userMessage],
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (response.status === 402) {
          throw new Error("Payment required. Please add credits.");
        }
        throw new Error("Failed to get AI response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Incomplete JSON, wait for more data
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error in chat:", error);

      // Remove placeholder message
      setMessages((prev) => prev.slice(0, -1));

      toast({
        title: "Chat Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Summary Card - Hidden from patients */}
      {!hideSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Appointment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Chat for Treatment Plans */}
      {appointmentData.status === "completed" || appointmentData.treatment_plan ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Treatment Plan Discussion
              </CardTitle>
              <Badge variant="secondary">AI Assistant</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chat Messages */}
            <ScrollArea ref={scrollRef} className="h-[300px] pr-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Ask me anything about this treatment plan</p>
                    <p className="text-xs mt-1">I have context from previous appointments and patient history</p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                        }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about treatment options, complications, alternatives..."
                className="min-h-[60px]"
                disabled={streaming}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                size="icon"
                className="shrink-0"
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Treatment plan discussion will be available after the appointment is completed</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}