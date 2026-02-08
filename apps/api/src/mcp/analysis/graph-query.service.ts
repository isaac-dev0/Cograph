import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from 'nest-neo4j';
import { int as neo4jInt } from 'neo4j-driver';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  DependencyGraph,
  GraphNode,
  GraphEdge,
  CircularDependency,
  PaginationOptions,
  TraversalDepth,
  Neo4jNode,
  Neo4jRelationship,
} from './graph-query.types';

interface RawGraphComponents {
  fileNodes: Neo4jNode[];
  entityNodes: Neo4jNode[];
  relationships: Neo4jRelationship[];
}

/**
 * Executes complex graph queries against Neo4j: full repository graphs,
 * per-file dependency/dependent traversals, circular dependency detection,
 * and file-type filtering. All results are enriched with PostgreSQL metadata.
 */
@Injectable()
export class GraphQueryService {
  private readonly logger = new Logger(GraphQueryService.name);

  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly prisma: PrismaService,
  ) {}

  /** Returns all nodes and edges for a repository. */
  async getRepositoryGraph(
    repositoryId: string,
    options?: PaginationOptions,
  ): Promise<DependencyGraph> {
    const limit = Math.floor(options?.limit ?? 500);
    const offset = Math.floor(options?.offset ?? 0);

    this.logger.log(`Fetching repository graph for ${repositoryId} (limit: ${limit}, offset: ${offset})`);

    const result = await this.neo4jService.read(
      `MATCH (f:File {repositoryId: $repositoryId})
       OPTIONAL MATCH (f)-[:CONTAINS]->(e)
       OPTIONAL MATCH (f)-[r:IMPORTS]->(target:File)
       WITH f, collect(DISTINCT e) as entities,
            collect(DISTINCT {rel: r, target: target}) as imports
       RETURN f, entities, imports
       ORDER BY f.path SKIP $offset LIMIT $limit`,
      { repositoryId, offset: neo4jInt(offset), limit: neo4jInt(limit) },
    );

    if (!result.records?.length) {
      this.logger.warn(`No files found for repository ${repositoryId}`);
      return { nodes: [], edges: [] };
    }

    const components = this.extractCombinedRecords(result.records);
    return this.buildGraph(components);
  }

  /** Returns N-hop outgoing dependencies for a file. */
  async getFileDependencies(
    fileId: string,
    depth: TraversalDepth = 1,
  ): Promise<DependencyGraph> {
    this.logger.log(`Fetching dependencies for file ${fileId} (depth: ${depth})`);

    const depthPattern = depth === -1 ? '*' : `*1..${depth}`;

    const [nodesResult, edgesResult] = await Promise.all([
      this.neo4jService.read(
        `MATCH (f:File {id: $fileId})
         OPTIONAL MATCH path = (f)-[:IMPORTS${depthPattern}]->(dep:File)
         OPTIONAL MATCH (dep)-[:CONTAINS]->(e)
         WITH DISTINCT dep, collect(DISTINCT e) as entities
         WHERE dep IS NOT NULL
         RETURN dep as node, entities`,
        { fileId },
      ),
      this.neo4jService.read(
        `MATCH (f:File {id: $fileId})
         MATCH path = (f)-[:IMPORTS${depthPattern}]->(dep:File)
         WITH relationships(path) as rels
         UNWIND rels as r
         WITH DISTINCT r, startNode(r) as source, endNode(r) as target
         RETURN r, source, target`,
        { fileId },
      ),
    ]);

    const components = this.extractSeparateRecords(nodesResult.records, edgesResult.records);
    return this.buildGraph(components);
  }

  /** Returns N-hop incoming dependents for a file. */
  async getFileDependents(
    fileId: string,
    depth: TraversalDepth = 1,
  ): Promise<DependencyGraph> {
    this.logger.log(`Fetching dependents for file ${fileId} (depth: ${depth})`);

    const depthPattern = depth === -1 ? '*' : `*1..${depth}`;

    const [nodesResult, edgesResult] = await Promise.all([
      this.neo4jService.read(
        `MATCH (f:File {id: $fileId})
         OPTIONAL MATCH path = (dependent:File)-[:IMPORTS${depthPattern}]->(f)
         OPTIONAL MATCH (dependent)-[:CONTAINS]->(e)
         WITH DISTINCT dependent, collect(DISTINCT e) as entities
         WHERE dependent IS NOT NULL
         RETURN dependent as node, entities`,
        { fileId },
      ),
      this.neo4jService.read(
        `MATCH (f:File {id: $fileId})
         MATCH path = (dependent:File)-[:IMPORTS${depthPattern}]->(f)
         WITH relationships(path) as rels
         UNWIND rels as r
         WITH DISTINCT r, startNode(r) as source, endNode(r) as target
         RETURN r, source, target`,
        { fileId },
      ),
    ]);

    const components = this.extractSeparateRecords(nodesResult.records, edgesResult.records);
    return this.buildGraph(components);
  }

  /** Detects circular dependency cycles in the import graph. */
  async findCircularDependencies(repositoryId: string): Promise<CircularDependency[]> {
    this.logger.log(`Detecting circular dependencies for ${repositoryId}`);

    const result = await this.neo4jService.read(
      `MATCH (f:File {repositoryId: $repositoryId})
       MATCH path = (f)-[:IMPORTS*]->(f)
       WITH [node IN nodes(path) | node.id] as cycleIds,
            [node IN nodes(path) | node.path] as cyclePaths,
            length(path) as cycleLength
       WHERE cycleLength > 0
       RETURN DISTINCT cycleIds, cyclePaths, cycleLength
       ORDER BY cycleLength ASC LIMIT 100`,
      { repositoryId },
    );

    if (!result.records?.length) {
      this.logger.log(`No circular dependencies found for ${repositoryId}`);
      return [];
    }

    const cycles = result.records.map((record) => ({
      cycle: record.get('cycleIds') as string[],
      paths: record.get('cyclePaths') as string[],
      length: record.get('cycleLength') as number,
    }));

    this.logger.log(`Found ${cycles.length} circular dependencies for ${repositoryId}`);
    return cycles;
  }

  /** Returns files filtered by extension with their relationships. */
  async getFilesByType(
    repositoryId: string,
    fileType: string,
    options?: PaginationOptions,
  ): Promise<DependencyGraph> {
    const limit = Math.floor(options?.limit ?? 500);
    const offset = Math.floor(options?.offset ?? 0);

    this.logger.log(`Fetching ${fileType} files for ${repositoryId} (limit: ${limit}, offset: ${offset})`);

    const result = await this.neo4jService.read(
      `MATCH (f:File {repositoryId: $repositoryId})
       WHERE f.type = $fileType
       OPTIONAL MATCH (f)-[:CONTAINS]->(e)
       OPTIONAL MATCH (f)-[r:IMPORTS]->(target:File)
       WITH f, collect(DISTINCT e) as entities,
            collect(DISTINCT {rel: r, target: target}) as imports
       RETURN f, entities, imports
       ORDER BY f.path SKIP $offset LIMIT $limit`,
      { repositoryId, fileType, offset: neo4jInt(offset), limit: neo4jInt(limit) },
    );

    if (!result.records?.length) {
      this.logger.warn(`No ${fileType} files found for ${repositoryId}`);
      return { nodes: [], edges: [] };
    }

    const components = this.extractCombinedRecords(result.records);
    return this.buildGraph(components);
  }

  // ── Record extraction ─────────────────────────────────────────────────

  /**
   * Extracts graph components from combined queries that return
   * file nodes, entities, and import relationships in each record.
   * Used by getRepositoryGraph and getFilesByType.
   */
  private extractCombinedRecords(records: any[]): RawGraphComponents {
    const fileNodes: Neo4jNode[] = [];
    const entityNodes: Neo4jNode[] = [];
    const relationships: Neo4jRelationship[] = [];

    for (const record of records) {
      const fileNode = record.get('f');
      if (fileNode) {
        fileNodes.push(this.toNeo4jNode(fileNode));
      }

      for (const entity of record.get('entities') ?? []) {
        if (entity) entityNodes.push(this.toNeo4jNode(entity));
      }

      for (const imp of record.get('imports') ?? []) {
        if (imp.rel && imp.target) {
          relationships.push({
            identity: imp.rel.identity,
            type: imp.rel.type,
            start: fileNode.properties.id,
            end: imp.target.properties.id,
            properties: imp.rel.properties,
          });
        }
      }
    }

    return { fileNodes, entityNodes, relationships };
  }

  /**
   * Extracts graph components from separate node and edge queries.
   * Used by getFileDependencies and getFileDependents.
   */
  private extractSeparateRecords(
    nodeRecords: any[],
    edgeRecords: any[],
  ): RawGraphComponents {
    const fileNodes: Neo4jNode[] = [];
    const entityNodes: Neo4jNode[] = [];

    for (const record of nodeRecords) {
      const node = record.get('node');
      if (node) fileNodes.push(this.toNeo4jNode(node));

      for (const entity of record.get('entities') ?? []) {
        if (entity) entityNodes.push(this.toNeo4jNode(entity));
      }
    }

    const relationships: Neo4jRelationship[] = [];
    for (const record of edgeRecords) {
      const rel = record.get('r');
      const source = record.get('source');
      const target = record.get('target');

      if (rel && source && target) {
        relationships.push({
          identity: rel.identity,
          type: rel.type,
          start: source.properties.id,
          end: target.properties.id,
          properties: rel.properties,
        });
      }
    }

    return { fileNodes, entityNodes, relationships };
  }

  private toNeo4jNode(raw: any): Neo4jNode {
    return {
      identity: raw.identity,
      labels: raw.labels,
      properties: raw.properties,
    };
  }

  /** Enriches nodes with PostgreSQL metadata and converts relationships to edges. */
  private async buildGraph(components: RawGraphComponents): Promise<DependencyGraph> {
    const allNodes = [...components.fileNodes, ...components.entityNodes];
    const nodes = await this.enrichNodesWithMetadata(allNodes);
    const edges = this.convertRelationships(components.relationships);

    this.logger.log(`Built graph: ${nodes.length} nodes, ${edges.length} edges`);
    return { nodes, edges };
  }

  /**
   * Enriches Neo4j nodes with PostgreSQL metadata using bulk queries
   * to avoid the N+1 problem.
   */
  private async enrichNodesWithMetadata(neo4jNodes: Neo4jNode[]): Promise<GraphNode[]> {
    if (!neo4jNodes.length) return [];

    const neo4jIds = neo4jNodes.map((n) => n.properties.id).filter(Boolean);
    if (!neo4jIds.length) return neo4jNodes.map((n) => this.toGraphNode(n));

    try {
      const [files, entities] = await Promise.all([
        this.prisma.repositoryFile.findMany({
          where: { neo4jNodeId: { in: neo4jIds } },
          select: { id: true, neo4jNodeId: true, annotations: true, claudeSummary: true, filePath: true, fileName: true },
        }),
        this.prisma.codeEntity.findMany({
          where: { repositoryFile: { neo4jNodeId: { in: neo4jIds } } },
          select: { id: true, name: true, type: true, startLine: true, endLine: true, annotations: true },
        }),
      ]);

      const fileMap = new Map(files.map((f) => [f.neo4jNodeId, f]));
      const entityMap = new Map(
        entities
          .map((e) => {
            try {
              const annotations = e.annotations ? JSON.parse(e.annotations) : {};
              return [annotations.neo4jNodeId, e] as const;
            } catch {
              return [null, e] as const;
            }
          })
          .filter(([id]) => id !== null),
      );

      return neo4jNodes.map((node) => {
        const isFile = node.labels.includes('File');
        const neo4jId = node.properties.id;

        if (isFile) {
          const meta = fileMap.get(neo4jId);
          let annotations = {};
          if (meta?.annotations) {
            try { annotations = JSON.parse(meta.annotations); } catch {}
          }

          return {
            id: neo4jId,
            label: node.properties.name || node.properties.path || 'Unknown',
            type: 'file' as const,
            data: {
              neo4jNodeId: neo4jId,
              path: node.properties.path,
              name: node.properties.name,
              fileType: node.properties.type,
              linesOfCode: node.properties.linesOfCode,
              repositoryFileId: meta?.id,
              annotations,
              claudeSummary: meta?.claudeSummary || undefined,
            },
          };
        }

        const entityType = this.getEntityType(node.labels);
        const entityMeta = entityMap.get(neo4jId);

        return {
          id: neo4jId,
          label: node.properties.name || 'Unknown',
          type: entityType,
          data: {
            neo4jNodeId: neo4jId,
            name: node.properties.name,
            startLine: node.properties.startLine,
            endLine: node.properties.endLine,
            entityType,
            repositoryFileId: entityMeta?.id,
          },
        };
      });
    } catch (error) {
      this.logger.error('Failed to enrich nodes with metadata', error);
      return neo4jNodes.map((n) => this.toGraphNode(n));
    }
  }

  /** Converts a Neo4j node to a GraphNode without PostgreSQL metadata. */
  private toGraphNode(node: Neo4jNode): GraphNode {
    const isFile = node.labels.includes('File');
    const neo4jId = node.properties.id;

    if (isFile) {
      return {
        id: neo4jId,
        label: node.properties.name || node.properties.path || 'Unknown',
        type: 'file',
        data: {
          neo4jNodeId: neo4jId,
          path: node.properties.path,
          name: node.properties.name,
          fileType: node.properties.type,
          linesOfCode: node.properties.linesOfCode,
        },
      };
    }

    const entityType = this.getEntityType(node.labels);
    return {
      id: neo4jId,
      label: node.properties.name || 'Unknown',
      type: entityType,
      data: {
        neo4jNodeId: neo4jId,
        name: node.properties.name,
        startLine: node.properties.startLine,
        endLine: node.properties.endLine,
        entityType,
      },
    };
  }

  /** Converts Neo4j relationships to GraphEdge format. */
  private convertRelationships(relationships: Neo4jRelationship[]): GraphEdge[] {
    return relationships.map((rel) => {
      const edgeType = rel.type.toLowerCase() as 'imports' | 'exports' | 'contains';
      const sourceId = rel.start.toString();
      const targetId = rel.end.toString();

      const edge: GraphEdge = {
        id: `${sourceId}-${edgeType}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: edgeType,
      };

      if (rel.properties && Object.keys(rel.properties).length > 0) {
        edge.data = {
          specifiers: rel.properties.specifiers,
          label: edgeType,
        };
      }

      return edge;
    });
  }

  /** Extracts the entity type label from Neo4j node labels. */
  private getEntityType(labels: string[]): 'function' | 'class' | 'interface' {
    const match = labels.find((l) => ['Function', 'Class', 'Interface'].includes(l));
    return (match?.toLowerCase() as 'function' | 'class' | 'interface') || 'function';
  }
}
