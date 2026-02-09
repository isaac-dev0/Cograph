import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";

interface DraftOptions {
  fileId: string;
  annotationId?: string;
  form: UseFormReturn<any>;
}

/**
 * Automatically saves and restores annotation drafts from localStorage.
 * Drafts are keyed by file ID and optional annotation ID.
 */
export function useDraftAnnotation({ fileId, annotationId, form }: DraftOptions) {
  const draftKey = annotationId
    ? `draft-annotation-${fileId}-${annotationId}`
    : `draft-annotation-${fileId}`;

  useEffect(() => {
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        const data = JSON.parse(draft);
        form.reset(data);
      } catch {}
    }
  }, [draftKey, form]);

  useEffect(() => {
    const subscription = form.watch((data) => {
      if (data.title || data.content) {
        localStorage.setItem(draftKey, JSON.stringify(data));
      }
    });

    return () => subscription.unsubscribe();
  }, [form, draftKey]);

  const clearDraft = () => {
    localStorage.removeItem(draftKey);
  };

  return { clearDraft };
}
