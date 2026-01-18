/**
 * Unified Language Picker Component
 * Consolidates LanguageSelector, LanguageSelection, and LanguageSettings
 *
 * Supports three variants:
 * - dropdown: Compact dropdown menu for navigation bars
 * - select: Select input for settings pages
 * - cards: Full-page card UI for onboarding/initial selection
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

export const languages = [
  { code: 'en' as const, name: 'English', flag: '🇺🇸', label: 'US English' },
  { code: 'fr' as const, name: 'Français', flag: '🇫🇷', label: 'FR Français' },
  { code: 'nl' as const, name: 'Nederlands', flag: '🇳🇱', label: 'NL Nederlands' },
];

type LanguageCode = 'en' | 'fr' | 'nl';

interface LanguagePickerProps {
  variant: 'dropdown' | 'select' | 'cards';
  showToast?: boolean;
  onSelect?: () => void;
  /** Only for sub-menu variant within another dropdown */
  asSubmenu?: boolean;
}

/**
 * Dropdown variant - compact menu for navigation
 */
const LanguageDropdown = ({ showToast, onSelect, asSubmenu }: Omit<LanguagePickerProps, 'variant'>) => {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const currentLanguage = languages.find(lang => lang.code === language);

  const handleSelect = (languageCode: LanguageCode) => {
    setLanguage(languageCode);
    const languageObj = languages.find(lang => lang.code === languageCode);

    if (showToast) {
      toast({
        title: t.languageUpdated,
        description: `${t.languageChangedTo} ${languageObj?.name}`,
      });
    }

    onSelect?.();
  };

  if (asSubmenu) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="flex-1 text-left">{t.language}</span>
          <span className="text-xs text-muted-foreground">
            {currentLanguage?.name}
          </span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-48">
          {languages.map(lang => (
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
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-dental-primary hover:bg-white/20"
        >
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
        {languages.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={`gap-2 ${
              language === lang.code
                ? 'bg-dental-primary/10 text-dental-primary'
                : 'hover:bg-dental-primary/5'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
            {language === lang.code && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Select variant - for settings pages
 */
const LanguageSelect = ({ showToast, onSelect }: Omit<LanguagePickerProps, 'variant'>) => {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const currentLanguage = languages.find(lang => lang.code === language);

  const handleChange = (languageCode: LanguageCode) => {
    setLanguage(languageCode);
    const languageObj = languages.find(lang => lang.code === languageCode);

    if (showToast) {
      toast({
        title: t.languageUpdated,
        description: `${t.languageChangedTo} ${languageObj?.name}`,
      });
    }

    onSelect?.();
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
        {languages.map((languageItem) => (
          <SelectItem
            key={languageItem.code}
            value={languageItem.code}
            className="hover:bg-muted focus:bg-muted"
          >
            <div className="flex items-center gap-3 w-full">
              <span className="text-lg">{languageItem.flag}</span>
              <span className="flex-1 font-medium">{languageItem.label}</span>
              {language === languageItem.code && (
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
 * Cards variant - full-page UI for onboarding
 */
const LanguageCards = ({ showToast, onSelect }: Omit<LanguagePickerProps, 'variant'>) => {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(language);

  const handleLanguageSelect = (languageCode: LanguageCode) => {
    setSelectedLang(languageCode);
  };

  const handleConfirm = () => {
    setLanguage(selectedLang);
    const languageObj = languages.find(lang => lang.code === selectedLang);

    if (showToast) {
      toast({
        title: t.languageUpdated,
        description: `${t.languageChangedTo} ${languageObj?.name}`,
      });
    }

    onSelect?.();
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
            {languages.map((languageItem) => (
              <button
                key={languageItem.code}
                onClick={() => handleLanguageSelect(languageItem.code)}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                  selectedLang === languageItem.code
                    ? 'border-dental-primary bg-dental-primary/10 shadow-elegant'
                    : 'border-dental-primary/20 bg-white/50 hover:border-dental-primary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{languageItem.flag}</span>
                    <div className="text-left">
                      <div className="font-semibold text-dental-primary">
                        {languageItem.label}
                      </div>
                      <div className="text-sm text-dental-muted-foreground">
                        {languageItem.name}
                      </div>
                    </div>
                  </div>
                  {selectedLang === languageItem.code && (
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
 * Main LanguagePicker component
 */
export const LanguagePicker = ({ variant, showToast = false, onSelect, asSubmenu = false }: LanguagePickerProps) => {
  switch (variant) {
    case 'dropdown':
      return <LanguageDropdown showToast={showToast} onSelect={onSelect} asSubmenu={asSubmenu} />;
    case 'select':
      return <LanguageSelect showToast={showToast} onSelect={onSelect} />;
    case 'cards':
      return <LanguageCards showToast={showToast} onSelect={onSelect} />;
    default:
      return <LanguageDropdown showToast={showToast} onSelect={onSelect} asSubmenu={asSubmenu} />;
  }
};

/**
 * Legacy exports for backwards compatibility
 * @deprecated Use LanguagePicker with variant prop instead
 */
export const LanguageSelector = () => <LanguagePicker variant="dropdown" />;
export const LanguageSelectorMenu = () => <LanguagePicker variant="dropdown" asSubmenu />;
export const LanguageSelection = ({ onLanguageSelected }: { onLanguageSelected: () => void }) => (
  <LanguagePicker variant="cards" onSelect={onLanguageSelected} />
);
export const LanguageSettings = () => <LanguagePicker variant="select" showToast />;
