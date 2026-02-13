import { ProjectRole, ProjectStatus } from "@/lib/enums/project.enums";

/** Core project entity. */
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  icon?: string;
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

/** Trimmed profile shape used within the project member context. */
export interface Profile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

/** A user's membership record within a project. */
export interface ProjectMember {
  profileId: string;
  projectId: string;
  role: ProjectRole;
  createdAt: string;
  updatedAt: string;
  profile: Profile;
}
