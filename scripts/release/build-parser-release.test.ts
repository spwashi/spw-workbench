/**
 * Parser release builder — `npm run test:parser-release`.
 *
 * Runs the real command (`scripts/release/build-parser-release.ts`) into temp
 * directories with --allow-dirty and holds what it writes to the
 * spw.parser-release/2 contract: manifest digests match the files, parser.js is
 * the default bytes, every stamp names the manifest revision, the full bundle
 * parses, the lite bundle scans, the reader bundle reads a file as the editor does, a published day never changes, and
 * prereleases and patches are numbered by their day.
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

describe('release name validation', () => {
  it('accepts calendar days as YYYY.MM.DD', () => {
    assert.equal(validateReleaseName('2026.10.13'), null)
    assert.equal(validateReleaseName('2028.02.29'), null)
  })

  it('rejects other shapes and impossible dates', () => {
    for (const bad of ['2026-10-13', '26.10.13', '2026.1.13', '2026.13.01', '2026.02.30', '2026.10.13.1', '']) {
      assert.notEqual(validateReleaseName(bad), null, bad)
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
    const run = await runBuilder(['--release', RELEASE, '--allow-dirty', '--out', outRoot])
    assert.equal(run.code, 0, run.stderr)
    manifest = await readManifest(releaseDir)
  })

  after(async () => {
    if (outRoot) await fs.rm(outRoot, { recursive: true, force: true })
  })

  it('writes the spw.parser-release/2 manifest shape', async () => {
    const rootPackage = JSON.parse(await fs.readFile(path.join(rootDir, 'package.json'), 'utf8'))
    const seedPackage = JSON.parse(await fs.readFile(path.join(rootDir, 'packages/spw-seed/package.json'), 'utf8'))
    assert.equal(manifest.schema, PARSER_RELEASE_SCHEMA)
    assert.equal(manifest.name, RELEASE)
    assert.equal(manifest.kind, 'release')
    assert.equal(manifest.day, RELEASE)
    assert.equal(manifest.pre, undefined)
    assert.equal(manifest.workbench.package, 'spw-workbench')
    assert.equal(manifest.workbench.version, rootPackage.version)
    assert.match(manifest.workbench.revision, /^[0-9a-f]{40}$/)
    assert.equal(manifest.grammar, seedPackage.version)
    assert.deepEqual(manifest.default, { variant: 'full', form: 'min', path: 'parser.js' })
    assert.equal(manifest.dirty, (await treeIsDirty()) ? true : undefined)
    assert.deepEqual(
      manifest.files.map((file) => file.path),
      [
        'full.min.js',
        'full.debug.js',
        'full.debug.js.map',
        'lite.min.js',
        'lite.debug.js',
        'lite.debug.js.map',
        'reader.min.js',
        'reader.debug.js',
        'reader.debug.js.map',
        'parser.js',
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

  it('makes parser.js the default file byte for byte', async () => {
    const alias = manifest.files.find((file) => file.path === 'parser.js')
    assert.ok(alias && 'alias' in alias)
    assert.equal(alias.alias, 'full.min.js')
    const aliasBytes = await fs.readFile(path.join(releaseDir, 'parser.js'))
    const defaultBytes = await fs.readFile(path.join(releaseDir, 'full.min.js'))
    assert.ok(aliasBytes.equals(defaultBytes))
  })

  it('stamps every script with the manifest revision, release name, variant and form', async () => {
    const scripts = manifest.files.filter((file) => file.path.endsWith('.js'))
    assert.equal(scripts.length, 7)
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
      assert.equal(stamp.prerelease, undefined)
      assert.equal(stamp.variant, expected.variant, `${file.path} variant`)
      assert.equal(stamp.form, expected.form, `${file.path} form`)
      assert.equal(stamp.dirty, manifest.dirty, `${file.path} dirty`)
    }
  })

  it('full.min.js parses ~door through its exported parse', async () => {
    const full = await importBundle<{
      parse: (source: string) => { success: boolean }
      parseExpression: unknown
    }>(path.join(releaseDir, 'full.min.js'))
    assert.equal(typeof full.parseExpression, 'function')
    assert.equal(full.parse('~door').success, true)
  })

  it('lite exports its scanner and scans door[closed]{hinge, key}', async () => {
    for (const form of ['min', 'debug']) {
      const lite = await importBundle<{
        scan: (source: string) => Array<{ kind: string; value: string; bound?: string }>
        scanGeometry: unknown
        SPW_OPERATORS: readonly string[]
      }>(path.join(releaseDir, `lite.${form}.js`))
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

  it('reader reads a frame the way the editor does: roles, outline, anchors and HTML', async () => {
    for (const form of ['min', 'debug']) {
      const reader = await importBundle<{
        roles: (text: string) => Array<{ line: number; char: number; length: number; role: string; modifiers: string[] }>
        outline: (text: string) => Array<{ name: string }>
        anchors: (text: string) => Array<{ name: string; line: number; char: number }>
        highlightHtml: (text: string) => string
        parse: (text: string) => { success: boolean }
      }>(path.join(releaseDir, `reader.${form}.js`))
      const text = '#>door\n^["door"]{ hinge: "<oak>" }'
      assert.equal(reader.parse(text).success, true)
      const roles = reader.roles(text)
      assert.ok(roles.some((span) => span.role === 'keyword' && span.line === 1 && span.char === 0), 'the ^ of the frame is a keyword')
      assert.ok(roles.some((span) => span.role === 'operator' && span.modifiers.includes('declaration')), 'an opening bracket is a declaring operator')
      assert.ok(roles.some((span) => span.role === 'string' && span.line === 1), 'the value is a string')
      assert.deepEqual(reader.anchors(text), [{ name: 'door', line: 0, char: 0 }])
      assert.ok(reader.outline(text).length > 0, 'the outline names the frame')
      const html = reader.highlightHtml(text)
      assert.match(html, /<span class="spw-keyword spw-declaration">\^<\/span>/)
      assert.ok(html.includes('&lt;oak&gt;'), 'text inside a span is escaped')
      assert.equal(html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'), text)
    }
  })

  it('links debug forms to sibling maps with repo-relative sources and leaves min forms unmapped', async () => {
    for (const variant of ['full', 'lite', 'reader']) {
      const debug = await fs.readFile(path.join(releaseDir, `${variant}.debug.js`), 'utf8')
      assert.match(debug, new RegExp(`\\n//# sourceMappingURL=${variant}\\.debug\\.js\\.map\\n?$`))
      const map = JSON.parse(await fs.readFile(path.join(releaseDir, `${variant}.debug.js.map`), 'utf8'))
      assert.ok((map.sources as string[]).some((source) => source.startsWith('packages/spw-seed/src/')))
      const min = await fs.readFile(path.join(releaseDir, `${variant}.min.js`), 'utf8')
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

  it('re-runs an identical cut as a no-op, then refuses to change a published day', async () => {
    const args = ['--release', RELEASE, '--allow-dirty', '--out', outRoot]
    assert.equal((await runBuilder(args)).code, 0)
    const releaseDir = path.join(outRoot, RELEASE)
    const firstManifest = await fs.readFile(path.join(releaseDir, 'manifest.json'))

    const again = await runBuilder(args)
    assert.equal(again.code, 0, again.stderr)
    assert.ok(firstManifest.equals(await fs.readFile(path.join(releaseDir, 'manifest.json'))))

    const tamperedPath = path.join(releaseDir, 'lite.debug.js')
    const original = await fs.readFile(tamperedPath)
    await fs.appendFile(tamperedPath, '\n// tampered\n')
    const refused = await runBuilder(args)
    await fs.writeFile(tamperedPath, original)
    assert.notEqual(refused.code, 0)
    assert.match(refused.stderr, /already published/)
    assert.match(refused.stderr, /lite\.debug\.js/)
    assert.match(refused.stderr, /--patch --target 2026\.10\.13/)
  })

  it('refuses malformed release names and the old offset flag', async () => {
    const badRelease = await runBuilder(['--release', '2026-10-13', '--allow-dirty', '--out', outRoot])
    assert.notEqual(badRelease.code, 0)
    assert.match(badRelease.stderr, /YYYY\.MM\.DD/)
    const offset = await runBuilder(['--release', RELEASE, '--offset', '01', '--allow-dirty', '--out', outRoot])
    assert.notEqual(offset.code, 0)
    assert.match(offset.stderr, /unknown argument/)
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

describe('bundle:parser --pre', () => {
  const TARGET = '2026.10.26'
  let outRoot: string
  let revision: string

  before(async () => {
    outRoot = await makeTempRoot('pre')
    revision = (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: rootDir })).stdout.trim()
  })

  after(async () => {
    await fs.rm(outRoot, { recursive: true, force: true })
  })

  it('names a prerelease for its target day and numbers it, with prerelease manifest and stamps', async () => {
    const run = await runBuilder(['--pre', '--target', TARGET, '--allow-dirty', '--out', outRoot])
    assert.equal(run.code, 0, run.stderr)
    const name = `${TARGET}-pre.1`
    const manifest = await readManifest(path.join(outRoot, name))
    assert.equal(manifest.name, name)
    assert.equal(manifest.kind, 'prerelease')
    assert.equal(manifest.day, TARGET)
    assert.equal(manifest.pre, 1)
    assert.equal(manifest.workbench.revision, revision)
    const full = await import(pathToFileURL(path.join(outRoot, name, 'full.min.js')).href)
    const stamp = full.SPW_PARSER_BUILD as ParserBuildStamp
    assert.equal(stamp.release, name)
    assert.equal(stamp.prerelease, true)
    assert.equal(full.parse('~door').success, true)
    const alias = await fs.readFile(path.join(outRoot, name, 'parser.js'))
    assert.ok(alias.equals(await fs.readFile(path.join(outRoot, name, 'full.min.js'))))
  })

  it('keeps the same number for the same revision, and takes the next one after another revision', async () => {
    const again = await runBuilder(['--pre', '--target', TARGET, '--allow-dirty', '--out', outRoot])
    assert.equal(again.code, 0, again.stderr)
    await assert.rejects(fs.access(path.join(outRoot, `${TARGET}-pre.2`)))

    const other = path.join(outRoot, `${TARGET}-pre.1`, 'manifest.json')
    const manifest = JSON.parse(await fs.readFile(other, 'utf8'))
    manifest.workbench.revision = '0'.repeat(40)
    await fs.writeFile(other, JSON.stringify(manifest))
    const next = await runBuilder(['--pre', '--target', TARGET, '--allow-dirty', '--out', outRoot])
    assert.equal(next.code, 0, next.stderr)
    assert.equal((await readManifest(path.join(outRoot, `${TARGET}-pre.2`))).pre, 2)
  })

  it('refuses --pre without --target, --release beside --pre, a malformed target, and --target alone', async () => {
    for (const args of [
      ['--pre'],
      ['--pre', '--target', TARGET, '--release', RELEASE],
      ['--pre', '--target', '2026.13.40'],
      ['--release', RELEASE, '--target', TARGET],
    ]) {
      const run = await runBuilder([...args, '--allow-dirty', '--out', outRoot])
      assert.notEqual(run.code, 0, args.join(' '))
    }
  })
})

describe('bundle:parser --patch', () => {
  const DAY = '2026.10.27'
  let outRoot: string

  before(async () => {
    outRoot = await makeTempRoot('patch')
  })

  after(async () => {
    await fs.rm(outRoot, { recursive: true, force: true })
  })

  it('names a patch for the day it fixes, with patch manifest and stamps', async () => {
    const run = await runBuilder(['--patch', '--target', DAY, '--allow-dirty', '--out', outRoot])
    assert.equal(run.code, 0, run.stderr)
    const name = `${DAY}-patch.1`
    const manifest = await readManifest(path.join(outRoot, name))
    assert.equal(manifest.name, name)
    assert.equal(manifest.kind, 'patch')
    assert.equal(manifest.day, DAY)
    assert.equal(manifest.patch, 1)
    assert.equal(manifest.pre, undefined)
    const full = await import(pathToFileURL(path.join(outRoot, name, 'full.min.js')).href)
    const stamp = full.SPW_PARSER_BUILD as ParserBuildStamp
    assert.equal(stamp.release, name)
    assert.equal(stamp.patch, true)
    assert.equal(stamp.prerelease, undefined)
  })

  it('numbers patches apart from prereleases of the same day', async () => {
    const pre = await runBuilder(['--pre', '--target', DAY, '--allow-dirty', '--out', outRoot])
    assert.equal(pre.code, 0, pre.stderr)
    assert.equal((await readManifest(path.join(outRoot, `${DAY}-pre.1`))).kind, 'prerelease')
    const again = await runBuilder(['--patch', '--target', DAY, '--allow-dirty', '--out', outRoot])
    assert.equal(again.code, 0, again.stderr)
    await assert.rejects(fs.access(path.join(outRoot, `${DAY}-patch.2`)))
  })

  it('refuses --patch without --target, --release beside --patch, and --pre with --patch', async () => {
    for (const args of [
      ['--patch'],
      ['--patch', '--target', DAY, '--release', DAY],
      ['--pre', '--patch', '--target', DAY],
    ]) {
      const run = await runBuilder([...args, '--allow-dirty', '--out', outRoot])
      assert.notEqual(run.code, 0, args.join(' '))
    }
  })
})
