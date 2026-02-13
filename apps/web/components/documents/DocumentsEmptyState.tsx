import { FileText } from "lucide-react";

export function DocumentsEmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 animate-fade-in">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted ring-1 ring-border">
          <FileText className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-semibold tracking-tight">No documents yet</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Annotations appear here automatically. To create one, open the{" "}
            <span className="font-medium text-foreground">Graph</span> view, click a file node, and
            add an annotation in the file detail panel.
          </p>
        </div>
      </div>
    </div>
  );
}
