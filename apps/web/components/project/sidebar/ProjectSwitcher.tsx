"use client";

import { ProjectCreateDialog } from "@/components/project/dialog/ProjectCreateDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useProject } from "@/hooks/providers/ProjectProvider";
import { getProjectIcon } from "@/lib/icons";
import { ChevronsUpDown, Loader2, Plus } from "lucide-react";

export function ProjectSwitcher() {
  const { isMobile } = useSidebar();
  const { currentProject, projects, setCurrentProject, isLoading } =
    useProject();

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!currentProject) return null;

  const ActiveIcon = getProjectIcon(currentProject.icon);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mt-2"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <ActiveIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {currentProject.name}
                </span>
                <span className="truncate text-xs capitalize">
                  {currentProject.status.toString().toLowerCase()}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Projects
            </DropdownMenuLabel>
            {projects.map((project) => {
              const ProjectIcon = getProjectIcon(project.icon);
              const isActive = project.id === currentProject.id;

              return (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => setCurrentProject(project)}
                  className="gap-2 p-2"
                  disabled={isActive}
                >
                  <div className={`flex size-6 items-center justify-center rounded-md border ${isActive ? 'bg-sidebar-accent' : ''}`}>
                    <ProjectIcon className="size-3.5 shrink-0" />
                  </div>
                  {project.name}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <ProjectCreateDialog
              trigger={
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Plus className="size-4" />
                  </div>
                  <div className="text-muted-foreground font-medium">
                    Create Project
                  </div>
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
