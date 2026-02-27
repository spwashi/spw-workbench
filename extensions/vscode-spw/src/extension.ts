import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const documentSelector = { language: 'spw' };

    // =========================================================================
    // DocumentLinkProvider (Clickable Paths)
    // =========================================================================
    const linkProvider = vscode.languages.registerDocumentLinkProvider(documentSelector, {
        provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentLink[] {
            const links: vscode.DocumentLink[] = [];

            // Basic regex to find tilde-strings, @-paths, and src/ paths
            // Note: This is a simplification. The TextMate grammar is the real source of truth,
            // but VSCode APIs require language servers (semantic tokens) or regex here.
            const pathRegex = /(?:~"([^"]+)")|(?:(@[A-Za-z_][A-Za-z0-9_]*)(?:\/(?:\.\.|[A-Za-z_*])[A-Za-z0-9_.\-*]*)+)|(?:(?:\.\.|[A-Za-z_])[A-Za-z0-9_.\-]*(?:\/(?:\.\.|[A-Za-z_*])[A-Za-z0-9_.\-*]*)+)/g;

            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                let match;
                while ((match = pathRegex.exec(line.text)) !== null) {
                    const matchedText = match[0];
                    const startPos = new vscode.Position(i, match.index);
                    const endPos = new vscode.Position(i, match.index + matchedText.length);
                    const range = new vscode.Range(startPos, endPos);

                    let targetUri: vscode.Uri | undefined;

                    // 1. Tilde strings: ~"./foo"
                    if (match[1]) {
                        const relativePath = match[1];
                        const dir = path.dirname(document.uri.fsPath);
                        targetUri = vscode.Uri.file(path.resolve(dir, relativePath));
                    }
                    // 2. Sigil paths e.g. @docs/index.spw or @src/index.spw
                    else if (match[2]) {
                        const sigil = match[2]; // e.g. "@docs"
                        const workspaceFolders = vscode.workspace.workspaceFolders;
                        if (workspaceFolders && workspaceFolders.length > 0) {
                            const root = workspaceFolders[0].uri.fsPath;
                            // Naive resolution for common Spw roots
                            let resolvedRoot = root;
                            if (sigil === '@docs') resolvedRoot = path.join(root, 'docs');
                            else if (sigil === '@src') resolvedRoot = path.join(root, 'src');
                            else if (sigil === '@here') resolvedRoot = path.dirname(document.uri.fsPath);

                            const relativePart = matchedText.slice(sigil.length + 1); // skip `@docs/`
                            targetUri = vscode.Uri.file(path.join(resolvedRoot, relativePart));
                        }
                    }
                    // 3. Bare paths e.g. src/core/domains/index.ts
                    else {
                        const workspaceFolders = vscode.workspace.workspaceFolders;
                        if (workspaceFolders && workspaceFolders.length > 0) {
                            const root = workspaceFolders[0].uri.fsPath;
                            targetUri = vscode.Uri.file(path.join(root, matchedText));
                        }
                    }

                    if (targetUri) {
                        links.push(new vscode.DocumentLink(range, targetUri));
                    }
                }
            }
            return links;
        }
    });

    // =========================================================================
    // CompletionItemProvider (File System Aware)
    // =========================================================================
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        documentSelector,
        {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                const items: vscode.CompletionItem[] = [];

                // Complete @-roots
                if (linePrefix.endsWith('@')) {
                    const roots = ['docs', 'src', 'spec', 'here'];
                    for (const root of roots) {
                        const item = new vscode.CompletionItem(root, vscode.CompletionItemKind.Folder);
                        item.detail = `Spw path root`;
                        items.push(item);
                    }
                    return items;
                }

                // File System Auto-completion
                const fsPathMatch = /(?:~"((?:\.\.?\/)+)|@([A-Za-z_][A-Za-z0-9_]*)\/)([^"]*)$/.exec(linePrefix);

                if (fsPathMatch) {
                    let searchDir: string | undefined;

                    // ~"./" or ~"../" relative path
                    if (fsPathMatch[1]) {
                        const relativePrefix = fsPathMatch[1];
                        searchDir = path.resolve(path.dirname(document.uri.fsPath), relativePrefix);
                    }
                    // @docs/ absolute path
                    else if (fsPathMatch[2]) {
                        const sigil = `@${fsPathMatch[2]}`;
                        const workspaceFolders = vscode.workspace.workspaceFolders;
                        if (workspaceFolders && workspaceFolders.length > 0) {
                            const root = workspaceFolders[0].uri.fsPath;
                            if (sigil === '@docs') searchDir = path.join(root, 'docs');
                            else if (sigil === '@src') searchDir = path.join(root, 'src');
                            else if (sigil === '@here') searchDir = path.dirname(document.uri.fsPath);
                        }
                    }

                    if (searchDir) {
                        try {
                            const uri = vscode.Uri.file(searchDir);
                            const directoryItems = await vscode.workspace.fs.readDirectory(uri);

                            for (const [name, type] of directoryItems) {
                                // Skip hidden files/folders
                                if (name.startsWith('.') && name !== '..' && name !== '.') continue;

                                const kind = type === vscode.FileType.Directory ?
                                    vscode.CompletionItemKind.Folder :
                                    vscode.CompletionItemKind.File;

                                const item = new vscode.CompletionItem(name, kind);
                                // If it's a directory, adding a slash helps continuous typing
                                if (type === vscode.FileType.Directory) {
                                    item.insertText = `${name}/`;
                                    // Make folders sort higher
                                    item.sortText = `0-${name}`;
                                } else {
                                    item.sortText = `1-${name}`;
                                }
                                items.push(item);
                            }
                        } catch (err) {
                            // Directory might not exist or be accessible, fail gracefully
                        }
                    }
                }

                return items;
            }
        },
        '@', '~', '/' // Trigger characters
    );

    // =========================================================================
    // HoverProvider (Semantic Path Peek)
    // =========================================================================
    const hoverProvider = vscode.languages.registerHoverProvider(documentSelector, {
        async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
            const pathRegex = /(?:~"([^"]+)")|(?:(@[A-Za-z_][A-Za-z0-9_]*)(?:\/(?:\.\.|[A-Za-z_*])[A-Za-z0-9_.\-*]*)+)|(?:(?:\.\.|[A-Za-z_])[A-Za-z0-9_.\-]*(?:\/(?:\.\.|[A-Za-z_*])[A-Za-z0-9_.\-*]*)+)/g;
            const range = document.getWordRangeAtPosition(position, pathRegex);

            if (!range) return null;

            const matchedText = document.getText(range);
            let targetUri: vscode.Uri | undefined;

            // Re-run regex on the extracted text to get capture groups
            // Reset lastIndex because it's a global regex instance
            pathRegex.lastIndex = 0;
            const match = pathRegex.exec(matchedText);
            if (!match) return null;

            // Resolve URI (same logic as DocumentLink)
            if (match[1]) {
                const relativePath = match[1];
                const dir = path.dirname(document.uri.fsPath);
                targetUri = vscode.Uri.file(path.resolve(dir, relativePath));
            } else if (match[2]) {
                const sigil = match[2];
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    const root = workspaceFolders[0].uri.fsPath;
                    let resolvedRoot = root;
                    if (sigil === '@docs') resolvedRoot = path.join(root, 'docs');
                    else if (sigil === '@src') resolvedRoot = path.join(root, 'src');
                    else if (sigil === '@here') resolvedRoot = path.dirname(document.uri.fsPath);
                    const relativePart = matchedText.slice(sigil.length + 1);
                    targetUri = vscode.Uri.file(path.join(resolvedRoot, relativePart));
                }
            } else {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    const root = workspaceFolders[0].uri.fsPath;
                    targetUri = vscode.Uri.file(path.join(root, matchedText));
                }
            }

            if (!targetUri) return null;

            try {
                const fileData = await vscode.workspace.fs.readFile(targetUri);
                const fileText = new TextDecoder('utf-8').decode(fileData);
                const lines = fileText.split('\n').slice(0, 10);

                const markdown = new vscode.MarkdownString();
                markdown.appendCodeblock(lines.join('\n') + (fileText.split('\n').length > 10 ? '\n...' : ''), 'spw');
                markdown.appendMarkdown(`\n*Peek: \`${vscode.workspace.asRelativePath(targetUri)}\`*`);

                return new vscode.Hover(markdown, range);
            } catch (err) {
                // File unreadable or doesn't exist
                return null;
            }
        }
    });

    // =========================================================================
    // DocumentSymbolProvider (Outline & Breadcrumbs)
    // =========================================================================
    const symbolProvider = vscode.languages.registerDocumentSymbolProvider(documentSelector, {
        provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] {
            const symbols: vscode.DocumentSymbol[] = [];
            const rootRegex = /^\s*\^\["([^"]+)"\]/;
            const subRegex = /^\s*!\["([^"]+)"\]/;

            let currentRoot: vscode.DocumentSymbol | null = null;

            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);

                // Match root level ^["name"]
                const rootMatch = rootRegex.exec(line.text);
                if (rootMatch) {
                    const name = rootMatch[1];
                    const range = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.text.length));
                    const selectionRange = new vscode.Range(new vscode.Position(i, rootMatch.index), new vscode.Position(i, rootMatch.index + rootMatch[0].length));
                    currentRoot = new vscode.DocumentSymbol(
                        name,
                        'Spw Domain',
                        vscode.SymbolKind.Module,
                        range,
                        selectionRange
                    );
                    symbols.push(currentRoot);
                    continue;
                }

                // Match sub-level !["name"]
                const subMatch = subRegex.exec(line.text);
                if (subMatch && currentRoot) {
                    const name = subMatch[1];
                    const range = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.text.length));
                    const selectionRange = new vscode.Range(new vscode.Position(i, subMatch.index), new vscode.Position(i, subMatch.index + subMatch[0].length));
                    const subSymbol = new vscode.DocumentSymbol(
                        name,
                        'Spw Facet',
                        vscode.SymbolKind.Class,
                        range,
                        selectionRange
                    );
                    currentRoot.children.push(subSymbol);

                    // Extend the root's range to encompass this child
                    currentRoot.range = new vscode.Range(currentRoot.range.start, range.end);
                } else if (!subMatch && currentRoot) {
                    // Extend the root's range for normal lines
                    currentRoot.range = new vscode.Range(currentRoot.range.start, new vscode.Position(i, line.text.length));
                }
            }
            return symbols;
        }
    });

    context.subscriptions.push(linkProvider, completionProvider, hoverProvider, symbolProvider);
}
