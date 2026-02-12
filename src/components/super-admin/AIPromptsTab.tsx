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
import { Search, Bot, Building2, Edit, Save, X, Sparkles } from 'lucide-react';
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

  useEffect(() => {
    loadBusinesses();
  }, []);

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

      // Update local state
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
      <div>
        <h2 className="text-2xl font-bold mb-2">AI System Prompts</h2>
        <p className="text-muted-foreground">
          View and manage AI behavior settings for all businesses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Business AI Configurations ({businesses.length})
          </CardTitle>
          <CardDescription>
            Edit AI system behavior, greetings, and personality traits for each business
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
            <div className="border rounded-lg">
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
                                Not configured
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
                                Not configured
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
                                None
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
              Configure AI behavior for {editingBusiness?.name} (/{editingBusiness?.slug})
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
                  placeholder="You are a helpful assistant for a dental clinic..."
                  value={editSystemBehavior}
                  onChange={(e) => setEditSystemBehavior(e.target.value)}
                  rows={10}
                  className="resize-none font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This is the main system prompt that controls how the AI behaves when interacting with customers.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="greeting" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-greeting">Welcome Message</Label>
                <Textarea
                  id="edit-greeting"
                  placeholder="Hi! I'm your AI assistant. How can I help you today?"
                  value={editGreeting}
                  onChange={(e) => setEditGreeting(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This message is shown when customers first interact with the AI.
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
                  <p className="text-sm text-muted-foreground italic">No traits configured</p>
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
