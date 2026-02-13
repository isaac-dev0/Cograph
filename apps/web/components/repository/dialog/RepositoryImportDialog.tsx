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
import { graphqlRequest } from "@/lib/graphql/client";
import React, { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useProject } from "@/hooks/providers/ProjectProvider";
import { CheckIcon, Loader, RefreshCw, ChevronDown } from "lucide-react";
import { useRepository } from "@/hooks/providers/RepositoryProvider";
import { ADD_REPOSITORIES_TO_PROJECT } from "@/lib/queries/RepositoryQueries";
import { Repository } from "@/lib/interfaces/repository.interfaces";
import { cn } from "@/lib/utils";

interface RepositoryImportDialogProps {
  trigger?: React.ReactNode;
}

const schema = z.object({
  repositories: z.array(z.string()).min(1, "Select at least one repository"),
});

export function RepositoryImportDialog({
  trigger,
}: RepositoryImportDialogProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { currentProject } = useProject();
  const {
    accountRepositories,
    refreshAccountRepositories,
    syncRepositoriesFromGitHub,
    refreshRepositories,
  } = useRepository();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      repositories: [],
    },
  });

  useEffect(() => {
    if (open) {
      refreshAccountRepositories();
      setSelectedRepos(new Set());
      form.reset();
    }
  }, [open]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      await syncRepositoriesFromGitHub();
    } catch (error) {
      console.error("Failed to sync repositories:", error);
      setError(
        error instanceof Error ? error.message : "Failed to sync repositories"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleRepository = (repoId: string) => {
    const newSelected = new Set(selectedRepos);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else {
      newSelected.add(repoId);
    }
    setSelectedRepos(newSelected);
    form.setValue("repositories", Array.from(newSelected), {
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!currentProject) {
      setError("No project selected");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await graphqlRequest(
        ADD_REPOSITORIES_TO_PROJECT,
        {
          projectId: currentProject.id,
          repositoryIds: values.repositories,
        },
      );

      await refreshRepositories();

      setOpen(false);
      form.reset();
      setSelectedRepos(new Set());
    } catch (error) {
      console.error("Failed to import repositories:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to import repositories"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const availableRepositories = accountRepositories.filter(
    (repo) => !repo.isArchived && !repo.isDisabled
  );

  const getSelectedRepositoriesText = () => {
    if (selectedRepos.size === 0) {
      return "Select repositories...";
    }
    if (selectedRepos.size === 1) {
      const repo = availableRepositories.find((r) =>
        selectedRepos.has(r.id)
      );
      return repo?.name || "1 repository selected";
    }
    return `${selectedRepos.size} repositories selected`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Import Repository</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Import Repositories</DialogTitle>
              <DialogDescription>
                Select repositories from your GitHub account to import into this
                project.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-6">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
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
                  disabled={isSyncing || isLoading}
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

              <FormField
                control={form.control}
                name="repositories"
                render={() => (
                  <FormItem>
                    <FormLabel>Select Repositories</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          className={cn(
                            "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                            selectedRepos.size === 0 && "text-muted-foreground"
                          )}
                        >
                          <span className="line-clamp-1">
                            {getSelectedRepositoriesText()}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </button>

                        {dropdownOpen && (
                          <div className="absolute z-50 mt-1 max-h-[400px] w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                            {availableRepositories.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                <p className="text-sm text-muted-foreground">
                                  No repositories found.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Click &quot;Sync from GitHub&quot; to fetch
                                  your repositories.
                                </p>
                              </div>
                            ) : (
                              <div className="p-1">
                                {availableRepositories.map(
                                  (repo: Repository) => (
                                    <button
                                      key={repo.id}
                                      type="button"
                                      onClick={() => toggleRepository(repo.id)}
                                      className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                    >
                                      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                                        {selectedRepos.has(repo.id) && (
                                          <CheckIcon className="h-4 w-4" />
                                        )}
                                      </span>
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
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select the repositories you want to import into this
                      project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedRepos.size > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedRepos.size}{" "}
                  {selectedRepos.size === 1 ? "repository" : "repositories"}{" "}
                  selected
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isLoading || selectedRepos.size === 0}
              >
                {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Import {selectedRepos.size > 0 && `(${selectedRepos.size})`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
