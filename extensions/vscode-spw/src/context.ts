import * as vscode from 'vscode';
import { AnnotationIndex } from './annotation-index';

// ---------------------------------------------------------------------------
// SpwContext — shared state passed to all providers
// ---------------------------------------------------------------------------

export interface SpwContext {
    documentSelector: vscode.DocumentSelector;
    annotationIndex: AnnotationIndex;
    resolveRoot: (sigil: string, workspaceRoot: string, documentUri: vscode.Uri) => string;
    ROOT_MAP: Record<string, string[]>;
    SIGIL_SEMANTICS: Record<string, { role: string; physics: string; phase: string }>;
}
