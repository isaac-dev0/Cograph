import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Repository } from './repository.model';

@ObjectType({
  description: 'History of sync operations performed on a repository.',
})
export class RepositorySyncHistory {
  @Field(() => ID, {
    description: 'Unique identifier of the sync history record.',
  })
  id: string;

  @Field(() => String, {
    description: 'ID of the repository this sync history entry belongs to.',
  })
  repositoryId: string;

  @Field(() => Repository, {
    description: 'The repository associated with this sync event.',
  })
  repository: Repository;

  @Field(() => Date, {
    description: 'Timestamp when the sync process started.',
  })
  syncStartedAt: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'Timestamp when the sync process finished.',
  })
  syncCompletedAt?: Date;

  @Field(() => String, {
    description: 'Status of the sync process (e.g., PENDING, SUCCESS, FAILED).',
  })
  status: string;

  @Field(() => String, {
    nullable: true,
    description: 'Error message from the sync process, if any.',
  })
  error?: string;

  @Field(() => Int, {
    description: 'Number of files processed during the sync.',
  })
  filesProcessed: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Duration of the sync in milliseconds.',
  })
  duration?: number;

  @Field(() => Date, {
    description: 'Timestamp when this sync history record was created.',
  })
  createdAt: Date;
}