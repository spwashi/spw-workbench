#!/usr/bin/env tsx
/**
 * Versioned browser parser release — `npm run bundle:parser -- --release YYYY.MM.DD`.
 *
 * Cuts one dated, immutable set of browser parser builds from one workbench
 * revision and writes a `spw.parser-release/1` manifest beside them:
 *
 *   release/parser/<release>/
 *     full/<offset>.min.js            parse, parseExpression, SPW_PARSER_BUILD (minified)
 *     full/<offset>.debug.js(.map)    same exports, unminified, external source map
 *     lite/<offset>.min.js            the scanner (packages/spw-seed/src/lite.ts) + stamp
 *     lite/<offset>.debug.js(.map)
 *     <offset>.js                     alias: the same bytes as full/<offset>.min.js
 *     manifest.json                   the release's current offset, sizes and hashes
 *
 * Rules: a dirty working tree is refused unless --allow-dirty (which marks the
 * manifest and every stamp `dirty: true`); published files never change, so a
 * rebuild whose bytes differ from what an offset already holds is refused —
 * a re-cut takes a new offset. The manifest points at the newest offset and
 * never moves backward.
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

export const PARSER_RELEASE_SCHEMA = 'spw.parser-release/1'
const RELEASE_PATTERN = /^(\d{4})\.(\d{2})\.(\d{2})$/
const OFFSET_PATTERN = /^\d{2}$/
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

export type ParserVariant = 'full' | 'lite'
export type ParserForm = 'min' | 'debug'

export interface ParserBuildStamp {
  package: string
  version: string
  commit: string
  source: string
  release: string
  offset: string
  variant: ParserVariant
  form: ParserForm
  dirty?: true
  /** Present on prerelease builds, which carry no release day of their own. */
  prerelease?: true
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
  release: string
  offset: string
  dirty?: true
  /** Present on prereleases: release is pre/<revision>, and target names the release day it is headed for. */
  prerelease?: { target?: string }
  workbench: { package: string; version: string; revision: string }
  grammar: string
  default: { variant: 'full'; form: 'min'; path: string }
  files: ParserReleaseFileEntry[]
}

export interface ParserReleaseOptions {
  release: string
  offset: string
  allowDirty: boolean
  /** Directory that holds `<release>/` folders. Defaults to release/parser. */
  outRoot: string
  /** Cut a prerelease keyed by revision (pre/<revision>/) instead of a release day. */
  pre?: boolean
  /** The release day a prerelease is headed for, YYYY.MM.DD. */
  target?: string
}

interface VariantSpec {
  variant: ParserVariant
  source: string
  /** Entry module body; the stamp export is appended per form. */
  exports: string
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

/** An offset is two digits, owned by its release; returns an error or null. */
export function validateOffset(offset: string): string | null {
  return OFFSET_PATTERN.test(offset) ? null : `offset "${offset}" must be two digits, like 00`
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

function stampFor(
  provenance: Provenance,
  spec: VariantSpec,
  form: ParserForm,
  options: ParserReleaseOptions,
): ParserBuildStamp {
  return {
    package: provenance.packageName,
    version: provenance.version,
    commit: provenance.revision.slice(0, STAMP_COMMIT_LENGTH),
    source: spec.source,
    release: options.release,
    offset: options.offset,
    variant: spec.variant,
    form,
    ...(provenance.dirty ? { dirty: true as const } : {}),
    ...(options.pre ? { prerelease: true as const } : {}),
  }
}

// ── bundling ────────────────────────────────────────────────────────────────

async function bundleVariant(
  spec: VariantSpec,
  form: ParserForm,
  stamp: ParserBuildStamp,
): Promise<{ code: Buffer; map?: Buffer }> {
  const fileName = `${stamp.offset}.${form}.js`
  const dirtyNote = stamp.dirty ? ' (dirty tree)' : ''
  const banner =
    `/* ${stamp.package} v${stamp.version} @ ${stamp.commit}${dirtyNote} · ` +
    `parser release ${stamp.release}/${stamp.offset} · ${stamp.variant} ${form}. ` +
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

async function planFiles(provenance: Provenance, options: ParserReleaseOptions): Promise<PlannedFile[]> {
  const planned: PlannedFile[] = []
  let defaultBytes: Buffer | undefined

  for (const spec of VARIANTS) {
    for (const form of FORMS) {
      const stamp = stampFor(provenance, spec, form, options)
      const { code, map } = await bundleVariant(spec, form, stamp)
      const scriptPath = `${spec.variant}/${options.offset}.${form}.js`
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
    entry: { path: `${options.offset}.js`, alias: defaultPathFor(options.offset) },
    bytes: defaultBytes,
  })
  return planned
}

function defaultPathFor(offset: string): string {
  return `full/${offset}.min.js`
}

// ── manifest ────────────────────────────────────────────────────────────────

function digest(bytes: Buffer): { bytes: number; sha256: string; integrity: string } {
  return {
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    integrity: `sha384-${createHash('sha384').update(bytes).digest('base64')}`,
  }
}

function buildManifest(
  provenance: Provenance,
  options: ParserReleaseOptions,
  planned: PlannedFile[],
): ParserReleaseManifest {
  return {
    schema: PARSER_RELEASE_SCHEMA,
    release: options.release,
    offset: options.offset,
    ...(provenance.dirty ? { dirty: true as const } : {}),
    ...(options.pre ? { prerelease: options.target ? { target: options.target } : {} } : {}),
    workbench: {
      package: provenance.packageName,
      version: provenance.version,
      revision: provenance.revision,
    },
    grammar: provenance.grammar,
    default: { variant: 'full', form: 'min', path: defaultPathFor(options.offset) },
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

/** The next two-digit offset no published full/min file holds. */
async function nextFreeOffset(releaseDir: string): Promise<string> {
  let names: string[] = []
  try {
    names = await fs.readdir(path.join(releaseDir, 'full'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const taken = names
    .map((name) => /^(\d{2})\.min\.js$/.exec(name)?.[1])
    .filter((offset): offset is string => offset !== undefined)
    .map(Number)
  const next = taken.length > 0 ? Math.max(...taken) + 1 : 0
  return String(next).padStart(2, '0')
}

/**
 * Refuse to change anything an offset already published, and refuse to move
 * the manifest back to an older offset. Identical bytes are not a change, so
 * re-running a cut from the same clean revision is a no-op, not an error.
 */
async function guardImmutable(
  releaseDir: string,
  options: ParserReleaseOptions,
  planned: PlannedFile[],
): Promise<void> {
  const differing: string[] = []
  for (const { entry, bytes } of planned) {
    const existing = await readIfPresent(path.join(releaseDir, entry.path))
    if (existing && !existing.equals(bytes)) differing.push(entry.path)
  }
  if (differing.length > 0 && options.pre) {
    throw new Error(
      `prerelease ${options.release} is already published and these files would change:\n` +
        differing.map((p) => `    ${p}`).join('\n') +
        `\n  A prerelease names one revision; the same revision built twice should match. ` +
        `If the toolchain changed on purpose, remove ${options.release}/ and cut it again.`,
    )
  }
  if (differing.length > 0) {
    const next = await nextFreeOffset(releaseDir)
    const advice =
      validateOffset(next) === null ? `cut again with --offset ${next}` : 'this release has no offsets left; cut a new release day'
    throw new Error(
      `release ${options.release} offset ${options.offset} is already published and these files would change:\n` +
        differing.map((p) => `    ${p}`).join('\n') +
        `\n  Published files never change; ${advice}.`,
    )
  }

  const manifestBytes = await readIfPresent(path.join(releaseDir, 'manifest.json'))
  if (!manifestBytes) return
  const current = (JSON.parse(manifestBytes.toString('utf8')) as Partial<ParserReleaseManifest>).offset
  if (typeof current === 'string' && validateOffset(current) === null && Number(current) > Number(options.offset)) {
    throw new Error(
      `release ${options.release} already points at offset ${current}; the manifest never moves back to ${options.offset}.`,
    )
  }
}

// ── cut ─────────────────────────────────────────────────────────────────────

export interface ParserReleaseResult {
  releaseDir: string
  manifest: ParserReleaseManifest
  /** Written bytes by manifest path, for the size report. */
  contents: Map<string, Buffer>
}

export async function buildParserRelease(requested: ParserReleaseOptions): Promise<ParserReleaseResult> {
  let options = requested
  if (options.pre) {
    if (options.release) throw new Error('--pre names its build from the revision (pre/<revision>); drop --release')
    if (options.offset !== '00') throw new Error('a prerelease has one cut per revision; drop --offset')
    const target = options.target === undefined ? null : validateReleaseName(options.target)
    if (target) throw new Error(`--target: ${target}`)
  } else {
    if (options.target !== undefined) throw new Error('--target only applies to --pre')
    const problem = validateReleaseName(options.release) ?? validateOffset(options.offset)
    if (problem) throw new Error(problem)
  }

  const provenance = await readProvenance(options.allowDirty)
  if (options.pre) {
    options = { ...options, release: `pre/${provenance.revision.slice(0, STAMP_COMMIT_LENGTH)}` }
  }
  const planned = await planFiles(provenance, options)
  const manifest = buildManifest(provenance, options, planned)
  const releaseDir = path.join(options.outRoot, options.release)

  await guardImmutable(releaseDir, options, planned)

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
    `spw parser release ${manifest.release}/${manifest.offset} · ` +
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

const USAGE = `Usage: npm run bundle:parser -- --release YYYY.MM.DD [--offset NN] [--allow-dirty] [--out DIR]
       npm run bundle:parser -- --pre [--target YYYY.MM.DD] [--allow-dirty] [--out DIR]

  --release YYYY.MM.DD  release day (required)
  --offset NN           two-digit cut within the release (default 00); a re-cut takes a new offset
  --allow-dirty         build from a dirty tree; manifest and stamps say "dirty": true
  --out DIR             directory holding <release>/ folders (default release/parser)
  --pre                 cut a prerelease at pre/<revision>/ instead of a release day
  --target YYYY.MM.DD   with --pre: the release day this prerelease is headed for`

function parseArgs(argv: string[]): ParserReleaseOptions | 'help' {
  const options: ParserReleaseOptions = { release: '', offset: '00', allowDirty: false, outRoot: DEFAULT_OUT_ROOT }
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
      case '--offset':
        options.offset = value()
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
      case '--target':
        options.target = value()
        break
      default:
        throw new Error(`unknown argument "${argv[i]}"\n\n${USAGE}`)
    }
  }
  if (!options.release && !options.pre) throw new Error(`--release or --pre is required\n\n${USAGE}`)
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
