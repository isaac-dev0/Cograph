import { Braces, Folder, LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  folder: Folder,
  braces: Braces,
};

export function getRepositoryIcon(iconName?: string): LucideIcon {
  if (!iconName || !iconMap[iconName]) {
    return Braces;
  }
  return iconMap[iconName];
}
