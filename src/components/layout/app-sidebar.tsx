"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Brain,
  FolderPlus,
  LayoutDashboard,
  Settings,
  Users,
  FileQuestion,
  Github,
  FileText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SidebarUser } from "./sidebar-user";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Library",
    href: "/library",
    icon: BookOpen,
  },
  {
    title: "Study",
    href: "/study",
    icon: Brain,
  },
  {
    title: "Create",
    href: "/create",
    icon: FolderPlus,
  },
  {
    title: "Quizzes",
    href: "/quiz",
    icon: FileQuestion,
  },
  {
    title: "Contacts",
    href: "/contacts",
    icon: Users,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Brain className="h-6 w-6" />
          <span className="font-semibold text-lg">SmartNotes</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
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
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/settings"}>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/terms">
                <FileText className="h-4 w-4" />
                <span>Terms of Service</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {process.env.NEXT_PUBLIC_REPOSITORY_URL && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a
                  href={process.env.NEXT_PUBLIC_REPOSITORY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" />
                  <span>GitHub</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}
