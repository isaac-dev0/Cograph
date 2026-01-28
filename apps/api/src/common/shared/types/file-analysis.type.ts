import { CodeEntity } from './code-entity.type';
import { ExportStatement } from './export-statement.type';
import { ImportStatement } from './import-statement.type';

export interface FileAnalysis {
  filePath: string;
  fileName: string;
  fileType: string;
  lines: number;
  imports: ImportStatement[];
  exports: ExportStatement[];
  entities: CodeEntity[];
}