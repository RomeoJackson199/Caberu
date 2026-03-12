import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';

// Available models for the playground
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
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp: Date;
}

// ─── Text Chat Tab ───────────────────────────────────────────
function TextChatTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMsg = { role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Call dental-ai-chat with business_id for Caberu
      const { data: caberuBiz } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', 'caberu')
        .single();

      const { data, error } = await supabase.functions.invoke('dental-ai-chat', {
        body: {
          message: userMsg.content,
          conversation_history: messages.map(m => ({
            role: m.role === 'assistant' ? 'bot' : 'user',
            content: m.content,
          })),
          user_profile: { name: 'Super Admin (Test)', email: 'admin@caberu.be' },
          business_id: caberuBiz?.id || null,
          playground_model: model,
          playground_system_prompt: systemPrompt || undefined,
        },
      });

      if (error) throw error;

      const responseText = data?.response || data?.fallback_response || 'No response';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: responseText, model, timestamp: new Date() },
      ]);
    } catch (err: any) {
      toast({
        title: 'AI Error',
        description: err.message || 'Failed to get response',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      {/* Controls */}
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
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {m.tier}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          className="gap-1.5"
        >
          <FileText className="h-3.5 w-3.5" />
          System Prompt
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMessages([])}
          className="gap-1.5 ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {showSystemPrompt && (
        <Textarea
          placeholder="Custom system prompt override (leave empty to use default Caberu prompt)..."
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          className="mb-3 text-sm font-mono resize-none"
          rows={3}
        />
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Bot className="h-12 w-12 opacity-30" />
            <p className="text-sm">Start a conversation with the Caberu AI</p>
            <p className="text-xs">Try: "I have a toothache" or "I want to book an appointment"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border shadow-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
              {msg.model && (
                <p className="text-[10px] mt-1.5 opacity-60">{msg.model}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
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

      {/* Input */}
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
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Voice AI Receptionist (Eric)
          </CardTitle>
          <CardDescription>
            Test the voice AI receptionist as if calling the Caberu clinic. Uses ElevenLabs voice synthesis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4 py-8">
            <div
              className={`h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording
                  ? 'bg-destructive/10 ring-4 ring-destructive/30 animate-pulse'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {isRecording ? (
                <MicOff className="h-10 w-10 text-destructive" />
              ) : (
                <Mic className="h-10 w-10 text-muted-foreground" />
              )}
            </div>

            <Button
              size="lg"
              variant={isRecording ? 'destructive' : 'default'}
              onClick={() => setIsRecording(!isRecording)}
              className="gap-2"
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4" />
                  End Call
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Test Call
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center max-w-md">
              {isRecording
                ? 'Voice AI is listening... Speak naturally as if calling the clinic.'
                : 'Click to simulate a phone call to the Caberu clinic. The AI receptionist "Eric" will answer.'}
            </p>
          </div>

          {transcript.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Live Transcript</h4>
                <ScrollArea className="h-48 rounded border p-3">
                  {transcript.map((line, i) => (
                    <p key={i} className="text-sm text-muted-foreground">{line}</p>
                  ))}
                </ScrollArea>
              </div>
            </>
          )}

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Voice AI requires a Twilio phone number to be configured. 
              This is a preview of the interface — full voice testing requires the ElevenLabs + Twilio integration.
            </p>
          </div>
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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const runComparison = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResponseA('');
    setResponseB('');

    try {
      const { data: caberuBiz } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', 'caberu')
        .single();

      const [resA, resB] = await Promise.all([
        supabase.functions.invoke('dental-ai-chat', {
          body: {
            message: prompt,
            conversation_history: [],
            user_profile: { name: 'Test Patient', email: 'test@caberu.be' },
            business_id: caberuBiz?.id || null,
            playground_model: modelA,
          },
        }),
        supabase.functions.invoke('dental-ai-chat', {
          body: {
            message: prompt,
            conversation_history: [],
            user_profile: { name: 'Test Patient', email: 'test@caberu.be' },
            business_id: caberuBiz?.id || null,
            playground_model: modelB,
          },
        }),
      ]);

      setResponseA(resA.data?.response || resA.data?.fallback_response || 'No response');
      setResponseB(resB.data?.response || resB.data?.fallback_response || 'No response');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Textarea
            placeholder="Enter a test prompt (e.g., 'I have a toothache and want to book an appointment')..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
        <Button onClick={runComparison} disabled={isLoading || !prompt.trim()} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
          Compare
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Model A */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Model A</CardTitle>
              <Select value={modelA} onValueChange={setModelA}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {responseA ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{responseA}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Response will appear here...</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Model B */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Model B</CardTitle>
              <Select value={modelB} onValueChange={setModelB}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {responseB ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{responseB}</ReactMarkdown>
                </div>
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
  const { toast } = useToast();

  const testPrompt = async () => {
    if (!testMessage.trim() || !systemPrompt.trim()) return;
    setIsLoading(true);
    setResponse('');

    try {
      const { data: caberuBiz } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', 'caberu')
        .single();

      const { data, error } = await supabase.functions.invoke('dental-ai-chat', {
        body: {
          message: testMessage,
          conversation_history: [],
          user_profile: { name: 'Test Patient', email: 'test@caberu.be' },
          business_id: caberuBiz?.id || null,
          playground_model: model,
          playground_system_prompt: systemPrompt,
        },
      });

      if (error) throw error;
      setResponse(data?.response || data?.fallback_response || 'No response');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-[calc(100vh-300px)] min-h-[500px]">
      {/* Editor side */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">System Prompt</h3>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
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

      {/* Response side */}
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
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{response}</ReactMarkdown>
              </div>
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
          Test AI models, compare responses, and experiment with prompts — scoped to the Caberu business.
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

        <TabsContent value="chat" className="mt-4">
          <TextChatTab />
        </TabsContent>

        <TabsContent value="voice" className="mt-4">
          <VoiceAITab />
        </TabsContent>

        <TabsContent value="compare" className="mt-4">
          <ModelComparisonTab />
        </TabsContent>

        <TabsContent value="prompt" className="mt-4">
          <PromptEditorTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
