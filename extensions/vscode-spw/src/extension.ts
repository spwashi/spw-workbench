import * as vscode from 'vscode';
import * as path from 'path';
import { AnnotationIndex } from './annotation-index';

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
            const pathRegex = /(?:~[^"]*"([^"]+)")|(?:(@[A-Za-z_][A-Za-z0-9_]*)(?:\/(?:\.\.|[A-Za-z_*])[A-Za-z0-9_.\-*]*)+)|(?:(?:\.\.|[A-Za-z_])[A-Za-z0-9_.\-]*(?:\/(?:\.\.|[A-Za-z_*])[A-Za-z0-9_.\-*]*)+)/g;

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
                            else if (sigil === '@lib') resolvedRoot = path.join(root, 'lib');
                            else if (sigil === '@theory') resolvedRoot = path.join(root, 'docs', 'theory');
                            else if (sigil === '@scripts') resolvedRoot = path.join(root, 'scripts');
                            else if (sigil === '@core') resolvedRoot = path.join(root, 'src', 'core');
                            else if (sigil === '@runtime') resolvedRoot = path.join(root, 'src', 'runtime');
                            else if (sigil === '@design') resolvedRoot = path.join(root, 'src', 'design');
                            else if (sigil === '@infra') resolvedRoot = path.join(root, 'src', 'infra');
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
                    const roots = [
                        { name: 'docs', detail: 'Documentation root' },
                        { name: 'src', detail: 'Source root' },
                        { name: 'lib', detail: 'Library specs (v0.2.0-alpha)' },
                        { name: 'theory', detail: 'Theory docs (lens-algebra, operator-algebra)' },
                        { name: 'scripts', detail: 'CLI scripts (spwq, analyzers)' },
                        { name: 'spec', detail: 'Specification root' },
                        { name: 'here', detail: 'Current file directory' },
                        { name: 'core', detail: 'Core operator contracts' },
                        { name: 'runtime', detail: 'Runtime execution contracts' },
                        { name: 'design', detail: 'Design system root' },
                        { name: 'infra', detail: 'Infrastructure root' },
                    ];
                    for (const root of roots) {
                        const item = new vscode.CompletionItem(root.name, vscode.CompletionItemKind.Folder);
                        item.detail = root.detail;
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
    // Annotation Index (workspace-wide #-annotation scanner)
    // =========================================================================
    const annotationIndex = new AnnotationIndex();
    annotationIndex.activate();
    context.subscriptions.push({ dispose: () => annotationIndex.dispose() });

    // =========================================================================
    // Operator Semantics Table (from spirit sequence)
    // =========================================================================
    const SIGIL_SEMANTICS: Record<string, { role: string; physics: string; phase: string }> = {
        '^': { role: 'integration / framing', physics: 'emission — bind upward', phase: 'phase 6' },
        '!': { role: 'action / injection', physics: 'kinetic — fires effect on world', phase: 'phase 0' },
        '?': { role: 'wonder / probe', physics: 'measurement — is there something?', phase: 'phase 1' },
        '~': { role: 'potential / superposition', physics: 'wavefunction — defer, name', phase: 'phase 2' },
        '@': { role: 'perspective / observer', physics: 'observation — push scope', phase: 'phase 3' },
        '&': { role: 'confluence / merge', physics: 'entanglement — combine frames', phase: 'phase 4' },
        '*': { role: 'value / collapse', physics: 'collapse — scope to concrete', phase: 'phase 5' },
        '=': { role: 'config / constraint', physics: 'bias — forcing state', phase: 'binding' },
        '%': { role: 'measure / observation', physics: 'scalar — quantify relevance', phase: 'observe' },
        '#': { role: 'annotation / resonance', physics: 'vibration — self-reference, meta', phase: 'meta' },
        '.': { role: 'ground / access', physics: 'ground state — context, separator', phase: 'access' },
    };

    // =========================================================================
    // HoverProvider (Semantic Path Peek)
    // =========================================================================
    const hoverProvider = vscode.languages.registerHoverProvider(documentSelector, {
        async provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken) {
            const line = document.lineAt(position).text;
            const charAtPos = line[position.character];

            // ── 1. #-annotation hover ──────────────────────────────
            const annotRe = /#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/g;
            let annotMatch: RegExpExecArray | null;
            while ((annotMatch = annotRe.exec(line)) !== null) {
                const start = annotMatch.index;
                const end = start + annotMatch[0].length;
                if (position.character >= start && position.character < end) {
                    const prefix = annotMatch[1] || '';
                    const name = annotMatch[2];
                    const kindLabel: Record<string, string> = { '': 'topic', ':': 'lens', '!': 'intent', '>': 'anchor' };
                    const kind = kindLabel[prefix] || 'topic';
                    const entries = annotationIndex.lookup(name);
                    const fileCount = new Set(entries.map(e => e.file.toString())).size;

                    const md = new vscode.MarkdownString();
                    md.appendMarkdown(`**#${prefix}${name}** — *${kind}*\n\n`);
                    md.appendMarkdown(`Referenced in **${fileCount}** file(s), **${entries.length}** occurrence(s)\n\n`);
                    const seen = new Set<string>();
                    for (const e of entries) {
                        const rel = vscode.workspace.asRelativePath(e.file);
                        if (!seen.has(rel) && seen.size < 5) {
                            seen.add(rel);
                            md.appendMarkdown(`- \`${rel}\`:${e.line + 1}${e.sectionLabel ? ` (${e.sectionLabel})` : ''}\n`);
                        }
                    }
                    if (fileCount > 5) md.appendMarkdown(`- *...and ${fileCount - 5} more*\n`);
                    return new vscode.Hover(md, new vscode.Range(position.line, start, position.line, end));
                }
            }

            // ── 2. ^["frame"] hover ────────────────────────────────
            const frameRe = /\^(?:\["([^"]+)"\]|"([^"]+)")/;
            const frameMatch = line.match(frameRe);
            if (frameMatch) {
                const fStart = line.indexOf(frameMatch[0]);
                const fEnd = fStart + frameMatch[0].length;
                if (position.character >= fStart && position.character < fEnd) {
                    const frameName = frameMatch[1] || frameMatch[2];
                    const fileAnnotations = annotationIndex.forFile(document.uri);
                    const inSection = fileAnnotations.filter(a => a.sectionLabel === frameName);
                    const md = new vscode.MarkdownString();
                    md.appendMarkdown(`**^["${frameName}"]** — *frame*\n\n`);
                    if (inSection.length > 0) {
                        md.appendMarkdown(`Annotations:\n\n`);
                        const pfx: Record<string, string> = { topic: '#', lens: '#:', intent: '#!', anchor: '#>' };
                        for (const a of inSection) md.appendMarkdown(`- \`${pfx[a.kind]}${a.name}\` (${a.kind})\n`);
                    } else {
                        md.appendMarkdown(`*No annotations in this frame*\n`);
                    }
                    return new vscode.Hover(md, new vscode.Range(position.line, fStart, position.line, fEnd));
                }
            }

            // ── 3. Bare sigil hover ────────────────────────────────
            if (charAtPos && SIGIL_SEMANTICS[charAtPos]) {
                const sem = SIGIL_SEMANTICS[charAtPos];
                const md = new vscode.MarkdownString();
                md.appendMarkdown(`**\`${charAtPos}\`** — *${sem.role}*\n\n`);
                md.appendMarkdown(`| | |\n|:--|:--|\n`);
                md.appendMarkdown(`| **Physics** | ${sem.physics} |\n`);
                md.appendMarkdown(`| **Phase** | ${sem.phase} |\n`);
                return new vscode.Hover(md, new vscode.Range(position.line, position.character, position.line, position.character + 1));
            }

            // ── 4. Path peek (existing) ────────────────────────────
            const pathRegex = /(?:~[^"]*"([^"]+)")|(?:(@[A-Za-z_][A-Za-z0-9_]*)(?:\/(?:\.\.|[A-Za-z_*])[A-Za-z0-9_.\-*]*)+)|(?:(?:\.\.|[A-Za-z_])[A-Za-z0-9_.\-]*(?:\/(?:\.\.|[A-Za-z_*])[A-Za-z0-9_.\-*]*)+)/g;
            const range = document.getWordRangeAtPosition(position, pathRegex);
            if (!range) return null;

            const matchedText = document.getText(range);
            let targetUri: vscode.Uri | undefined;
            pathRegex.lastIndex = 0;
            const match = pathRegex.exec(matchedText);
            if (!match) return null;

            if (match[1]) {
                const dir = path.dirname(document.uri.fsPath);
                targetUri = vscode.Uri.file(path.resolve(dir, match[1]));
            } else if (match[2]) {
                const sigil = match[2];
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    const root = workspaceFolders[0].uri.fsPath;
                    let resolvedRoot = root;
                    if (sigil === '@docs') resolvedRoot = path.join(root, 'docs');
                    else if (sigil === '@src') resolvedRoot = path.join(root, 'src');
                    else if (sigil === '@lib') resolvedRoot = path.join(root, 'lib');
                    else if (sigil === '@theory') resolvedRoot = path.join(root, 'docs', 'theory');
                    else if (sigil === '@scripts') resolvedRoot = path.join(root, 'scripts');
                    else if (sigil === '@core') resolvedRoot = path.join(root, 'src', 'core');
                    else if (sigil === '@runtime') resolvedRoot = path.join(root, 'src', 'runtime');
                    else if (sigil === '@design') resolvedRoot = path.join(root, 'src', 'design');
                    else if (sigil === '@infra') resolvedRoot = path.join(root, 'src', 'infra');
                    else if (sigil === '@here') resolvedRoot = path.dirname(document.uri.fsPath);
                    const relativePart = matchedText.slice(sigil.length + 1);
                    targetUri = vscode.Uri.file(path.join(resolvedRoot, relativePart));
                }
            } else {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    targetUri = vscode.Uri.file(path.join(workspaceFolders[0].uri.fsPath, matchedText));
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
            } catch {
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
            const tapRegex = /^(\s*)\^\["([^"]+)"\]/;
            const injectRegex = /^(\s*)!(?:boon|bone|bane|bonk|honk)?\["([^"]+)"\]/;
            const probeRegex = /^(\s*)\?\["([^"]+)"\]/;
            const configRegex = /^(\s*)=([a-zA-Z_][a-zA-Z0-9_]*):/;
            const annotationRegex = /^(\s*)#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/;

            // Stack-based nesting via indentation
            const stack: { indent: number; symbol: vscode.DocumentSymbol }[] = [];

            function addSymbol(sym: vscode.DocumentSymbol, indent: number) {
                // Pop stack to find parent at lower indentation
                while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
                    stack.pop();
                }
                if (stack.length > 0) {
                    stack[stack.length - 1].symbol.children.push(sym);
                    // Extend parent range
                    const parent = stack[stack.length - 1].symbol;
                    parent.range = new vscode.Range(parent.range.start, sym.range.end);
                } else {
                    symbols.push(sym);
                }
                stack.push({ indent, symbol: sym });
            }

            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                const lineRange = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.text.length));

                // ^["name"] — domain/tap (Module)
                const tapMatch = tapRegex.exec(line.text);
                if (tapMatch) {
                    const indent = tapMatch[1].length;
                    const name = tapMatch[2];
                    const selRange = new vscode.Range(
                        new vscode.Position(i, tapMatch.index),
                        new vscode.Position(i, tapMatch.index + tapMatch[0].length)
                    );
                    const sym = new vscode.DocumentSymbol(
                        name, 'Spw Domain', vscode.SymbolKind.Module, lineRange, selRange
                    );
                    addSymbol(sym, indent);
                    continue;
                }

                // !["name"] / !boon["name"] — inject (Event)
                const injectMatch = injectRegex.exec(line.text);
                if (injectMatch) {
                    const indent = injectMatch[1].length;
                    const name = injectMatch[2];
                    const selRange = new vscode.Range(
                        new vscode.Position(i, injectMatch.index),
                        new vscode.Position(i, injectMatch.index + injectMatch[0].length)
                    );
                    const sym = new vscode.DocumentSymbol(
                        name, 'Spw Facet', vscode.SymbolKind.Event, lineRange, selRange
                    );
                    addSymbol(sym, indent);
                    continue;
                }

                // ?["name"] — probe (Boolean)
                const probeMatch = probeRegex.exec(line.text);
                if (probeMatch) {
                    const indent = probeMatch[1].length;
                    const name = probeMatch[2];
                    const selRange = new vscode.Range(
                        new vscode.Position(i, probeMatch.index),
                        new vscode.Position(i, probeMatch.index + probeMatch[0].length)
                    );
                    const sym = new vscode.DocumentSymbol(
                        `? ${name}`, 'Spw Probe', vscode.SymbolKind.Boolean, lineRange, selRange
                    );
                    addSymbol(sym, indent);
                    continue;
                }

                // =key: — config (Property)
                const configMatch = configRegex.exec(line.text);
                if (configMatch) {
                    const indent = configMatch[1].length;
                    const name = configMatch[2];
                    const selRange = new vscode.Range(
                        new vscode.Position(i, configMatch.index),
                        new vscode.Position(i, configMatch.index + configMatch[0].length)
                    );
                    const sym = new vscode.DocumentSymbol(
                        `= ${name}`, 'Spw Config', vscode.SymbolKind.Property, lineRange, selRange
                    );
                    addSymbol(sym, indent);
                    continue;
                }

                // #-annotations: topic, lens, intent, anchor
                const annotationMatch = annotationRegex.exec(line.text);
                if (annotationMatch) {
                    const indent = annotationMatch[1].length;
                    const prefix = annotationMatch[2] || '';
                    const name = annotationMatch[3];

                    let symbolKind: vscode.SymbolKind;
                    let detail: string;
                    switch (prefix) {
                        case ':':
                            symbolKind = vscode.SymbolKind.Enum;
                            detail = 'Spw Lens';
                            break;
                        case '!':
                            symbolKind = vscode.SymbolKind.Event;
                            detail = 'Spw Intent';
                            break;
                        case '>':
                            symbolKind = vscode.SymbolKind.Interface;
                            detail = 'Spw Anchor';
                            break;
                        default:
                            symbolKind = vscode.SymbolKind.Key;
                            detail = 'Spw Topic';
                            break;
                    }

                    const selRange = new vscode.Range(
                        new vscode.Position(i, annotationMatch.index),
                        new vscode.Position(i, annotationMatch.index + annotationMatch[0].length)
                    );
                    const sym = new vscode.DocumentSymbol(
                        `# ${name}`, detail, symbolKind, lineRange, selRange
                    );
                    addSymbol(sym, indent);
                    continue;
                }

                // Extend current deepest symbol's range
                if (stack.length > 0) {
                    const top = stack[stack.length - 1].symbol;
                    top.range = new vscode.Range(top.range.start, lineRange.end);
                }
            }
            return symbols;
        }
    });

    // =========================================================================
    // DocumentSemanticTokensProvider (Phase-Aware Coloring)
    // =========================================================================
    const tokenTypes = ['operator', 'type', 'variable', 'property', 'function', 'string', 'keyword', 'comment'];
    const tokenModifiers = ['declaration', 'definition', 'readonly', 'deprecated', 'modification', 'async'];
    const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

    const semanticTokensProvider = vscode.languages.registerDocumentSemanticTokensProvider(
        documentSelector,
        {
            provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.SemanticTokens {
                const builder = new vscode.SemanticTokensBuilder(legend);

                for (let i = 0; i < document.lineCount; i++) {
                    const lineText = document.lineAt(i).text;
                    let col = 0;

                    while (col < lineText.length) {
                        const ch = lineText[col];
                        const rest = lineText.slice(col);

                        // Skip whitespace
                        if (/\s/.test(ch)) { col++; continue; }

                        // Comments (lines starting with // after optional whitespace)
                        if (rest.startsWith('//')) {
                            builder.push(i, col, lineText.length - col, tokenTypes.indexOf('comment'), 0);
                            break;
                        }

                        // #-annotations: #word, #:word, #!word, #>word
                        const hashMatch = rest.match(/^#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/);
                        if (hashMatch) {
                            const len = hashMatch[0].length;
                            builder.push(i, col, len, tokenTypes.indexOf('type'), 0);
                            col += len;
                            continue;
                        }

                        // Sigil operators with semantic modifiers
                        if (ch === '^') {
                            // ^ = keyword.declaration (framing/root)
                            builder.push(i, col, 1, tokenTypes.indexOf('keyword'), 1 << tokenModifiers.indexOf('declaration'));
                            col++; continue;
                        }
                        if (ch === '!') {
                            // ! = function.modification (hydrate/inject)
                            builder.push(i, col, 1, tokenTypes.indexOf('function'), 1 << tokenModifiers.indexOf('modification'));
                            col++; continue;
                        }
                        if (ch === '?') {
                            // ? = function.async (probe/query)
                            builder.push(i, col, 1, tokenTypes.indexOf('function'), 1 << tokenModifiers.indexOf('async'));
                            col++; continue;
                        }
                        if (ch === '~') {
                            // ~ = variable.deprecated (defer/lazy)
                            builder.push(i, col, 1, tokenTypes.indexOf('variable'), 1 << tokenModifiers.indexOf('deprecated'));
                            col++; continue;
                        }
                        if (ch === '=') {
                            // = = property.readonly (config/constraint)
                            builder.push(i, col, 1, tokenTypes.indexOf('property'), 1 << tokenModifiers.indexOf('readonly'));
                            col++; continue;
                        }
                        if (ch === '%') {
                            // % = operator (measure)
                            builder.push(i, col, 1, tokenTypes.indexOf('operator'), 0);
                            col++; continue;
                        }
                        if (ch === '@') {
                            // @ references
                            const refMatch = rest.match(/^@[a-zA-Z_][a-zA-Z0-9_]*/);
                            if (refMatch) {
                                builder.push(i, col, refMatch[0].length, tokenTypes.indexOf('variable'), 0);
                                col += refMatch[0].length;
                                continue;
                            }
                            builder.push(i, col, 1, tokenTypes.indexOf('variable'), 0);
                            col++; continue;
                        }
                        if (ch === '.' || ch === '&' || ch === '$' || ch === '*') {
                            builder.push(i, col, 1, tokenTypes.indexOf('operator'), 0);
                            col++; continue;
                        }

                        // Containers
                        if (ch === '[' || ch === ']' || ch === '{' || ch === '}' ||
                            ch === '(' || ch === ')' || ch === '<' || ch === '>') {
                            builder.push(i, col, 1, tokenTypes.indexOf('operator'), 1 << tokenModifiers.indexOf('definition'));
                            col++; continue;
                        }

                        // Quoted strings
                        if (ch === '"') {
                            const strMatch = rest.match(/^"([^"\\]|\\.)*"/);
                            if (strMatch) {
                                builder.push(i, col, strMatch[0].length, tokenTypes.indexOf('string'), 0);
                                col += strMatch[0].length;
                                continue;
                            }
                        }

                        // Everything else: skip
                        col++;
                    }
                }

                return builder.build();
            }
        },
        legend
    );

    // =========================================================================
    // WorkspaceSymbolProvider (#-annotation navigation via Cmd+T)
    // =========================================================================
    const workspaceSymbolProvider = vscode.languages.registerWorkspaceSymbolProvider({
        provideWorkspaceSymbols(query: string): vscode.SymbolInformation[] {
            const results: vscode.SymbolInformation[] = [];
            // Strip leading # if user types it in query
            const q = query.startsWith('#') ? query.slice(1) : query;
            const entries = q ? annotationIndex.search(q) : annotationIndex.all();

            // Kind mapping
            const kindMap: Record<string, vscode.SymbolKind> = {
                topic: vscode.SymbolKind.Key,
                lens: vscode.SymbolKind.Enum,
                intent: vscode.SymbolKind.Event,
                anchor: vscode.SymbolKind.Interface,
            };
            const prefixMap: Record<string, string> = {
                topic: '#', lens: '#:', intent: '#!', anchor: '#>',
            };

            for (const entry of entries) {
                const label = `${prefixMap[entry.kind]}${entry.name}`;
                const location = new vscode.Location(
                    entry.file,
                    new vscode.Position(entry.line, 0)
                );
                const si = new vscode.SymbolInformation(
                    label,
                    kindMap[entry.kind] || vscode.SymbolKind.Key,
                    entry.sectionLabel || '',
                    location
                );
                results.push(si);
            }
            return results;
        }
    });

    context.subscriptions.push(linkProvider, completionProvider, hoverProvider, symbolProvider, semanticTokensProvider, workspaceSymbolProvider);
}
