import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { ptBR } from "./locales/pt-BR";

export { errorText, saveErrorText, warningText } from "./errors";
export type { Messages } from "./locales/en";

export type Locale = "en" | "pt-BR" | "es";

export const LOCALES: { code: Locale; nativeName: string }[] = [
  { code: "en", nativeName: "English" },
  { code: "pt-BR", nativeName: "Português (Brasil)" },
  { code: "es", nativeName: "Español" },
];

const MESSAGES = { en, "pt-BR": ptBR, es } as const;

const STORAGE_KEY = "check-dns-block.locale";

function isLocale(value: string): value is Locale {
  return value === "en" || value === "pt-BR" || value === "es";
}

/**
 * Maps OS/browser language tags (`navigator.languages`) to one of our
 * locales: any `pt-*` tag maps to `pt-BR`, any `es-*` tag to `es`, and
 * everything else — including no match at all — falls back to `en`.
 */
export function detectLocale(languages: readonly string[]): Locale {
  for (const raw of languages) {
    const primary = raw.split("-")[0]?.toLowerCase();
    if (primary === "pt") {
      return "pt-BR";
    }
    if (primary === "es") {
      return "es";
    }
  }
  return "en";
}

function loadStoredLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

function saveStoredLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Private browsing, quota exceeded, etc. — the choice just won't persist.
  }
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (typeof MESSAGES)["en"];
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: en,
});

/**
 * Provides the active locale and its message dictionary to the whole app.
 * Defaults to a stored choice, else the detected OS language, else English;
 * mirrors every choice onto `<html lang>` and to localStorage, same pattern
 * as `src/lib/useTheme.ts`.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(
    () => loadStoredLocale() ?? detectLocale(navigator.languages ?? [navigator.language]),
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    saveStoredLocale(next);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: MESSAGES[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
