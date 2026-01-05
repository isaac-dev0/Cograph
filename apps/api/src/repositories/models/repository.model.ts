import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { SyncStatus } from '@prisma/client';
import { RepositorySyncHistory } from './repository-sync-history.model';

registerEnumType(SyncStatus, {
  name: 'SyncStatus',
  description: 'Specifies the status of a sync operation',
});

@ObjectType({
  description: 'A repository that contains files from Github.',
})
export class Repository {
  @Field(() => ID, { description: 'Unique identifier of the repository.' })
  id: string;

  @Field(() => Int, {
    description: 'Unique identifier of the Github repository.',
  })
  githubId: number;

  @Field(() => String, { description: 'Unique identifier of the node.' })
  nodeId: string;

  @Field(() => String, { description: 'Name of the repository.' })
  name: string;

  @Field(() => String, {
    description: 'Full name of the repository with organisation or user slug.',
  })
  fullName: string;

  @Field(() => String, {
    nullable: true,
    description: 'Description of the repository',
  })
  description?: string | null;

  @Field(() => String, {
    defaultValue: 'public',
    description: 'Visibility of the Github repository',
  })
  visibility: string;

  @Field(() => String, { description: 'URL of the Github repository' })
  repositoryUrl: string;

  @Field(() => String, {
    nullable: true,
    description: 'Icon/logo URL for the repository.',
  })
  icon?: string | null;

  @Field(() => String, { description: 'Login of the repository owner.' })
  ownerLogin: string;

  @Field(() => String, {
    description: 'Type of the owner such as organisation or user.',
  })
  ownerType: string;

  @Field(() => String, {
    description: 'Avatar URL for the owner of the repository.',
  })
  ownerAvatarUrl: string;

  @Field(() => Date, {
    nullable: true,
    description: 'Date when the repository was last synced.',
  })
  lastSyncedAt?: Date | null;

  @Field(() => SyncStatus, {
    description:
      'Status of the repository sync, e.g., PENDING, SYNCING, SYNCED, FAILED',
  })
  syncStatus: SyncStatus;

  @Field(() => String, {
    nullable: true,
    description: 'Error encountered from syncing.',
  })
  syncError?: string | null;

  @Field(() => Boolean, {
    defaultValue: false,
    description: 'Is the repository currently archived?',
  })
  isArchived: boolean;

  @Field(() => Boolean, {
    defaultValue: false,
    description: 'Is the repository currently disabled?',
  })
  isDisabled: boolean;

  @Field(() => Boolean, {
    description: 'Is the repository public or private?',
  })
  isPrivate: boolean;

  @Field(() => Date, {
    description: 'Github timestamp of when the repository was created.',
  })
  githubCreatedAt: Date;

  @Field(() => Date, {
    description: 'Github timestamp of the last update to the repository.',
  })
  githubUpdatedAt: Date;

  @Field(() => Date, {
    description: 'Timestamp of when the repository was previously pushed to.',
  })
  githubPushedAt: Date;

  @Field(() => Date, {
    description: 'Timestamp of when the repository was created.',
  })
  createdAt: Date;

  @Field(() => Date, {
    description: 'Timestamp of the last update to the repository.',
  })
  updatedAt: Date;

  @Field(() => Date, {
    description: 'Timestamp of when the repository was archived.',
    nullable: true,
  })
  archivedAt?: Date | null;

  @Field(() => [RepositorySyncHistory], { nullable: true })
  syncHistory?: RepositorySyncHistory[];
}
