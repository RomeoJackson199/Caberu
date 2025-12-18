import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { sanitizeServiceData, serviceCreationSchema } from '@/lib/validationSchemas';
import { z } from 'zod';
import { TemplateType, getTemplateConfig } from '@/lib/businessTemplates';
import { useLanguage } from '@/hooks/useLanguage';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  requires_upfront_payment: boolean;
  is_active: boolean;
  duration_minutes: number | null;
  category: string | null;
}

interface ServiceDialogProps {
  open: boolean;
  onClose: (shouldRefresh: boolean) => void;
  service: Service | null;
  businessId: string;
  defaultCategory?: string;
}

export function ServiceDialog({ open, onClose, service, businessId, defaultCategory }: ServiceDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'EUR',
    duration_minutes: '60',
    category: '',
    requires_upfront_payment: false,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [templateType, setTemplateType] = useState<TemplateType | null>(null);
  const { t } = useLanguage();

  // Fetch business template type
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!businessId) return;

      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('template_type')
          .eq('id', businessId)
          .single();

        if (error) throw error;
        setTemplateType((data?.template_type as TemplateType) || 'healthcare');
      } catch (error) {
        console.error('Error fetching business template:', error);
        setTemplateType('healthcare');
      }
    };

    fetchTemplate();
  }, [businessId]);

  const templateConfig = templateType ? getTemplateConfig(templateType) : null;
  const categories = (templateConfig as { serviceCategories?: string[] } | null)?.serviceCategories || [];
  const fieldLabels = (templateConfig as { serviceFieldLabels?: Record<string, string> } | null)?.serviceFieldLabels || {
    serviceName: 'Service Name',
    serviceNamePlaceholder: 'e.g., Consultation, Service',
    descriptionPlaceholder: 'Describe what\'s included...',
    categoryLabel: 'Category',
    durationLabel: 'Duration (minutes)',
  };

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || '',
        price: (service.price_cents / 100).toString(),
        currency: 'EUR',
        duration_minutes: service.duration_minutes?.toString() || '60',
        category: service.category || '',
        requires_upfront_payment: service.requires_upfront_payment,
        is_active: service.is_active,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        currency: 'EUR',
        duration_minutes: '60',
        category: defaultCategory ?? '',
        requires_upfront_payment: false,
        is_active: true,
      });
    }
    setErrors({});
  }, [service, open, defaultCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data
    try {
      const validationData = {
        name: formData.name,
        description: formData.description || undefined,
        price: parseFloat(formData.price) || 0,
        duration: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
        category: formData.category || undefined,
      };

      const validated = serviceCreationSchema.parse(validationData);

      setSaving(true);

      const priceCents = Math.round(validated.price * 100);

      // Sanitize the data
      const serviceData = sanitizeServiceData({
        business_id: businessId,
        name: validated.name,
        description: validated.description || null,
        price_cents: priceCents,
        currency: 'EUR',
        image_url: null, // Image upload removed
        duration_minutes: validated.duration || null,
        category: validated.category || null,
        requires_upfront_payment: formData.requires_upfront_payment,
        is_active: formData.is_active,
      });

      if (service) {
        const { error } = await supabase
          .from('business_services')
          .update(serviceData)
          .eq('id', service.id);

        if (error) {
          console.error('Database error:', error);
          throw new Error(error.message || 'Failed to update service');
        }
        toast.success('Service updated successfully');
        logger.info('Service updated', { serviceId: service.id });
      } else {
        const { error, data } = await supabase
          .from('business_services')
          .insert(serviceData)
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          throw new Error(error.message || 'Failed to create service');
        }
        toast.success('Service created successfully');
        logger.info('Service created', { serviceId: data?.id });
      }

      onClose(true);
    } catch (error: any) {
      console.error('Error saving service:', error);

      if (error instanceof z.ZodError) {
        // Handle validation errors
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
        toast.error('Please fix the validation errors');
      } else {
        // Handle other errors
        const errorMessage = error.message || 'Failed to save service';
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          <DialogDescription>
            {service
              ? 'Update service details and pricing'
              : 'Add a service with a name, price, and duration. Everything else is optional.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{fieldLabels.serviceName} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              placeholder={fieldLabels.serviceNamePlaceholder}
              required
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <div className="flex items-center gap-1 text-sm text-red-500">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.name}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t.descriptionOptional || 'Description (Optional)'}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (errors.description) setErrors({ ...errors, description: '' });
              }}
              placeholder={fieldLabels.descriptionPlaceholder}
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <div className="flex items-center gap-1 text-sm text-red-500">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.description}</span>
              </div>
            )}
          </div>

          {/* Price and Duration */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price (EUR) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: e.target.value });
                  if (errors.price) setErrors({ ...errors, price: '' });
                }}
                placeholder="35.00"
                required
                className={errors.price ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground">Set your service price in euros</p>
              {errors.price && (
                <div className="flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.price}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">{fieldLabels.durationLabel} *</Label>
              <Input
                id="duration"
                type="number"
                min="5"
                max="480"
                value={formData.duration_minutes}
                onChange={(e) => {
                  setFormData({ ...formData, duration_minutes: e.target.value });
                  if (errors.duration) setErrors({ ...errors, duration: '' });
                }}
                placeholder="30"
                required
                className={errors.duration ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground">How long does this service take?</p>
              {errors.duration && (
                <div className="flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.duration}</span>
                </div>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">{fieldLabels.categoryLabel} (Optional)</Label>
            <p className="text-xs text-muted-foreground">Organize services into categories for easier browsing</p>
            {categories.length > 0 ? (
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  setFormData({ ...formData, category: value });
                  if (errors.category) setErrors({ ...errors, category: '' });
                }}
              >
                <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: string) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => {
                  setFormData({ ...formData, category: e.target.value });
                  if (errors.category) setErrors({ ...errors, category: '' });
                }}
                placeholder="e.g., Standard, Premium"
                className={errors.category ? 'border-red-500' : ''}
              />
            )}
            {errors.category && (
              <div className="flex items-center gap-1 text-sm text-red-500">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.category}</span>
              </div>
            )}
          </div>

          {/* Switches */}
          <div className="space-y-4 pt-4 border-t">
            <p className="text-sm font-medium">Advanced Options</p>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is-active">Available for Booking</Label>
                <p className="text-xs text-muted-foreground">
                  Turn off to hide this service temporarily
                </p>
              </div>
              <Switch
                id="is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="upfront-payment">Require Upfront Payment</Label>
                <p className="text-xs text-muted-foreground">
                  Customers pay before booking (requires Stripe setup)
                </p>
              </div>
              <Switch
                id="upfront-payment"
                checked={formData.requires_upfront_payment}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requires_upfront_payment: checked })
                }
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onClose(false)}>
              {t.cancel || 'Cancel'}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : service ? 'Update Service' : 'Create Service'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
