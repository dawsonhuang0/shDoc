import * as vscode from 'vscode';
import { TAG_PATTERNS } from './config';

/**
 * Style type annotations {Type} - teal text, pink <>
 */
export function styleTypeAnnotation(
  line: string,
  lineNumber: number,
  builder: vscode.SemanticTokensBuilder
): void {
  const typeTagMatch = line.match(/@(?:param|returns?|throws|see|typedef|property|prop|callback|implements|namespace|private|protected|template|argument|type|enum|yields|satisfies|member|var|constant)\s+\{([^}]+)\}/);
  if (!typeTagMatch || typeTagMatch.index === undefined) return;

  const typeStart = typeTagMatch.index + typeTagMatch[0].length - typeTagMatch[1].length - 1;
  const typeContent = typeTagMatch[1];

  let segmentStart = -1;
  let segmentText = '';

  for (let j = 0; j < typeContent.length; j++) {
    const char = typeContent[j];

    if (char === '<' || char === '>') {
      if (segmentText.length > 0) {
        builder.push(
          new vscode.Range(lineNumber, segmentStart, lineNumber, segmentStart + segmentText.length),
          'type'
        );
      }
      builder.push(
        new vscode.Range(lineNumber, typeStart + j, lineNumber, typeStart + j + 1),
        'keyword'
      );
      segmentStart = -1;
      segmentText = '';
    } else {
      if (segmentStart === -1) segmentStart = typeStart + j;
      segmentText += char;
    }
  }

  if (segmentText.length > 0) {
    builder.push(
      new vscode.Range(lineNumber, segmentStart, lineNumber, segmentStart + segmentText.length),
      'type'
    );
  }
}

/**
 * Style word after tag - teal or cyan
 */
export function styleWordAfterTag(
  line: string,
  lineNumber: number,
  builder: vscode.SemanticTokensBuilder,
  tags: readonly string[],
  color: 'type' | 'variable'
): void {
  const pattern = new RegExp(`@(?:${tags.join('|')})\\s+([a-zA-Z0-9_:#./\\-]+)`);
  const match = line.match(pattern);
  if (!match || match.index === undefined) return;

  const wordStart = match.index + match[0].length - match[1].length;
  builder.push(
    new vscode.Range(lineNumber, wordStart, lineNumber, wordStart + match[1].length),
    color
  );
}

/**
 * Style brackets [] with content (teal or cyan, pink <>)
 */
export function styleBracketContent(
  line: string,
  lineNumber: number,
  builder: vscode.SemanticTokensBuilder,
  tags: readonly string[],
  color: 'type' | 'variable'
): void {
  for (const tag of tags) {
    const pattern = new RegExp(`@${tag}\\s+(?:\\{[^}]*\\}\\s+)?(\\[([^\\]]+)\\])`);
    const match = line.match(pattern);
    if (!match || match.index === undefined) continue;

    const bracketContent = match[2];
    const contentStart = match.index + match[0].length - match[1].length + 1;

    let segmentStart = -1;
    let segmentText = '';

    for (let j = 0; j < bracketContent.length; j++) {
      const char = bracketContent[j];

      if (char === '<' || char === '>') {
        if (segmentText.length > 0) {
          builder.push(
            new vscode.Range(lineNumber, segmentStart, lineNumber, segmentStart + segmentText.length),
            color
          );
        }
        builder.push(
          new vscode.Range(lineNumber, contentStart + j, lineNumber, contentStart + j + 1),
          'keyword'
        );
        segmentStart = -1;
        segmentText = '';
      } else {
        if (segmentStart === -1) segmentStart = contentStart + j;
        segmentText += char;
      }
    }

    if (segmentText.length > 0) {
      builder.push(
        new vscode.Range(lineNumber, segmentStart, lineNumber, segmentStart + segmentText.length),
        color
      );
    }
    break;
  }
}

/**
 * Style braces {} with content (teal or cyan, pink <>)
 */
export function styleBraceContent(
  line: string,
  lineNumber: number,
  builder: vscode.SemanticTokensBuilder,
  tags: readonly string[],
  color: 'type' | 'variable'
): void {
  for (const tag of tags) {
    const pattern = new RegExp(`@${tag}\\s+(\\{([^}]+)\\})`);
    const match = line.match(pattern);
    if (!match || match.index === undefined) continue;

    const braceContent = match[2];
    const contentStart = match.index + match[0].length - match[1].length + 1;

    let segmentStart = -1;
    let segmentText = '';

    for (let j = 0; j < braceContent.length; j++) {
      const char = braceContent[j];

      if (char === '<' || char === '>') {
        if (segmentText.length > 0) {
          builder.push(
            new vscode.Range(lineNumber, segmentStart, lineNumber, segmentStart + segmentText.length),
            color
          );
        }
        builder.push(
          new vscode.Range(lineNumber, contentStart + j, lineNumber, contentStart + j + 1),
          'keyword'
        );
        segmentStart = -1;
        segmentText = '';
      } else {
        if (segmentStart === -1) segmentStart = contentStart + j;
        segmentText += char;
      }
    }

    if (segmentText.length > 0) {
      builder.push(
        new vscode.Range(lineNumber, segmentStart, lineNumber, segmentStart + segmentText.length),
        color
      );
    }
    break;
  }
}

/**
 * Decorate type annotation braces {} - gold
 */
export function decorateTypeBraces(line: string, lineNumber: number, ranges: vscode.Range[]): void {
  const typeTagMatch = line.match(/@(?:param|returns?|throws|see|typedef|property|prop|callback|implements|namespace|private|protected|template|argument|type|enum|yields|satisfies|member|var|constant)\s+(\{[^}]*\})/);
  if (!typeTagMatch || typeTagMatch.index === undefined) return;

  const braceStart = typeTagMatch.index + typeTagMatch[0].length - typeTagMatch[1].length;
  ranges.push(new vscode.Range(lineNumber, braceStart, lineNumber, braceStart + 1));
  const braceEnd = braceStart + typeTagMatch[1].length - 1;
  ranges.push(new vscode.Range(lineNumber, braceEnd, lineNumber, braceEnd + 1));
}

/**
 * Decorate brackets [] - gold
 */
export function decorateBrackets(line: string, lineNumber: number, ranges: vscode.Range[], tags: readonly string[]): void {
  for (const tag of tags) {
    const pattern = new RegExp(`@${tag}\\s+(?:\\{[^}]*\\}\\s+)?(\\[[^\\]]*\\])`);
    const match = line.match(pattern);
    if (!match || match.index === undefined) continue;

    const bracketStart = match.index + match[0].length - match[1].length;
    ranges.push(new vscode.Range(lineNumber, bracketStart, lineNumber, bracketStart + 1));
    const bracketEnd = bracketStart + match[1].length - 1;
    ranges.push(new vscode.Range(lineNumber, bracketEnd, lineNumber, bracketEnd + 1));
    break;
  }
}

/**
 * Decorate braces {} - gold
 */
export function decorateBraces(line: string, lineNumber: number, ranges: vscode.Range[], tags: readonly string[]): void {
  for (const tag of tags) {
    const pattern = new RegExp(`@${tag}\\s+(\\{[^}]*\\})`);
    const match = line.match(pattern);
    if (!match || match.index === undefined) continue;

    const braceStart = match.index + match[0].length - match[1].length;
    ranges.push(new vscode.Range(lineNumber, braceStart, lineNumber, braceStart + 1));
    const braceEnd = braceStart + match[1].length - 1;
    ranges.push(new vscode.Range(lineNumber, braceEnd, lineNumber, braceEnd + 1));
    break;
  }
}

/**
 * Style inline tags {@link URL|text}
 */
export function styleInlineTags(line: string, lineNumber: number, builder: vscode.SemanticTokensBuilder): void {
  const inlineTagMatches = [...line.matchAll(/\{(@\w+)([^}]*)\}/g)];
  for (const match of inlineTagMatches) {
    if (match.index === undefined) continue;

    const tagStart = match.index + 1;
    const keyword = match[1];
    const content = match[2];

    builder.push(
      new vscode.Range(lineNumber, tagStart, lineNumber, tagStart + keyword.length),
      'macro',
      ['documentation']
    );

    if (content.includes('|')) {
      const contentStart = tagStart + keyword.length;
      const pipeIndex = content.indexOf('|');

      const url = content.substring(0, pipeIndex);
      if (url.trim()) {
        builder.push(
          new vscode.Range(lineNumber, contentStart, lineNumber, contentStart + url.length),
          'variable'
        );
      }

      // Highlight everything from pipe onwards (including pipe) as teal
      const displayTextWithPipe = content.substring(pipeIndex);
      if (displayTextWithPipe) {
        const displayStart = contentStart + pipeIndex;
        builder.push(
          new vscode.Range(lineNumber, displayStart, lineNumber, displayStart + displayTextWithPipe.length),
          'type'
        );
      }
    }
  }
}

/**
 * Decorate inline tag braces {} - gold
 */
export function decorateInlineTags(line: string, lineNumber: number, ranges: vscode.Range[]): void {
  const inlineTagMatches = [...line.matchAll(/\{@\w+[^}]*\}/g)];
  for (const match of inlineTagMatches) {
    if (match.index === undefined) continue;
    ranges.push(new vscode.Range(lineNumber, match.index, lineNumber, match.index + 1));
    const braceEnd = match.index + match[0].length - 1;
    ranges.push(new vscode.Range(lineNumber, braceEnd, lineNumber, braceEnd + 1));
  }
}
