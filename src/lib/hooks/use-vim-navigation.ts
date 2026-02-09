"use client";

import { useCallback, useEffect, useState } from "react";

export type VimMode = "normal" | "insert";

interface UseVimNavigationOptions {
  itemCount: number;
  onSelect?: (index: number) => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useVimNavigation({
  itemCount,
  onSelect,
  onEscape,
  enabled = true,
}: UseVimNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<VimMode>("normal");

  const moveUp = useCallback(() => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const moveDown = useCallback(() => {
    setSelectedIndex((prev) => Math.min(itemCount - 1, prev + 1));
  }, [itemCount]);

  const jumpToFirst = useCallback(() => {
    setSelectedIndex(0);
  }, []);

  const jumpToLast = useCallback(() => {
    setSelectedIndex(Math.max(0, itemCount - 1));
  }, [itemCount]);

  const select = useCallback(() => {
    onSelect?.(selectedIndex);
  }, [onSelect, selectedIndex]);

  const enterInsertMode = useCallback(() => {
    setMode("insert");
  }, []);

  const exitInsertMode = useCallback(() => {
    setMode("normal");
    onEscape?.();
  }, [onEscape]);

  useEffect(() => {
    if (!enabled) return;

    let gPressed = false;
    let gTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in input/textarea (insert mode)
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInput) {
        if (e.key === "Escape") {
          (target as HTMLInputElement).blur();
          setMode("normal");
          onEscape?.();
        }
        return;
      }

      // Normal mode shortcuts
      switch (e.key) {
        case "j":
          e.preventDefault();
          moveDown();
          break;
        case "k":
          e.preventDefault();
          moveUp();
          break;
        case "g":
          e.preventDefault();
          if (gPressed) {
            // gg - jump to first
            jumpToFirst();
            gPressed = false;
            if (gTimeout) clearTimeout(gTimeout);
          } else {
            gPressed = true;
            gTimeout = setTimeout(() => {
              gPressed = false;
            }, 500);
          }
          break;
        case "G":
          e.preventDefault();
          jumpToLast();
          break;
        case "Enter":
        case "o":
          e.preventDefault();
          select();
          break;
        case "Escape":
          e.preventDefault();
          exitInsertMode();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (gTimeout) clearTimeout(gTimeout);
    };
  }, [
    enabled,
    mode,
    moveDown,
    moveUp,
    jumpToFirst,
    jumpToLast,
    select,
    exitInsertMode,
    onEscape,
  ]);

  // Clamp selection when item count changes (computed during render)
  const clampedIndex = selectedIndex >= itemCount ? Math.max(0, itemCount - 1) : selectedIndex;
  if (clampedIndex !== selectedIndex) {
    setSelectedIndex(clampedIndex);
  }

  return {
    selectedIndex,
    setSelectedIndex,
    mode,
    setMode,
    enterInsertMode,
    exitInsertMode,
  };
}
