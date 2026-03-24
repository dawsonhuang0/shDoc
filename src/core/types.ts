/**
 * Tag - Represents a single JSDoc tag with its value
 */
export interface Tag {
  name: string;   // Tag name (e.g., "param", "returns")
  value: string;  // Tag value/content
}

/**
 * Doclet - Core data structure (like JSDoc's doclet)
 * Represents a single documented symbol
 */
export interface Doclet {
  name: string;
  longname: string;  // Fully qualified name
  kind: 'function' | 'variable' | 'file';
  modifier?: string;  // Shell keyword: 'readonly', 'declare', 'local', 'alias', 'var', etc.
  description?: string;
  tags: Tag[];  // Tags in original order from doc comment
  scope: 'local' | 'sourced' | 'workspace';
  meta: {
    file: string;
    line: number;
  };
}
