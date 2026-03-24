import * as vscode from 'vscode';

/**
 * Step 1: Auto-expand ### to ### ## on same line (with Shebang awareness)
 */
export async function handleHashExpansion(event: vscode.TextDocumentChangeEvent) {
  if (event.document.languageId !== 'shellscript') return;
  if (event.contentChanges.length === 0) return;

  const change = event.contentChanges[0];
  const editor = vscode.window.activeTextEditor;

  if (!editor || editor.document !== event.document) return;

  // Check if user just typed a #
  if (change.text !== '#') return;

  const line = event.document.lineAt(change.range.start.line);
  const lineText = line.text;

  // Check if the line now contains exactly ### or ###! (with optional leading whitespace)
  const match = lineText.match(/^(\s*)(###!?)$/);
  if (!match) return;

  const indent = match[1];
  const hashPart = match[2]; // "###" or "###!"
  const lineNumber = change.range.start.line;
  const hashPosition = indent.length + hashPart.length;

  let toInsert = ' ##';
  let magicOffset = 0;

  // Auto-upgrade to file doclet (###!) if directly under shebang
  if (hashPart === '###' && lineNumber > 0) {
    const prevLineText = event.document.lineAt(lineNumber - 1).text.trim();
    if (prevLineText.startsWith('#!')) {
      toInsert = '! ##'; // Upgrade the expansion string
      magicOffset = 1;   // Shift the cursor past the newly inserted '!'
    }
  }

  // Insert the expansion string
  await editor.edit(editBuilder => {
    editBuilder.insert(new vscode.Position(lineNumber, hashPosition), toInsert);
  });

  // Position cursor perfectly between the doc block start and the closing ##
  const newPosition = new vscode.Position(lineNumber, hashPosition + magicOffset);
  editor.selection = new vscode.Selection(newPosition, newPosition);
}

/**
 * Auto-continuation: Add " # " on new line when pressing Enter in doc blocks
 */
export async function handleDocLineContinuation(event: vscode.TextDocumentChangeEvent) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || event.document !== editor.document) return;
  if (event.document.languageId !== 'shellscript') return;
  if (event.contentChanges.length === 0) return;

  const change = event.contentChanges[0];

  // FIX 1: Capture the exact auto-indent spaces VS Code inserted
  const autoIndentMatch = change.text.match(/^(\r?\n)([\t ]*)$/);
  if (!autoIndentMatch) return;

  const autoIndentSpaces = autoIndentMatch[2]; // The spaces after the newline

  const lineNum = change.range.start.line;
  const line = event.document.lineAt(lineNum).text;
  const trimmed = line.trim();

  if (trimmed.match(/^##(?!#)/)) return;
  if (!line.includes('#')) return;

  let inDocBlock = false;
  for (let i = lineNum; i >= 0; i--) {
    const checkLine = event.document.lineAt(i).text.trim();
    if (checkLine === '###' || checkLine === '###!') {
      inDocBlock = true;
      break;
    }
    if (checkLine.match(/^##(?!#)/)) break;
  }

  if (!inDocBlock) return;

  const hashIndex = line.indexOf('#');
  const beforeHash = line.substring(0, hashIndex);

  if (beforeHash.trim() !== '') return;

  if (trimmed === '###' && lineNum + 1 < event.document.lineCount) {
    const nextLine = event.document.lineAt(lineNum + 1).text;
    if (nextLine.trim() === '##') return;
  }

  const toInsert = trimmed.match(/^###!?/) ? ' # ' : `${beforeHash}# `;

  const newLineNum = lineNum + 1;

  await editor.edit(editBuilder => {
    // FIX 2: Replace ONLY the auto-indent spaces, preserving pushed-down text!
    const replaceRange = new vscode.Range(newLineNum, 0, newLineNum, autoIndentSpaces.length);
    editBuilder.replace(replaceRange, toInsert);
  });

  const cursorPos = new vscode.Position(newLineNum, toInsert.length);
  editor.selection = new vscode.Selection(cursorPos, cursorPos);
}

/**
 * Step 4: Remove extra auto-indent when pressing Enter after ##
 * and perfectly align the cursor with the opening ###
 */
export async function handleEnterAfterClosing(event: vscode.TextDocumentChangeEvent) {
  if (event.document.languageId !== 'shellscript') return;
  if (event.contentChanges.length === 0) return;

  const change = event.contentChanges[0];
  const editor = vscode.window.activeTextEditor;

  if (!editor || editor.document !== event.document) return;

  // Capture the auto-indent spaces VS Code inserted on the new line
  const autoIndentMatch = change.text.match(/^(\r?\n)([\t ]*)$/);
  if (!autoIndentMatch) return;

  const autoIndentSpaces = autoIndentMatch[2];

  const enterLineNum = change.range.start.line;
  const newLineNum = enterLineNum + 1;

  if (newLineNum >= event.document.lineCount) return;

  // Check if the line we pressed Enter on is exactly "##" (ignoring leading spaces)
  const enterLineText = event.document.lineAt(enterLineNum).text;
  if (!enterLineText.match(/^[\t ]*##$/)) return;

  // Look upwards to find the matching ### and grab its exact indentation
  let targetIndent = '';
  let foundStart = false;

  for (let i = enterLineNum - 1; i >= 0; i--) {
    const checkLine = event.document.lineAt(i).text;
    const trimCheck = checkLine.trim();

    if (trimCheck === '###' || trimCheck === '###!') {
      targetIndent = checkLine.match(/^([\t ]*)/)?.[1] || '';
      foundStart = true;
      break;
    }

    // Stop looking if we hit another closing block (avoids scanning the whole file)
    if (trimCheck === '##') break;
  }

  // Fallback just in case ### wasn't found (strips 1 space from ##'s indent if it was offset)
  if (!foundStart) {
    targetIndent = enterLineText.match(/^([\t ]*)/)?.[1] || '';
    if (targetIndent.length > 0 && enterLineText.endsWith(' ##')) {
      targetIndent = targetIndent.substring(0, targetIndent.length - 1);
    }
  }

  await editor.edit(editBuilder => {
    // Replace VS Code's bad auto-indent with the perfect ### indent
    const replaceRange = new vscode.Range(newLineNum, 0, newLineNum, autoIndentSpaces.length);
    editBuilder.replace(replaceRange, targetIndent);
  });

  // Force the cursor to sit perfectly at the end of the new indent
  const cursorPos = new vscode.Position(newLineNum, targetIndent.length);
  editor.selection = new vscode.Selection(cursorPos, cursorPos);
}

/**
 * Step 2: Expand ### ## to 3 lines on Enter key
 */
export async function handleEnterExpansion(event: vscode.TextDocumentChangeEvent) {
  if (event.document.languageId !== 'shellscript') return;
  if (event.contentChanges.length === 0) return;

  const change = event.contentChanges[0];
  const editor = vscode.window.activeTextEditor;

  if (!editor || editor.document !== event.document) return;

  // Apply the same auto-indent regex rule here!
  if (!/^(\r?\n)[\t ]*$/.test(change.text)) return;

  // The line where Enter was pressed
  const enterLine = change.range.start.line;

  // After Enter, there's a new line created at enterLine + 1
  const lineAfterEnter = enterLine + 1;

  if (lineAfterEnter >= event.document.lineCount) return;

  // Check the line where Enter was pressed (should be ### or ###! now)
  const firstLine = event.document.lineAt(enterLine);
  const firstLineText = firstLine.text;

  // Check if it's "###" or "### " or "###!" or "###! " (with optional leading whitespace)
  const match = firstLineText.match(/^(\s*)(###!?\s*)$/);
  if (!match) return;

  const indent = match[1];
  const hashPart = match[2]; // "###" or "### "

  // Did the user hit Enter BEFORE or AFTER the space?
  const enterWasAfterSpace = hashPart.endsWith(' ');

  // Check the next line for ##
  const secondLine = event.document.lineAt(lineAfterEnter);
  const secondLineText = secondLine.text;
  const secondLineTrimmed = secondLineText.trim();

  if (!secondLineTrimmed.startsWith('##')) return;

  // We use trimStart() to safely ignore any VS Code auto-indent spaces
  const closingText = secondLineText.trimStart();
  const hasTrailingSpaces = closingText !== closingText.trimEnd();

  if (hasTrailingSpaces) {
    // Single-line continuation (e.g., they hit enter but want to keep trailing comments)
    // If they pressed enter BEFORE the space, we need an extra space before '##'
    const spaceBeforeClosing = enterWasAfterSpace ? '' : ' ';

    await editor.edit(editBuilder => {
      // Notice the guaranteed space after the # below
      editBuilder.replace(secondLine.range, `${indent} # ${spaceBeforeClosing}${closingText}`);
    });
  } else {
    // Normal case: ## moves to a completely separate line below
    const closingMarker = enterWasAfterSpace ? '##' : ' ##';

    await editor.edit(editBuilder => {
      editBuilder.replace(secondLine.range, `${indent} # \n${indent}${closingMarker}`);
    });
  }

  // Position cursor strictly after " # "
  const newPosition = new vscode.Position(lineAfterEnter, indent.length + 3);
  editor.selection = new vscode.Selection(newPosition, newPosition);
}
