export interface FileAnalysis {
  filePath: string;
  fileName: string;
  fileType: string;
  lines: number;
  imports: ImportStatement[];
  exports: ExportStatement[];
  entities: CodeEntity[];
}

export interface ImportStatement {
  source: string;
  specifiers: string[];
  isExternal: boolean;
  resolvedPath?: string;
}

export interface ExportStatement {
  name: string;
  type: "function" | "class" | "interface" | "type" | "const" | "default";
}

export interface CodeEntity {
  name: string;
  type: "function" | "class" | "interface" | "type" | "variable";
  startLine: number;
  endLine: number;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: "file" | "function" | "class" | "interface";
  data: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "imports" | "exports" | "contains";
  data?: any;
}

export interface FileAnalysisResult {
  filePath: string;
  relativePath: string;
  analysis: FileAnalysis | null;
  error?: string;
}

export interface RepositoryAnalysis {
  repositoryUrl: string;
  branch?: string;
  analysedAt: string;
  summary: {
    totalFiles: number;
    totalLines: number;
    successfulAnalyses: number;
    failedAnalyses: number;
    filesByType: Record<string, number>;
  };
  files: FileAnalysisResult[];
}

export interface ScannedFile {
  filePath: string;
  relativePath: string;
  fileName: string;
  content: string;
  lines: number;
}

export interface ScanOptions {
  rootPath: string;
  extensions?: string[];
  ignorePatterns?: string[];
  onProgress?: (current: number, total: number, filePath: string) => void;
}