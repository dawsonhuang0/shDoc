import * as vscode from 'vscode';

// Core types
import { SymbolRegistry } from './core/registry';
import { DocletParser } from './core/parser';
import { DependencyResolver } from './core/resolver';

// Providers
import { HoverPublisher, registerHoverProvider } from './providers/hover';
import { registerCompletionProvider } from './providers/completion';
import { DocCommentTokenProvider, updateBraceDecorations } from './providers/semantic';

// Editor auto-formatting
import { handleHashExpansion, handleDocLineContinuation, handleEnterAfterClosing, handleEnterExpansion } from './editor/autoFormat';


/**
 * Main Extension - Orchestrates all components (like JSDoc's main)
 */
const registry = new SymbolRegistry();
const publisher = new HoverPublisher();
const debounceTimers = new Map<string, NodeJS.Timeout>();

export function activate(context: vscode.ExtensionContext) {
  // Index all visible editors and apply decorations
  vscode.window.visibleTextEditors.forEach(editor => {
    indexDocument(editor.document);
    updateBraceDecorations(editor);
  });

  // Update decorations when active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        updateBraceDecorations(editor);
      }
    })
  );

  // Register semantic token provider for doc comment highlighting
  const tokenProvider = new DocCommentTokenProvider();
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      { language: 'shellscript' },
      tokenProvider,
      tokenProvider.legend
    )
  );

  // Register tag autocomplete provider
  registerCompletionProvider(context);

  context.subscriptions.push(
    // Step 1: Auto-expand ### to ### ##
    vscode.workspace.onDidChangeTextDocument(handleHashExpansion),

    // Step 2: Expand ### ## to 3 lines on Enter
    vscode.workspace.onDidChangeTextDocument(handleEnterExpansion),

    // Step 3: Auto-continuation - add " # " on Enter in doc blocks
    vscode.workspace.onDidChangeTextDocument(handleDocLineContinuation),

    // Step 4: Align cursor after closing ## block
    vscode.workspace.onDidChangeTextDocument(handleEnterAfterClosing),

    // Re-index on changes (debounced)
    vscode.workspace.onDidChangeTextDocument(event => {
      if (event.document.languageId !== 'shellscript') return;
      if (event.contentChanges.length === 0) return;

      const uri = event.document.uri.toString();
      const existingTimer = debounceTimers.get(uri);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        debounceTimers.delete(uri);
        indexDocument(event.document);
      }, 100);

      debounceTimers.set(uri, timer);

      // Update decorations immediately
      const editor = vscode.window.visibleTextEditors.find(e => e.document === event.document);
      if (editor) {
        updateBraceDecorations(editor);
      }
    }),

    // Index newly opened documents
    vscode.workspace.onDidOpenTextDocument(doc => {
      if (doc.languageId === 'shellscript') {
        indexDocument(doc);
        // Update decorations for the opened document
        const editor = vscode.window.visibleTextEditors.find(e => e.document === doc);
        if (editor) {
          updateBraceDecorations(editor);
        }
      }
    }),

    // Unregister closed documents
    vscode.workspace.onDidCloseTextDocument(doc => {
      if (doc.languageId !== 'shellscript') return;
      const uri = doc.uri.toString();

      const timer = debounceTimers.get(uri);
      if (timer) {
        clearTimeout(timer);
        debounceTimers.delete(uri);
      }

      // FIX: Do NOT unregister the file here!
      // VS Code instantly closes background files. If we delete them here, we lose foreign docs.
      // registry.unregisterFile(uri);
    })
  );

  // Hover provider
  registerHoverProvider(context, registry, publisher);
}

/**
 * Index a document - orchestrates parser and resolver
 */
async function indexDocument(
  document: vscode.TextDocument,
  isDependency = false,
  visited = new Set<string>()
): Promise<void> {
  try {
    // 1. Relax language ID check for background dependencies
    if (!isDependency && document.languageId !== 'shellscript') return;

    const uri = document.uri.toString();

    // 2. Prevent infinite loops from circular dependencies (A sources B, B sources A)
    if (visited.has(uri)) return;
    visited.add(uri);

    // Parse doclets
    const parser = new DocletParser(document);
    const doclets = parser.parse();

    // Wipe the old registry for this file to prevent zombie doclets
    registry.unregisterFile(uri);

    // Register all freshly found doclets
    for (const doclet of doclets) {
      registry.register(uri, doclet);
    }

    // Resolve dependencies
    const resolver = new DependencyResolver();
    const deps = await resolver.resolve(document);
    registry.setDependencies(uri, deps);

    // 3. Index dependencies recursively safely
    for (const depUri of deps) {
      try {
        const depDoc = await vscode.workspace.openTextDocument(vscode.Uri.parse(depUri));
        // Pass 'true' for isDependency, and pass the 'visited' set down the chain
        await indexDocument(depDoc, true, visited);
      } catch (e) {
        // Ignore errors if the sourced file doesn't exist on disk
      }
    }
  } catch (error) {
    console.error('Shell Doctor: Error indexing document:', error);
  }
}

export function deactivate() {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
  registry.clear();
}
