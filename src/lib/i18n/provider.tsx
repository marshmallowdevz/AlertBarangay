"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { LANG_COOKIE, isLang, translate, type Lang, type MessageKey } from "./messages";

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18n | null>(null);

/** Holds the chosen UI language. The root layout reads the cookie so the first paint is already translated. */
export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    if (!isLang(next)) return;
    setLangState(next);
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next === "en" ? "en" : next === "fil" ? "fil" : "ceb";
  }, []);

  const value = useMemo<I18n>(() => ({
    lang,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
  }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** English is used when a component renders outside the provider (e.g. in tests). */
export function useI18n(): I18n {
  return useContext(I18nContext) ?? {
    lang: "en",
    setLang: () => undefined,
    t: (key, vars) => translate("en", key, vars),
  };
}
