"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentAnnotation } from "@/lib/interfaces/graph.interfaces";

interface DocumentsListProps {
  annotations: DocumentAnnotation[];
  activeTags: string[];
  allTags: string[];
  onToggleTag: (tag: string) => void;
  onSelect: (annotation: DocumentAnnotation) => void;
  selectedId: string | null;
}

export function DocumentsList({
  annotations,
  activeTags,
  allTags,
  onToggleTag,
  onSelect,
  selectedId,
}: DocumentsListProps) {
  return (
    <div className="flex flex-col h-full">
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              aria-pressed={activeTags.includes(tag)}
            >
              <Badge
                variant={activeTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer text-xs"
              >
                {tag}
              </Badge>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {annotations.map((annotation) => (
          <button
            key={annotation.id}
            type="button"
            className={cn(
              "w-full text-left px-3 py-3 border-b hover:bg-accent/50 transition-colors",
              selectedId === annotation.id && "bg-accent",
            )}
            onClick={() => onSelect(annotation)}
          >
            <p className="text-sm font-medium truncate">{annotation.title}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{annotation.filePath}</p>
            {annotation.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {annotation.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              {annotation.author.name} · {new Date(annotation.createdAt).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
