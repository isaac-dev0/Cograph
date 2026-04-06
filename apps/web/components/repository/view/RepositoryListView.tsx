"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FolderGit2,
  Activity,
  GitGraph,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRepository } from "@/hooks/providers/RepositoryProvider";
import { RepositoryImportDialog } from "@/components/repository/dialog/RepositoryImportDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Repository } from "@/lib/interfaces/repository.interfaces";

export function RepositoryListView() {
  const { repositories, setCurrentRepository, isLoading } = useRepository();

  const syncStatusSummary = repositories.reduce(
    (acc, repo) => {
      if (repo.syncStatus === "completed") acc.completed++;
      else if (repo.syncStatus === "failed") acc.failed++;
      else acc.pending++;
      return acc;
    },
    { completed: 0, failed: 0, pending: 0 },
  );

  const handleViewRepository = (repo: Repository) => {
    setCurrentRepository(repo);
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-10 space-y-10 animate-fade-in">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          Select a repository to explore its dependency graph and codebase
          structure.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          icon={FolderGit2}
          label="Repositories"
          value={isLoading ? "..." : repositories.length.toString()}
        />
        <StatCard
          icon={Activity}
          label="Synced"
          value={`${syncStatusSummary.completed}/${repositories.length}`}
          valueClass={
            syncStatusSummary.failed > 0
              ? "text-error-foreground"
              : syncStatusSummary.completed === repositories.length &&
                  repositories.length > 0
                ? "text-success-foreground"
                : "text-warning-foreground"
          }
        />
        <RepositoryImportDialog
          trigger={
            <button className="group flex flex-col justify-center items-center gap-2 rounded-xl border border-dashed border-border/50 hover:border-primary/40 hover:bg-accent/30 transition-all p-5">
              <FolderGit2 className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground group-hover:text-primary transition-colors">
                Sync from GitHub
              </span>
            </button>
          }
        />
      </div>

      <div className="space-y-5">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          All Repositories
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : repositories.length === 0 ? (
          <Empty className="border border-border/50 bg-card">
            <EmptyContent>
              <EmptyMedia variant="icon">
                <FolderGit2 />
              </EmptyMedia>
              <EmptyTitle>No repositories yet</EmptyTitle>
              <EmptyDescription>
                Sync your GitHub repositories to start mapping dependency graphs.
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-3">
            {repositories
              .filter((repo) => !repo.isArchived)
              .map((repo) => (
                <RepositoryRow
                  key={repo.id}
                  repository={repo}
                  onView={() => handleViewRepository(repo)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────

function StatCard({
  icon: Icon,
  label,
  value,
  valueClass = "",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <p className={`text-lg font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function RepositoryRow({
  repository,
  onView,
}: {
  repository: Repository;
  onView: () => void;
}) {
  const getSyncIcon = () => {
    if (repository.syncStatus === "completed")
      return <CheckCircle2 className="size-4 text-success-foreground" aria-hidden="true" />;
    if (repository.syncStatus === "failed")
      return <XCircle className="size-4 text-error-foreground" aria-hidden="true" />;
    return <Clock className="size-4 text-warning-foreground" aria-hidden="true" />;
  };

  const syncLabel =
    repository.syncStatus === "completed" ? "Synced" :
    repository.syncStatus === "failed" ? "Sync failed" : "Sync pending";

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 hover:bg-accent/30 transition-colors">
      <div className="flex items-start gap-4">
        <img
          src={repository.ownerAvatarUrl}
          alt={repository.ownerLogin}
          className="size-10 rounded-full ring-2 ring-border/50 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={onView}
              className="text-base font-semibold hover:text-primary transition-colors"
            >
              {repository.name}
            </button>
            <Badge
              variant={repository.isPrivate ? "secondary" : "outline"}
              className="text-xs"
            >
              {repository.visibility}
            </Badge>
            <span className="inline-flex items-center gap-1" title={syncLabel}>
              {getSyncIcon()}
              <span className="sr-only">{syncLabel}</span>
            </span>
          </div>
          {repository.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {repository.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{repository.ownerLogin}</span>
            <span>Updated {new Date(repository.githubUpdatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link href="/app/graph">
            <Button
              variant="ghost"
              size="icon"
              onClick={onView}
              aria-label={`View dependency graph for ${repository.name}`}
            >
              <GitGraph className="size-4" />
            </Button>
          </Link>
          <a
            href={repository.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon" aria-label={`Open ${repository.name} on GitHub`}>
              <ExternalLink className="size-4" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
