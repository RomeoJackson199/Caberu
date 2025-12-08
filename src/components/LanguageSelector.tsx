import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export const languages = [{
  code: 'en',
  name: 'English',
  flag: '🇺🇸'
}, {
  code: 'nl',
  name: 'Nederlands',
  flag: '🇳🇱'
}, {
  code: 'fr',
  name: 'Français',
  flag: '🇫🇷'
}];

export const LanguageSelectorMenu = () => {
  const {
    language,
    setLanguage,
    t
  } = useLanguage();

  return <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        <Globe className="h-4 w-4" />
        <span className="flex-1 text-left">{t.language}</span>
        <span className="text-xs text-muted-foreground">
          {languages.find(lang => lang.code === language)?.name}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-48">
        {languages.map(lang => <DropdownMenuItem key={lang.code} onSelect={event => {
        event.preventDefault();
        setLanguage(lang.code as 'en' | 'fr' | 'nl');
      }} className="gap-2">
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
            {language === lang.code && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>)}
      </DropdownMenuSubContent>
    </DropdownMenuSub>;
};

export const LanguageSelector = () => {
  const {
    language,
    setLanguage
  } = useLanguage();
  const currentLanguage = languages.find(lang => lang.code === language);
  return <DropdownMenu>
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
        {languages.map(lang => <DropdownMenuItem key={lang.code} onClick={() => setLanguage(lang.code as 'en' | 'fr' | 'nl')} className={`gap-2 ${language === lang.code ? 'bg-dental-primary/10 text-dental-primary' : 'hover:bg-dental-primary/5'}`}>
            
            <span>{lang.name}</span>
            {language === lang.code && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>;
};