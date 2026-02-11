import { File, GitGraph, LucideIcon, LayoutDashboard } from "lucide-react";

export interface RepositorySidebarConfig {
  hero: {
    title: string;
    icon: LucideIcon;
    isActive?: boolean;
    url: string;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}

export const repositorySidebarConfig: RepositorySidebarConfig = {
  hero: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      isActive: false,
      url: "/app",
    },
    {
      title: "Graph",
      icon: GitGraph,
      isActive: true,
      url: "/app/graph",
    },
    {
      title: "Documents",
      icon: File,
      isActive: false,
      url: "/app/documents",
    },
  ],
};
