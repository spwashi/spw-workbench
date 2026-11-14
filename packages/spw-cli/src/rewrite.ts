/**
 * spw rewrite — replace every place a form is written with a template, given by example.
 *
 *   spw rewrite <paths> --match '~garden[_]{_, ...}' --into '~garden[_1]{_2; _3}'
 *
 * The example is read as spw form --match reads it (seed experimental/columns/shape-match):
 * _ for any one subtree, ... for further siblings, _ alone inside a word for any
 * text there. In the template, _1, _2, … are the text that filled each hole, in
 * the example's order, and _0 is the whole match. Nothing is written without
 * --write; without it each change is shown as the line before and after.
 *
 * Before a file is written it is parsed again, and a rewrite that leaves the file
 * reading worse than it did (no longer complete, or fallen back to prose) is
 * refused for that file unless --force: the parser's verdict is the edit's
 * consequence, checked before it lands rather than found later.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { compileShape, findShape, isShapePattern, parse, type ShapeHit, type ShapeSurface } from '@spwashi/spw-seed'
import { ColumnsCache } from './columns-cache'
import { formatJsonEnvelope } from './envelope'
import { collectSpwFiles } from './fs-walk'
import { printHelpPage } from './help'
import { meta } from './view'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace } from './workspace'

export function printRewriteHelp(): void {
  printHelpPage({
    title: 'Spw Rewrite — replace a form, given by example, with a template',
    usage: [
      "spw rewrite <paths> --match '<example>' --into '<template>' [--write] [--force] [--nested] [--json]",
      "spw rewrite .agents/plans --match 'next: _' --into 'next: _1 # reviewed'",
    ],
    sections: [
      {
        title: 'Flags',
        lines: [
          "--match '<example>'    The form to find: _ any one subtree, ... any further siblings, lens(_) any text inside a word",
          "--into '<template>'    What to write instead: _1, _2, … what filled each hole, _0 the whole match",
          '--write                Write the files; without it every change is shown and nothing is written',
          '--force                With --write, write a file even when it would read worse than before',
          '--nested               Rewrite matches inside another match too (outermost only by default)',
          '--limit N              Changes shown (default 40)',
          '--json                 Every change and every file\'s verdict as JSON',
        ],
      },
      {
        title: 'Notes',
        lines: [
          'Each changed file is parsed again before it is written; one that would no longer read complete, or would fall back to prose, is refused unless --force.',
          'Matches are rewritten latest first, so earlier offsets stay true; nested matches are skipped unless --nested, which may overlap.',
          'Experimental: the example and the template are spw.shape-match/1.',
        ],
      },
    ],
  })
}

/** The template with _0 as the whole match and _k as the k-th filler. Returns the text and any _k with no hole. */
export function fillTemplate(template: string, hit: Pick<ShapeHit, 'fillers'>, whole: string): { text: string; missing: number[] } {
  const missing: number[] = []
  const text = template.replace(/(?<![A-Za-z0-9_])_(\d+)(?![A-Za-z0-9_])/g, (_m, digits: string) => {
    const k = Number(digits)
    if (k === 0) return whole
    const filler = hit.fillers[k - 1]
    if (filler === undefined) {
      missing.push(k)
      return `_${k}`
    }
    return filler
  })
  return { text, missing }
}

interface Verdict {
  success: boolean
  complete: boolean
  prose: boolean
}

const verdictOf = (text: string, uri: string): Verdict => {
  const r = parse(text, { path: uri })
  return { success: r.success, complete: Boolean(r.completeness?.complete), prose: Boolean(r.completeness?.proseFallback) }
}

const worse = (before: Verdict, after: Verdict): boolean =>
  (before.success && !after.success) || (before.complete && !after.complete) || (!before.prose && after.prose)

const firstLine = (text: string): string => text.split('\n')[0]!.trim()
const cut = (text: string, width = 100): string => (text.length > width ? `${text.slice(0, width - 1)}…` : text)

export async function runSpwRewriteCli(args: string[]): Promise<void> {
  const paths: string[] = []
  let example: string | undefined
  let template: string | undefined
  let write = false
  let force = false
  let nested = false
  let json = false
  let limit = 40
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (a === '--match') example = args[++i]
    else if (a === '--into') template = args[++i]
    else if (a === '--write') write = true
    else if (a === '--force') force = true
    else if (a === '--nested') nested = true
    else if (a === '--json') json = true
    else if (a === '--limit') limit = Math.max(0, Number(args[++i] ?? 40) || 0)
    else if (a.startsWith('-')) throw new Error(`spw rewrite: unknown flag ${a}`)
    else paths.push(a)
  }
  if (example === undefined || template === undefined) throw new Error("spw rewrite: --match '<example>' and --into '<template>' are both required")
  const pattern = compileShape(example)
  if (!isShapePattern(pattern)) throw new Error(`spw rewrite: the example cannot be matched (${pattern.problem})`)

  const workspace = await tryDiscoverSpwWorkspace()
  const files: string[] = []
  for (const p of paths.length ? paths : ['.']) {
    // A declared root (@docs) is resolved by the workspace; a path is taken as written.
    const abs = workspace && p.startsWith('@') ? await resolveWorkspacePath(workspace, p) : path.resolve(p)
    files.push(...(await collectSpwFiles(abs)))
  }
  const cache = new ColumnsCache({ dir: workspace ? path.join(workspace.consumerRoot, '.spw', 'gen', 'session', 'columns') : null })
  const surfaces: Array<ShapeSurface & { abs: string }> = []
  for (const abs of [...new Set(files)].sort()) {
    const text = await fs.readFile(abs, 'utf8')
    surfaces.push({ abs, uri: path.relative(process.cwd(), abs) || abs, text, tree: (await cache.get(text)).tree })
  }

  const hits = findShape(pattern, surfaces, { outermost: !nested })
  const byFile = new Map<string, ShapeHit[]>()
  for (const hit of hits) byFile.set(hit.uri, [...(byFile.get(hit.uri) ?? []), hit])

  const changes: Array<{ uri: string; line: number; column: number; before: string; after: string }> = []
  const files_: Array<{ uri: string; changes: number; verdict: 'written' | 'would_write' | 'refused' | 'unchanged'; before: Verdict; after: Verdict }> = []
  const missing = new Set<number>()
  for (const surface of surfaces) {
    const fileHits = byFile.get(surface.uri)
    if (!fileHits?.length) continue
    let text = surface.text
    for (const hit of [...fileHits].sort((a, b) => b.start - a.start)) {
      const whole = surface.text.slice(hit.start, hit.end)
      const filled = fillTemplate(template, hit, whole)
      filled.missing.forEach((k) => missing.add(k))
      text = text.slice(0, hit.start) + filled.text + text.slice(hit.end)
      changes.push({ uri: surface.uri, line: hit.line, column: hit.column, before: firstLine(whole), after: firstLine(filled.text) })
    }
    const before = verdictOf(surface.text, surface.uri)
    const after = verdictOf(text, surface.uri)
    const refused = worse(before, after) && !force
    let verdict: 'written' | 'would_write' | 'refused' | 'unchanged' = text === surface.text ? 'unchanged' : refused ? 'refused' : write ? 'written' : 'would_write'
    if (verdict === 'written') await fs.writeFile(surface.abs, text)
    files_.push({ uri: surface.uri, changes: fileHits.length, verdict, before, after })
  }
  changes.sort((a, b) => (a.uri < b.uri ? -1 : a.uri > b.uri ? 1 : a.line - b.line))

  if (json) {
    console.log(formatJsonEnvelope('rewrite', { changes, files: files_ }, { example, template, write, matches: hits.length, missing: [...missing], columns: cache.stats }))
    return
  }
  meta(`# spw rewrite ${JSON.stringify(example)} → ${JSON.stringify(template)}  matches=${hits.length} files=${files_.length}${write ? '' : '  (shown, not written: --write writes)'}`)
  for (const c of changes.slice(0, limit)) {
    console.log(`${c.uri}:${c.line}:${c.column}`)
    console.log(`  - ${cut(c.before)}`)
    console.log(`  + ${cut(c.after)}`)
  }
  if (changes.length > limit) console.log(`… ${changes.length - limit} more (--limit N, or --json for all)`)
  for (const f of files_.filter((f) => f.verdict === 'refused')) {
    console.log(`refused ${f.uri}: it would read worse (complete ${f.before.complete}→${f.after.complete}, prose ${f.before.prose}→${f.after.prose}); --force writes it anyway`)
  }
  if (missing.size) console.error(`spw rewrite: the template names ${[...missing].map((k) => `_${k}`).join(', ')}, which the example has no hole for; left as written`)
  const count = (v: string) => files_.filter((f) => f.verdict === v).length
  meta(`# ${write ? `${count('written')} written` : `${count('would_write')} would be written`}, ${count('refused')} refused; ${cache.describe()}`)
}
