/**
 * spw-particle-census — the corpus's particle physics, measured.
 *
 * Sweeps every authored .spw surface and reports:
 *   - the aim mix per top-level tree (dialect signatures: deixis = navigability,
 *     case = queryability, mood = assertion richness, aspect = volatility)
 *   - duplicate anchors (same deixis name in multiple files — ambiguous targets
 *     for ~"file#anchor" resolution and reverse indexing)
 *   - unbound anchors (deixis with nothing to point at — dangling bookmarks)
 *   - noise candidates: boundary-less `#` operations that are NOT recognized
 *     particles — the underspecified-mark class that feeds lint diagnostics
 *     and mutation profiles.
 *
 * Usage: node --import tsx scripts/analyzers/spw-particle-census.ts [root...] [--json]
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { isDerivedSurface, parse, particleBindings } from '@spwashi/spw-seed'

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'dist-ssr', 'release', '.agents'])

interface Mix { deixis: number; case: number; mood: number; aspect: number }

interface Census {
  files: number
  totals: Mix
  trees: Record<string, Mix>
  duplicateAnchors: Array<{ name: string; files: string[] }>
  unboundAnchors: Array<{ name: string; file: string; line: number }>
  noiseMarks: Array<{ file: string; line: number; text: string }>
}

async function collect(dir: string): Promise<string[]> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const files: string[] = []
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await collect(full))
    else if (entry.isFile() && entry.name.endsWith('.spw') && !isDerivedSurface(entry.name)) files.push(full)
  }
  return files
}

function emptyMix(): Mix {
  return { deixis: 0, case: 0, mood: 0, aspect: 0 }
}

/** Boundary-less `#` Operations that are not particles — the noise class. */
function noiseOf(root: unknown, source: string, file: string, out: Census['noiseMarks']): void {
  const stack: unknown[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (Array.isArray(node)) { stack.push(...node); continue }
    if (!node || typeof node !== 'object') continue
    const typed = node as Record<string, unknown> & { type?: string; span?: { start: { offset: number; line: number } } }
    if (
      typed.type === 'Operation' &&
      (typed.operator as { value?: string } | undefined)?.value === '#' &&
      !typed.frame && !typed.body && !typed.subject && !typed.linePayload
    ) {
      const start = typed.span?.start
      if (start) {
        const text = source.slice(start.offset, start.offset + 24).split('\n')[0]!
        out.push({ file, line: start.line, text })
      }
    }
    for (const key of Object.keys(typed)) {
      if (key === 'span' || key === 'token') continue
      stack.push(typed[key])
    }
  }
}

async function census(roots: string[]): Promise<Census> {
  const files = (await Promise.all(roots.map(collect))).flat().sort()
  const totals = emptyMix()
  const trees: Record<string, Mix> = {}
  const anchorFiles = new Map<string, Set<string>>()
  const unboundAnchors: Census['unboundAnchors'] = []
  const noiseMarks: Census['noiseMarks'] = []

  for (const file of files) {
    const rel = path.relative(process.cwd(), file)
    const tree = rel.split(path.sep)[0] ?? '.'
    const mix = (trees[tree] ??= emptyMix())
    const source = await fs.readFile(file, 'utf8')
    mix.aspect += (source.match(/~#[A-Za-z_]/g) ?? []).length

    const result = parse(source)
    if (!result.ast) continue

    for (const binding of particleBindings(result.ast)) {
      const { aim } = binding.particle
      const name = binding.particle.name.value
      if (aim === '>') {
        mix.deixis += 1
        ;(anchorFiles.get(name) ?? anchorFiles.set(name, new Set()).get(name)!).add(rel)
        if (!binding.bound) {
          unboundAnchors.push({ name, file: rel, line: binding.particle.span.start.line })
        }
      } else if (aim === ':') mix.case += 1
      else mix.mood += 1
    }
    noiseOf(result.ast, source, rel, noiseMarks)
  }

  for (const mix of Object.values(trees)) {
    totals.deixis += mix.deixis
    totals.case += mix.case
    totals.mood += mix.mood
    totals.aspect += mix.aspect
  }

  const duplicateAnchors = [...anchorFiles.entries()]
    .filter(([, set]) => set.size > 1)
    .map(([name, set]) => ({ name, files: [...set] }))
    .sort((a, b) => b.files.length - a.files.length)

  return { files: files.length, totals, trees, duplicateAnchors, unboundAnchors, noiseMarks }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== '--')
  const json = args.includes('--json')
  const roots = args.filter((a) => !a.startsWith('--'))
  const report = await census(roots.length > 0 ? roots : ['.'])

  if (json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  const sig = (m: Mix) => `deixis=${m.deixis} case=${m.case} mood=${m.mood} aspect=${m.aspect}`
  console.log(`particle census: files=${report.files}  ${sig(report.totals)}`)
  console.log('\ndialect signatures by tree:')
  for (const [tree, mix] of Object.entries(report.trees).sort()) {
    if (mix.deixis + mix.case + mix.mood + mix.aspect === 0) continue
    console.log(`  ${tree.padEnd(12)} ${sig(mix)}`)
  }
  if (report.duplicateAnchors.length > 0) {
    console.log(`\nduplicate anchors (${report.duplicateAnchors.length}):`)
    for (const dup of report.duplicateAnchors.slice(0, 10)) {
      console.log(`  ${dup.name} ×${dup.files.length}: ${dup.files.slice(0, 3).join(', ')}${dup.files.length > 3 ? ', …' : ''}`)
    }
  }
  if (report.unboundAnchors.length > 0) {
    console.log(`\nunbound anchors (${report.unboundAnchors.length}):`)
    for (const item of report.unboundAnchors.slice(0, 10)) {
      console.log(`  ${item.file}:${item.line}  #>${item.name}`)
    }
  }
  console.log(`\nnoise marks (boundary-less # ops, not particles): ${report.noiseMarks.length}`)
  for (const item of report.noiseMarks.slice(0, 10)) {
    console.log(`  ${item.file}:${item.line}  ${JSON.stringify(item.text)}`)
  }
}

await main()
