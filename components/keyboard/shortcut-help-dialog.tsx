"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVimContext } from "./vim-navigation-provider";
import { useLocale } from "@/hooks/use-locale";

export function ShortcutHelpDialog() {
  const { showHelp, setShowHelp } = useVimContext();
  const { t } = useLocale();

  const shortcuts = [
    { category: t("keyboard.navigation"), items: [
      { keys: "j / k", description: t("keyboard.moveDownUp") },
      { keys: "h / l", description: t("keyboard.switchTabsLeftRight") },
      { keys: "gg", description: t("keyboard.jumpToFirst") },
      { keys: "G", description: t("keyboard.jumpToLast") },
    ]},
    { category: t("keyboard.actions"), items: [
      { keys: "Enter / o", description: t("keyboard.openSelectItem") },
      { keys: "/", description: t("keyboard.openSearch") },
      { keys: "?", description: t("keyboard.toggleHelp") },
      { keys: "Escape", description: t("keyboard.exitCloseDialog") },
    ]},
    { category: t("keyboard.flashcards"), items: [
      { keys: "Space", description: t("keyboard.flipCard") },
      { keys: "1 / 2 / 3 / 4", description: t("keyboard.rateCard") },
    ]},
    { category: t("keyboard.quiz"), items: [
      { keys: "1 / 2 / 3 / 4", description: t("keyboard.selectAnswer") },
      { keys: "Enter", description: t("keyboard.submitNext") },
    ]},
  ];

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("keyboard.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {section.category}
              </h3>
              <div className="space-y-1">
                {section.items.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          {t("keyboard.pressToToggle")} <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">?</kbd>
        </p>
      </DialogContent>
    </Dialog>
  );
}
