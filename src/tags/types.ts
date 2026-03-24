import * as vscode from 'vscode';

/**
 * Interface for tag formatters that convert tag values to markdown
 */
export interface TagFormatter {
  /**
   * Format a tag value for display in documentation
   * @param value The raw tag value
   * @returns Formatted markdown string
   */
  format(value: string): string;
}

/**
 * Interface for tag stylers that provide syntax highlighting
 */
export interface TagStyler {
  /**
   * Add semantic tokens for syntax highlighting
   * @param line The line text
   * @param lineNumber The line number
   * @param builder The semantic tokens builder
   */
  style(line: string, lineNumber: number, builder: vscode.SemanticTokensBuilder): void;
}

/**
 * Interface for tag decorators that apply custom colors
 */
export interface TagDecorator {
  /**
   * Add decoration ranges for custom colors
   * @param line The line text
   * @param lineNumber The line number
   * @param ranges The array to add decoration ranges to
   */
  decorate(line: string, lineNumber: number, ranges: vscode.Range[]): void;
}

/**
 * Helper function to check if value is multi-line
 */
export function isMultiLine(value: string): boolean {
  return value.includes('<br/>') || value.includes('\n');
}

/**
 * Helper function to process multi-line values
 */
export function processValue(val: string): string {
  return val
    .replace(/<br\/>/g, ' ')
    .replace(/\n/g, '  \n');
}
