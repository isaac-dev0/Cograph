"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ForceGraph2D } from "react-force-graph";
import { createClient } from "@/lib/supabase/client";
import {
  REPOSITORY_GRAPH_QUERY,
  type DependencyGraph,
  type GraphOptionsInput,
} from "@/lib/queries/GraphQueries";
import {
  transformGraphData,
  type ForceGraphData,
  type ForceGraphNode,
  type ForceGraphLink,
} from "./utils/graphDataTransform";
import { Spinner } from "@/components/ui/spinner";

interface GraphCanvasProps {
  repositoryId: string;
  options?: GraphOptionsInput;
  onNodeClick?: (node: ForceGraphNode) => void;
  onNodeHover?: (node: ForceGraphNode | null) => void;
  width?: number;
  height?: number;
  className?: string;
}

export function GraphCanvas({
  repositoryId,
  options,
  onNodeClick,
  onNodeHover,
  width,
  height = 600,
  className = "",
}: GraphCanvasProps) {
  const [graphData, setGraphData] = useState<ForceGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });
  const [hoveredNode, setHoveredNode] = useState<ForceGraphNode | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);

  const fetchGraphData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: REPOSITORY_GRAPH_QUERY,
            variables: { repositoryId, options },
          }),
        }
      );

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0]?.message || "Failed to fetch graph data");
      }

      const dependencyGraph: DependencyGraph = data.repositoryGraph;
      const transformedData = transformGraphData(dependencyGraph);

      setGraphData(transformedData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load graph data";
      console.error("Failed to fetch graph data:", err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [repositoryId, options]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [height]);

  const handleNodeClick = useCallback(
    (node: ForceGraphNode) => {
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  const handleNodeHover = useCallback(
    (node: ForceGraphNode | null) => {
      setHoveredNode(node);
      onNodeHover?.(node);
    },
    [onNodeHover]
  );

  const paintNode = useCallback(
    (
      node: ForceGraphNode,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => {
      const label = node.name;
      const fontSize = 12 / globalScale;
      const nodeSize = node.size || 5;

      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, nodeSize, 0, 2 * Math.PI);
      ctx.fillStyle = node.color || "#6366f1";
      ctx.fill();

      if (hoveredNode?.id === node.id) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, node.x || 0, (node.y || 0) + nodeSize + fontSize);
    },
    [hoveredNode]
  );

  const paintLink = useCallback(
    (
      link: ForceGraphLink,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => {
      const start = link.source as ForceGraphNode;
      const end = link.target as ForceGraphNode;

      if (typeof start !== "object" || typeof end !== "object") return;

      ctx.beginPath();
      ctx.moveTo(start.x || 0, start.y || 0);
      ctx.lineTo(end.x || 0, end.y || 0);
      ctx.strokeStyle = link.color || "#3b82f6";
      ctx.lineWidth = (link.isExternal ? 1 : 2) / globalScale;
      ctx.globalAlpha = link.isExternal ? 0.3 : 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const arrowLength = 6 / globalScale;
      const arrowAngle = Math.PI / 6;

      const dx = (end.x || 0) - (start.x || 0);
      const dy = (end.y || 0) - (start.y || 0);
      const angle = Math.atan2(dy, dx);

      const arrowX = (end.x || 0) - (end.size || 5) * Math.cos(angle);
      const arrowY = (end.y || 0) - (end.size || 5) * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle - arrowAngle),
        arrowY - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle + arrowAngle),
        arrowY - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.closePath();
      ctx.fillStyle = link.color || "#3b82f6";
      ctx.fill();
    },
    []
  );

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center ${className}`}
        style={{ width: width || "100%", height }}
      >
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-muted-foreground">Loading graph data...</p>
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
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-destructive">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold">Failed to load graph</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={fetchGraphData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!graphData || (graphData.nodes.length === 0 && graphData.links.length === 0)) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center ${className}`}
        style={{ width: width || "100%", height }}
      >
        <div className="text-center">
          <p className="font-semibold">No graph data available</p>
          <p className="text-sm text-muted-foreground">
            This repository hasn't been analyzed yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={width || dimensions.width}
        height={dimensions.height}
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        nodeLabel={(node) => {
          const n = node as ForceGraphNode;
          return `
            <div style="background: rgba(0,0,0,0.8); padding: 8px; border-radius: 4px; color: white;">
              <div style="font-weight: bold; margin-bottom: 4px;">${n.name}</div>
              ${n.path ? `<div style="font-size: 12px; opacity: 0.8;">${n.path}</div>` : ""}
              ${n.fileType ? `<div style="font-size: 12px;">Type: ${n.fileType.toUpperCase()}</div>` : ""}
              ${n.linesOfCode ? `<div style="font-size: 12px;">Lines: ${n.linesOfCode}</div>` : ""}
              ${n.isExternal ? '<div style="font-size: 12px; color: #fbbf24;">External</div>' : ""}
            </div>
          `;
        }}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        linkCurvature={0.2}
        linkDirectionalArrowLength={0}
        linkDirectionalParticles={0}
        cooldownTicks={100}
        backgroundColor="#000000"
      />

      {hoveredNode && (
        <div className="absolute top-4 left-4 bg-background/95 border rounded-lg p-3 shadow-lg max-w-xs">
          <div className="font-semibold text-sm mb-1">{hoveredNode.name}</div>
          {hoveredNode.path && (
            <div className="text-xs text-muted-foreground mb-2">
              {hoveredNode.path}
            </div>
          )}
          <div className="flex gap-4 text-xs">
            {hoveredNode.fileType && (
              <div>
                <span className="text-muted-foreground">Type:</span>{" "}
                <span className="font-medium">
                  {hoveredNode.fileType.toUpperCase()}
                </span>
              </div>
            )}
            {hoveredNode.linesOfCode && (
              <div>
                <span className="text-muted-foreground">Lines:</span>{" "}
                <span className="font-medium">{hoveredNode.linesOfCode}</span>
              </div>
            )}
          </div>
          {hoveredNode.isExternal && (
            <div className="text-xs text-yellow-500 mt-2">External dependency</div>
          )}
        </div>
      )}
    </div>
  );
}
