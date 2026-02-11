"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { graphqlRequest } from "@/lib/graphql/client";
import { REPOSITORY_GRAPH_QUERY, REPOSITORY_NODE_COUNT_QUERY, ANALYSIS_JOB_QUERY } from "@/lib/queries/GraphQueries";
import { ANALYSE_REPOSITORY } from "@/lib/queries/RepositoryQueries";
import {
  transformGraphData,
  filterGraphData,
  type ForceGraphData,
} from "@/components/graph/utils/graphDataTransform";
import type { DependencyGraph, GraphOptionsInput } from "@/lib/types/graph";

const POLL_INTERVAL_MS = 5_000;
const ANALYSIS_TIMEOUT_MS = 600_000;
const DEFAULT_LIMIT = 200;

interface AnalysisState {
  isAnalyzing: boolean;
  analysisError: string | null;
  elapsedSeconds: number;
  progress: number;
  filesAnalysed: number;
  totalFiles: number | null;
  status: string | null;
}

interface AnalysisJobResult {
  id: string;
  status: string;
  progress: number;
  filesAnalysed: number;
  totalFiles: number | null;
  errorMessage: string | null;
}

interface UseGraphDataReturn {
  graphData: ForceGraphData | null;
  displayData: ForceGraphData | null;
  isLoading: boolean;
  error: string | null;
  analysis: AnalysisState;
  totalCount: number;
  loadedCount: number;
  setFileTypeFilter: (fileTypes: string[]) => void;
  startAnalysis: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Manages the full lifecycle of graph data: fetching, polling during analysis,
 * filtering, and progressive loading as batches complete.
 */
export function useGraphData(
  repositoryId: string,
  options?: GraphOptionsInput,
): UseGraphDataReturn {
  const [graphData, setGraphData] = useState<ForceGraphData | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [filesAnalysed, setFilesAnalysed] = useState(0);
  const [totalFiles, setTotalFiles] = useState<number | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timerRef.current = null;
    timeoutRef.current = null;
  }, []);

  const fetchGraph = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setIsLoading(true);
        setError(null);

        const paginatedOptions = {
          ...options,
          limit: options?.limit ?? DEFAULT_LIMIT,
        };

        const [graphResult, countResult] = await Promise.all([
          graphqlRequest<{ repositoryGraph: DependencyGraph }>(
            REPOSITORY_GRAPH_QUERY,
            { repositoryId, options: paginatedOptions },
          ),
          graphqlRequest<{ repositoryNodeCount: number }>(
            REPOSITORY_NODE_COUNT_QUERY,
            { repositoryId },
          ),
        ]);

        const transformed = transformGraphData(graphResult.repositoryGraph);
        setGraphData(transformed);
        setTotalCount(countResult.repositoryNodeCount);

      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : "Failed to load graph");
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [repositoryId, options],
  );

  const pollJobStatus = useCallback(
    async (jobId: string) => {
      try {
        const result = await graphqlRequest<{ analysisJob: AnalysisJobResult }>(
          ANALYSIS_JOB_QUERY,
          { id: jobId },
        );
        const job = result.analysisJob;
        setAnalysisProgress(job.progress);
        setFilesAnalysed(job.filesAnalysed);
        setTotalFiles(job.totalFiles);
        setAnalysisStatus(job.status);

        if (job.status === "COMPLETED") {
          clearTimers();
          setIsAnalyzing(false);
          fetchGraph(false);
        } else if (job.status === "FAILED") {
          clearTimers();
          setIsAnalyzing(false);
          setAnalysisError(job.errorMessage ?? "Analysis failed");
        }
      } catch {
        // swallow poll errors — will retry next interval
      }
    },
    [clearTimers, fetchGraph],
  );

  const startAnalysis = useCallback(async () => {
    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      setElapsedSeconds(0);
      setAnalysisProgress(0);
      setFilesAnalysed(0);
      setTotalFiles(null);
      setAnalysisStatus("PENDING");
      jobIdRef.current = null;

      clearTimers();

      timerRef.current = setInterval(
        () => setElapsedSeconds((seconds) => seconds + 1),
        1000,
      );

      const result = await graphqlRequest<{ analyseRepository: { id: string } }>(
        ANALYSE_REPOSITORY,
        { repositoryId },
      );

      const jobId = result.analyseRepository.id;
      jobIdRef.current = jobId;

      pollRef.current = setInterval(
        () => pollJobStatus(jobId),
        POLL_INTERVAL_MS,
      );

      timeoutRef.current = setTimeout(() => {
        clearTimers();
        setIsAnalyzing(false);
        setAnalysisError("Analysis timed out");
      }, ANALYSIS_TIMEOUT_MS);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : "Failed to start analysis",
      );
      setIsAnalyzing(false);
      clearTimers();
    }
  }, [repositoryId, pollJobStatus, clearTimers]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const displayData = (() => {
    if (!graphData) return null;
    if (!selectedFileTypes.length) return graphData;
    return filterGraphData(graphData, {
      fileTypes: selectedFileTypes,
      includeExternal: true,
    });
  })();

  const loadedCount = graphData?.nodes.length ?? 0;

  return {
    graphData,
    displayData,
    isLoading,
    error,
    analysis: {
      isAnalyzing,
      analysisError,
      elapsedSeconds,
      progress: analysisProgress,
      filesAnalysed,
      totalFiles,
      status: analysisStatus,
    },
    totalCount,
    loadedCount,
    setFileTypeFilter: setSelectedFileTypes,
    startAnalysis,
    refresh: () => fetchGraph(),
  };
}
