#!/usr/bin/env tsx
/**
 * Spw Cut Gate
 *
 * Checks a dated reference cut (e.g. .spw/caches/2026-09-30/) against its
 * own contract: parse health, header axes drawn from the cut's closed
 * vocabularies, anchors that bind and stay unique, links that resolve to a
 * file and an anchor, lenses and depths from the declared sets, metric
 * handles that resolve to registry cells, probe ids that stay unique.
 *
 * The vocabularies live in `<cut>/vocabulary.spw` as single-line sets
 * (`name: #[ a, b, "two words" ]`); the gate reads them instead of
 * hard-coding values, the way plan-index reads PHASES.
 *
 * Usage:
 *   node --import tsx scripts/analyzers/spw-cut-gate.ts <cut-dir> [--json] [--emit] [--quiet]
 *
 * @see .spw/caches/2026-09-30/contract.spw — the rules this gate enforces
 * @see scripts/plans/plan-index.ts — controlled-vocabulary precedent
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { deixisTable, parse, particleBindings } from '@spwashi/spw-seed'
import { checkArcs, checkLegibility, checkReadings, checkVoice, type Add } from './spw-cut-voice'

type Level = 'fail' | 'warn'
interface Finding { level: Level; line: number; message: string }
interface FileReport { rel: string; findings: Finding[] }

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const REQUIRED_AXES = ['layer', 'domain', 'form', 'level', 'review', 'valence'] as const
const OPTIONAL_AXES = ['era', 'season'] as const
const REFLEXIVE_HANDLES = new Set([
  'file.lines', 'file.frame_count', 'file.annotation_density', 'file.brace_depth_max',
  'form.deep_lines', 'form.brace_frame', 'form.brace_body', 'op.distribution',
  'graph.in_degree', 'graph.out_degree', 'graph.path_refs',
  'particle.deixis', 'particle.case', 'particle.mood', 'particle.aspect',
  'probe.wonder_count', 'probe.metric_sites',
])
/** Each ban names the view it reads: `code` blanks strings and comments; `strings` keeps strings; `slash` keeps `//` comments. */
const BANNED: Array<[RegExp, string, 'code' | 'strings' | 'slash']> = [
  [/\^"dispatch"|\^\["dispatch"\]/, 'dispatch tables duplicate roots and mint fake graph hubs; use ^["tree"]', 'strings'],
  [/#:cache\b/, '#:cache is not a canon axis; use #:form/#:domain', 'code'],
  [/~#protocol:\s*"cache\.layer\/1"/, 'cache.layer/1 names editor cache planes; this cut is not a cache', 'strings'],
  [/\/\/\s*lens:/, 'write ~#lens(...) instead of // lens:', 'slash'],
  [/~<\s*"|~<[A-Za-z_][\w-]*>\s*"/, 'tagged/quoted ~< > path forms are not PathRefs; use ~"path#anchor"', 'code'],
  [/\[reg=facet\]/, '.{} already produces a facet; drop [reg=facet]', 'code'],
  [/:\s*\$%\[/, '$% inside a binding leaves the value as bare $; use reads: %[...]', 'code'],
  [/~#[A-Za-z_][\w-]*:\s+(~"|@|#[A-Za-z_\[])/, 'spaced ~#k: ref/tag detaches its value; use a plain key: binding', 'code'],
  [/:\s*#[A-Za-z_][\w-]*\s+[A-Za-z_][\w-]*\s*:/, 'a #tag value followed by another key on one line nests that key; separate with a comma', 'code'],
]

// ── helpers ────────────────────────────────────────────────────────────

function listSpw(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...listSpw(full))
    else if (entry.endsWith('.spw') && !entry.endsWith('.expanded.spw')) out.push(full)
  }
  return out.sort()
}

/**
 * Blank out string literals and comments so regex checks see code only.
 * Length-preserving: offsets into the result line up with the source.
 */
function codeOnly(src: string, keep: { strings?: boolean; slash?: boolean } = {}): string {
  return src.split('\n').map((line) => {
    if (/^\s*#(\s|$)/.test(line)) return ' '.repeat(line.length)
    let out = ''
    let quote: string | null = null
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (quote) {
        if (ch === '\\' && i + 1 < line.length) { i++; out += '  '; continue }
        if (ch === quote) { quote = null; out += ch; continue }
        out += keep.strings ? ch : ' '
        continue
      }
      if (ch === '"') { quote = ch; out += ch; continue }
      if (ch === '/' && line[i + 1] === '/') { out += keep.slash ? line.slice(i) : ' '.repeat(line.length - i); break }
      out += ch
    }
    return out
  }).join('\n')
}

/** Text of a named frame's body (^"name"{…} or ^["name"]{…}), brace-matched on code-only text. */
function frameBody(code: string, raw: string, name: string): { text: string; line: number } | null {
  const re = new RegExp(`\\^\\[?"${name}"\\]?\\s*\\{`)
  const m = re.exec(raw)
  if (!m) return null
  let depth = 0
  for (let i = m.index + m[0].length - 1; i < code.length; i++) {
    if (code[i] === '{') depth++
    else if (code[i] === '}') { depth--; if (depth === 0) return { text: raw.slice(m.index + m[0].length, i), line: raw.slice(0, m.index).split('\n').length } }
  }
  return null
}

/** [start, end) of the innermost {…} body containing index, on code-only text. */
function enclosingBody(code: string, index: number): [number, number] | null {
  let depth = 0
  let start = -1
  for (let i = index; i >= 0; i--) {
    if (code[i] === '}') depth++
    else if (code[i] === '{') { if (depth === 0) { start = i + 1; break } depth-- }
  }
  if (start < 0) return null
  depth = 0
  for (let i = start; i < code.length; i++) {
    if (code[i] === '{') depth++
    else if (code[i] === '}') { if (depth === 0) return [start, i]; depth-- }
  }
  return null
}

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split('\n').length
}

function walk(node: any, visit: (n: any) => void): void {
  if (!node || typeof node !== 'object') return
  if (typeof node.type === 'string' && node.span) visit(node)
  for (const [key, value] of Object.entries(node)) {
    if (key === 'span' || key === 'token') continue
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit))
    else if (value && typeof value === 'object') walk(value, visit)
  }
}

function normalizeLens(body: string): string {
  return body.trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ')
}

// ── vocabulary ─────────────────────────────────────────────────────────

function readVocabulary(cut: string): Map<string, Set<string>> {
  const file = path.join(cut, 'vocabulary.spw')
  const vocab = new Map<string, Set<string>>()
  if (!existsSync(file)) return vocab
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([a-z_]+):\s*#\[(.*)\]\s*$/.exec(line)
    if (!m) continue
    const items = m[2].split(/[,;]/).map((s) => s.trim().replace(/^"|"$/g, '').trim()).filter(Boolean)
    vocab.set(m[1], new Set(m[1] === 'lens' ? items.map(normalizeLens) : items))
  }
  return vocab
}

// ── gate ───────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2)
  const cutArg = args.find((a) => !a.startsWith('--'))
  if (!cutArg) { console.error('usage: spw-cut-gate.ts <cut-dir> [--json] [--emit] [--quiet]'); process.exit(2) }
  const cut = path.resolve(cutArg)
  if (!existsSync(cut)) {
    console.error(`spw-cut-gate: cut directory does not exist: ${cutArg}`)
    process.exit(2)
  }
  const json = args.includes('--json')
  const runEmit = args.includes('--emit')
  const quiet = args.includes('--quiet')

  const vocab = readVocabulary(cut)
  const files = listSpw(cut)
  const reports = new Map<string, FileReport>()
  const add = (file: string, level: Level, line: number, message: string) => {
    const rel = path.relative(cut, file)
    if (!reports.has(file)) reports.set(file, { rel, findings: [] })
    reports.get(file)!.findings.push({ level, line, message })
  }
  const inVocab = (key: string, value: string) => !vocab.has(key) || vocab.get(key)!.has(value)

  // Pass 1: parse, collect anchors, registry cells, probe ids, concept tags.
  const parsed = new Map<string, { src: string; code: string; ast: any; anchors: Set<string> }>()
  const anchorHome = new Map<string, string>()
  const registryCells = new Map<string, string>()
  const probeIds = new Map<string, string>()
  const conceptUse = new Map<string, Set<string>>()

  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    const code = codeOnly(src)
    const out = parse(src)
    for (const e of out.errors as any[]) add(file, 'fail', e.position?.line ?? 0, `parse error: ${e.data?.message ?? 'unknown'}`)
    for (const w of out.warnings as any[]) add(file, 'fail', w.position?.line ?? 0, `parse warning: ${w.data?.message ?? 'unknown'}`)
    if (out.completeness?.proseFallback) add(file, 'fail', 0, 'surface degraded to prose')
    const anchors = new Set<string>()
    if (out.ast) {
      for (const b of particleBindings(out.ast) as any[]) {
        if (b.particle.aim !== '>') continue
        const name = b.particle.name.value
        const line = b.particle.span?.start?.line ?? 0
        if (!b.bound) add(file, 'fail', line, `anchor #>${name} binds nothing (inside a set/facet, or trailing)`)
        if (anchorHome.has(name) && anchorHome.get(name) !== file) add(file, 'fail', line, `anchor #>${name} duplicates ${path.relative(cut, anchorHome.get(name)!)}`)
        else anchorHome.set(name, file)
        anchors.add(name)
      }
      // an anchor inside #[ ] never reaches particleBindings; find it in the text instead
      for (const m of code.matchAll(/#>([A-Za-z_][\w-]*)/g)) {
        if (!anchors.has(m[1])) add(file, 'fail', lineOf(src, m.index!), `anchor #>${m[1]} does not bind (inside a set or facet); put it before a frame or binding`)
      }
      walk(out.ast, (n) => {
        if (n.type === 'Capsule' && n.placement === 'medial' && n.right && n.right.span.start.line !== n.open?.span?.start?.line) {
          add(file, 'fail', n.open.span.start.line, 'medial capsule swallows the next line')
        }
        if (n.type === 'Binding' && n.value && n.key?.span && n.value.span.start.line > n.key.span.end.line && n.value.terms?.[0]?.type !== 'ProseChunk') {
          add(file, 'fail', n.key.span.start.line, 'binding value starts on a later line (empty value swallows the next line)')
        }
      })
    }
    if (file.includes(`${path.sep}registries${path.sep}quantities${path.sep}`)) {
      for (const m of code.matchAll(/%([a-z][a-z0-9_]*\.[a-z0-9_.]+)\s*\{/g)) {
        const handle = m[1]
        if (registryCells.has(handle)) add(file, 'fail', lineOf(src, m.index!), `handle ${handle} already defined in ${path.relative(cut, registryCells.get(handle)!)}`)
        else registryCells.set(handle, file)
      }
    }
    for (const m of code.matchAll(/=id\[([A-Za-z0-9_-]+)\]/g)) {
      if (probeIds.has(m[1]) && probeIds.get(m[1]) !== file) add(file, 'fail', lineOf(src, m.index!), `probe id ${m[1]} duplicates ${path.relative(cut, probeIds.get(m[1])!)}`)
      else probeIds.set(m[1], file)
    }
    const concepts = frameBody(code, src, 'concepts')
    if (concepts) for (const m of concepts.text.matchAll(/(?<![\w~])#([a-z][a-z0-9_]*)/g)) {
      if (!conceptUse.has(m[1])) conceptUse.set(m[1], new Set())
      conceptUse.get(m[1])!.add(file)
    }
    parsed.set(file, { src, code, ast: out.ast, anchors })
  }

  // Pass 2: per-file contract checks.
  const anchorCache = new Map<string, Set<string>>()
  const anchorsOf = (target: string): Set<string> => {
    if (parsed.has(target)) return parsed.get(target)!.anchors
    if (!anchorCache.has(target)) {
      const out = parse(readFileSync(target, 'utf8'))
      anchorCache.set(target, out.ast ? new Set(deixisTable(out.ast).keys()) : new Set())
    }
    return anchorCache.get(target)!
  }

  for (const file of files) {
    const { src, code, ast } = parsed.get(file)!
    const lines = src.split('\n')
    const isRegistry = file.includes(`${path.sep}registries${path.sep}`)
    const isIndex = path.basename(file) === 'index.spw'
    const isProvenanceDir = file.includes(`${path.sep}provenance${path.sep}`)

    // size and nesting
    if (lines.length > 600) add(file, 'fail', 0, `${lines.length} lines exceeds the 600-line craft guard`)
    else if (lines.length > 320) add(file, 'warn', 0, `${lines.length} lines; consider splitting`)
    let depth = 0, maxDepth = 0
    for (const ch of code) { if (ch === '{') maxDepth = Math.max(maxDepth, ++depth); else if (ch === '}') depth-- }
    if (maxDepth > 7) add(file, 'warn', 0, `brace depth ${maxDepth} exceeds 7`)

    // banned forms, each read through its own view
    const views = { code: code.split('\n'), strings: codeOnly(src, { strings: true }).split('\n'), slash: codeOnly(src, { slash: true }).split('\n') }
    for (const [re, why, view] of BANNED) views[view].forEach((line, i) => { if (re.test(line)) add(file, 'fail', i + 1, why) })

    // legibility, voice, readings, and arcs (spw-cut-voice.ts)
    const here: Add = (level, line, message) => add(file, level, line, message)
    checkLegibility(src, code, here)
    if (!isRegistry && !isProvenanceDir) checkVoice(src, code, here)
    if (ast) checkReadings(ast, here, vocab.get('reading'), walk)
    if (!isRegistry) checkArcs(code, src, here, vocab.get('clock'))
    lines.forEach((line, i) => {
      if (/^\s*#\s.*'/.test(line)) add(file, 'warn', i + 1, 'apostrophe in a # comment line blanks VS Code decorations (B9)')
    })

    // header: first code line is an anchor; axes before the first frame
    const firstCode = lines.findIndex((l) => l.trim() && !/^\s*#(\s|$)/.test(l))
    if (firstCode < 0 || !/^\s*#>[A-Za-z_]/.test(lines[firstCode])) add(file, 'fail', firstCode + 1, 'surface must open with a #> anchor after the title comment')
    const headerEnd = lines.findIndex((l, i) => i > firstCode && /^\s*[\^?!*&%=@.$~]/.test(l.trim()) && !/^\s*~#/.test(l))
    const header = lines.slice(Math.max(firstCode, 0), headerEnd < 0 ? lines.length : headerEnd)
    const axes = new Map<string, string>()
    for (const l of header) for (const m of l.matchAll(/#:([a-z_]+)\s+#!([A-Za-z0-9_-]+)/g)) axes.set(m[1], m[2])
    for (const axis of REQUIRED_AXES) {
      if (!axes.has(axis)) add(file, 'fail', firstCode + 1, `header missing #:${axis}`)
      else if (!inVocab(axis, axes.get(axis)!)) add(file, 'fail', firstCode + 1, `#:${axis} #!${axes.get(axis)} is not in vocabulary.spw`)
    }
    for (const axis of OPTIONAL_AXES) if (axes.has(axis) && !inVocab(axis, axes.get(axis)!)) add(file, 'fail', firstCode + 1, `#:${axis} #!${axes.get(axis)} is not in vocabulary.spw`)
    for (const axis of axes.keys()) if (![...REQUIRED_AXES, ...OPTIONAL_AXES].includes(axis as any)) add(file, 'warn', firstCode + 1, `header axis #:${axis} is not a declared axis`)

    // required frames
    if (!/\^"provenance"\s*\{|\^\["provenance"\]\s*\{/.test(src)) add(file, 'fail', 0, 'missing ^"provenance" frame')
    if (!isRegistry && !isProvenanceDir && !/\^"emit"\s*\{/.test(src)) add(file, 'fail', 0, 'missing ^"emit" publishing card')
    if (isIndex && !/\^\["tree"\]\s*\{/.test(src)) add(file, 'fail', 0, 'index missing ^["tree"] routing')

    // edges: relation keys from the vocabulary
    const edges = frameBody(code, src, 'edges')
    if (edges) for (const m of edges.text.matchAll(/^\s*([a-z_]+):/gm)) {
      if (!inVocab('relation', m[1])) add(file, 'fail', edges.line, `edge relation ${m[1]} is not in vocabulary.spw`)
    }

    // particles: depth, claim values
    for (const m of code.matchAll(/#:depth\s+#!([A-Za-z0-9_-]+)/g)) if (!inVocab('depth', m[1])) add(file, 'fail', lineOf(src, m.index!), `#:depth #!${m[1]} is not in vocabulary.spw`)
    for (const m of code.matchAll(/#:claim\s+#!([A-Za-z0-9_-]+)/g)) if (!inVocab('claim', m[1])) add(file, 'fail', lineOf(src, m.index!), `#:claim #!${m[1]} is not in vocabulary.spw`)
    for (const m of code.matchAll(/=kind\[([A-Za-z0-9_-]+)\]/g)) if (!inVocab('probe_kind', m[1])) add(file, 'fail', lineOf(src, m.index!), `probe kind ${m[1]} is not in vocabulary.spw`)

    // inspection receipts: event, care, and outcome come from the vocabulary
    for (const [key, vocabKey] of [['event', 'event'], ['care', 'care'], ['outcome', 'outcome']] as const) {
      for (const m of code.matchAll(new RegExp(`\\b${key}:\\s*#([A-Za-z0-9_-]+)`, 'g'))) {
        if (!inVocab(vocabKey, m[1])) add(file, 'fail', lineOf(src, m.index!), `${key} #${m[1]} is not in vocabulary.spw`)
      }
    }

    // ethics: a factual claim names its source inside its own frame
    const sourcedSurface = ['sourced', 'adversarial_checked', 'expert_reviewed'].includes(axes.get('review') ?? '')
    for (const m of code.matchAll(/#:claim\s+#!([A-Za-z0-9_-]+)/g)) {
      if (['speculative', 'interpretive'].includes(m[1])) continue
      const span = enclosingBody(code, m.index!)
      if (span && !/\bsources?:/.test(src.slice(span[0], span[1]))) {
        add(file, sourcedSurface ? 'fail' : 'warn', lineOf(src, m.index!), `#:claim #!${m[1]} has no source: link in its frame`)
      }
    }
    // ethics: provenance discloses how the surface was made
    const provenance = frameBody(code, src, 'provenance')
    if (provenance) for (const key of ['as_of', 'generator', 'lineage']) {
      if (!new RegExp(`^\\s*${key}:`, 'm').test(provenance.text)) add(file, 'fail', provenance.line, `^"provenance" missing ${key}:`)
    }

    // AST walk: lenses and links
    if (ast) walk(ast, (n) => {
      const line = n.span?.start?.line ?? 0
      if (n.type === 'Annotation' && n.apposition && n.name?.value === 'lens') {
        const lens = normalizeLens(n.apposition.body ?? '')
        if (!inVocab('lens', lens)) add(file, 'fail', line, `~#lens(${lens}) is not in vocabulary.spw`)
      }
      if (n.type === 'PathRef') {
        const raw: string = String(n.path?.token?.value ?? '').replace(/^"|"$/g, '')
        const hash = raw.indexOf('#')
        const rel = hash >= 0 ? raw.slice(0, hash) : raw
        const frag = hash >= 0 ? raw.slice(hash + 1) : ''
        if (!rel) { add(file, 'fail', line, `malformed ref ~"${raw}" (write the file name even for same-file links)`); return }
        const candidates = [path.resolve(path.dirname(file), rel), path.resolve(REPO, rel)]
        const target = candidates.find((c) => existsSync(c))
        if (!target) { add(file, 'fail', line, `unresolved ref ~"${raw}"`); return }
        if (frag && target.endsWith('.spw') && !anchorsOf(target).has(frag)) add(file, 'fail', line, `ref ~"${raw}": no #>${frag} in target`)
        if (frag && !target.endsWith('.spw')) add(file, 'warn', line, `fragment on non-.spw target ~"${raw}" lands at file top`)
        if (!isIndex && path.basename(target) === 'index.spw' && path.dirname(file).startsWith(path.dirname(target))) {
          add(file, 'fail', line, `up-link to ${path.relative(cut, target)}; children never link to their parents`)
        }
      }
    })

    // metric handles
    for (const m of code.matchAll(/(\$?)%\[([^\]]+)\]/g)) {
      const handles = m[2].split(',').map((h) => h.trim()).filter(Boolean)
      if (m[1] === '$' && handles.length > 3) add(file, 'fail', lineOf(src, m.index!), `$%[...] carries ${handles.length} handles; at most 3`)
      for (const h of handles) {
        if (!/^[a-z][a-z0-9_]*\.[a-z0-9_.]+$/.test(h)) { add(file, 'fail', lineOf(src, m.index!), `handle ${h} is not namespace.quantity`); continue }
        if (!REFLEXIVE_HANDLES.has(h) && !registryCells.has(h)) add(file, 'fail', lineOf(src, m.index!), `handle ${h} resolves to no registry cell`)
      }
    }

    // optional emit gate
    if (runEmit && !isRegistry && !isProvenanceDir) {
      const res = spawnSync('node', ['--import', 'tsx', 'packages/spw-cli/src/main.ts', 'emit', 'pack', file, '--host', 'brief', '--strict-continuity', '--strict-positive'], { cwd: REPO, encoding: 'utf8' })
      if (res.status !== 0) add(file, 'fail', 0, `emit brief gate: ${(res.stderr || res.stdout).trim().split('\n').slice(-2).join(' | ')}`)
    }
  }

  // corpus-level: concept tags that never recur
  const singletons = [...conceptUse.entries()].filter(([, set]) => set.size < 2).map(([tag]) => tag)

  const all = [...reports.values()].sort((a, b) => a.rel.localeCompare(b.rel))
  const failFiles = all.filter((r) => r.findings.some((f) => f.level === 'fail'))
  const summary = {
    cut: path.relative(REPO, cut), files: files.length, failing: failFiles.length,
    warnings: all.reduce((n, r) => n + r.findings.filter((f) => f.level === 'warn').length, 0),
    anchors: anchorHome.size, registry_cells: registryCells.size, probes: probeIds.size,
    concept_tags: conceptUse.size, concept_singletons: singletons.length,
    vocabularies: [...vocab.keys()],
  }
  if (json) {
    console.log(JSON.stringify({ summary, singletons, reports: all }, null, 2))
  } else {
    if (!quiet) for (const r of all) for (const f of r.findings) console.log(`${f.level === 'fail' ? '✗' : '⚠'} ${r.rel}:${f.line} ${f.message}`)
    console.log(`\n${summary.failing === 0 ? '✓' : '✗'} ${summary.cut}: ${summary.files} files, ${summary.failing} failing, ${summary.warnings} warnings · anchors ${summary.anchors} · cells ${summary.registry_cells} · probes ${summary.probes} · concept tags ${summary.concept_tags} (${summary.concept_singletons} singletons)`)
  }
  process.exit(summary.failing === 0 ? 0 : 1)
}

main()
