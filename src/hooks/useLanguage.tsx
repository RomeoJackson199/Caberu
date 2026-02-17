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

// When a page (e.g. BusinessProfilePage) sets its own language, this flag
// prevents the user-preference loader from overriding it.
let isPageLanguageLocked = false;

const persistLanguagePreference = (lang: Language) => {
  localStorage.setItem("preferred-language", lang);
  document.documentElement.lang = lang;
};

export const changeLanguage = (lang: Language) => {
  if (!SUPPORTED_CODES.includes(lang)) return;
  persistLanguagePreference(lang);
  window.dispatchEvent(new CustomEvent<Language>("language:changed", { detail: lang }));
};

/**
 * Apply a language for the current page only.
 * Unlike `changeLanguage`, this does NOT write to localStorage so the
 * visitor's personal preference is left intact.  Call `clearPageLanguage`
 * when the page unmounts to release the lock.
 */
export const setPageLanguage = (lang: Language) => {
  if (!SUPPORTED_CODES.includes(lang)) return;
  isPageLanguageLocked = true;
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent<Language>("language:changed", { detail: lang }));
};

/** Release the page-language lock set by `setPageLanguage`. */
export const clearPageLanguage = () => {
  isPageLanguageLocked = false;
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
      // A page (e.g. BusinessProfilePage) may have locked the language to its
      // own default.  Don't override it with the visitor's personal preference.
      if (isPageLanguageLocked) return;

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

        // Check again after the first async step — the page language may have
        // been applied while we were waiting for the auth call.
        if (isPageLanguageLocked) return;

        const { data: profile } = await supabase
          .from("secure_profiles_view")
          .select("language_preference")
          .eq("user_id", uid)
          .maybeSingle();

        // Final check: business data may have arrived while profile was loading.
        if (isPageLanguageLocked) return;

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
