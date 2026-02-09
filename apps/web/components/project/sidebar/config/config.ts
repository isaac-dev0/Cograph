import { LucideIcon, Settings, LayoutDashboard } from "lucide-react";

export interface ProjectSidebarConfig {
  hero: {
    title: string;
    icon: LucideIcon;
    isActive?: boolean;
    url?: string;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}

export const projectSidebarConfig: ProjectSidebarConfig = {
  hero: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      isActive: true,
      url: "/app",
    },
    {
      title: "Project Settings",
      icon: Settings,
      isActive: false,
    },
  ],
};
