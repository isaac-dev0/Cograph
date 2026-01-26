export interface FileAnalysis {
  filePath: string;
  fileName: string;
  fileType: string;
  lines: number;
  imports: ImportStatement[];
  exports: ExportStatement[];
  entities: CodeEntity[];
}