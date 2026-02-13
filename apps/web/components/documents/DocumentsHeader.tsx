import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface DocumentsHeaderProps {
  repoName?: string;
}

export function DocumentsHeader({ repoName }: DocumentsHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-4" />
      {repoName ? (
        <>
          <span className="text-sm font-medium">{repoName}</span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs text-muted-foreground">Documents</span>
        </>
      ) : (
        <span className="text-sm font-medium">Documents</span>
      )}
    </header>
  );
}
