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

export const REPOSITORY_NODE_COUNT_QUERY = `
  query RepositoryNodeCount($repositoryId: ID!) {
    repositoryNodeCount(repositoryId: $repositoryId)
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
      claudeSummary createdAt updatedAt
      annotations {
        id title content tags linkedEntityIds
        author { id name }
        createdAt updatedAt
      }
      codeEntities { id name type startLine endLine annotations }
    }
  }
`;

export const CREATE_ANNOTATION_MUTATION = `
  mutation CreateAnnotation($fileId: ID!, $input: CreateAnnotationInput!) {
    createAnnotation(fileId: $fileId, input: $input) {
      id title content tags linkedEntityIds
      author { id name }
      createdAt updatedAt
    }
  }
`;

export const UPDATE_ANNOTATION_MUTATION = `
  mutation UpdateAnnotation($fileId: ID!, $annotationId: ID!, $input: UpdateAnnotationInput!) {
    updateAnnotation(fileId: $fileId, annotationId: $annotationId, input: $input) {
      id title content tags linkedEntityIds
      author { id name }
      createdAt updatedAt
    }
  }
`;

export const DELETE_ANNOTATION_MUTATION = `
  mutation DeleteAnnotation($fileId: ID!, $annotationId: ID!) {
    deleteAnnotation(fileId: $fileId, annotationId: $annotationId)
  }
`;

export const GENERATE_FILE_SUMMARY_MUTATION = `
  mutation GenerateFileSummary($fileId: ID!, $regenerate: Boolean) {
    generateFileSummary(fileId: $fileId, regenerate: $regenerate) {
      id claudeSummary updatedAt
    }
  }
`;

export const FILE_CONTENT_QUERY = `
  query FileContent($id: ID!) {
    fileContent(id: $id)
  }
`;
