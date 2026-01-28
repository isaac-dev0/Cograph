import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AnalysisStatus } from '@prisma/client';

registerEnumType(AnalysisStatus, {
  name: 'AnalysisStatus',
  description: 'Status of a repository analysis job.',
});

@ObjectType({
  description: 'An analysis job for processing a repository.',
})
export class AnalysisJob {
  @Field(() => ID, { description: 'Unique identifier of the analysis job.' })
  id: string;

  @Field(() => ID, { description: 'ID of the repository being analysed.' })
  repositoryId: string;

  @Field(() => AnalysisStatus, { description: 'Current status of the analysis job.' })
  status: AnalysisStatus;

  @Field(() => Float, { description: 'Progress percentage of the analysis (0-100).' })
  progress: number;

  @Field(() => Int, { description: 'Number of files that have been analysed.' })
  filesAnalysed: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Total number of files to be analysed.',
  })
  totalFiles?: number | null;

  @Field(() => String, {
    nullable: true,
    description: 'Error message if the analysis failed.',
  })
  errorMessage?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Detailed error information if the analysis failed.',
  })
  errorDetails?: string | null;

  @Field(() => Date, {
    nullable: true,
    description: 'Timestamp when the analysis started.',
  })
  startedAt?: Date | null;

  @Field(() => Date, {
    nullable: true,
    description: 'Timestamp when the analysis completed.',
  })
  completedAt?: Date | null;

  @Field(() => Date, { description: 'Timestamp when the job was created.' })
  createdAt: Date;

  @Field(() => Date, { description: 'Timestamp when the job was last updated.' })
  updatedAt: Date;
}
