import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnnotationKind = 'topic' | 'lens' | 'intent' | 'anchor';

export interface AnnotationEntry {
    /** The file containing this annotation */
    file: vscode.Uri;
    /** Zero-based line number */
    line: number;
    /** Which flavour: #word, #:word, #!word, #>word */
    kind: AnnotationKind;
    /** The identifier after the sigil prefix (e.g. "physics" from #:physics) */
    name: string;
    /** Enclosing ^["section"] label, if any */
    sectionLabel?: string;
}

// ---------------------------------------------------------------------------
// Regex
// ---------------------------------------------------------------------------

/** Matches #-annotations:  #word  #:word  #!word  #>word */
const ANNOTATION_RE = /#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/g;
/** Matches frame headers: ^["label"] or ^"label" */
const FRAME_RE = /^\s*\^(?:\["([^"]+)"\]|"([^"]+)")/;

function kindFromPrefix(prefix: string | undefined): AnnotationKind {
    switch (prefix) {
        case ':': return 'lens';
        case '!': return 'intent';
        case '>': return 'anchor';
        default: return 'topic';
    }
}

// ---------------------------------------------------------------------------
// AnnotationIndex
// ---------------------------------------------------------------------------

export class AnnotationIndex {
    private entries: AnnotationEntry[] = [];
    private byName = new Map<string, AnnotationEntry[]>();
    private byFile = new Map<string, AnnotationEntry[]>();
    private watcher: vscode.FileSystemWatcher | undefined;
    private disposables: vscode.Disposable[] = [];
    private updatedEmitter = new vscode.EventEmitter<void>();
    readonly onDidUpdate = this.updatedEmitter.event;

    // -- lifecycle -----------------------------------------------------------

    async activate(): Promise<void> {
        await this.rebuild();

        this.watcher = vscode.workspace.createFileSystemWatcher('**/*.spw');
        this.watcher.onDidChange(uri => void this.reindexFile(uri));
        this.watcher.onDidCreate(uri => void this.reindexFile(uri));
        this.watcher.onDidDelete(uri => this.removeFile(uri));
        this.disposables.push(this.watcher);

        // Also reindex on save (covers renames that watcher misses)
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(doc => {
                if (doc.languageId === 'spw') {
                    void this.reindexFile(doc.uri);
                }
            })
        );
    }

    dispose(): void {
        this.updatedEmitter.dispose();
        this.disposables.forEach(d => d.dispose());
    }

    // -- build ---------------------------------------------------------------

    async rebuild(): Promise<void> {
        this.entries = [];
        this.byName.clear();
        this.byFile.clear();

        const files = await vscode.workspace.findFiles('**/*.spw', '**/node_modules/**');
        for (const file of files) {
            await this.indexFile(file);
        }
        this.updatedEmitter.fire();
    }

    private async indexFile(uri: vscode.Uri): Promise<void> {
        try {
            const raw = await vscode.workspace.fs.readFile(uri);
            const text = new TextDecoder('utf-8').decode(raw);
            this.parseText(uri, text);
        } catch {
            // file unreadable — skip
        }
    }

    private async reindexFile(uri: vscode.Uri): Promise<void> {
        this.removeFile(uri);
        await this.indexFile(uri);
        this.updatedEmitter.fire();
    }

    private removeFile(uri: vscode.Uri): void {
        const key = uri.toString();
        const old = this.byFile.get(key) || [];
        for (const entry of old) {
            const arr = this.byName.get(entry.name);
            if (arr) {
                const idx = arr.indexOf(entry);
                if (idx >= 0) arr.splice(idx, 1);
                if (arr.length === 0) this.byName.delete(entry.name);
            }
        }
        this.entries = this.entries.filter(e => e.file.toString() !== key);
        this.byFile.delete(key);
        this.updatedEmitter.fire();
    }

    private parseText(uri: vscode.Uri, text: string): void {
        const lines = text.split('\n');
        let currentSection: string | undefined;
        const fileKey = uri.toString();
        const fileEntries: AnnotationEntry[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Track enclosing section
            const frameMatch = line.match(FRAME_RE);
            if (frameMatch) {
                currentSection = frameMatch[1] || frameMatch[2];
            }

            // Find annotations on this line
            ANNOTATION_RE.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = ANNOTATION_RE.exec(line)) !== null) {
                // Skip annotations inside comments (lines starting with # followed by space)
                const trimmed = line.trimStart();
                if (trimmed.startsWith('# ') || trimmed.startsWith('//')) {
                    // But still match if the annotation IS the comment content
                    // e.g., "  #:physics" is valid, "  # this is a comment #physics" is not
                    if (match.index > line.indexOf('#') + 1 && trimmed.startsWith('#')) {
                        continue;
                    }
                }

                const entry: AnnotationEntry = {
                    file: uri,
                    line: i,
                    kind: kindFromPrefix(match[1]),
                    name: match[2],
                    sectionLabel: currentSection,
                };

                this.entries.push(entry);
                fileEntries.push(entry);

                // Index by name
                const nameArr = this.byName.get(entry.name) || [];
                nameArr.push(entry);
                this.byName.set(entry.name, nameArr);
            }
        }

        if (fileEntries.length > 0) {
            this.byFile.set(fileKey, fileEntries);
        }
    }

    // -- queries -------------------------------------------------------------

    /** All entries matching annotation name (e.g. "physics") */
    lookup(name: string): AnnotationEntry[] {
        return this.byName.get(name) || [];
    }

    /** All annotations in a specific file */
    forFile(uri: vscode.Uri): AnnotationEntry[] {
        return this.byFile.get(uri.toString()) || [];
    }

    /** All unique annotation names */
    allNames(): string[] {
        return [...this.byName.keys()].sort();
    }

    /** All entries grouped by name */
    conceptClusters(): Map<string, AnnotationEntry[]> {
        return new Map(this.byName);
    }

    /** Total indexed annotation count */
    get size(): number {
        return this.entries.length;
    }

    /** All entries (for workspace symbol search) */
    all(): AnnotationEntry[] {
        return this.entries;
    }

    /** Search entries by name prefix (for filtered queries) */
    search(query: string): AnnotationEntry[] {
        const q = query.toLowerCase();
        return this.entries.filter(e => e.name.toLowerCase().includes(q));
    }
}
