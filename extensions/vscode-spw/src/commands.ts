/**
 * VS Code commands that surface LSP custom probes and authoring helpers.
 */
import * as vscode from 'vscode'
import type { LanguageClient } from 'vscode-languageclient/node'
import type { SpwCustomRequestClient } from './lsp/custom-requests'
import type { ProbeCache } from './surface-decorations'

const FORM_SEQ = '& => {&} => {&[#label]} => {&<#tag>_label}'

export function registerSpwCommands(
  _context: vscode.ExtensionContext,
  client: LanguageClient,
  requests: SpwCustomRequestClient,
  probeCache?: ProbeCache,
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('spw.showOperatorFrequency', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor || editor.document.languageId !== 'spw') {
        void vscode.window.showInformationMessage('Open a .spw file first.')
        return
      }
      const uri = editor.document.uri.toString()
      const result = await client.sendRequest<{
        dominantOperator: string | null
        entries: Array<{ operator: string; count: number; percent: number }>
      }>('spw/operatorFrequency', { uri })
      const lines = result.entries
        .slice(0, 12)
        .map(e => `${e.operator.padEnd(4)} ${String(e.count).padStart(5)}  ${e.percent.toFixed(1)}%`)
      const doc = await vscode.workspace.openTextDocument({
        content: [
          `# Spw operator frequency`,
          `dominant: ${result.dominantOperator ?? '—'}`,
          '',
          ...lines,
        ].join('\n'),
        language: 'markdown',
      })
      await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside })
    }),

    vscode.commands.registerCommand('spw.showPhaseContext', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor || editor.document.languageId !== 'spw') return
      const uri = editor.document.uri.toString()
      const pos = editor.selection.active
      const result = await client.sendRequest<{
        sigil: string | null
        phase: number | null
        role?: string
        physics?: string
        materializationState: string | null
      }>('spw/phaseContext', {
        uri,
        position: { line: pos.line, character: pos.character },
      })
      void vscode.window.showInformationMessage(
        result.sigil
          ? `Spw phase: ${result.sigil}  phase=${result.phase ?? '—'}  ${result.role ?? ''} — ${result.physics ?? ''}`
          : 'No sigil under cursor.',
      )
    }),

    vscode.commands.registerCommand('spw.insertFormSequence', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor || editor.document.languageId !== 'spw') return
      const pick = await vscode.window.showQuickPick(
        [
          { label: 'Wrap confluence', description: '& => {&}', insert: '& => {&}' },
          { label: 'Wrap + annotate', description: '& => {&} => {&[#label]}', insert: '& => {&} => {&[#${1:label}]}' },
          { label: 'Full membrane', description: FORM_SEQ, insert: FORM_SEQ },
          { label: 'Reduce reverse', description: '{&<#tag>_label} => … => &', insert: '{&<#tag>_label} => {&[#label]} => {&} => &' },
        ],
        { title: 'Insert form sequence' },
      )
      if (!pick) return
      await editor.insertSnippet(new vscode.SnippetString(pick.insert))
    }),

    vscode.commands.registerCommand('spw.showFormSequence', async () => {
      const result = await client.sendRequest<{
        notation: string
        steps: Array<{ surface: string; op: string; label?: string }>
        catalog?: Array<{ id: string; surface: string; role: string }>
      }>('spw/formSequence', { notation: FORM_SEQ, catalog: true })
      const body = [
        `# Form sequence`,
        result.notation,
        '',
        ...result.steps.map((s, i) => `${i}. [${s.op}] \`${s.surface}\`${s.label ? ` label=${s.label}` : ''}`),
        '',
        '## Catalog',
        ...(result.catalog ?? []).map(c => `- ${c.id}: \`${c.surface}\` (${c.role})`),
      ].join('\n')
      const doc = await vscode.workspace.openTextDocument({ content: body, language: 'markdown' })
      await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside })
    }),

    vscode.commands.registerCommand('spw.showWorkspaceTemperature', async () => {
      const entries = await requests.workspaceTemperature()
      if (!entries.length) {
        void vscode.window.showInformationMessage('No workspace temperature data yet (open/save .spw files).')
        return
      }
      const top = entries
        .slice()
        .sort((a, b) => b.writeCount - a.writeCount)
        .slice(0, 20)
        .map(e => `${e.tier.padEnd(6)} w=${e.writeCount}  age=${e.beatAge}  ${e.uri}`)
      const doc = await vscode.workspace.openTextDocument({
        content: ['# Spw workspace temperature', '', ...top].join('\n'),
        language: 'markdown',
      })
      await vscode.window.showTextDocument(doc, { preview: true })
    }),

    vscode.commands.registerCommand('spw.inspectCache', async () => {
      const reflection = await requests.cacheReflection()
      if (!reflection || reflection.tracked === 0) {
        void vscode.window.showInformationMessage('No surfaces read yet this session.')
        return
      }

      const short = (uri: string): string => uri.split('/').slice(-2).join('/')
      const percent = (share: number): string => `${Math.round(share * 100)}%`

      const lines = [
        '# Spw session attention',
        '',
        `${reflection.tracked} surfaces read · beat ${reflection.beat} · `
          + `${percent(reflection.concentration)} of opens on one surface`,
        '',
        '## What stands out',
        ...(reflection.notes.length > 0
          ? reflection.notes.map((n) => `- **${n.kind}** — ${short(n.uri)}: ${n.detail}`)
          : ['- nothing to flag: no stale readings, no abandoned edits']),
        '',
        '## Kinds of surface in play',
        ...reflection.families.map(
          (f) => `- **${f.archetype}** (${f.volatility}) × ${f.uris.length}`
            + `\n${f.uris.map((u) => `  - ${short(u)}`).join('\n')}`,
        ),
      ]

      const doc = await vscode.workspace.openTextDocument({
        content: lines.join('\n'),
        language: 'markdown',
      })
      await vscode.window.showTextDocument(doc, { preview: true })
    }),

    vscode.commands.registerCommand('spw.restartLanguageServer', async () => {
      await client.restart()
      void vscode.window.showInformationMessage('Spw language server restarted.')
    }),

    vscode.commands.registerCommand('spw.inspectGeometry', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor || editor.document.languageId !== 'spw') {
        void vscode.window.showInformationMessage('Open a .spw file first.')
        return
      }
      const uri = editor.document.uri.toString()
      const cacheKey = `geometry:${uri}:${editor.document.version}`
      let cachedResult = probeCache?.get<{
        braces: {
          kinds: Record<string, number>
          coupleOps: number
          medials: number
          channels: string[]
        }
        operators: Array<{ sigil: string; count: number; percent: number; role: string }>
        nesting: { maxDepth: number }
        lessons: string[]
      }>(cacheKey)
      if (!cachedResult) {
        cachedResult = await client.sendRequest('spw/geometry', { uri })
        probeCache?.set(cacheKey, cachedResult)
      }
      const result = cachedResult!
      const k = result.braces?.kinds ?? {}
      const lines = [
        `# Spw geometry`,
        `()=${k.scope ?? 0} []=${k.frame ?? 0} {}=${k.body ?? 0} <>=${k.capsule ?? 0}  couple=${result.braces?.coupleOps ?? 0}  medials=${result.braces?.medials ?? 0}`,
        `maxDepth=${result.nesting?.maxDepth ?? 0}`,
        '',
        'operators',
        ...(result.operators ?? [])
          .slice(0, 12)
          .map(o => `${o.sigil}  ${o.count}  ${o.percent.toFixed(1)}%  ${o.role}`),
        '',
        'lessons',
        ...(result.lessons ?? []).map(L => `· ${L}`),
      ]
      const doc = await vscode.workspace.openTextDocument({
        content: lines.join('\n'),
        language: 'markdown',
      })
      await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside })
    }),

    vscode.commands.registerCommand('spw.clearProbeCache', () => {
      probeCache?.clear()
      void vscode.window.showInformationMessage('Spw probe cache cleared.')
    }),
  ]
}
