import { BadRequestException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard';
import { GraphQueryService } from './services/graph-query.service';
import { DependencyGraph, CircularDependency, GraphNode, GraphEdge, NodeType, EdgeType } from './models/graph.model';
import { GraphOptionsInput } from './dto/graph-options.input';
import { TraversalDepth } from '../common/shared/graph.interfaces';

@UseGuards(SupabaseJwtGuard)
@Resolver()
export class GraphResolver {
  constructor(private readonly graphQueryService: GraphQueryService) {}

  @Query(() => DependencyGraph, { name: 'repositoryGraph' })
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

  @Query(() => DependencyGraph, { name: 'fileDependencies' })
  async fileDependencies(
    @Args('fileId', { type: () => ID }) fileId: string,
    @Args('options', { type: () => GraphOptionsInput, nullable: true }) options?: GraphOptionsInput,
  ): Promise<DependencyGraph> {
    const depth = this.parseDepth(options?.maxDepth);
    const result = await this.graphQueryService.getFileDependencies(fileId, depth);

    return this.convertToGraphQLFormat(result);
  }

  @Query(() => DependencyGraph, { name: 'fileDependents' })
  async fileDependents(
    @Args('fileId', { type: () => ID }) fileId: string,
    @Args('options', { type: () => GraphOptionsInput, nullable: true }) options?: GraphOptionsInput,
  ): Promise<DependencyGraph> {
    const depth = this.parseDepth(options?.maxDepth);
    const result = await this.graphQueryService.getFileDependents(fileId, depth);

    return this.convertToGraphQLFormat(result);
  }

  @Query(() => Number, { name: 'repositoryNodeCount' })
  async repositoryNodeCount(
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
  ): Promise<number> {
    return this.graphQueryService.getRepositoryNodeCount(repositoryId);
  }

  @Query(() => [CircularDependency], { name: 'circularDependencies' })
  async circularDependencies(
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
  ): Promise<CircularDependency[]> {
    return this.graphQueryService.findCircularDependencies(repositoryId);
  }

  @Query(() => DependencyGraph, { name: 'filesByType' })
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

  private convertToGraphQLFormat(
    serviceResult: Awaited<ReturnType<typeof this.graphQueryService.getRepositoryGraph>>,
  ): DependencyGraph {
    const NODE_TYPE: Record<string, NodeType> = {
      file: NodeType.FILE,
      function: NodeType.FUNCTION,
      class: NodeType.CLASS,
      interface: NodeType.INTERFACE,
    };

    const EDGE_TYPE: Record<string, EdgeType> = {
      imports: EdgeType.IMPORTS,
      exports: EdgeType.EXPORTS,
      contains: EdgeType.CONTAINS,
    };

    const nodes: GraphNode[] = serviceResult.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      type: NODE_TYPE[node.type.toLowerCase()] ?? NodeType.FILE,
      data: JSON.stringify(node.data),
    }));

    const edges: GraphEdge[] = serviceResult.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: EDGE_TYPE[edge.type.toLowerCase()] ?? EdgeType.IMPORTS,
      data: edge.data ? JSON.stringify(edge.data) : undefined,
    }));

    return { nodes, edges };
  }

  private parseDepth(maxDepth?: number): TraversalDepth {
    if (maxDepth === undefined || maxDepth === null) {
      return 1;
    }

    if (maxDepth === -1 || maxDepth === 1 || maxDepth === 2 || maxDepth === 3) {
      return maxDepth;
    }

    throw new BadRequestException(
      `Invalid maxDepth value: ${maxDepth}. Must be 1, 2, 3, or -1 (unlimited).`,
    );
  }
}
