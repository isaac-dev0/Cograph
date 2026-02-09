"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { graphqlRequest } from "@/lib/graphql/client";
import { REPOSITORY_GRAPH_QUERY, REPOSITORY_NODE_COUNT_QUERY } from "@/lib/queries/GraphQueries";
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

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevNodeCountRef = useRef(0);
  const stableCountRef = useRef(0);

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

        if (silent && isAnalyzing) {
          const currentCount = transformed.nodes.length;
          if (currentCount === prevNodeCountRef.current) {
            stableCountRef.current++;
          } else {
            stableCountRef.current = 0;
          }
          prevNodeCountRef.current = currentCount;

          if (stableCountRef.current >= 3 && currentCount > 0) {
            clearTimers();
            setIsAnalyzing(false);
          }
        }
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : "Failed to load graph");
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [repositoryId, options, isAnalyzing, clearTimers],
  );

  const startAnalysis = useCallback(async () => {
    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      setElapsedSeconds(0);
      prevNodeCountRef.current = 0;
      stableCountRef.current = 0;

      clearTimers();

      timerRef.current = setInterval(
        () => setElapsedSeconds((s) => s + 1),
        1000,
      );

      await graphqlRequest(ANALYSE_REPOSITORY, { repositoryId });

      pollRef.current = setInterval(() => fetchGraph(true), POLL_INTERVAL_MS);

      timeoutRef.current = setTimeout(() => {
        clearTimers();
        setIsAnalyzing(false);
      }, ANALYSIS_TIMEOUT_MS);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : "Failed to start analysis",
      );
      setIsAnalyzing(false);
      clearTimers();
    }
  }, [repositoryId, fetchGraph, clearTimers]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => clearTimers, [clearTimers]);

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
    analysis: { isAnalyzing, analysisError, elapsedSeconds },
    totalCount,
    loadedCount,
    setFileTypeFilter: setSelectedFileTypes,
    startAnalysis,
    refresh: () => fetchGraph(),
  };
}
