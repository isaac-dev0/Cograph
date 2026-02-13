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
import { graphqlRequest } from "@/lib/graphql/client";
import React, { useState, useEffect } from "react";
import {
  FIND_PROJECT_MEMBERS,
  ADD_PROJECT_MEMBERS,
  REMOVE_PROJECT_MEMBER,
  SEARCH_PROFILES,
  TRANSFER_PROJECT_OWNERSHIP,
  UPDATE_PROJECT_MEMBER_ROLE,
} from "@/lib/queries/ProjectQueries";
import { useProject } from "@/hooks/providers/ProjectProvider";
import { useUser } from "@/hooks/providers/UserProvider";
import { Input } from "@/components/ui/input";
import { Loader, Trash2, UserPlus, Settings, Crown, Search } from "lucide-react";
import { ProjectMember, Profile } from "@/lib/interfaces/project.interfaces";
import { ProjectRole } from "@/lib/enums/project.enums";
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeVariant(role: ProjectRole): "default" | "secondary" | "outline" {
  if (role === ProjectRole.OWNER) return "default";
  if (role === ProjectRole.ADMIN) return "secondary";
  return "outline";
}

export function ProjectSettingsDialog({ trigger }: ProjectSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [emailQuery, setEmailQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Profile | null | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOwnerProfileId, setSelectedOwnerProfileId] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [updatingRoleIds, setUpdatingRoleIds] = useState<Set<string>>(new Set());

  const { currentProject, refreshProjects } = useProject();
  const { profile } = useUser();

  const loadMembers = async () => {
    if (!currentProject) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await graphqlRequest<{ findProjectMembers: ProjectMember[] }>(
        FIND_PROJECT_MEMBERS,
        { projectId: currentProject.id },
      );
      setMembers(data.findProjectMembers || []);
    } catch (err) {
      console.error("Failed to load members:", err);
      setError(err instanceof Error ? err.message : "Failed to load members");
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
      const data = await graphqlRequest<{ searchProfiles: Profile | null }>(
        SEARCH_PROFILES,
        { query: trimmed },
      );
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
      await graphqlRequest(ADD_PROJECT_MEMBERS, {
        projectId: currentProject.id,
        profileIds: [searchResult.id],
      });
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
      await graphqlRequest(REMOVE_PROJECT_MEMBER, {
        projectId: currentProject.id,
        profileId,
      });
      await loadMembers();
    } catch (err) {
      console.error("Failed to remove member:", err);
      setError(err instanceof Error ? err.message : "Failed to remove member");
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
      await graphqlRequest(TRANSFER_PROJECT_OWNERSHIP, {
        projectId: currentProject.id,
        newOwnerId: selectedOwnerProfileId,
      });
      setSelectedOwnerProfileId("");
      await loadMembers();
      await refreshProjects();
    } catch (err) {
      console.error("Failed to transfer ownership:", err);
      setError(err instanceof Error ? err.message : "Failed to transfer ownership");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleUpdateMemberRole = async (profileId: string, role: ProjectRole) => {
    if (!currentProject) return;

    setUpdatingRoleIds((prev) => new Set(prev).add(profileId));
    try {
      setError(null);
      await graphqlRequest(UPDATE_PROJECT_MEMBER_ROLE, {
        projectId: currentProject.id,
        memberId: profileId,
        role,
      });
      setMembers((prev) =>
        prev.map((member) =>
          member.profileId === profileId ? { ...member, role } : member,
        ),
      );
    } catch (err) {
      console.error("Failed to update member role:", err);
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingRoleIds((prev) => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    }
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
              <TransferOwnershipSection
                members={members}
                currentOwnerId={currentProject?.ownerId ?? ""}
                isTransferring={isTransferring}
                selectedOwnerProfileId={selectedOwnerProfileId}
                onOwnerSelect={setSelectedOwnerProfileId}
                onTransfer={handleTransferOwnership}
              />
              <Separator />
            </>
          )}

          {canManageMembers && (
            <AddMemberSection
              emailQuery={emailQuery}
              isSearching={isSearching}
              isAddingMember={isAddingMember}
              searchResult={searchResult}
              onEmailChange={(value) => {
                setEmailQuery(value);
                setSearchResult(undefined);
              }}
              onSearch={searchByEmail}
              onAdd={handleAddMember}
            />
          )}

          <MembersSection
            isLoading={isLoading}
            members={members}
            canManageMembers={canManageMembers}
            currentProfileId={profile?.id ?? ""}
            updatingRoleIds={updatingRoleIds}
            onRemove={handleRemoveMember}
            onUpdateRole={handleUpdateMemberRole}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TransferOwnershipSectionProps {
  members: ProjectMember[];
  currentOwnerId: string;
  isTransferring: boolean;
  selectedOwnerProfileId: string;
  onOwnerSelect: (profileId: string) => void;
  onTransfer: () => void;
}

function TransferOwnershipSection({
  members,
  currentOwnerId,
  isTransferring,
  selectedOwnerProfileId,
  onOwnerSelect,
  onTransfer,
}: TransferOwnershipSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Transfer Ownership</h3>
      <div className="flex gap-2">
        <Select
          value={selectedOwnerProfileId}
          onValueChange={onOwnerSelect}
          disabled={isTransferring}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select new owner" />
          </SelectTrigger>
          <SelectContent>
            {members
              .filter((member) => member.profileId !== currentOwnerId)
              .map((member) => (
                <SelectItem key={member.profileId} value={member.profileId}>
                  {member.profile.displayName} ({member.profile.email})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button
          onClick={onTransfer}
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
  );
}

interface AddMemberSectionProps {
  emailQuery: string;
  isSearching: boolean;
  isAddingMember: boolean;
  searchResult: Profile | null | undefined;
  onEmailChange: (value: string) => void;
  onSearch: () => void;
  onAdd: () => void;
}

function AddMemberSection({
  emailQuery,
  isSearching,
  isAddingMember,
  searchResult,
  onEmailChange,
  onSearch,
  onAdd,
}: AddMemberSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Add Member</h3>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Search by email address"
          value={emailQuery}
          onChange={(event) => onEmailChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSearch();
          }}
          disabled={isSearching || isAddingMember}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onSearch}
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
          <Button size="sm" onClick={onAdd} disabled={isAddingMember}>
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
  );
}

interface MembersSectionProps {
  isLoading: boolean;
  members: ProjectMember[];
  canManageMembers: boolean;
  currentProfileId: string;
  updatingRoleIds: Set<string>;
  onRemove: (profileId: string) => void;
  onUpdateRole: (profileId: string, role: ProjectRole) => void;
}

function MembersSection({
  isLoading,
  members,
  canManageMembers,
  currentProfileId,
  updatingRoleIds,
  onRemove,
  onUpdateRole,
}: MembersSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Members</h3>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No members found</p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <MemberRow
              key={member.profileId}
              member={member}
              canManage={canManageMembers && member.role !== ProjectRole.OWNER && member.profileId !== currentProfileId}
              isUpdatingRole={updatingRoleIds.has(member.profileId)}
              onRemove={onRemove}
              onUpdateRole={onUpdateRole}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MemberRowProps {
  member: ProjectMember;
  canManage: boolean;
  isUpdatingRole: boolean;
  onRemove: (profileId: string) => void;
  onUpdateRole: (profileId: string, role: ProjectRole) => void;
}

function MemberRow({ member, canManage, isUpdatingRole, onRemove, onUpdateRole }: MemberRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={member.profile.avatarUrl} />
          <AvatarFallback>{getInitials(member.profile.displayName)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{member.profile.displayName}</p>
          <p className="text-xs text-muted-foreground">{member.profile.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canManage ? (
          <Select
            value={member.role}
            onValueChange={(value) => onUpdateRole(member.profileId, value as ProjectRole)}
            disabled={isUpdatingRole}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ProjectRole.ADMIN}>Admin</SelectItem>
              <SelectItem value={ProjectRole.MEMBER}>Member</SelectItem>
              <SelectItem value={ProjectRole.GUEST}>Guest</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={getRoleBadgeVariant(member.role as ProjectRole)}>
            {member.role}
          </Badge>
        )}
        {canManage && (
          <Button variant="ghost" size="sm" onClick={() => onRemove(member.profileId)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}
