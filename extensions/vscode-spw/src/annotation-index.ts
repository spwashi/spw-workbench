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
    /** Which flavour: #word, #:word, #!word, #>word, ##>word */
    kind: AnnotationKind;
    /** The identifier after the sigil prefix (e.g. "physics" from #:physics) */
    name: string;
    /** Enclosing ^["section"] label, if any */
    sectionLabel?: string;
}

// ---------------------------------------------------------------------------
// Regex
// ---------------------------------------------------------------------------

/** Matches #-annotations:  #word  #:word  #!word  #>word  ##>word */
const ANNOTATION_RE = /(##>|#!|#:|#>|#)([a-zA-Z_][a-zA-Z0-9_]*)/g;
/** Matches frame headers: ^["label"] or ^"label" */
const FRAME_RE = /^\s*\^(?:\["([^"]+)"\]|"([^"]+)")/;

function kindFromSigil(sigil: string | undefined): AnnotationKind {
    switch (sigil) {
        case '#:': return 'lens';
        case '#!': return 'intent';
        case '#>':
        case '##>':
            return 'anchor';
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
    private client: any; // Type-erased LanguageClient
    private disposables: vscode.Disposable[] = [];
    private updatedEmitter = new vscode.EventEmitter<void>();
    readonly onDidUpdate = this.updatedEmitter.event;

    // -- lifecycle -----------------------------------------------------------

    setClient(client: any): void {
        this.client = client;
    }

    async activate(): Promise<void> {
        await this.rebuild();
        
        // When a document is saved, we don't know immediately if the LSP has
        // finished processing it. A short delay ensures the LSP index is fresh.
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(doc => {
                if (doc.languageId === 'spw') {
                    setTimeout(() => void this.rebuild(), 100);
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
        if (!this.client) return;
        
        try {
            // Request full annotation index from the LSP server
            const rawEntries = await this.client.sendRequest('spw/annotations', {});
            
            this.entries = [];
            this.byName.clear();
            this.byFile.clear();

            if (Array.isArray(rawEntries)) {
                for (const raw of rawEntries) {
                    const entry: AnnotationEntry = {
                        file: vscode.Uri.parse(raw.uri),
                        line: raw.line,
                        kind: raw.kind,
                        name: raw.name,
                        sectionLabel: raw.sectionLabel,
                    };
                    
                    this.entries.push(entry);
                    
                    const nameArr = this.byName.get(entry.name) || [];
                    nameArr.push(entry);
                    this.byName.set(entry.name, nameArr);
                    
                    const fileKey = entry.file.toString();
                    const fileArr = this.byFile.get(fileKey) || [];
                    fileArr.push(entry);
                    this.byFile.set(fileKey, fileArr);
                }
            }
            
            this.updatedEmitter.fire();
        } catch (e) {
            // LSP not ready or request failed
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
