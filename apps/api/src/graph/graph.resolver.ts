import { UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard';
import { GraphQueryService } from '../mcp/analysis/graph-query.service';
import { DependencyGraph, CircularDependency, GraphNode, GraphEdge, NodeType, EdgeType } from './models/graph.model';
import { GraphOptionsInput } from './dto/graph-options.input';
import { TraversalDepth } from '../mcp/analysis/graph-query.types';

/**
 * GraphQL resolver for dependency graph queries
 */
@UseGuards(SupabaseJwtGuard)
@Resolver()
export class GraphResolver {
  constructor(private readonly graphQueryService: GraphQueryService) {}

  /**
   * Get complete repository dependency graph with nodes and edges
   */
  @Query(() => DependencyGraph, {
    name: 'repositoryGraph',
    description: 'Returns the complete dependency graph for a repository with all nodes and edges. Supports pagination and filtering.',
  })
  async repositoryGraph(
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
    @Args('options', { type: () => GraphOptionsInput, nullable: true }) options?: GraphOptionsInput,
  ): Promise<DependencyGraph> {
    const result = await this.graphQueryService.getRepositoryGraph(repositoryId, {
      limit: options?.limit,
      offset: options?.offset,
    });

    return this.convertToGraphQLFormat(result);
  }

  /**
   * Get N-hop dependencies for a file (outgoing imports)
   */
  @Query(() => DependencyGraph, {
    name: 'fileDependencies',
    description: 'Returns all files that the specified file depends on (imports). Supports depth control for N-hop traversal.',
  })
  async fileDependencies(
    @Args('fileId', { type: () => ID }) fileId: string,
    @Args('options', { type: () => GraphOptionsInput, nullable: true }) options?: GraphOptionsInput,
  ): Promise<DependencyGraph> {
    const depth = this.parseDepth(options?.maxDepth);
    const result = await this.graphQueryService.getFileDependencies(fileId, depth);

    return this.convertToGraphQLFormat(result);
  }

  /**
   * Get N-hop dependents for a file (incoming imports)
   */
  @Query(() => DependencyGraph, {
    name: 'fileDependents',
    description: 'Returns all files that depend on (import) the specified file. Supports depth control for N-hop traversal.',
  })
  async fileDependents(
    @Args('fileId', { type: () => ID }) fileId: string,
    @Args('options', { type: () => GraphOptionsInput, nullable: true }) options?: GraphOptionsInput,
  ): Promise<DependencyGraph> {
    const depth = this.parseDepth(options?.maxDepth);
    const result = await this.graphQueryService.getFileDependents(fileId, depth);

    return this.convertToGraphQLFormat(result);
  }

  /**
   * Detect circular dependencies in the repository
   */
  @Query(() => [CircularDependency], {
    name: 'circularDependencies',
    description: 'Detects and returns all circular dependencies (import cycles) in the repository. Limited to 100 results.',
  })
  async circularDependencies(
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
  ): Promise<CircularDependency[]> {
    return this.graphQueryService.findCircularDependencies(repositoryId);
  }

  /**
   * Get files filtered by type/extension
   */
  @Query(() => DependencyGraph, {
    name: 'filesByType',
    description: 'Returns files filtered by extension (e.g., "ts", "tsx", "js") with their dependencies.',
  })
  async filesByType(
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
    @Args('fileType', { type: () => String }) fileType: string,
    @Args('options', { type: () => GraphOptionsInput, nullable: true }) options?: GraphOptionsInput,
  ): Promise<DependencyGraph> {
    const result = await this.graphQueryService.getFilesByType(repositoryId, fileType, {
      limit: options?.limit,
      offset: options?.offset,
    });

    return this.convertToGraphQLFormat(result);
  }

  /**
   * Helper to convert service response to GraphQL format
   * Maps lowercase type strings to uppercase enum values
   * Stringifies data objects to JSON strings
   */
  private convertToGraphQLFormat(
    serviceResult: Awaited<ReturnType<typeof this.graphQueryService.getRepositoryGraph>>,
  ): DependencyGraph {
    const nodes: GraphNode[] = serviceResult.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      type: this.mapNodeType(node.type),
      data: JSON.stringify(node.data),
    }));

    const edges: GraphEdge[] = serviceResult.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: this.mapEdgeType(edge.type),
      data: edge.data ? JSON.stringify(edge.data) : undefined,
    }));

    return { nodes, edges };
  }

  /**
   * Map lowercase node type to GraphQL enum
   */
  private mapNodeType(type: string): NodeType {
    switch (type.toLowerCase()) {
      case 'file':
        return NodeType.FILE;
      case 'function':
        return NodeType.FUNCTION;
      case 'class':
        return NodeType.CLASS;
      case 'interface':
        return NodeType.INTERFACE;
      default:
        return NodeType.FILE;
    }
  }

  /**
   * Map lowercase edge type to GraphQL enum
   */
  private mapEdgeType(type: string): EdgeType {
    switch (type.toLowerCase()) {
      case 'imports':
        return EdgeType.IMPORTS;
      case 'exports':
        return EdgeType.EXPORTS;
      case 'contains':
        return EdgeType.CONTAINS;
      default:
        return EdgeType.IMPORTS;
    }
  }

  /**
   * Parse and validate traversal depth from options
   */
  private parseDepth(maxDepth?: number): TraversalDepth {
    if (maxDepth === undefined || maxDepth === null) {
      return 1;
    }

    if (maxDepth === -1) {
      return -1;
    }

    if (maxDepth === 1 || maxDepth === 2 || maxDepth === 3) {
      return maxDepth;
    }

    return 1;
  }
}
