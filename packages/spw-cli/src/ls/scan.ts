import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parse, spwq, ANY } from '@spw/seed'
import { BRACE_SET, IGNORED_DIRS, OPERATOR_SET, REGISTER_GATE_SET, tokenMatches, tokenVariants } from './constants'
import type { EquivMode, MatchMode, MatchStats, RegisterState, SequenceCell, SurfaceMode } from './types'

export function parseOperatorQuery(input: string): { tokens: string[]; inlineLabels: string[] } {
  const canonical = input.replace(/\.([!?~@&*=%#$^_])/g, '$1')
  const tokens: string[] = []
  const labels = new Set<string>()

  for (let i = 0; i < canonical.length; i += 1) {
    const ch = canonical[i]

    if (ch === '.' && i + 1 < canonical.length) {
      const gate = `.${canonical[i + 1]}`
      if (REGISTER_GATE_SET.has(gate)) {
        tokens.push(gate)
        i += 1
        continue
      }
    }

    if (!OPERATOR_SET.has(ch)) continue

    tokens.push(ch)

    if (ch !== '_' || i + 1 >= canonical.length || canonical[i + 1] !== '_') continue

    let j = i + 2
    if (j >= canonical.length || !/[A-Za-z]/.test(canonical[j])) continue

    let label = canonical[j]
    j += 1
    while (j < canonical.length && /[A-Za-z0-9_-]/.test(canonical[j])) {
      label += canonical[j]
      j += 1
    }
    labels.add(label)
  }

  return { tokens, inlineLabels: [...labels] }
}

export function normalizeBraces(input: string): string[] {
  return [...input].filter((ch) => BRACE_SET.has(ch))
}

export async function collectSpwFiles(root: string): Promise<string[]> {
  const absRoot = path.resolve(root)
  const stat = await fs.stat(absRoot).catch(() => null)
  if (!stat) return []

  if (stat.isFile()) {
    return absRoot.endsWith('.spw') ? [absRoot] : []
  }

  if (!stat.isDirectory()) return []

  const out: string[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue
      const target = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(target)
        continue
      }
      if (entry.isFile() && entry.name.endsWith('.spw')) {
        out.push(target)
      }
    }
  }

  await walk(absRoot)
  return out
}

export function extractAstOperatorStream(source: string): SequenceCell[] {
  const parsed = parse(source)
  if (!parsed.ast) return []

  const matches = spwq(parsed.ast, ANY)
  const ops: SequenceCell[] = []
  for (const match of matches) {
    if (match.node.type !== 'Operation') continue
    const op = (match.node as { operator?: { value?: string } }).operator?.value
    if (!op || !OPERATOR_SET.has(op)) continue
    ops.push({ token: op, offset: match.span.startOffset })
  }

  return ops.sort((a, b) => a.offset - b.offset)
}

export function extractRawOperatorStream(source: string): SequenceCell[] {
  const out: SequenceCell[] = []
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]

    if (ch === '.' && i + 1 < source.length) {
      const gate = `.${source[i + 1]}`
      if (REGISTER_GATE_SET.has(gate)) {
        out.push({ token: gate, offset: i })
      }
    }

    if (!OPERATOR_SET.has(ch)) continue
    out.push({ token: ch, offset: i })
  }
  return out
}

export function extractBraceStream(source: string): SequenceCell[] {
  const braces: SequenceCell[] = []
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]
    if (!BRACE_SET.has(ch)) continue
    braces.push({ token: ch, offset: i })
  }
  return braces
}

export function mergeStreams(a: SequenceCell[], b: SequenceCell[]): SequenceCell[] {
  const merged = [...a, ...b].sort((x, y) => x.offset - y.offset)
  const seen = new Set<string>()
  const out: SequenceCell[] = []
  for (const cell of merged) {
    const key = `${cell.offset}:${cell.token}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(cell)
  }
  return out
}

export function selectOperatorStream(source: string, surface: SurfaceMode): SequenceCell[] {
  if (surface === 'ast') return extractAstOperatorStream(source)
  if (surface === 'raw') return extractRawOperatorStream(source)
  return mergeStreams(extractAstOperatorStream(source), extractRawOperatorStream(source))
}

function popMatching(stack: Array<{ token: string; offset: number }>, expectedOpen: string): boolean {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i].token !== expectedOpen) continue
    stack.splice(i, 1)
    return true
  }
  return false
}

export function extractRegisterState(source: string): RegisterState {
  const braceStack: Array<{ token: string; offset: number }> = []
  const gateStack: Array<{ token: string; offset: number }> = []
  const openBraces = new Set(['(', '[', '{', '<'])
  const closeToOpen: Record<string, string> = { ')': '(', ']': '[', '}': '{', '>': '<' }
  const gateOpenToClose: Record<string, string> = {
    '.[': '.]',
    '.(': '.)',
    '.{': '.}',
    '.<': '.>',
  }
  const gateCloseToOpen: Record<string, string> = {
    '.]': '.[',
    '.)': '.(',
    '.}': '.{',
    '.>': '.<',
  }
  let quote: '"' | '\'' | '`' | null = null
  let escaped = false

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]

    if (quote) {
      if (escaped) {
        escaped = false
        continue
      }
      if (ch === '\\') {
        escaped = true
        continue
      }
      if (ch === quote) {
        quote = null
      }
      continue
    }

    if (ch === '"' || ch === '\'' || ch === '`') {
      quote = ch
      continue
    }

    if (ch === '.' && i + 1 < source.length) {
      const gate = `.${source[i + 1]}`
      if (REGISTER_GATE_SET.has(gate)) {
        if (gate in gateOpenToClose) {
          gateStack.push({ token: gate, offset: i })
        } else {
          const expectedOpen = gateCloseToOpen[gate]
          popMatching(gateStack, expectedOpen)
        }
        i += 1
        continue
      }
    }

    if (openBraces.has(ch)) {
      braceStack.push({ token: ch, offset: i })
      continue
    }

    const expectedOpen = closeToOpen[ch]
    if (!expectedOpen) continue
    popMatching(braceStack, expectedOpen)
  }

  const dangling = [...gateStack.map((entry) => entry.token), ...braceStack.map((entry) => `.${entry.token}`)]
  const unique = [...new Set(dangling)]
  return {
    danglingCount: unique.length,
    danglingTokens: unique,
  }
}

function parseLabelAt(source: string, start: number): { label: string; next: number } | null {
  if (source[start] !== '_') return null
  let i = start + 1
  if (i >= source.length || !/[A-Za-z]/.test(source[i])) return null
  let label = source[i]
  i += 1
  while (i < source.length && /[A-Za-z0-9_-]/.test(source[i])) {
    label += source[i]
    i += 1
  }
  return { label, next: i }
}

export function extractLabelStats(source: string): {
  labels: string[]
  operatorCount: number
  bracePairCount: number
} {
  const labels = new Set<string>()
  let operatorCount = 0
  let bracePairCount = 0
  const stack = new Map<string, number>()
  const opens = new Set(['(', '[', '{', '<'])
  const closes = new Set([')', ']', '}', '>'])

  for (let i = 0; i < source.length - 1; i += 1) {
    const ch = source[i]
    if (source[i + 1] !== '_') continue

    const parsed = parseLabelAt(source, i + 1)
    if (!parsed) continue

    labels.add(parsed.label)
    if (OPERATOR_SET.has(ch)) operatorCount += 1

    if (opens.has(ch)) {
      stack.set(parsed.label, (stack.get(parsed.label) ?? 0) + 1)
    } else if (closes.has(ch)) {
      const current = stack.get(parsed.label) ?? 0
      if (current > 0) {
        bracePairCount += 1
        if (current === 1) stack.delete(parsed.label)
        else stack.set(parsed.label, current - 1)
      }
    }

    i = parsed.next - 1
  }

  return {
    labels: [...labels].sort(),
    operatorCount,
    bracePairCount,
  }
}

export function orderedStats(stream: SequenceCell[], query: string[], equivMode: EquivMode): MatchStats {
  if (query.length === 0) return { matched: 0, coverage: 0, strictHit: true }

  let q = 0
  for (const cell of stream) {
    if (q >= query.length) break
    if (!tokenMatches(query[q], cell.token, equivMode)) continue
    q += 1
  }

  return {
    matched: q,
    coverage: q / query.length,
    strictHit: q === query.length,
  }
}

export function setStats(stream: SequenceCell[], query: string[], equivMode: EquivMode): MatchStats {
  if (query.length === 0) return { matched: 0, coverage: 0, strictHit: true }

  const counts = new Map<string, number>()
  for (const cell of stream) {
    counts.set(cell.token, (counts.get(cell.token) ?? 0) + 1)
  }

  let matched = 0
  for (const token of query) {
    const variants = tokenVariants(token, equivMode)
    let claimed = false
    for (const variant of variants) {
      const current = counts.get(variant) ?? 0
      if (current <= 0) continue
      matched += 1
      counts.set(variant, current - 1)
      claimed = true
      break
    }
    if (!claimed) continue
  }

  return {
    matched,
    coverage: matched / query.length,
    strictHit: matched === query.length,
  }
}

export function selectStats(ordered: MatchStats, set: MatchStats, mode: MatchMode): MatchStats {
  if (mode === 'ordered') return ordered
  if (mode === 'set') return set

  if (ordered.coverage > set.coverage) return ordered
  if (set.coverage > ordered.coverage) return set
  if (ordered.strictHit && !set.strictHit) return ordered
  if (set.strictHit && !ordered.strictHit) return set
  return ordered
}
