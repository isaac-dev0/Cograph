import { Module } from '@nestjs/common';
import { MCPClientService } from './mcp-client.service';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  providers: [MCPClientService, AnalysisModule],
  exports: [MCPClientService],
})
export class MCPModule {}
