import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from 'nest-neo4j';
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

/**
 * Service for complex graph queries including fetching repository graphs,
 * finding dependencies, and detecting circular imports.
 */
@Injectable()
export class GraphQueryService {
  private readonly logger = new Logger(GraphQueryService.name);

  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Returns all nodes and edges for a repository in React Flow format
   * @param repositoryId - The repository ID to query
   * @param options - Pagination options (default: limit 500, offset 0)
   * @returns DependencyGraph with nodes and edges enriched with PostgreSQL metadata
   */
  async getRepositoryGraph(
    repositoryId: string,
    options?: PaginationOptions,
  ): Promise<DependencyGraph> {
    try {
      const limit = options?.limit ?? 500;
      const offset = options?.offset ?? 0;

      this.logger.log(
        `Fetching repository graph for ${repositoryId} (limit: ${limit}, offset: ${offset})`,
      );

      /* A Cypher query for files, entities, and import relationships */
      const cypher = `
        MATCH (f:File {repositoryId: $repositoryId})
        OPTIONAL MATCH (f)-[:CONTAINS]->(e)
        OPTIONAL MATCH (f)-[r:IMPORTS]->(target:File)
        WITH f,
             collect(DISTINCT e) as entities,
             collect(DISTINCT {rel: r, target: target}) as imports
        RETURN f, entities, imports
        ORDER BY f.path
        SKIP $offset
        LIMIT $limit
      `;

      const result = await this.neo4jService.read(cypher, {
        repositoryId,
        offset,
        limit,
      });

      if (!result.records || result.records.length === 0) {
        this.logger.warn(
          `No files found for repository ${repositoryId}`,
        );
        return { nodes: [], edges: [] };
      }

      /* A way to extract nodes and relationships from Neo4j results */
      const fileNodes: Neo4jNode[] = [];
      const entityNodes: Neo4jNode[] = [];
      const relationships: Neo4jRelationship[] = [];

      for (const record of result.records) {
        const fileNode = record.get('f');
        const entities = record.get('entities');
        const imports = record.get('imports');

        if (fileNode) {
          fileNodes.push({
            identity: fileNode.identity,
            labels: fileNode.labels,
            properties: fileNode.properties,
          });
        }

        if (entities && Array.isArray(entities)) {
          for (const entity of entities) {
            if (entity) {
              entityNodes.push({
                identity: entity.identity,
                labels: entity.labels,
                properties: entity.properties,
              });
            }
          }
        }

        if (imports && Array.isArray(imports)) {
          for (const imp of imports) {
            if (imp.rel && imp.target) {
              relationships.push({
                identity: imp.rel.identity,
                type: imp.rel.type,
                start: fileNode.identity,
                end: imp.target.identity,
                properties: imp.rel.properties,
              });
            }
          }
        }
      }

      const allNodes = [...fileNodes, ...entityNodes];
      const enrichedNodes = await this.enrichNodesWithMetadata(allNodes);

      const edges = this.convertRelationshipsToEdges(relationships);

      this.logger.log(
        `Retrieved ${enrichedNodes.length} nodes and ${edges.length} edges for repository ${repositoryId}`,
      );

      return {
        nodes: enrichedNodes,
        edges,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch repository graph for ${repositoryId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Returns N-hop dependencies for a file (outgoing imports)
   * @param fileId - The Neo4j node ID of the file
   * @param depth - Traversal depth (1, 2, 3, or -1 for unlimited). Default: 1
   * @returns DependencyGraph with dependency nodes and edges
   */
  async getFileDependencies(
    fileId: string,
    depth: TraversalDepth = 1,
  ): Promise<DependencyGraph> {
    try {
      this.logger.log(
        `Fetching dependencies for file ${fileId} with depth ${depth}`,
      );

      /* Depth pattern builder for Cypher query */
      const depthPattern = depth === -1 ? '*' : `*1..${depth}`;

      /* Query for dependency nodes */
      const nodesCypher = `
        MATCH (f:File {id: $fileId})
        OPTIONAL MATCH path = (f)-[:IMPORTS${depthPattern}]->(dep:File)
        OPTIONAL MATCH (dep)-[:CONTAINS]->(e)
        WITH DISTINCT dep, collect(DISTINCT e) as entities
        WHERE dep IS NOT NULL
        RETURN dep, entities
      `;

      /* Query for dependency relationships */
      const edgesCypher = `
        MATCH (f:File {id: $fileId})
        MATCH path = (f)-[:IMPORTS${depthPattern}]->(dep:File)
        WITH relationships(path) as rels
        UNWIND rels as r
        WITH DISTINCT r, startNode(r) as source, endNode(r) as target
        RETURN r, source, target
      `;

      const [nodesResult, edgesResult] = await Promise.all([
        this.neo4jService.read(nodesCypher, { fileId }),
        this.neo4jService.read(edgesCypher, { fileId }),
      ]);

      const fileNodes: Neo4jNode[] = [];
      const entityNodes: Neo4jNode[] = [];

      for (const record of nodesResult.records) {
        const depNode = record.get('dep');
        const entities = record.get('entities');

        if (depNode) {
          fileNodes.push({
            identity: depNode.identity,
            labels: depNode.labels,
            properties: depNode.properties,
          });
        }

        if (entities && Array.isArray(entities)) {
          for (const entity of entities) {
            if (entity) {
              entityNodes.push({
                identity: entity.identity,
                labels: entity.labels,
                properties: entity.properties,
              });
            }
          }
        }
      }

      const relationships: Neo4jRelationship[] = [];
      for (const record of edgesResult.records) {
        const rel = record.get('r');
        const source = record.get('source');
        const target = record.get('target');

        if (rel && source && target) {
          relationships.push({
            identity: rel.identity,
            type: rel.type,
            start: source.identity,
            end: target.identity,
            properties: rel.properties,
          });
        }
      }

      const allNodes = [...fileNodes, ...entityNodes];
      const enrichedNodes = await this.enrichNodesWithMetadata(allNodes);
      const edges = this.convertRelationshipsToEdges(relationships);

      this.logger.log(
        `Found ${enrichedNodes.length} dependency nodes and ${edges.length} edges for file ${fileId}`,
      );

      return {
        nodes: enrichedNodes,
        edges,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch dependencies for file ${fileId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Returns files that import the given file (incoming dependencies)
   * @param fileId - The Neo4j node ID of the file
   * @param depth - Traversal depth (1, 2, 3, or -1 for unlimited). Default: 1
   * @returns DependencyGraph with dependent nodes and edges
   */
  async getFileDependents(
    fileId: string,
    depth: TraversalDepth = 1,
  ): Promise<DependencyGraph> {
    try {
      this.logger.log(
        `Fetching dependents for file ${fileId} with depth ${depth}`,
      );

      const depthPattern = depth === -1 ? '*' : `*1..${depth}`;

      /* Query dependent nodes (reverse traversal) */
      const nodesCypher = `
        MATCH (f:File {id: $fileId})
        OPTIONAL MATCH path = (dependent:File)-[:IMPORTS${depthPattern}]->(f)
        OPTIONAL MATCH (dependent)-[:CONTAINS]->(e)
        WITH DISTINCT dependent, collect(DISTINCT e) as entities
        WHERE dependent IS NOT NULL
        RETURN dependent, entities
      `;

      /* Query dependent relationships (reverse direction) */
      const edgesCypher = `
        MATCH (f:File {id: $fileId})
        MATCH path = (dependent:File)-[:IMPORTS${depthPattern}]->(f)
        WITH relationships(path) as rels
        UNWIND rels as r
        WITH DISTINCT r, startNode(r) as source, endNode(r) as target
        RETURN r, source, target
      `;

      const [nodesResult, edgesResult] = await Promise.all([
        this.neo4jService.read(nodesCypher, { fileId }),
        this.neo4jService.read(edgesCypher, { fileId }),
      ]);

      const fileNodes: Neo4jNode[] = [];
      const entityNodes: Neo4jNode[] = [];

      for (const record of nodesResult.records) {
        const depNode = record.get('dependent');
        const entities = record.get('entities');

        if (depNode) {
          fileNodes.push({
            identity: depNode.identity,
            labels: depNode.labels,
            properties: depNode.properties,
          });
        }

        if (entities && Array.isArray(entities)) {
          for (const entity of entities) {
            if (entity) {
              entityNodes.push({
                identity: entity.identity,
                labels: entity.labels,
                properties: entity.properties,
              });
            }
          }
        }
      }

      const relationships: Neo4jRelationship[] = [];
      for (const record of edgesResult.records) {
        const rel = record.get('r');
        const source = record.get('source');
        const target = record.get('target');

        if (rel && source && target) {
          relationships.push({
            identity: rel.identity,
            type: rel.type,
            start: source.identity,
            end: target.identity,
            properties: rel.properties,
          });
        }
      }

      const allNodes = [...fileNodes, ...entityNodes];
      const enrichedNodes = await this.enrichNodesWithMetadata(allNodes);
      const edges = this.convertRelationshipsToEdges(relationships);

      this.logger.log(
        `Found ${enrichedNodes.length} dependent nodes and ${edges.length} edges for file ${fileId}`,
      );

      return {
        nodes: enrichedNodes,
        edges,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch dependents for file ${fileId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Detects circular dependencies in the import graph
   * @param repositoryId - The repository ID to query
   * @returns Array of circular dependencies with cycle paths
   */
  async findCircularDependencies(
    repositoryId: string,
  ): Promise<CircularDependency[]> {
    try {
      this.logger.log(
        `Detecting circular dependencies for repository ${repositoryId}`,
      );

      const cypher = `
        MATCH (f:File {repositoryId: $repositoryId})
        MATCH path = (f)-[:IMPORTS*]->(f)
        WITH [node IN nodes(path) | node.id] as cycleIds,
             [node IN nodes(path) | node.path] as cyclePaths,
             length(path) as cycleLength
        WHERE cycleLength > 0
        RETURN DISTINCT cycleIds, cyclePaths, cycleLength
        ORDER BY cycleLength ASC
        LIMIT 100
      `;

      const result = await this.neo4jService.read(cypher, { repositoryId });

      if (!result.records || result.records.length === 0) {
        this.logger.log(
          `No circular dependencies found for repository ${repositoryId}`,
        );
        return [];
      }

      const cycles: CircularDependency[] = result.records.map((record) => {
        const cycleIds = record.get('cycleIds') as string[];
        const cyclePaths = record.get('cyclePaths') as string[];
        const cycleLength = record.get('cycleLength') as number;

        return {
          cycle: cycleIds,
          paths: cyclePaths,
          length: cycleLength,
        };
      });

      this.logger.log(
        `Found ${cycles.length} circular dependencies for repository ${repositoryId}`,
      );

      return cycles;
    } catch (error) {
      this.logger.error(
        `Failed to detect circular dependencies for repository ${repositoryId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Filters files by extension with pagination
   * @param repositoryId - The repository ID to query
   * @param fileType - File extension to filter by (e.g., 'ts', 'tsx', 'js')
   * @param options - Pagination options (default: limit 500, offset 0)
   * @returns DependencyGraph with filtered files and their relationships
   */
  async getFilesByType(
    repositoryId: string,
    fileType: string,
    options?: PaginationOptions,
  ): Promise<DependencyGraph> {
    try {
      const limit = options?.limit ?? 500;
      const offset = options?.offset ?? 0;

      this.logger.log(
        `Fetching files of type ${fileType} for repository ${repositoryId} (limit: ${limit}, offset: ${offset})`,
      );

      const cypher = `
        MATCH (f:File {repositoryId: $repositoryId})
        WHERE f.type = $fileType
        OPTIONAL MATCH (f)-[:CONTAINS]->(e)
        OPTIONAL MATCH (f)-[r:IMPORTS]->(target:File)
        WITH f,
             collect(DISTINCT e) as entities,
             collect(DISTINCT {rel: r, target: target}) as imports
        RETURN f, entities, imports
        ORDER BY f.path
        SKIP $offset
        LIMIT $limit
      `;

      const result = await this.neo4jService.read(cypher, {
        repositoryId,
        fileType,
        offset,
        limit,
      });

      if (!result.records || result.records.length === 0) {
        this.logger.warn(
          `No files of type ${fileType} found for repository ${repositoryId}`,
        );
        return { nodes: [], edges: [] };
      }

      const fileNodes: Neo4jNode[] = [];
      const entityNodes: Neo4jNode[] = [];
      const relationships: Neo4jRelationship[] = [];

      for (const record of result.records) {
        const fileNode = record.get('f');
        const entities = record.get('entities');
        const imports = record.get('imports');

        if (fileNode) {
          fileNodes.push({
            identity: fileNode.identity,
            labels: fileNode.labels,
            properties: fileNode.properties,
          });
        }

        if (entities && Array.isArray(entities)) {
          for (const entity of entities) {
            if (entity) {
              entityNodes.push({
                identity: entity.identity,
                labels: entity.labels,
                properties: entity.properties,
              });
            }
          }
        }

        if (imports && Array.isArray(imports)) {
          for (const imp of imports) {
            if (imp.rel && imp.target) {
              relationships.push({
                identity: imp.rel.identity,
                type: imp.rel.type,
                start: fileNode.identity,
                end: imp.target.identity,
                properties: imp.rel.properties,
              });
            }
          }
        }
      }

      const allNodes = [...fileNodes, ...entityNodes];
      const enrichedNodes = await this.enrichNodesWithMetadata(allNodes);
      const edges = this.convertRelationshipsToEdges(relationships);

      this.logger.log(
        `Retrieved ${enrichedNodes.length} nodes and ${edges.length} edges for file type ${fileType}`,
      );

      return {
        nodes: enrichedNodes,
        edges,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch files of type ${fileType} for repository ${repositoryId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Helper method to enrich Neo4j nodes with PostgreSQL metadata
   * Uses a two-phase approach: bulk query then map-based merge
   * @param neo4jNodes - Array of Neo4j nodes to enrich
   * @returns Array of enriched GraphNode objects
   */
  private async enrichNodesWithMetadata(
    neo4jNodes: Neo4jNode[],
  ): Promise<GraphNode[]> {
    if (neo4jNodes.length === 0) {
      return [];
    }

    try {
      const neo4jIds = neo4jNodes
        .map((node) => node.properties.id)
        .filter((id) => id);

      if (neo4jIds.length === 0) {
        return neo4jNodes.map((node) => this.convertNeo4jNodeToGraphNode(node));
      }

      /* Bulk fetch from PostgreSQL (to avoid the N+1 problem) */
      const files = await this.prisma.repositoryFile.findMany({
        where: {
          neo4jNodeId: { in: neo4jIds },
        },
        select: {
          id: true,
          neo4jNodeId: true,
          annotations: true,
          claudeSummary: true,
          filePath: true,
          fileName: true,
        },
      });

      const fileMap = new Map(
        files.map((file) => [file.neo4jNodeId, file]),
      );

      /* Parse entity annotations to get their neo4jNodeId */
      const entities = await this.prisma.codeEntity.findMany({
        where: {
          repositoryFile: {
            neo4jNodeId: { in: neo4jIds },
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          startLine: true,
          endLine: true,
          annotations: true,
        },
      });

      /* Lookup map for entities */
      const entityMap = new Map(
        entities
          .map((entity) => {
            try {
              const annotations = entity.annotations ? JSON.parse(entity.annotations) : {};
              return [annotations.neo4jNodeId, entity] as const;
            } catch (error) {
              this.logger.warn(
                `Failed to parse annotations for entity ${entity.id}`,
                error,
              );
              return [null, entity] as const;
            }
          })
          .filter(([id]) => id !== null),
      );

      /* Merge Neo4j node data with existing PostgreSQL metadata */
      return neo4jNodes.map((node) => {
        const isFile = node.labels.includes('File');
        const neo4jId = node.properties.id;

        if (isFile) {
          const fileMetadata = fileMap.get(neo4jId);
          let annotations = {};

          if (fileMetadata?.annotations) {
            try {
              annotations = JSON.parse(fileMetadata.annotations);
            } catch (error) {
              this.logger.warn(
                `Failed to parse annotations for file ${neo4jId}`,
                error,
              );
            }
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
              repositoryFileId: fileMetadata?.id,
              annotations: annotations,
              claudeSummary: fileMetadata?.claudeSummary || undefined,
            },
          };
        } else {
          const entityMetadata = entityMap.get(neo4jId);
          const entityType = node.labels.find((l) =>
            ['Function', 'Class', 'Interface'].includes(l),
          )?.toLowerCase() as 'function' | 'class' | 'interface' | undefined;

          return {
            id: neo4jId,
            label: node.properties.name || 'Unknown',
            type: entityType || 'function',
            data: {
              neo4jNodeId: neo4jId,
              name: node.properties.name,
              startLine: node.properties.startLine,
              endLine: node.properties.endLine,
              entityType: entityType,
              repositoryFileId: entityMetadata?.id,
            },
          };
        }
      });
    } catch (error) {
      this.logger.error('Failed to enrich nodes with metadata', error);
      return neo4jNodes.map((node) => this.convertNeo4jNodeToGraphNode(node));
    }
  }

  /**
   * Helper method to convert Neo4j node to GraphNode without enrichment
   * @param node - Neo4j node to convert
   * @returns GraphNode without PostgreSQL metadata
   */
  private convertNeo4jNodeToGraphNode(node: Neo4jNode): GraphNode {
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
    } else {
      const entityType = node.labels.find((label) =>
        ['Function', 'Class', 'Interface'].includes(label),
      )?.toLowerCase() as 'function' | 'class' | 'interface' | undefined;

      return {
        id: neo4jId,
        label: node.properties.name || 'Unknown',
        type: entityType || 'function',
        data: {
          neo4jNodeId: neo4jId,
          name: node.properties.name,
          startLine: node.properties.startLine,
          endLine: node.properties.endLine,
          entityType: entityType,
        },
      };
    }
  }

  /**
   * Helper method to convert Neo4j relationships to React Flow edges
   * @param relationships - Array of Neo4j relationships
   * @returns Array of GraphEdge objects
   */
  private convertRelationshipsToEdges(
    relationships: Neo4jRelationship[],
  ): GraphEdge[] {
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
}
