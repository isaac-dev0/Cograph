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
  MessageSquare,
} from "lucide-react";
import { graphqlRequest } from "@/lib/graphql/client";
import { FILE_DETAILS_QUERY } from "@/lib/queries/GraphQueries";
import type { FileDetails, CodeEntity } from "@/lib/types/graph";

interface FileDetailsPanelProps {
  fileId: string;
  repositoryUrl?: string;
  onEntityClick?: (entity: CodeEntity) => void;
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
  const lines = raw
    .split(/[\n;]|(?:\.\s)/)
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  return lines;
}

/**
 * Flat sidebar panel showing file metadata, code entities, annotations,
 * and AI summary for the selected graph node.
 */
export function FileDetailsPanel({
  fileId,
  repositoryUrl,
  onEntityClick,
  className = "",
}: FileDetailsPanelProps) {
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);

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
        <div className="p-5 space-y-6 animate-fade-in">
          <FileInfoSection fileDetails={fileDetails} githubUrl={githubUrl} />

          {!!fileDetails.codeEntities?.length && (
            <EntitiesSection
              entities={fileDetails.codeEntities}
              expandedEntity={expandedEntity}
              onToggle={setExpandedEntity}
              onEntityClick={onEntityClick}
            />
          )}

          {fileDetails.annotations && (
            <AnnotationsSection annotations={fileDetails.annotations} />
          )}

          {fileDetails.claudeSummary && (
            <SummarySection summary={fileDetails.claudeSummary} />
          )}
        </div>
      </ScrollArea>
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

function AnnotationsSection({ annotations }: { annotations: string }) {
  const items = parseAnnotations(annotations);

  return (
    <div className="border-t border-border/50 pt-5">
      <SectionHeader icon={MessageSquare} title="Annotations" />
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2.5 text-sm text-muted-foreground/90 leading-relaxed"
          >
            <span className="text-primary/60 shrink-0 mt-0.5">&bull;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
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
