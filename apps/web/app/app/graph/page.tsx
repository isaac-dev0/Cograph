"use client";

import { useState, useCallback } from "react";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { GraphErrorBoundary } from "@/components/graph/GraphErrorBoundary";
import { FileDetailsPanel } from "@/components/graph/sidebar/FileDetailsPanel";
import { useRepository } from "@/hooks/providers/RepositoryProvider";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Loader2, GitGraph } from "lucide-react";
import type {
  ForceGraphNode,
  ForceGraphData,
} from "@/components/graph/utils/graphDataTransform";
import { transformGraphData } from "@/components/graph/utils/graphDataTransform";
import type { CodeEntity, DependencyGraph } from "@/lib/queries/GraphQueries";
import { FILE_DEPENDENCIES_QUERY } from "@/lib/queries/GraphQueries";
import { graphqlRequest } from "@/lib/graphql/client";

export default function GraphPage() {
  const { currentRepository, isLoading } = useRepository();
  const [selectedNode, setSelectedNode] = useState<ForceGraphNode | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [subgraphData, setSubgraphData] = useState<ForceGraphData | null>(null);

  const handleNodeClick = useCallback((node: ForceGraphNode) => {
    setSelectedNode(node);
    setPanelOpen(true);
  }, []);

  const handleEntityClick = useCallback((_entity: CodeEntity) => {}, []);

  const handleFileSelect = useCallback((fileId: string) => {
    setSelectedNode(
      (previous) =>
        ({
          ...(previous ?? {}),
          id: fileId,
          name: fileId.split("/").pop() ?? fileId,
        }) as ForceGraphNode,
    );
    setPanelOpen(true);
  }, []);

  const handleFocusSubgraph = useCallback(async (fileId: string) => {
    try {
      const result = await graphqlRequest<{
        fileDependencies: DependencyGraph;
      }>(FILE_DEPENDENCIES_QUERY, { fileId, options: { maxDepth: 2 } });
      setSubgraphData(transformGraphData(result.fileDependencies));
    } catch (err) {
      console.error("Failed to fetch subgraph:", err);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading repository...</p>
        </div>
      </div>
    );
  }

  if (!currentRepository) {
    return (
      <>
        <GraphHeader />
        <div className="flex flex-1 items-center justify-center animate-fade-in">
          <div className="text-center space-y-3">
            <div className="mx-auto flex size-10 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25">
              <GitGraph className="size-4 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                No repository selected
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Select a repository from the sidebar to view its graph
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GraphHeader repoName={currentRepository.name} />

      <div className="flex-1 relative overflow-hidden">
        <GraphErrorBoundary>
          <GraphCanvas
            repositoryId={currentRepository.id}
            onNodeClick={handleNodeClick}
            overrideData={subgraphData}
            onExitSubgraphView={() => setSubgraphData(null)}
            showControls={true}
            className="w-full h-full"
          />
        </GraphErrorBoundary>
      </div>

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="right" className="lg:max-w-3xl p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b">
            <SheetTitle className="text-sm truncate">
              {selectedNode?.name ?? "File Details"}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground truncate">
              {selectedNode?.path ?? ""}
            </SheetDescription>
          </SheetHeader>
          {selectedNode && (
            <FileDetailsPanel
              fileId={selectedNode.id}
              repositoryUrl={currentRepository.repositoryUrl}
              onEntityClick={handleEntityClick}
              onFileSelect={handleFileSelect}
              onFocusSubgraph={handleFocusSubgraph}
              canEdit={true}
              className="flex-1 overflow-hidden"
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function GraphHeader({ repoName }: { repoName?: string }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-4" />
      {repoName ? (
        <>
          <span className="text-sm font-medium">{repoName}</span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs text-muted-foreground">Graph</span>
        </>
      ) : (
        <span className="text-sm font-medium">Dependency Graph</span>
      )}
    </header>
  );
}
