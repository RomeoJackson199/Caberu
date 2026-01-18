/**
 * Unified Language Picker Component
 * Consolidates LanguageSelector, LanguageSelection, and LanguageSettings into one flexible component
 */

import { useState } from "react";
import { Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

export type LanguageCode = 'en' | 'fr' | 'nl';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', label: 'US English' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', label: 'FR Français' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱', label: 'NL Nederlands' },
];

type LanguagePickerVariant = 'dropdown' | 'select' | 'cards' | 'submenu';

interface LanguagePickerProps {
  variant?: LanguagePickerVariant;
  showToast?: boolean;
  onSelect?: (language: LanguageCode) => void;
  className?: string;
}

/**
 * Dropdown variant - compact button with dropdown menu
 */
const DropdownVariant = ({ showToast, onSelect }: { showToast?: boolean; onSelect?: (lang: LanguageCode) => void }) => {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === language);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    onSelect?.(code);
    if (showToast) {
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
      toast({
        title: t.languageUpdated,
        description: `${t.languageChangedTo} ${lang?.name}`,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-dental-primary hover:bg-white/20">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentLanguage?.flag} {currentLanguage?.name}
          </span>
          <span className="sm:hidden">
            {currentLanguage?.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-white/20">
        {SUPPORTED_LANGUAGES.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={`gap-2 ${language === lang.code ? 'bg-dental-primary/10 text-dental-primary' : 'hover:bg-dental-primary/5'}`}
          >
            <span>{lang.name}</span>
            {language === lang.code && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Select variant - form-style select input
 */
const SelectVariant = ({ showToast, onSelect }: { showToast?: boolean; onSelect?: (lang: LanguageCode) => void }) => {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === language);

  const handleChange = (code: LanguageCode) => {
    setLanguage(code);
    onSelect?.(code);
    if (showToast) {
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
      toast({
        title: t.languageUpdated,
        description: `${t.languageChangedTo} ${lang?.name}`,
      });
    }
  };

  return (
    <Select value={language} onValueChange={handleChange}>
      <SelectTrigger className="w-full bg-muted/50 border-border rounded-lg">
        <SelectValue>
          <div className="flex items-center gap-3">
            <span className="text-lg">{currentLanguage?.flag}</span>
            <span className="font-medium">{currentLanguage?.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background border-border shadow-lg">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <SelectItem 
            key={lang.code} 
            value={lang.code}
            className="hover:bg-muted focus:bg-muted"
          >
            <div className="flex items-center gap-3 w-full">
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1 font-medium">{lang.label}</span>
              {language === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

/**
 * Cards variant - full-page selection with cards
 */
const CardsVariant = ({ onSelect }: { onSelect?: (lang: LanguageCode) => void }) => {
  const { language, setLanguage, t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(language);

  const handleConfirm = () => {
    setLanguage(selectedLang);
    onSelect?.(selectedLang);
  };

  return (
    <div className="min-h-screen flex items-center justify-center mesh-bg p-4">
      <Card className="w-full max-w-md glass-card border-dental-primary/20 shadow-glow">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="pulse-ring w-16 h-16 -top-4 -left-4"></div>
              <div className="relative bg-gradient-primary p-4 rounded-2xl shadow-glow">
                <Globe className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl gradient-text">
            {t.selectPreferredLanguage}
          </CardTitle>
          <CardDescription className="text-dental-muted-foreground">
            {t.languageSelectionDescription}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                  selectedLang === lang.code
                    ? 'border-dental-primary bg-dental-primary/10 shadow-elegant'
                    : 'border-dental-primary/20 bg-white/50 hover:border-dental-primary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="text-left">
                      <div className="font-semibold text-dental-primary">
                        {lang.label}
                      </div>
                      <div className="text-sm text-dental-muted-foreground">
                        {lang.name}
                      </div>
                    </div>
                  </div>
                  {selectedLang === lang.code && (
                    <Check className="h-5 w-5 text-dental-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
          
          <Button 
            onClick={handleConfirm}
            className="w-full bg-gradient-primary text-white hover:shadow-glow transition-all duration-300 hover:scale-105"
            size="lg"
          >
            {t.save}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Submenu variant - for use inside dropdown menus
 */
const SubmenuVariant = ({ showToast, onSelect }: { showToast?: boolean; onSelect?: (lang: LanguageCode) => void }) => {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    onSelect?.(code);
    if (showToast) {
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
      toast({
        title: t.languageUpdated,
        description: `${t.languageChangedTo} ${lang?.name}`,
      });
    }
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        <Globe className="h-4 w-4" />
        <span className="flex-1 text-left">{t.language}</span>
        <span className="text-xs text-muted-foreground">
          {SUPPORTED_LANGUAGES.find(lang => lang.code === language)?.name}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-48">
        {SUPPORTED_LANGUAGES.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={(event) => {
              event.preventDefault();
              handleSelect(lang.code);
            }}
            className="gap-2"
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
            {language === lang.code && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

/**
 * Unified Language Picker Component
 * 
 * @param variant - 'dropdown' | 'select' | 'cards' | 'submenu'
 * @param showToast - Whether to show a toast notification on selection
 * @param onSelect - Callback when a language is selected
 */
export function LanguagePicker({ 
  variant = 'dropdown', 
  showToast = false, 
  onSelect,
  className 
}: LanguagePickerProps) {
  switch (variant) {
    case 'select':
      return <div className={className}><SelectVariant showToast={showToast} onSelect={onSelect} /></div>;
    case 'cards':
      return <CardsVariant onSelect={onSelect} />;
    case 'submenu':
      return <SubmenuVariant showToast={showToast} onSelect={onSelect} />;
    case 'dropdown':
    default:
      return <div className={className}><DropdownVariant showToast={showToast} onSelect={onSelect} /></div>;
  }
}

// Export sub-components for backwards compatibility
export const LanguageSelectorMenu = () => <LanguagePicker variant="submenu" />;
export const LanguageSelector = () => <LanguagePicker variant="dropdown" />;
export const LanguageSettings = () => <LanguagePicker variant="select" showToast />;
