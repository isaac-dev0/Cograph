import { Archive, MoreHorizontal, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useRepository } from "@/hooks/providers/RepositoryProvider";

export function ProjectRepositories() {
  const { isMobile } = useSidebar();
  const { setCurrentRepository, repositories } = useRepository();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenu>
        <SidebarGroupLabel>Repositories</SidebarGroupLabel>
        {repositories.length === 0 ? (
          <SidebarMenuItem className="px-2 text-sm">
            No repositories found.
          </SidebarMenuItem>
        ) : (
          <>
            {repositories.map((repository) => (
              <SidebarMenuItem key={repository.id}>
                <SidebarMenuButton
                  onClick={() => setCurrentRepository(repository)}
                >
                  <repository.icon />
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
                    <DropdownMenuItem>
                      <Archive className="text-muted-foreground" />
                      <span>Archive</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
          </>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
