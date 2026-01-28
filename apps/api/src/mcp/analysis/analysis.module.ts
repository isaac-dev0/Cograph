import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisResolver } from './analysis.resolver';
import { MCPAnalysisService } from './mcp-analysis.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { MCPModule } from '../mcp.module';
import { RepositoriesModule } from 'src/repositories/repositories.module';

@Module({
  imports: [PrismaModule, MCPModule, RepositoriesModule],
  providers: [AnalysisService, AnalysisResolver, MCPAnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
