"use client";

import { useState, useMemo } from "react";
import {
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Pause,
  Play,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ForceGraphNode } from "../utils/graphDataTransform";

interface GraphControlsProps {
  nodes: ForceGraphNode[];
  onSearch?: (nodeId: string | null) => void;
  onFilterChange?: (fileTypes: string[]) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onRecenter?: () => void;
  onPauseToggle?: (paused: boolean) => void;
  className?: string;
}

const FILE_TYPE_OPTIONS = [
  { value: "ts", label: "TypeScript", color: "#3178c6" },
  { value: "tsx", label: "TSX", color: "#9333ea" },
  { value: "js", label: "JavaScript", color: "#f7df1e" },
  { value: "jsx", label: "JSX", color: "#fb923c" },
  { value: "json", label: "JSON", color: "#64748b" },
  { value: "css", label: "CSS", color: "#1572b6" },
  { value: "html", label: "HTML", color: "#e34f26" },
  { value: "md", label: "Markdown", color: "#22c55e" },
];

export function GraphControls({
  nodes,
  onSearch,
  onFilterChange,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onPauseToggle,
  className = "",
}: GraphControlsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return nodes.filter((node) =>
      node.name.toLowerCase().includes(query) ||
      node.path?.toLowerCase().includes(query)
    );
  }, [nodes, searchQuery]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (!value.trim()) {
      onSearch?.(null);
      return;
    }

    const query = value.toLowerCase();
    const firstMatch = nodes.find((node) =>
      node.name.toLowerCase().includes(query) ||
      node.path?.toLowerCase().includes(query)
    );

    if (firstMatch) {
      onSearch?.(firstMatch.id);
    }
  };

  const handleSelectNode = (nodeId: string) => {
    onSearch?.(nodeId);
    setSearchQuery("");
  };

  const handleFileTypeToggle = (fileType: string) => {
    const newSelected = selectedFileTypes.includes(fileType)
      ? selectedFileTypes.filter((ft) => ft !== fileType)
      : [...selectedFileTypes, fileType];

    setSelectedFileTypes(newSelected);
    onFilterChange?.(newSelected);
  };

  const handleClearFilters = () => {
    setSelectedFileTypes([]);
    onFilterChange?.([]);
  };

  const handlePauseToggle = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    onPauseToggle?.(newPausedState);
  };

  const fileTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const node of nodes) {
      if (node.fileType) {
        counts[node.fileType] = (counts[node.fileType] || 0) + 1;
      }
    }
    return counts;
  }, [nodes]);

  return (
    <div
      className={`bg-background/95 backdrop-blur border rounded-lg shadow-lg ${className}`}
    >
      <div className="md:hidden flex items-center justify-between p-3 border-b">
        <span className="font-semibold text-sm">Graph Controls</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        >
          {isMobileExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div
        className={`p-3 space-y-3 ${isMobileExpanded ? "block" : "hidden md:block"}`}
      >
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Search Files</Label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by filename..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 pr-8 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {filteredNodes.length > 0 && (
            <div className="max-h-32 overflow-y-auto border rounded-md">
              {filteredNodes.slice(0, 5).map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleSelectNode(node.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-b-0"
                >
                  <div className="font-medium truncate">{node.name}</div>
                  {node.path && (
                    <div className="text-xs text-muted-foreground truncate">
                      {node.path}
                    </div>
                  )}
                </button>
              ))}
              {filteredNodes.length > 5 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  +{filteredNodes.length - 5} more results
                </div>
              )}
            </div>
          )}
        </div>

        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Filter by Type</Label>
              <div className="flex items-center gap-2">
                {selectedFileTypes.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Filter className="h-3 w-3" />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            {selectedFileTypes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedFileTypes.map((fileType) => {
                  const option = FILE_TYPE_OPTIONS.find((option) => option.value === fileType);
                  return (
                    <Badge
                      key={fileType}
                      variant="secondary"
                      className="text-xs px-2 py-0.5"
                      style={{
                        backgroundColor: `${option?.color}20`,
                        color: option?.color,
                      }}
                    >
                      {option?.label || fileType}
                    </Badge>
                  );
                })}
              </div>
            )}

            <CollapsibleContent className="space-y-1">
              {FILE_TYPE_OPTIONS.map((option) => {
                const count = fileTypeCounts[option.value] || 0;
                if (count === 0) return null;

                return (
                  <label
                    key={option.value}
                    className="flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedFileTypes.includes(option.value)}
                        onChange={() => handleFileTypeToggle(option.value)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: option.color }}
                      />
                      <span className="text-sm">{option.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </label>
                );
              })}
            </CollapsibleContent>
          </div>
        </Collapsible>

        <div className="border-t" />

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Navigation</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onZoomIn}
              className="h-9 text-xs"
            >
              <ZoomIn className="h-4 w-4 mr-1" />
              Zoom In
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onZoomOut}
              className="h-9 text-xs"
            >
              <ZoomOut className="h-4 w-4 mr-1" />
              Zoom Out
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRecenter}
            className="w-full h-9 text-xs"
          >
            <Maximize2 className="h-4 w-4 mr-1" />
            Recenter Graph
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Performance</Label>
          <Button
            variant={isPaused ? "default" : "outline"}
            size="sm"
            onClick={handlePauseToggle}
            className="w-full h-9 text-xs"
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4 mr-1" />
                Resume Animation
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pause Animation
              </>
            )}
          </Button>
        </div>

        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Total Nodes:</span>
              <span className="font-medium">{nodes.length}</span>
            </div>
            {selectedFileTypes.length > 0 && (
              <div className="flex justify-between">
                <span>Filtered:</span>
                <span className="font-medium">
                  {nodes.filter((node) =>
                    node.fileType ? selectedFileTypes.includes(node.fileType) : false
                  ).length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
