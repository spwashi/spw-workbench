import { execFile } from 'node:child_process'
import * as vscode from 'vscode'
import type { LanguageClient } from 'vscode-languageclient/node'
import type { SpwCacheLayerCard, SpwCustomRequestClient } from '../lsp/custom-requests'
import type { ProbeCache, ProbeCacheReadState, ProbeCacheSnapshot } from './probe-cache'
import {
  cliProcess,
  refactorPlanInvocation,
  resolveSpwCliHost,
  type SpwCliProcess,
} from './cli-invocation'

interface GeometryResult {
  braces: {
    kinds: Record<string, number>
    coupleOps: number
    medials: number
    channels: string[]
  }
  operators: Array<{ sigil: string; count: number; percent: number; role: string }>
  nesting: { maxDepth: number }
  lessons: string[]
}

interface SurfaceProfileResult {
  stack?: Record<string, string>
  flow?: { summary?: string }
  probeMeasure?: string
  experimental?: { known?: string[]; unknown?: string[] }
  phrases?: Record<string, number>
}

function overlayEditorProbeLayer(
  layers: SpwCacheLayerCard[] | undefined,
  snapshot: ProbeCacheSnapshot | undefined,
): SpwCacheLayerCard[] {
  const next = layers?.length
    ? layers.map(layer => ({ ...layer }))
    : [
      { plane: 'editor_probe_cache', present: false, source: 'editor-local TTL probe cache', omission: 'this host does not keep an editor probe cache' },
      { plane: 'lsp_session_reflection', present: false, source: 'language-server session reflection', omission: 'no LSP session in this process' },
      { plane: 'runtime_cache', present: false, source: 'hot-session evaluate/inspect cache', omission: 'runtime cache not sampled here', next: 'spw inspect cache <file.spw>' },
      { plane: 'corpus_memo', present: false, source: 'corpus product memo', omission: 'corpus memo not sampled here', next: 'spw census --json' },
    ] satisfies SpwCacheLayerCard[]

  const editor: SpwCacheLayerCard = snapshot
    ? {
      plane: 'editor_probe_cache',
      present: true,
      source: 'editor-local TTL cache · explicit form probes only',
      stats: { ...snapshot },
    }
    : {
      plane: 'editor_probe_cache',
      present: false,
      source: 'editor-local TTL probe cache',
      omission: 'not configured',
    }

  const index = next.findIndex(layer => layer.plane === 'editor_probe_cache')
  if (index >= 0) next[index] = editor
  else next.unshift(editor)
  return next
}

function renderCacheLayers(layers: SpwCacheLayerCard[]): string[] {
  const lines: string[] = []
  for (const layer of layers) {
    lines.push(`## ${layer.plane}`)
    lines.push(`present: ${layer.present}`)
    lines.push(`source: ${layer.source}`)
    if (!layer.present && layer.omission) lines.push(`omission: ${layer.omission}`)
    if (layer.next) lines.push(`next: ${layer.next}`)
    if (layer.stats) {
      const stats = Object.entries(layer.stats)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ')
      if (stats) lines.push(stats)
    }
    lines.push('')
  }
  return lines
}

export function registerSpwInstrumentCommands(
  client: LanguageClient,
  requests: SpwCustomRequestClient,
  probeCache?: ProbeCache,
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('spw.inspectGeometry', async () => {
      const editor = activeSpwEditor()
      if (!editor) return

      const uri = editor.document.uri.toString()
      const cacheKey = `geometry:${uri}:${editor.document.version}`
      const cached = probeCache?.read<GeometryResult>(cacheKey)
      let result = cached?.value
      if (!result) {
        result = await client.sendRequest<GeometryResult>('spw/geometry', { uri })
        probeCache?.set(cacheKey, result)
      }

      const k = result.braces?.kinds ?? {}
      const lines = [
        '# Spw form',
        '',
        receiptLine(cached?.state ?? 'disabled', editor.document.version),
        '',
        `()=${k.scope ?? 0} []=${k.frame ?? 0} {}=${k.body ?? 0} <>=${k.capsule ?? 0}  couple=${result.braces?.coupleOps ?? 0}  medials=${result.braces?.medials ?? 0}`,
        `maxDepth=${result.nesting?.maxDepth ?? 0}`,
        '',
        '## Operators',
        ...(result.operators ?? [])
          .slice(0, 12)
          .map(o => `${o.sigil}  ${o.count}  ${o.percent.toFixed(1)}%  ${o.role}`),
        '',
        '## Lessons',
        ...(result.lessons ?? []).map(lesson => `- ${lesson}`),
      ]
      await showInstrument(lines, 'markdown')
    }),

    vscode.commands.registerCommand('spw.showSurfaceProfile', async () => {
      const editor = activeSpwEditor()
      if (!editor) return

      const result = await client.sendRequest<SurfaceProfileResult>('spw/surfaceProfile', {
        uri: editor.document.uri.toString(),
      })
      const stack = result.stack ?? {}
      const lines = [
        '# Spw surface stack',
        '',
        `source: LSP live document · buffer version: ${editor.document.version} · client cache: bypassed`,
        '',
        '## Stack',
        ...Object.entries(stack).map(([key, value]) => `- **${key}**: \`${value}\``),
        '',
        '## Flow',
        result.flow?.summary ?? '(none)',
        '',
        '## Probes',
        result.probeMeasure ?? '(none)',
        '',
        '## Experimental',
        `known: ${(result.experimental?.known ?? []).join(', ') || '—'}`,
        `unknown: ${(result.experimental?.unknown ?? []).join(', ') || '—'}`,
        '',
        '## Phrases',
        ...Object.entries(result.phrases ?? {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([id, count]) => `- \`${id}\` ×${count}`),
      ]
      await showInstrument(lines, 'markdown')
    }),

    vscode.commands.registerCommand('spw.inspectCache', async () => {
      const reflection = await requests.cacheReflection()
      const local = probeCache?.snapshot()
      const short = (uri: string): string => uri.split('/').slice(-2).join('/')
      const percent = (share: number): string => `${Math.round(share * 100)}%`
      const layers = overlayEditorProbeLayer(reflection?.layers, local)
      const lines = [
        '# Spw cache',
        '',
        'parity: cache.layer/1',
        ...renderCacheLayers(layers),
        '',
        '## LSP session attention',
        'plane: lsp_session_reflection',
        reflection && reflection.tracked > 0
          ? `${reflection.tracked} surfaces read · beat ${reflection.beat} · ${percent(reflection.concentration)} of opens on one surface`
          : 'No surfaces read yet this LSP session.',
        '',
        '### What stands out',
        ...(reflection?.notes.length
          ? reflection.notes.map(note => `- **${note.kind}** — ${short(note.uri)}: ${note.detail}`)
          : ['- nothing to flag: no stale readings or abandoned edits']),
        '',
        '### Kinds of surface in play',
        ...(reflection?.families ?? []).map(
          family => `- **${family.archetype}** (${family.volatility}) × ${family.uris.length}`
            + `\n${family.uris.map(uri => `  - ${short(uri)}`).join('\n')}`,
        ),
      ]
      await showInstrument(lines, 'markdown', false)
    }),

    vscode.commands.registerCommand('spw.renameSymbol', async () => {
      if (!activeSpwEditor()) return
      await vscode.commands.executeCommand('editor.action.rename')
    }),

    vscode.commands.registerCommand('spw.planCorpusRefactor', async () => {
      const folder = activeWorkspaceFolder()
      if (!folder) return
      const spec = await promptRenameSpec()
      if (!spec) return

      const configuredToolRoot = vscode.workspace
        .getConfiguration('spw', folder.uri)
        .get<string>('cli.toolRoot', '')
      const host = await resolveSpwCliHost(folder.uri.fsPath, configuredToolRoot)
      if (!host) {
        void vscode.window.showErrorMessage(
          'Spw corpus planning requires an npm `spw` script in the workspace, mounted `.spw/_workbench`, or spw.cli.toolRoot.',
        )
        return
      }

      const process = cliProcess(host, refactorPlanInvocation(spec))
      try {
        const output = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Spw: planning corpus refactor…',
            cancellable: true,
          },
          (_progress, token) => runCli(process, token),
        )
        const doc = await vscode.workspace.openTextDocument({ content: output.stdout, language: 'json' })
        await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside })
        void vscode.window.showInformationMessage(
          `Spw corpus plan completed in ${output.durationMs}ms · source: CLI · effect: read-only.`,
        )
      } catch (error) {
        if (error instanceof CliCancelledError) return
        const message = error instanceof Error ? error.message : String(error)
        void vscode.window.showErrorMessage(`Spw corpus plan failed: ${message}`)
      }
    }),

    vscode.commands.registerCommand('spw.clearProbeCache', () => {
      probeCache?.clear()
      void vscode.window.showInformationMessage('Spw VS Code probe cache cleared; LSP/runtime caches were not changed.')
    }),
  ]
}

function activeSpwEditor(): vscode.TextEditor | undefined {
  const editor = vscode.window.activeTextEditor
  if (!editor || editor.document.languageId !== 'spw') {
    void vscode.window.showInformationMessage('Open a .spw file first.')
    return undefined
  }
  return editor
}

function activeWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const editor = vscode.window.activeTextEditor
  const folder = editor && vscode.workspace.getWorkspaceFolder(editor.document.uri)
    || vscode.workspace.workspaceFolders?.[0]
  if (!folder) void vscode.window.showInformationMessage('Open a workspace folder first.')
  return folder
}

function receiptLine(state: ProbeCacheReadState, version: number): string {
  const source = state === 'hit' ? 'VS Code probe cache' : 'LSP live document'
  return `source: ${source} · buffer version: ${version} · client cache: ${state}`
}

async function showInstrument(
  lines: string[],
  language: string,
  beside = true,
): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({ content: lines.join('\n'), language })
  await vscode.window.showTextDocument(doc, {
    preview: true,
    ...(beside ? { viewColumn: vscode.ViewColumn.Beside } : {}),
  })
}

async function promptRenameSpec(): Promise<string | undefined> {
  const kind = await vscode.window.showQuickPick(['mark', 'anchor', 'case', 'mood'], {
    title: 'Plan Spw Corpus Refactor',
    placeHolder: 'Choose the structural name kind',
  })
  if (!kind) return undefined
  const from = await promptRenamePart('Existing name', `Name the ${kind} to find`)
  if (!from) return undefined
  const to = await promptRenamePart('New name', `Name the replacement ${kind}`)
  return to ? `${kind}:${from}=${to}` : undefined
}

async function promptRenamePart(title: string, prompt: string): Promise<string | undefined> {
  return vscode.window.showInputBox({
    title,
    prompt,
    validateInput: value => !value.trim() || /[=\r\n]/.test(value)
      ? 'Use a non-empty name without = or line breaks.'
      : undefined,
  })
}

interface CliOutput {
  stdout: string
  durationMs: number
}

class CliCancelledError extends Error {}

function runCli(process: SpwCliProcess, token: vscode.CancellationToken): Promise<CliOutput> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    let cancelled = false
    const child = execFile(
      process.command,
      process.arguments,
      { cwd: process.cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 120_000 },
      (error, stdout, stderr) => {
        cancellation.dispose()
        if (cancelled) {
          reject(new CliCancelledError('Spw corpus plan cancelled.'))
          return
        }
        if (error) {
          reject(new Error(stderr.trim().split('\n')[0] || error.message))
          return
        }
        resolve({ stdout, durationMs: Date.now() - startedAt })
      },
    )
    const cancellation = token.onCancellationRequested(() => {
      cancelled = true
      child.kill()
    })
  })
}
