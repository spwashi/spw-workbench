/**
 * Keep a bundle's sources inside the tree it is built from.
 *
 * A workspace package imported by name (@spwashi/spw-seed) resolves through
 * node_modules, and node_modules holds links into whichever checkout ran
 * npm install. Built from a checkout nested in another (a worktree under
 * .claude/worktrees/, say), a name walks up to the outer checkout's links and
 * bundles the outer tree's source beside the inner one's: two copies of the
 * same modules, one of them not at the revision the manifest names. Every
 * 2026.11.13 prerelease's workbench bundle carried 95 to 104 seed files twice
 * this way.
 *
 * workspaceInRoot resolves every @spwashi/<package>[/<subpath>] through that
 * package's own exports map under the build root, so where the tree sits no
 * longer matters; overrides substitute one exact name (the reader variant
 * reads seed as its browser-safe slice). outsideRoot lists the inputs of a
 * build that still came from outside the root, so a builder can refuse them.
 */

import type { Metafile, Plugin } from 'esbuild'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface WorkspacePackage {
  /** The package's directory, relative to the root: packages/spw-seed. */
  dir: string
  /** Its exports map: "." and "./parser" to paths relative to dir. */
  exports: Readonly<Record<string, string>>
}

const SCOPE = '@spwashi/'

/** Every package under packages/ by name, with its exports. A package with no exports map exports ./src/index.ts as ".". */
export async function readWorkspacePackages(rootDir: string): Promise<Map<string, WorkspacePackage>> {
  const packages = new Map<string, WorkspacePackage>()
  const dirs = await fs.readdir(path.join(rootDir, 'packages'), { withFileTypes: true })
  for (const entry of dirs) {
    if (!entry.isDirectory()) continue
    const dir = path.join('packages', entry.name)
    let manifest: { name?: string; exports?: unknown }
    try {
      manifest = JSON.parse(await fs.readFile(path.join(rootDir, dir, 'package.json'), 'utf8'))
    } catch {
      continue
    }
    if (!manifest.name?.startsWith(SCOPE)) continue
    const exports =
      typeof manifest.exports === 'string'
        ? { '.': manifest.exports }
        : manifest.exports && typeof manifest.exports === 'object'
          ? Object.fromEntries(Object.entries(manifest.exports as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'))
          : { '.': './src/index.ts' }
    packages.set(manifest.name, { dir, exports })
  }
  return packages
}

/** Where a workspace import resolves under the root, or why it does not: null when the name is not a workspace package. */
export function resolveWorkspaceImport(
  specifier: string,
  rootDir: string,
  packages: ReadonlyMap<string, WorkspacePackage>,
  overrides: Readonly<Record<string, string>> = {},
): { path: string } | { error: string } | null {
  if (!specifier.startsWith(SCOPE)) return null
  const override = overrides[specifier]
  if (override) return { path: path.resolve(rootDir, override) }
  const match = specifier.match(/^(@spwashi\/[^/]+)(\/.+)?$/)
  if (!match) return null
  const pkg = packages.get(match[1]!)
  if (!pkg) return null
  const subpath = `.${match[2] ?? ''}`
  const target = pkg.exports[subpath]
  if (!target) return { error: `${specifier}: ${match[1]} exports no ${subpath}` }
  return { path: path.resolve(rootDir, pkg.dir, target) }
}

/** An esbuild plugin that resolves workspace package names inside the root. */
export function workspaceInRoot(
  rootDir: string,
  packages: ReadonlyMap<string, WorkspacePackage>,
  overrides: Readonly<Record<string, string>> = {},
): Plugin {
  return {
    name: 'spw-workspace-in-root',
    setup(build) {
      build.onResolve({ filter: /^@spwashi\// }, (args) => {
        const resolved = resolveWorkspaceImport(args.path, rootDir, packages, overrides)
        if (!resolved) return undefined
        if ('error' in resolved) return { errors: [{ text: resolved.error }] }
        return { path: resolved.path }
      })
    },
  }
}

/**
 * The inputs of a build that came from outside its working directory, other than installed dependencies:
 * metafile inputs are relative to the working directory, so these start with "..". A dependency installed in an
 * enclosing checkout's node_modules is allowed; source reached through a link into another tree is not.
 */
export function outsideRoot(metafile: Metafile): string[] {
  return Object.keys(metafile.inputs).filter((input) => input.startsWith('../') && !input.split('/').includes('node_modules'))
}
