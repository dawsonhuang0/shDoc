import * as vscode from 'vscode';

export function registerCompletionProvider(context: vscode.ExtensionContext) {
  // Register tag autocomplete provider
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: 'shellscript' },
      {
        provideCompletionItems(document, position) {
          const line = document.lineAt(position.line).text;
          const linePrefix = line.substring(0, position.character);

          // Only trigger inside doc blocks after @
          const match = linePrefix.match(/#\s*@(\w*)$/);
          if (!match) return undefined;

          // The clean JSDoc tag dictionary
          const tags = [
            'abstract', 'access', 'alias', 'argument', 'async', 'augments', 'author',
            'borrows', 'callback', 'class', 'classdesc', 'constant', 'constructor',
            'constructs', 'copyright', 'default', 'deprecated', 'description', 'emits',
            'enum', 'event', 'example', 'exports', 'extends', 'external', 'field',
            'file', 'fileoverview', 'fires', 'function', 'generator', 'global',
            'hideconstructor', 'host', 'ignore', 'implements', 'import', 'inheritdoc',
            'inner', 'instance', 'interface', 'kind', 'lends', 'license', 'link',
            'linkcode', 'linkplain', 'listens', 'member', 'memberof', 'method', 'mixes',
            'module', 'name', 'namespace', 'overload', 'override', 'package', 'param',
            'private', 'prop', 'property', 'protected', 'public', 'readonly', 'requires',
            'returns', 'satisfies', 'see', 'since', 'static', 'summary', 'template',
            'this', 'throws', 'todo', 'tutorial', 'type', 'typedef', 'var', 'variation',
            'version', 'virtual', 'yields'
          ];

          // Convert to simple, native-looking completion items
          return tags.map(tag => {
            const item = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Keyword);

            // Setting detail to the tag name mimics the repeated text on the right side
            item.detail = tag;

            // Just insert the raw word, no snippet magic
            item.insertText = tag;

            // Ensure it replaces the text properly without leaving double @@ symbols
            const startPos = position.character - match[1].length;
            item.range = new vscode.Range(position.line, startPos, position.line, position.character);

            return item;
          });
        }
      },
      '@' // Trigger on @
    )
  );
}
