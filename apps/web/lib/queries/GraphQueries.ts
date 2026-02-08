export type {
  GraphNode,
  GraphEdge,
  DependencyGraph,
  GraphOptionsInput,
  CircularDependency,
  CodeEntity,
  FileDetails,
} from "@/lib/types/graph";

export const REPOSITORY_GRAPH_QUERY = `
  query RepositoryGraph($repositoryId: ID!, $options: GraphOptionsInput) {
    repositoryGraph(repositoryId: $repositoryId, options: $options) {
      nodes { id label type data }
      edges { id source target type data }
    }
  }
`;

export const FILE_DEPENDENCIES_QUERY = `
  query FileDependencies($fileId: ID!, $options: GraphOptionsInput) {
    fileDependencies(fileId: $fileId, options: $options) {
      nodes { id label type data }
      edges { id source target type data }
    }
  }
`;

export const FILE_DEPENDENTS_QUERY = `
  query FileDependents($fileId: ID!, $options: GraphOptionsInput) {
    fileDependents(fileId: $fileId, options: $options) {
      nodes { id label type data }
      edges { id source target type data }
    }
  }
`;

export const CIRCULAR_DEPENDENCIES_QUERY = `
  query CircularDependencies($repositoryId: ID!) {
    circularDependencies(repositoryId: $repositoryId) {
      cycle paths length
    }
  }
`;

export const FILES_BY_TYPE_QUERY = `
  query FilesByType($repositoryId: ID!, $fileType: String!, $options: GraphOptionsInput) {
    filesByType(repositoryId: $repositoryId, fileType: $fileType, options: $options) {
      nodes { id label type data }
      edges { id source target type data }
    }
  }
`;

export const FILE_DETAILS_QUERY = `
  query RepositoryFile($id: ID!) {
    repositoryFile(id: $id) {
      id repositoryId filePath fileName fileType linesOfCode
      annotations claudeSummary createdAt updatedAt
      codeEntities { id name type startLine endLine annotations }
    }
  }
`;
