"use client";

import {
  Frame,
  Map,
  PieChart,
  Command,
  GalleryVerticalEnd,
  AudioWaveform,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { DashboardSidebarPrimary } from "@/components/dashboard/sidebar/SidebarPrimary";
import { DashboardSidebarProjects } from "@/components/dashboard/sidebar/SidebarProjects";
import { SidebarAccount } from "@/components/dashboard/sidebar/SidebarAccount";
import { OrganisationSwitcher } from "@/components/dashboard/sidebar/SidebarOrgSwitcher";
import { DashboardSidebarSecondary } from "@/components/dashboard/sidebar/SidebarSecondary";
import { useUser } from "@/hooks/providers/UserProvider";

export const sidebarData = {
  organisations: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navPrimary: [
    {
      title: "Organisation Settings",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "Details",
          url: "#",
        },
        {
          title: "Members",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function DashboardSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const user = useUser();

  return (
    <Sidebar className="top-14 h-[calc(100vh-3.5rem)] bg-background" {...props}>
      <SidebarHeader>
        <OrganisationSwitcher organisations={sidebarData.organisations} />
      </SidebarHeader>
      <SidebarContent>
        <DashboardSidebarProjects projects={sidebarData.projects} />
        <DashboardSidebarPrimary items={sidebarData.navPrimary} />
        <DashboardSidebarSecondary className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAccount user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
