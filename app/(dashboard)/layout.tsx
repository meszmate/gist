import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { VimNavigationProvider } from "@/components/keyboard/vim-navigation-provider";
import { ShortcutHelpDialog } from "@/components/keyboard/shortcut-help-dialog";
import { CommandMenu, CommandMenuTrigger } from "@/components/shared/command-menu";
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
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 px-4 sm:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <CommandMenuTrigger />
            </div>
            <ShortcutHint />
          </header>
          <main className="flex-1 px-4 pb-6 sm:px-6">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
      <CommandMenu />
      <ShortcutHelpDialog />
    </VimNavigationProvider>
  );
}
