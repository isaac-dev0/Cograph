"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import React, { useState, useEffect } from "react";
import {
  FIND_PROJECT_MEMBERS,
  ADD_PROJECT_MEMBERS,
  REMOVE_PROJECT_MEMBER,
  SEARCH_PROFILES,
  TRANSFER_PROJECT_OWNERSHIP,
} from "@/lib/queries/ProjectQueries";
import { useProject } from "@/hooks/providers/ProjectProvider";
import { useUser } from "@/hooks/providers/UserProvider";
import { Input } from "@/components/ui/input";
import { Loader, Trash2, UserPlus, Settings, Crown, Search } from "lucide-react";
import { ProjectMember, ProjectRole, Profile } from "@/lib/shared/ProjectMember";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface ProjectSettingsDialogProps {
  trigger?: React.ReactNode;
}

export function ProjectSettingsDialog({ trigger }: ProjectSettingsDialogProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [emailQuery, setEmailQuery] = useState<string>("");
  const [searchResult, setSearchResult] = useState<Profile | null | undefined>(undefined);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedOwnerProfileId, setSelectedOwnerProfileId] = useState<string>("");
  const [isAddingMember, setIsAddingMember] = useState<boolean>(false);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  const { currentProject, refreshProjects } = useProject();
  const { profile } = useUser();

  const loadMembers = async () => {
    if (!currentProject) return;

    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

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
            variables: { projectId: currentProject.id },
          }),
        }
      );

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0]?.message || "Failed to load members");
      }

      setMembers(data.findProjectMembers || []);
    } catch (error) {
      console.error("Failed to load members:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load members"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const searchByEmail = async () => {
    const trimmed = emailQuery.trim().toLowerCase();
    if (!trimmed) return;

    try {
      setIsSearching(true);
      setSearchResult(undefined);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("No active session");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: SEARCH_PROFILES,
            variables: { query: trimmed },
          }),
        }
      );

      const { data, errors } = await response.json();

      if (errors) throw new Error(errors[0]?.message || "Search failed");

      setSearchResult(data.searchProfiles ?? null);
    } catch (err) {
      console.error("Profile search failed:", err);
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (open && currentProject) {
      loadMembers();
    }
  }, [open, currentProject?.id]);

  const handleAddMember = async () => {
    if (!currentProject || !searchResult) return;

    const alreadyMember = members.some((member) => member.profileId === searchResult.id);
    if (alreadyMember) {
      setError("This user is already a member of the project");
      return;
    }

    try {
      setIsAddingMember(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("No active session");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: ADD_PROJECT_MEMBERS,
            variables: {
              projectId: currentProject.id,
              profileIds: [searchResult.id],
            },
          }),
        }
      );

      const { errors } = await response.json();

      if (errors) throw new Error(errors[0]?.message || "Failed to add member");

      setEmailQuery("");
      setSearchResult(undefined);
      await loadMembers();
    } catch (err) {
      console.error("Failed to add member:", err);
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (profileId: string) => {
    if (!currentProject) return;

    if (profileId === profile?.id) {
      setError("You cannot remove yourself from the project");
      return;
    }

    try {
      setError(null);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

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
            variables: {
              projectId: currentProject.id,
              profileId,
            },
          }),
        }
      );

      const { errors } = await response.json();

      if (errors) {
        throw new Error(errors[0]?.message || "Failed to remove member");
      }

      await loadMembers();
    } catch (error) {
      console.error("Failed to remove member:", error);
      setError(
        error instanceof Error ? error.message : "Failed to remove member"
      );
    }
  };

  const handleTransferOwnership = async () => {
    if (!currentProject || !selectedOwnerProfileId) return;

    if (selectedOwnerProfileId === currentProject.ownerId) {
      setError("This user is already the owner");
      return;
    }

    try {
      setIsTransferring(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: TRANSFER_PROJECT_OWNERSHIP,
            variables: {
              projectId: currentProject.id,
              newOwnerId: selectedOwnerProfileId,
            },
          }),
        }
      );

      const { errors } = await response.json();

      if (errors) {
        throw new Error(errors[0]?.message || "Failed to transfer ownership");
      }

      setSelectedOwnerProfileId("");
      await loadMembers();
      await refreshProjects();
    } catch (error) {
      console.error("Failed to transfer ownership:", error);
      setError(
        error instanceof Error ? error.message : "Failed to transfer ownership"
      );
    } finally {
      setIsTransferring(false);
    }
  };

  const getRoleBadgeVariant = (role: ProjectRole) => {
    switch (role) {
      case ProjectRole.OWNER:
        return "default";
      case ProjectRole.ADMIN:
        return "secondary";
      default:
        return "outline";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const currentUserMember = members.find((member) => member.profileId === profile?.id);
  const isCurrentUserOwner = currentProject?.ownerId === profile?.id;
  const isCurrentUserAdmin = currentUserMember?.role === ProjectRole.ADMIN;
  const canManageMembers = isCurrentUserOwner || isCurrentUserAdmin;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Manage members and ownership for {currentProject?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isCurrentUserOwner && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Transfer Ownership</h3>
                <div className="flex gap-2">
                  <Select
                    value={selectedOwnerProfileId}
                    onValueChange={setSelectedOwnerProfileId}
                    disabled={isTransferring}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select new owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {members
                        .filter((m) => m.profileId !== currentProject?.ownerId)
                        .map((member) => (
                          <SelectItem key={member.profileId} value={member.profileId}>
                            {member.profile.displayName} ({member.profile.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleTransferOwnership}
                    disabled={isTransferring || !selectedOwnerProfileId}
                    size="sm"
                    variant="destructive"
                  >
                    {isTransferring ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crown className="h-4 w-4" />
                    )}
                    Transfer
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Transfer project ownership to another member. This action cannot be undone.
                </p>
              </div>

              <Separator />
            </>
          )}

          {canManageMembers && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Add Member</h3>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Search by email address"
                  value={emailQuery}
                  onChange={(e) => {
                    setEmailQuery(e.target.value);
                    setSearchResult(undefined);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") searchByEmail();
                  }}
                  disabled={isSearching || isAddingMember}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={searchByEmail}
                  disabled={isSearching || !emailQuery.trim()}
                >
                  {isSearching ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {searchResult === null && (
                <p className="text-xs text-muted-foreground">
                  No user found with that email address.
                </p>
              )}

              {searchResult && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={searchResult.avatarUrl} />
                      <AvatarFallback>{getInitials(searchResult.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{searchResult.displayName}</p>
                      <p className="text-xs text-muted-foreground">{searchResult.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddMember}
                    disabled={isAddingMember}
                  >
                    {isAddingMember ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Members</h3>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No members found
              </p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.profileId}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profile.avatarUrl} />
                        <AvatarFallback>
                          {getInitials(member.profile.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.profile.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.profile.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                      {canManageMembers &&
                        member.role !== ProjectRole.OWNER &&
                        member.profileId !== profile?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.profileId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
