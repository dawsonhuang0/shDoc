import * as vscode from 'vscode';

// Tag system
import { TAG_PATTERNS, styleTypeAnnotation, styleWordAfterTag, styleBracketContent, styleBraceContent,
         styleInlineTags, decorateTypeBraces, decorateBrackets, decorateBraces, decorateInlineTags,
         styleExampleCaption, styleAuthor, decorateAuthor, styleLicense, decorateLicense,
         styleParamOptional, decorateParamOptional, styleVariables,
         styleTypedefAfterType, stylePropertyAfterType, styleNamespace, decorateNamespace, decorateProperty } from '../tags';

/**
 * Decoration type for gold curly braces
 */
export const goldBraceDecoration = vscode.window.createTextEditorDecorationType({
  color: '#F9D949'  // Gold color (you can change this hex value)
});

/**
 * Identify doc block ranges in a document
 * Returns set of line numbers that are within doc blocks (### ... ##)
 */
export function getDocBlockLines(document: vscode.TextDocument): Set<number> {
  const docBlockLines = new Set<number>();
  let inDocBlock = false;
  let docBlockStart = -1;

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i).text.trim();

    if (line === '###' || line === '###!') {
      inDocBlock = true;
      docBlockStart = i;
    } else if (line === '##' && inDocBlock) {
      // Add all lines in the doc block (excluding ### and ##)
      for (let j = docBlockStart + 1; j < i; j++) {
        docBlockLines.add(j);
      }
      inDocBlock = false;
      docBlockStart = -1;
    }
  }

  return docBlockLines;
}

/**
 * Semantic Token Provider - Syntax highlights doc comments in source
 */
export class DocCommentTokenProvider implements vscode.DocumentSemanticTokensProvider {
  readonly legend = new vscode.SemanticTokensLegend(
    ['macro', 'variable', 'type', 'operator', 'keyword'],
    ['documentation']
  );

  provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.SemanticTokens {
    const builder = new vscode.SemanticTokensBuilder(this.legend);
    const docBlockLines = getDocBlockLines(document);

    for (let i = 0; i < document.lineCount; i++) {
      // Only process lines within doc blocks
      if (!docBlockLines.has(i)) continue;

      const line = document.lineAt(i).text;
      const trimmed = line.trim();

      // Check if this line has any @tag - only style lines with tags
      const hasTag = /@\w*/.test(trimmed);
      if (!hasTag) continue;

      // Highlight @tags (blue) - but not @ inside email addresses
      const tagMatches = [...line.matchAll(/@(\w*)/g)];
      for (const match of tagMatches) {
        if (match.index !== undefined) {
          // Check if this @ is inside angle brackets (email address)
          const beforeMatch = line.substring(0, match.index);
          const afterMatch = line.substring(match.index);
          const lastOpenBracket = beforeMatch.lastIndexOf('<');
          const lastCloseBracket = beforeMatch.lastIndexOf('>');
          const nextCloseBracket = afterMatch.indexOf('>');

          // Skip if @ is inside < > (email address)
          if (lastOpenBracket > lastCloseBracket && nextCloseBracket !== -1) {
            continue;
          }

          builder.push(
            new vscode.Range(i, match.index, i, match.index + match[0].length),
            'macro',
            ['documentation']
          );
        }
      }

      // Apply pattern-based styling
      // {Type} annotation for all tags that support it
      styleTypeAnnotation(line, i, builder);

      // Plainword styling - teal (TAG_SQ_TYPE + TAG_CL_TYPE_ANDOR_SQ_TYPE + TAG_ANY_TYPE)
      styleWordAfterTag(line, i, builder, [...TAG_PATTERNS.TAG_SQ_TYPE, ...TAG_PATTERNS.TAG_CL_TYPE_ANDOR_SQ_TYPE, ...TAG_PATTERNS.TAG_ANY_TYPE], 'type');

      // Plainword styling - cyan (TAG_SQ_VAR + TAG_ANY_VAR)
      styleWordAfterTag(line, i, builder, [...TAG_PATTERNS.TAG_SQ_VAR, ...TAG_PATTERNS.TAG_ANY_VAR], 'variable');

      // Bracket content styling - teal (TAG_SQ_TYPE + TAG_CL_TYPE_ANDOR_SQ_TYPE + TAG_ANY_TYPE)
      styleBracketContent(line, i, builder, [...TAG_PATTERNS.TAG_SQ_TYPE, ...TAG_PATTERNS.TAG_CL_TYPE_ANDOR_SQ_TYPE, ...TAG_PATTERNS.TAG_ANY_TYPE], 'type');

      // Bracket content styling - cyan (TAG_ANY_VAR)
      styleBracketContent(line, i, builder, TAG_PATTERNS.TAG_ANY_VAR, 'variable');

      // Brace content styling - teal (TAG_ANY_TYPE)
      styleBraceContent(line, i, builder, TAG_PATTERNS.TAG_ANY_TYPE, 'type');

      // Brace content styling - cyan (TAG_ANY_VAR)
      styleBraceContent(line, i, builder, TAG_PATTERNS.TAG_ANY_VAR, 'variable');

      // Inline tags {@link URL|text}
      styleInlineTags(line, i, builder);

      // Apply special tag styling
      styleExampleCaption(line, i, builder);
      styleAuthor(line, i, builder);
      styleLicense(line, i, builder);
      styleParamOptional(line, i, builder);
      styleTypedefAfterType(line, i, builder);
      stylePropertyAfterType(line, i, builder);
      styleNamespace(line, i, builder);
      styleVariables(line, i, builder);
    }

    return builder.build();
  }
}

/**
 * Apply gold color to curly braces in doc comments
 */
export function updateBraceDecorations(editor: vscode.TextEditor) {
  if (editor.document.languageId !== 'shellscript') return;

  const braceRanges: vscode.Range[] = [];
  const docBlockLines = getDocBlockLines(editor.document);

  for (let i = 0; i < editor.document.lineCount; i++) {
    // Only process lines within doc blocks
    if (!docBlockLines.has(i)) continue;

    const line = editor.document.lineAt(i).text;

    // Apply pattern-based decorations
    // Gold {} braces for {Type} annotations
    decorateTypeBraces(line, i, braceRanges);

    // Gold [] brackets for all tags that support them
    decorateBrackets(line, i, braceRanges, [
      ...TAG_PATTERNS.TAG_SQ_TYPE,
      ...TAG_PATTERNS.TAG_SQ_VAR,
      ...TAG_PATTERNS.TAG_CL_TYPE_ANDOR_SQ_TYPE,
      ...TAG_PATTERNS.TAG_ANY_VAR,
      ...TAG_PATTERNS.TAG_ANY_TYPE
    ]);

    // Gold {} braces for {value} syntax (TAG_ANY_VAR and TAG_ANY_TYPE)
    decorateBraces(line, i, braceRanges, [...TAG_PATTERNS.TAG_ANY_VAR, ...TAG_PATTERNS.TAG_ANY_TYPE]);

    // Gold {} braces for inline tags
    decorateInlineTags(line, i, braceRanges);

    // Apply special decorations
    decorateAuthor(line, i, braceRanges);
    decorateLicense(line, i, braceRanges);
    decorateParamOptional(line, i, braceRanges);
    decorateNamespace(line, i, braceRanges);
    decorateProperty(line, i, braceRanges);
  }

  editor.setDecorations(goldBraceDecoration, braceRanges);
}
