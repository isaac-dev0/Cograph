export enum ProjectRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  GUEST = "GUEST",
}

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface ProjectMember {
  profileId: string;
  projectId: string;
  role: ProjectRole;
  createdAt: string;
  updatedAt: string;
  profile: Profile;
}
