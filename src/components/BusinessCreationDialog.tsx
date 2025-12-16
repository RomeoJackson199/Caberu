import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BusinessTemplateSelector } from './BusinessTemplateSelector';
import { TemplateType } from '@/lib/businessTemplates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface BusinessCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (businessId: string) => void;
}

export function BusinessCreationDialog({ open, onOpenChange, onSuccess }: BusinessCreationDialogProps) {
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('healthcare');
  const [businessName, setBusinessName] = useState('');
  const [tagline, setTagline] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId as TemplateType);
  };

  const handleTemplateNext = () => {
    if (selectedTemplate) {
      setStep('details');
    }
  };

  const handleCreate = async () => {
    if (!businessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    setLoading(true);

    try {
      // Call edge function to create business atomically
      const { data, error } = await supabase.functions.invoke('create-healthcare-business', {
        body: {
          name: businessName,
          tagline: tagline || 'Your Practice, Your Way',
          template_type: selectedTemplate || 'healthcare',
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Business created successfully!");
        onSuccess(data.business_id);
        onOpenChange(false);
        
        // Reset form
        setBusinessName("");
        setTagline("");
        setSelectedTemplate('healthcare');
        setStep('template');
      } else {
        throw new Error(data?.error || 'Failed to create business');
      }
    } catch (error: any) {
      console.error('Error creating business:', error);
      toast.error(error.message || "Failed to create business");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'template' ? 'Choose Your Business Template' : 'Business Details'}
          </DialogTitle>
          <DialogDescription>
            {step === 'template' 
              ? 'Select the template that best matches your business type'
              : 'Enter your business information'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'template' ? (
          <div className="space-y-6">
            <BusinessTemplateSelector
              selectedTemplate={selectedTemplate}
              onSelectTemplate={handleTemplateSelect}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleTemplateNext} disabled={!selectedTemplate}>
                Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business-name">Business Name *</Label>
                <Input
                  id="business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter your business name"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline (Optional)</Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g., Your smile is our priority"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep('template')}
                disabled={loading}
              >
                Back
              </Button>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={loading || !businessName.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Business'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
