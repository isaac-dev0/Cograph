import { ProjectStatus } from "./ProjectStatus";

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
