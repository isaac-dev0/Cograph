import type {
  DependencyGraph,
  GraphNode,
  GraphEdge,
} from "@/lib/interfaces/graph.interfaces";
import { parseFileNodeData } from "@/lib/interfaces/graph.interfaces";

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

const EXTERNAL_PATH_MARKER = "node_modules";
const SCOPED_PACKAGE_PREFIX = "@";

const NODE_SIZE_MIN = 3;
const NODE_SIZE_MAX = 15;
const NODE_SIZE_LOC_CAP = 1_000;
const NODE_SIZE_DEFAULT = 5;

function isExternalFile(path: string): boolean {
  return (
    path.includes(EXTERNAL_PATH_MARKER) ||
    path.startsWith(SCOPED_PACKAGE_PREFIX)
  );
}

/** Maps lines-of-code to a relative node size between NODE_SIZE_MIN and NODE_SIZE_MAX. */
function calculateNodeSize(linesOfCode?: number): number {
  if (!linesOfCode) return NODE_SIZE_DEFAULT;
  const normalised = Math.min(linesOfCode, NODE_SIZE_LOC_CAP);
  return (
    NODE_SIZE_MIN +
    (normalised / NODE_SIZE_LOC_CAP) * (NODE_SIZE_MAX - NODE_SIZE_MIN)
  );
}

function transformNode(node: GraphNode): ForceGraphNode {
  const data = parseFileNodeData(node.data);
  const rawFileType = data.fileType || extractFileType(node.label);
  const fileType = rawFileType ? normaliseFileType(rawFileType) : undefined;
  const linesOfCode = data.linesOfCode || undefined;
  const path = data.filePath || data.path || node.label;
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

function transformEdge(
  edge: GraphEdge,
  nodes: ForceGraphNode[],
): ForceGraphLink {
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
 * Entity nodes (FUNCTION / CLASS / INTERFACE) are excluded: they have no IMPORTS edges
 * so they would appear as isolated orphan nodes in the force graph. Their details are
 * surfaced instead through the file details panel when a file node is selected.
 */
export function transformGraphData(graph: DependencyGraph): ForceGraphData {
  const fileNodes = graph.nodes.filter((node) => node.type === "FILE");

  const seenIds = new Set<string>();
  const uniqueFileNodes = fileNodes.filter((node) => {
    if (seenIds.has(node.id)) return false;
    seenIds.add(node.id);
    return true;
  });

  const nodes = uniqueFileNodes.map(transformNode);
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
