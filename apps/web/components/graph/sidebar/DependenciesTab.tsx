"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, Focus, ArrowRight, ArrowLeft, AlertTriangle, type LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  FILE_DEPENDENCIES_QUERY,
  FILE_DEPENDENTS_QUERY,
  CIRCULAR_DEPENDENCIES_QUERY,
} from "@/lib/queries/GraphQueries";
import type { GraphNode, CircularDependency, DependencyGraph } from "@/lib/interfaces/graph.interfaces";
import { toast } from "sonner";

interface DependenciesTabProps {
  neo4jFileId: string;
  repositoryId: string;
  onFileSelect?: (fileId: string) => void;
  onFocusSubgraph?: (fileId: string) => void;
}

/**
 * Displays the direct imports and dependents of a file, and lets the user
 * check for circular dependency cycles within the repository.
 */
export function DependenciesTab({
  neo4jFileId,
  repositoryId,
  onFileSelect,
  onFocusSubgraph,
}: DependenciesTabProps) {
  const [dependencies, setDependencies] = useState<GraphNode[]>([]);
  const [dependents, setDependents] = useState<GraphNode[]>([]);
  const [cyclesForFile, setCyclesForFile] = useState<CircularDependency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCyclesChecked, setIsCyclesChecked] = useState(false);
  const [isCyclesLoading, setIsCyclesLoading] = useState(false);
  const [isCyclesModalOpen, setIsCyclesModalOpen] = useState(false);

  const fetchDependencyData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsCyclesChecked(false);
    setCyclesForFile([]);
    try {
      const [depsResult, dependentsResult] = await Promise.all([
        graphqlRequest<{ fileDependencies: DependencyGraph }>(
          FILE_DEPENDENCIES_QUERY,
          { fileId: neo4jFileId, options: { maxDepth: 1 } },
        ),
        graphqlRequest<{ fileDependents: DependencyGraph }>(
          FILE_DEPENDENTS_QUERY,
          { fileId: neo4jFileId, options: { maxDepth: 1 } },
        ),
      ]);

      setDependencies(
        depsResult.fileDependencies.nodes.filter((node) => node.id !== neo4jFileId),
      );
      setDependents(
        dependentsResult.fileDependents.nodes.filter((node) => node.id !== neo4jFileId),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dependencies");
    } finally {
      setIsLoading(false);
    }
  }, [neo4jFileId]);

  const checkForCycles = useCallback(async () => {
    setIsCyclesLoading(true);
    try {
      const result = await graphqlRequest<{ circularDependencies: CircularDependency[] }>(
        CIRCULAR_DEPENDENCIES_QUERY,
        { repositoryId },
      );
      setCyclesForFile(
        result.circularDependencies.filter((cycle) => cycle.cycle.includes(neo4jFileId)),
      );
    } catch (err) {
      console.error("Failed to check for circular dependencies:", err);
      toast.error("Failed to check for cycles. Please try again.");
    } finally {
      setIsCyclesLoading(false);
      setIsCyclesChecked(true);
    }
  }, [neo4jFileId, repositoryId]);

  useEffect(() => {
    fetchDependencyData();
  }, [fetchDependencyData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 text-center space-y-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button onClick={fetchDependencyData} size="sm" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      {onFocusSubgraph && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => onFocusSubgraph(neo4jFileId)}
        >
          <Focus className="h-4 w-4" />
          Focus subgraph
        </Button>
      )}

      <div className="space-y-2">
        <SectionHeader icon={ArrowRight} title="Imports" count={dependencies.length} />
        {dependencies.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">No imports found</p>
        ) : (
          <div className="space-y-1">
            {dependencies.map((node) => (
              <DependencyRow key={node.id} node={node} onSelect={onFileSelect} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <SectionHeader icon={ArrowLeft} title="Imported by" count={dependents.length} />
        {dependents.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">Not imported by any file</p>
        ) : (
          <div className="space-y-1">
            {dependents.map((node) => (
              <DependencyRow key={node.id} node={node} onSelect={onFileSelect} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <SectionHeader icon={AlertTriangle} title="Circular dependencies" />
        {!isCyclesChecked ? (
          <button
            onClick={checkForCycles}
            disabled={isCyclesLoading}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCyclesLoading ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            )}
            {isCyclesLoading ? "Checking…" : "Check for cycles"}
          </button>
        ) : cyclesForFile.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">No cycles detected</p>
        ) : (
          <button
            onClick={() => setIsCyclesModalOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-xs text-yellow-400 hover:bg-yellow-500/10 transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {cyclesForFile.length} cycle{cyclesForFile.length !== 1 ? "s" : ""} detected — view details
          </button>
        )}
      </div>

      {isCyclesModalOpen && (
        <CircularDependenciesModal
          cycles={cyclesForFile}
          onClose={() => setIsCyclesModalOpen(false)}
        />
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: LucideIcon;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </span>
      {count !== undefined && (
        <Badge variant="secondary" className="ml-auto text-xs px-2 py-0.5 h-5 font-mono">
          {count}
        </Badge>
      )}
    </div>
  );
}

function DependencyRow({
  node,
  onSelect,
}: {
  node: GraphNode;
  onSelect?: (fileId: string) => void;
}) {
  const isClickable = !!onSelect;

  return (
    <button
      onClick={isClickable ? () => onSelect!(node.id) : undefined}
      disabled={!isClickable}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
        isClickable ? "hover:bg-accent/50 cursor-pointer" : "cursor-default"
      }`}
    >
      <span className="font-mono text-xs text-muted-foreground/50 shrink-0">
        {node.label.split(".").pop()?.toUpperCase() || "FILE"}
      </span>
      <span className="truncate text-sm">{node.label}</span>
    </button>
  );
}

function CircularDependenciesModal({
  cycles,
  onClose,
}: {
  cycles: CircularDependency[];
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            Circular Dependencies
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {cycles.map((cycle, index) => (
            <div
              key={index}
              className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">Cycle {index + 1}</span>
                <span className="text-muted-foreground/50">•</span>
                <span>{cycle.cycle.length} files</span>
              </div>
              <div className="space-y-1">
                {cycle.cycle.map((fileId, fileIndex) => {
                  const path = fileId.split("-").slice(2).join("-");
                  return (
                    <div key={fileIndex} className="flex items-center gap-2">
                      {fileIndex > 0 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0 ml-2" />
                      )}
                      <span className="text-xs font-mono text-muted-foreground truncate">
                        {path}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
