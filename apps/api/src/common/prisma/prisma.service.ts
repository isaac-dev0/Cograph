import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /** Opens the Prisma database connection pool on application startup. */
  async onModuleInit() {
    await this.$connect();
  }

  /** Releases the Prisma connection pool when the application shuts down. */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
