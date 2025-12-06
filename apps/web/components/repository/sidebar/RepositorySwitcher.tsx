"use client";

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
import { useRepository } from "@/hooks/providers/RepositoryProvider";
import { getRepositoryIcon } from "@/lib/icons";
import { ArrowLeft, ChevronsUpDown, Import, Loader2 } from "lucide-react";

export function RepositorySwitcher() {
  const { isMobile } = useSidebar();
  const { currentRepository, repositories, setCurrentRepository, isLoading } =
    useRepository();
  const { currentProject, setCurrentProject } = useProject();

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

  if (!currentRepository || !currentProject) return null;

  const ActiveIcon = getRepositoryIcon(currentRepository.icon);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mt-2"
            >
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {currentRepository.name}
                </span>
                <span className="truncate text-xs capitalize">
                  {currentProject.name}
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
            <DropdownMenuItem
              onClick={() => setCurrentRepository(null)}
              className="gap-2 p-2 font-medium"
            >
              <ArrowLeft className="size-4" />
              Back to {currentProject.name}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Repositories
            </DropdownMenuLabel>
            {repositories.map((repository) => {
              const RepositoryIcon = getRepositoryIcon(repository.icon);
              const isActive = repository.id === currentRepository.id;

              return (
                <DropdownMenuItem
                  key={repository.id}
                  onClick={() => setCurrentRepository(repository)}
                  className="gap-2 p-2"
                  disabled={isActive}
                >
                  <div
                    className={`flex size-6 items-center justify-center rounded-md border ${isActive ? "bg-sidebar-accent" : ""}`}
                  >
                    <RepositoryIcon className="size-3.5 shrink-0" />
                  </div>
                  {repository.name}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            {/* Import Repository Popup */}
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Import className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">
                Import Repository
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
