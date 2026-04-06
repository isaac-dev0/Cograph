"use client";

import { GitGraph, LogOut, RefreshCw, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/login/actions";
import { useRepository } from "@/hooks/providers/RepositoryProvider";
import { useState } from "react";

export function RepositoryEmptyView() {
  const { syncRepositoriesFromGitHub } = useRepository();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncRepositoriesFromGitHub();
    } catch (error) {
      console.error("Failed to sync repositories:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-8 animate-fade-in">
      <div className="flex flex-col items-center gap-10 w-full max-w-md text-center">
        <div className="flex flex-col items-center gap-5">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <GitGraph className="size-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              No repositories yet
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Sync your GitHub repositories to start exploring dependency graphs
              and codebase structure.
            </p>
          </div>
          <Button className="gap-2" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Loader className="size-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                Sync from GitHub
              </>
            )}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => signOut()}>
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
