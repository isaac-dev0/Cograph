import { FileAnalysis } from "./file-analysis.type";

export interface FileAnalysisResult {
  filePath: string;
  relativePath: string;
  analysis: FileAnalysis | null;
  error?: string;
}