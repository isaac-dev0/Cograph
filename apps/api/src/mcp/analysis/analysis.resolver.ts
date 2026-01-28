import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SupabaseJwtGuard } from 'src/auth/supabase-jwt.guard';
import { AnalysisService } from './analysis.service';
import { RepositoryFileService } from 'src/repositories/repository-file.service';
import { AnalysisJob } from './models/analysis-job.model';
import { RepositoryFile } from './models/repository-file.model';

@UseGuards(SupabaseJwtGuard)
@Resolver()
export class AnalysisResolver {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly repositoryFileService: RepositoryFileService,
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
    @Args('id', { type: () => ID }) id: string,
    @Args('summary', { type: () => String }) summary: string,
  ): Promise<RepositoryFile> {
    return this.repositoryFileService.updateSummary(id, summary);
  }
}
