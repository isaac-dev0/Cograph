/**
 * GraphQL queries for dependency graph operations
 */

export const REPOSITORY_GRAPH_QUERY = `
  query RepositoryGraph($repositoryId: ID!, $options: GraphOptionsInput) {
    repositoryGraph(repositoryId: $repositoryId, options: $options) {
      nodes {
        id
        label
        type
        data
      }
      edges {
        id
        source
        target
        type
        data
      }
    }
  }
`;

export const FILE_DEPENDENCIES_QUERY = `
  query FileDependencies($fileId: ID!, $options: GraphOptionsInput) {
    fileDependencies(fileId: $fileId, options: $options) {
      nodes {
        id
        label
        type
        data
      }
      edges {
        id
        source
        target
        type
        data
      }
    }
  }
`;

export const FILE_DEPENDENTS_QUERY = `
  query FileDependents($fileId: ID!, $options: GraphOptionsInput) {
    fileDependents(fileId: $fileId, options: $options) {
      nodes {
        id
        label
        type
        data
      }
      edges {
        id
        source
        target
        type
        data
      }
    }
  }
`;

export const CIRCULAR_DEPENDENCIES_QUERY = `
  query CircularDependencies($repositoryId: ID!) {
    circularDependencies(repositoryId: $repositoryId) {
      cycle
      paths
      length
    }
  }
`;

export const FILES_BY_TYPE_QUERY = `
  query FilesByType($repositoryId: ID!, $fileType: String!, $options: GraphOptionsInput) {
    filesByType(repositoryId: $repositoryId, fileType: $fileType, options: $options) {
      nodes {
        id
        label
        type
        data
      }
      edges {
        id
        source
        target
        type
        data
      }
    }
  }
`;

/**
 * GraphQL types
 */

export interface GraphNode {
  id: string;
  label: string;
  type: "FILE" | "FUNCTION" | "CLASS" | "INTERFACE";
  data: string; // JSON string containing additional metadata
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "IMPORTS" | "EXPORTS" | "CONTAINS";
  data?: string; // JSON string containing additional metadata
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphOptionsInput {
  maxDepth?: number;
  fileTypes?: string[];
  includeExternal?: boolean;
  limit?: number;
  offset?: number;
}

export interface CircularDependency {
  cycle: string[];
  paths: string[];
  length: number;
}
