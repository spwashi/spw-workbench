/**
 * Parser release builder — `npm run test:parser-release`.
 *
 * Runs the real command (`scripts/release/build-parser-release.ts`) into temp
 * directories with --allow-dirty and holds what it writes to the
 * spw.parser-release/1 contract: manifest digests match the files, the alias is
 * the default bytes, every stamp names the manifest revision, the full bundle
 * parses and the lite bundle scans, and published offsets never change.
 *
 * node:test rather than vitest on purpose: the bundles are imported by Node's
 * own ESM loader, the way a browser would take them, with no transform between.
 */

import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import {
  PARSER_RELEASE_SCHEMA,
  validateOffset,
  validateReleaseName,
  type ParserBuildStamp,
  type ParserReleaseManifest,
} from './build-parser-release'

const execFileAsync = promisify(execFile)
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const builder = path.join(rootDir, 'scripts/release/build-parser-release.ts')
const RELEASE = '2026.10.13'

interface RunResult {
  code: number
  stdout: string
  stderr: string
}

async function runBuilder(args: string[]): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, ['--import', 'tsx', builder, ...args], {
      cwd: rootDir,
    })
    return { code: 0, stdout, stderr }
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string }
    return { code: failure.code ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' }
  }
}

async function makeTempRoot(label: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), `spw-parser-release-${label}-`))
}

async function readManifest(releaseDir: string): Promise<ParserReleaseManifest> {
  return JSON.parse(await fs.readFile(path.join(releaseDir, 'manifest.json'), 'utf8')) as ParserReleaseManifest
}

async function importBundle<T>(filePath: string): Promise<T> {
  return (await import(pathToFileURL(filePath).href)) as T
}

async function treeIsDirty(): Promise<boolean> {
  const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd: rootDir })
  return stdout.trim().length > 0
}

describe('release name and offset validation', () => {
  it('accepts calendar days as YYYY.MM.DD and two-digit offsets', () => {
    assert.equal(validateReleaseName('2026.10.13'), null)
    assert.equal(validateReleaseName('2028.02.29'), null)
    assert.equal(validateOffset('00'), null)
    assert.equal(validateOffset('17'), null)
  })

  it('rejects other shapes and impossible dates', () => {
    for (const bad of ['2026-10-13', '26.10.13', '2026.1.13', '2026.13.01', '2026.02.30', '']) {
      assert.notEqual(validateReleaseName(bad), null, bad)
    }
    for (const bad of ['0', '000', 'a1', '-1', '']) {
      assert.notEqual(validateOffset(bad), null, bad)
    }
  })
})

describe('bundle:parser --allow-dirty into a temp directory', () => {
  let outRoot = ''
  let releaseDir = ''
  let manifest: ParserReleaseManifest

  before(async () => {
    outRoot = await makeTempRoot('cut')
    releaseDir = path.join(outRoot, RELEASE)
    const run = await runBuilder(['--release', RELEASE, '--offset', '00', '--allow-dirty', '--out', outRoot])
    assert.equal(run.code, 0, run.stderr)
    manifest = await readManifest(releaseDir)
  })

  after(async () => {
    if (outRoot) await fs.rm(outRoot, { recursive: true, force: true })
  })

  it('writes the spw.parser-release/1 manifest shape', async () => {
    const rootPackage = JSON.parse(await fs.readFile(path.join(rootDir, 'package.json'), 'utf8'))
    const seedPackage = JSON.parse(await fs.readFile(path.join(rootDir, 'packages/spw-seed/package.json'), 'utf8'))
    assert.equal(manifest.schema, PARSER_RELEASE_SCHEMA)
    assert.equal(manifest.release, RELEASE)
    assert.equal(manifest.offset, '00')
    assert.equal(manifest.workbench.package, 'spw-workbench')
    assert.equal(manifest.workbench.version, rootPackage.version)
    assert.match(manifest.workbench.revision, /^[0-9a-f]{40}$/)
    assert.equal(manifest.grammar, seedPackage.version)
    assert.deepEqual(manifest.default, { variant: 'full', form: 'min', path: 'full/00.min.js' })
    assert.equal(manifest.dirty, (await treeIsDirty()) ? true : undefined)
    assert.deepEqual(
      manifest.files.map((file) => file.path),
      [
        'full/00.min.js',
        'full/00.debug.js',
        'full/00.debug.js.map',
        'lite/00.min.js',
        'lite/00.debug.js',
        'lite/00.debug.js.map',
        '00.js',
      ],
    )
  })

  it('states bytes, sha256 and integrity that match every file', async () => {
    for (const file of manifest.files) {
      const bytes = await fs.readFile(path.join(releaseDir, file.path))
      assert.equal(file.bytes, bytes.length, `${file.path} bytes`)
      assert.equal(file.sha256, createHash('sha256').update(bytes).digest('hex'), `${file.path} sha256`)
      assert.equal(
        file.integrity,
        `sha384-${createHash('sha384').update(bytes).digest('base64')}`,
        `${file.path} integrity`,
      )
    }
  })

  it('makes the alias the default file byte for byte', async () => {
    const alias = manifest.files.find((file) => file.path === '00.js')
    assert.ok(alias && 'alias' in alias)
    assert.equal(alias.alias, 'full/00.min.js')
    const aliasBytes = await fs.readFile(path.join(releaseDir, '00.js'))
    const defaultBytes = await fs.readFile(path.join(releaseDir, 'full/00.min.js'))
    assert.ok(aliasBytes.equals(defaultBytes))
  })

  it('stamps every script with the manifest revision, release, offset, variant and form', async () => {
    const scripts = manifest.files.filter((file) => file.path.endsWith('.js'))
    assert.equal(scripts.length, 5)
    for (const file of scripts) {
      const { SPW_PARSER_BUILD: stamp } = await importBundle<{ SPW_PARSER_BUILD: ParserBuildStamp }>(
        path.join(releaseDir, file.path),
      )
      const expected = 'alias' in file ? { variant: 'full', form: 'min' } : { variant: file.variant, form: file.form }
      assert.ok(Object.isFrozen(stamp), `${file.path} stamp frozen`)
      assert.equal(stamp.commit, manifest.workbench.revision.slice(0, 12), `${file.path} commit`)
      assert.ok(manifest.workbench.revision.startsWith(stamp.commit))
      assert.equal(stamp.package, manifest.workbench.package)
      assert.equal(stamp.version, manifest.workbench.version)
      assert.equal(stamp.release, RELEASE)
      assert.equal(stamp.offset, '00')
      assert.equal(stamp.variant, expected.variant, `${file.path} variant`)
      assert.equal(stamp.form, expected.form, `${file.path} form`)
      assert.equal(stamp.dirty, manifest.dirty, `${file.path} dirty`)
    }
  })

  it('full/min parses ~door through its exported parse', async () => {
    const full = await importBundle<{
      parse: (source: string) => { success: boolean }
      parseExpression: unknown
    }>(path.join(releaseDir, 'full/00.min.js'))
    assert.equal(typeof full.parseExpression, 'function')
    assert.equal(full.parse('~door').success, true)
  })

  it('lite exports its scanner and scans door[closed]{hinge, key}', async () => {
    for (const form of ['min', 'debug']) {
      const lite = await importBundle<{
        scan: (source: string) => Array<{ kind: string; value: string; bound?: string }>
        scanGeometry: unknown
        SPW_OPERATORS: readonly string[]
      }>(path.join(releaseDir, `lite/00.${form}.js`))
      assert.equal(typeof lite.scanGeometry, 'function')
      assert.ok(lite.SPW_OPERATORS.includes('~'))
      const tokens = lite.scan('door[closed]{hinge, key}').filter((token) => token.kind !== 'space')
      assert.deepEqual(
        tokens.map((token) => [token.kind, token.value, token.bound ?? null]),
        [
          ['identifier', 'door', null],
          ['open', '[', 'frame'],
          ['identifier', 'closed', null],
          ['close', ']', 'frame'],
          ['open', '{', 'body'],
          ['identifier', 'hinge', null],
          ['other', ',', null],
          ['identifier', 'key', null],
          ['close', '}', 'body'],
        ],
      )
    }
  })

  it('links debug forms to sibling maps with repo-relative sources and leaves min forms unmapped', async () => {
    for (const variant of ['full', 'lite']) {
      const debug = await fs.readFile(path.join(releaseDir, `${variant}/00.debug.js`), 'utf8')
      assert.match(debug, /\n\/\/# sourceMappingURL=00\.debug\.js\.map\n?$/)
      const map = JSON.parse(await fs.readFile(path.join(releaseDir, `${variant}/00.debug.js.map`), 'utf8'))
      assert.ok((map.sources as string[]).some((source) => source.startsWith('packages/spw-seed/src/')))
      const min = await fs.readFile(path.join(releaseDir, `${variant}/00.min.js`), 'utf8')
      assert.doesNotMatch(min, /sourceMappingURL/)
    }
  })

  it('carries no absolute host paths in any file', async () => {
    for (const file of manifest.files) {
      const text = await fs.readFile(path.join(releaseDir, file.path), 'utf8')
      assert.ok(!text.includes(rootDir), `${file.path} names the checkout path`)
      assert.ok(!text.includes(os.homedir()), `${file.path} names the home directory`)
    }
  })
})

describe('bundle:parser immutability and refusals', () => {
  let outRoot = ''

  before(async () => {
    outRoot = await makeTempRoot('immutable')
  })

  after(async () => {
    if (outRoot) await fs.rm(outRoot, { recursive: true, force: true })
  })

  it('re-runs an identical cut as a no-op, then refuses to change a published offset', async () => {
    const args = ['--release', RELEASE, '--offset', '00', '--allow-dirty', '--out', outRoot]
    assert.equal((await runBuilder(args)).code, 0)
    const releaseDir = path.join(outRoot, RELEASE)
    const firstManifest = await fs.readFile(path.join(releaseDir, 'manifest.json'))

    const again = await runBuilder(args)
    assert.equal(again.code, 0, again.stderr)
    assert.ok(firstManifest.equals(await fs.readFile(path.join(releaseDir, 'manifest.json'))))

    const tamperedPath = path.join(releaseDir, 'lite/00.debug.js')
    const original = await fs.readFile(tamperedPath)
    await fs.appendFile(tamperedPath, '\n// tampered\n')
    const refused = await runBuilder(args)
    await fs.writeFile(tamperedPath, original)
    assert.notEqual(refused.code, 0)
    assert.match(refused.stderr, /already published/)
    assert.match(refused.stderr, /lite\/00\.debug\.js/)
    assert.match(refused.stderr, /--offset 01/)
  })

  it('cuts a new offset beside the old one and never moves the manifest back', async () => {
    const releaseDir = path.join(outRoot, RELEASE)
    const next = await runBuilder(['--release', RELEASE, '--offset', '01', '--allow-dirty', '--out', outRoot])
    assert.equal(next.code, 0, next.stderr)
    const manifest = await readManifest(releaseDir)
    assert.equal(manifest.offset, '01')
    assert.equal(manifest.default.path, 'full/01.min.js')
    await fs.access(path.join(releaseDir, 'full/00.min.js'))

    const back = await runBuilder(['--release', RELEASE, '--offset', '00', '--allow-dirty', '--out', outRoot])
    assert.notEqual(back.code, 0)
    assert.match(back.stderr, /never moves back/)
  })

  it('refuses malformed release names and offsets', async () => {
    const badRelease = await runBuilder(['--release', '2026-10-13', '--allow-dirty', '--out', outRoot])
    assert.notEqual(badRelease.code, 0)
    assert.match(badRelease.stderr, /YYYY\.MM\.DD/)
    const badOffset = await runBuilder(['--release', RELEASE, '--offset', '7', '--allow-dirty', '--out', outRoot])
    assert.notEqual(badOffset.code, 0)
    assert.match(badOffset.stderr, /two digits/)
  })

  it('refuses a dirty tree without --allow-dirty, and stamps no dirt on a clean one', async () => {
    const cleanRoot = await makeTempRoot('clean')
    try {
      const run = await runBuilder(['--release', RELEASE, '--out', cleanRoot])
      if (await treeIsDirty()) {
        assert.notEqual(run.code, 0)
        assert.match(run.stderr, /working tree is dirty/)
        await assert.rejects(fs.access(path.join(cleanRoot, RELEASE)))
      } else {
        assert.equal(run.code, 0, run.stderr)
        const manifest = await readManifest(path.join(cleanRoot, RELEASE))
        assert.equal(manifest.dirty, undefined)
      }
    } finally {
      await fs.rm(cleanRoot, { recursive: true, force: true })
    }
  })
})
