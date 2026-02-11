"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./types";
import en from "@/messages/en.json";
import hu from "@/messages/hu.json";

type Messages = Record<string, unknown>;

const messages: Record<Locale, Messages> = { en, hu };

const STORAGE_KEY = "locale";
const COOKIE_KEY = "locale";

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  // 1. Cookie
  const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
  if (cookieMatch) {
    const val = cookieMatch[1] as Locale;
    if (LOCALES.includes(val)) return val;
  }

  // 2. localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && LOCALES.includes(stored as Locale)) return stored as Locale;

  // 3. Browser language
  const browserLang = navigator.language.split("-")[0] as Locale;
  if (LOCALES.includes(browserLang)) return browserLang;

  return DEFAULT_LOCALE;
}

function setCookie(locale: Locale) {
  document.cookie = `${COOKIE_KEY}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    setCookie(newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  // Sync lang attribute on mount
  useEffect(() => {
    document.documentElement.lang = locale;
    // Ensure cookie and localStorage are in sync
    localStorage.setItem(STORAGE_KEY, locale);
    setCookie(locale);
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // Try current locale, then fallback to English, then raw key
      const value =
        getNestedValue(messages[locale], key) ??
        getNestedValue(messages.en, key) ??
        key;
      return interpolate(value, params);
    },
    [locale]
  );

  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, options).format(d);
    },
    [locale]
  );

  const formatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions): string => {
      return new Intl.NumberFormat(locale, options).format(num);
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, formatDate, formatNumber }}>
      {children}
    </I18nContext.Provider>
  );
}
