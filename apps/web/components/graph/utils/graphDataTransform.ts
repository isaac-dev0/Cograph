import type { DependencyGraph, GraphNode, GraphEdge } from "@/lib/types/graph";

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

const FILE_TYPE_NORMALISE: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
};

/** Returns the display colour for a given file extension. */
export function getFileTypeColor(fileType: string): string {
  const normalized = fileType.toLowerCase().replace(/^\./, "");
  return FILE_TYPE_COLORS[normalized] || FILE_TYPE_COLORS.default;
}

/** Extracts the file extension from a filename (e.g. "app.tsx" → "tsx"). */
function extractFileType(label: string): string | undefined {
  const match = label.match(/\.([^.]+)$/);
  return match ? match[1] : undefined;
}

/** Normalises long-form type names ("typescript" → "ts"). */
function normaliseFileType(type: string): string {
  const lower = type.toLowerCase();
  return FILE_TYPE_NORMALISE[lower] || lower;
}

function isExternalFile(path: string): boolean {
  return path.includes("node_modules") || path.startsWith("@");
}

/** Maps lines-of-code to a relative node size between 3 and 15. */
function calculateNodeSize(linesOfCode?: number): number {
  if (!linesOfCode) return 5;
  const normalised = Math.min(linesOfCode, 1000);
  return 3 + (normalised / 1000) * 12;
}

function parseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ── Transformers ────────────────────────────────────────────────────────────

function transformNode(node: GraphNode): ForceGraphNode {
  const data = parseJson(node.data);
  const rawFileType = (data.fileType as string) || extractFileType(node.label);
  const fileType = rawFileType ? normaliseFileType(rawFileType) : undefined;
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
  const sourceNode = nodes.find((node) => node.id === edge.source);
  const targetNode = nodes.find((node) => node.id === edge.target);
  const isExternal = sourceNode?.isExternal || targetNode?.isExternal || false;

  return {
    source: edge.source,
    target: edge.target,
    type: edge.type,
    color: isExternal ? "#94a3b8" : "#3b82f6",
    isExternal,
  };
}

/**
 * Converts an API dependency graph into the format expected by react-force-graph.
 * Only file nodes are included — entity nodes are available via the file details panel.
 */
export function transformGraphData(graph: DependencyGraph): ForceGraphData {
  const fileNodes = graph.nodes.filter((node) => node.type.toLowerCase() === "file");
  const nodes = fileNodes.map(transformNode);
  const links = graph.edges.map((edge) => transformEdge(edge, nodes));
  return { nodes, links };
}

/**
 * Applies client-side filters to a transformed graph dataset.
 * Returns only nodes matching the specified file types and their connecting links.
 */
export function filterGraphData(
  data: ForceGraphData,
  options: { includeExternal?: boolean; fileTypes?: string[] },
): ForceGraphData {
  let filteredNodes = data.nodes;

  if (options.includeExternal === false) {
    filteredNodes = filteredNodes.filter((node) => !node.isExternal);
  }

  if (options.fileTypes?.length) {
    filteredNodes = filteredNodes.filter(
      (node) => node.fileType && options.fileTypes!.includes(node.fileType),
    );
  }

  const nodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredLinks = data.links.filter(
    (link) =>
      nodeIds.has(link.source as string) && nodeIds.has(link.target as string),
  );

  return { nodes: filteredNodes, links: filteredLinks };
}
