import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Dependency Resolver (like JSDoc's resolver)
 */
export class DependencyResolver {
  async resolve(document: vscode.TextDocument): Promise<Set<string>> {
    const deps = new Set<string>();

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text.trim();
      const sourceMatch = line.match(/^(source|\.)\s+(.+)$/);

      if (sourceMatch) {
        const depPath = sourceMatch[2].replace(/['"]/g, '');
        const depUri = await this.resolvePath(document.uri, depPath);
        if (depUri) deps.add(depUri);
      }
    }

    return deps;
  }

  private async resolvePath(currUri: vscode.Uri, rel: string): Promise<string | null> {
    try {
      const absolute = path.resolve(path.dirname(currUri.fsPath), rel);
      if (fs.existsSync(absolute)) {
        return vscode.Uri.file(absolute).toString();
      }
      return null;
    } catch {
      return null;
    }
  }
}
