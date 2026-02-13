"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRepository } from "@/hooks/providers/RepositoryProvider";
import { useDocuments } from "@/hooks/useDocuments";
import { DocumentsHeader } from "@/components/documents/DocumentsHeader";
import { DocumentsList } from "@/components/documents/DocumentsList";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { DocumentsEmptyState } from "@/components/documents/DocumentsEmptyState";

export default function DocumentsPage() {
  const { currentRepository, isLoading: repoLoading } = useRepository();
  const documents = useDocuments(currentRepository?.id ?? null);
  const [isSaving, setIsSaving] = useState(false);

  if (repoLoading) {
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
        <DocumentsHeader />
        <div className="flex flex-1 items-center justify-center animate-fade-in">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              No repository selected
            </p>
            <p className="text-xs text-muted-foreground/60">
              Select a repository from the sidebar to view its documents
            </p>
          </div>
        </div>
      </>
    );
  }

  if (documents.isLoading) {
    return (
      <>
        <DocumentsHeader repoName={currentRepository.name} />
        <div className="flex flex-1 items-center justify-center animate-fade-in">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading documents...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (documents.error) {
    return (
      <>
        <DocumentsHeader repoName={currentRepository.name} />
        <div className="flex flex-1 items-center justify-center p-8 animate-fade-in">
          <div className="text-center space-y-3">
            <p className="text-sm font-medium text-destructive">
              Failed to load documents
            </p>
            <p className="text-xs text-muted-foreground">{documents.error}</p>
            <button
              type="button"
              onClick={documents.refresh}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  if (documents.annotations.length === 0) {
    return (
      <>
        <DocumentsHeader repoName={currentRepository.name} />
        <DocumentsEmptyState />
      </>
    );
  }

  const handleSave = async (
    fileId: string,
    annotationId: string,
    input: { title?: string; content?: string; tags?: string[] },
  ) => {
    setIsSaving(true);
    try {
      await documents.updateAnnotation(fileId, annotationId, input);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DocumentsHeader repoName={currentRepository.name} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 border-r overflow-hidden">
          <DocumentsList
            annotations={documents.displayAnnotations}
            activeTags={documents.activeTags}
            allTags={documents.allTags}
            onToggleTag={documents.toggleTag}
            onSelect={documents.setSelectedAnnotation}
            selectedId={documents.selectedAnnotation?.id ?? null}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          {documents.selectedAnnotation ? (
            <DocumentViewer
              annotation={documents.selectedAnnotation}
              onSave={handleSave}
              onDelete={documents.deleteAnnotation}
              isSaving={isSaving}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a document to view it
            </div>
          )}
        </div>
      </div>
    </>
  );
}
