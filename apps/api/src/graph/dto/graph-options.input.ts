import { InputType, Field, Int } from '@nestjs/graphql';

@InputType({ description: 'Options for filtering and controlling graph queries' })
export class GraphOptionsInput {
  @Field(() => Int, {
    nullable: true,
    description: 'Maximum traversal depth for dependency queries (1, 2, 3, or -1 for unlimited)',
  })
  maxDepth?: number;

  @Field(() => [String], {
    nullable: true,
    description: 'Filter by file types/extensions (e.g., ["ts", "tsx", "js"])',
  })
  fileTypes?: string[];

  @Field(() => Boolean, {
    nullable: true,
    description: 'Include external library dependencies in the graph',
  })
  includeExternal?: boolean;

  @Field(() => Int, {
    nullable: true,
    description: 'Maximum number of nodes to return (pagination limit)',
  })
  limit?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Number of nodes to skip (pagination offset)',
  })
  offset?: number;
}
