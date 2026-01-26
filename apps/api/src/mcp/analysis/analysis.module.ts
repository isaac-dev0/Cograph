import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { MCPAnalysisService } from './mcp-analysis.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { MCPModule } from '../mcp.module';

@Module({
  imports: [PrismaModule, MCPModule],
  providers: [AnalysisService, MCPAnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
