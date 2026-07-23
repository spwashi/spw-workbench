import * as vscode from 'vscode'
import { getCursorContextAtEditor, type SpwContext } from './context'
import type { SpwContextAtPositionResult } from './lsp/custom-requests'

const STRIP_LABEL = 'Spw'
const UPDATE_DELAY_MS = 80

export function registerContextStrip(spw: SpwContext): vscode.Disposable[] {
  const item = vscode.window.createStatusBarItem('spw.context', vscode.StatusBarAlignment.Left, 40)
  item.name = 'Spw Field'

  let timer: ReturnType<typeof setTimeout> | undefined
  let requestVersion = 0

  const scheduleUpdate = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { void refreshContext() }, UPDATE_DELAY_MS)
  }

  const refreshContext = async (): Promise<void> => {
    const editor = vscode.window.activeTextEditor
    if (!editor || editor.document.languageId !== 'spw' || editor.selection.isEmpty === false) {
      item.hide()
      return
    }

    const version = ++requestVersion
    const context = await getCursorContextAtEditor(spw, editor)

    if (version !== requestVersion) return
    if (!context || isContextEmpty(context)) {
      item.hide()
      return
    }

    item.text = buildStatusText(context)
    item.tooltip = buildTooltip(context)
    item.show()
  }

  scheduleUpdate()

  return [
    item,
    vscode.window.onDidChangeActiveTextEditor(() => scheduleUpdate()),
    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (event.textEditor.document.languageId === 'spw') scheduleUpdate()
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (vscode.window.activeTextEditor?.document.uri.toString() === event.document.uri.toString()) {
        scheduleUpdate()
      }
    }),
    new vscode.Disposable(() => {
      if (timer) clearTimeout(timer)
    }),
  ]
}

function isContextEmpty(context: SpwContextAtPositionResult): boolean {
  return context.framePath.length === 0
    && context.ambientBraids.length === 0
    && context.localBraids.length === 0
}

function buildStatusText(context: SpwContextAtPositionResult): string {
  const parts: string[] = []

  if (context.framePath.length > 0) {
    parts.push(context.framePath.join(' > '))
  }

  const local = formatInlineBraids(context.localBraids, 2)
  if (local) {
    parts.push(`${context.localBraids.length === 1 ? 'facet' : 'facets'} ${local}`)
  } else if (context.enteredFrame) {
    parts.push(`enter ${context.enteredFrame}`)
  } else {
    const ambient = formatInlineBraids(context.ambientBraids.slice(-2), 2)
    if (ambient) {
      // Label by particle kind: moods, cases, deixis, aspects
      const kinds = classifyParticles(context.ambientBraids.slice(-2))
      parts.push(`${kinds} ${ambient}`)
    }
  }

  return `${STRIP_LABEL}: ${parts.join(' | ')}`
}

function buildTooltip(context: SpwContextAtPositionResult): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true)
  md.appendMarkdown(`**${STRIP_LABEL} Field**\n\n`)

  if (context.framePath.length > 0) {
    md.appendMarkdown(`- Frame path: \`${context.framePath.join(' > ')}\`\n`)
  }
  if (context.enteredFrame) {
    md.appendMarkdown(`- Entered frame: \`${context.enteredFrame}\`\n`)
  }
  if (context.ambientBraids.length > 0) {
    md.appendMarkdown(`- Ambient field: ${context.ambientBraids.map(asCode).join(' · ')}\n`)
  }
  if (context.localBraids.length > 0) {
    md.appendMarkdown(`- Active facets: ${context.localBraids.map(asCode).join(' · ')}\n`)
  }
  if (context.deltaBraids.length > 0) {
    md.appendMarkdown(`- Field shift: ${context.deltaBraids.map(asCode).join(' · ')}\n`)
  }

  return md
}

function formatInlineBraids(values: string[], limit: number): string | null {
  if (values.length === 0) return null
  const visible = values.slice(0, limit)
  const summary = visible.join(' · ')
  return values.length > limit ? `${summary} · …` : summary
}

function asCode(value: string): string {
  return `\`${value.replace(/`/g, '\\`')}\``
}

/** Classify particles by their aim/prefix to label the statusbar intelligently. */
function classifyParticles(braids: string[]): string {
  if (braids.length === 0) return 'field'
  const kinds = new Set<string>()
  for (const b of braids) {
    if (b.startsWith('#!')) kinds.add('mood')
    else if (b.startsWith('#:')) kinds.add('case')
    else if (b.startsWith('#>')) kinds.add('deixis')
    else if (b.startsWith('~#')) kinds.add('aspect')
  }
  return [...kinds].sort().join(' · ') || 'field'
}
