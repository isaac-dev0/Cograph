"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React, { useEffect, useState } from "react";
import { Loader, RefreshCw } from "lucide-react";
import { useRepository } from "@/hooks/providers/RepositoryProvider";
import { Repository } from "@/lib/interfaces/repository.interfaces";

interface RepositoryImportDialogProps {
  trigger?: React.ReactNode;
}

export function RepositoryImportDialog({
  trigger,
}: RepositoryImportDialogProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState<boolean>(false);

  const { repositories, syncRepositoriesFromGitHub } = useRepository();

  useEffect(() => {
    if (open) {
      setError(null);
      setSynced(false);
    }
  }, [open]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      await syncRepositoriesFromGitHub();
      setSynced(true);
    } catch (error) {
      console.error("Failed to sync repositories:", error);
      setError(
        error instanceof Error ? error.message : "Failed to sync repositories",
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const availableRepositories = repositories.filter(
    (repo) => !repo.isArchived && !repo.isDisabled,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Sync Repositories</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sync Repositories</DialogTitle>
          <DialogDescription>
            Fetch your latest repositories from GitHub. New repositories will
            appear in your list automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {synced && (
            <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
              Repositories synced successfully.
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {availableRepositories.length} repositories available
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync from GitHub
                </>
              )}
            </Button>
          </div>

          {availableRepositories.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto rounded-md border">
              <div className="p-1">
                {availableRepositories.map((repo: Repository) => (
                  <div
                    key={repo.id}
                    className="flex items-center gap-2 rounded-sm py-1.5 px-2 text-sm"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {repo.ownerAvatarUrl && (
                        <img
                          src={repo.ownerAvatarUrl}
                          alt={repo.ownerLogin}
                          className="h-6 w-6 rounded-full shrink-0"
                        />
                      )}
                      <div className="flex flex-col items-start min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {repo.name}
                          </span>
                          {repo.isPrivate && (
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              Private
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <span className="text-xs text-muted-foreground truncate max-w-full">
                            {repo.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
