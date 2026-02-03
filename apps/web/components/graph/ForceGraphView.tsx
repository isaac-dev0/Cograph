"use client";

import { ForceGraph2D } from "react-force-graph";
import { useEffect, useRef, useState } from "react";

interface Node {
  id: string;
  name: string;
}

interface Link {
  source: string;
  target: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

// Sample test data for the force-directed graph
const sampleData: GraphData = {
  nodes: [
    { id: "1", name: "Node 1" },
    { id: "2", name: "Node 2" },
    { id: "3", name: "Node 3" },
    { id: "4", name: "Node 4" },
    { id: "5", name: "Node 5" },
  ],
  links: [
    { source: "1", target: "2" },
    { source: "1", target: "3" },
    { source: "2", target: "4" },
    { source: "3", target: "4" },
    { source: "4", target: "5" },
  ],
};

interface ForceGraphViewProps {
  data?: GraphData;
  width?: number;
  height?: number;
}

export function ForceGraphView({
  data = sampleData,
  width,
  height = 600,
}: ForceGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setDimensions({
            width: entry.contentRect.width,
            height: height,
          });
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => resizeObserver.disconnect();
    }
  }, [height]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraph2D
        graphData={data}
        width={width || dimensions.width}
        height={dimensions.height}
        nodeLabel="name"
        nodeAutoColorBy="id"
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
      />
    </div>
  );
}
