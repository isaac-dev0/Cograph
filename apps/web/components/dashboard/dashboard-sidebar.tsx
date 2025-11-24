"use client"

import { Command } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import { sidebarData } from "./data/sidebar-data";
import { DashboardSidebarPrimary } from "./dashboard-sidebar-primary";
import { DashboardSidebarSecondary } from "./dashboard-sidebar-secondary";
import { DashboardSidebarUser } from "./dashboard-sidebar-user";
import { DashboardSidebarProjects } from "./dashboard-sidebar-projects";

export function DashboardSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <DashboardSidebarPrimary items={sidebarData.navPrimary} />
        <DashboardSidebarProjects projects={sidebarData.projects} />
        <DashboardSidebarSecondary
          items={sidebarData.navSecondary}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <DashboardSidebarUser user={sidebarData.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
