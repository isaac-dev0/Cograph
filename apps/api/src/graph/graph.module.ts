import { Module } from '@nestjs/common';
import { GraphResolver } from './graph.resolver';
import { AnalysisModule } from '../mcp/analysis/analysis.module';

@Module({
  imports: [AnalysisModule],
  providers: [GraphResolver],
  exports: [GraphResolver],
})
export class GraphModule {}
