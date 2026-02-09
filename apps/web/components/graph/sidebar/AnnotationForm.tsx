"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type { FileAnnotation, CodeEntity } from "@/lib/types/graph";
import { useDraftAnnotation } from "@/hooks/useDraftAnnotation";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const annotationSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required"),
  tags: z.array(z.string()),
  linkedEntityIds: z.array(z.string()),
});

type AnnotationFormData = z.infer<typeof annotationSchema>;

interface AnnotationFormProps {
  fileId: string;
  annotation?: FileAnnotation;
  codeEntities: CodeEntity[];
  onSave: (data: AnnotationFormData) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export function AnnotationForm({
  fileId,
  annotation,
  codeEntities,
  onSave,
  onCancel,
  isSaving,
}: AnnotationFormProps) {
  const { resolvedTheme } = useTheme();
  const [tagInput, setTagInput] = useState("");

  const form = useForm<AnnotationFormData>({
    resolver: zodResolver(annotationSchema),
    defaultValues: annotation || {
      title: "",
      content: "",
      tags: [],
      linkedEntityIds: [],
    },
  });

  const { clearDraft } = useDraftAnnotation({
    fileId,
    annotationId: annotation?.id,
    form,
  });

  const addTag = () => {
    if (tagInput.trim()) {
      const current = form.getValues("tags");
      if (!current.includes(tagInput.trim())) {
        form.setValue("tags", [...current, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (index: number) => {
    const current = form.getValues("tags");
    form.setValue(
      "tags",
      current.filter((_, i) => i !== index),
    );
  };

  const toggleEntity = (entityId: string) => {
    const current = form.getValues("linkedEntityIds");
    if (current.includes(entityId)) {
      form.setValue(
        "linkedEntityIds",
        current.filter((id) => id !== entityId),
      );
    } else {
      form.setValue("linkedEntityIds", [...current, entityId]);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Title</label>
        <Input
          {...form.register("title")}
          placeholder="Enter annotation title..."
          disabled={isSaving}
        />
        {form.formState.errors.title && (
          <p className="text-xs text-destructive mt-1">
            {form.formState.errors.title.message}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Content</label>
        <div data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
          <MDEditor
            value={form.watch("content")}
            onChange={(val) => form.setValue("content", val || "")}
            preview="edit"
            height={200}
            textareaProps={{ placeholder: "Write your annotation in markdown..." }}
          />
        </div>
        {form.formState.errors.content && (
          <p className="text-xs text-destructive mt-1">
            {form.formState.errors.content.message}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Tags</label>
        <div className="flex gap-2 mb-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add tag..."
            disabled={isSaving}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTag}
            disabled={isSaving}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {form.watch("tags").map((tag, index) => (
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

      {codeEntities.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Linked Entities
          </label>
          <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
            {codeEntities.map((entity) => {
              const isLinked = form.watch("linkedEntityIds").includes(entity.id);
              return (
                <label
                  key={entity.id}
                  className="flex items-center gap-2 p-1.5 hover:bg-accent rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isLinked}
                    onChange={() => toggleEntity(entity.id)}
                    disabled={isSaving}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {entity.name}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({entity.type})
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {annotation ? "Update" : "Create"} Annotation
        </Button>
      </div>
    </form>
  );
}
