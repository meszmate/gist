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
  Users,
  FileQuestion,
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
      ],
    },
    {
      label: t("nav.manage"),
      items: [
        { title: t("nav.contacts"), href: "/contacts", icon: Users },
        { title: t("nav.settings"), href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b h-14 flex justify-center">
        <Link href="/dashboard" className="flex items-center gap-2 px-2">
          <div className="rounded-md bg-primary p-1">
            <GistLogo className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">
            gist
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                      >
                        <Link href={item.href}>
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
      <SidebarFooter className="border-t">
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}
