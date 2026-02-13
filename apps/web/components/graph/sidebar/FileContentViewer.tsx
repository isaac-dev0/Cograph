"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { graphqlRequest } from "@/lib/graphql/client";
import { FILE_CONTENT_QUERY } from "@/lib/queries/GraphQueries";
import dynamic from "next/dynamic";
import type { editor } from "monaco-editor";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface FileContentViewerProps {
  fileId: string;
  fileName: string;
  fileType: string;
  jumpToLine?: number;
}

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescriptreact",
  js: "javascript",
  jsx: "javascriptreact",
};

function getLanguage(fileType: string): string {
  return EXTENSION_TO_LANGUAGE[fileType.toLowerCase()] || fileType;
}

export function FileContentViewer({ fileId, fileName, fileType, jumpToLine }: FileContentViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorRef.current == null || jumpToLine == null) return;
    editorRef.current.revealLineInCenter(jumpToLine);
    editorRef.current.setPosition({ lineNumber: jumpToLine, column: 1 });
  }, [jumpToLine]);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await graphqlRequest<{ fileContent: string }>(
          FILE_CONTENT_QUERY,
          { id: fileId },
        );
        setContent(data.fileContent);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load file content");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [fileId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex items-center justify-center h-full p-5">
        <div className="text-center animate-fade-in">
          <p className="text-sm text-destructive">
            {error || "Failed to load content"}
          </p>
        </div>
      </div>
    );
  }

  const language = getLanguage(fileType);
  const editorTheme = resolvedTheme === "dark" ? "vs-dark" : "light";

  return (
    <div className="h-full w-full">
      <Editor
        height="88.5vh"
        language={language}
        value={content}
        theme={editorTheme}
        onMount={(editorInstance) => {
          editorRef.current = editorInstance;
          if (jumpToLine != null) {
            editorInstance.revealLineInCenter(jumpToLine);
            editorInstance.setPosition({ lineNumber: jumpToLine, column: 1 });
          }
        }}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: "on",
          renderWhitespace: "none",
          automaticLayout: true,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
        }}
      />
    </div>
  );
}
