"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Sparkles, Clock, AlertCircle } from "lucide-react";
import { graphqlRequest } from "@/lib/graphql/client";
import { GENERATE_FILE_SUMMARY_MUTATION } from "@/lib/queries/GraphQueries";
import type { FileDetails } from "@/lib/interfaces/graph.interfaces";

interface SummaryTabProps {
  fileId: string;
  fileName: string;
  currentSummary: string | null;
  updatedAt: string;
  onSummaryGenerated: (summary: string, updatedAt: string) => void;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h3 className="text-sm font-medium">{title}</h3>
    </div>
  );
}

/**
 * Tab content for generating and displaying AI-powered file summaries.
 */
export function SummaryTab({
  fileId,
  fileName,
  currentSummary,
  updatedAt,
  onSummaryGenerated,
}: SummaryTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (regenerate = false) => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await graphqlRequest<{ generateFileSummary: FileDetails }>(
        GENERATE_FILE_SUMMARY_MUTATION,
        { fileId, regenerate },
      );

      if (result.generateFileSummary.claudeSummary) {
        onSummaryGenerated(
          result.generateFileSummary.claudeSummary,
          result.generateFileSummary.updatedAt,
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate summary";
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader icon={Sparkles} title="AI Summary" />
        {currentSummary ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerate(true)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Summary
              </>
            )}
          </Button>
        )}
      </div>

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Analysing {fileName}...</p>
          <p className="text-xs text-muted-foreground/60">
            This may take 5-10 seconds
          </p>
        </div>
      )}

      {error && !isGenerating && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-destructive mb-1">
                Generation Failed
              </h4>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!isGenerating && currentSummary && !error && (
        <div className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-muted-foreground/90 leading-relaxed whitespace-pre-wrap">
              {currentSummary}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground/60 pt-4 border-t border-border/50">
            <Clock className="h-3 w-3" />
            <span>Generated {formatDate(updatedAt)}</span>
          </div>
        </div>
      )}

      {!isGenerating && !currentSummary && !error && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
          <div className="rounded-full bg-muted p-3">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No summary yet</p>
          <p className="text-xs text-muted-foreground/60 max-w-75">
            Generate an AI-powered summary to understand this file&apos;s purpose,
            responsibilities, and how it fits into the codebase.
          </p>
        </div>
      )}
    </div>
  );
}
