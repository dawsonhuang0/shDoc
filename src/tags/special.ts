import * as vscode from 'vscode';

/**
 * Special styling for @example caption tags
 */
export function styleExampleCaption(line: string, lineNumber: number, builder: vscode.SemanticTokensBuilder): void {
  if (!/@example\s/.test(line.trim())) return;

  const captionMatch = line.match(/<caption>.*?<\/caption>/);
  if (!captionMatch || captionMatch.index === undefined) return;

  // Highlight opening <caption>
  const openTagStart = captionMatch.index;
  builder.push(
    new vscode.Range(lineNumber, openTagStart, lineNumber, openTagStart + '<caption>'.length),
    'macro',
    ['documentation']
  );

  // Highlight closing </caption>
  const closeTagStart = captionMatch.index + captionMatch[0].length - '</caption>'.length;
  builder.push(
    new vscode.Range(lineNumber, closeTagStart, lineNumber, closeTagStart + '</caption>'.length),
    'macro',
    ['documentation']
  );
}

/**
 * Special styling for @author - text before <email> is teal, brackets styled
 */
export function styleAuthor(line: string, lineNumber: number, builder: vscode.SemanticTokensBuilder): void {
  const authorMatch = line.match(/@author\s+(.+?)(?:<|$)/);
  if (!authorMatch || authorMatch.index === undefined) return;

  const authorContent = authorMatch[1];
  const authorStart = authorMatch.index + '@author'.length + 1;

  // Style all text (inside and outside brackets) as teal
  let currentText = '';
  let currentTextStart = -1;

  for (let j = 0; j < authorContent.length; j++) {
    const char = authorContent[j];

    if (char === '{' || char === '}' || char === '[' || char === ']') {
      // Save accumulated text before bracket
      if (currentText.trim()) {
        builder.push(
          new vscode.Range(lineNumber, currentTextStart, lineNumber, currentTextStart + currentText.length),
          'type'
        );
      }
      currentText = '';
      currentTextStart = -1;
    } else {
      // Accumulate text
      if (currentTextStart === -1) {
        currentTextStart = authorStart + j;
      }
      currentText += char;
    }
  }

  // Handle remaining text
  if (currentText.trim()) {
    builder.push(
      new vscode.Range(lineNumber, currentTextStart, lineNumber, currentTextStart + currentText.length),
      'type'
    );
  }
}

/**
 * Decorate @author brackets {} and []
 */
export function decorateAuthor(line: string, lineNumber: number, ranges: vscode.Range[]): void {
  const authorMatch = line.match(/@author\s+(.+?)(?:<|$)/);
  if (!authorMatch || authorMatch.index === undefined) return;

  const authorContent = authorMatch[1];
  const authorStart = authorMatch.index + '@author'.length + 1;

  for (let j = 0; j < authorContent.length; j++) {
    if (authorContent[j] === '{' || authorContent[j] === '}' ||
        authorContent[j] === '[' || authorContent[j] === ']') {
      ranges.push(new vscode.Range(lineNumber, authorStart + j, lineNumber, authorStart + j + 1));
    }
  }
}

/**
 * Special styling for @license - first word is cyan, can be wrapped in [] or {}
 */
export function styleLicense(line: string, lineNumber: number, builder: vscode.SemanticTokensBuilder): void {
  const licenseMatch = line.match(/@license\s+([\[{]?)([^\]\}\s]*)([\]}]?)/);
  if (!licenseMatch || licenseMatch.index === undefined) return;

  const licenseStart = licenseMatch.index + '@license'.length + 1;
  const hasOpenBracket = licenseMatch[1].length > 0;
  const word = licenseMatch[2];
  const offset = hasOpenBracket ? 1 : 0; // Skip opening bracket if present

  if (word.length > 0) {
    builder.push(
      new vscode.Range(lineNumber, licenseStart + offset, lineNumber, licenseStart + offset + word.length),
      'variable'  // Cyan
    );
  }
}

/**
 * Decorate @license brackets
 */
export function decorateLicense(line: string, lineNumber: number, ranges: vscode.Range[]): void {
  const licenseMatch = line.match(/@license\s+([\[{])([^\]\}\s]*)([\]}])/);
  if (!licenseMatch || licenseMatch.index === undefined) return;

  const licenseStart = licenseMatch.index + '@license'.length + 1;
  // Opening bracket
  ranges.push(new vscode.Range(lineNumber, licenseStart, lineNumber, licenseStart + 1));
  // Closing bracket
  const closeBracketPos = licenseStart + 1 + licenseMatch[2].length;
  ranges.push(new vscode.Range(lineNumber, closeBracketPos, lineNumber, closeBracketPos + 1));
}

/**
 * Special styling for @param, @argument, @member, @var, @constant optional parameters [name=default]
 * Only styles if {Type} exists
 */
export function styleParamOptional(line: string, lineNumber: number, builder: vscode.SemanticTokensBuilder): void {
  const optionalParamMatch = line.match(/@(?:param|argument|member|var|constant)\s+(?:\{[^}]*\}\s+)?(\[([^\]]+)\])/);
  if (!optionalParamMatch || optionalParamMatch.index === undefined) return;

  // Check if {Type} exists
  const hasType = /@(?:param|argument|member|var|constant)\s+\{[^}]*\}/.test(line);

  // Only style if {Type} exists
  if (!hasType) return;

  const bracketContent = optionalParamMatch[2];
  const contentStart = optionalParamMatch.index + optionalParamMatch[0].indexOf('[') + 1;

  // Split by = to handle [name=default]
  const parts = bracketContent.split('=');

  // Style the parameter name (before =) as cyan
  if (parts[0]) {
    builder.push(
      new vscode.Range(lineNumber, contentStart, lineNumber, contentStart + parts[0].length),
      'variable'
    );
  }

  // Style the = sign as operator (white)
  if (parts.length > 1) {
    const equalsPos = contentStart + parts[0].length;
    builder.push(
      new vscode.Range(lineNumber, equalsPos, lineNumber, equalsPos + 1),
      'operator'
    );
  }

  // Style the default value (after =) as cyan, with <> as pink
  if (parts.length > 1 && parts[1]) {
    const defaultStart = contentStart + parts[0].length + 1;
    const defaultValue = parts[1];

    let segmentStart = -1;
    let segmentText = '';

    for (let j = 0; j < defaultValue.length; j++) {
      const char = defaultValue[j];

      if (char === '<' || char === '>') {
        if (segmentText.length > 0) {
          builder.push(
            new vscode.Range(lineNumber, segmentStart, lineNumber, segmentStart + segmentText.length),
            'variable'
          );
        }

        builder.push(
          new vscode.Range(lineNumber, defaultStart + j, lineNumber, defaultStart + j + 1),
          'keyword'
        );

        segmentStart = -1;
        segmentText = '';
      } else {
        if (segmentStart === -1) {
          segmentStart = defaultStart + j;
        }
        segmentText += char;
      }
    }

    if (segmentText.length > 0) {
      builder.push(
        new vscode.Range(lineNumber, segmentStart, lineNumber, segmentStart + segmentText.length),
        'variable'
      );
    }
  }
}

/**
 * Decorate @param, @argument, @member, @var, @constant optional brackets - only if {Type} exists
 */
export function decorateParamOptional(line: string, lineNumber: number, ranges: vscode.Range[]): void {
  const optionalParamMatch = line.match(/@(?:param|argument|member|var|constant)\s+(?:\{[^}]*\}\s+)?(\[[^\]]+\])/);
  if (!optionalParamMatch || optionalParamMatch.index === undefined) return;

  // Check if {Type} exists
  const hasType = /@(?:param|argument|member|var|constant)\s+\{[^}]*\}/.test(line);

  // Only decorate if {Type} exists
  if (!hasType) return;

  const bracketStart = optionalParamMatch.index + optionalParamMatch[0].length - optionalParamMatch[1].length;
  ranges.push(new vscode.Range(lineNumber, bracketStart, lineNumber, bracketStart + 1));
  const bracketEnd = bracketStart + optionalParamMatch[1].length - 1;
  ranges.push(new vscode.Range(lineNumber, bracketEnd, lineNumber, bracketEnd + 1));
}

/**
 * Special styling for @typedef {Type} word - word after {Type} as teal
 */
export function styleTypedefAfterType(line: string, lineNumber: number, builder: vscode.SemanticTokensBuilder): void {
  const match = line.match(/@typedef\s+\{[^}]+\}\s+([a-zA-Z0-9_]+)/);
  if (!match || match.index === undefined) return;

  const wordStart = match.index + match[0].length - match[1].length;
  builder.push(
    new vscode.Range(lineNumber, wordStart, lineNumber, wordStart + match[1].length),
    'type'
  );
}

/**
 * Special styling for @property and @prop - only style if {Type} exists
 */
export function stylePropertyAfterType(line: string, lineNumber: number, builder: vscode.SemanticTokensBuilder): void {
  // Match @property/@prop with optional {Type} and then name or [name]
  const match = line.match(/@(?:property|prop)\s+(?:\{[^}]*\}\s+)?([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*\.?|\[([^\]]+)\])/);
  if (!match || match.index === undefined) return;

  // Check if {Type} exists
  const hasType = /@(?:property|prop)\s+\{[^}]*\}/.test(line);

  // If there's a bracket but no type, don't style
  if (match[2] && !hasType) return;

  // Only style if {Type} exists
  if (!hasType) return;

  // Style the name (either plain or in brackets)
  if (match[2]) {
    // Name is in brackets and {Type} exists - style the name
    const nameStart = match.index + match[0].indexOf('[') + 1;
    builder.push(
      new vscode.Range(lineNumber, nameStart, lineNumber, nameStart + match[2].length),
      'variable'
    );
  } else if (match[1]) {
    // Plain name with {Type}
    const nameStart = match.index + match[0].length - match[1].length;
    builder.push(
      new vscode.Range(lineNumber, nameStart, lineNumber, nameStart + match[1].length),
      'variable'
    );
  }
}

/**
 * Decorate @property and @prop brackets - only if {Type} exists
 */
export function decorateProperty(line: string, lineNumber: number, ranges: vscode.Range[]): void {
  const match = line.match(/@(?:property|prop)\s+(?:\{[^}]*\}\s+)?(\[[^\]]+\])/);
  if (!match || match.index === undefined) return;

  // Check if {Type} exists
  const hasType = /@(?:property|prop)\s+\{[^}]*\}/.test(line);

  // Only decorate brackets if {Type} exists
  if (!hasType) return;

  const bracketStart = match.index + match[0].length - match[1].length;
  ranges.push(new vscode.Range(lineNumber, bracketStart, lineNumber, bracketStart + 1));
  const bracketEnd = bracketStart + match[1].length - 1;
  ranges.push(new vscode.Range(lineNumber, bracketEnd, lineNumber, bracketEnd + 1));
}

/**
 * Special styling for @namespace, @template, and @argument - only style [] if {Type} exists
 */
export function styleNamespace(line: string, lineNumber: number, builder: vscode.SemanticTokensBuilder): void {
  // Match @namespace, @template, or @argument with optional {Type} and then name or [name]
  const match = line.match(/@(?:namespace|template|argument)\s+(?:\{[^}]*\}\s+)?([a-zA-Z0-9_:./-]+|\[([^\]]+)\])/);
  if (!match || match.index === undefined) return;

  // Check if {Type} exists
  const hasType = /@(?:namespace|template|argument)\s+\{[^}]*\}/.test(line);

  // If there's a bracket but no type, don't style
  if (match[2] && !hasType) return;

  // Style the name (either plain or in brackets)
  if (match[2]) {
    // Name is in brackets and {Type} exists - style the name
    const nameStart = match.index + match[0].indexOf('[') + 1;
    builder.push(
      new vscode.Range(lineNumber, nameStart, lineNumber, nameStart + match[2].length),
      'variable'
    );
  } else if (match[1]) {
    // Plain name
    const nameStart = match.index + match[0].length - match[1].length;
    builder.push(
      new vscode.Range(lineNumber, nameStart, lineNumber, nameStart + match[1].length),
      'variable'
    );
  }
}

/**
 * Decorate @namespace, @template, and @argument brackets - only if {Type} exists
 */
export function decorateNamespace(line: string, lineNumber: number, ranges: vscode.Range[]): void {
  const match = line.match(/@(?:namespace|template|argument)\s+(?:\{[^}]*\}\s+)?(\[[^\]]+\])/);
  if (!match || match.index === undefined) return;

  // Check if {Type} exists
  const hasType = /@(?:namespace|template|argument)\s+\{[^}]*\}/.test(line);

  // Only decorate brackets if {Type} exists
  if (!hasType) return;

  const bracketStart = match.index + match[0].length - match[1].length;
  ranges.push(new vscode.Range(lineNumber, bracketStart, lineNumber, bracketStart + 1));
  const bracketEnd = bracketStart + match[1].length - 1;
  ranges.push(new vscode.Range(lineNumber, bracketEnd, lineNumber, bracketEnd + 1));
}

/**
 * Style $variables - skip for certain tags
 */
export function styleVariables(line: string, lineNumber: number, builder: vscode.SemanticTokensBuilder): void {
  const trimmed = line.trim();

  // Skip if @param, @member, @var, @constant has [] without {} type annotation
  const hasParamWithBracketsNoType = /@(?:param|member|var|constant)\s+[^\{]*\[/.test(trimmed);
  // Skip for tags that don't style variables in description
  const isReturnLikeTag = /@(?:returns?|throws?|typedef|property|callback)\s/.test(trimmed);

  if (hasParamWithBracketsNoType || isReturnLikeTag) return;

  // Match $variables including property access like $4.verbose, $VAR.property
  const varMatches = [...line.matchAll(/\$(?:[0-9]+(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*\.?|[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*\.?|[@*#?!$-])(?==|\s|-|$)/g)];
  for (const match of varMatches) {
    if (match.index !== undefined) {
      builder.push(
        new vscode.Range(lineNumber, match.index, lineNumber, match.index + match[0].length),
        'variable'
      );
    }
  }

  // Match property paths without $ (like options.verbose in @param, @member, @var, @constant)
  const paramPropertyMatch = line.match(/@(?:param|member|var|constant)\s+(?:\{[^}]*\}\s+)?([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*\.?)(?==|\s|-|$)/);
  if (paramPropertyMatch && paramPropertyMatch.index !== undefined) {
    const propertyStart = paramPropertyMatch.index + paramPropertyMatch[0].length - paramPropertyMatch[1].length;
    builder.push(
      new vscode.Range(lineNumber, propertyStart, lineNumber, propertyStart + paramPropertyMatch[1].length),
      'variable'
    );
  }
}
