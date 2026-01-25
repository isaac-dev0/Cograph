import { Module } from '@nestjs/common';
import { MCPClientService } from './mcp-client.service';

@Module({
  providers: [MCPClientService],
  exports: [MCPClientService],
})
export class MCPModule {}
