"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  MessageSquare,
  User,
  Calendar,
  Link as LinkIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type { FileAnnotation, CodeEntity } from "@/lib/types/graph";

const MarkdownPreview = dynamic(() => import("@uiw/react-markdown-preview"), {
  ssr: false,
});

interface AnnotationsListProps {
  annotations: FileAnnotation[];
  codeEntities: CodeEntity[];
  currentUserId: string;
  onEdit: (annotation: FileAnnotation) => void;
  onDelete: (annotationId: string) => void;
  onCreate: () => void;
}

export function AnnotationsList({
  annotations,
  codeEntities,
  currentUserId,
  onEdit,
  onDelete,
  onCreate,
}: AnnotationsListProps) {
  const { resolvedTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  const allTags = Array.from(new Set(annotations.flatMap((a) => a.tags))).sort();

  const allAuthors = Array.from(
    new Map(annotations.map((a) => [a.author.id, a.author])).values(),
  );

  const filteredAnnotations = annotations.filter((annotation) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        annotation.title.toLowerCase().includes(query) ||
        annotation.content.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (selectedTags.length > 0) {
      const hasTag = selectedTags.some((tag) => annotation.tags.includes(tag));
      if (!hasTag) return false;
    }

    if (selectedAuthor && annotation.author.id !== selectedAuthor) {
      return false;
    }

    return true;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLinkedEntities = (entityIds: string[]) => {
    return codeEntities.filter((e) => entityIds.includes(e.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Annotations
          </h3>
          <Badge variant="secondary" className="text-xs">
            {filteredAnnotations.length}
          </Badge>
        </div>
        <Button onClick={onCreate} size="sm" className="h-8">
          <Plus className="h-4 w-4 mr-1.5" />
          New
        </Button>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search annotations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {allAuthors.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            <Button
              variant={selectedAuthor === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAuthor(null)}
              className="text-xs h-7"
            >
              All Authors
            </Button>
            {allAuthors.map((author) => (
              <Button
                key={author.id}
                variant={selectedAuthor === author.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAuthor(author.id)}
                className="text-xs h-7"
              >
                {author.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-400px)]">
        {filteredAnnotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery || selectedTags.length > 0 || selectedAuthor
                ? "No matching annotations"
                : "No annotations yet"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {searchQuery || selectedTags.length > 0 || selectedAuthor
                ? "Try adjusting your filters"
                : "Create your first annotation to get started"}
            </p>
            {!searchQuery && selectedTags.length === 0 && !selectedAuthor && (
              <Button onClick={onCreate} size="sm" className="mt-4">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Annotation
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnotations.map((annotation) => {
              const linkedEntities = getLinkedEntities(annotation.linkedEntityIds);
              const isOwner = annotation.author.id === currentUserId;

              return (
                <div
                  key={annotation.id}
                  className="border border-border rounded-lg p-4 space-y-3 hover:border-border/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">
                        {annotation.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {annotation.author.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(annotation.createdAt)}
                        </span>
                      </div>
                    </div>
                    {isOwner && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(annotation)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                "Are you sure you want to delete this annotation?",
                              )
                            ) {
                              onDelete(annotation.id);
                            }
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div
                    data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
                    className="text-sm"
                  >
                    <MarkdownPreview
                      source={annotation.content}
                      className="bg-transparent!"
                      style={{ padding: 0 }}
                    />
                  </div>

                  {annotation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {annotation.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {linkedEntities.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <LinkIcon className="h-3 w-3 text-muted-foreground" />
                      <div className="flex flex-wrap gap-1">
                        {linkedEntities.map((entity) => (
                          <Badge
                            key={entity.id}
                            variant="outline"
                            className="text-xs"
                          >
                            {entity.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
