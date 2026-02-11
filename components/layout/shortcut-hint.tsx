"use client";

import { useLocale } from "@/hooks/use-locale";

export function ShortcutHint() {
  const { t } = useLocale();
  return (
    <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-mono text-muted-foreground bg-muted rounded border">
      {t("layout.shortcutHint")}
    </kbd>
  );
}
