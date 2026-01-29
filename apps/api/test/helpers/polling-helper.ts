import { GraphQLClient, GET_ANALYSIS_JOB_QUERY } from './graphql-client';

export type AnalysisStatus = 'PENDING' | 'CLONING' | 'ANALYSING' | 'COMPLETED' | 'FAILED';

export interface AnalysisJobResult {
  id: string;
  repositoryId: string;
  status: AnalysisStatus;
  progress: number;
  filesAnalysed: number;
  totalFiles: number | null;
  errorMessage: string | null;
  errorDetails: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PollOptions {
  maxWaitMs?: number;
  intervalMs?: number;
  onProgress?: (job: AnalysisJobResult) => void;
}

const TERMINAL_STATUSES: AnalysisStatus[] = ['COMPLETED', 'FAILED'];

export async function pollUntilComplete(
  client: GraphQLClient,
  jobId: string,
  options: PollOptions = {},
): Promise<AnalysisJobResult> {
  const { maxWaitMs = 300000, intervalMs = 2000, onProgress } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await client.query<{ analysisJob: AnalysisJobResult }>(
      GET_ANALYSIS_JOB_QUERY,
      { id: jobId },
    );

    if (response.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(response.errors)}`);
    }

    const job = response.data.analysisJob;

    if (onProgress) {
      onProgress(job);
    }

    if (TERMINAL_STATUSES.includes(job.status)) {
      return job;
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timeout waiting for job ${jobId} to complete after ${maxWaitMs}ms`);
}

export interface PollWithStatusResult {
  job: AnalysisJobResult;
  statusHistory: AnalysisStatus[];
}

export async function pollAndTrackStatuses(
  client: GraphQLClient,
  jobId: string,
  options: PollOptions = {},
): Promise<PollWithStatusResult> {
  const statusHistory: AnalysisStatus[] = [];
  let lastStatus: AnalysisStatus | null = null;

  const job = await pollUntilComplete(client, jobId, {
    ...options,
    onProgress: (j) => {
      if (j.status !== lastStatus) {
        statusHistory.push(j.status);
        lastStatus = j.status;
      }
      if (options.onProgress) {
        options.onProgress(j);
      }
    },
  });

  return { job, statusHistory };
}

export async function waitForStatus(
  client: GraphQLClient,
  jobId: string,
  targetStatus: AnalysisStatus,
  maxWaitMs: number = 60000,
  intervalMs: number = 1000,
): Promise<AnalysisJobResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await client.query<{ analysisJob: AnalysisJobResult }>(
      GET_ANALYSIS_JOB_QUERY,
      { id: jobId },
    );

    if (response.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(response.errors)}`);
    }

    const job = response.data.analysisJob;

    if (job.status === targetStatus) {
      return job;
    }

    if (TERMINAL_STATUSES.includes(job.status) && job.status !== targetStatus) {
      throw new Error(
        `Job ${jobId} reached terminal status ${job.status} instead of expected ${targetStatus}`,
      );
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timeout waiting for job ${jobId} to reach status ${targetStatus}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
