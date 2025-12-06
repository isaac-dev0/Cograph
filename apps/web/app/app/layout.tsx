"use client";

import { ProjectEmptyView } from "@/components/project/view/ProjectEmptyView";
import { ProjectSidebar } from "@/components/project/sidebar/ProjectSidebar";
import { RepositorySidebar } from "@/components/repository/sidebar/RepositorySidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useProject } from "@/hooks/providers/ProjectProvider";
import { useRepository } from "@/hooks/providers/RepositoryProvider";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { projects } = useProject();
  const { currentRepository } = useRepository();

  return (
    <>
      {/* <AppHeader /> */}
      {projects.length === 0 ? (
        <ProjectEmptyView />
      ) : (
        <SidebarProvider>
          {currentRepository ? <RepositorySidebar /> : <ProjectSidebar />}
          <SidebarInset className="flex flex-col overflow-hidden">
            {children}
          </SidebarInset>
        </SidebarProvider>
      )}
    </>
  );
}
