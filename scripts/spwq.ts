/**
 * spwq — Spw Query CLI
 *
 * Query .spw files using the selector algebra.
 *
 * Usage:
 *   npm run spwq -- <file> [--selector=<name>] [--expr=<spw-expr>] [--format=json|lines] [--summary]
 *
 * Selectors (structural):
 *   navigable  — refs + pathRefs (default)
 *   refs       — @references
 *   pathRefs   — ~"..." path references
 *   rootRefs   — @root/path references
 *   domains    — ^[_] domain roots
 *   domains+   — ^[_]{_} domain roots with body
 *   scopes     — () scope containers
 *
 * Selectors (by sigil):
 *   hydrate    — ! operations
 *   probes     — ? operations
 *   configs    — = operations
 *   defers     — ~ operations
 *   taps       — ^ operations (domain roots)
 *   annotations — # operations
 *
 * Selectors (by shape):
 *   ops:frame  — operations with []
 *   ops:body   — operations with {}
 *
 * Selectors (by modifier):
 *   boon       — !boon operations
 *   bone       — !bone operations
 *
 * Meta:
 *   all        — every node
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  parse,
  spwq,
  or,
  type SpwSelector,
  type SpwMatch,
  PATH_REFS,
  REFERENCES,
  NAVIGABLE,
  DOMAIN_ROOTS,
  DOMAIN_ROOTS_FULL,
  HYDRATE_OPS,
  DEFER_OPS,
  QUERY_OPS,
  CONFIG_OPS,
  ANNOTATION_OPS,
  OPS_WITH_FRAMES,
  OPS_WITH_BODIES,
  SCOPES,
  BOON_OPS,
  BONE_OPS,
  ANY,
} from '../src/seed'
import { tryParseSelector } from '../src/seed/query/selector-expr'

// ── Args ─────────────────────────────────────────────────────

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const selectorArg = args.find((a) => a.startsWith('--selector='))?.split('=')[1] ?? 'navigable'
const exprArg = args.find((a) => a.startsWith('--expr='))?.split('=').slice(1).join('=')
const formatArg = args.find((a) => a.startsWith('--format='))?.split('=')[1] ?? 'lines'
const showSummary = args.includes('--summary')

if (!file) {
  console.error('Usage: npm run spwq -- <file.spw> [--selector=navigable] [--format=lines|json] [--summary]')
  console.error('')
  console.error('Selectors:')
  for (const [name, _] of Object.entries(SELECTOR_MAP_INIT())) {
    console.error(`  ${name}`)
  }
  process.exit(1)
}

// ── Selector resolution ──────────────────────────────────────

function SELECTOR_MAP_INIT(): Record<string, SpwSelector> {
  return {
    // structural
    navigable: NAVIGABLE,
    refs: REFERENCES,
    pathRefs: PATH_REFS,
    rootRefs: REFERENCES,
    domains: DOMAIN_ROOTS,
    'domains+': DOMAIN_ROOTS_FULL,
    scopes: SCOPES,

    // by sigil
    hydrate: HYDRATE_OPS,
    probes: QUERY_OPS,
    configs: CONFIG_OPS,
    defers: DEFER_OPS,
    taps: DOMAIN_ROOTS,
    annotations: ANNOTATION_OPS,

    // by shape
    'ops:frame': OPS_WITH_FRAMES,
    'ops:body': OPS_WITH_BODIES,

    // by modifier
    boon: BOON_OPS,
    bone: BONE_OPS,

    // meta
    all: ANY,
  }
}

const SELECTOR_MAP = SELECTOR_MAP_INIT()

// Resolve selector: --expr takes priority, then --selector (preset or expression fallback)
let selector: SpwSelector
let selectorLabel: string

if (exprArg) {
  const parsed = tryParseSelector(exprArg)
  if (!parsed) {
    console.error(`Failed to parse expression: ${exprArg}`)
    process.exit(1)
  }
  selector = parsed
  selectorLabel = exprArg
} else {
  const preset = SELECTOR_MAP[selectorArg]
  if (preset) {
    selector = preset
    selectorLabel = selectorArg
  } else {
    // Try parsing --selector value as an expression
    const parsed = tryParseSelector(selectorArg)
    if (parsed) {
      selector = parsed
      selectorLabel = selectorArg
    } else {
      console.error(`Unknown selector: ${selectorArg}`)
      console.error(`Available presets: ${Object.keys(SELECTOR_MAP).join(', ')}`)
      console.error(`Or use --expr="^[]" for Spw-native expressions`)
      process.exit(1)
    }
  }
}

// ── Parse and query ──────────────────────────────────────────

const filePath = resolve(file)
const source = readFileSync(filePath, 'utf-8')
const output = parse(source)

if (!output.ast) {
  console.error(`Failed to parse ${filePath}`)
  process.exit(1)
}

let matches = spwq(output.ast, selector)

// rootRefs: post-filter to only @ references with /
if (selectorArg === 'rootRefs') {
  matches = matches.filter((m) => {
    if (m.node.type !== 'Reference') return false
    const raw = (m.node as any).raw ?? ''
    return raw.includes('/')
  })
}

// ── Output ───────────────────────────────────────────────────

function getMatchLabel(m: SpwMatch): string {
  const node = m.node
  switch (node.type) {
    case 'PathRef': {
      const raw = (node as any).path?.token?.value ?? ''
      const unquoted = raw.replace(/^["'`]|["'`]$/g, '')
      return `pathRef\t${unquoted}`
    }
    case 'Reference': {
      const raw = (node as any).raw ?? ''
      if (raw.includes('/')) {
        const parts = raw.split('/').filter(Boolean)
        const [root, ...rest] = parts
        return `rootRef ${root}\t${rest.join('/')}`
      }
      return `ref\t${raw}`
    }
    case 'Operation': {
      const op = (node as any).operator?.value ?? '?'
      const label = (node as any).operatorLabel?.value ?? ''
      return `op:${op}${label ? ':' + label : ''}`
    }
    default:
      return node.type
  }
}

if (formatArg === 'json') {
  const out = matches.map((m) => ({
    type: m.node.type,
    label: getMatchLabel(m),
    span: m.span,
    depth: m.depth,
  }))
  console.log(JSON.stringify(out, null, 2))
} else {
  for (const m of matches) {
    const label = getMatchLabel(m)
    const loc = `${m.span.startLine + 1}:${m.span.startCharacter + 1}-${m.span.endLine + 1}:${m.span.endCharacter + 1}`
    const raw = source.slice(m.span.startOffset, m.span.endOffset)
    console.log(`${label}\t${loc}\t${JSON.stringify(raw)}`)
  }
}

// ── Summary ──────────────────────────────────────────────────

if (showSummary) {
  const maxDepth = matches.reduce((max, m) => Math.max(max, m.depth), 0)
  const types = new Set(matches.map((m) => m.node.type))
  const byDepth = new Map<number, number>()
  for (const m of matches) {
    byDepth.set(m.depth, (byDepth.get(m.depth) ?? 0) + 1)
  }

  console.error('')
  console.error(`── summary ──────────────────────────────────`)
  console.error(`  selector:   ${selectorLabel}`)
  console.error(`  matches:    ${matches.length}`)
  console.error(`  max depth:  ${maxDepth}`)
  console.error(`  node types: ${[...types].join(', ')}`)
  console.error(`  by depth:   ${[...byDepth.entries()].map(([d, n]) => `${d}:${n}`).join('  ')}`)
}

