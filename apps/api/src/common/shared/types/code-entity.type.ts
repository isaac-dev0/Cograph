export interface CodeEntity {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'variable';
  startLine: number;
  endLine: number;
}