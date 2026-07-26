/**
 * notes-to-appositions — move inline `//` readings into a form the parser sees.
 *
 * A `//` note carries a reading no instrument can count. An apposition carries
 * the same reading as structure. The migration is only worth doing where the
 * apposition actually reaches the AST, so every rewrite is verified: the note is
 * applied on its own, the surface is reparsed, and the change is kept only if a
 * new apposition appears and no new diagnostic does.
 *
 * That gate matters more than it sounds. Most notes sit inside frames a demoter
 * has already collapsed to prose, and an apposition there would be exactly as
 * invisible as the comment it replaced. This script migrates what lands and
 * reports what is waiting on a parser fix, rather than converting the corpus
 * into a form that only looks better.
 *
 * Usage:
 *   node --import tsx scripts/migrations/notes-to-appositions.ts [root...] [--write] [--json]
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { parse, spwq } from '@spwashi/spw-seed'

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'dist-ssr', 'release', '.agents'])

interface Rewrite {
  /** Line as authored. */
  from: string
  /** Line with the note moved into an apposition. */
  to: string
}

/**
 * Rewrite a trailing note into an apposition, or null when this note is not one
 * of the templated forms.
 *
 * Whole-line notes are left alone on purpose: a note with no code beside it is
 * a region header, and a region wants a named frame rather than a label.
 */
export function rewriteNote(line: string): Rewrite | null {
  const marker = line.indexOf('//')
  if (marker < 0 || /https?:\/\//.test(line)) return null

  const before = line.slice(0, marker)
  const note = line.slice(marker + 2).trim()
  if (before.trim() === '') return null

  const head = before.replace(/\s+$/, '')

  // `// lens: curated collection` — a named reading that recurs, so it keeps its key.
  const lens = /^lens:\s*(.+)$/.exec(note)
  if (lens && !lens[1].includes(')') && !lens[1].includes('(')) {
    return { from: line, to: `${head} ~#lens(${lens[1].trim()})` }
  }

  // `// nearest neighbor` — the ref's role. Quote a bare angle path on the way
  // through: unquoted, it collapses the frame to prose and takes the marks with it.
  if (note === 'nearest neighbor') {
    const quoted = head.replace(/~<([^">\n]*[./][^">\n]*)>/g, '~<"$1">')
    return { from: line, to: `${quoted} ~#neighbor(nearest)` }
  }

  return null
}

function appositionCount(source: string): number {
  const output = parse(source)
  if (!output.ast) return -1
  return spwq(output.ast, { nodeType: 'Annotation' } as never)
    .filter((match) => (match.node as unknown as { apposition?: unknown }).apposition).length
}

function errorCount(source: string): number {
  return (parse(source).errors ?? []).length
}

interface FileResult {
  file: string
  migrated: number
  withheld: number
}

/**
 * Apply each candidate note one at a time, keeping only those that land.
 *
 * Per-note rather than per-file: a surface where one reading lands and two do
 * not should still gain the one.
 */
export function migrateSource(source: string): { next: string; migrated: number; withheld: number } {
  const baselineErrors = errorCount(source)
  let lines = source.split('\n')
  let migrated = 0
  let withheld = 0

  for (let i = 0; i < lines.length; i++) {
    const rewrite = rewriteNote(lines[i])
    if (!rewrite) continue

    const before = appositionCount(lines.join('\n'))
    const trial = [...lines]
    trial[i] = rewrite.to
    const trialSource = trial.join('\n')

    if (appositionCount(trialSource) === before + 1 && errorCount(trialSource) <= baselineErrors) {
      lines = trial
      migrated++
    } else {
      withheld++
    }
  }

  return { next: lines.join('\n'), migrated, withheld }
}

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && IGNORED_DIRS.has(entry.name)) continue
    if (IGNORED_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.name.endsWith('.spw')) yield full
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const json = args.includes('--json')
  const roots = args.filter((arg) => !arg.startsWith('--'))
  if (roots.length === 0) roots.push('.')

  const results: FileResult[] = []
  let totalMigrated = 0
  let totalWithheld = 0

  for (const root of roots) {
    for await (const file of walk(root)) {
      const source = await fs.readFile(file, 'utf8')
      if (!source.includes('//')) continue

      const { next, migrated, withheld } = migrateSource(source)
      if (migrated === 0 && withheld === 0) continue

      totalMigrated += migrated
      totalWithheld += withheld
      results.push({ file: path.relative('.', file), migrated, withheld })
      if (write && migrated > 0) await fs.writeFile(file, next)
    }
  }

  if (json) {
    console.log(JSON.stringify({ write, totalMigrated, totalWithheld, files: results }, null, 2))
    return
  }

  console.log(`\n# notes → appositions  ${write ? '(written)' : '(dry run)'}\n`)
  console.log(`  ${totalMigrated} readings migrated and verified in the AST`)
  console.log(`  ${totalWithheld} withheld — the apposition would not have landed\n`)

  const gained = results.filter((r) => r.migrated > 0).sort((a, b) => b.migrated - a.migrated)
  if (gained.length > 0) {
    console.log('migrated')
    for (const r of gained.slice(0, 25)) {
      console.log(`  ${String(r.migrated).padStart(3)}  ${r.file}${r.withheld ? `   (${r.withheld} withheld)` : ''}`)
    }
  }

  const blocked = results.filter((r) => r.migrated === 0)
  if (blocked.length > 0) {
    console.log(`\nwaiting on a parser fix: ${blocked.length} surfaces, ${blocked.reduce((n, r) => n + r.withheld, 0)} readings`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
