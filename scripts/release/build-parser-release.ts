#!/usr/bin/env tsx
/**
 * Versioned browser parser release — `npm run bundle:parser -- --release YYYY.MM.DD`
 * or a prerelease — `npm run bundle:parser -- --pre --target YYYY.MM.DD`.
 *
 * Cuts one immutable set of browser parser builds from one workbench revision
 * and writes a `spw.parser-release/2` manifest beside them:
 *
 *   release/parser/<name>/            YYYY.MM.DD, YYYY.MM.DD-pre.N or YYYY.MM.DD-patch.N
 *     parser.js                       the default: the same bytes as full.min.js
 *     full.min.js                     parse, parseExpression, SPW_PARSER_BUILD (minified)
 *     full.debug.js(.map)             same exports, unminified, external source map
 *     lite.min.js                     the scanner (packages/spw-seed/src/lite.ts) + stamp
 *     lite.debug.js(.map)
 *     reader.min.js                   roles, outline, anchors, highlightHtml + parse (packages/spw-lsp/src/reader.ts)
 *     reader.debug.js(.map)
 *     manifest.json                   name, kind, revision, sizes and hashes
 *
 * Rules: a dirty working tree is refused unless --allow-dirty (which marks the
 * manifest and every stamp `dirty: true`); published files never change. A
 * release day is cut once; a fix to it is a patch, YYYY.MM.DD-patch.N. A
 * prerelease is named for the day it targets, YYYY.MM.DD-pre.N. Within a day,
 * pre.N comes before the release and patch.N after it. The same revision cut
 * again as the same kind keeps its number and changes nothing.
 *
 * The full variant keeps the export surface of the site's
 * `scripts/build-spw-literal-parser.mjs` bundle (including its `source` stamp
 * field) so existing consumers keep working when they move to a release path.
 *
 * @see docs/runtime/md/parser-release.md
 * @see scripts/release/build-js-dist.ts — the npm-shaped dist this sits beside
 */

import { build } from 'esbuild'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { gzipSync } from 'node:zlib'

const execFileAsync = promisify(execFile)
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULT_OUT_ROOT = path.join(rootDir, 'release', 'parser')

export const PARSER_RELEASE_SCHEMA = 'spw.parser-release/2'
const RELEASE_PATTERN = /^(\d{4})\.(\d{2})\.(\d{2})$/
const SUFFIXED_NAME_PATTERN = /^(\d{4}\.\d{2}\.\d{2})-(pre|patch)\.([1-9]\d*)$/
const REVISION_PATTERN = /^[0-9a-f]{40}$/
/** The stamp's commit is the short form the site bundle already used. */
const STAMP_COMMIT_LENGTH = 12
/** Same browser floor as the site bundle this release replaces. */
const BROWSER_TARGET = ['es2022']

/**
 * The lite variant is "the scanner, size-capped". build-js-dist caps the bare
 * scanner at 4096 bytes; the release adds a banner and a stamp, so the release
 * file gets that budget plus one KiB of provenance, and no more.
 */
const LITE_SCANNER_BUDGET_BYTES = 4096
const PROVENANCE_ALLOWANCE_BYTES = 1024
const LITE_MIN_BUDGET_BYTES = LITE_SCANNER_BUDGET_BYTES + PROVENANCE_ALLOWANCE_BYTES

export type ParserVariant = 'full' | 'lite' | 'reader'
export type ParserForm = 'min' | 'debug'

export interface ParserBuildStamp {
  package: string
  version: string
  commit: string
  source: string
  release: string
  variant: ParserVariant
  form: ParserForm
  dirty?: true
  /** Present on prerelease builds, which carry no release day of their own. */
  prerelease?: true
  /** Present on a patch of a published release day. */
  patch?: true
}

export interface ParserReleaseScriptEntry {
  path: string
  variant: ParserVariant
  form: ParserForm
  bytes: number
  sha256: string
  integrity: string
}

export interface ParserReleaseMapEntry {
  path: string
  variant: ParserVariant
  form: 'debug'
  kind: 'map'
  bytes: number
  sha256: string
  integrity: string
}

export interface ParserReleaseAliasEntry {
  path: string
  alias: string
  bytes: number
  sha256: string
  integrity: string
}

export type ParserReleaseFileEntry =
  | ParserReleaseScriptEntry
  | ParserReleaseMapEntry
  | ParserReleaseAliasEntry

export interface ParserReleaseManifest {
  schema: typeof PARSER_RELEASE_SCHEMA
  /** YYYY.MM.DD, YYYY.MM.DD-pre.N or YYYY.MM.DD-patch.N. */
  name: string
  kind: ParserCutKind
  /** The release day: the day itself, the day a prerelease targets, or the day a patch fixes. */
  day: string
  /** A prerelease's number among the prereleases of its day. */
  pre?: number
  /** A patch's number among the patches of its day. */
  patch?: number
  dirty?: true
  workbench: { package: string; version: string; revision: string }
  grammar: string
  default: { variant: 'full'; form: 'min'; path: string }
  files: ParserReleaseFileEntry[]
}

export type ParserCutKind = 'release' | 'prerelease' | 'patch'

export interface ParserReleaseOptions {
  /** The release day, YYYY.MM.DD. Omitted for a prerelease or a patch. */
  release?: string
  allowDirty: boolean
  /** Directory that holds `<name>/` folders. Defaults to release/parser. */
  outRoot: string
  /** Cut a prerelease named for --target instead of a release. */
  pre?: boolean
  /** Cut a patch of the published release day named by --target. */
  patch?: boolean
  /** With --pre, the day it is headed for; with --patch, the day it fixes. YYYY.MM.DD. */
  target?: string
}

/** What a cut is called and where it lands, settled before anything is built. */
interface CutName {
  name: string
  kind: ParserCutKind
  day: string
  pre?: number
  patch?: number
}

interface VariantSpec {
  variant: ParserVariant
  source: string
  /** Entry module body; the stamp export is appended per form. */
  exports: string
  /** Module substitutions for this variant only, as esbuild aliases. */
  alias?: Readonly<Record<string, string>>
}

const VARIANTS: readonly VariantSpec[] = [
  {
    variant: 'full',
    source: 'packages/spw-seed/src/parser.ts',
    exports: `export { parse, parseExpression } from './packages/spw-seed/src/parser.ts';`,
  },
  {
    variant: 'lite',
    source: 'packages/spw-seed/src/lite.ts',
    exports: `export * from './packages/spw-seed/src/lite.ts';`,
  },
  {
    variant: 'reader',
    source: 'packages/spw-lsp/src/reader.ts',
    exports: `export * from './packages/spw-lsp/src/reader.ts';`,
    // The editor's reading functions import seed by package name; the reader
    // build gives them seed's browser-safe slice, so no node built-in comes along.
    alias: { '@spwashi/spw-seed': './packages/spw-seed/src/reader.ts' },
  },
]

const FORMS: readonly ParserForm[] = ['min', 'debug']

interface Provenance {
  packageName: string
  version: string
  revision: string
  grammar: string
  dirty: boolean
}

/** Omit applied to each member of a union, so the members stay distinct. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** A manifest entry before its digest is taken. */
type PlannedEntry = DistributiveOmit<ParserReleaseFileEntry, 'bytes' | 'sha256' | 'integrity'>

/** One file of the cut, in manifest order, before anything touches disk. */
interface PlannedFile {
  entry: PlannedEntry
  bytes: Buffer
}

// ── validation ──────────────────────────────────────────────────────────────

/** A release is a calendar day written YYYY.MM.DD; returns an error or null. */
export function validateReleaseName(release: string): string | null {
  const match = RELEASE_PATTERN.exec(release)
  if (!match) return `release "${release}" must be YYYY.MM.DD`
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return real ? null : `release "${release}" is not a calendar date`
}

// ── provenance ──────────────────────────────────────────────────────────────

async function git(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd: rootDir })
  return stdout
}

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(rootDir, relativePath), 'utf8')) as T
}

async function readProvenance(allowDirty: boolean): Promise<Provenance> {
  const rootPackage = await readJson<{ name: string; version: string }>('package.json')
  const seedPackage = await readJson<{ version: string }>('packages/spw-seed/package.json')
  const revision = (await git(['rev-parse', 'HEAD'])).trim()
  if (!REVISION_PATTERN.test(revision)) {
    throw new Error(`git HEAD "${revision}" is not a 40-hex revision`)
  }

  const dirtyPaths = (await git(['status', '--porcelain']))
    .split('\n')
    .filter((line) => line.trim().length > 0)
  if (dirtyPaths.length > 0 && !allowDirty) {
    const shown = dirtyPaths.slice(0, 5).map((line) => `    ${line}`).join('\n')
    const more = dirtyPaths.length > 5 ? `\n    … ${dirtyPaths.length - 5} more` : ''
    throw new Error(
      `working tree is dirty (${dirtyPaths.length} paths); a release names one revision.\n` +
        `${shown}${more}\n  Commit first, or pass --allow-dirty to cut a build marked dirty.`,
    )
  }

  return {
    packageName: rootPackage.name,
    version: rootPackage.version,
    revision,
    grammar: seedPackage.version,
    dirty: dirtyPaths.length > 0,
  }
}

function stampFor(provenance: Provenance, spec: VariantSpec, form: ParserForm, cut: CutName): ParserBuildStamp {
  return {
    package: provenance.packageName,
    version: provenance.version,
    commit: provenance.revision.slice(0, STAMP_COMMIT_LENGTH),
    source: spec.source,
    release: cut.name,
    variant: spec.variant,
    form,
    ...(provenance.dirty ? { dirty: true as const } : {}),
    ...(cut.kind === 'prerelease' ? { prerelease: true as const } : {}),
    ...(cut.kind === 'patch' ? { patch: true as const } : {}),
  }
}

// ── bundling ────────────────────────────────────────────────────────────────

async function bundleVariant(
  spec: VariantSpec,
  form: ParserForm,
  stamp: ParserBuildStamp,
): Promise<{ code: Buffer; map?: Buffer }> {
  const fileName = `${spec.variant}.${form}.js`
  const dirtyNote = stamp.dirty ? ' (dirty tree)' : ''
  const banner =
    `/* ${stamp.package} v${stamp.version} @ ${stamp.commit}${dirtyNote} · ` +
    `parser ${stamp.release} · ${stamp.variant} ${form}. ` +
    'Generated by npm run bundle:parser; do not edit. */'

  const result = await build({
    stdin: {
      contents: [
        spec.exports,
        `export const SPW_PARSER_BUILD = Object.freeze(${JSON.stringify(stamp)});`,
      ].join('\n'),
      loader: 'ts',
      resolveDir: rootDir,
      sourcefile: `spw-parser-${spec.variant}-entry.ts`,
    },
    // Nothing is written: the virtual outfile sits at the repo root so source
    // map paths read packages/… whatever directory the release lands in, and
    // the linked sourceMappingURL is the bare sibling file name.
    write: false,
    absWorkingDir: rootDir,
    outfile: path.join(rootDir, fileName),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: BROWSER_TARGET,
    minify: form === 'min',
    sourcemap: form === 'debug' ? 'linked' : false,
    legalComments: 'none',
    banner: { js: banner },
    logLevel: 'silent',
    tsconfig: path.join(rootDir, 'tsconfig.json'),
    ...(spec.alias ? { alias: { ...spec.alias } } : {}),
  })

  const code = result.outputFiles.find((file) => file.path.endsWith('.js'))
  const map = result.outputFiles.find((file) => file.path.endsWith('.js.map'))
  if (!code) throw new Error(`esbuild produced no ${spec.variant} ${form} script`)
  if (form === 'debug' && !map) throw new Error(`esbuild produced no ${spec.variant} source map`)
  return {
    code: Buffer.from(code.contents),
    ...(map ? { map: Buffer.from(map.contents) } : {}),
  }
}

async function planFiles(provenance: Provenance, cut: CutName): Promise<PlannedFile[]> {
  const planned: PlannedFile[] = []
  let defaultBytes: Buffer | undefined

  for (const spec of VARIANTS) {
    for (const form of FORMS) {
      const stamp = stampFor(provenance, spec, form, cut)
      const { code, map } = await bundleVariant(spec, form, stamp)
      const scriptPath = `${spec.variant}.${form}.js`
      planned.push({ entry: { path: scriptPath, variant: spec.variant, form }, bytes: code })
      if (map) {
        planned.push({
          entry: { path: `${scriptPath}.map`, variant: spec.variant, form: 'debug', kind: 'map' },
          bytes: map,
        })
      }
      if (spec.variant === 'full' && form === 'min') defaultBytes = code
      if (spec.variant === 'lite' && form === 'min' && code.length > LITE_MIN_BUDGET_BYTES) {
        throw new Error(
          `${scriptPath} is ${code.length} bytes, over its ${LITE_MIN_BUDGET_BYTES}-byte budget; ` +
            'something pulled the kernel into the scanner — check lite.ts imports.',
        )
      }
    }
  }

  if (!defaultBytes) throw new Error('the default variant (full min) was not built')
  planned.push({
    entry: { path: DEFAULT_ALIAS_PATH, alias: DEFAULT_FILE_PATH },
    bytes: defaultBytes,
  })
  return planned
}

/** The default file and the alias that carries the same bytes. */
const DEFAULT_FILE_PATH = 'full.min.js'
const DEFAULT_ALIAS_PATH = 'parser.js'

// ── manifest ────────────────────────────────────────────────────────────────

function digest(bytes: Buffer): { bytes: number; sha256: string; integrity: string } {
  return {
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    integrity: `sha384-${createHash('sha384').update(bytes).digest('base64')}`,
  }
}

function buildManifest(provenance: Provenance, cut: CutName, planned: PlannedFile[]): ParserReleaseManifest {
  return {
    schema: PARSER_RELEASE_SCHEMA,
    name: cut.name,
    kind: cut.kind,
    day: cut.day,
    ...(cut.pre !== undefined ? { pre: cut.pre } : {}),
    ...(cut.patch !== undefined ? { patch: cut.patch } : {}),
    ...(provenance.dirty ? { dirty: true as const } : {}),
    workbench: {
      package: provenance.packageName,
      version: provenance.version,
      revision: provenance.revision,
    },
    grammar: provenance.grammar,
    default: { variant: 'full', form: 'min', path: DEFAULT_ALIAS_PATH },
    files: planned.map(({ entry, bytes }) => ({ ...entry, ...digest(bytes) }) as ParserReleaseFileEntry),
  }
}

// ── immutability ────────────────────────────────────────────────────────────

async function readIfPresent(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

/**
 * Refuse to change anything a cut already published. Identical bytes are not
 * a change, so re-running a cut from the same clean revision is a no-op.
 */
async function guardImmutable(releaseDir: string, cut: CutName, planned: PlannedFile[]): Promise<void> {
  const differing: string[] = []
  for (const { entry, bytes } of planned) {
    const existing = await readIfPresent(path.join(releaseDir, entry.path))
    if (existing && !existing.equals(bytes)) differing.push(entry.path)
  }
  if (differing.length === 0) return
  const why =
    cut.kind === 'release'
      ? `A published day never changes; cut the fix as a patch with --patch --target ${cut.day} (or try it first with --pre).`
      : `A ${cut.kind} names one revision, and the same revision should build the same bytes. ` +
        `If the toolchain changed on purpose, remove ${cut.name}/ and cut it again.`
  throw new Error(
    `${cut.name} is already published and these files would change:\n` +
      differing.map((p) => `    ${p}`).join('\n') +
      `\n  ${why}`,
  )
}

/**
 * A prerelease or a patch is numbered among the cuts of its kind for its day.
 * The same revision (and the same dirty mark) keeps the number it already has;
 * any other revision takes the next number.
 */
async function suffixedName(
  outRoot: string,
  kind: 'prerelease' | 'patch',
  day: string,
  provenance: Provenance,
): Promise<CutName> {
  const suffix = kind === 'prerelease' ? 'pre' : 'patch'
  const counted = (n: number): CutName =>
    kind === 'prerelease'
      ? { name: `${day}-pre.${n}`, kind, day, pre: n }
      : { name: `${day}-patch.${n}`, kind, day, patch: n }
  let names: string[] = []
  try {
    names = await fs.readdir(outRoot)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  let highest = 0
  for (const name of names) {
    const match = SUFFIXED_NAME_PATTERN.exec(name)
    if (!match || match[1] !== day || match[2] !== suffix) continue
    const n = Number(match[3])
    highest = Math.max(highest, n)
    const manifestBytes = await readIfPresent(path.join(outRoot, name, 'manifest.json'))
    if (!manifestBytes) continue
    const manifest = JSON.parse(manifestBytes.toString('utf8')) as Partial<ParserReleaseManifest>
    if (manifest.workbench?.revision === provenance.revision && Boolean(manifest.dirty) === provenance.dirty) {
      return counted(n)
    }
  }
  return counted(highest + 1)
}

// ── cut ─────────────────────────────────────────────────────────────────────

export interface ParserReleaseResult {
  releaseDir: string
  manifest: ParserReleaseManifest
  /** Written bytes by manifest path, for the size report. */
  contents: Map<string, Buffer>
}

export async function buildParserRelease(options: ParserReleaseOptions): Promise<ParserReleaseResult> {
  if (options.pre && options.patch) throw new Error('choose one of --pre and --patch')
  if (options.pre || options.patch) {
    const flag = options.pre ? '--pre' : '--patch'
    if (options.release) throw new Error(`${flag} is named for its target day; drop --release`)
    if (!options.target) {
      throw new Error(`${flag} needs --target YYYY.MM.DD, the day it is ${options.pre ? 'headed for' : 'fixing'}`)
    }
    const problem = validateReleaseName(options.target)
    if (problem) throw new Error(`--target: ${problem}`)
  } else {
    if (options.target !== undefined) throw new Error('--target only applies to --pre or --patch')
    const problem = validateReleaseName(options.release ?? '')
    if (problem) throw new Error(problem)
  }

  const provenance = await readProvenance(options.allowDirty)
  const cut: CutName =
    options.pre || options.patch
      ? await suffixedName(options.outRoot, options.pre ? 'prerelease' : 'patch', options.target!, provenance)
      : { name: options.release!, kind: 'release', day: options.release! }
  const planned = await planFiles(provenance, cut)
  const manifest = buildManifest(provenance, cut, planned)
  const releaseDir = path.join(options.outRoot, cut.name)

  await guardImmutable(releaseDir, cut, planned)

  for (const { entry, bytes } of planned) {
    const target = path.join(releaseDir, entry.path)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, bytes)
  }
  // Last, so a reader never sees a manifest naming files that are not there.
  await fs.writeFile(path.join(releaseDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  return { releaseDir, manifest, contents: new Map(planned.map(({ entry, bytes }) => [entry.path, bytes])) }
}

function formatSizeReport(result: ParserReleaseResult): string {
  const { manifest, contents } = result
  const width = Math.max(...manifest.files.map((file) => file.path.length))
  const head =
    `spw parser ${manifest.kind} ${manifest.name} · ` +
    `${manifest.workbench.package} v${manifest.workbench.version} @ ${manifest.workbench.revision.slice(0, STAMP_COMMIT_LENGTH)}` +
    (manifest.dirty ? ' (dirty)' : '')
  const rows = manifest.files.map((file) => {
    const bytes = contents.get(file.path)
    const gz = bytes ? gzipSync(bytes).length : 0
    const note = 'alias' in file ? `  = ${file.alias}` : ''
    return `  ${file.path.padEnd(width)}  ${String(file.bytes).padStart(8)} B  gz ${String(gz).padStart(7)} B${note}`
  })
  const where = path.relative(rootDir, result.releaseDir)
  const shown = where.startsWith('..') || path.isAbsolute(where) ? result.releaseDir : where
  return [head, ...rows, `  → ${shown}/manifest.json`].join('\n')
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const USAGE = `Usage: npm run bundle:parser -- --release YYYY.MM.DD [--allow-dirty] [--out DIR]
       npm run bundle:parser -- --pre --target YYYY.MM.DD [--allow-dirty] [--out DIR]
       npm run bundle:parser -- --patch --target YYYY.MM.DD [--allow-dirty] [--out DIR]

  --release YYYY.MM.DD  cut the release for that day; a day is cut once
  --pre                 cut a prerelease named <target>-pre.N, before the day's release
  --patch               cut a patch named <target>-patch.N, after the day's release
  --target YYYY.MM.DD   with --pre, the day it is headed for; with --patch, the day it fixes
                        (the same revision keeps its number)
  --allow-dirty         build from a dirty tree; manifest and stamps say "dirty": true
  --out DIR             directory holding <name>/ folders (default release/parser)`

function parseArgs(argv: string[]): ParserReleaseOptions | 'help' {
  const options: ParserReleaseOptions = { allowDirty: false, outRoot: DEFAULT_OUT_ROOT }
  for (let i = 0; i < argv.length; i += 1) {
    const [flag, inline] = argv[i].split(/=(.*)/s, 2)
    const value = (): string => {
      const next = inline ?? argv[++i]
      if (next === undefined || next.startsWith('--')) throw new Error(`${flag} needs a value\n\n${USAGE}`)
      return next
    }
    switch (flag) {
      case '--help':
      case '-h':
        return 'help'
      case '--release':
        options.release = value()
        break
      case '--out':
        options.outRoot = path.resolve(value())
        break
      case '--allow-dirty':
        options.allowDirty = true
        break
      case '--pre':
        options.pre = true
        break
      case '--patch':
        options.patch = true
        break
      case '--target':
        options.target = value()
        break
      default:
        throw new Error(`unknown argument "${argv[i]}"\n\n${USAGE}`)
    }
  }
  if (!options.release && !options.pre && !options.patch) {
    throw new Error(`--release, --pre or --patch is required\n\n${USAGE}`)
  }
  return options
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  if (options === 'help') {
    console.log(USAGE)
    return
  }
  console.log(formatSizeReport(await buildParserRelease(options)))
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error: unknown) => {
    console.error(`bundle:parser: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
