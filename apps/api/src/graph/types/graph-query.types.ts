export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'function' | 'class' | 'interface';
  data: GraphNodeData;
}

export interface GraphNodeData {
  neo4jNodeId: string;
  path?: string;
  name: string;
  fileType?: string;
  linesOfCode?: number;
  repositoryFileId?: string;
  annotations?: Record<string, any>;
  claudeSummary?: string;
  startLine?: number;
  endLine?: number;
  entityType?: 'function' | 'class' | 'interface';
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'imports' | 'exports' | 'contains';
  data?: GraphEdgeData;
}

export interface GraphEdgeData {
  specifiers?: string[];
  label?: string;
}

export interface CircularDependency {
  cycle: string[];
  paths: string[];
  length: number;
}

export interface Neo4jNode {
  identity: any;
  labels: string[];
  properties: Record<string, any>;
}

export interface Neo4jRelationship {
  identity: any;
  type: string;
  start: any;
  end: any;
  properties: Record<string, any>;
}

/**
 * Depth configuration for traversal queries
 * -1 means unlimited depth
 */
export type TraversalDepth = 1 | 2 | 3 | -1;
