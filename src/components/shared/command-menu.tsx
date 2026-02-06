"use client";

import { useEffect, useState, useCallback } from "react";
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
  Users,
} from "lucide-react";

interface Resource {
  id: string;
  title: string;
  type: "resource" | "quiz";
}

interface CommandMenuProps {
  resources?: Resource[];
}

export function CommandMenu({ resources = [] }: CommandMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

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

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const navigationItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard", shortcut: "G D" },
    { icon: BookOpen, label: "Library", href: "/library", shortcut: "G L" },
    { icon: Brain, label: "Study", href: "/study", shortcut: "G S" },
    { icon: FileQuestion, label: "Quizzes", href: "/quiz", shortcut: "G Q" },
    { icon: Users, label: "Contacts", href: "/contacts", shortcut: "G C" },
    { icon: Settings, label: "Settings", href: "/settings", shortcut: "G ," },
  ];

  const actionItems = [
    { icon: Plus, label: "Create Resource", href: "/create", shortcut: "C R" },
    { icon: Brain, label: "Start Study Session", href: "/study", shortcut: "S S" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
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

        <CommandGroup heading="Actions">
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

        {resources.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Resources">
              {resources.slice(0, 5).map((resource) => (
                <CommandItem
                  key={resource.id}
                  onSelect={() =>
                    runCommand(() =>
                      router.push(
                        resource.type === "quiz"
                          ? `/quiz/${resource.id}`
                          : `/library/${resource.id}`
                      )
                    )
                  }
                >
                  <Search className="mr-2 h-4 w-4" />
                  <span>{resource.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function CommandMenuTrigger() {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onClick={() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
          metaKey: true,
        });
        document.dispatchEvent(event);
      }}
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
