/**
 * Custom spw/* probe handlers shared by VS Code, Neovim, and IntelliJ clients.
 *
 * Methods:
 *   spw/operatorFrequency — sigil histogram for a document or root sample
 *   spw/phaseContext      — spirit-phase of the sigil under the cursor
 *   spw/resonance         — annotation co-occurrence edges from an open URI
 *   spw/registerSnapshot  — heuristic register-like markers in a document
 *   spw/formSequence      — parse/advance confluence form sequences
 *   spw/formContext       — caret-local coupling + gated mobility packet
 */

import path from 'node:path'
import { inspectGeometry, parse, particleMix, deixisTable } from '@spwashi/spw-seed'
import { SIGIL_SEMANTICS } from '../server-index'
import type { HandlerDeps, LspPosition } from '../types'
import { assembleFormContext } from './form-context'

const SIGIL_CHARS = new Set(['^', '!', '?', '~', '*', '=', '@', '#', '.', '&', '$', '%', '<', '>'])

export interface OperatorFrequencyEntry {
  operator: string
  count: number
  percent: number
}

export interface OperatorFrequencyResult {
  target: string
  dominantOperator: string | null
  entries: OperatorFrequencyEntry[]
}

export type MaterializationState = 'priming' | 'concept' | 'frame' | 'body'

export interface PhaseContextResult {
  phase: number | null
  sigil: string | null
  materializationState: MaterializationState | null
  role?: string
  physics?: string
}

export interface ResonanceEdge {
  channel: string
  strength: number
  targetUri: string
}

export interface RegisterSnapshotEntry {
  name: string
  phase: number
  fileUri: string
  value?: unknown
  provenance?: string[]
}

export interface RegisterSnapshotResult {
  registers: RegisterSnapshotEntry[]
  timestamp: number
  fileUri: string
}

export interface FormSequenceProbeResult {
  notation: string
  steps: Array<{ surface: string; op: string; label?: string; tag?: string }>
  terminal: string
  catalog?: Array<{ id: string; surface: string; role: string }>
}

/** Histogram of operator/sigil characters in source text. */
export function computeOperatorFrequency(
  source: string,
  target: string,
): OperatorFrequencyResult {
  const counts = new Map<string, number>()
  let total = 0
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!
    if (!SIGIL_CHARS.has(ch)) continue
    // Skip digraph second half double-count for << >>
    if (ch === '<' && source[i + 1] === '<') {
      counts.set('<<', (counts.get('<<') ?? 0) + 1)
      total++
      i++
      continue
    }
    if (ch === '>' && source[i + 1] === '>') {
      counts.set('>>', (counts.get('>>') ?? 0) + 1)
      total++
      i++
      continue
    }
    if (ch === '<' || ch === '>') continue
    counts.set(ch, (counts.get(ch) ?? 0) + 1)
    total++
  }

  const entries: OperatorFrequencyEntry[] = [...counts.entries()]
    .map(([operator, count]) => ({
      operator,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.operator.localeCompare(b.operator))

  return {
    target,
    dominantOperator: entries[0]?.operator ?? null,
    entries,
  }
}

export async function operatorFrequency(
  params: { uri?: string; root?: string } | undefined,
  deps: HandlerDeps,
): Promise<OperatorFrequencyResult> {
  const uri = params?.uri
  if (typeof uri === 'string' && uri.length > 0) {
    const source = (await deps.getDocumentText(uri)) ?? ''
    return computeOperatorFrequency(source, uri)
  }

  // Sample up to 24 workspace files when no uri
  const files = await deps.getWorkspaceSpwFiles()
  const sample = files.slice(0, 24)
  let combined = ''
  for (const file of sample) {
    const u = deps.uriFromPath(file)
    const text = await deps.getDocumentText(u)
    if (text) combined += `${text}\n`
  }
  return computeOperatorFrequency(combined, params?.root ?? deps.workspaceRoot)
}

export async function phaseContext(
  params: { uri?: string; position?: LspPosition },
  deps: HandlerDeps,
): Promise<PhaseContextResult> {
  const uri = params?.uri
  const pos = params?.position
  if (typeof uri !== 'string' || !pos || typeof pos.line !== 'number') {
    return { phase: null, sigil: null, materializationState: null }
  }
  const source = await deps.getDocumentText(uri)
  if (source == null) {
    return { phase: null, sigil: null, materializationState: null }
  }
  const lines = source.split(/\r?\n/)
  const line = lines[pos.line] ?? ''
  const ch = line[pos.character] ?? line[pos.character - 1] ?? ''
  // Also accept annotation prefixes near cursor
  const window = line.slice(Math.max(0, pos.character - 2), pos.character + 2)
  let sigil: string | null = null
  if (window.includes('##>')) sigil = '#'
  else if (window.includes('#:')) sigil = '#'
  else if (window.includes('#!')) sigil = '#'
  else if (window.includes('#>')) sigil = '#'
  else if (SIGIL_CHARS.has(ch) && ch !== '<' && ch !== '>') sigil = ch
  else {
    // nearest sigil left of cursor on line
    for (let i = Math.min(pos.character, line.length - 1); i >= 0; i--) {
      const c = line[i]!
      if (SIGIL_CHARS.has(c) && c !== '<' && c !== '>') {
        sigil = c
        break
      }
    }
  }

  if (!sigil) {
    return { phase: null, sigil: null, materializationState: materializationOfLine(line) }
  }

  const sem = SIGIL_SEMANTICS[sigil]
  return {
    phase: sem?.phaseIndex ?? null,
    sigil,
    materializationState: materializationOfLine(line),
    role: sem?.role,
    physics: sem?.physics,
  }
}

function materializationOfLine(line: string): MaterializationState | null {
  if (/\^\[["']/.test(line) || /\{/.test(line)) return 'body'
  if (/\[["']/.test(line)) return 'frame'
  if (/^#/.test(line.trim()) || /~#/.test(line)) return 'concept'
  if (line.trim().length === 0) return 'priming'
  return 'concept'
}

export async function resonance(
  params: { uri?: string },
  deps: HandlerDeps,
): Promise<ResonanceEdge[]> {
  const uri = params?.uri
  if (typeof uri !== 'string') return []
  const filePath = deps.pathFromUri(uri)
  if (!filePath) return []

  const source = await deps.getDocumentText(uri)
  if (!source) return []

  // Collect annotation names in this file
  const names = new Set<string>()
  const re = /(?:##>|#!|#:|#>|#)([a-zA-Z_][\w]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    names.add(m[1]!)
  }

  const edges: ResonanceEdge[] = []
  const seen = new Set<string>()
  for (const name of names) {
    const entries = deps.serverIndex.lookupAnnotation?.(name) ?? []
    for (const e of entries) {
      const targetPath = e.file
      if (!targetPath || targetPath === filePath) continue
      const targetUri = deps.uriFromPath(targetPath)
      const key = `${name}|${targetUri}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({
        channel: name,
        strength: Math.min(1, 0.35 + 0.1 * Math.min(10, entries.length)),
        targetUri,
      })
    }
  }

  return edges.sort((a, b) => b.strength - a.strength || a.channel.localeCompare(b.channel)).slice(0, 40)
}

export async function registerSnapshot(
  params: { uri?: string },
  deps: HandlerDeps,
): Promise<RegisterSnapshotResult> {
  const uri = params?.uri ?? ''
  const source = typeof uri === 'string' ? await deps.getDocumentText(uri) : null
  const registers: RegisterSnapshotEntry[] = []

  if (source) {
    // $%[path] measure registers
    const measureRe = /\$%\[([^\]]+)\]/g
    let m: RegExpExecArray | null
    while ((m = measureRe.exec(source)) !== null) {
      registers.push({
        name: m[1]!,
        phase: 2,
        fileUri: uri,
        provenance: ['document:$%[]'],
      })
    }
    // ~#trait keys as soft registers
    const traitRe = /~#([a-zA-Z_][\w.]*)\s*:/g
    while ((m = traitRe.exec(source)) !== null) {
      registers.push({
        name: m[1]!,
        phase: 1,
        fileUri: uri,
        provenance: ['document:~#'],
      })
    }
  }

  // Overlay live observable state if present
  const obs = deps.observableState as { registers?: Record<string, unknown> } | null
  if (obs?.registers && typeof obs.registers === 'object') {
    for (const [name, value] of Object.entries(obs.registers)) {
      registers.push({
        name,
        phase: 3,
        fileUri: uri,
        value,
        provenance: ['observableState'],
      })
    }
  }

  return {
    registers: registers.slice(0, 64),
    timestamp: Date.now(),
    fileUri: uri,
  }
}

/**
 * Lightweight form-sequence parse without pulling seed math into LSP bundle
 * if unavailable — pure string classification matching form-sequence.ts.
 */
export function formSequenceProbe(
  params: { notation?: string; catalog?: boolean } | undefined,
): FormSequenceProbeResult {
  const notation = (params?.notation ?? '& => {&} => {&[#label]} => {&<#tag>_label}')
    .replace(/→/g, '=>')
    .replace(/⇒/g, '=>')
    .trim()
  const parts = notation.split(/\s*=>\s*/).map(s => s.trim()).filter(Boolean)
  const steps = parts.map(surface => classifyFormSurface(surface))
  const result: FormSequenceProbeResult = {
    notation: steps.map(s => s.surface).join(' => '),
    steps,
    terminal: steps[steps.length - 1]?.surface ?? '',
  }
  if (params?.catalog) {
    result.catalog = [
      { id: 'seed', surface: '&', role: 'seed' },
      { id: 'wrap', surface: '{&}', role: 'wrap' },
      { id: 'annotate', surface: '{&[#label]}', role: 'annotate' },
      { id: 'membrane', surface: '{&<#tag>_label}', role: 'membrane' },
    ]
  }
  return result
}

function classifyFormSurface(surface: string): {
  surface: string
  op: string
  label?: string
  tag?: string
} {
  const s = surface.trim()
  const membrane = s.match(/^\{&\s*<#?([^>]+)>\s*(?:_([A-Za-z_][\w.-]*))?\s*\}$/)
  if (membrane) {
    return { surface: s, op: 'membrane', tag: membrane[1], label: membrane[2] }
  }
  const ann = s.match(/^\{&\s*\[#?([^\]]*)\]\s*\}$/)
  if (ann) {
    return { surface: s, op: 'annotate', label: ann[1]?.replace(/^#/, '') }
  }
  if (s === '{&}' || s === '{ & }') return { surface: '{&}', op: 'wrap' }
  if (s === '&') return { surface: '&', op: 'seed' }
  return { surface: s, op: 'fold' }
}

export function handleSpwProbe(
  method: string,
  params: any,
  deps: HandlerDeps,
): Promise<unknown> | unknown | null {
  switch (method) {
    case 'spw/operatorFrequency':
      return operatorFrequency(params, deps)
    case 'spw/phaseContext':
      return phaseContext(params, deps)
    case 'spw/resonance':
      return resonance(params, deps)
    case 'spw/registerSnapshot':
      return registerSnapshot(params, deps)
    case 'spw/formSequence':
      return formSequenceProbe(params)
    case 'spw/geometry':
      return geometryProbe(params, deps)
    case 'spw/particles':
      return particlesProbe(params, deps)
    case 'spw/formContext':
      return formContextProbe(params, deps)
    default:
      return null
  }
}

/**
 * The particle profile of a document: its deixis (anchor) table plus the
 * aim mix — the dialect signature extension surfaces tune themselves from
 * (deixis = navigability, case = queryability, mood = assertion richness,
 * aspect = volatility / cache churn).
 */
async function particlesProbe(
  params: { uri?: string; text?: string } | undefined,
  deps: HandlerDeps,
): Promise<unknown> {
  let source = typeof params?.text === 'string' ? params.text : ''
  const uri = params?.uri
  if (!source && typeof uri === 'string') {
    source = (await deps.getDocumentText(uri)) ?? ''
  }

  const ast = parse(source).ast ?? null
  const mix = particleMix(ast, source)
  if (!ast) return { uri: uri ?? null, anchors: [], mix }

  const anchors = [...deixisTable(ast).entries()].map(([name, binding]) => ({
    name,
    line: binding.particle.span.start.line,
    boundLine: binding.bound?.span?.start.line ?? null,
  }))

  return { uri: uri ?? null, anchors, mix }
}

async function geometryProbe(
  params: { uri?: string; text?: string } | undefined,
  deps: HandlerDeps,
): Promise<unknown> {
  let source = typeof params?.text === 'string' ? params.text : ''
  const uri = params?.uri
  if (!source && typeof uri === 'string') {
    source = (await deps.getDocumentText(uri)) ?? ''
  }
  return { uri: uri ?? null, ...inspectGeometry(source) }
}

/**
 * Revision-addressed caret form context (coupling packet + mobility previews).
 * Clients must treat `revision` as the document version the packet was built for.
 */
async function formContextProbe(
  params: { uri?: string; position?: LspPosition } | undefined,
  deps: HandlerDeps,
): Promise<unknown> {
  const uri = params?.uri
  const position = params?.position
  if (!uri || !position) {
    return { ok: false, reason: 'uri and position required' }
  }

  const doc = deps.serverIndex.getDocument(uri)
  if (!doc) {
    return { ok: false, reason: 'document not open', uri, revision: null }
  }

  const ctx = assembleFormContext(doc, position)
  if (!ctx) {
    return { ok: false, reason: 'no form context', uri, revision: doc.version }
  }

  return {
    ok: true,
    uri: ctx.uri,
    revision: ctx.revision,
    offset: ctx.offset,
    nodeType: ctx.nodeType,
    label: ctx.label,
    labelPosition: ctx.labelPosition,
    surface: ctx.surface,
    surfaceText: ctx.surfaceText,
    coupling: ctx.coupling,
    mobility: ctx.mobility.map((m) => ({
      ruleId: m.ruleId,
      name: m.name,
      status: m.status,
      motion: m.motion,
      gated: m.gated,
      reason: m.reason,
      preview: m.preview,
      rewrite: m.rewrite,
      // Receipt is available for gated pass; strip bulky topography unless needed.
      receipt: m.receipt
        ? {
            beforeHealth: m.receipt.beforeHealth,
            afterHealth: m.receipt.afterHealth,
            inverse: m.receipt.inverse,
            effectGrade: m.receipt.effectGrade,
            semanticEquivalence: m.receipt.semanticEquivalence,
          }
        : undefined,
    })),
    conceptual: ctx.conceptual.map((m) => ({
      ruleId: m.ruleId,
      name: m.name,
      status: m.status,
      gated: m.gated,
      reason: m.reason,
      rewrite: m.rewrite,
    })),
  }
}
