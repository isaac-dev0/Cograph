export interface CodeEntity {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'variable';
  startLine: number;
  endLine: number;
}

export interface ImportStatement {
  source: string;
  specifiers: string[];
  isExternal: boolean;
}

export interface ExportStatement {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'default';
}

export interface FileAnalysis {
  filePath: string;
  fileName: string;
  fileType: string;
  lines: number;
  imports: ImportStatement[];
  exports: ExportStatement[];
  entities: CodeEntity[];
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
