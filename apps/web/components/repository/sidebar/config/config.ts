import { File, GitGraph, LucideIcon } from "lucide-react";

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
      title: "Graph",
      icon: GitGraph,
      isActive: true,
      url: "/graph",
    },
    {
      title: "Documents",
      icon: File,
      isActive: false,
      url: "/documents",
      items: [
        { title: "Create", url: "/documents/create" },
        { title: "Testing 1", url: "#" },
        { title: "Testing 2", url: "#" },
      ],
    },
  ],
};
