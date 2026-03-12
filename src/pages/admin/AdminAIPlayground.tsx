import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import {
  Bot,
  Send,
  Trash2,
  Mic,
  MicOff,
  Play,
  Square,
  Sparkles,
  MessageSquare,
  Phone,
  GitCompare,
  FileText,
  Loader2,
  RotateCcw,
  Zap,
} from 'lucide-react';

const PLAYGROUND_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-playground`;

// Available models
const AI_MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: 'fast' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'standard' },
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)', tier: 'fast' },
  { value: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Preview)', tier: 'premium' },
  { value: 'openai/gpt-5', label: 'GPT-5', tier: 'premium' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', tier: 'standard' },
  { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', tier: 'fast' },
];

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: Date;
}

// Helper: get auth token
async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

// Helper: get Caberu business ID
async function getCaberuBusinessId(): Promise<string | null> {
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', 'caberu')
    .single();
  return data?.id || null;
}

// Helper: call playground edge function (non-streaming)
async function playgroundChat(params: {
  messages: { role: string; content: string }[];
  model: string;
  system_prompt?: string;
  business_id?: string | null;
}): Promise<{ response: string; model: string; usage?: any }> {
  const token = await getAuthToken();
  const resp = await fetch(PLAYGROUND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'chat',
      messages: params.messages,
      model: params.model,
      system_prompt: params.system_prompt,
      business_id: params.business_id,
      stream: false,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
    throw new Error(err.error || `Request failed: ${resp.status}`);
  }
  return resp.json();
}

// Helper: streaming chat
async function playgroundStreamChat(params: {
  messages: { role: string; content: string }[];
  model: string;
  system_prompt?: string;
  business_id?: string | null;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  const token = await getAuthToken();
  const resp = await fetch(PLAYGROUND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'chat',
      messages: params.messages,
      model: params.model,
      system_prompt: params.system_prompt,
      business_id: params.business_id,
      stream: true,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
    throw new Error(err.error || `Request failed: ${resp.status}`);
  }

  if (!resp.body) throw new Error('No response body');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') {
        params.onDone();
        return;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) params.onDelta(content);
      } catch {
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }

  // Flush remaining
  if (buffer.trim()) {
    for (let raw of buffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (!raw.startsWith('data: ')) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) params.onDelta(content);
      } catch { /* ignore */ }
    }
  }

  params.onDone();
}

// ─── Text Chat Tab ───────────────────────────────────────────
function TextChatTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    getCaberuBusinessId().then(setBusinessId);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMsg = { role: 'user', content: input.trim(), timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { role: 'assistant', content: assistantContent, model, timestamp: new Date() }];
      });
    };

    try {
      await playgroundStreamChat({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        model,
        system_prompt: systemPrompt || undefined,
        business_id: businessId,
        onDelta: upsertAssistant,
        onDone: () => setIsLoading(false),
      });
    } catch (err: any) {
      toast({ title: 'AI Error', description: err.message, variant: 'destructive' });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="w-[240px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_MODELS.map(m => (
              <SelectItem key={m.value} value={m.value}>
                <div className="flex items-center gap-2">
                  {m.label}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{m.tier}</Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => setShowSystemPrompt(!showSystemPrompt)} className="gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          System Prompt
        </Button>

        <Badge variant="secondary" className="gap-1">
          <Zap className="h-3 w-3" />
          Streaming
        </Badge>

        <Button variant="ghost" size="sm" onClick={() => setMessages([])} className="gap-1.5 ml-auto">
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {showSystemPrompt && (
        <Textarea
          placeholder="Custom system prompt override (leave empty to use Caberu business settings)..."
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          className="mb-3 text-sm font-mono resize-none"
          rows={3}
        />
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Bot className="h-12 w-12 opacity-30" />
            <p className="text-sm">Start a conversation with the Caberu AI</p>
            <p className="text-xs">Uses the <strong>ai-playground</strong> edge function • Model: {AI_MODELS.find(m => m.value === model)?.label}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border shadow-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
              {msg.model && <p className="text-[10px] mt-1.5 opacity-60">{msg.model}</p>}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-card border rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <Input
          placeholder="Type a message as a patient..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Voice AI Tab ────────────────────────────────────────────
function VoiceAITab() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'active' | 'ended'>('idle');
  const [transcript, setTranscript] = useState<{ speaker: string; text: string }[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    getCaberuBusinessId().then(setBusinessId);
  }, []);

  const startCall = async () => {
    setCallStatus('connecting');
    setTranscript([]);

    try {
      // Use the voice-call-ai edge function to simulate a call
      const token = await getAuthToken();
      
      // For now, we demonstrate the voice AI by sending text messages through the voice-call-ai system
      setCallStatus('active');
      setIsCallActive(true);
      setTranscript(prev => [...prev, { 
        speaker: 'Eric (AI)', 
        text: 'Hello! Thank you for calling Caberu Dental Clinic. This is Eric, your AI receptionist. How can I help you today?' 
      }]);
    } catch (err: any) {
      toast({ title: 'Voice AI Error', description: err.message, variant: 'destructive' });
      setCallStatus('idle');
    }
  };

  const endCall = () => {
    setIsCallActive(false);
    setCallStatus('ended');
  };

  const sendVoiceMessage = async (text: string) => {
    if (!text.trim()) return;

    setTranscript(prev => [...prev, { speaker: 'You (Patient)', text }]);

    try {
      // Route through the voice-call-ai function's chat capability
      const token = await getAuthToken();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-playground`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'chat',
          messages: transcript.map(t => ({
            role: t.speaker.includes('AI') ? 'assistant' : 'user',
            content: t.text,
          })).concat([{ role: 'user', content: text }]),
          model: 'google/gemini-2.5-flash',
          system_prompt: `You are Eric, an AI phone receptionist for Caberu Dental Clinic in Belgium. 
You are speaking on a phone call, so keep responses conversational and concise (1-3 sentences).
You help patients book appointments, answer questions about services, and provide clinic information.
Always be warm, professional, and helpful. Speak naturally as if on a phone call.
When booking, ask for: symptoms/reason, preferred dentist, preferred day, and preferred time.
The clinic is open Monday-Friday 9:00-18:00 in the Europe/Brussels timezone.`,
          business_id: businessId,
          stream: false,
        }),
      });

      if (!resp.ok) throw new Error('Failed to get voice AI response');
      const data = await resp.json();
      setTranscript(prev => [...prev, { speaker: 'Eric (AI)', text: data.response }]);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const [voiceInput, setVoiceInput] = useState('');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Voice AI Receptionist — Eric
          </CardTitle>
          <CardDescription>
            Simulate a phone call to the Caberu clinic. Eric will respond as the AI receptionist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Call controls */}
          <div className="flex items-center justify-center gap-4 py-4">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center transition-all duration-500 ${
              isCallActive
                ? 'bg-destructive/10 ring-4 ring-destructive/20 animate-pulse'
                : callStatus === 'connecting'
                ? 'bg-primary/10 ring-4 ring-primary/20 animate-pulse'
                : 'bg-muted'
            }`}>
              {isCallActive ? (
                <Phone className="h-8 w-8 text-destructive" />
              ) : (
                <Phone className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            {callStatus === 'idle' || callStatus === 'ended' ? (
              <Button size="lg" onClick={startCall} className="gap-2">
                <Play className="h-4 w-4" />
                {callStatus === 'ended' ? 'New Call' : 'Start Call'}
              </Button>
            ) : (
              <Button size="lg" variant="destructive" onClick={endCall} className="gap-2">
                <Square className="h-4 w-4" />
                End Call
              </Button>
            )}
          </div>

          {callStatus !== 'idle' && (
            <Badge variant={isCallActive ? 'default' : 'secondary'} className="mx-auto block w-fit">
              {callStatus === 'connecting' && 'Connecting...'}
              {callStatus === 'active' && '🔴 Call Active'}
              {callStatus === 'ended' && 'Call Ended'}
            </Badge>
          )}

          {/* Transcript */}
          {transcript.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Call Transcript</h4>
                <ScrollArea className="h-56 rounded-lg border bg-muted/20 p-3">
                  <div className="space-y-3">
                    {transcript.map((line, i) => (
                      <div key={i} className={`flex ${line.speaker.includes('AI') ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                          line.speaker.includes('AI')
                            ? 'bg-card border shadow-sm'
                            : 'bg-primary text-primary-foreground'
                        }`}>
                          <p className="text-[10px] font-medium opacity-70 mb-0.5">{line.speaker}</p>
                          <p className="text-sm">{line.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {/* Voice input (text simulation) */}
          {isCallActive && (
            <div className="flex gap-2">
              <Input
                placeholder="Type what you'd say on the phone..."
                value={voiceInput}
                onChange={e => setVoiceInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    sendVoiceMessage(voiceInput);
                    setVoiceInput('');
                  }
                }}
              />
              <Button
                onClick={() => { sendVoiceMessage(voiceInput); setVoiceInput(''); }}
                disabled={!voiceInput.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Model Comparison Tab ────────────────────────────────────
function ModelComparisonTab() {
  const [prompt, setPrompt] = useState('');
  const [modelA, setModelA] = useState('google/gemini-2.5-flash');
  const [modelB, setModelB] = useState('openai/gpt-5-mini');
  const [responseA, setResponseA] = useState('');
  const [responseB, setResponseB] = useState('');
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    getCaberuBusinessId().then(setBusinessId);
  }, []);

  const runComparison = async () => {
    if (!prompt.trim()) return;
    setLoadingA(true);
    setLoadingB(true);
    setResponseA('');
    setResponseB('');

    const messages = [{ role: 'user', content: prompt }];

    // Run both in parallel
    playgroundChat({ messages, model: modelA, business_id: businessId })
      .then(r => setResponseA(r.response))
      .catch(e => { setResponseA(`Error: ${e.message}`); toast({ title: 'Model A Error', description: e.message, variant: 'destructive' }); })
      .finally(() => setLoadingA(false));

    playgroundChat({ messages, model: modelB, business_id: businessId })
      .then(r => setResponseB(r.response))
      .catch(e => { setResponseB(`Error: ${e.message}`); toast({ title: 'Model B Error', description: e.message, variant: 'destructive' }); })
      .finally(() => setLoadingB(false));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Textarea
            placeholder="Enter a test prompt (e.g., 'I have a toothache and need an urgent appointment')..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
        <Button onClick={runComparison} disabled={loadingA || loadingB || !prompt.trim()} className="gap-2">
          {(loadingA || loadingB) ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
          Compare
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Model A</CardTitle>
              <Select value={modelA} onValueChange={setModelA}>
                <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {loadingA ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Generating...</span>
                </div>
              ) : responseA ? (
                <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{responseA}</ReactMarkdown></div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Response will appear here...</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Model B</CardTitle>
              <Select value={modelB} onValueChange={setModelB}>
                <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {loadingB ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Generating...</span>
                </div>
              ) : responseB ? (
                <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{responseB}</ReactMarkdown></div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Response will appear here...</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Prompt Editor Tab ───────────────────────────────────────
function PromptEditorTab() {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [response, setResponse] = useState('');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    getCaberuBusinessId().then(setBusinessId);
  }, []);

  const testPrompt = async () => {
    if (!testMessage.trim() || !systemPrompt.trim()) return;
    setIsLoading(true);
    setResponse('');

    try {
      const result = await playgroundChat({
        messages: [{ role: 'user', content: testMessage }],
        model,
        system_prompt: systemPrompt,
        business_id: businessId,
      });
      setResponse(result.response);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-[calc(100vh-300px)] min-h-[500px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">System Prompt</h3>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AI_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Textarea
          placeholder="Write your custom system prompt here...&#10;&#10;Example: You are a friendly dental receptionist for Caberu clinic..."
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          className="flex-1 font-mono text-sm resize-none"
        />

        <div className="flex gap-2">
          <Input
            placeholder="Test message from patient..."
            value={testMessage}
            onChange={e => setTestMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && testPrompt()}
            className="flex-1"
          />
          <Button onClick={testPrompt} disabled={isLoading || !testMessage.trim() || !systemPrompt.trim()} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Test
          </Button>
        </div>
      </div>

      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">AI Response</CardTitle>
            {response && (
              <Button variant="ghost" size="sm" onClick={() => setResponse('')} className="gap-1 h-7">
                <RotateCcw className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {response ? (
              <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{response}</ReactMarkdown></div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-12">
                <Sparkles className="h-8 w-8 opacity-30" />
                <p className="text-sm">Write a system prompt and test message</p>
                <p className="text-xs">See how different prompts affect the AI response</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function AdminAIPlayground() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Playground
        </h1>
        <p className="text-muted-foreground mt-1">
          Test AI models, compare responses, simulate voice calls — all using the dedicated <code className="text-xs bg-muted px-1.5 py-0.5 rounded">ai-playground</code> edge function, scoped to Caberu.
        </p>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Text Chat
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            Voice AI
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-1.5">
            <GitCompare className="h-3.5 w-3.5" />
            Compare Models
          </TabsTrigger>
          <TabsTrigger value="prompt" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Prompt Editor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4"><TextChatTab /></TabsContent>
        <TabsContent value="voice" className="mt-4"><VoiceAITab /></TabsContent>
        <TabsContent value="compare" className="mt-4"><ModelComparisonTab /></TabsContent>
        <TabsContent value="prompt" className="mt-4"><PromptEditorTab /></TabsContent>
      </Tabs>
    </div>
  );
}
