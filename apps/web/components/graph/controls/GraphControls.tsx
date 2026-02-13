"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  { value: "ts", label: "TS", color: "#3178c6" },
  { value: "tsx", label: "TSX", color: "#9333ea" },
  { value: "js", label: "JS", color: "#f7df1e" },
  { value: "jsx", label: "JSX", color: "#fb923c" },
  { value: "json", label: "JSON", color: "#64748b" },
  { value: "css", label: "CSS", color: "#1572b6" },
  { value: "html", label: "HTML", color: "#e34f26" },
  { value: "md", label: "MD", color: "#22c55e" },
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return nodes
      .filter(
        (node) =>
          node.name.toLowerCase().includes(query) ||
          node.path?.toLowerCase().includes(query),
      )
      .slice(0, 6);
  }, [nodes, searchQuery]);

  const fileTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const node of nodes) {
      if (node.fileType) {
        counts[node.fileType] = (counts[node.fileType] || 0) + 1;
      }
    }
    return counts;
  }, [nodes]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      onSearch?.(null);
      return;
    }
    const query = value.toLowerCase();
    const firstMatch = nodes.find(
      (node) =>
        node.name.toLowerCase().includes(query) ||
        node.path?.toLowerCase().includes(query),
    );
    if (firstMatch) onSearch?.(firstMatch.id);
  };

  const handleSelectNode = (nodeId: string) => {
    onSearch?.(nodeId);
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  const handleFileTypeToggle = (fileType: string) => {
    const next = selectedFileTypes.includes(fileType)
      ? selectedFileTypes.filter((ft) => ft !== fileType)
      : [...selectedFileTypes, fileType];
    setSelectedFileTypes(next);
    onFilterChange?.(next);
  };

  const handleClearFilters = () => {
    setSelectedFileTypes([]);
    onFilterChange?.([]);
  };

  const handlePauseToggle = () => {
    const next = !isPaused;
    setIsPaused(next);
    onPauseToggle?.(next);
  };

  const availableTypes = FILE_TYPE_OPTIONS.filter(
    (option) => (fileTypeCounts[option.value] || 0) > 0,
  );

  return (
    <div
      className={`glass rounded-xl shadow-lg ${className}`}
      role="search"
      aria-label="Graph controls and search"
    >
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
            className="w-full h-11 pl-11 pr-20 bg-transparent border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
            aria-label="Search files in graph"
            aria-autocomplete="list"
            aria-controls={isSearchFocused && filteredNodes.length > 0 ? "search-results" : undefined}
            aria-expanded={isSearchFocused && filteredNodes.length > 0}
          />
          <kbd
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-muted-foreground/40 font-mono bg-muted/50 px-2 py-1 rounded-md"
            aria-label="Keyboard shortcut: Control K"
          >
            Ctrl+K
          </kbd>
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-16 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" aria-hidden="true" />
            </button>
          )}
        </div>

        {isSearchFocused && filteredNodes.length > 0 && (
          <div
            id="search-results"
            role="listbox"
            aria-label="Search results"
            className="border border-border/50 rounded-lg overflow-hidden"
          >
            {filteredNodes.map((node) => (
              <button
                key={node.id}
                onMouseDown={() => handleSelectNode(node.id)}
                role="option"
                aria-selected="false"
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent/50 transition-colors border-b border-border/30 last:border-b-0 flex items-center gap-3"
              >
                <span
                  className="shrink-0 text-xs font-mono font-medium px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: `${node.color}22`,
                    color: node.color,
                  }}
                  aria-label={`File type: ${node.fileType}`}
                >
                  {node.fileType?.toUpperCase() || "FILE"}
                </span>
                <span className="truncate text-foreground/80">{node.name}</span>
              </button>
            ))}
          </div>
        )}

        {availableTypes.length > 0 && (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="File type filters"
          >
            {availableTypes.map((option) => {
              const isActive = selectedFileTypes.includes(option.value);
              const count = fileTypeCounts[option.value] || 0;
              return (
                <button
                  key={option.value}
                  onClick={() => handleFileTypeToggle(option.value)}
                  className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    isActive
                      ? "border-current bg-current/10"
                      : "border-border/40 bg-transparent hover:bg-accent/30"
                  }`}
                  style={{ color: isActive ? option.color : undefined }}
                  role="checkbox"
                  aria-checked={isActive}
                  aria-label={`Filter ${option.label} files, ${count} available`}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: option.color }}
                    aria-hidden="true"
                  />
                  {option.label}
                  <span className="opacity-50" aria-hidden="true">{count}</span>
                </button>
              );
            })}
            {selectedFileTypes.length > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
                aria-label="Clear all file type filters"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <div
          className="flex items-center gap-2 border-t border-border/30 pt-4"
          role="toolbar"
          aria-label="Graph navigation controls"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            className="h-10 w-10"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            className="h-10 w-10"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRecenter}
            className="h-10 w-10"
            aria-label="Recenter graph"
          >
            <Maximize2 className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePauseToggle}
            className="h-10 w-10"
            aria-label={isPaused ? "Resume animation" : "Pause animation"}
            aria-pressed={isPaused}
          >
            {isPaused ? (
              <Play className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Pause className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
          <div className="flex-1" />
          <Badge
            variant="secondary"
            className="text-sm px-3 py-1 h-8 font-mono"
            role="status"
            aria-label={`${nodes.length} files in graph`}
          >
            {nodes.length} files
          </Badge>
        </div>
      </div>
    </div>
  );
}
