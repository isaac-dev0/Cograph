import { ArrowUpRightIcon, Folder, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ProjectCreateDialog } from "@/components/project/dialog/ProjectCreateDialog";

export function ProjectEmptyView() {
  return (
    <div className="flex h-full items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Folder />
          </EmptyMedia>
          <EmptyTitle>No Projects Yet</EmptyTitle>
          <EmptyDescription>
            You haven&apos;t created any projects yet. Get started by creating
            your first project.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ProjectCreateDialog
            trigger={
              <Button
                className="bg-sidebar-primary text-sidebar-primary-foreground w-full shadow-none"
                size="lg"
              >
                <Plus />
                Create Project
              </Button>
            }
          />
        </EmptyContent>
        <Button
          variant="link"
          asChild
          className="text-muted-foreground"
          size="sm"
        >
          <a href="#">
            Learn More <ArrowUpRightIcon />
          </a>
        </Button>
      </Empty>
    </div>
  );
}
