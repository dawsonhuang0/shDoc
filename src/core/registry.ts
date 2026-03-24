import { Doclet } from './types';

/**
 * Symbol Registry - Central store (like JSDoc's doclet store)
 */
export class SymbolRegistry {
  private doclets = new Map<string, Map<string, Doclet>>();  // file -> name -> doclet
  private dependencies = new Map<string, Set<string>>();     // file -> dependencies

  register(uri: string, doclet: Doclet): void {
    if (!this.doclets.has(uri)) {
      this.doclets.set(uri, new Map());
    }
    this.doclets.get(uri)!.set(doclet.name, doclet);
  }

  lookup(uri: string, name: string): Doclet | undefined {
    return this.doclets.get(uri)?.get(name);
  }

  lookupWithScope(currentUri: string, name: string): Doclet | undefined {
    // 1. Local scope
    const local = this.lookup(currentUri, name);
    if (local) return { ...local, scope: 'local' };

    // 2. Sourced scope
    const deps = this.dependencies.get(currentUri);
    if (deps) {
      for (const depUri of deps) {
        const sourced = this.lookup(depUri, name);
        if (sourced) return { ...sourced, scope: 'sourced' };
      }
    }

    // 3. Workspace scope
    for (const [uri, symbols] of this.doclets) {
      if (uri === currentUri || deps?.has(uri)) continue;
      const workspace = symbols.get(name);
      if (workspace) return { ...workspace, scope: 'workspace' };
    }

    return undefined;
  }

  setDependencies(uri: string, deps: Set<string>): void {
    this.dependencies.set(uri, deps);
  }

  unregisterFile(uri: string): void {
    this.doclets.delete(uri);
    this.dependencies.delete(uri);
  }

  clear(): void {
    this.doclets.clear();
    this.dependencies.clear();
  }
}
