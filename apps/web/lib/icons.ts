import { Braces, Folder, LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  folder: Folder,
  braces: Braces,
};

export function getProjectIcon(iconName?: string): LucideIcon {
  if (!iconName || !iconMap[iconName]) {
    return Folder;
  }
  return iconMap[iconName];
}

export function getRepositoryIcon(iconName?: string): LucideIcon {
  if (!iconName || !iconMap[iconName]) {
    return Braces;
  }
  return iconMap[iconName];
}
