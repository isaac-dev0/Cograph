import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, unknown>;
  }>;
}

export class GraphQLClient {
  constructor(
    private app: INestApplication,
    private authToken?: string,
  ) {}

  async mutation<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<GraphQLResponse<T>> {
    const req = request(this.app.getHttpServer())
      .post('/graphql')
      .send({ query, variables });

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    const response = await req;
    return response.body;
  }

  async query<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<GraphQLResponse<T>> {
    return this.mutation<T>(query, variables);
  }
}

export const ANALYSE_REPOSITORY_MUTATION = `
  mutation AnalyseRepository($repositoryId: ID!) {
    analyseRepository(repositoryId: $repositoryId) {
      id
      repositoryId
      status
      progress
      filesAnalysed
      totalFiles
      errorMessage
      errorDetails
      startedAt
      completedAt
      createdAt
      updatedAt
    }
  }
`;

export const GET_ANALYSIS_JOB_QUERY = `
  query GetAnalysisJob($id: ID!) {
    analysisJob(id: $id) {
      id
      repositoryId
      status
      progress
      filesAnalysed
      totalFiles
      errorMessage
      errorDetails
      startedAt
      completedAt
      createdAt
      updatedAt
    }
  }
`;

export const GET_REPOSITORY_FILES_QUERY = `
  query GetRepositoryFiles($repositoryId: ID!) {
    repositoryFiles(repositoryId: $repositoryId) {
      id
      repositoryId
      filePath
      fileName
      fileType
      linesOfCode
      neo4jNodeId
      annotations
      claudeSummary
      createdAt
      updatedAt
      codeEntities {
        id
        repositoryFileId
        name
        type
        startLine
        endLine
        annotations
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_REPOSITORY_FILE_QUERY = `
  query GetRepositoryFile($id: ID!) {
    repositoryFile(id: $id) {
      id
      repositoryId
      filePath
      fileName
      fileType
      linesOfCode
      neo4jNodeId
      annotations
      claudeSummary
      createdAt
      updatedAt
      codeEntities {
        id
        repositoryFileId
        name
        type
        startLine
        endLine
        annotations
        createdAt
        updatedAt
      }
    }
  }
`;
