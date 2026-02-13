import type { ForceGraphNode } from "./graphDataTransform";
import { getFileTypeColor } from "./graphDataTransform";

export const DOT_SPACING = 24;
export const DOT_RADIUS = 0.6;
export const NODE_HEIGHT = 22;
export const NODE_PADDING_X = 10;
export const FONT_SIZE = 10;
export const FONT_FAMILY = "'Geist Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace";
export const LINK_COLOR = "rgba(59, 130, 246, 0.35)";
export const LINK_ARROW_COLOR = "rgba(59, 130, 246, 0.5)";
export const D3_CHARGE_STRENGTH = -300;
export const D3_LINK_DISTANCE = 120;

/**
 * Draws a subtle dot-grid background across the visible canvas area.
 *
 * The grid is aligned to world-space coordinates so it stays fixed when the
 * user pans, giving a "graph paper" feel without distracting from the nodes.
 */
export function drawDotGrid(ctx: CanvasRenderingContext2D, _globalScale: number) {
  const { width, height } = ctx.canvas;

  const transform = ctx.getTransform();
  const offsetX = transform.e;
  const offsetY = transform.f;
  const scale = transform.a;

  const spacing = DOT_SPACING;
  const startX = Math.floor(-offsetX / scale / spacing) * spacing - spacing;
  const startY = Math.floor(-offsetY / scale / spacing) * spacing - spacing;
  const endX = startX + width / scale + spacing * 2;
  const endY = startY + height / scale + spacing * 2;

  ctx.save();
  ctx.fillStyle = "rgba(128, 128, 128, 0.15)";

  for (let x = startX; x < endX; x += spacing) {
    for (let y = startY; y < endY; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS / scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draws a rounded rectangle (badge shape) for a file node.
 *
 * Each badge has two regions: a coloured extension pill on the left (e.g. "TSX")
 * and a filename label on the right. A glow effect is added when hovered.
 */
export function drawBadgeNode(
node: ForceGraphNode, ctx: CanvasRenderingContext2D, globalScale: number, isHovered: boolean,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const ext = node.fileType?.toUpperCase() || "FILE";
  const label = node.name;
  const color = node.color || getFileTypeColor(node.fileType || "");

  ctx.save();
  ctx.font = `500 ${FONT_SIZE}px ${FONT_FAMILY}`;

  const extWidth = ctx.measureText(ext).width;
  const labelWidth = ctx.measureText(label).width;
  const totalWidth = extWidth + labelWidth + NODE_PADDING_X * 3 + 2;
  const halfWidth = totalWidth / 2;
  const halfHeight = NODE_HEIGHT / 2;
  const radius = halfHeight;

  if (isHovered) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
  }

  ctx.beginPath();
  ctx.roundRect(x - halfWidth, y - halfHeight, totalWidth, NODE_HEIGHT, radius);
  ctx.fillStyle = isHovered ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.06)";
  ctx.fill();
  ctx.strokeStyle = isHovered ? `${color}88` : "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const extBadgeWidth = extWidth + NODE_PADDING_X;
  ctx.beginPath();
  ctx.roundRect(x - halfWidth + 2, y - halfHeight + 2, extBadgeWidth, NODE_HEIGHT - 4, radius - 2);
  ctx.fillStyle = `${color}22`;
  ctx.fill();

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ext, x - halfWidth + 2 + extBadgeWidth / 2, y + 0.5);

  ctx.fillStyle = isHovered ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.7)";
  ctx.textAlign = "left";
  ctx.fillText(label, x - halfWidth + extBadgeWidth + NODE_PADDING_X, y + 0.5);

  ctx.restore();
}

/**
 * Estimates badge width from character count.
 *
 * Avoids calling `ctx.measureText` during hit-test canvas paints (which is
 * expensive). The approximation is close enough for click detection.
 */
export function estimateBadgeWidth(node: ForceGraphNode): number {
  const ext = node.fileType?.toUpperCase() || "FILE";
  const charWidth = FONT_SIZE * 0.65;
  return (ext.length + node.name.length) * charWidth + NODE_PADDING_X * 3 + 16;
}
