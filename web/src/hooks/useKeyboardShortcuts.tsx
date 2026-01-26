import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: KeyHandler;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.handler(event);
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Flashcard review shortcuts
export function useFlashcardShortcuts({
  onFlip,
  onNext,
  onPrevious,
  onRateAgain,
  onRateHard,
  onRateGood,
  onRateEasy,
  enabled = true,
}: {
  onFlip?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onRateAgain?: () => void;
  onRateHard?: () => void;
  onRateGood?: () => void;
  onRateEasy?: () => void;
  enabled?: boolean;
}) {
  const shortcuts: ShortcutConfig[] = [];

  if (onFlip) {
    shortcuts.push({
      key: ' ',
      handler: onFlip,
      description: 'Flip card',
    });
  }

  if (onNext) {
    shortcuts.push({
      key: 'ArrowRight',
      handler: onNext,
      description: 'Next card',
    });
  }

  if (onPrevious) {
    shortcuts.push({
      key: 'ArrowLeft',
      handler: onPrevious,
      description: 'Previous card',
    });
  }

  if (onRateAgain) {
    shortcuts.push({
      key: '1',
      handler: onRateAgain,
      description: 'Rate: Again',
    });
  }

  if (onRateHard) {
    shortcuts.push({
      key: '2',
      handler: onRateHard,
      description: 'Rate: Hard',
    });
  }

  if (onRateGood) {
    shortcuts.push({
      key: '3',
      handler: onRateGood,
      description: 'Rate: Good',
    });
  }

  if (onRateEasy) {
    shortcuts.push({
      key: '4',
      handler: onRateEasy,
      description: 'Rate: Easy',
    });
  }

  useKeyboardShortcuts(shortcuts, enabled);
}

// Quiz shortcuts
export function useQuizShortcuts({
  onSelectOption,
  onSubmit,
  enabled = true,
}: {
  onSelectOption?: (index: number) => void;
  onSubmit?: () => void;
  enabled?: boolean;
}) {
  const shortcuts: ShortcutConfig[] = [];

  if (onSelectOption) {
    for (let i = 1; i <= 4; i++) {
      shortcuts.push({
        key: String(i),
        handler: () => onSelectOption(i - 1),
        description: `Select option ${i}`,
      });
    }
  }

  if (onSubmit) {
    shortcuts.push({
      key: 'Enter',
      handler: onSubmit,
      description: 'Submit answer',
    });
  }

  useKeyboardShortcuts(shortcuts, enabled);
}

// Global shortcuts
export function useGlobalShortcuts({
  onSearch,
  onNewMaterial,
  onStartStudy,
  enabled = true,
}: {
  onSearch?: () => void;
  onNewMaterial?: () => void;
  onStartStudy?: () => void;
  enabled?: boolean;
}) {
  const shortcuts: ShortcutConfig[] = [];

  if (onSearch) {
    shortcuts.push({
      key: 'k',
      ctrl: true,
      handler: onSearch,
      description: 'Open search',
    });
  }

  if (onNewMaterial) {
    shortcuts.push({
      key: 'n',
      ctrl: true,
      handler: onNewMaterial,
      description: 'New material',
    });
  }

  if (onStartStudy) {
    shortcuts.push({
      key: 's',
      ctrl: true,
      handler: onStartStudy,
      description: 'Start study session',
    });
  }

  useKeyboardShortcuts(shortcuts, enabled);
}
