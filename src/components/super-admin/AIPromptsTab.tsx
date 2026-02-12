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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, Bot, Building2, Edit, Save, X, Sparkles, Globe } from 'lucide-react';
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

const DEFAULT_AI_CONFIG_KEY = 'default_ai_config';

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

  useEffect(() => {
    loadBusinesses();
    loadDefaults();
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
      // system_settings table might not exist yet — use factory defaults
    } finally {
      setDefaultsLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Default AI Prompts Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Default AI Prompts
          </CardTitle>
          <CardDescription>
            These are the system-wide default prompts used for all new businesses. Businesses can override these individually.
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

      {/* Per-Business AI Configurations */}
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

      {/* Edit AI Prompts Dialog */}
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
