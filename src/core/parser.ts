import * as vscode from 'vscode';
import { Tag, Doclet } from './types';

/**
 * Parser - Extracts doclets from source (like JSDoc's parser)
 */
export class DocletParser {
  private document: vscode.TextDocument;

  constructor(document: vscode.TextDocument) {
    this.document = document;
  }

  /**
   * Parse all doclets in the document
   */
  parse(): Doclet[] {
    const doclets: Doclet[] = [];

    // Extract special File Header (###!)
    const fileDoclet = this.extractFileDoclet();
    if (fileDoclet) {
      doclets.push(fileDoclet);
    }

    for (let i = 0; i < this.document.lineCount; i++) {
      const line = this.document.lineAt(i).text;
      const symbol = this.extractSymbol(line);

      if (symbol) {
        const comment = this.extractCommentBlock(i);
        if (comment) {
          const doclet: Doclet = {
            name: symbol.name,
            longname: `${this.document.uri.toString()}~${symbol.name}`,
            kind: symbol.kind,
            modifier: symbol.modifier,
            description: comment.description,
            tags: this.parseTags(comment.lines),
            scope: 'local',
            meta: {
              file: this.document.uri.toString(),
              line: i
            }
          };
          doclets.push(doclet);
        }
      }
    }

    return doclets;
  }

  /**
   * Extract file header doclet from ###! block
   */
  private extractFileDoclet(): Doclet | null {
    let shebang = '';
    let shebangLine = -1;
    let docStartLine = -1;

    // Find shebang and ###! in the top of the file
    for (let i = 0; i < Math.min(this.document.lineCount, 50); i++) {
      const line = this.document.lineAt(i).text.trim();
      if (line.startsWith('#!') && shebang === '') {
        shebang = line;
        shebangLine = i;
      } else if (line === '###!') {
        docStartLine = i;
        break;
      }
    }

    if (docStartLine === -1) return null;

    // Extract lines until ##
    const lines: string[] = [];
    let current = docStartLine + 1;
    let foundEnd = false;

    while (current < this.document.lineCount) {
      const rawText = this.document.lineAt(current).text;
      const text = rawText.trim();
      if (text === '##') {
        foundEnd = true;
        break;
      }
      const contentWithTrailing = rawText.replace(/^\s*(?:#\s?)?/, '');
      lines.push(contentWithTrailing);
      current++;
    }

    if (!foundEnd) return null;

    // Extract description
    const descriptionLines: string[] = [];
    for (const line of lines) {
      if (line.trim().startsWith('@')) break;
      descriptionLines.push(line);
    }

    return {
      name: '__FILE__',
      longname: `${this.document.uri.toString()}~__FILE__`,
      kind: 'file',
      modifier: shebang || '#!/bin/bash',
      description: descriptionLines.join('\n'),
      tags: this.parseTags(lines),
      scope: 'local',
      meta: {
        file: this.document.uri.toString(),
        line: shebangLine > -1 ? shebangLine : 0
      }
    };
  }

  /**
   * Extract symbol definition from a line
   */
  private extractSymbol(line: string): { name: string; kind: Doclet['kind']; modifier?: string } | null {
    const trimmed = line.trim();

    // Function definitions
    const funcMatch = trimmed.match(/^function\s+([a-zA-Z0-9_]+)/);
    if (funcMatch) return { name: funcMatch[1], kind: 'function' };

    const funcParenMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*\(\s*\)/);
    if (funcParenMatch) return { name: funcParenMatch[1], kind: 'function' };

    // Variable assignments (captures readonly, declare, export, local, alias, or nothing)
    const varMatch = trimmed.match(/^(?:(readonly|declare|export|local|alias)\s+)?([a-zA-Z0-9_]+)=/);
    if (varMatch && varMatch[2]) {
      return {
        name: varMatch[2],
        kind: 'variable',
        modifier: varMatch[1] || 'var' // Fallback to 'var' for plain assignments
      };
    }

    return null;
  }

  /**
   * Extract comment block above a line
   */
  private extractCommentBlock(targetLine: number): { lines: string[]; description: string } | null {
    if (targetLine <= 0) return null;

    let current = targetLine - 1;

    // Skip blank lines
    while (current >= 0 && this.document.lineAt(current).text.trim() === '') {
      current--;
    }
    if (current < 0) return null;

    // Check for ## end marker
    if (this.document.lineAt(current).text.trim() !== '##') return null;

    const lines: string[] = [];
    current--;

    // Collect comment lines - preserve trailing spaces for multi-line detection
    while (current >= 0) {
      const rawText = this.document.lineAt(current).text;
      const text = rawText.trim();

      if (text === '###' || text === '###!') {
        // Ignore file doc blocks (###!) for standard symbols so they don't hijack!
        if (text === '###!') return null;

        // Extract description: all lines BEFORE the first @ tag
        const descriptionLines: string[] = [];
        for (const line of lines) {
          if (line.trim().startsWith('@')) break;
          descriptionLines.push(line);
        }

        return {
          lines,
          description: descriptionLines.join('\n')
        };
      }

      // Strip leading spaces, and an optional '#' with an optional space
      const contentWithTrailing = rawText.replace(/^\s*(?:#\s?)?/, '');
      lines.unshift(contentWithTrailing);
      current--;
    }

    return null;
  }

  /**
   * Parse JSDoc-style tags from comment lines
   */
  private parseTags(lines: string[]): Tag[] {
    const tags: Tag[] = [];
    let lastTag: Tag | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const tagMatch = trimmedLine.match(/^@(\w*)\s*(.*)$/);

      if (tagMatch) {
        // New tag line (tag name can be empty, just @)
        const [, tagName, tagValue] = tagMatch;
        const finalTagName = tagName || '@'; // If empty, use '@' as the tag name
        const newTag: Tag = { name: finalTagName, value: tagValue };
        tags.push(newTag);
        lastTag = newTag;
      } else if (lastTag && trimmedLine) {
        // Continuation line
        // Check if PREVIOUS line (i-1) ended with 2+ spaces
        const previousLine = i > 0 ? lines[i - 1] : '';
        const hasHardBreak = /\s{2,}$/.test(previousLine);

        if (hasHardBreak) {
          // Hard break - add on new line
          lastTag.value = lastTag.value + '\n' + trimmedLine;
        } else {
          // Soft break - join with <br/> marker (will become space for most tags, newline for @example)
          lastTag.value = lastTag.value + '<br/>' + trimmedLine;
        }
      } else if (!trimmedLine && lastTag && lastTag.name === 'example') {
        // Empty line inside @example - preserve it
        lastTag.value = lastTag.value + '\n';
      } else if (!trimmedLine) {
        // Empty line - reset last tag (except for @example)
        lastTag = null;
      }
    }

    return tags;
  }
}
