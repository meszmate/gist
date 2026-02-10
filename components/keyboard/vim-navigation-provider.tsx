"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type VimMode = "normal" | "insert";

interface VimNavigationContextValue {
  mode: VimMode;
  setMode: (mode: VimMode) => void;
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

const VimNavigationContext = createContext<VimNavigationContextValue | null>(
  null
);

export function useVimContext() {
  const context = useContext(VimNavigationContext);
  if (!context) {
    throw new Error("useVimContext must be used within VimNavigationProvider");
  }
  return context;
}

interface VimNavigationProviderProps {
  children: ReactNode;
}

export function VimNavigationProvider({
  children,
}: VimNavigationProviderProps) {
  const [mode, setMode] = useState<VimMode>("normal");
  const [showHelp, setShowHelp] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInput) {
        if (e.key === "Escape") {
          (target as HTMLInputElement).blur();
          setMode("normal");
          setSearchOpen(false);
        }
        return;
      }

      // Global shortcuts (normal mode)
      switch (e.key) {
        case "?":
          e.preventDefault();
          setShowHelp((prev) => !prev);
          break;
        case "/":
          e.preventDefault();
          setSearchOpen(true);
          setMode("insert");
          break;
        case "Escape":
          e.preventDefault();
          setShowHelp(false);
          setSearchOpen(false);
          setMode("normal");
          break;
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <VimNavigationContext.Provider
      value={{
        mode,
        setMode,
        showHelp,
        setShowHelp,
        searchOpen,
        setSearchOpen,
      }}
    >
      {children}
    </VimNavigationContext.Provider>
  );
}
