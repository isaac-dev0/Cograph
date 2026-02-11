import { Archive, Import, MoreHorizontal, FolderGit2, Trash2 } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRepository } from "@/hooks/providers/RepositoryProvider";
import { RepositoryImportDialog } from "@/components/repository/dialog/RepositoryImportDialog";

export function ProjectRepositories() {
  const { isMobile } = useSidebar();
  const { setCurrentRepository, repositories, removeRepositoryFromProject, archiveRepository } = useRepository();

  const handleRemoveRepository = async (repositoryId: string) => {
    try {
      await removeRepositoryFromProject(repositoryId);
    } catch (error) {
      console.error("Failed to remove repository:", error);
    }
  };

  const handleArchiveRepository = async (repositoryId: string) => {
    try {
      await archiveRepository(repositoryId);
    } catch (error) {
      console.error("Failed to archive repository:", error);
    }
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenu>
        <SidebarGroupLabel>Repositories</SidebarGroupLabel>
        {repositories.map((repository) => (
          <SidebarMenuItem key={repository.id}>
            <SidebarMenuButton onClick={() => setCurrentRepository(repository)}>
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
                <DropdownMenuItem
                  onClick={() => handleRemoveRepository(repository.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="text-destructive" />
                  <span>Remove from Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        <RepositoryImportDialog
          trigger={
            <SidebarMenuButton variant="default">
              <Import />
              Import Repository
            </SidebarMenuButton>
          }
        />
      </SidebarMenu>
    </SidebarGroup>
  );
}
