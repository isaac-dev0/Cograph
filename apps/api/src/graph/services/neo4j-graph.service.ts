import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Neo4jService } from 'nest-neo4j';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MCPClientService } from '../../mcp/mcp-client.service';

export interface FileNodeData {
  id: string;
  repositoryId: string;
  path: string;
  name: string;
  type: string;
  linesOfCode: number;
}

export interface EntityNodeData {
  id: string;
  fileId: string;
  name: string;
  type: 'Function' | 'Class' | 'Interface';
  startLine: number;
  endLine: number;
}

export interface ImportRelationshipData {
  fromFileId: string;
  toFileId: string;
  specifiers: string[];
}

@Injectable()
export class Neo4jGraphService implements OnModuleInit {
  private readonly logger = new Logger(Neo4jGraphService.name);

  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly prisma: PrismaService,
    private readonly mcpClient: MCPClientService,
  ) {}

  async onModuleInit() {
    await this.ensureIndexes();
  }

  /**
   * Creates indexes on repositoryId and id properties for performance.
   * This is called automatically when the module initialises.
   */
  private async ensureIndexes(): Promise<void> {
    try {
      const indexQueries = [
        'CREATE INDEX file_repository_id IF NOT EXISTS FOR (f:File) ON (f.repositoryId)',
        'CREATE INDEX file_id IF NOT EXISTS FOR (f:File) ON (f.id)',
        'CREATE INDEX function_id IF NOT EXISTS FOR (fn:Function) ON (fn.id)',
        'CREATE INDEX class_id IF NOT EXISTS FOR (c:Class) ON (c.id)',
        'CREATE INDEX interface_id IF NOT EXISTS FOR (i:Interface) ON (i.id)',
      ];

      for (const query of indexQueries) {
        await this.neo4jService.write(query);
        this.logger.log(`Created index: ${query}`);
      }

      this.logger.log('All indexes ensured');
    } catch (error) {
      this.logger.error('Failed to create indexes', error);
      throw error;
    }
  }

  /**
   * Creates a File node in Neo4j with the specified properties.
   * Uses parameterised queries to prevent Cypher injection.
   *
   * @param data - File node data including id, repositoryId, path, name, type, and linesOfCode
   * @returns The created file node
   */
  async createFileNode(data: FileNodeData) {
    const query = `
      CREATE (f:File {
        id: $id,
        repositoryId: $repositoryId,
        path: $path,
        name: $name,
        type: $type,
        linesOfCode: $linesOfCode,
        createdAt: datetime()
      })
      RETURN f
    `;

    try {
      const result = await this.neo4jService.write(query, {
        id: data.id,
        repositoryId: data.repositoryId,
        path: data.path,
        name: data.name,
        type: data.type,
        linesOfCode: data.linesOfCode,
      });

      const record = result.records[0];
      if (!record) {
        throw new InternalServerErrorException('Failed to create file node');
      }

      this.logger.log(`Created File node: ${data.path}`);
      return record.get('f').properties;
    } catch (error) {
      this.logger.error(`Failed to create file node: ${data.path}`, error);
      throw error;
    }
  }

  private static readonly VALID_ENTITY_TYPES = new Set<EntityNodeData['type']>([
    'Function',
    'Class',
    'Interface',
  ]);

  /**
   * Creates an Entity node (Function, Class, or Interface) in Neo4j and links it to a file.
   * Creates a CONTAINS relationship from the file to the entity.
   *
   * @param data - Entity node data including id, fileId, name, type, startLine, and endLine
   * @returns The created entity node
   */
  async createEntityNode(data: EntityNodeData) {
    if (!Neo4jGraphService.VALID_ENTITY_TYPES.has(data.type)) {
      throw new BadRequestException(
        `Invalid entity type "${data.type}". Must be one of: Function, Class, Interface.`,
      );
    }

    const query = `
      MATCH (f:File {id: $fileId})
      CREATE (e:${data.type} {
        id: $id,
        name: $name,
        type: $type,
        startLine: $startLine,
        endLine: $endLine,
        createdAt: datetime()
      })
      CREATE (f)-[:CONTAINS]->(e)
      RETURN e
    `;

    try {
      const result = await this.neo4jService.write(query, {
        fileId: data.fileId,
        id: data.id,
        name: data.name,
        type: data.type,
        startLine: data.startLine,
        endLine: data.endLine,
      });

      const record = result.records[0];
      if (!record) {
        throw new NotFoundException(
          `Failed to create entity node: file not found: ${data.fileId}`,
        );
      }

      this.logger.log(
        `Created ${data.type} node: ${data.name} in file ${data.fileId}`,
      );
      return record.get('e').properties;
    } catch (error) {
      this.logger.error(`Failed to create entity node: ${data.name}`, error);
      throw error;
    }
  }

  /**
   * Creates an IMPORTS relationship between two files with import specifiers.
   *
   * @param data - Import relationship data including fromFileId, toFileId, and specifiers
   * @returns The created relationship
   */
  async createImportRelationship(data: ImportRelationshipData) {
    const query = `
      MATCH (from:File {id: $fromFileId})
      MATCH (to:File {id: $toFileId})
      CREATE (from)-[r:IMPORTS {
        specifiers: $specifiers,
        createdAt: datetime()
      }]->(to)
      RETURN r
    `;

    try {
      const result = await this.neo4jService.write(query, {
        fromFileId: data.fromFileId,
        toFileId: data.toFileId,
        specifiers: data.specifiers,
      });

      const record = result.records[0];
      if (!record) {
        throw new InternalServerErrorException(
          `Failed to create import relationship: ${data.fromFileId} -> ${data.toFileId}`,
        );
      }

      this.logger.log(
        `Created IMPORTS relationship: ${data.fromFileId} -> ${data.toFileId}`,
      );
      return record.get('r').properties;
    } catch (error) {
      this.logger.error(
        `Failed to create import relationship: ${data.fromFileId} -> ${data.toFileId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Deletes all nodes and relationships for a specific repository.
   * This is useful for cleanup or re-analysis of a repository.
   *
   * @param repositoryId - The repository ID to delete
   * @returns The number of nodes deleted
   */
  async deleteRepositoryGraph(repositoryId: string): Promise<number> {
    const query = `
      MATCH (f:File {repositoryId: $repositoryId})
      OPTIONAL MATCH (f)-[:CONTAINS]->(e)
      DETACH DELETE f, e
      RETURN count(f) as deletedCount
    `;

    try {
      const result = await this.neo4jService.write(query, { repositoryId });
      const record = result.records[0];
      const deletedCount = record ? record.get('deletedCount').toNumber() : 0;

      this.logger.log(
        `Deleted ${deletedCount} nodes for repository: ${repositoryId}`,
      );
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to delete repository graph: ${repositoryId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves a single file node by its ID, including all connected entities.
   *
   * @param fileId - The file ID to retrieve
   * @returns The file node with its entities, or null if not found
   */
  async getFileNode(fileId: string): Promise<FileNodeData | null> {
    const query = `
      MATCH (f:File {id: $fileId})
      OPTIONAL MATCH (f)-[:CONTAINS]->(e)
      RETURN f, collect(e) as entities
    `;

    try {
      const result = await this.neo4jService.read(query, { fileId });

      if (result.records.length === 0) {
        this.logger.warn(`File node not found: ${fileId}`);
        return null;
      }

      const record = result.records[0];
      const fileNode = record.get('f');
      const entities = record.get('entities');

      return {
        ...fileNode.properties,
        entities: entities.map((entity) => entity?.properties).filter(Boolean),
      };
    } catch (error) {
      this.logger.error(`Failed to get file node: ${fileId}`, error);
      throw error;
    }
  }

  /**
   * Retrieves all file nodes for a repository, including their relationships.
   *
   * @param repositoryId - The repository ID
   * @returns Array of file nodes
   */
  async getRepositoryGraph(repositoryId: string): Promise<FileNodeData[]> {
    const query = `
      MATCH (f:File {repositoryId: $repositoryId})
      OPTIONAL MATCH (f)-[:CONTAINS]->(e)
      OPTIONAL MATCH (f)-[r:IMPORTS]->(f2:File)
      RETURN f, collect(DISTINCT e) as entities, collect(DISTINCT {file: f2, specifiers: r.specifiers}) as imports
      ORDER BY f.path
    `;

    try {
      const result = await this.neo4jService.read(query, { repositoryId });

      return result.records.map((record) => {
        const fileNode = record.get('f');
        const entities = record.get('entities');
        const imports = record.get('imports');

        return {
          ...fileNode.properties,
          entities: entities
            .map((entity) => entity?.properties)
            .filter(Boolean),
          imports: imports
            .filter((importData) => importData.file)
            .map((importData) => ({
              file: importData.file.properties,
              specifiers: importData.specifiers,
            })),
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to get repository graph: ${repositoryId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Creates an EXPORTS relationship from a file to an entity it exports.
   *
   * @param fileId - The file ID
   * @param entityId - The entity ID being exported
   * @returns The created relationship
   */
  async createExportRelationship(fileId: string, entityId: string) {
    const query = `
      MATCH (f:File {id: $fileId})
      MATCH (e {id: $entityId})
      CREATE (f)-[r:EXPORTS {
        createdAt: datetime()
      }]->(e)
      RETURN r
    `;

    try {
      const result = await this.neo4jService.write(query, { fileId, entityId });

      const record = result.records[0];
      if (!record) {
        throw new InternalServerErrorException(
          `Failed to create export relationship: ${fileId} -> ${entityId}`,
        );
      }

      this.logger.log(`Created EXPORTS relationship: ${fileId} -> ${entityId}`);
      return record.get('r').properties;
    } catch (error) {
      this.logger.error(
        `Failed to create export relationship: ${fileId} -> ${entityId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Bulk creates file nodes for better performance when creating many files.
   *
   * @param files - Array of file node data
   * @returns Number of files created
   */
  async bulkCreateFileNodes(files: FileNodeData[]): Promise<number> {
    const query = `
      UNWIND $files AS file
      CREATE (f:File {
        id: file.id,
        repositoryId: file.repositoryId,
        path: file.path,
        name: file.name,
        type: file.type,
        linesOfCode: file.linesOfCode,
        createdAt: datetime()
      })
      RETURN count(f) as createdCount
    `;

    try {
      const result = await this.neo4jService.write(query, { files });
      const record = result.records[0];
      const createdCount = record ? record.get('createdCount').toNumber() : 0;

      this.logger.log(`Bulk created ${createdCount} file nodes`);
      return createdCount;
    } catch (error) {
      this.logger.error('Failed to bulk create file nodes', error);
      throw error;
    }
  }

  /**
   * Bulk creates import relationships for better performance.
   *
   * @param imports - Array of import relationship data
   * @returns Number of relationships created
   */
  async bulkCreateImportRelationships(
    imports: ImportRelationshipData[],
  ): Promise<number> {
    const query = `
      UNWIND $imports AS imp
      MATCH (from:File {id: imp.fromFileId})
      MATCH (to:File {id: imp.toFileId})
      CREATE (from)-[r:IMPORTS {
        specifiers: imp.specifiers,
        createdAt: datetime()
      }]->(to)
      RETURN count(r) as createdCount
    `;

    try {
      const result = await this.neo4jService.write(query, { imports });
      const record = result.records[0];
      const createdCount = record ? record.get('createdCount').toNumber() : 0;

      this.logger.log(`Bulk created ${createdCount} import relationships`);
      return createdCount;
    } catch (error) {
      this.logger.error('Failed to bulk create import relationships', error);
      throw error;
    }
  }

  /**
   * Synchronizes a repository's analysis results from PostgreSQL to Neo4j.
   * Creates the complete dependency graph including files, entities, and import relationships.
   *
   * @param repositoryId - The repository ID to sync
   * @returns Summary of sync operation with counts and any errors
   */
  async syncRepositoryToNeo4j(repositoryId: string): Promise<{
    filesCreated: number;
    entitiesCreated: number;
    importsCreated: number;
    externalLibrariesCreated: number;
    unresolvedImports: Array<{ filePath: string; source: string }>;
    errors: string[];
  }> {
    this.logger.log(`Starting sync for repository: ${repositoryId}`);
    const errors: string[] = [];

    const deletedCount = await this.deleteRepositoryGraph(repositoryId);
    this.logger.log(`Deleted ${deletedCount} existing nodes`);

    const files = await this.prisma.repositoryFile.findMany({
      where: { repositoryId },
      include: { codeEntities: true },
      orderBy: { filePath: 'asc' },
    });
    this.logger.log(`Found ${files.length} files to sync`);

    if (files.length === 0) {
      return {
        filesCreated: 0,
        entitiesCreated: 0,
        importsCreated: 0,
        externalLibrariesCreated: 0,
        unresolvedImports: [],
        errors: [],
      };
    }

    const fileNodes: FileNodeData[] = files.map((file) => ({
      id: file.neo4jNodeId || file.id,
      repositoryId: file.repositoryId,
      path: file.filePath,
      name: file.fileName,
      type: file.fileType,
      linesOfCode: file.linesOfCode,
    }));

    const filesCreated = await this.bulkCreateFileNodes(fileNodes);
    this.logger.log(`Created ${filesCreated} file nodes`);

    let entitiesCreated = 0;
    const totalEntities = files.reduce(
      (sum, file) => sum + file.codeEntities.length,
      0,
    );

    for (const file of files) {
      for (const entity of file.codeEntities) {
        try {
          const annotations = entity.annotations
            ? JSON.parse(entity.annotations)
            : {};
          await this.createEntityNode({
            id: annotations.neo4jNodeId || entity.id,
            fileId: file.neo4jNodeId || file.id,
            name: entity.name,
            type: entity.type as 'Function' | 'Class' | 'Interface',
            startLine: entity.startLine,
            endLine: entity.endLine,
          });
          entitiesCreated++;

          if (entitiesCreated % 10 === 0 || entitiesCreated === totalEntities) {
            this.logger.log(
              `Created ${entitiesCreated} of ${totalEntities} entities`,
            );
          }
        } catch (error) {
          const errorMsg = `Failed to create entity ${entity.name}: ${error.message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }
    }

    const dependencyInput = {
      files: files.map((file) => {
        const annotations = file.annotations
          ? JSON.parse(file.annotations)
          : {};
        return {
          id: file.neo4jNodeId || file.id,
          filePath: file.filePath,
          imports: annotations.imports || [],
        };
      }),
    };

    this.logger.log('Extracting dependencies via MCP...');
    let dependencies;
    try {
      dependencies = await this.mcpClient.callTool(
        'extractDependencies',
        dependencyInput,
      );
    } catch (error) {
      const errorMsg = `Failed to extract dependencies: ${error.message}`;
      this.logger.error(errorMsg);
      errors.push(errorMsg);
      return {
        filesCreated,
        entitiesCreated,
        importsCreated: 0,
        externalLibrariesCreated: 0,
        unresolvedImports: [],
        errors,
      };
    }

    this.logger.log(
      `Extracted ${dependencies.internalImports.length} internal + ${dependencies.externalImports.length} external dependencies`,
    );

    let externalCreated = 0;
    if (dependencies.externalLibraries.length > 0) {
      const externalLibraryNodes: FileNodeData[] =
        dependencies.externalLibraries.map((lib) => ({
          id: lib.id,
          repositoryId: 'external',
          path: lib.name,
          name: lib.name,
          type: 'external',
          linesOfCode: 0,
        }));

      try {
        externalCreated = await this.bulkCreateFileNodes(externalLibraryNodes);
        this.logger.log(`Created ${externalCreated} external library nodes`);
      } catch (error) {
        const errorMsg = `Failed to create external library nodes: ${error.message}`;
        this.logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const allImports = [
      ...dependencies.internalImports,
      ...dependencies.externalImports.map((importData) => ({
        fromFileId: importData.fromFileId,
        toFileId: importData.toLibraryId,
        specifiers: importData.specifiers,
      })),
    ];

    let importsCreated = 0;
    if (allImports.length > 0) {
      try {
        importsCreated = await this.bulkCreateImportRelationships(allImports);
        this.logger.log(`Created ${importsCreated} import relationships`);
      } catch (error) {
        const errorMsg = `Failed to create import relationships: ${error.message}`;
        this.logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const unresolvedImports = dependencies.unresolvedImports.map(
      (unresolved) => ({
        filePath: unresolved.fromFile,
        source: unresolved.importSource,
      }),
    );

    if (unresolvedImports.length > 0) {
      this.logger.warn(`${unresolvedImports.length} unresolved imports:`);
      unresolvedImports.slice(0, 10).forEach((unresolved) => {
        this.logger.warn(`  ${unresolved.filePath}: ${unresolved.source}`);
      });
    }

    this.logger.log(`Sync completed for repository: ${repositoryId}`);
    return {
      filesCreated,
      entitiesCreated,
      importsCreated,
      externalLibrariesCreated: externalCreated,
      unresolvedImports,
      errors,
    };
  }
}
