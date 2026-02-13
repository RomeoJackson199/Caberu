import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, Bot, Building2, Edit, Save, X, Sparkles, Globe, RotateCcw, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLogAction } from '@/hooks/useSuperAdmin';

interface BusinessAIConfig {
  id: string;
  name: string;
  slug: string;
  ai_system_behavior: string | null;
  ai_greeting: string | null;
  ai_personality_traits: string[] | null;
}

interface DefaultAIConfig {
  system_behavior: string;
  greeting: string;
  personality_traits: string[];
}

/** Each section of the system prompt */
interface PromptSections {
  core_rules: string;
  language_handling: string;
  booking_flow: string;
  widget_code_system: string;
  response_style: string;
  examples: string;
}

const DEFAULT_AI_CONFIG_KEY = 'default_ai_config';
const AI_SYSTEM_PROMPT_KEY = 'ai_system_prompt';

// ── Factory defaults for each section ──────────────────────────────

const FACTORY_SECTIONS: PromptSections = {
  core_rules: `- Keep responses SHORT and CONVERSATIONAL (2-3 sentences max)
- Ask ONE question at a time
- Never mention specific dentist names - let the system recommend them
- Never discuss time/availability - focus only on symptoms and needs
- Be warm, helpful, and natural
- The appointment is always for the patient you're talking to
- You can ONLY help with booking appointments. You cannot help with payments, prescriptions, rescheduling, cancellations, or viewing appointments. If asked about those, politely redirect to booking or suggest they use the dashboard.`,

  language_handling: `- Respond in whatever language the patient uses
- If they switch languages mid-conversation, switch with them seamlessly
- [[SERVICE:...]] must always use the exact service name from AVAILABLE SERVICES list
- [[SYMPTOMS:...]] should be written in the patient's language`,

  booking_flow: `1. Ask about symptoms or concerns: "What brings you in today?"
2. Ask follow-up questions to understand the issue better
3. Once you understand the problem, use code 12345 to proceed to booking`,

  widget_code_system: `You have ONE technical code that activates the booking widget.
This is the ONLY action you can perform:

AVAILABLE CODE:
- 12345 = Ready to book widget (use when you have collected enough information and are ready to proceed to booking)

USAGE:
When ready to book, start your response with the code and include metadata:
"12345 [[SERVICE:service_name_here]] [[SYMPTOMS:brief symptom summary here]] Perfect! I have all the information I need to help you book an appointment."

The [[SERVICE:...]] tag should contain the exact name of the most appropriate service from the AVAILABLE SERVICES list.
The [[SYMPTOMS:...]] tag should contain a 1-2 sentence summary of what the patient described in THEIR language.

If you're still gathering information, DON'T use a code.

IMPORTANT:
- Use code 12345 when you have enough information about the patient's symptoms/reason for visit
- Always include [[SERVICE:...]] and [[SYMPTOMS:...]] tags when using code 12345
- Do NOT use any other codes - 12345 is the only code available
- For general questions and gathering info: NO code
- Codes are invisible to the user`,

  response_style: `Good: "What brings you in today? Any pain or specific concerns?"
Good: "I see, can you describe the pain - is it sharp, throbbing, or constant?"
Good: "12345 [[SERVICE:General Checkup]] [[SYMPTOMS:Routine dental checkup, no specific concerns]] Got it! Let me help you book your appointment."
Bad: "I understand you are experiencing dental concerns and would like to schedule..."`,

  examples: `User: "I need an appointment"
You: "I'd be happy to help! What brings you in today?"

User: "My tooth hurts"
You: "I'm sorry to hear that. Can you describe the pain - is it sharp, throbbing, or constant? And which tooth is it?"

User: "It's a sharp pain in my back tooth, started 2 days ago"
You: "12345 [[SERVICE:Emergency Dental Care]] [[SYMPTOMS:Sharp pain in back tooth for 2 days]] Got it! Let me help you book an appointment right away."

User: "I just need a cleaning"
You: "12345 [[SERVICE:Dental Cleaning]] [[SYMPTOMS:Routine dental cleaning requested]] Perfect! Let's get you scheduled for a cleaning."`,
};

const SECTION_LABELS: Record<keyof PromptSections, { title: string; description: string }> = {
  core_rules: {
    title: 'Core Rules',
    description: 'Fundamental behavioral rules for the AI assistant',
  },
  language_handling: {
    title: 'Language Handling',
    description: 'How the AI handles multilingual conversations',
  },
  booking_flow: {
    title: 'Booking Flow',
    description: 'The step-by-step booking conversation flow',
  },
  widget_code_system: {
    title: 'Widget Code System',
    description: 'Technical code system for activating the booking widget',
  },
  response_style: {
    title: 'Response Style',
    description: 'Good and bad response examples for the AI',
  },
  examples: {
    title: 'Conversation Examples',
    description: 'Full conversation examples for few-shot learning',
  },
};

const SECTION_ORDER: (keyof PromptSections)[] = [
  'core_rules',
  'language_handling',
  'booking_flow',
  'widget_code_system',
  'response_style',
  'examples',
];

/** Assemble sections into a single prompt string */
function assembleSections(sections: PromptSections): string {
  return `CORE RULES:\n${sections.core_rules}\n\nLANGUAGE HANDLING:\n${sections.language_handling}\n\nBOOKING FLOW:\n${sections.booking_flow}\n\nWIDGET CODE SYSTEM:\n${sections.widget_code_system}\n\nRESPONSE STYLE:\n${sections.response_style}\n\nCONVERSATION EXAMPLES:\n${sections.examples}`;
}

/** Parse a full prompt string back into sections */
function parseSections(prompt: string): PromptSections {
  const sections: PromptSections = { ...FACTORY_SECTIONS };

  const sectionMap: Record<string, keyof PromptSections> = {
    'CORE RULES:': 'core_rules',
    'LANGUAGE HANDLING:': 'language_handling',
    'BOOKING FLOW:': 'booking_flow',
    'WIDGET CODE SYSTEM:': 'widget_code_system',
    'RESPONSE STYLE:': 'response_style',
    'CONVERSATION EXAMPLES:': 'examples',
  };

  const headers = Object.keys(sectionMap);
  const indices: { header: string; key: keyof PromptSections; idx: number }[] = [];

  for (const header of headers) {
    const idx = prompt.indexOf(header);
    if (idx !== -1) {
      indices.push({ header, key: sectionMap[header], idx });
    }
  }

  indices.sort((a, b) => a.idx - b.idx);

  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].idx + indices[i].header.length;
    const end = i + 1 < indices.length ? indices[i + 1].idx : prompt.length;
    sections[indices[i].key] = prompt.slice(start, end).trim();
  }

  return sections;
}

const FACTORY_DEFAULTS: DefaultAIConfig = {
  system_behavior:
    'You are a helpful, professional dental clinic assistant. You help patients with appointment scheduling, answer general dental questions, and provide information about the clinic\'s services. Always be empathetic, clear, and concise. If a patient describes a dental emergency, advise them to contact the clinic immediately or visit an emergency room.',
  greeting:
    'Hi there! I\'m your dental clinic assistant. How can I help you today? I can help with appointments, answer questions about our services, or provide general dental care information.',
  personality_traits: ['Professional', 'Friendly', 'Empathetic', 'Patient', 'Concise'],
};

export function AIPromptsTab() {
  const [businesses, setBusinesses] = useState<BusinessAIConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBusiness, setEditingBusiness] = useState<BusinessAIConfig | null>(null);
  const [editSystemBehavior, setEditSystemBehavior] = useState('');
  const [editGreeting, setEditGreeting] = useState('');
  const [editTraits, setEditTraits] = useState<string[]>([]);
  const [newTrait, setNewTrait] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const logAction = useLogAction();

  // Default prompts state
  const [defaults, setDefaults] = useState<DefaultAIConfig>(FACTORY_DEFAULTS);
  const [defaultsLoading, setDefaultsLoading] = useState(true);
  const [defaultsSaving, setDefaultsSaving] = useState(false);
  const [defaultNewTrait, setDefaultNewTrait] = useState('');

  // System prompt sections state
  const [sections, setSections] = useState<PromptSections>({ ...FACTORY_SECTIONS });
  const [systemPromptLoading, setSystemPromptLoading] = useState(true);
  const [systemPromptSaving, setSystemPromptSaving] = useState(false);

  useEffect(() => {
    loadBusinesses();
    loadDefaults();
    loadSystemPrompt();
  }, []);

  async function loadDefaults() {
    setDefaultsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', DEFAULT_AI_CONFIG_KEY)
        .maybeSingle();

      if (error) {
        console.error('Error loading defaults (table may not exist):', error);
      } else if (data?.value) {
        const parsed = data.value as unknown as DefaultAIConfig;
        setDefaults({
          system_behavior: parsed.system_behavior || FACTORY_DEFAULTS.system_behavior,
          greeting: parsed.greeting || FACTORY_DEFAULTS.greeting,
          personality_traits: parsed.personality_traits || FACTORY_DEFAULTS.personality_traits,
        });
      }
    } catch {
      // system_settings table might not exist yet
    } finally {
      setDefaultsLoading(false);
    }
  }

  async function loadSystemPrompt() {
    setSystemPromptLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', AI_SYSTEM_PROMPT_KEY)
        .maybeSingle();

      if (error) {
        console.error('Error loading system prompt:', error);
      } else if (data?.value) {
        const parsed = data.value as unknown as { prompt: string };
        if (parsed.prompt) {
          setSections(parseSections(parsed.prompt));
        }
      }
    } catch {
      // system_settings table might not exist yet
    } finally {
      setSystemPromptLoading(false);
    }
  }

  async function handleSaveSystemPrompt() {
    setSystemPromptSaving(true);
    try {
      const assembledPrompt = assembleSections(sections);
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          {
            key: AI_SYSTEM_PROMPT_KEY,
            value: { prompt: assembledPrompt } as unknown as Record<string, unknown>,
          },
          { onConflict: 'key' }
        );

      if (error) throw error;

      logAction.mutate({
        action: 'UPDATE_AI_SYSTEM_PROMPT',
        resource_type: 'system_settings',
        resource_id: AI_SYSTEM_PROMPT_KEY,
        details: { prompt_length: assembledPrompt.length },
      });

      toast({
        title: 'System prompt saved',
        description: 'The AI system prompt has been updated. Changes take effect immediately.',
      });
    } catch (error) {
      console.error('Error saving system prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to save system prompt. The system_settings table may need to be created.',
        variant: 'destructive',
      });
    } finally {
      setSystemPromptSaving(false);
    }
  }

  async function handleSaveDefaults() {
    setDefaultsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          {
            key: DEFAULT_AI_CONFIG_KEY,
            value: defaults as unknown as Record<string, unknown>,
          },
          { onConflict: 'key' }
        );

      if (error) throw error;

      logAction.mutate({
        action: 'UPDATE_DEFAULT_AI_PROMPTS',
        resource_type: 'system_settings',
        resource_id: DEFAULT_AI_CONFIG_KEY,
        details: { updated_fields: Object.keys(defaults) },
      });

      toast({
        title: 'Default prompts saved',
        description: 'Default AI configuration has been updated. New businesses will use these defaults.',
      });
    } catch (error) {
      console.error('Error saving defaults:', error);
      toast({
        title: 'Error',
        description: 'Failed to save default prompts. The system_settings table may need to be created.',
        variant: 'destructive',
      });
    } finally {
      setDefaultsSaving(false);
    }
  }

  function addDefaultTrait() {
    if (defaultNewTrait.trim() && !defaults.personality_traits.includes(defaultNewTrait.trim())) {
      setDefaults((prev) => ({
        ...prev,
        personality_traits: [...prev.personality_traits, defaultNewTrait.trim()],
      }));
      setDefaultNewTrait('');
    }
  }

  function removeDefaultTrait(trait: string) {
    setDefaults((prev) => ({
      ...prev,
      personality_traits: prev.personality_traits.filter((t) => t !== trait),
    }));
  }

  async function loadBusinesses() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, slug, ai_system_behavior, ai_greeting, ai_personality_traits')
        .order('name');

      if (error) throw error;

      setBusinesses(
        (data || []).map((b) => ({
          ...b,
          ai_personality_traits: (b.ai_personality_traits as string[]) || null,
        }))
      );
    } catch (error) {
      console.error('Error loading businesses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load business AI configurations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredBusinesses = businesses.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function openEditDialog(business: BusinessAIConfig) {
    setEditingBusiness(business);
    setEditSystemBehavior(business.ai_system_behavior || '');
    setEditGreeting(business.ai_greeting || '');
    setEditTraits(business.ai_personality_traits || []);
    setNewTrait('');
  }

  function closeEditDialog() {
    setEditingBusiness(null);
    setEditSystemBehavior('');
    setEditGreeting('');
    setEditTraits([]);
    setNewTrait('');
  }

  function addTrait() {
    if (newTrait.trim() && !editTraits.includes(newTrait.trim())) {
      setEditTraits([...editTraits, newTrait.trim()]);
      setNewTrait('');
    }
  }

  function removeTrait(trait: string) {
    setEditTraits(editTraits.filter((t) => t !== trait));
  }

  async function handleSave() {
    if (!editingBusiness) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          ai_system_behavior: editSystemBehavior || null,
          ai_greeting: editGreeting || null,
          ai_personality_traits: editTraits.length > 0 ? editTraits : null,
        })
        .eq('id', editingBusiness.id);

      if (error) throw error;

      logAction.mutate({
        action: 'UPDATE_AI_PROMPTS',
        resource_type: 'business',
        resource_id: editingBusiness.id,
        details: {
          business_name: editingBusiness.name,
        },
      });

      toast({
        title: 'Saved',
        description: `AI prompts updated for ${editingBusiness.name}`,
      });

      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === editingBusiness.id
            ? {
                ...b,
                ai_system_behavior: editSystemBehavior || null,
                ai_greeting: editGreeting || null,
                ai_personality_traits: editTraits.length > 0 ? editTraits : null,
              }
            : b
        )
      );

      closeEditDialog();
    } catch (error) {
      console.error('Error saving AI prompts:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AI prompts',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  const suggestedTraits = [
    'Professional',
    'Friendly',
    'Empathetic',
    'Concise',
    'Detailed',
    'Casual',
    'Formal',
    'Warm',
    'Direct',
    'Patient',
  ];

  function updateSection(key: keyof PromptSections, value: string) {
    setSections((prev) => ({ ...prev, [key]: value }));
  }

  function resetSection(key: keyof PromptSections) {
    setSections((prev) => ({ ...prev, [key]: FACTORY_SECTIONS[key] }));
  }

  return (
    <div className="space-y-6">
      {/* ── AI System Prompt (Sectioned) ──────────────────────────── */}
      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            AI System Prompt
          </CardTitle>
          <CardDescription>
            The full system prompt sent to the AI model, broken into editable sections.
            Variables like patient name and services are injected automatically at runtime.
            Changes take effect immediately for all businesses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systemPromptLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              <Accordion type="multiple" defaultValue={['core_rules']} className="w-full">
                {SECTION_ORDER.map((key) => {
                  const meta = SECTION_LABELS[key];
                  const isModified = sections[key] !== FACTORY_SECTIONS[key];
                  return (
                    <AccordionItem key={key} value={key} className="border rounded-lg mb-2 px-1">
                      <AccordionTrigger className="hover:no-underline py-3 px-3">
                        <div className="flex items-center gap-2 text-left">
                          <span className="font-medium">{meta.title}</span>
                          {isModified && (
                            <Badge variant="secondary" className="text-xs">Modified</Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-4">
                        <p className="text-xs text-muted-foreground mb-2">{meta.description}</p>
                        <Textarea
                          value={sections[key]}
                          onChange={(e) => updateSection(key, e.target.value)}
                          rows={Math.min(15, Math.max(4, sections[key].split('\n').length + 1))}
                          className="resize-y font-mono text-sm leading-relaxed"
                        />
                        {isModified && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs gap-1"
                            onClick={() => resetSection(key)}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reset to factory default
                          </Button>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSections({ ...FACTORY_SECTIONS })}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset All to Factory
                </Button>
                <Button onClick={handleSaveSystemPrompt} disabled={systemPromptSaving} className="gap-2">
                  {systemPromptSaving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save System Prompt
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Default AI Prompts ──────────────────────────────────── */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Default AI Prompts
          </CardTitle>
          <CardDescription>
            System-wide default prompts for all new businesses. Businesses can override these individually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {defaultsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <Tabs defaultValue="d-behavior" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="d-behavior">System Behavior</TabsTrigger>
                <TabsTrigger value="d-greeting">Greeting</TabsTrigger>
                <TabsTrigger value="d-personality">Personality</TabsTrigger>
              </TabsList>

              <TabsContent value="d-behavior" className="space-y-3 mt-4">
                <Label htmlFor="default-behavior">Default System Behavior Instructions</Label>
                <Textarea
                  id="default-behavior"
                  placeholder="You are a helpful assistant for a dental clinic..."
                  value={defaults.system_behavior}
                  onChange={(e) =>
                    setDefaults((prev) => ({ ...prev, system_behavior: e.target.value }))
                  }
                  rows={8}
                  className="resize-none font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This is the base system prompt for all AI interactions. Businesses without a custom prompt will use this.
                </p>
              </TabsContent>

              <TabsContent value="d-greeting" className="space-y-3 mt-4">
                <Label htmlFor="default-greeting">Default Welcome Message</Label>
                <Textarea
                  id="default-greeting"
                  placeholder="Hi! I'm your AI assistant. How can I help you today?"
                  value={defaults.greeting}
                  onChange={(e) =>
                    setDefaults((prev) => ({ ...prev, greeting: e.target.value }))
                  }
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Shown when customers first interact with the AI.
                </p>
              </TabsContent>

              <TabsContent value="d-personality" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Default Personality Traits</Label>
                  {defaults.personality_traits.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {defaults.personality_traits.map((trait) => (
                        <Badge key={trait} variant="secondary" className="gap-1">
                          {trait}
                          <button
                            onClick={() => removeDefaultTrait(trait)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No traits configured</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a trait..."
                    value={defaultNewTrait}
                    onChange={(e) => setDefaultNewTrait(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDefaultTrait();
                      }
                    }}
                  />
                  <Button onClick={addDefaultTrait} type="button">
                    Add
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Suggested</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedTraits
                      .filter((t) => !defaults.personality_traits.includes(t))
                      .map((trait) => (
                        <Badge
                          key={trait}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                          onClick={() =>
                            setDefaults((prev) => ({
                              ...prev,
                              personality_traits: [...prev.personality_traits, trait],
                            }))
                          }
                        >
                          + {trait}
                        </Badge>
                      ))}
                  </div>
                </div>
              </TabsContent>

              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDefaults(FACTORY_DEFAULTS)}
                >
                  Reset to Factory Defaults
                </Button>
                <Button onClick={handleSaveDefaults} disabled={defaultsSaving} className="gap-2">
                  {defaultsSaving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Defaults
                </Button>
              </div>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* ── Per-Business AI Configurations ──────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Per-Business Overrides ({businesses.length})
          </CardTitle>
          <CardDescription>
            Businesses with custom AI prompts that override the defaults above
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by business name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>System Behavior</TableHead>
                      <TableHead>Greeting</TableHead>
                      <TableHead>Traits</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBusinesses.length > 0 ? (
                      filteredBusinesses.map((business) => (
                        <TableRow key={business.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {business.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                /{business.slug}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              {business.ai_system_behavior ? (
                                <p className="text-sm text-muted-foreground truncate">
                                  {business.ai_system_behavior}
                                </p>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">
                                  Using default
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              {business.ai_greeting ? (
                                <p className="text-sm text-muted-foreground truncate">
                                  {business.ai_greeting}
                                </p>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">
                                  Using default
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {business.ai_personality_traits && business.ai_personality_traits.length > 0 ? (
                                business.ai_personality_traits.slice(0, 3).map((trait) => (
                                  <Badge key={trait} variant="secondary" className="text-xs">
                                    {trait}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground italic">
                                  Using default
                                </span>
                              )}
                              {business.ai_personality_traits && business.ai_personality_traits.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{business.ai_personality_traits.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(business)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-muted-foreground">
                            {searchQuery
                              ? 'No businesses found matching your search'
                              : 'No businesses found'}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredBusinesses.length > 0 ? (
                  filteredBusinesses.map((business) => (
                    <Card key={business.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{business.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">/{business.slug}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(business)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Behavior: </span>
                            {business.ai_system_behavior ? (
                              <span className="truncate">{business.ai_system_behavior.slice(0, 60)}...</span>
                            ) : (
                              <span className="italic text-muted-foreground">Using default</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {business.ai_personality_traits && business.ai_personality_traits.length > 0 ? (
                              business.ai_personality_traits.map((trait) => (
                                <Badge key={trait} variant="secondary" className="text-xs">
                                  {trait}
                                </Badge>
                              ))
                            ) : (
                              <span className="italic text-muted-foreground text-xs">Default traits</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No businesses found' : 'No businesses found'}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Edit AI Prompts Dialog ──────────────────────────────── */}
      <Dialog open={!!editingBusiness} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Edit AI Prompts - {editingBusiness?.name}
            </DialogTitle>
            <DialogDescription>
              Configure AI behavior for {editingBusiness?.name} (/{editingBusiness?.slug}).
              Leave fields empty to use the system defaults.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="behavior" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="behavior">System Behavior</TabsTrigger>
              <TabsTrigger value="greeting">Greeting</TabsTrigger>
              <TabsTrigger value="personality">Personality</TabsTrigger>
            </TabsList>

            <TabsContent value="behavior" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-system-behavior">AI System Behavior Instructions</Label>
                <Textarea
                  id="edit-system-behavior"
                  placeholder="Leave empty to use default..."
                  value={editSystemBehavior}
                  onChange={(e) => setEditSystemBehavior(e.target.value)}
                  rows={10}
                  className="resize-none font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the system default prompt.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="greeting" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-greeting">Welcome Message</Label>
                <Textarea
                  id="edit-greeting"
                  placeholder="Leave empty to use default..."
                  value={editGreeting}
                  onChange={(e) => setEditGreeting(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the system default greeting.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="personality" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Active Traits</Label>
                {editTraits.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {editTraits.map((trait) => (
                      <Badge key={trait} variant="secondary" className="gap-1">
                        {trait}
                        <button
                          onClick={() => removeTrait(trait)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No custom traits (using defaults)</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-new-trait">Add Trait</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-new-trait"
                    placeholder="Enter a trait..."
                    value={newTrait}
                    onChange={(e) => setNewTrait(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTrait();
                      }
                    }}
                  />
                  <Button onClick={addTrait} type="button">
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Suggested Traits</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestedTraits
                    .filter((trait) => !editTraits.includes(trait))
                    .map((trait) => (
                      <Badge
                        key={trait}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => setEditTraits([...editTraits, trait])}
                      >
                        + {trait}
                      </Badge>
                    ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
