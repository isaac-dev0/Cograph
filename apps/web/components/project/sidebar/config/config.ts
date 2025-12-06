import { LucideIcon, Settings } from "lucide-react";

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
      title: "Project Settings",
      icon: Settings,
      isActive: false,
    },
  ],
};
