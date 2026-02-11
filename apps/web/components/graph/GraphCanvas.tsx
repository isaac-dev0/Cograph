"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useGraphData } from "@/hooks/useGraphData";
import { GraphControls } from "./controls/GraphControls";
import { GraphStatsWidget } from "./GraphStatsWidget";
import { Loader2, PlayCircle, RefreshCw, Terminal, SlidersHorizontal, X, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { GraphOptionsInput } from "@/lib/types/graph";
import type { ForceGraphData, ForceGraphNode } from "./utils/graphDataTransform";
import { getFileTypeColor } from "./utils/graphDataTransform";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface GraphCanvasProps {
  repositoryId: string;
  options?: GraphOptionsInput;
  onNodeClick?: (node: ForceGraphNode) => void;
  onNodeHover?: (node: ForceGraphNode | null) => void;
  width?: number;
  height?: number;
  className?: string;
  showControls?: boolean;
}

interface AnalysisState {
  isAnalyzing: boolean;
  analysisError: string | null;
  elapsedSeconds: number;
}

const DOT_SPACING = 24;
const DOT_RADIUS = 0.6;
const NODE_HEIGHT = 22;
const NODE_PADDING_X = 10;
const FONT_SIZE = 10;
const FONT_FAMILY = "'Geist Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace";
const LINK_COLOR = "rgba(59, 130, 246, 0.35)";
const LINK_ARROW_COLOR = "rgba(59, 130, 246, 0.5)";

/** Draws a subtle dot-grid background across the visible canvas area. */
function drawDotGrid(ctx: CanvasRenderingContext2D, globalScale: number) {
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

/** Draws a rounded rectangle (badge shape) for a file node. */
function drawBadgeNode(
  node: ForceGraphNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  isHovered: boolean,
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

/** Estimates badge width from character count (avoids measureText in hit-test canvas). */
function estimateBadgeWidth(node: ForceGraphNode): number {
  const ext = node.fileType?.toUpperCase() || "FILE";
  const charWidth = FONT_SIZE * 0.65;
  return (ext.length + node.name.length) * charWidth + NODE_PADDING_X * 3 + 16;
}

/**
 * Full-featured graph visualisation canvas with controls, analysis trigger,
 * and progressive loading. Wraps react-force-graph-2d with project-specific
 * data fetching via the useGraphData hook.
 */
export function GraphCanvas({
  repositoryId,
  options,
  onNodeClick,
  onNodeHover,
  width,
  height = 600,
  className = "",
  showControls = true,
}: GraphCanvasProps) {
  const {
    graphData,
    displayData,
    isLoading,
    error,
    analysis,
    totalCount,
    loadedCount,
    setFileTypeFilter,
    startAnalysis,
    refresh,
  } = useGraphData(repositoryId, options);

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [connectedNodeIds, setConnectedNodeIds] = useState<Set<string>>(new Set());
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const [isReanalysisConfirmOpen, setIsReanalysisConfirmOpen] = useState(false);

  const isNarrow = dimensions.width < 600;

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height || height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [height]);

  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.d3Force("charge")?.strength(-300);
    graphRef.current.d3Force("link")?.distance(120);
    graphRef.current.d3Force("collide", null);
  }, [graphData]);

  const recenter = useCallback(() => {
    graphRef.current?.zoomToFit(1000, 50);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return;

      const PAN_STEP = 50;
      const currentZoom = graphRef.current?.zoom() || 1;
      const currentPos = graphRef.current?.centerAt() || { x: 0, y: 0 };

      if (e.key === "ArrowUp") {
        e.preventDefault();
        graphRef.current?.centerAt(currentPos.x, currentPos.y - PAN_STEP / currentZoom, 200);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        graphRef.current?.centerAt(currentPos.x, currentPos.y + PAN_STEP / currentZoom, 200);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        graphRef.current?.centerAt(currentPos.x - PAN_STEP / currentZoom, currentPos.y, 200);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        graphRef.current?.centerAt(currentPos.x + PAN_STEP / currentZoom, currentPos.y, 200);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        recenter();
      } else if (e.ctrlKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        setIsReanalysisConfirmOpen(true);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!isFocused || !e.ctrlKey) return;
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      graphRef.current?.zoom(graphRef.current.zoom() * zoomFactor, 100);
    };

    container.addEventListener("keydown", handleKeyDown);
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      container.removeEventListener("wheel", handleWheel);
    };
  }, [isFocused, recenter, startAnalysis]);

  const handleNodeClick = useCallback(
    (node: any) => onNodeClick?.(node as ForceGraphNode),
    [onNodeClick],
  );

  const findConnectedNodes = useCallback(
    (nodeId: string, graphData: ForceGraphData): Set<string> => {
      const connected = new Set<string>();
      const queue = [nodeId];
      connected.add(nodeId);

      while (queue.length > 0) {
        const current = queue.shift()!;

        for (const link of graphData.links) {
          const sourceId = typeof link.source === "object" ? link.source.id : link.source;
          const targetId = typeof link.target === "object" ? link.target.id : link.target;

          if (sourceId === current && !connected.has(targetId)) {
            connected.add(targetId);
            queue.push(targetId);
          } else if (targetId === current && !connected.has(sourceId)) {
            connected.add(sourceId);
            queue.push(sourceId);
          }
        }
      }

      return connected;
    },
    [],
  );

  const handleNodeHover = useCallback(
    (node: ForceGraphNode | null) => {
      setHoveredNodeId(node?.id ?? null);

      if (node && displayData) {
        const connected = findConnectedNodes(node.id, displayData);
        setConnectedNodeIds(connected);
      } else {
        setConnectedNodeIds(new Set());
      }

      onNodeHover?.(node);
    },
    [onNodeHover, displayData, findConnectedNodes],
  );

  const handleSearch = useCallback(
    (nodeId: string | null) => {
      if (!nodeId || !graphRef.current) return;
      const node = displayData?.nodes.find((node) => node.id === nodeId);
      if (node?.x !== undefined && node?.y !== undefined) {
        graphRef.current.centerAt(node.x, node.y, 1000);
        graphRef.current.zoom(3, 1000);
      }
    },
    [displayData],
  );

  const zoomIn = useCallback(() => {
    graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 300);
  }, []);

  const zoomOut = useCallback(() => {
    graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 300);
  }, []);

  const togglePause = useCallback((paused: boolean) => {
    if (paused) graphRef.current?.pauseAnimation();
    else graphRef.current?.resumeAnimation();
  }, []);

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const forceNode = node as ForceGraphNode;
      const isHovered = forceNode.id === hoveredNodeId;
      const isDimmed = hoveredNodeId && !connectedNodeIds.has(forceNode.id);

      if (isDimmed) {
        ctx.globalAlpha = 0.15;
      }

      drawBadgeNode(forceNode, ctx, globalScale, isHovered);

      if (isDimmed) {
        ctx.globalAlpha = 1;
      }
    },
    [hoveredNodeId, connectedNodeIds],
  );

  const nodePointerAreaPaint = useCallback(
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      const forceNode = node as ForceGraphNode;
      const x = forceNode.x ?? 0;
      const y = forceNode.y ?? 0;
      const w = estimateBadgeWidth(forceNode);
      const h = NODE_HEIGHT + 8;
      ctx.fillStyle = color;
      ctx.fillRect(x - w / 2, y - h / 2, w, h);
    },
    [],
  );

  const onRenderFramePre = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      drawDotGrid(ctx, globalScale);
    },
    [],
  );

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center bg-background ${className}`}
        style={{ width: width || "100%", height }}
      >
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center ${className}`}
        style={{ width: width || "100%", height }}
      >
        <div className="flex flex-col items-center gap-3 text-center animate-fade-in">
          <p className="text-sm font-medium">Failed to load graph</p>
          <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
          <Button onClick={refresh} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!graphData?.nodes.length) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center bg-background ${className}`}
        style={{ width: width || "100%", height }}
      >
        <div className="flex flex-col items-center gap-4 max-w-xs text-center animate-fade-in">
          <div className="flex size-10 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25">
            <Terminal className="size-4 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-medium">No graph data</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run an analysis to map this repository&apos;s dependency structure.
            </p>
          </div>

          {analysis.analysisError && (
            <div className="w-full rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
              {analysis.analysisError}
            </div>
          )}

          <Button
            onClick={startAnalysis}
            disabled={analysis.isAnalyzing}
            size="sm"
            className="gap-2"
          >
            {analysis.isAnalyzing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <PlayCircle className="h-3.5 w-3.5" /> Begin Analysis
              </>
            )}
          </Button>

          {analysis.isAnalyzing && <ElapsedTimer seconds={analysis.elapsedSeconds} />}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      role="application"
      aria-label="Dependency graph visualization"
    >
      {showControls && (
        <>
          {isNarrow ? (
            <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
              <Button
                variant="outline"
                size="icon"
                className="glass h-9 w-9"
                onClick={() => setIsControlsOpen((open) => !open)}
                aria-label={isControlsOpen ? "Close graph controls" : "Open graph controls"}
                aria-expanded={isControlsOpen}
              >
                {isControlsOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <SlidersHorizontal className="h-4 w-4" />
                )}
              </Button>
              {isControlsOpen && (
                <GraphControls
                  nodes={graphData.nodes}
                  onSearch={handleSearch}
                  onFilterChange={setFileTypeFilter}
                  onZoomIn={zoomIn}
                  onZoomOut={zoomOut}
                  onRecenter={recenter}
                  onPauseToggle={togglePause}
                  className="w-72"
                />
              )}
            </div>
          ) : (
            <GraphControls
              nodes={graphData.nodes}
              onSearch={handleSearch}
              onFilterChange={setFileTypeFilter}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onRecenter={recenter}
              onPauseToggle={togglePause}
              className="absolute top-3 right-3 w-80 z-10"
            />
          )}
        </>
      )}

      <AnalysisOverlay
        analysis={analysis}
        onRequestStart={() => setIsReanalysisConfirmOpen(true)}
      />
      <NodeCountIndicator loaded={loadedCount} total={totalCount} />
      {!isNarrow && (
        <GraphStatsWidget graphData={displayData} className="absolute bottom-3 right-3 z-10 max-w-xs" />
      )}
      <KeyboardShortcutsHint isFocused={isFocused} />

      <ReanalysisConfirmDialog
        open={isReanalysisConfirmOpen}
        onOpenChange={setIsReanalysisConfirmOpen}
        nodeCount={loadedCount}
        onConfirm={() => {
          setIsReanalysisConfirmOpen(false);
          startAnalysis();
        }}
      />

      <ForceGraph2D
        ref={graphRef}
        graphData={displayData!}
        width={width || dimensions.width}
        height={dimensions.height}
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        linkColor={(link: any) => {
          if (!hoveredNodeId) return LINK_COLOR;
          const sourceId = typeof link.source === "object" ? link.source.id : link.source;
          const targetId = typeof link.target === "object" ? link.target.id : link.target;
          const isConnected = connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId);
          return isConnected ? LINK_COLOR : "rgba(59, 130, 246, 0.08)";
        }}
        linkWidth={1.5}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={() => LINK_ARROW_COLOR}
        linkCurvature={0.15}
        onRenderFramePre={onRenderFramePre}
        enableNodeDrag={false}
        enableZoomInteraction
        enablePanInteraction
        cooldownTicks={100}
        backgroundColor="transparent"
      />
    </div>
  );
}

function AnalysisOverlay({
  analysis,
  onRequestStart,
}: {
  analysis: AnalysisState;
  onRequestStart: () => void;
}) {
  return (
    <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-2 w-56">
      <Button
        variant="outline"
        size="sm"
        onClick={onRequestStart}
        disabled={analysis.isAnalyzing}
        className="gap-2 glass text-xs"
      >
        <RefreshCw
          className={`h-3 w-3 ${analysis.isAnalyzing ? "animate-spin" : ""}`}
        />
        {analysis.isAnalyzing ? "Analysing..." : "Re-analyse"}
      </Button>

      {analysis.isAnalyzing && (
        <div className="glass rounded-md px-3 py-1.5">
          <ElapsedTimer seconds={analysis.elapsedSeconds} />
        </div>
      )}

      {analysis.analysisError && (
        <div className="glass rounded-md px-3 py-1.5 border-destructive/20">
          <p className="text-xs text-destructive">{analysis.analysisError}</p>
        </div>
      )}
    </div>
  );
}

function ElapsedTimer({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="text-muted-foreground">Elapsed</span>
      <span className="font-semibold text-primary">
        {mins}:{secs}
      </span>
    </div>
  );
}

function NodeCountIndicator({ loaded, total }: { loaded: number; total: number }) {
  if (total === 0) return null;

  const showPlus = loaded < total;
  const displayText = showPlus ? `${loaded}+` : `${loaded}`;

  return (
    <div className="absolute top-3 left-3 z-10">
      <div className="glass rounded-md px-3 py-1.5 border border-border/40">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Nodes</span>
          <span className="font-semibold font-mono text-foreground">
            {displayText}
          </span>
          {total > 0 && (
            <span className="text-muted-foreground/60">of {total}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function KeyboardShortcutsHint({ isFocused }: { isFocused: boolean }) {
  if (isFocused) return null;

  return (
    <div className="absolute bottom-3 right-3 z-10">
      <div className="glass rounded-md px-3 py-1.5 text-xs text-muted-foreground/60">
        Click to enable keyboard shortcuts
      </div>
    </div>
  );
}

function ReanalysisConfirmDialog({
  open,
  onOpenChange,
  nodeCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeCount: number;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <DialogTitle>Re-analyse repository?</DialogTitle>
          </div>
          <DialogDescription className="pt-2 space-y-3">
            <span className="block">
              This will delete all current graph data and re-run a full analysis
              from scratch.
            </span>
            {nodeCount > 0 && (
              <span className="block rounded-md bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
                ~{nodeCount} file{nodeCount !== 1 ? "s" : ""} &times; 1 Claude
                API call per file
              </span>
            )}
            <span className="block">
              Analysis for large repositories can take several minutes and
              cannot be cancelled once started.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Re-analyse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
