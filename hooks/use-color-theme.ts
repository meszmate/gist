"use client";

import { useState, useCallback } from "react";

export const COLOR_THEMES = [
  "neutral",
  "blue",
  "violet",
  "green",
  "rose",
  "orange",
] as const;

export type ColorTheme = (typeof COLOR_THEMES)[number];

const STORAGE_KEY = "color-theme";

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    if (typeof window === "undefined") return "neutral";
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && COLOR_THEMES.includes(stored as ColorTheme)
      ? (stored as ColorTheme)
      : "neutral";
  });

  const setColorTheme = useCallback((theme: ColorTheme) => {
    setColorThemeState(theme);
    if (theme === "neutral") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem(STORAGE_KEY);
    } else {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }, []);

  return { colorTheme, setColorTheme } as const;
}
