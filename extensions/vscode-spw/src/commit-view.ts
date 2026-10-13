/**
 * Commit view — where a commit link from the language server opens.
 *
 * Opening a `spw-commit:` link shows the commit as a read-only diff document
 * (git show: header, stat, patch), never an untitled buffer that asks to be
 * saved. `Spw: Open Commit Changes` opens the same commit in VS Code's
 * multi-file changes view through the built-in Git extension, and stays on the
 * document when that view or that extension is not there.
 */

import * as vscode from 'vscode'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { COMMIT_SCHEME, changeSides, commitTitle, parseCommitTarget, type CommitTarget } from './commit-uri'

/** Longest `git show` may take before the document says git did not answer. */
const SHOW_TIMEOUT_MS = 4000
/** Largest patch shown in full; a larger commit shows its stat only. */
const SHOW_MAX_BUFFER = 4 * 1024 * 1024

export function registerCommitView(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(COMMIT_SCHEME, {
      provideTextDocumentContent: (uri) => commitText(targetOf(uri)),
    }),
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.uri.scheme === COMMIT_SCHEME && document.languageId !== 'diff') {
        void vscode.languages.setTextDocumentLanguage(document, 'diff')
      }
    }),
    vscode.commands.registerCommand('spw.openCommitChanges', (uri?: vscode.Uri) => openCommitChanges(uri)),
  )
}

function targetOf(uri: vscode.Uri | undefined): CommitTarget | null {
  return uri && uri.scheme === COMMIT_SCHEME ? parseCommitTarget(uri.path, uri.query) : null
}

function commitDocumentUri(target: CommitTarget): vscode.Uri {
  return vscode.Uri.from({ scheme: COMMIT_SCHEME, path: `/${target.hash}`, query: `root=${target.root}` })
}

// ── The document ────────────────────────────────────────────────

function gitShow(target: CommitTarget, patch: boolean): Promise<{ ok: boolean; text: string; tooLarge: boolean }> {
  const args = ['-c', 'core.quotepath=false', 'show', '--no-color', '--no-ext-diff', '--format=fuller', '--stat']
  if (patch) args.push('--patch')
  args.push(target.hash)
  return new Promise((resolve) => {
    execFile('git', args, { cwd: target.root, timeout: SHOW_TIMEOUT_MS, maxBuffer: SHOW_MAX_BUFFER, encoding: 'utf8', windowsHide: true },
      (error, stdout) => {
        const tooLarge = (error as { code?: string } | null)?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
        resolve({ ok: !error, text: stdout ?? '', tooLarge })
      })
  })
}

async function commitText(target: CommitTarget | null): Promise<string> {
  if (!target) return 'This link names no commit.\n'
  const full = await gitShow(target, true)
  if (full.ok) return full.text
  if (full.tooLarge) {
    const stat = await gitShow(target, false)
    if (stat.ok) return `${stat.text}\n(The patch is too large to show here; run Spw: Open Commit Changes for the files.)\n`
  }
  return `git could not show ${target.hash} in ${target.root}.\n`
}

// ── The changes view ────────────────────────────────────────────

interface GitChange { uri: vscode.Uri; originalUri: vscode.Uri; status: number }
interface GitCommit { hash: string; message: string; parents: string[] }
interface GitRepository {
  rootUri: vscode.Uri
  getCommit(ref: string): Promise<GitCommit>
  diffBetween(ref1: string, ref2: string): Promise<GitChange[]>
}
interface GitApi { repositories: GitRepository[]; toGitUri(uri: vscode.Uri, ref: string): vscode.Uri }
interface GitExtension { getAPI(version: 1): GitApi }

async function gitApi(): Promise<GitApi | null> {
  const extension = vscode.extensions.getExtension<GitExtension>('vscode.git')
  if (!extension) return null
  const exports = extension.isActive ? extension.exports : await extension.activate()
  return exports?.getAPI(1) ?? null
}

function holds(repository: GitRepository, root: string): boolean {
  const relative = path.relative(repository.rootUri.fsPath, root)
  return !relative.startsWith('..') && !path.isAbsolute(relative)
}

async function openCommitChanges(argument?: vscode.Uri): Promise<void> {
  const target = targetOf(argument ?? vscode.window.activeTextEditor?.document.uri)
  if (!target) {
    void vscode.window.showInformationMessage('Spw: open a commit link first, then run Open Commit Changes.')
    return
  }
  try {
    const api = await gitApi()
    const repository = api?.repositories.find((candidate) => holds(candidate, target.root))
    if (api && repository) {
      const commit = await repository.getCommit(target.hash)
      const parent = commit.parents[0]
      if (parent) {
        const changes = await repository.diffBetween(parent, commit.hash)
        const resources = changes.map((change) => {
          const sides = changeSides(change.status)
          return [
            change.uri,
            sides.original ? api.toGitUri(change.originalUri, parent) : undefined,
            sides.modified ? api.toGitUri(change.uri, commit.hash) : undefined,
          ]
        })
        await vscode.commands.executeCommand('vscode.changes', commitTitle(commit.hash, commit.message), resources)
        return
      }
    }
  } catch {
    // No Git extension, no changes view in this VS Code, or git could not read the commit.
  }
  await vscode.window.showTextDocument(commitDocumentUri(target), { preview: true })
}
