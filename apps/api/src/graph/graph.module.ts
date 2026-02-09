import { Module } from '@nestjs/common';
import { GraphResolver } from './graph.resolver';
import { GraphQueryService } from './services/graph-query.service';
import { Neo4jGraphService } from './services/neo4j-graph.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GraphResolver, GraphQueryService, Neo4jGraphService],
  exports: [GraphQueryService, Neo4jGraphService],
})
export class GraphModule {}
