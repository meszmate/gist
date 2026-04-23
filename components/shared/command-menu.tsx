"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  BookOpen,
  Brain,
  FileQuestion,
  Home,
  Plus,
  Search,
  Settings,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

interface SearchResult {
  id: string;
  type: "resource" | "flashcard" | "question";
  title: string;
  subtitle?: string;
  resourceId?: string;
}

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const { t } = useLocale();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search when query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch {
        // Silently fail search
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    command();
  }, [setOpen]);

  const navigationItems = [
    { icon: Home, label: t("command.dashboard"), href: "/dashboard", shortcut: "G D" },
    { icon: BookOpen, label: t("command.library"), href: "/library", shortcut: "G L" },
    { icon: Brain, label: t("command.study"), href: "/study", shortcut: "G S" },
    { icon: FileQuestion, label: t("command.quizzes"), href: "/quiz", shortcut: "G Q" },
    { icon: Settings, label: t("command.settings"), href: "/settings", shortcut: "G ," },
  ];

  const actionItems = [
    { icon: Plus, label: t("command.createResource"), href: "/create", shortcut: "C R" },
    { icon: Brain, label: t("command.startStudySession"), href: "/study", shortcut: "S S" },
  ];

  const getResultIcon = (type: string) => {
    switch (type) {
      case "resource": return BookOpen;
      case "flashcard": return CreditCard;
      case "question": return MessageSquare;
      default: return Search;
    }
  };

  const getResultHref = (result: SearchResult) => {
    switch (result.type) {
      case "resource": return `/library/${result.id}`;
      case "flashcard": return `/library/${result.resourceId}`;
      case "question": return `/quiz/${result.resourceId}`;
      default: return "/library";
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearchQuery(""); setSearchResults([]); } }}>
      <CommandInput
        placeholder={t("command.placeholder")}
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? "Searching..." : t("common.noResults")}
        </CommandEmpty>

        {searchResults.length > 0 && (
          <>
            <CommandGroup heading="Search Results">
              {searchResults.map((result) => {
                const Icon = getResultIcon(result.type);
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => runCommand(() => router.push(getResultHref(result)))}
                  >
                    <Icon className="mr-2 h-4 w-4 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">{result.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading={t("command.navigation")}>
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => runCommand(() => router.push(item.href))}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                {item.shortcut}
              </kbd>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("command.actions")}>
          {actionItems.map((item) => (
            <CommandItem
              key={item.label}
              onSelect={() => runCommand(() => router.push(item.href))}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                {item.shortcut}
              </kbd>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function CommandMenuTrigger() {
  const { t } = useLocale();

  return (
    <button
      className="inline-flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onClick={() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
          metaKey: true,
        });
        document.dispatchEvent(event);
      }}
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">{t("command.searchTrigger")}</span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
