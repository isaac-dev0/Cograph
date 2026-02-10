import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisResolver } from './analysis.resolver';
import { AnalysisLoaders } from './analysis.loaders';
import { MCPAnalysisService } from './mcp-analysis.service';
import { MCPSummaryService } from './mcp-summary.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { MCPModule } from '../mcp.module';
import { RepositoriesModule } from 'src/repositories/repositories.module';
import { GraphModule } from 'src/graph/graph.module';

@Module({
  imports: [PrismaModule, MCPModule, RepositoriesModule, GraphModule],
  providers: [AnalysisService, AnalysisResolver, AnalysisLoaders, MCPAnalysisService, MCPSummaryService],
  exports: [AnalysisService, MCPAnalysisService, MCPSummaryService],
})
export class AnalysisModule {}
