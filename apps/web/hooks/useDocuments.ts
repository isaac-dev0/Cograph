"use client";

import { useReducer, useState, useEffect, useCallback } from "react";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  REPOSITORY_ANNOTATIONS_QUERY,
  UPDATE_ANNOTATION_MUTATION,
  DELETE_ANNOTATION_MUTATION,
} from "@/lib/queries/GraphQueries";
import type {
  DocumentAnnotation,
  UpdateAnnotationInput,
} from "@/lib/interfaces/graph.interfaces";
import { toast } from "sonner";

interface DocumentsState {
  annotations: DocumentAnnotation[];
  isLoading: boolean;
  error: string | null;
}

type DocumentsAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: DocumentAnnotation[] }
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "UPDATE_ANNOTATION"; payload: DocumentAnnotation }
  | { type: "DELETE_ANNOTATION"; payload: string };

function documentsReducer(
  state: DocumentsState,
  action: DocumentsAction,
): DocumentsState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return { annotations: action.payload, isLoading: false, error: null };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    case "UPDATE_ANNOTATION":
      return {
        ...state,
        annotations: state.annotations.map((annotation) =>
          annotation.id === action.payload.id ? action.payload : annotation,
        ),
      };
    case "DELETE_ANNOTATION":
      return {
        ...state,
        annotations: state.annotations.filter(
          (annotation) => annotation.id !== action.payload,
        ),
      };
    default:
      return state;
  }
}

export interface UseDocumentsReturn {
  annotations: DocumentAnnotation[];
  displayAnnotations: DocumentAnnotation[];
  allTags: string[];
  activeTags: string[];
  toggleTag: (tag: string) => void;
  selectedAnnotation: DocumentAnnotation | null;
  setSelectedAnnotation: (annotation: DocumentAnnotation | null) => void;
  isLoading: boolean;
  error: string | null;
  updateAnnotation: (
    fileId: string,
    annotationId: string,
    input: UpdateAnnotationInput,
  ) => Promise<void>;
  deleteAnnotation: (fileId: string, annotationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Fetches and manages all annotations for a repository, with tag filtering,
 * selection state, and update/delete mutations.
 */
export function useDocuments(repositoryId: string | null): UseDocumentsReturn {
  const [state, dispatch] = useReducer(documentsReducer, {
    annotations: [],
    isLoading: false,
    error: null,
  });

  const [activeTags, setActiveTags] = useState<Array<string>>([]);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<DocumentAnnotation | null>(null);

  const fetchAnnotations = useCallback(async () => {
    if (!repositoryId) {
      dispatch({ type: "FETCH_SUCCESS", payload: [] });
      return;
    }

    dispatch({ type: "FETCH_START" });

    try {
      const result = await graphqlRequest<{
        repositoryAnnotations: DocumentAnnotation[];
      }>(REPOSITORY_ANNOTATIONS_QUERY, { repositoryId });
      dispatch({
        type: "FETCH_SUCCESS",
        payload: result.repositoryAnnotations,
      });
    } catch (error) {
      console.error("Failed to fetch repository annotations:", error);
      const message =
        error instanceof Error ? error.message : "Failed to load documents";
      dispatch({ type: "FETCH_ERROR", payload: message });
    }
  }, [repositoryId]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  useEffect(() => {
    setActiveTags([]);
    setSelectedAnnotation(null);
  }, [repositoryId]);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((previous) =>
      previous.includes(tag)
        ? previous.filter((t) => t !== tag)
        : [...previous, tag],
    );
  }, []);

  const updateAnnotation = useCallback(
    async (
      fileId: string,
      annotationId: string,
      input: UpdateAnnotationInput,
    ) => {
      try {
        const result = await graphqlRequest<{
          updateAnnotation: DocumentAnnotation;
        }>(UPDATE_ANNOTATION_MUTATION, { fileId, annotationId, input });
        const updated: DocumentAnnotation = {
          ...result.updateAnnotation,
          fileId,
          filePath:
            state.annotations.find((annotation) => annotation.id === annotationId)?.filePath ??
            "",
          fileName:
            state.annotations.find((annotation) => annotation.id === annotationId)?.fileName ??
            "",
        };
        dispatch({ type: "UPDATE_ANNOTATION", payload: updated });
        setSelectedAnnotation(updated);
      } catch (error) {
        console.error("Failed to update annotation:", error);
        toast.error("Failed to update annotation", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
        throw error;
      }
    },
    [state.annotations],
  );

  const deleteAnnotation = useCallback(
    async (fileId: string, annotationId: string) => {
      try {
        await graphqlRequest(DELETE_ANNOTATION_MUTATION, {
          fileId,
          annotationId,
        });
        dispatch({ type: "DELETE_ANNOTATION", payload: annotationId });
        setSelectedAnnotation(null);
      } catch (error) {
        console.error("Failed to delete annotation:", error);
        toast.error("Failed to delete annotation", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
        throw error;
      }
    },
    [],
  );

  const allTags = Array.from(
    new Set(state.annotations.flatMap((annotation) => annotation.tags)),
  ).sort();

  const displayAnnotations =
    activeTags.length === 0
      ? state.annotations
      : state.annotations.filter((annotation) =>
          activeTags.some((tag) => annotation.tags.includes(tag)),
        );

  return {
    annotations: state.annotations,
    displayAnnotations,
    allTags,
    activeTags,
    toggleTag,
    selectedAnnotation,
    setSelectedAnnotation,
    isLoading: state.isLoading,
    error: state.error,
    updateAnnotation,
    deleteAnnotation,
    refresh: fetchAnnotations,
  };
}
