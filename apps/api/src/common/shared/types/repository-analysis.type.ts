import { FileAnalysisResult } from "./file-analysis-result.type";

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