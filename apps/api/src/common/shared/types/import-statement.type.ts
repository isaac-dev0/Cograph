export interface ImportStatement {
  source: string;
  specifiers: string[];
  isExternal: boolean;
}