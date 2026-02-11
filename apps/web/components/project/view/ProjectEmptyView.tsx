"use client";

import { GitGraph, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCreateDialog } from "@/components/project/dialog/ProjectCreateDialog";
import { signOut } from "@/app/auth/login/actions";

export function ProjectEmptyView() {
  return (
    <div className="flex h-full items-center justify-center p-8 animate-fade-in">
      <div className="flex flex-col items-center gap-10 w-full max-w-md text-center">
        <div className="flex flex-col items-center gap-5">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <GitGraph className="size-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              No projects yet
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Projects group your repositories so your team can explore
              dependencies together.
            </p>
          </div>
          <ProjectCreateDialog
            trigger={
              <Button className="gap-2">
                <Plus className="size-4" />
                Create your first project
              </Button>
            }
          />
          <Button variant="outline" className="gap-2" onClick={() => signOut()}>
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
