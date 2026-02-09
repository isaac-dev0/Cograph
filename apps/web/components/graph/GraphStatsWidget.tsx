"use client";

import { useMemo } from "react";
import { TrendingUp, Network, Activity } from "lucide-react";
import type { ForceGraphData, ForceGraphNode } from "./utils/graphDataTransform";

interface GraphStatsWidgetProps {
  graphData: ForceGraphData | null;
  className?: string;
}

interface NodeStats {
  id: string;
  name: string;
  path: string | undefined;
  connections: number;
}

export function GraphStatsWidget({ graphData, className = "" }: GraphStatsWidgetProps) {
  const stats = useMemo(() => {
    if (!graphData) {
      return {
        totalNodes: 0,
        avgDependencies: 0,
        hotspots: [] as NodeStats[],
      };
    }

    const connectionCount = new Map<string, number>();

    for (const link of graphData.links) {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source;
      const targetId = typeof link.target === "object" ? link.target.id : link.target;

      connectionCount.set(sourceId, (connectionCount.get(sourceId) || 0) + 1);
      connectionCount.set(targetId, (connectionCount.get(targetId) || 0) + 1);
    }

    const nodeStats: NodeStats[] = graphData.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      path: node.path,
      connections: connectionCount.get(node.id) || 0,
    }));

    const uniqueNodeStats = Array.from(
      new Map(nodeStats.map((node) => [node.id, node])).values()
    );

    const hotspots = uniqueNodeStats
      .filter((node) => node.connections > 0)
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 3);

    const totalConnections = Array.from(connectionCount.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    const avgDependencies = graphData.nodes.length > 0
      ? Math.round((totalConnections / graphData.nodes.length) * 10) / 10
      : 0;

    return {
      totalNodes: graphData.nodes.length,
      avgDependencies,
      hotspots,
    };
  }, [graphData]);

  if (!graphData || stats.totalNodes === 0) {
    return null;
  }

  return (
    <div
      className={`glass rounded-lg border border-border/40 p-4 space-y-4 ${className}`}
      role="region"
      aria-label="Graph statistics"
    >
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
        Graph Statistics
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <StatItem
          icon={Network}
          label="Total Nodes"
          value={stats.totalNodes.toString()}
        />
        <StatItem
          icon={TrendingUp}
          label="Avg Dependencies"
          value={stats.avgDependencies.toFixed(1)}
        />
      </div>

      {stats.hotspots.length > 0 && (
        <div className="pt-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground/70 mb-2.5">
            Most Connected Files
          </p>
          <div className="space-y-2">
            {stats.hotspots.map((node, index) => (
              <HotspotItem
                key={`hotspot-${index}`}
                rank={index + 1}
                name={node.name}
                connections={node.connections}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground/60">
        <Icon className="h-3 w-3" aria-hidden="true" />
        <span className="text-[10px] uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <p className="text-lg font-bold font-mono" aria-label={`${label}: ${value}`}>
        {value}
      </p>
    </div>
  );
}

function HotspotItem({
  rank,
  name,
  connections,
}: {
  rank: number;
  name: string;
  connections: number;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="shrink-0 text-xs" role="img" aria-label={`Rank ${rank}`}>
        {rank}
      </span>
      <span className="truncate flex-1 font-medium" title={name}>
        {name}
      </span>
      <span className="shrink-0 font-mono text-muted-foreground/60">
        {connections}
      </span>
    </div>
  );
}
