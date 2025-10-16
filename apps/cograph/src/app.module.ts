import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphqlModule } from './shared/graphql/graphql.module';
import { Neo4jModule } from './shared/neo4j/neo4j.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: 5432,
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      database: process.env.POSTGRES_DATABASE || 'cograph',
      autoLoadEntities: true,
      synchronize: true,
    }),
    GraphqlModule,
    Neo4jModule
  ],
  controllers: [],
  providers: [],
})

export class AppModule {}
