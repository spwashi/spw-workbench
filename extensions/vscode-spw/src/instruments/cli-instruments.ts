/**
 * Read-only CLI instruments for the active .spw file: each runs `spw` from
 * the resolved tool root with the consumer workspace as cwd, then opens a
 * markdown receipt beside the editor.
 */
import * as vscode from 'vscode'
import {
  cliProcess,
  fingerprintInvocation,
  memoryInvocations,
  performanceInvocation,
  projectionInvocation,
  sourceInvocation,
  type SpwCliHost,
  type SpwCliInvocation,
} from './cli-invocation'
import {
  activeSpwEditor,
  activeWorkspaceFolder,
  fileWorkspaceFolder,
  resolveCliHostFor,
  showInstrument,
} from './host'
import {
  presentQueryPerformance,
  renderInstrumentReport,
  type InstrumentRun,
} from './instrument-report'
import { CliCancelledError, runCli } from './run-cli'

interface InstrumentRequest {
  heading: string
  folder: vscode.WorkspaceFolder
  build: (host: SpwCliHost) => SpwCliInvocation[]
  notes?: string[]
  present?: (runs: InstrumentRun[]) => { sections: string[]; runs: InstrumentRun[] }
}

export function registerSpwCliInstruments(): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('spw.inspectSource', inspectSource),
    vscode.commands.registerCommand('spw.fingerprintSelection', fingerprintSelection),
    vscode.commands.registerCommand('spw.inspectMemory', inspectMemory),
    vscode.commands.registerCommand('spw.checkPerformance', checkPerformance),
    vscode.commands.registerCommand('spw.showProjection', showProjection),
  ]
}

async function inspectSource(): Promise<void> {
  const editor = activeSpwEditor()
  if (!editor) return
  const { document, selection } = editor
  if (!selection.isEmpty) {
    const folder = activeWorkspaceFolder()
    if (!folder) return
    const text = document.getText(selection)
    await runInstrument({
      heading: 'Spw source inspection',
      folder,
      build: host => [sourceInvocation(host.consumerRoot, document.uri.fsPath, text)],
      notes: [`reading: selection, lines ${selection.start.line + 1}–${selection.end.line + 1}, passed inline`],
    })
    return
  }
  const folder = fileWorkspaceFolder(document)
  if (!folder) return
  await runInstrument({
    heading: 'Spw source inspection',
    folder,
    build: host => [sourceInvocation(host.consumerRoot, document.uri.fsPath)],
    notes: savedFileNotes(document),
  })
}

async function fingerprintSelection(): Promise<void> {
  const editor = activeSpwEditor()
  if (!editor) return
  const folder = activeWorkspaceFolder()
  if (!folder) return
  const { document, selection } = editor
  const fromSelection = !selection.isEmpty
  const text = fromSelection
    ? document.getText(selection)
    : document.lineAt(selection.active.line).text
  await runInstrument({
    heading: 'Spw fingerprint',
    folder,
    build: () => [fingerprintInvocation(text)],
    notes: [fromSelection ? 'reading: selection' : `reading: line ${selection.active.line + 1}`],
  })
}

async function inspectMemory(): Promise<void> {
  const folder = activeWorkspaceFolder()
  if (!folder) return
  await runInstrument({
    heading: 'Spw memory',
    folder,
    build: () => memoryInvocations(),
    notes: [
      '`spw inspect memory` reads through `spw mem status`; `spw mem list` names the dumps it counts',
      'runtime memory lives under the workspace runtime dir (default `.agents/state/runtime`)',
    ],
  })
}

async function checkPerformance(): Promise<void> {
  const editor = activeSpwEditor()
  if (!editor) return
  const folder = fileWorkspaceFolder(editor.document)
  if (!folder) return
  const file = editor.document.uri.fsPath
  await runInstrument({
    heading: 'Spw performance',
    folder,
    build: host => [performanceInvocation(host.consumerRoot, file)],
    notes: [
      'walks the folder that holds this file and parses every .spw in it; reads saved files only',
      'stats come from `--stats` on stderr; process wall time adds npm and CLI startup',
    ],
    present: presentQueryPerformance,
  })
}

async function showProjection(): Promise<void> {
  const editor = activeSpwEditor()
  if (!editor) return
  const { document } = editor
  const folder = fileWorkspaceFolder(document)
  if (!folder) return
  await runInstrument({
    heading: 'Spw projection',
    folder,
    build: host => [projectionInvocation(host.consumerRoot, document.uri.fsPath)],
    notes: [
      'projection: `spw.emit/1` emit IR — the host-neutral form every host pack is encoded from (traits, slots, dims, includes, optics, anchors, line)',
      'no `--out`, so nothing is written',
      ...savedFileNotes(document),
    ],
  })
}

async function runInstrument(request: InstrumentRequest): Promise<void> {
  const host = await resolveCliHostFor(request.folder, request.heading)
  if (!host) return

  let invocations: SpwCliInvocation[]
  try {
    invocations = request.build(host)
  } catch (error) {
    void vscode.window.showInformationMessage(errorMessage(error))
    return
  }

  try {
    const runs = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `${request.heading}…`,
        cancellable: true,
      },
      async (_progress, token) => {
        const done: InstrumentRun[] = []
        for (const invocation of invocations) {
          const output = await runCli(cliProcess(host, invocation), token)
          done.push({ invocation, ...output })
        }
        return done
      },
    )
    const presented = request.present?.(runs) ?? { sections: [], runs }
    const lines = renderInstrumentReport({
      heading: request.heading,
      receipt: [`source: CLI · effect: read-only · cwd: workspace folder \`${request.folder.name}\``],
      notes: request.notes,
      sections: presented.sections,
      runs: presented.runs,
    })
    await showInstrument(lines, 'markdown')
  } catch (error) {
    if (error instanceof CliCancelledError) return
    void vscode.window.showErrorMessage(`${request.heading} failed: ${errorMessage(error)}`)
  }
}

function savedFileNotes(document: vscode.TextDocument): string[] {
  return document.isDirty
    ? ['this buffer has unsaved edits; the CLI read the saved file']
    : []
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
