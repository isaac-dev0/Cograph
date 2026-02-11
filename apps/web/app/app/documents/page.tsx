import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DocumentsPage() {
  return (
    <div className="flex h-full items-center justify-center p-8 animate-fade-in">
      <div className="flex flex-col items-center gap-8 w-full max-w-md text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <FileText className="size-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Documents coming soon
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            A shared knowledge base for your team — pin annotations, write
            runbooks, and document your architecture in one place.
          </p>
        </div>
        <Button disabled className="gap-2 opacity-50 cursor-not-allowed">
          <Plus className="size-4" />
          Create Document
        </Button>
      </div>
    </div>
  );
}
