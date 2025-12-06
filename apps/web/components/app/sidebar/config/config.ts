import { LifeBuoy, LucideIcon, Send } from "lucide-react";

export interface AppSidebarConfig {
  footer: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
}

export const appSidebarConfig: AppSidebarConfig = {
  footer: [
    {
      title: "Support",
      url: "/support",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "/feedback",
      icon: Send,
    },
  ],
};
