"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVimContext } from "./vim-navigation-provider";

const shortcuts = [
  { category: "Navigation", items: [
    { keys: "j / k", description: "Move down / up" },
    { keys: "h / l", description: "Switch tabs left / right" },
    { keys: "gg", description: "Jump to first item" },
    { keys: "G", description: "Jump to last item" },
  ]},
  { category: "Actions", items: [
    { keys: "Enter / o", description: "Open / select item" },
    { keys: "/", description: "Open search" },
    { keys: "?", description: "Toggle this help" },
    { keys: "Escape", description: "Exit input / close dialog" },
  ]},
  { category: "Flashcards", items: [
    { keys: "Space", description: "Flip card" },
    { keys: "1 / 2 / 3 / 4", description: "Rate: Again / Hard / Good / Easy" },
  ]},
  { category: "Quiz", items: [
    { keys: "1 / 2 / 3 / 4", description: "Select answer option" },
    { keys: "Enter", description: "Submit / next question" },
  ]},
];

export function ShortcutHelpDialog() {
  const { showHelp, setShowHelp } = useVimContext();

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
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
          Press <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded">?</kbd> to toggle this help
        </p>
      </DialogContent>
    </Dialog>
  );
}
