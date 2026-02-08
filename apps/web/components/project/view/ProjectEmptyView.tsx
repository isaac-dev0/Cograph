"use client";

import { Folder, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCreateDialog } from "@/components/project/dialog/ProjectCreateDialog";

export function ProjectEmptyView() {
  return (
    <div className="flex h-full items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center gap-4 max-w-xs text-center">
        <div className="flex size-10 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25">
          <Folder className="size-4 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium">No projects yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first project to start organizing repositories.
          </p>
        </div>
        <ProjectCreateDialog
          trigger={
            <Button size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              Create Project
            </Button>
          }
        />
      </div>
    </div>
  );
}
