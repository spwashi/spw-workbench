/**
 * spw-register-census — which register stamps say something their bracket does not.
 *
 * Walks .spw surfaces and reads every `[reg=name]` stamp with seed's reader. A
 * stamp that names the shape its bracket already says (a facet after a brace,
 * a set after a square bracket) restates; any other informs. The census counts
 * both, lists the registers that inform, and names the surfaces that carry
 * them, so a writer can see which stamps a reader could learn from and which
 * could be dropped. It changes nothing.
 *
 * Usage: node --import tsx scripts/analyzers/spw-register-census.ts [root...] [--json] [--limit n]
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { REGISTER_STAMP_CONTRACT, readRegisterStamps, summarizeRegisterStamps, type RegisterStamp } from '@spwashi/spw-seed'

// Matches the language server's walk: build output, mounts and agent worktrees are copies, not surfaces.
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'dist-ssr', 'release', 'build', '.claude', '_workbench', 'gen'])

export interface RegisterCensus {
  contract: typeof REGISTER_STAMP_CONTRACT
  files: number
  stampedFiles: number
  total: number
  restating: number
  informing: number
  detached: number
  /** Informing registers, most used first. */
  informingNames: Array<{ name: string; count: number; files: number }>
  /** Surfaces with the most informing stamps. */
  informingFiles: Array<{ file: string; count: number; names: string[] }>
  /** Characters the restating stamps occupy. */
  restatingCharacters: number
}

export function censusOf(surfaces: ReadonlyArray<{ file: string; source: string }>): RegisterCensus {
  const all: RegisterStamp[] = []
  const filesByName = new Map<string, Set<string>>()
  const informingFiles: RegisterCensus['informingFiles'] = []
  let stampedFiles = 0
  let restatingCharacters = 0
  for (const { file, source } of surfaces) {
    const stamps = readRegisterStamps(source)
    if (!stamps.length) continue
    stampedFiles++
    all.push(...stamps)
    const informing = stamps.filter(stamp => !stamp.restates)
    for (const stamp of stamps) if (stamp.restates) restatingCharacters += stamp.end - stamp.start
    for (const stamp of informing) {
      const files = filesByName.get(stamp.name) ?? new Set<string>()
      files.add(file)
      filesByName.set(stamp.name, files)
    }
    if (informing.length) {
      informingFiles.push({ file, count: informing.length, names: [...new Set(informing.map(stamp => stamp.name))].sort() })
    }
  }
  const summary = summarizeRegisterStamps(all)
  return {
    contract: REGISTER_STAMP_CONTRACT,
    files: surfaces.length,
    stampedFiles,
    total: summary.total,
    restating: summary.restating,
    informing: summary.informing,
    detached: summary.detached,
    informingNames: Object.entries(summary.informingNames)
      .map(([name, count]) => ({ name, count, files: filesByName.get(name)?.size ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    informingFiles: informingFiles.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file)),
    restatingCharacters,
  }
}

export function renderCensus(census: RegisterCensus, limit = 12): string {
  const share = census.total ? Math.round((100 * census.restating) / census.total) : 0
  const out = [
    `${census.files} surfaces, ${census.stampedFiles} with stamps`,
    `${census.total} stamps: ${census.restating} restate their bracket (${share}%, ${census.restatingCharacters} characters), ${census.informing} inform${census.detached ? `, ${census.detached} of those follow no bracket` : ''}`,
  ]
  if (census.informingNames.length) {
    out.push('', 'registers that inform:')
    for (const row of census.informingNames.slice(0, limit)) out.push(`  ${row.name.padEnd(16)} ${String(row.count).padStart(5)}  in ${row.files} surface${row.files === 1 ? '' : 's'}`)
    if (census.informingNames.length > limit) out.push(`  … ${census.informingNames.length - limit} more`)
    out.push('', 'surfaces that carry them:')
    for (const row of census.informingFiles.slice(0, limit)) out.push(`  ${String(row.count).padStart(4)}  ${row.file}  (${row.names.join(', ')})`)
  }
  return out.join('\n')
}

async function collect(target: string): Promise<string[]> {
  let stat
  try {
    stat = await fs.stat(target)
  } catch {
    return []
  }
  if (stat.isFile()) return target.endsWith('.spw') ? [target] : []
  const files: string[] = []
  for (const entry of await fs.readdir(target, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue
    files.push(...await collect(path.join(target, entry.name)))
  }
  return files
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const limitAt = args.indexOf('--limit')
  const limit = limitAt >= 0 ? Number(args[limitAt + 1]) || 12 : 12
  const roots = args.filter((arg, index) => !arg.startsWith('--') && (limitAt < 0 || index !== limitAt + 1))
  const files = (await Promise.all((roots.length ? roots : ['.']).map(collect))).flat().sort()
  const surfaces = await Promise.all(files.map(async file => ({ file: path.relative(process.cwd(), file), source: await fs.readFile(file, 'utf8') })))
  const census = censusOf(surfaces)
  console.log(args.includes('--json') ? JSON.stringify(census, null, 2) : renderCensus(census, limit))
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
