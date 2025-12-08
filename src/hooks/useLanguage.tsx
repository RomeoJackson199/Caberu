import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Language,
  Translations,
  SUPPORTED_LANGUAGES,
  getTranslationsForLanguage,
} from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  currentLanguage: Language;
  changeLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((lang) => lang.code);

const persistLanguagePreference = (lang: Language) => {
  localStorage.setItem("preferred-language", lang);
  document.documentElement.lang = lang;
};

export const changeLanguage = (lang: Language) => {
  if (!SUPPORTED_CODES.includes(lang)) return;
  persistLanguagePreference(lang);
  window.dispatchEvent(new CustomEvent<Language>("language:changed", { detail: lang }));
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  const handleSetLanguage = useCallback(
    (lang: Language) => {
      if (!SUPPORTED_CODES.includes(lang)) return;
      setLanguage(lang);
      persistLanguagePreference(lang);
    },
    [],
  );

  useEffect(() => {
    const loadLanguagePreference = async () => {
      const savedLanguage = localStorage.getItem("preferred-language") as
        | Language
        | null;

      if (savedLanguage && SUPPORTED_CODES.includes(savedLanguage)) {
        handleSetLanguage(savedLanguage);
        return;
      }

      try {
        const { data: user } = await supabase.auth.getUser();
        const uid = user.user?.id;
        if (!uid) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("language_preference")
          .eq("user_id", uid)
          .maybeSingle();

        const pref = (profile?.language_preference || "en") as Language;
        if (SUPPORTED_CODES.includes(pref)) {
          handleSetLanguage(pref);
        }
      } catch (error) {
        console.error("Failed to load language preference from profile:", error);
      }
    };

    loadLanguagePreference();
  }, [handleSetLanguage]);

  useEffect(() => {
    const onExternalLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent<Language>).detail;
      if (detail && SUPPORTED_CODES.includes(detail)) {
        handleSetLanguage(detail);
      }
    };

    window.addEventListener(
      "language:changed",
      onExternalLanguageChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "language:changed",
        onExternalLanguageChange as EventListener,
      );
    };
  }, [handleSetLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = getTranslationsForLanguage(language);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        t,
        currentLanguage: language,
        changeLanguage: handleSetLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
