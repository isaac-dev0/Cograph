"use client";

import { AppSidebarProfile } from "@/components/app/sidebar/AppSidebarProfile";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useUser } from "@/hooks/providers/UserProvider";
import { ProjectSwitcher } from "@/components/project/sidebar/ProjectSwitcher";
import { ProjectRepositories } from "@/components/project/sidebar/ProjectSidebarRepositories";
import { useProject } from "@/hooks/providers/ProjectProvider";
import { ProjectSidebarMain } from "./ProjectSidebarMain";
import { projectSidebarConfig } from "./config/config";
import { appSidebarConfig } from "@/components/app/sidebar/config/config";
import { AppSidebarFooter } from "@/components/app/sidebar/AppSidebarFooter";

export function ProjectSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { profile } = useUser();
  const { projects, error } = useProject();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ProjectSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {error ? (
          <div className="flex items-center justify-center p-4">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div></div>
        ) : (
          <>
            <ProjectRepositories />
            <ProjectSidebarMain config={projectSidebarConfig.hero} />
          </>
        )}
        <AppSidebarFooter
          config={appSidebarConfig.footer}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <AppSidebarProfile profile={profile} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
