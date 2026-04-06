"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppSidebarProfile } from "@/components/app/sidebar/AppSidebarProfile";
import { AppSidebarFooter } from "@/components/app/sidebar/AppSidebarFooter";
import { appSidebarConfig } from "@/components/app/sidebar/config/config";
import { useUser } from "@/hooks/providers/UserProvider";
import { useRepository } from "@/hooks/providers/RepositoryProvider";
import { RepositoryImportDialog } from "@/components/repository/dialog/RepositoryImportDialog";
import {
  Archive,
  FolderGit2,
  GitGraph,
  Import,
  MoreHorizontal,
} from "lucide-react";

export function MainSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { profile } = useUser();
  const { isMobile } = useSidebar();
  const { setCurrentRepository, repositories, archiveRepository } =
    useRepository();

  const handleArchiveRepository = async (repositoryId: string) => {
    try {
      await archiveRepository(repositoryId);
    } catch (error) {
      console.error("Failed to archive repository:", error);
    }
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="mt-2">
              <div className="flex size-6 items-center justify-center rounded-md border">
                <GitGraph className="size-3.5 shrink-0" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Cograph</span>
                <span className="truncate text-xs text-muted-foreground">
                  {repositories.length}{" "}
                  {repositories.length === 1 ? "repository" : "repositories"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Repositories</SidebarGroupLabel>
          <SidebarMenu>
            {repositories.map((repository) => (
              <SidebarMenuItem key={repository.id}>
                <SidebarMenuButton
                  onClick={() => setCurrentRepository(repository)}
                >
                  {repository.icon ? (
                    <img
                      src={repository.icon}
                      alt={repository.name}
                      className="w-4 h-4 rounded-sm"
                    />
                  ) : (
                    <FolderGit2 className="w-4 h-4" />
                  )}
                  <span>{repository.name}</span>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontal />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuItem
                      onClick={() => handleArchiveRepository(repository.id)}
                    >
                      <Archive className="text-muted-foreground" />
                      <span>Archive</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
            <RepositoryImportDialog
              trigger={
                <SidebarMenuButton variant="default">
                  <Import />
                  Sync Repositories
                </SidebarMenuButton>
              }
            />
          </SidebarMenu>
        </SidebarGroup>
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
