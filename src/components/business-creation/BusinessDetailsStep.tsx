import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface BusinessDetailsStepProps {
  businessData: {
    name?: string;
    tagline?: string;
    bio?: string;
  };
  onUpdate: (data: any) => void;
}

export function BusinessDetailsStep({ businessData, onUpdate }: BusinessDetailsStepProps) {
  const [name, setName] = useState(businessData.name || '');
  const [tagline, setTagline] = useState(businessData.tagline || '');
  const [bio, setBio] = useState(businessData.bio || '');
  const [slugError, setSlugError] = useState('');

  // Update local state when businessData changes (from AI suggestions)
  useEffect(() => {
    if (businessData.name && businessData.name !== name) {
      setName(businessData.name);
    }
    if (businessData.tagline && businessData.tagline !== tagline) {
      setTagline(businessData.tagline);
    }
    if (businessData.bio && businessData.bio !== bio) {
      setBio(businessData.bio);
    }
  }, [businessData]);

  // Auto-generate slug from name
  const generateSlug = (businessName: string): string => {
    return businessName
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const validateSlug = (slug: string): boolean => {
    if (slug.includes('/')) {
      setSlugError("Business name cannot be converted to a valid URL (contains /)");
      return false;
    }
    if (slug.includes(' ')) {
      setSlugError("Business name cannot contain spaces");
      return false;
    }
    const dotCount = (slug.match(/\./g) || []).length;
    if (dotCount > 1) {
      setSlugError("Business name can only contain one dot (.)");
      return false;
    }
    setSlugError('');
    return true;
  };

  useEffect(() => {
    if (name) {
      const slug = generateSlug(name);
      validateSlug(slug);
    }
  }, [name]);

  const handleChange = (field: string, value: string) => {
    const updates: any = { [field]: value };
    if (field === 'name') {
      setName(value);
      const slug = generateSlug(value);
      updates.slug = slug;
      validateSlug(slug);
    }
    if (field === 'tagline') setTagline(value);
    if (field === 'bio') setBio(value);
    onUpdate(updates);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Business Details</h2>
        <p className="text-muted-foreground mt-2">
          Tell us about your business
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            placeholder="Enter your business name"
            value={name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={slugError ? "border-destructive" : ""}
          />
          {name && (
            <div className="text-xs text-muted-foreground">
              Your business URL will be: <span className="font-mono">{window.location.origin}/{generateSlug(name)}</span>
            </div>
          )}
          {slugError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{slugError}</AlertDescription>
            </Alert>
          )}
        </div>

        <Alert className="bg-muted/50 border-muted">
          <AlertDescription className="text-xs">
            ⚠️ Business name restrictions: No spaces, no forward slashes (/), maximum one dot (.)
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            placeholder="A short description of your business"
            value={tagline}
            onChange={(e) => handleChange('tagline', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">About Your Business</Label>
          <Textarea
            id="bio"
            placeholder="Tell customers about your business, services, and what makes you unique..."
            value={bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            rows={6}
          />
        </div>
      </div>
    </div>
  );
}
