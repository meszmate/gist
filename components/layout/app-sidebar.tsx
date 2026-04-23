"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Brain,
  FolderPlus,
  GraduationCap,
  LayoutDashboard,
  Settings,
  FileQuestion,
  School,
  TrendingUp,
} from "lucide-react";
import { GistLogo } from "@/components/icons/gist-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SidebarUser } from "./sidebar-user";
import { useLocale } from "@/hooks/use-locale";

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useLocale();

  const navGroups = [
    {
      label: t("nav.main"),
      items: [
        { title: t("nav.dashboard"), href: "/dashboard", icon: LayoutDashboard },
        { title: t("nav.library"), href: "/library", icon: BookOpen },
        { title: t("nav.create"), href: "/create", icon: FolderPlus },
      ],
    },
    {
      label: t("nav.learn"),
      items: [
        { title: t("nav.study"), href: "/study", icon: Brain },
        { title: t("nav.quizzes"), href: "/quiz", icon: FileQuestion },
        { title: t("nav.lessons"), href: "/lessons", icon: GraduationCap },
        { title: t("nav.progress"), href: "/progress", icon: TrendingUp },
      ],
    },
    {
      label: t("nav.manage"),
      items: [
        { title: t("nav.courses"), href: "/courses", icon: School },
        { title: t("nav.settings"), href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="h-14 flex-row items-center px-4">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <GistLogo className="h-6 w-6 text-foreground" />
          <span className="font-semibold text-base tracking-tight">
            gist
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-0 py-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/50">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/60">
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}
