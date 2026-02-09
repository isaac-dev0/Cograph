import { Module } from '@nestjs/common';
import { GraphResolver } from './graph.resolver';
import { GraphQueryService } from './services/graph-query.service';
import { Neo4jGraphService } from './services/neo4j-graph.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MCPModule } from '../mcp/mcp.module';

@Module({
  imports: [PrismaModule, MCPModule],
  providers: [GraphResolver, GraphQueryService, Neo4jGraphService],
  exports: [GraphQueryService, Neo4jGraphService],
})
export class GraphModule {}
