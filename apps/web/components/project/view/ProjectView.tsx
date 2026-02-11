"use client";

import { Project } from "@/lib/shared/Project";
import { ProjectStatus } from "@/lib/shared/ProjectStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  FolderGit2,
  Calendar,
  Activity,
  UserPlus,
  Plus,
  ExternalLink,
  GitGraph,
  Trash2,
  MoreVertical,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FIND_PROJECT_MEMBERS,
  REMOVE_PROJECT_MEMBER,
} from "@/lib/queries/ProjectQueries";
import { FIND_REPOSITORIES_BY_PROJECT_QUERY } from "@/lib/queries/RepositoryQueries";
import Link from "next/link";
import { useRepository } from "@/hooks/providers/RepositoryProvider";
import { RepositoryImportDialog } from "@/components/repository/dialog/RepositoryImportDialog";
import { ProjectSettingsDialog } from "@/components/project/dialog/ProjectSettingsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { RepositoryImportDialog } from "@/components/repository/dialog/RepositoryImportDialog";
import { ProjectSettingsDialog } from "@/components/project/dialog/ProjectSettingsDialog";

interface ProjectViewProps {
  project: Project | null;
}

interface ProjectMember {
  profileId: string;
  projectId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  profile: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string;
  };
}

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description?: string | null;
  visibility: string;
  repositoryUrl: string;
  icon?: string | null;
  ownerLogin: string;
  ownerAvatarUrl: string;
  lastSyncedAt?: string | null;
  syncStatus: string;
  syncError?: string | null;
  isPrivate: boolean;
  githubCreatedAt: string;
  githubUpdatedAt: string;
  githubPushedAt: string;
}

export function ProjectView({ project }: ProjectViewProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [reposError, setReposError] = useState<string | null>(null);
  const { setCurrentRepository } = useRepository();

  useEffect(() => {
    if (project) {
      loadMembers();
      loadRepositories();
    }
  }, [project?.id]);

  const loadMembers = async () => {
    if (!project) return;

    try {
      setIsLoadingMembers(true);
      setMembersError(null);
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: FIND_PROJECT_MEMBERS,
            variables: { projectId: project.id },
          }),
        }
      );

      const { data, errors } = await response.json();

      if (errors) {
        // Silently treat authorisation failures as an empty member list;
        // guests may not have permission to enumerate members.
        const message: string = errors[0]?.message ?? "";
        if (!message.toLowerCase().includes("forbidden") && !message.toLowerCase().includes("unauthori")) {
          setMembersError(message || "Failed to load members");
        }
        return;
      }

      setMembers(data.findProjectMembers || []);
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Failed to load members");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadRepositories = async () => {
    if (!project) return;

    try {
      setIsLoadingRepos(true);
      setReposError(null);
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: FIND_REPOSITORIES_BY_PROJECT_QUERY,
            variables: { projectId: project.id },
          }),
        }
      );

      const { data, errors } = await response.json();

      if (errors) {
        setReposError(errors[0]?.message ?? "Failed to load repositories");
        return;
      }

      setRepositories(data.findRepositoriesByProjectId || []);
    } catch (error) {
      setReposError(error instanceof Error ? error.message : "Failed to load repositories");
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleRemoveMember = async (profileId: string) => {
    if (!project) return;

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: REMOVE_PROJECT_MEMBER,
            variables: { projectId: project.id, profileId },
          }),
        }
      );

      const { errors } = await response.json();

      if (errors) {
        console.error("Failed to remove member:", errors);
        return;
      }

      setMembers(members.filter((m) => m.profileId !== profileId));
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const handleViewRepository = (repo: Repository) => {
    const repoData = {
      ...repo,
      lastSyncedAt: repo.lastSyncedAt ? new Date(repo.lastSyncedAt) : null,
      githubCreatedAt: new Date(repo.githubCreatedAt),
      githubUpdatedAt: new Date(repo.githubUpdatedAt),
      githubPushedAt: new Date(repo.githubPushedAt),
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
      githubId: 0,
      nodeId: "",
      isArchived: false,
      isDisabled: false,
      ownerType: "",
    };
    setCurrentRepository(repoData);
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full animate-fade-in">
        <p className="text-base text-muted-foreground">No project selected</p>
      </div>
    );
  }

  const syncStatusSummary = repositories.reduce(
    (acc, repo) => {
      if (repo.syncStatus === "completed") acc.completed++;
      else if (repo.syncStatus === "failed") acc.failed++;
      else acc.pending++;
      return acc;
    },
    { completed: 0, failed: 0, pending: 0 }
  );

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return "N/A";
    try {
      const parsed = typeof date === "string" ? new Date(date) : date;
      if (isNaN(parsed.getTime())) return "Invalid date";
      return parsed.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-10 space-y-10 animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {project.name}
              </h1>
              <Badge
                variant={project.status === ProjectStatus.ACTIVE ? "default" : "secondary"}
                className="text-xs px-2.5 py-0.5"
              >
                {ProjectStatus[project.status]}
              </Badge>
            </div>
          </div>
        </div>
        {project.description && (
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
            {project.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={FolderGit2}
          label="Repositories"
          value={isLoadingRepos ? "..." : repositories.length.toString()}
        />
        <StatCard
          icon={Users}
          label="Members"
          value={isLoadingMembers ? "..." : members.length.toString()}
        />
        <StatCard
          icon={Calendar}
          label="Created"
          value={formatDate(project.createdAt)}
        />
        <StatCard
          icon={Activity}
          label="Sync Status"
          value={`${syncStatusSummary.completed}/${repositories.length}`}
          valueClass={
            syncStatusSummary.failed > 0
              ? "text-red-400"
              : syncStatusSummary.completed === repositories.length &&
                  repositories.length > 0
                ? "text-emerald-400"
                : "text-yellow-400"
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <RepositoryImportDialog
          trigger={
            <button className="group flex items-center gap-5 p-6 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-accent/30 transition-all text-left w-full">
              <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <Plus className="size-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold">Add Repositories</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect GitHub repositories to this project
                </p>
              </div>
            </button>
          }
        />

        <ProjectSettingsDialog
          trigger={
            <button className="group flex items-center gap-5 p-6 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-accent/30 transition-all text-left w-full">
              <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <UserPlus className="size-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold">Manage Members</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add or remove team members from this project
                </p>
              </div>
            </button>
          }
        />
      </div>

      <div className="space-y-5">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Team Members
        </h2>
        {isLoadingMembers ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : membersError ? (
          <ErrorBanner message={membersError} onRetry={loadMembers} />
        ) : members.length === 0 ? (
          <Empty className="border border-border/50 bg-card/50">
            <EmptyContent>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No members yet</EmptyTitle>
              <EmptyDescription>
                Invite teammates to collaborate on this project.
              </EmptyDescription>
              <ProjectSettingsDialog
                trigger={
                  <Button size="sm" className="gap-2 mt-2">
                    <UserPlus className="size-4" />
                    Invite Members
                  </Button>
                }
              />
            </EmptyContent>
          </Empty>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
            <div className="divide-y divide-border/50">
              {members.map((member) => (
                <MemberRow
                  key={member.profileId}
                  member={member}
                  onRemove={handleRemoveMember}
                  isOwner={member.profileId === project.ownerId}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Repositories
        </h2>
        {isLoadingRepos ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : reposError ? (
          <ErrorBanner message={reposError} onRetry={loadRepositories} />
        ) : repositories.length === 0 ? (
          <Empty className="border border-border/50 bg-card/50">
            <EmptyContent>
              <EmptyMedia variant="icon">
                <FolderGit2 />
              </EmptyMedia>
              <EmptyTitle>No repositories yet</EmptyTitle>
              <EmptyDescription>
                Connect a GitHub repository to start mapping its dependency graph.
              </EmptyDescription>
              <RepositoryImportDialog
                trigger={
                  <Button size="sm" className="gap-2 mt-2">
                    <Plus className="size-4" />
                    Add your first repository
                  </Button>
                }
              />
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-3">
            {repositories.map((repo) => (
              <RepositoryRow
                key={repo.id}
                repository={repo}
                onView={() => handleViewRepository(repo)}
                projectId={project.id}
                onRemove={loadRepositories}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 flex items-center gap-3">
      <AlertCircle className="size-4 text-destructive shrink-0" />
      <p className="text-sm text-destructive flex-1 min-w-0 truncate">{message}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
      >
        <RefreshCw className="size-3.5" />
        Retry
      </Button>
    </div>
  );
}

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
    <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
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

function MemberRow({
  member,
  onRemove,
  isOwner,
}: {
  member: ProjectMember;
  onRemove: (profileId: string) => void;
  isOwner: boolean;
}) {
  const getRoleBadgeVariant = (role: string) => {
    if (role === "OWNER") return "default";
    if (role === "ADMIN") return "secondary";
    return "outline";
  };

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors">
      <img
        src={member.profile.avatarUrl}
        alt={member.profile.displayName}
        className="size-10 rounded-full ring-2 ring-border/50"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{member.profile.displayName}</p>
        <p className="text-xs text-muted-foreground">{member.profile.email}</p>
      </div>
      <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
        {member.role}
      </Badge>
      {!isOwner && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onRemove(member.profileId)}
              className="text-red-600"
            >
              <Trash2 className="size-4 mr-2" />
              Remove Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function RepositoryRow({
  repository,
  onView,
  projectId,
  onRemove,
}: {
  repository: Repository;
  onView: () => void;
  projectId: string;
  onRemove: () => void;
}) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemoveFromProject = async () => {
    setIsRemoving(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: `
              mutation RemoveRepositoryFromProject($projectId: ID!, $repositoryId: ID!) {
                removeRepositoryFromProject(projectId: $projectId, repositoryId: $repositoryId)
              }
            `,
            variables: { projectId, repositoryId: repository.id },
          }),
        }
      );

      const { errors } = await response.json();

      if (errors) {
        console.error("Failed to remove repository:", errors);
        return;
      }

      onRemove();
    } catch (error) {
      console.error("Failed to remove repository:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  const getSyncIcon = () => {
    if (repository.syncStatus === "completed")
      return <CheckCircle2 className="size-4 text-emerald-400" />;
    if (repository.syncStatus === "failed")
      return <XCircle className="size-4 text-red-400" />;
    return <Clock className="size-4 text-yellow-400" />;
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 hover:bg-accent/30 transition-colors">
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
            {getSyncIcon()}
          </div>
          {repository.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {repository.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{repository.ownerLogin}</span>
            <span>•</span>
            <span>
              Updated{" "}
              {new Date(repository.githubUpdatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/app/graph">
            <Button variant="ghost" size="icon" className="size-8">
              <GitGraph className="size-4" />
            </Button>
          </Link>
          <a
            href={repository.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon" className="size-8">
              <ExternalLink className="size-4" />
            </Button>
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleRemoveFromProject}
                disabled={isRemoving}
                className="text-red-600"
              >
                <Trash2 className="size-4 mr-2" />
                Remove from Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
