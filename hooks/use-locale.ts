"use client";

import { useContext } from "react";
import { I18nContext, type I18nContextValue } from "@/lib/i18n/i18n-context";

export function useLocale(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useLocale must be used within I18nProvider");
  }
  return context;
}
