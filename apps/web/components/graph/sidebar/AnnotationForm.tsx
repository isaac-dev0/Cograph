"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type { FileAnnotation, CodeEntity } from "@/lib/interfaces/graph.interfaces";
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
    defaultValues: annotation ?? {
      title: "",
      content: "",
      tags: [],
      linkedEntityIds: [],
    },
  });

  useDraftAnnotation({ fileId, annotationId: annotation?.id, form });

  const tags = useWatch({ control: form.control, name: "tags" });
  const content = useWatch({ control: form.control, name: "content" });
  const linkedEntityIds = useWatch({ control: form.control, name: "linkedEntityIds" });

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      form.setValue("tags", [...tags, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (index: number) => {
    form.setValue("tags", tags.filter((_, idx) => idx !== index));
  };

  const toggleEntity = (entityId: string) => {
    form.setValue(
      "linkedEntityIds",
      linkedEntityIds.includes(entityId)
        ? linkedEntityIds.filter((id) => id !== entityId)
        : [...linkedEntityIds, entityId],
    );
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
        <FieldError message={form.formState.errors.title?.message} />
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Content</label>
        <div data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
          <MDEditor
            value={content}
            onChange={(value) => form.setValue("content", value ?? "")}
            preview="edit"
            height={200}
            textareaProps={{ placeholder: "Write your annotation in markdown..." }}
          />
        </div>
        <FieldError message={form.formState.errors.content?.message} />
      </div>

      <TagsSection
        tags={tags}
        tagInput={tagInput}
        isSaving={isSaving}
        onTagInputChange={setTagInput}
        onAdd={addTag}
        onRemove={removeTag}
      />

      {codeEntities.length > 0 && (
        <EntityPicker
          entities={codeEntities}
          linkedEntityIds={linkedEntityIds}
          isSaving={isSaving}
          onToggle={toggleEntity}
        />
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

interface TagsSectionProps {
  tags: string[];
  tagInput: string;
  isSaving: boolean;
  onTagInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

function TagsSection({ tags, tagInput, isSaving, onTagInputChange, onAdd, onRemove }: TagsSectionProps) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">Tags</label>
      <div className="flex gap-2 mb-2">
        <Input
          value={tagInput}
          onChange={(event) => onTagInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder="Add tag..."
          disabled={isSaving}
        />
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={isSaving}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="hover:text-destructive"
              disabled={isSaving}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

interface EntityPickerProps {
  entities: CodeEntity[];
  linkedEntityIds: string[];
  isSaving: boolean;
  onToggle: (entityId: string) => void;
}

function EntityPicker({ entities, linkedEntityIds, isSaving, onToggle }: EntityPickerProps) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">Linked Entities</label>
      <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
        {entities.map((entity) => (
          <label
            key={entity.id}
            className="flex items-center gap-2 p-1.5 hover:bg-accent rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={linkedEntityIds.includes(entity.id)}
              onChange={() => onToggle(entity.id)}
              disabled={isSaving}
              className="rounded"
            />
            <span className="text-sm">
              {entity.name}
              <span className="text-xs text-muted-foreground ml-2">({entity.type})</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
