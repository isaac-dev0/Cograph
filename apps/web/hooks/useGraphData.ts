"use client";

import { useEffect, useRef, useState, useCallback, useReducer } from "react";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  REPOSITORY_GRAPH_QUERY,
  REPOSITORY_NODE_COUNT_QUERY,
  ANALYSIS_JOB_QUERY,
} from "@/lib/queries/GraphQueries";
import { ANALYSE_REPOSITORY } from "@/lib/queries/RepositoryQueries";
import {
  transformGraphData,
  filterGraphData,
  type ForceGraphData,
} from "@/components/graph/utils/graphDataTransform";
import type {
  DependencyGraph,
  GraphOptionsInput,
} from "@/lib/interfaces/graph.interfaces";

const POLL_INTERVAL_MS = 5_000;
const ANALYSIS_TIMEOUT_MS = 600_000;
const DEFAULT_LIMIT = 200;
const LOAD_MORE_INCREMENT = 200;

export interface AnalysisState {
  isAnalyzing: boolean;
  analysisError: string | null;
  elapsedSeconds: number;
  progress: number;
  filesAnalysed: number;
  totalFiles: number | null;
  status: string | null;
}

type AnalysisAction =
  | { type: "START" }
  | {
      type: "POLL_UPDATE";
      progress: number;
      filesAnalysed: number;
      totalFiles: number | null;
      status: string;
    }
  | { type: "COMPLETE" }
  | { type: "FAIL"; error: string }
  | { type: "TIMEOUT" }
  | { type: "TICK" };

const ANALYSIS_INITIAL_STATE: AnalysisState = {
  isAnalyzing: false,
  analysisError: null,
  elapsedSeconds: 0,
  progress: 0,
  filesAnalysed: 0,
  totalFiles: null,
  status: null,
};

function analysisReducer(
  state: AnalysisState,
  action: AnalysisAction,
): AnalysisState {
  switch (action.type) {
    case "START":
      return {
        ...ANALYSIS_INITIAL_STATE,
        isAnalyzing: true,
        status: "PENDING",
      };
    case "POLL_UPDATE":
      return {
        ...state,
        progress: action.progress,
        filesAnalysed: action.filesAnalysed,
        totalFiles: action.totalFiles,
        status: action.status,
      };
    case "COMPLETE":
      return { ...state, isAnalyzing: false };
    case "FAIL":
      return { ...state, isAnalyzing: false, analysisError: action.error };
    case "TIMEOUT":
      return {
        ...state,
        isAnalyzing: false,
        analysisError: "Analysis timed out",
      };
    case "TICK":
      return { ...state, elapsedSeconds: state.elapsedSeconds + 1 };
  }
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
  loadMore: () => void;
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
  const [currentLimit, setCurrentLimit] = useState(
    options?.limit ?? DEFAULT_LIMIT,
  );

  const [analysis, dispatchAnalysis] = useReducer(
    analysisReducer,
    ANALYSIS_INITIAL_STATE,
  );

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
    async (silent = false, limit = currentLimit) => {
      try {
        if (!silent) setIsLoading(true);
        setError(null);

        const paginatedOptions = {
          ...options,
          limit,
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
      } catch (error) {
        if (!silent) {
          setError(
            error instanceof Error ? error.message : "Failed to load graph",
          );
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [repositoryId, options, currentLimit],
  );

  const loadMore = useCallback(() => {
    const nextLimit = currentLimit + LOAD_MORE_INCREMENT;
    setCurrentLimit(nextLimit);
    fetchGraph(false, nextLimit);
  }, [currentLimit, fetchGraph]);

  const pollJobStatus = useCallback(
    async (jobId: string) => {
      try {
        const result = await graphqlRequest<{ analysisJob: AnalysisJobResult }>(
          ANALYSIS_JOB_QUERY,
          { id: jobId },
        );
        const job = result.analysisJob;
        dispatchAnalysis({
          type: "POLL_UPDATE",
          progress: job.progress,
          filesAnalysed: job.filesAnalysed,
          totalFiles: job.totalFiles,
          status: job.status,
        });

        if (job.status === "COMPLETED") {
          clearTimers();
          dispatchAnalysis({ type: "COMPLETE" });
          fetchGraph(false);
        } else if (job.status === "FAILED") {
          clearTimers();
          dispatchAnalysis({
            type: "FAIL",
            error: job.errorMessage ?? "Analysis failed",
          });
        }
      } catch (err) {
        console.error("[useGraphData] Poll error for job", jobId, err);
      }
    },
    [clearTimers, fetchGraph],
  );

  const startAnalysis = useCallback(async () => {
    try {
      dispatchAnalysis({ type: "START" });
      jobIdRef.current = null;

      clearTimers();

      timerRef.current = setInterval(
        () => dispatchAnalysis({ type: "TICK" }),
        1000,
      );

      const result = await graphqlRequest<{
        analyseRepository: { id: string };
      }>(ANALYSE_REPOSITORY, { repositoryId });

      const jobId = result.analyseRepository.id;
      jobIdRef.current = jobId;

      pollRef.current = setInterval(
        () => pollJobStatus(jobId),
        POLL_INTERVAL_MS,
      );

      timeoutRef.current = setTimeout(() => {
        clearTimers();
        dispatchAnalysis({ type: "TIMEOUT" });
      }, ANALYSIS_TIMEOUT_MS);
    } catch (err) {
      dispatchAnalysis({
        type: "FAIL",
        error: err instanceof Error ? err.message : "Failed to start analysis",
      });
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
    analysis,
    totalCount,
    loadedCount,
    setFileTypeFilter: setSelectedFileTypes,
    startAnalysis,
    refresh: () => fetchGraph(),
    loadMore,
  };
}
