"use client";

import { Languages } from "lucide-react";
import { languageNames, languages, type Lang } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/provider";

/** Compact English / Filipino / Cebuano picker. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return <label className={`language-switcher ${className}`}>
    <Languages size={14} aria-hidden="true" />
    <span className="sr-only">{t("lang.label")}</span>
    <select value={lang} onChange={(event) => setLang(event.target.value as Lang)} aria-label={t("lang.label")}>
      {languages.map((code) => <option key={code} value={code}>{languageNames[code]}</option>)}
    </select>
  </label>;
}
