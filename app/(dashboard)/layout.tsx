import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { VimNavigationProvider } from "@/components/keyboard/vim-navigation-provider";
import { ShortcutHelpDialog } from "@/components/keyboard/shortcut-help-dialog";
import { CommandMenu, CommandMenuTrigger } from "@/components/shared/command-menu";
import { Separator } from "@/components/ui/separator";
import { ShortcutHint } from "@/components/layout/shortcut-hint";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VimNavigationProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1">
              <CommandMenuTrigger />
            </div>
            <ShortcutHint />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <CommandMenu />
      <ShortcutHelpDialog />
    </VimNavigationProvider>
  );
}
