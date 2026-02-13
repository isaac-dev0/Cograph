"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Trash2, X, Plus } from "lucide-react";
import type { DocumentAnnotation, UpdateAnnotationInput } from "@/lib/interfaces/graph.interfaces";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
const MarkdownPreview = dynamic(() => import("@uiw/react-markdown-preview"), { ssr: false });

interface DocumentViewerProps {
  annotation: DocumentAnnotation;
  onSave: (fileId: string, annotationId: string, input: UpdateAnnotationInput) => Promise<void>;
  onDelete: (fileId: string, annotationId: string) => Promise<void>;
  isSaving: boolean;
}

export function DocumentViewer({ annotation, onSave, onDelete, isSaving }: DocumentViewerProps) {
  const { resolvedTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTitle, setEditTitle] = useState(annotation.title);
  const [editContent, setEditContent] = useState(annotation.content);
  const [editTags, setEditTags] = useState<string[]>(annotation.tags);
  const [tagInput, setTagInput] = useState("");

  const handleEdit = () => {
    setEditTitle(annotation.title);
    setEditContent(annotation.content);
    setEditTags(annotation.tags);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTagInput("");
  };

  const handleSave = async () => {
    await onSave(annotation.fileId, annotation.id, {
      title: editTitle,
      content: editContent,
      tags: editTags,
    });
    setIsEditing(false);
    setTagInput("");
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(annotation.fileId, annotation.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags([...editTags, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (index: number) => {
    setEditTags(editTags.filter((_, tagIndex) => tagIndex !== index));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b shrink-0">
        <div className="min-w-0">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="text-base font-semibold"
              disabled={isSaving}
              aria-label="Annotation title"
            />
          ) : (
            <>
              <h2 className="text-base font-semibold truncate">{annotation.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {annotation.filePath}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4" />
                <span className="sr-only">Cancel</span>
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleEdit}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="sr-only">Delete</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="px-4 py-3 border-b shrink-0">
          <p className="text-xs font-medium mb-1.5">Tags</p>
          <div className="flex gap-2 mb-2">
            <Input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add tag..."
              disabled={isSaving}
              className="h-7 text-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={isSaving}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {editTags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="hover:text-destructive"
                  disabled={isSaving}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEditing ? (
          <div data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
            <MDEditor
              value={editContent}
              onChange={(value) => setEditContent(value ?? "")}
              preview="edit"
              height={400}
              textareaProps={{ placeholder: "Write your annotation in markdown..." }}
            />
          </div>
        ) : (
          <div data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
            <MarkdownPreview source={annotation.content} />
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="px-4 py-2 border-t shrink-0 text-xs text-muted-foreground">
          {annotation.author.name} · Updated {new Date(annotation.updatedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
