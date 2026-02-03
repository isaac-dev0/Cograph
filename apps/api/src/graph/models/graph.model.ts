import { ObjectType, Field, registerEnumType, ID, Int } from '@nestjs/graphql';

/**
 * Node types in the dependency graph
 */
export enum NodeType {
  FILE = 'FILE',
  FUNCTION = 'FUNCTION',
  CLASS = 'CLASS',
  INTERFACE = 'INTERFACE',
}

/**
 * Edge types representing relationships
 */
export enum EdgeType {
  IMPORTS = 'IMPORTS',
  EXPORTS = 'EXPORTS',
  CONTAINS = 'CONTAINS',
}

registerEnumType(NodeType, {
  name: 'NodeType',
  description: 'Types of nodes in the dependency graph',
});

registerEnumType(EdgeType, {
  name: 'EdgeType',
  description: 'Types of relationships between nodes',
});

/**
 * Graph node representing a file or code entity
 */
@ObjectType({ description: 'A node in the dependency graph' })
export class GraphNode {
  @Field(() => ID, { description: 'Unique identifier for the node' })
  id: string;

  @Field(() => String, { description: 'Display label for the node' })
  label: string;

  @Field(() => NodeType, { description: 'Type of node (FILE, FUNCTION, CLASS, INTERFACE)' })
  type: NodeType;

  @Field(() => String, { description: 'Additional node metadata as JSON string' })
  data: string;
}

/**
 * Graph edge representing a relationship between nodes
 */
@ObjectType({ description: 'An edge (relationship) in the dependency graph' })
export class GraphEdge {
  @Field(() => ID, { description: 'Unique identifier for the edge' })
  id: string;

  @Field(() => String, { description: 'Source node ID' })
  source: string;

  @Field(() => String, { description: 'Target node ID' })
  target: string;

  @Field(() => EdgeType, { description: 'Type of relationship (IMPORTS, EXPORTS, CONTAINS)' })
  type: EdgeType;

  @Field(() => String, {
    nullable: true,
    description: 'Additional edge metadata as JSON string (e.g., import specifiers)',
  })
  data?: string;
}

/**
 * Complete dependency graph with nodes and edges
 */
@ObjectType({ description: 'A complete dependency graph with nodes and edges' })
export class DependencyGraph {
  @Field(() => [GraphNode], { description: 'All nodes in the graph' })
  nodes: GraphNode[];

  @Field(() => [GraphEdge], { description: 'All edges in the graph' })
  edges: GraphEdge[];
}

/**
 * Circular dependency detection result
 */
@ObjectType({ description: 'A detected circular dependency in the import graph' })
export class CircularDependency {
  @Field(() => [String], { description: 'Array of file IDs forming the cycle' })
  cycle: string[];

  @Field(() => [String], { description: 'Array of file paths forming the cycle' })
  paths: string[];

  @Field(() => Int, { description: 'Number of files in the cycle' })
  length: number;
}
