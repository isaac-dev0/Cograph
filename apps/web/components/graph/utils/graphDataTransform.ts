import type {
  DependencyGraph,
  GraphNode,
  GraphEdge,
} from "../../../lib/queries/GraphQueries";

export interface ForceGraphNode {
  id: string;
  name: string;
  type: string;
  fileType?: string;
  linesOfCode?: number;
  path?: string;
  color?: string;
  size?: number;
  isExternal?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface ForceGraphLink {
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  type: string;
  color?: string;
  isExternal?: boolean;
}

export interface ForceGraphData {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
}

const FILE_TYPE_COLORS: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#9333ea",
  js: "#f7df1e",
  jsx: "#fb923c",
  json: "#64748b",
  css: "#1572b6",
  scss: "#cd6799",
  html: "#e34f26",
  md: "#22c55e",
  default: "#6366f1",
};

export function getFileTypeColor(fileType: string): string {
  const normalizedType = fileType.toLowerCase().replace(/^\./, "");
  return FILE_TYPE_COLORS[normalizedType] || FILE_TYPE_COLORS.default;
}

export function extractFileType(label: string): string | undefined {
  const match = label.match(/\.([^.]+)$/);
  return match ? match[1] : undefined;
}

export function isExternalFile(path: string): boolean {
  return path.includes("node_modules") || path.startsWith("@");
}

export function calculateNodeSize(linesOfCode?: number): number {
  if (!linesOfCode) return 5;

  const minSize = 3;
  const maxSize = 15;
  const maxLines = 1000;

  const normalizedLines = Math.min(linesOfCode, maxLines);
  return minSize + (normalizedLines / maxLines) * (maxSize - minSize);
}

function parseNodeData(dataString: string): Record<string, unknown> {
  try {
    return JSON.parse(dataString);
  } catch {
    return {};
  }
}

function parseEdgeData(dataString?: string): Record<string, unknown> {
  if (!dataString) return {};
  try {
    return JSON.parse(dataString);
  } catch {
    return {};
  }
}

function transformNode(node: GraphNode): ForceGraphNode {
  const data = parseNodeData(node.data);
  const fileType = extractFileType(node.label);
  const linesOfCode = (data.linesOfCode as number) || undefined;
  const path = (data.filePath as string) || (data.path as string) || node.label;
  const isExternal = isExternalFile(path);

  return {
    id: node.id,
    name: node.label,
    type: node.type,
    fileType,
    linesOfCode,
    path,
    color: fileType ? getFileTypeColor(fileType) : FILE_TYPE_COLORS.default,
    size: calculateNodeSize(linesOfCode),
    isExternal,
  };
}

function transformEdge(edge: GraphEdge, nodes: ForceGraphNode[]): ForceGraphLink {
  const data = parseEdgeData(edge.data);

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const isExternal = sourceNode?.isExternal || targetNode?.isExternal || false;

  return {
    source: edge.source,
    target: edge.target,
    type: edge.type,
    color: isExternal ? "#94a3b8" : "#3b82f6",
    isExternal,
  };
}

export function transformGraphData(graph: DependencyGraph): ForceGraphData {
  const nodes = graph.nodes.map(transformNode);
  const links = graph.edges.map((edge) => transformEdge(edge, nodes));

  return {
    nodes,
    links,
  };
}

export function filterGraphData(
  data: ForceGraphData,
  options: {
    includeExternal?: boolean;
    fileTypes?: string[];
  }
): ForceGraphData {
  let filteredNodes = data.nodes;

  if (options.includeExternal === false) {
    filteredNodes = filteredNodes.filter((node) => !node.isExternal);
  }

  if (options.fileTypes && options.fileTypes.length > 0) {
    filteredNodes = filteredNodes.filter((node) =>
      node.fileType ? options.fileTypes?.includes(node.fileType) : false
    );
  }

  const nodeIds = new Set(filteredNodes.map((n) => n.id));

  const filteredLinks = data.links.filter(
    (link) =>
      nodeIds.has(link.source as string) && nodeIds.has(link.target as string)
  );

  return {
    nodes: filteredNodes,
    links: filteredLinks,
  };
}
