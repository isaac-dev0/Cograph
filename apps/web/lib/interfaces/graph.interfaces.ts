/**
 * Typed metadata carried in the `data` field of a FILE node.
 * Mirrors the shape produced by `GraphQueryService.enrichNodesWithMetadata`.
 */
export interface FileNodeData {
  neo4jNodeId?: string;
  path?: string;
  name?: string;
  fileType?: string;
  linesOfCode?: number;
  repositoryFileId?: string;
  filePath?: string;
  annotations?: Record<string, unknown>;
  claudeSummary?: string;
}

/**
 * Parses the JSON `data` string on a FILE graph node into a typed object.
 * Returns an empty object when the string is absent or malformed.
 */
export function parseFileNodeData(raw: string): FileNodeData {
  try {
    return JSON.parse(raw) as FileNodeData;
  } catch {
    return {};
  }
}

/** A node in the dependency graph returned by the API. */
export interface GraphNode {
  id: string;
  label: string;
  type: "FILE" | "FUNCTION" | "CLASS" | "INTERFACE";
  /**
   * JSON-encoded node metadata. Use `parseFileNodeData` to read it
   * in a type-safe way instead of calling `JSON.parse` directly.
   */
  data: string;
}

/** An edge in the dependency graph returned by the API. */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "IMPORTS" | "EXPORTS" | "CONTAINS";
  /** JSON-encoded metadata (specifiers, label, etc.) */
  data?: string;
}

/** Complete dependency graph response from the API. */
export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Options for controlling graph query pagination and filtering. */
export interface GraphOptionsInput {
  maxDepth?: number;
  fileTypes?: string[];
  includeExternal?: boolean;
  limit?: number;
  offset?: number;
}

/** A circular dependency cycle detected in the graph. */
export interface CircularDependency {
  cycle: string[];
  paths: string[];
}

/** Author information for an annotation. */
export interface AnnotationAuthor {
  id: string;
  name: string;
}

/** A user-created annotation on a repository file. */
export interface FileAnnotation {
  id: string;
  title: string;
  content: string;
  tags: string[];
  linkedEntityIds: string[];
  author: AnnotationAuthor;
  createdAt: string;
  updatedAt: string;
}

/** An annotation enriched with source file information, for the documents view. */
export interface DocumentAnnotation extends FileAnnotation {
  fileId: string;
  filePath: string;
  fileName: string;
}

/** Input for updating an annotation's content. */
export interface UpdateAnnotationInput {
  title?: string;
  content?: string;
  tags?: string[];
  linkedEntityIds?: string[];
}

/** A code entity (function, class, interface) within a file. */
export interface CodeEntity {
  id: string;
  name: string;
  type: string;
  startLine: number;
  endLine: number;
  annotations?: string | null;
}

/** Detailed metadata for a single repository file. */
export interface FileDetails {
  id: string;
  repositoryId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  linesOfCode: number;
  annotations?: FileAnnotation[] | null;
  claudeSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  codeEntities?: CodeEntity[];
}
