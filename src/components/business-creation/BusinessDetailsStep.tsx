import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Globe, Building2 } from 'lucide-react';
import { generateSlug } from '@/lib/slugUtils';
import { SUPPORTED_LANGUAGES, type Language } from '@/lib/translations';

interface BusinessDetailsStepProps {
  businessData: {
    name?: string;
    tagline?: string;
    bio?: string;
    default_language?: Language;
  };
  onUpdate: (data: Record<string, unknown>) => void;
}

const TAGLINE_MAX = 120;
const BIO_MAX = 500;

export function BusinessDetailsStep({ businessData, onUpdate }: BusinessDetailsStepProps) {
  const [name, setName] = useState(businessData.name || '');
  const [tagline, setTagline] = useState(businessData.tagline || '');
  const [bio, setBio] = useState(businessData.bio || '');
  const [defaultLanguage, setDefaultLanguage] = useState<Language>(businessData.default_language || 'fr');
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
    if (businessData.default_language && businessData.default_language !== defaultLanguage) {
      setDefaultLanguage(businessData.default_language);
    }
  }, [businessData]);

  const validateSlug = (slug: string): boolean => {
    const dotCount = (slug.match(/\./g) || []).length;
    if (dotCount > 1) {
      setSlugError("Name can only contain one dot (.)");
      return false;
    }
    setSlugError('');
    return true;
  };

  useEffect(() => {
    if (name) {
      const slug = generateSlug(name);
      validateSlug(slug);
    } else {
      setSlugError('');
    }
  }, [name]);

  const handleChange = (field: string, value: string) => {
    const updates: Record<string, unknown> = { [field]: value };
    if (field === 'name') {
      setName(value);
      const slug = generateSlug(value);
      updates.slug = slug;
      updates.name_translations = { [defaultLanguage]: value };
      validateSlug(slug);
    }
    if (field === 'tagline') {
      if (value.length <= TAGLINE_MAX) {
        setTagline(value);
      }
    }
    if (field === 'bio') {
      if (value.length <= BIO_MAX) {
        setBio(value);
      }
    }
    onUpdate(updates);
  };

  const handleLanguageChange = (lang: Language) => {
    setDefaultLanguage(lang);
    onUpdate({
      default_language: lang,
      name_translations: name ? { [lang]: name } : {},
    });
    // Regenerate slug from current name (the name is in this language)
    if (name) {
      const slug = generateSlug(name);
      onUpdate({ slug, default_language: lang, name_translations: { [lang]: name } });
    }
  };

  const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === defaultLanguage);
  const slug = name ? generateSlug(name) : '';

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-3">
          <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold">Business Details</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          This information will appear on your public business page. You can change it anytime in Settings.
        </p>
      </div>

      <div className="space-y-5">
        {/* Default Language */}
        <div className="space-y-2">
          <Label htmlFor="defaultLanguage">
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              Business Language *
            </div>
          </Label>
          <Select value={defaultLanguage} onValueChange={(v) => handleLanguageChange(v as Language)}>
            <SelectTrigger id="defaultLanguage" className="h-12 text-base w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Your public page and URL will be in this language
          </p>
        </div>

        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="businessName">
            Business Name ({selectedLang?.name}) *
          </Label>
          <Input
            id="businessName"
            placeholder={
              defaultLanguage === 'fr' ? 'ex. Clinique Dentaire Sourire' :
              defaultLanguage === 'nl' ? 'bijv. Tandartspraktijk De Glimlach' :
              'e.g., Bright Smiles Dental'
            }
            value={name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`h-12 text-base ${slugError ? "border-destructive" : ""}`}
            autoFocus
          />
          {name && !slugError && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span>Your page: </span>
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{window.location.host}/{slug}</span>
            </div>
          )}
          {slugError && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{slugError}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tagline">Tagline</Label>
            <span className={`text-xs ${tagline.length > TAGLINE_MAX * 0.9 ? 'text-orange-500' : 'text-muted-foreground'}`}>
              {tagline.length}/{TAGLINE_MAX}
            </span>
          </div>
          <Input
            id="tagline"
            placeholder={
              defaultLanguage === 'fr' ? 'ex. Votre sourire, notre passion' :
              defaultLanguage === 'nl' ? 'bijv. Uw glimlach, onze passie' :
              'e.g., Your smile, our passion'
            }
            value={tagline}
            onChange={(e) => handleChange('tagline', e.target.value)}
            maxLength={TAGLINE_MAX}
          />
          <p className="text-xs text-muted-foreground">
            A short phrase that describes what your practice is about
          </p>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio">About Your Business</Label>
            <span className={`text-xs ${bio.length > BIO_MAX * 0.9 ? 'text-orange-500' : 'text-muted-foreground'}`}>
              {bio.length}/{BIO_MAX}
            </span>
          </div>
          <Textarea
            id="bio"
            placeholder="Tell patients about your practice, services, team, and what makes you unique..."
            value={bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            rows={5}
            maxLength={BIO_MAX}
          />
          <p className="text-xs text-muted-foreground">
            This appears on your public profile. Patients read this before booking.
          </p>
        </div>
      </div>
    </div>
  );
}
