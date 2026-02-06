"use client";

import { useState, useEffect, useCallback } from "react";

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
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("neutral");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && COLOR_THEMES.includes(stored as ColorTheme)) {
      setColorThemeState(stored as ColorTheme);
    }
  }, []);

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
