import { InputType } from '@nestjs/graphql';
import { SyncStatus } from '@prisma/client';

@InputType()
export class ImportRepositoryInput {
  githubId: number;
  nodeId: string;
  name: string;
  fullName: string;
  description?: string | null;
  visibility: string;
  repositoryUrl: string;
  icon?: string | null;
  ownerLogin: string;
  ownerType: string;
  ownerAvatarUrl: string;
  lastSyncedAt?: Date | null;
  syncStatus?: SyncStatus;
  syncError?: string | null;
  isArchived: boolean;
  isDisabled: boolean;
  isPrivate: boolean;
  githubCreatedAt: Date;
  githubUpdatedAt: Date;
  githubPushedAt: Date;
  archivedAt?: Date | null;
}
