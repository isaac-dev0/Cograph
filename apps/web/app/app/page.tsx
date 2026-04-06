"use client";

import { RepositoryListView } from "@/components/repository/view/RepositoryListView";
import { RepositoryView } from "@/components/repository/view/RepositoryView";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRepository } from "@/hooks/providers/RepositoryProvider";
import { Loader2 } from "lucide-react";

export default function AppPage() {
  const { currentRepository, isLoading } = useRepository();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-auto p-4">
        {currentRepository ? (
          <RepositoryView repository={currentRepository} />
        ) : (
          <RepositoryListView />
        )}
      </div>
    </>
  );
}
