import type { ForceGraphNode } from "./graphDataTransform";

const FILE_TYPE_ICONS: Record<string, string> = {
  ts: "TS",
  tsx: "TX",
  js: "JS",
  jsx: "JX",
  json: "{}",
  css: "CSS",
  scss: "SC",
  html: "H",
  md: "MD",
  default: "F",
};

function getFileTypeIcon(fileType?: string): string {
  if (!fileType) return FILE_TYPE_ICONS.default;
  const normalized = fileType.toLowerCase();
  return FILE_TYPE_ICONS[normalized] || FILE_TYPE_ICONS.default;
}

function formatLineCount(lines: number): string {
  if (lines < 1000) return lines.toString();
  if (lines < 10000) return `${(lines / 1000).toFixed(1)}K`;
  return `${Math.floor(lines / 1000)}K`;
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fillColor: string,
  options?: {
    strokeColor?: string;
    strokeWidth?: number;
    glow?: boolean;
    glowColor?: string;
  }
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);

  ctx.fillStyle = fillColor;
  ctx.fill();

  if (options?.strokeColor && options?.strokeWidth) {
    ctx.strokeStyle = options.strokeColor;
    ctx.lineWidth = options.strokeWidth;
    ctx.stroke();
  }
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  fontWeight: string = "bold"
) {
  ctx.font = `${fontWeight} ${fontSize}px Sans-Serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  radius: number,
  backgroundColor: string,
  textColor: string,
  fontSize: number
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = backgroundColor;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 0.5;
  ctx.stroke();
  drawCenteredText(ctx, text, x, y, fontSize, textColor, "bold");
}

interface RenderCache {
  icon?: string;
  formattedLineCount?: string;
  lastFileType?: string;
  lastLinesOfCode?: number;
}

const nodeCache = new Map<string, RenderCache>();

function getNodeCache(nodeId: string): RenderCache {
  if (!nodeCache.has(nodeId)) {
    nodeCache.set(nodeId, {});
  }
  return nodeCache.get(nodeId)!;
}

/**
 * Custom node rendering function for ForceGraph
 *
 * @param node - The node to render
 * @param ctx - Canvas rendering context
 * @param globalScale - Current zoom scale
 * @param hoveredNodeId - ID of currently hovered node (for hover effect)
 * @param selectedNodeId - ID of currently selected node (for selection effect)
 */
export function renderNode(
  node: ForceGraphNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  hoveredNodeId?: string | null,
  selectedNodeId?: string | null
): void {
  const x = node.x || 0;
  const y = node.y || 0;
  const baseSize = node.size || 5;

  const isHovered = hoveredNodeId === node.id;
  const isSelected = selectedNodeId === node.id;

  const scale = isHovered ? 1.2 : 1;
  const nodeSize = baseSize * scale;

  const cache = getNodeCache(node.id);

  if (cache.lastFileType !== node.fileType) {
    cache.icon = getFileTypeIcon(node.fileType);
    cache.lastFileType = node.fileType;
  }

  if (cache.lastLinesOfCode !== node.linesOfCode && node.linesOfCode) {
    cache.formattedLineCount = formatLineCount(node.linesOfCode);
    cache.lastLinesOfCode = node.linesOfCode;
  }

  const icon = cache.icon || "F";
  const nodeColor = node.color || "#6366f1";

  drawCircle(ctx, x, y, nodeSize, nodeColor, {
    strokeColor: isSelected ? "#ffffff" : isHovered ? "#ffffff" : undefined,
    strokeWidth: isSelected ? 3 / globalScale : isHovered ? 2 / globalScale : 0,
    glow: isSelected,
    glowColor: isSelected ? nodeColor : undefined,
  });

  const iconFontSize = Math.max(8, nodeSize * 0.6) / globalScale;
  drawCenteredText(
    ctx,
    icon,
    x,
    y,
    iconFontSize,
    "#ffffff",
    "bold"
  );

  const labelFontSize = Math.max(10, 12 / globalScale);
  const labelY = y + nodeSize + labelFontSize + 2 / globalScale;

  ctx.font = `${labelFontSize}px Sans-Serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 3;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(node.name, x, labelY);
  ctx.shadowBlur = 0;

  if (node.linesOfCode && cache.formattedLineCount) {
    const badgeRadius = Math.max(6, nodeSize * 0.35);
    const badgeX = x + nodeSize * 0.6;
    const badgeY = y - nodeSize * 0.6;
    const badgeFontSize = Math.max(6, badgeRadius * 1.2) / globalScale;

    drawBadge(
      ctx,
      cache.formattedLineCount,
      badgeX,
      badgeY,
      badgeRadius,
      "#1f2937",
      "#f3f4f6",
      badgeFontSize
    );
  }

  if (node.isExternal) {
    const markerSize = 2 / globalScale;
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(x - nodeSize, y - nodeSize, markerSize, markerSize);
  }
}

export function clearRenderCache(): void {
  nodeCache.clear();
}

export function createNodeRenderer(
  hoveredNodeId?: string | null,
  selectedNodeId?: string | null
) {
  return (
    node: ForceGraphNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    renderNode(node, ctx, globalScale, hoveredNodeId, selectedNodeId);
  };
}
