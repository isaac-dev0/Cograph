import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { SupabaseJwtGuard } from 'src/auth/supabase-jwt.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { AnalysisService } from './analysis.service';
import { RepositoryFileService } from 'src/repositories/repository-file.service';
import { AnnotationsService } from 'src/repositories/annotations.service';
import { AnalysisJob } from './models/analysis-job.model';
import { RepositoryFile } from './models/repository-file.model';
import { FileAnnotation } from './models/file-annotation.model';
import { CreateAnnotationInput, UpdateAnnotationInput } from './dto/annotation-inputs';
import { Profile as ProfileModel } from 'src/profiles/models/profile.model';

@UseGuards(SupabaseJwtGuard)
@Resolver(() => RepositoryFile)
export class AnalysisResolver {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly repositoryFileService: RepositoryFileService,
    private readonly annotationsService: AnnotationsService,
  ) {}

  @Mutation(() => AnalysisJob, {
    name: 'analyseRepository',
    description: 'Triggers analysis of a repository. Returns the created analysis job.',
  })
  async analyseRepository(
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
  ): Promise<AnalysisJob> {
    const { jobId } = await this.analysisService.startAnalysis(repositoryId);
    return this.analysisService.getAnalysisJob(jobId);
  }

  @Query(() => AnalysisJob, {
    name: 'analysisJob',
    description: 'Retrieves an analysis job by its ID.',
  })
  async analysisJob(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<AnalysisJob> {
    return this.analysisService.getAnalysisJob(id);
  }

  @Query(() => [RepositoryFile], {
    name: 'repositoryFiles',
    description: 'Retrieves all files for a repository, sorted alphabetically by path.',
  })
  async repositoryFiles(
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
  ): Promise<RepositoryFile[]> {
    return this.repositoryFileService.findByRepositoryId(repositoryId);
  }

  @Query(() => RepositoryFile, {
    name: 'repositoryFile',
    description: 'Retrieves a single repository file by its ID, including code entities.',
  })
  async repositoryFile(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<RepositoryFile> {
    return this.repositoryFileService.findById(id);
  }

  @Query(() => String, {
    name: 'fileContent',
    description: 'Fetches the raw content of a file from GitHub.',
  })
  async fileContent(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<string> {
    return this.repositoryFileService.getFileContent(id);
  }

  @Mutation(() => RepositoryFile, {
    name: 'updateFileAnnotation',
    description: 'Updates the user annotation for a repository file.',
  })
  async updateFileAnnotation(
    @Args('id', { type: () => ID }) id: string,
    @Args('annotation', { type: () => String }) annotation: string,
  ): Promise<RepositoryFile> {
    return this.repositoryFileService.updateAnnotation(id, annotation);
  }

  @Mutation(() => RepositoryFile, {
    name: 'updateFileSummary',
    description: 'Updates the Claude summary for a repository file.',
  })
  async updateFileSummary(
    @Args('id', { type: () => ID}) id: string,
    @Args('summary', { type: () => String }) summary: string,
  ): Promise<RepositoryFile> {
    return this.repositoryFileService.updateSummary(id, summary);
  }

  @Mutation(() => FileAnnotation, {
    name: 'createAnnotation',
    description: 'Creates a new annotation on a repository file.',
  })
  async createAnnotation(
    @Args('fileId', { type: () => ID }) fileId: string,
    @Args('input', { type: () => CreateAnnotationInput }) input: CreateAnnotationInput,
    @CurrentUser() profile: ProfileModel,
  ): Promise<FileAnnotation> {
    return this.annotationsService.createAnnotation(
      fileId,
      input,
      { id: profile.id, name: profile.displayName },
    );
  }

  @Mutation(() => FileAnnotation, {
    name: 'updateAnnotation',
    description: 'Updates an existing annotation. Only the author can update it.',
  })
  async updateAnnotation(
    @Args('fileId', { type: () => ID }) fileId: string,
    @Args('annotationId', { type: () => ID }) annotationId: string,
    @Args('input', { type: () => UpdateAnnotationInput }) input: UpdateAnnotationInput,
    @CurrentUser() profile: ProfileModel,
  ): Promise<FileAnnotation> {
    return this.annotationsService.updateAnnotation(
      fileId,
      annotationId,
      input,
      profile.id,
    );
  }

  @Mutation(() => Boolean, {
    name: 'deleteAnnotation',
    description: 'Deletes an annotation. Only the author can delete it.',
  })
  async deleteAnnotation(
    @Args('fileId', { type: () => ID }) fileId: string,
    @Args('annotationId', { type: () => ID }) annotationId: string,
    @CurrentUser() profile: ProfileModel,
  ): Promise<boolean> {
    return this.annotationsService.deleteAnnotation(fileId, annotationId, profile.id);
  }

  @ResolveField(() => [FileAnnotation], { nullable: true })
  async annotations(@Parent() file: RepositoryFile): Promise<FileAnnotation[]> {
    return this.annotationsService.getAnnotations(file.id);
  }
}
