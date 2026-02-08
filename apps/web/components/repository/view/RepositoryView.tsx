"use client";

import { Repository } from "@/lib/shared/Repository";
import { Badge } from "@/components/ui/badge";
import {
  GitGraph,
  ExternalLink,
  Calendar,
  ArrowRight,
  User,
  Clock,
  Shield,
  Activity,
} from "lucide-react";
import Link from "next/link";

interface RepositoryViewProps {
  repository: Repository | null;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

export function RepositoryView({ repository }: RepositoryViewProps) {
  if (!repository) {
    return (
      <div className="flex items-center justify-center h-full animate-fade-in">
        <p className="text-base text-muted-foreground">No repository selected</p>
      </div>
    );
  }

  const syncColor =
    repository.syncStatus === "completed"
      ? "text-emerald-400"
      : repository.syncStatus === "failed"
        ? "text-red-400"
        : "text-yellow-400";

  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-10 animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <img
            src={repository.ownerAvatarUrl}
            alt={repository.ownerLogin}
            className="size-12 rounded-full ring-2 ring-border/50"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{repository.name}</h1>
              <Badge
                variant={repository.isPrivate ? "secondary" : "outline"}
                className="text-xs px-2.5 py-0.5"
              >
                {repository.visibility}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {repository.ownerLogin}
            </p>
          </div>
        </div>
        {repository.description && (
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
            {repository.description}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Sync Status"
          value={repository.syncStatus}
          valueClass={syncColor}
        />
        <StatCard
          icon={Clock}
          label="Last Push"
          value={timeAgo(repository.githubPushedAt)}
        />
        <StatCard
          icon={User}
          label="Owner"
          value={repository.ownerLogin}
        />
        <StatCard
          icon={Shield}
          label="Visibility"
          value={repository.isPrivate ? "Private" : "Public"}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/app/graph"
          className="group flex items-center gap-5 p-6 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-accent/30 transition-all"
        >
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
            <GitGraph className="size-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold">Dependency Graph</p>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize file relationships and codebase structure
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>

        <a
          href={repository.repositoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-5 p-6 rounded-xl border border-border/50 hover:border-border hover:bg-accent/30 transition-all"
        >
          <div className="flex size-14 items-center justify-center rounded-xl bg-muted group-hover:bg-muted/80 transition-colors">
            <ExternalLink className="size-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold">View on GitHub</p>
            <p className="text-sm text-muted-foreground mt-1">
              Browse source code and repository details
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </a>
      </div>
      <div className="space-y-5">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Timeline
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <TimelineItem
            icon={Calendar}
            label="Created"
            date={formatDate(repository.githubCreatedAt)}
            relative={timeAgo(repository.githubCreatedAt)}
          />
          <TimelineItem
            icon={Calendar}
            label="Last Updated"
            date={formatDate(repository.githubUpdatedAt)}
            relative={timeAgo(repository.githubUpdatedAt)}
          />
          {repository.lastSyncedAt && (
            <TimelineItem
              icon={Activity}
              label="Last Synced"
              date={formatDate(repository.lastSyncedAt)}
              relative={timeAgo(repository.lastSyncedAt)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  valueClass = "",
}: {
  icon: any;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-lg font-semibold capitalize ${valueClass}`}>{value}</p>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  label,
  date,
  relative,
}: {
  icon: any;
  label: string;
  date: string;
  relative: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border/50 bg-card/50 p-5">
      <div className="flex size-10 items-center justify-center rounded-lg bg-muted shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-sm font-semibold mt-1">{date}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{relative}</p>
      </div>
    </div>
  );
}
