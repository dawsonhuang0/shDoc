import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Doclet } from '../core/types';
import { SymbolRegistry } from '../core/registry';

/**
 * Publisher - Renders documentation (like JSDoc's publisher)
 */
export class HoverPublisher {
  publish(doclet: Doclet): vscode.Hover {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    // Title - JSDoc style with syntax highlighting
    md.appendCodeblock(this.formatSignature(doclet), 'bash');
    md.appendMarkdown(`\n`);

    // Description
    if (doclet.description) {
      md.appendMarkdown(this.processInlineTags(doclet.description));
      md.appendMarkdown('\n\n');
    }

    // Tags (JSDoc-style formatting) - preserve source order
    if (doclet.tags.length > 0) {
      for (const tag of doclet.tags) {
        const formatted = this.formatTag(tag.name, tag.value);

        // Special handling for @example
        if (formatted.startsWith('__EXAMPLE_WITH_CAPTION__')) {
          // Example with caption on first line
          const captionEnd = formatted.indexOf('__CAPTION_END__');
          const exampleEnd = formatted.indexOf('__ENDEXAMPLE__');
          const captionText = formatted.substring('__EXAMPLE_WITH_CAPTION__'.length, captionEnd);
          const codeContent = formatted.substring(captionEnd + '__CAPTION_END__'.length, exampleEnd);

          md.appendMarkdown('*@example*\n\n');
          md.appendMarkdown(`${captionText}\n\n`);
          if (codeContent.trim()) {
            md.appendCodeblock(codeContent.trim(), 'bash');
            md.appendMarkdown('\n');
          }
        } else if (formatted.startsWith('__EXAMPLE__')) {
          // Example without caption - all code
          const exampleContent = formatted.substring('__EXAMPLE__'.length, formatted.indexOf('__ENDEXAMPLE__'));
          md.appendMarkdown('*@example*\n\n');
          if (exampleContent.trim()) {
            md.appendCodeblock(exampleContent.trim(), 'bash');
            md.appendMarkdown('\n');
          }
        } else if (formatted.startsWith('__DEFAULT__')) {
          // @default - show value as code
          const defaultContent = formatted.substring('__DEFAULT__'.length, formatted.indexOf('__ENDDEFAULT__'));
          md.appendMarkdown('*@default*\n\n');
          if (defaultContent.trim()) {
            md.appendCodeblock(defaultContent.trim(), 'bash');
            md.appendMarkdown('\n');
          }
        } else {
          md.appendMarkdown(formatted);
        }
      }
    }

    return new vscode.Hover(md);
  }

  /**
   * Convert ANY JSDoc, TSDoc, or JavaDoc inline tag into proper Markdown
   */
  private processInlineTags(text: string): string {
    if (!text) return text;

    // Matches ANY inline tag {@tagname content} or just {@tagname}
    return text.replace(/\{@(\w+)(?:\s+([^}]+))?\}/g, (match, tag, content) => {
      content = content ? content.trim() : '';

      switch (tag) {
        // --- 1. Pure Text & Code Formatting ---
        case 'code':
        case 'literal':
        case 'systemProperty':
          return `\`${content}\``;

        // --- 2. Meta & Inheritance Tags ---
        case 'inheritDoc':
          return `*(Inherits documentation)*`;
        case 'docRoot':
          return `*(Root Directory)*`;
        case 'value':
          return `\`${content || 'value'}\``;

        // --- 3. Link Tags ---
        case 'link':
        case 'linkcode':
        case 'linkplain':
        case 'tutorial':
          // Split by space or pipe. Captures URL (group 1) and display text (group 2)
          const parts = content.match(/^([^\s|]+)(?:[\s|]+(.+))?$/);
          if (!parts) return match; // Fallback if parsing fails

          const url = parts[1];
          const displayText = parts[2] || url;

          if (tag === 'linkcode') return `[\`${displayText}\`](${url})`;
          if (tag === 'tutorial') return `[Tutorial: ${displayText}](${url})`;
          return `[${displayText}](${url})`;

        // --- 4. TSDoc & JavaDoc Advanced Macros ---
        case 'label':
          return `*(Label: ${content})*`;
        case 'index':
          return `*(Index: ${content})*`;
        case 'snippet':
        case 'include':
        case 'includeCode':
          return `*(Includes: ${content})*`;

        // --- 5. Catch-all for unknown/future tags ---
        default:
          return content ? `*@${tag}* ${content}` : `*@${tag}*`;
      }
    });
  }

  /**
   * Format function/variable signature (JSDoc style)
   */
  private formatSignature(doclet: Doclet): string {
    if (doclet.kind === 'function') {
      return `function ${doclet.name}()`;
    } else if (doclet.kind === 'file') {
      // Extract filename from file URI
      const fileName = vscode.Uri.parse(doclet.meta.file).path.split('/').pop() || 'File';
      return fileName;
    } else {
      // Uses the exact keyword captured (readonly, declare, alias, etc.) or 'var'
      return `${doclet.modifier} ${doclet.name}`;
    }
  }

  /**
   * Format a JSDoc tag (exact JSDoc rendering)
   */
  private formatTag(tagName: string, value: string): string {
    // Check if value has continuation markers
    const hasSoftBreak = value.includes('<br/>');
    const hasHardBreak = value.includes('\n');
    const isMultiLine = hasSoftBreak || hasHardBreak;

    // Process value:
    // - Replace <br/> with space (soft break - continuation without trailing spaces)
    // - Replace \n with markdown line break (hard break - line had 2+ trailing spaces)
    // - Convert inline tags to markdown links
    const processValue = (val: string) => {
      const processed = val
        .replace(/<br\/>/g, ' ')
        .replace(/\n/g, '  \n');
      return this.processInlineTags(processed);
    };

    // @param, @constant, @argument, @augments, @extends formatting: @tagname name — description (inline format)
    // Strip {type} and [] brackets from the value
    if (tagName === 'param' || tagName === 'constant' || tagName === 'argument' || tagName === 'augments' || tagName === 'extends') {
      // Remove {type} annotation
      let processedValue = value.replace(/^\{[^}]*\}\s*/, '');

      // Extract parameter name (strip [] if present) and description
      const match = processedValue.match(/^(\[?)([^\]\s=]+)(?:=[^\]]*)?\]?\s*-?\s*(.*)$/);
      if (match) {
        const paramName = match[2]; // Just the name without []
        const description = match[3];
        // Only add — if there's a description
        if (description.trim()) {
          return `*@${tagName}* \`${paramName}\` — ${processValue(description)}\n\n`;
        } else {
          return `*@${tagName}* \`${paramName}\`\n\n`;
        }
      }
      return `*@${tagName}* ${processValue(processedValue)}\n\n`;
    }

    // @returns formatting: @returns — description (inline format with —), strip {type}
    if (tagName === 'returns' || tagName === 'return') {
      // Remove {type} annotation
      let processedValue = value.replace(/^\{[^}]*\}\s*/, '');
      if (isMultiLine) {
        return `*@returns*  \n${processValue(processedValue)}\n\n`;
      }
      if (!processedValue.trim()) {
        return `*@returns*\n\n`;
      }
      return `*@returns* — ${processValue(processedValue)}\n\n`;
    }

    // @default formatting: always push description to next line as code
    if (tagName === 'default') {
      if (!value.trim()) {
        return `*@default*\n\n`;
      }
      const processedValue = value.replace(/<br\/>/g, '\n');
      return `__DEFAULT__${processedValue}__ENDDEFAULT__`;
    }

    // @enum formatting: strip {type} but keep rest as plain text
    if (tagName === 'enum') {
      // Remove {type} annotation
      let processedValue = value.replace(/^\{[^}]*\}\s*/, '');
      if (isMultiLine) {
        return `*@enum*  \n${processValue(processedValue)}\n\n`;
      }
      if (!processedValue.trim()) {
        return `*@enum*\n\n`;
      }
      return `*@enum* — ${processValue(processedValue)}\n\n`;
    }

    // @implements formatting: strip {} symbols but keep text inside
    if (tagName === 'implements') {
      // Remove { and } but keep the text inside
      let processedValue = value.replace(/^\{([^}]*)\}\s*/, '$1 ').trim();
      if (isMultiLine) {
        return `*@implements*  \n${processValue(processedValue)}\n\n`;
      }
      if (!processedValue.trim()) {
        return `*@implements*\n\n`;
      }
      return `*@implements* — ${processValue(processedValue)}\n\n`;
    }

    // @template formatting: swap {type} with next word, then variablify first word
    if (tagName === 'template') {
      // Match: optional {type}, then name (with optional []), then rest
      const match = value.match(/^(?:\{([^}]+)\}\s+)?(\[?[^\]\s]+\]?)\s*(.*)$/);
      if (match) {
        const typeAnnotation = match[1]; // Type inside {}, if present
        const name = match[2]; // Name (possibly with [])
        const rest = match[3]; // Rest of description

        if (typeAnnotation) {
          // Had {type} - swap them and variablify name
          const description = rest ? `{${typeAnnotation}} ${rest}` : `{${typeAnnotation}}`;
          return `*@template* \`${name}\` — ${processValue(description.trim())}\n\n`;
        } else {
          // No {type} - just variablify name
          if (rest.trim()) {
            return `*@template* \`${name}\` — ${processValue(rest)}\n\n`;
          } else {
            return `*@template* \`${name}\`\n\n`;
          }
        }
      }
      return `*@template*\n\n`;
    }

    // @example formatting: handled separately in publish method
    if (tagName === 'example') {
      // Check if caption is on the first line (same line as @example)
      const captionMatch = value.match(/^<caption>(.*?)<\/caption>(.*)$/s);
      if (captionMatch) {
        const captionText = captionMatch[1];
        const remainingCode = captionMatch[2].replace(/<br\/>/g, '\n');
        return `__EXAMPLE_WITH_CAPTION__${captionText}__CAPTION_END__${remainingCode}__ENDEXAMPLE__`;
      }
      // No caption or caption not on first line - treat everything as code
      const processedValue = value.replace(/<br\/>/g, '\n');
      return `__EXAMPLE__${processedValue}__ENDEXAMPLE__`;
    }

    // @see formatting: @see — DisplayName (inline format with —)
    if (tagName === 'see') {
      // Single line or multi-line
      if (isMultiLine) {
        return `*@see*  \n${processValue(value)}\n\n`;
      }
      if (!value.trim()) {
        return `*@see*\n\n`;
      }
      return `*@see* — ${processValue(value)}\n\n`;
    }

    // Generic tag formatting:
    // - No value: @tagname (no connector)
    // - Multi-line: @tagname on its own line, value below
    // - Single-line: @tagname — value (inline with —)

    // Special case: just @ by itself
    if (tagName === '@') {
      if (!value.trim()) {
        return `*@*\n\n`;
      }
      if (isMultiLine) {
        return `*@*  \n${processValue(value)}\n\n`;
      }
      return `*@* — ${processValue(value)}\n\n`;
    }

    if (!value.trim()) {
      return `*@${tagName}*\n\n`;
    }
    if (isMultiLine) {
      return `*@${tagName}*  \n${processValue(value)}\n\n`;
    }
    return `*@${tagName}* — ${processValue(value)}\n\n`;
  }
}

export function registerHoverProvider(
  context: vscode.ExtensionContext,
  registry: SymbolRegistry,
  publisher: HoverPublisher
) {
  context.subscriptions.push(
    // Hover provider
    vscode.languages.registerHoverProvider('shellscript', {
      async provideHover(document, position) {
        try {
          const line = document.lineAt(position.line).text;
          const trimmedLine = line.trim();

          // Block hover on standard comments, BUT allow it on shebangs
          if (trimmedLine.startsWith('#') && !trimmedLine.startsWith('#!')) {
            return null;
          }

          // --- NEW: Sourced Script Hover ---
          const sourceMatch = trimmedLine.match(/^(?:source|\.)\s+(.+)$/);
          if (sourceMatch) {
            // Extract the path (remove quotes if any)
            const depPath = sourceMatch[1].replace(/['"]/g, '');

            try {
              // Resolve the absolute path relative to the current file
              const absolute = path.resolve(path.dirname(document.uri.fsPath), depPath);
              if (fs.existsSync(absolute)) {
                const targetUri = vscode.Uri.file(absolute).toString();

                // Fetch the file header doclet strictly from the target file
                const doclet = registry.lookup(targetUri, '__FILE__');
                if (doclet) {
                  return publisher.publish(doclet);
                }
              }
            } catch {
              // Ignore path resolution errors and fall through
            }
            return null; // Stop processing if it was a source line
          }
          // ---------------------------------

          let lookupWord = '';

          // If hovering over the shebang, look up our special file doclet
          if (trimmedLine.startsWith('#!')) {
            lookupWord = '__FILE__';
          } else {
            // Normal word lookup
            const range = document.getWordRangeAtPosition(position);
            if (!range) return null;
            lookupWord = document.getText(range).replace(/^\$/, '');

            // --- NEW: Keyword Hover Support ---
            // If hovering over a declaration keyword, extract the actual symbol name
            const declarationKeywords = ['function', 'readonly', 'declare', 'export', 'local', 'alias'];
            if (declarationKeywords.includes(lookupWord)) {
              // Check if it's a function declaration
              const funcMatch = trimmedLine.match(/^function\s+([a-zA-Z0-9_]+)/);
              if (funcMatch) {
                lookupWord = funcMatch[1];
              } else {
                // Check if it's a variable declaration
                const varMatch = trimmedLine.match(/^(?:(readonly|declare|export|local|alias)\s+)?([a-zA-Z0-9_]+)=/);
                if (varMatch && varMatch[2]) {
                  lookupWord = varMatch[2]; // varMatch[2] is the variable name
                }
              }
            }
            // ----------------------------------
          }

          const currentUri = document.uri.toString();

          // If we are hovering a shebang, ONLY look in the current file!
          // Otherwise, allow normal workspace-wide scoping for functions/variables.
          const doclet = lookupWord === '__FILE__'
            ? registry.lookup(currentUri, lookupWord)
            : registry.lookupWithScope(currentUri, lookupWord);

          if (doclet) {
            return publisher.publish(doclet);
          }

          return null;
        } catch (error) {
          console.error('Shell Doctor: Error in hover provider:', error);
          return null;
        }
      }
    })
  );
}
