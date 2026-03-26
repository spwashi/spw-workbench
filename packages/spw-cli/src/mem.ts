import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createHash } from 'node:crypto'
import { parseCommonFlags } from './args'
import { printHelpPage } from './help'

interface DumpFileEntry {
  rel: string
  bytes: number
  mtimeMs: number
  sha256: string
}

interface MemoryDumpManifest {
  schema: 'spw.mem.dump.v1'
  createdAt: string
  label: string
  runtimeDir: string
  memoryModel: {
    lattice: string
    projection: string
    expansion: string
  }
  runtimeFiles: DumpFileEntry[]
  extraFiles: DumpFileEntry[]
}

interface CliArgs {
  command: 'dump' | 'load' | 'list' | 'help'
  from?: string
  out?: string
  runtimeDir?: string
  dumpRoot?: string
  label?: string
  wipe: boolean
  includeExtra: boolean
  restoreExtra: boolean
}

const EXTRA_MEMORY_FILES = [
  '.spw/biome/ocean/trace.spw',
  '.spw/harness/probes/archive-index.spw',
  '.spw/harness/runs/runs-index.spw',
]

export function printMemHelp(): void {
  printHelpPage({
    title: 'Spw Runtime Memory Utility',
    usage: [
      'node --import tsx scripts/spw-mem.ts dump [--label <name>] [--out <dir>] [--include-extra] [--runtime-dir <dir>] [--dump-root <dir>]',
      'node --import tsx scripts/spw-mem.ts load [--from <dir>] [--wipe] [--restore-extra] [--runtime-dir <dir>] [--dump-root <dir>]',
      'node --import tsx scripts/spw-mem.ts list [--dump-root <dir>]',
    ],
    sections: [
      {
        title: 'Commands',
        lines: [
          'dump           Snapshot .agents/state/runtime into a dump folder.',
          'load           Restore runtime memory from a dump folder.',
          'list           Show available dump snapshots.',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--from <dir>       Dump directory to load. If omitted, uses latest dump.',
          '--out <dir>        Output directory for dump. If omitted, uses runtime/dumps/<timestamp>.',
          '--runtime-dir <d>  Runtime memory root (default: .agents/state/runtime).',
          '--dump-root <dir>  Dump storage root (default: <runtime-dir>/dumps).',
          '--label <name>     Optional label appended to dump directory name.',
          '--wipe             Remove existing runtime files before restoring.',
          '--include-extra    Include trace/probe ledger files in dump payload.',
          '--restore-extra    Restore extra files recorded in dump payload.',
        ],
      },
    ],
  })
}

function parseArgs(argv: string[]): CliArgs {
  const common = parseCommonFlags(argv.slice(2))
  const args = common.args
  const commandRaw = args[0] ?? 'help'
  const command = (['dump', 'load', 'list', 'help'].includes(commandRaw)
    ? commandRaw
    : 'help') as CliArgs['command']

  const parsed: CliArgs = {
    command,
    wipe: false,
    includeExtra: false,
    restoreExtra: false,
  }

  if (common.flags.help) {
    parsed.command = 'help'
    return parsed
  }

  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--from') {
      parsed.from = args[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--from=')) {
      parsed.from = arg.slice('--from='.length)
      continue
    }
    if (arg === '--out') {
      parsed.out = args[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--out=')) {
      parsed.out = arg.slice('--out='.length)
      continue
    }
    if (arg === '--runtime-dir') {
      parsed.runtimeDir = args[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--runtime-dir=')) {
      parsed.runtimeDir = arg.slice('--runtime-dir='.length)
      continue
    }
    if (arg === '--dump-root') {
      parsed.dumpRoot = args[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--dump-root=')) {
      parsed.dumpRoot = arg.slice('--dump-root='.length)
      continue
    }
    if (arg === '--label') {
      parsed.label = args[i + 1]
      i += 1
      continue
    }
    if (arg.startsWith('--label=')) {
      parsed.label = arg.slice('--label='.length)
      continue
    }
    if (arg === '--wipe') {
      parsed.wipe = true
      continue
    }
    if (arg === '--include-extra') {
      parsed.includeExtra = true
      continue
    }
    if (arg === '--restore-extra') {
      parsed.restoreExtra = true
      continue
    }
  }

  return parsed
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function resolveRuntimeDir(args: CliArgs): string {
  return path.resolve(args.runtimeDir ?? '.agents/state/runtime')
}

function resolveDumpRoot(args: CliArgs, runtimeDir: string): string {
  return path.resolve(args.dumpRoot ?? path.join(runtimeDir, 'dumps'))
}

async function collectFiles(rootDir: string, options?: { ignoreTopLevel?: string[] }): Promise<string[]> {
  const out: string[] = []
  const ignoreTop = new Set(options?.ignoreTopLevel ?? [])

  async function walk(currentDir: string, relFromRoot: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const rel = relFromRoot ? path.join(relFromRoot, entry.name) : entry.name
      const abs = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        if (!relFromRoot && ignoreTop.has(entry.name)) continue
        await walk(abs, rel)
        continue
      }

      if (entry.isFile()) {
        out.push(rel)
      }
    }
  }

  await walk(rootDir, '')
  return out.sort()
}

async function sha256File(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath)
  const hash = createHash('sha256')
  hash.update(buf)
  return hash.digest('hex')
}

async function buildDumpEntries(baseDir: string, relFiles: string[]): Promise<DumpFileEntry[]> {
  const entries: DumpFileEntry[] = []
  for (const rel of relFiles) {
    const abs = path.join(baseDir, rel)
    const stat = await fs.stat(abs)
    entries.push({
      rel,
      bytes: stat.size,
      mtimeMs: stat.mtimeMs,
      sha256: await sha256File(abs),
    })
  }
  return entries
}

async function ensureParent(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

async function copyRelativeFiles(srcBase: string, dstBase: string, relFiles: string[]): Promise<void> {
  for (const rel of relFiles) {
    const src = path.join(srcBase, rel)
    const dst = path.join(dstBase, rel)
    await ensureParent(dst)
    await fs.copyFile(src, dst)
  }
}

async function copyExplicitFiles(dstBase: string, files: string[]): Promise<string[]> {
  const copied: string[] = []
  for (const rel of files) {
    const src = path.resolve(rel)
    if (!(await exists(src))) continue
    const dst = path.join(dstBase, rel)
    await ensureParent(dst)
    await fs.copyFile(src, dst)
    copied.push(rel)
  }
  return copied.sort()
}

async function writeManifest(outDir: string, manifest: MemoryDumpManifest): Promise<void> {
  const manifestPath = path.join(outDir, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
}

function summarize(entries: DumpFileEntry[]): { files: number; bytes: number } {
  return {
    files: entries.length,
    bytes: entries.reduce((sum, item) => sum + item.bytes, 0),
  }
}

async function dumpMemory(args: CliArgs): Promise<void> {
  const runtimeDir = resolveRuntimeDir(args)
  const dumpRoot = resolveDumpRoot(args, runtimeDir)

  if (!(await exists(runtimeDir))) {
    throw new Error(`runtime directory not found: ${runtimeDir}`)
  }

  const runtimeFiles = await collectFiles(runtimeDir, { ignoreTopLevel: ['dumps'] })
  const ts = stamp()
  const label = slug(args.label ?? '')
  const defaultOut = path.join(dumpRoot, `${ts}${label ? `-${label}` : ''}`)
  const outDir = path.resolve(args.out ?? defaultOut)

  if (await exists(outDir)) {
    throw new Error(`output already exists: ${outDir}`)
  }

  const runtimeOut = path.join(outDir, 'runtime')
  const extraOut = path.join(outDir, 'extra')
  await fs.mkdir(runtimeOut, { recursive: true })

  await copyRelativeFiles(runtimeDir, runtimeOut, runtimeFiles)
  const runtimeEntries = await buildDumpEntries(runtimeOut, runtimeFiles)

  let extraEntries: DumpFileEntry[] = []
  if (args.includeExtra) {
    await fs.mkdir(extraOut, { recursive: true })
    const copiedExtra = await copyExplicitFiles(extraOut, EXTRA_MEMORY_FILES)
    extraEntries = await buildDumpEntries(extraOut, copiedExtra)
  }

  const manifest: MemoryDumpManifest = {
    schema: 'spw.mem.dump.v1',
    createdAt: new Date().toISOString(),
    label: args.label ?? '',
    runtimeDir: path.relative(process.cwd(), runtimeDir) || '.',
    memoryModel: {
      lattice: 'runtime_cells',
      projection: 'runtime',
      expansion: 'extra',
    },
    runtimeFiles: runtimeEntries,
    extraFiles: extraEntries,
  }

  await writeManifest(outDir, manifest)

  const runtimeSummary = summarize(runtimeEntries)
  const extraSummary = summarize(extraEntries)

  console.log(`spw-mem dump written: ${outDir}`)
  console.log(`runtime files: ${runtimeSummary.files}, bytes: ${runtimeSummary.bytes}`)
  if (args.includeExtra) {
    console.log(`extra files: ${extraSummary.files}, bytes: ${extraSummary.bytes}`)
  }
}

async function listDumps(args: CliArgs): Promise<void> {
  const runtimeDir = resolveRuntimeDir(args)
  const dumpRoot = resolveDumpRoot(args, runtimeDir)

  if (!(await exists(dumpRoot))) {
    console.log('spw-mem: no dumps found.')
    return
  }

  const entries = await fs.readdir(dumpRoot, { withFileTypes: true })
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse()

  if (dirs.length === 0) {
    console.log('spw-mem: no dumps found.')
    return
  }

  for (const name of dirs) {
    const manifestPath = path.join(dumpRoot, name, 'manifest.json')
    if (!(await exists(manifestPath))) {
      console.log(`${name} (missing manifest)`)
      continue
    }

    const parsed = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as MemoryDumpManifest
    const runtimeSummary = summarize(parsed.runtimeFiles ?? [])
    const extraSummary = summarize(parsed.extraFiles ?? [])
    console.log(`${name}  runtime=${runtimeSummary.files} files  extra=${extraSummary.files} files  at=${parsed.createdAt}`)
  }
}

async function latestDumpDir(dumpRoot: string): Promise<string | null> {
  if (!(await exists(dumpRoot))) return null

  const entries = await fs.readdir(dumpRoot, { withFileTypes: true })
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse()
  if (dirs.length === 0) return null
  return path.join(dumpRoot, dirs[0])
}

async function removeRuntimeFilesExceptDumps(runtimeDir: string): Promise<void> {
  const entries = await fs.readdir(runtimeDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'dumps') continue
    const target = path.join(runtimeDir, entry.name)
    await fs.rm(target, { recursive: true, force: true })
  }
}

async function loadMemory(args: CliArgs): Promise<void> {
  const runtimeDir = resolveRuntimeDir(args)
  const dumpRoot = resolveDumpRoot(args, runtimeDir)
  let sourceDir = args.from ? path.resolve(args.from) : await latestDumpDir(dumpRoot)
  if (!sourceDir) {
    throw new Error('no dump found (provide --from or create one with dump)')
  }

  const manifestPath = path.join(sourceDir, 'manifest.json')
  if (!(await exists(manifestPath))) {
    throw new Error(`manifest not found: ${manifestPath}`)
  }

  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as MemoryDumpManifest
  if (manifest.schema !== 'spw.mem.dump.v1') {
    throw new Error(`unsupported schema: ${manifest.schema}`)
  }

  const runtimeSource = path.join(sourceDir, 'runtime')
  if (!(await exists(runtimeSource))) {
    throw new Error(`runtime payload missing: ${runtimeSource}`)
  }

  await fs.mkdir(runtimeDir, { recursive: true })
  if (args.wipe) {
    await removeRuntimeFilesExceptDumps(runtimeDir)
  }

  const runtimeRelFiles = manifest.runtimeFiles.map((entry) => entry.rel)
  await copyRelativeFiles(runtimeSource, runtimeDir, runtimeRelFiles)

  let restoredExtra = 0
  if (args.restoreExtra && manifest.extraFiles.length > 0) {
    const extraSource = path.join(sourceDir, 'extra')
    const extraRel = manifest.extraFiles.map((entry) => entry.rel)
    for (const rel of extraRel) {
      const src = path.join(extraSource, rel)
      const dst = path.resolve(rel)
      if (!(await exists(src))) continue
      await ensureParent(dst)
      await fs.copyFile(src, dst)
      restoredExtra += 1
    }
  }

  console.log(`spw-mem load complete: ${sourceDir}`)
  console.log(`restored runtime files: ${runtimeRelFiles.length}`)
  if (args.restoreExtra) {
    console.log(`restored extra files: ${restoredExtra}`)
  }
}

export async function runSpwMemCli(argv: string[] = process.argv): Promise<void> {
  const args = parseArgs(argv)

  switch (args.command) {
    case 'dump':
      await dumpMemory(args)
      return
    case 'load':
      await loadMemory(args)
      return
    case 'list':
      await listDumps(args)
      return
    case 'help':
    default:
      printMemHelp()
      return
  }
}
