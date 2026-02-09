"use client";

import { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ExternalLink,
  ChevronRight,
  Code,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  FILE_DETAILS_QUERY,
  CREATE_ANNOTATION_MUTATION,
  UPDATE_ANNOTATION_MUTATION,
  DELETE_ANNOTATION_MUTATION,
} from "@/lib/queries/GraphQueries";
import type { FileDetails, CodeEntity, FileAnnotation } from "@/lib/types/graph";
import { AnnotationsList } from "./AnnotationsList";
import { AnnotationForm } from "./AnnotationForm";
import { FileContentViewer } from "./FileContentViewer";
import { useUser } from "@/hooks/providers/UserProvider";

interface FileDetailsPanelProps {
  fileId: string;
  repositoryUrl?: string;
  onEntityClick?: (entity: CodeEntity) => void;
  canEdit?: boolean;
  className?: string;
}

const ENTITY_STYLES: Record<string, { icon: string; color: string }> = {
  function:  { icon: "f", color: "text-blue-400 bg-blue-400/10" },
  class:     { icon: "C", color: "text-purple-400 bg-purple-400/10" },
  interface: { icon: "I", color: "text-green-400 bg-green-400/10" },
  type:      { icon: "T", color: "text-orange-400 bg-orange-400/10" },
};

const DEFAULT_ENTITY_STYLE = { icon: "\u2022", color: "text-muted-foreground bg-muted" };

function getEntityStyle(type: string) {
  return ENTITY_STYLES[type.toLowerCase()] || DEFAULT_ENTITY_STYLE;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function buildGitHubUrl(repositoryUrl: string, filePath: string): string {
  return `${repositoryUrl.replace(/\.git$/, "")}/blob/main/${filePath}`;
}

/** Splits a raw annotation string into structured bullet points. */
function parseAnnotations(raw: string): string[] {
  return raw
    .split(/[\n;]|(?:\.\s)/)
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Flat sidebar panel showing file metadata, code entities, annotations,
 * and AI summary for the selected graph node.
 */
export function FileDetailsPanel({
  fileId,
  repositoryUrl,
  onEntityClick,
  canEdit = false,
  className = "",
}: FileDetailsPanelProps) {
  const { profile } = useUser();
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
  const [isAnnotationDialogOpen, setIsAnnotationDialogOpen] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<FileAnnotation | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const fetchDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await graphqlRequest<{ repositoryFile: FileDetails }>(
        FILE_DETAILS_QUERY,
        { id: fileId },
      );
      setFileDetails(data.repositoryFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file details");
    } finally {
      setIsLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleCreateAnnotation = async (data: {
    title: string;
    content: string;
    tags: string[];
    linkedEntityIds: string[];
  }) => {
    setIsSaving(true);
    try {
      const result = await graphqlRequest<{ createAnnotation: FileAnnotation }>(
        CREATE_ANNOTATION_MUTATION,
        {
          fileId: fileDetails!.id,
          input: data,
        },
      );

      setFileDetails((prev) =>
        prev
          ? {
              ...prev,
              annotations: [...(prev.annotations || []), result.createAnnotation],
            }
          : prev,
      );

      setIsAnnotationDialogOpen(false);
      setEditingAnnotation(undefined);

      localStorage.removeItem(`draft-annotation-${fileDetails!.id}`);
    } catch (error) {
      console.error("Failed to create annotation:", error);
      alert("Failed to create annotation. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAnnotation = async (data: {
    title: string;
    content: string;
    tags: string[];
    linkedEntityIds: string[];
  }) => {
    if (!editingAnnotation) return;

    setIsSaving(true);
    try {
      const result = await graphqlRequest<{ updateAnnotation: FileAnnotation }>(
        UPDATE_ANNOTATION_MUTATION,
        {
          fileId: fileDetails!.id,
          annotationId: editingAnnotation.id,
          input: data,
        },
      );

      setFileDetails((prev) =>
        prev
          ? {
              ...prev,
              annotations: prev.annotations?.map((a) =>
                a.id === editingAnnotation.id ? result.updateAnnotation : a,
              ),
            }
          : prev,
      );

      setIsAnnotationDialogOpen(false);
      setEditingAnnotation(undefined);

      localStorage.removeItem(
        `draft-annotation-${fileDetails!.id}-${editingAnnotation.id}`,
      );
    } catch (error) {
      console.error("Failed to update annotation:", error);
      alert("Failed to update annotation. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      await graphqlRequest<{ deleteAnnotation: boolean }>(
        DELETE_ANNOTATION_MUTATION,
        {
          fileId: fileDetails!.id,
          annotationId,
        },
      );

      setFileDetails((prev) =>
        prev
          ? {
              ...prev,
              annotations: prev.annotations?.filter((a) => a.id !== annotationId),
            }
          : prev,
      );
    } catch (error) {
      console.error("Failed to delete annotation:", error);
      alert("Failed to delete annotation. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading details...</p>
        </div>
      </div>
    );
  }

  if (error || !fileDetails) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center animate-fade-in">
          <p className="text-sm text-destructive mb-3">
            {error || "Failed to load details"}
          </p>
          <Button onClick={fetchDetails} size="sm" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const githubUrl = repositoryUrl
    ? buildGitHubUrl(repositoryUrl, fileDetails.filePath)
    : null;

  return (
    <div className={className}>
      <ScrollArea className="h-full">
        <div className="animate-fade-in">
          <Tabs defaultValue="overview" className="flex flex-col h-full">
            <div className="px-5 pt-5">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="annotations">
                  Annotations
                  {fileDetails.annotations && fileDetails.annotations.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {fileDetails.annotations.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview">
              <div className="p-5 space-y-6">
                <FileInfoSection fileDetails={fileDetails} githubUrl={githubUrl} />

                {!!fileDetails.codeEntities?.length && (
                  <EntitiesSection
                    entities={fileDetails.codeEntities}
                    expandedEntity={expandedEntity}
                    onToggle={setExpandedEntity}
                    onEntityClick={onEntityClick}
                  />
                )}

                {fileDetails.claudeSummary && (
                  <SummarySection summary={fileDetails.claudeSummary} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="annotations">
              <div className="p-5">
                {canEdit ? (
                  <AnnotationsList
                    annotations={fileDetails.annotations || []}
                    codeEntities={fileDetails.codeEntities || []}
                    currentUserId={profile?.id || ""}
                    onEdit={(annotation) => {
                      setEditingAnnotation(annotation);
                      setIsAnnotationDialogOpen(true);
                    }}
                    onDelete={handleDeleteAnnotation}
                    onCreate={() => {
                      setEditingAnnotation(undefined);
                      setIsAnnotationDialogOpen(true);
                    }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-muted-foreground">
                      You don&apos;t have permission to view annotations
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="content" className="flex-1 overflow-hidden">
              <FileContentViewer
                fileId={fileDetails.id}
                fileName={fileDetails.fileName}
                fileType={fileDetails.fileType}
              />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      <Dialog open={isAnnotationDialogOpen} onOpenChange={setIsAnnotationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAnnotation ? "Edit Annotation" : "New Annotation"}
            </DialogTitle>
          </DialogHeader>
          <AnnotationForm
            fileId={fileDetails.id}
            annotation={editingAnnotation}
            codeEntities={fileDetails.codeEntities || []}
            onSave={
              editingAnnotation ? handleUpdateAnnotation : handleCreateAnnotation
            }
            onCancel={() => {
              setIsAnnotationDialogOpen(false);
              setEditingAnnotation(undefined);
            }}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count }: { icon: any; title: string; count?: number }) {
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

function FileInfoSection({
  fileDetails,
  githubUrl,
}: {
  fileDetails: FileDetails;
  githubUrl: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground font-mono truncate">
        {fileDetails.filePath}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground/60 mb-1">Type</p>
          <Badge variant="secondary" className="text-xs px-2 py-0.5 font-mono">
            {fileDetails.fileType.toUpperCase()}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground/60 mb-1">Lines</p>
          <p className="text-sm font-medium font-mono">{fileDetails.linesOfCode}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground/60 mb-1">Analyzed</p>
          <p className="text-sm font-medium">{formatDate(fileDetails.updatedAt)}</p>
        </div>
      </div>

      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View on GitHub
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function EntitiesSection({
  entities,
  expandedEntity,
  onToggle,
  onEntityClick,
}: {
  entities: CodeEntity[];
  expandedEntity: string | null;
  onToggle: (id: string | null) => void;
  onEntityClick?: (entity: CodeEntity) => void;
}) {
  return (
    <div className="border-t border-border/50 pt-5">
      <SectionHeader icon={Code} title="Entities" count={entities.length} />
      <div className="space-y-1">
        {entities.map((entity) => {
          const style = getEntityStyle(entity.type);
          const isExpanded = expandedEntity === entity.id;

          return (
            <div key={entity.id}>
              <button
                onClick={() => onToggle(isExpanded ? null : entity.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-accent/50 transition-colors group"
              >
                <span className={`flex items-center justify-center size-7 rounded-md text-xs font-mono font-bold shrink-0 ${style.color}`}>
                  {style.icon}
                </span>
                <span className="truncate text-left flex-1 font-medium">
                  {entity.name}
                </span>
                <span className="text-xs text-muted-foreground/50 font-mono shrink-0">
                  L{entity.startLine}
                </span>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground/30 transition-transform shrink-0 ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="ml-10 pl-3 border-l-2 border-border/30 mb-3 space-y-2 animate-fade-in">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{entity.type}</span>
                    <span>
                      Lines {entity.startLine}&ndash;{entity.endLine}
                    </span>
                  </div>
                  {entity.annotations && (
                    <ul className="space-y-1">
                      {parseAnnotations(entity.annotations).map((line, index) => (
                        <li key={index} className="text-sm text-muted-foreground/80 leading-relaxed flex gap-2">
                          <span className="text-muted-foreground/40 shrink-0">&bull;</span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                  {onEntityClick && (
                    <button
                      onClick={() => onEntityClick(entity)}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      View details &rarr;
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummarySection({ summary }: { summary: string }) {
  return (
    <div className="border-t border-border/50 pt-5">
      <SectionHeader icon={Sparkles} title="AI Summary" />
      <p className="text-sm text-muted-foreground/90 leading-relaxed">{summary}</p>
    </div>
  );
}
