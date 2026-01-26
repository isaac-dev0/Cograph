export interface ExportStatement {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'default';
}