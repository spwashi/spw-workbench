/**
 * Temporary filesystem fixtures for headless CLI / workspace tests.
 * Always cleans up, even when the test body throws.
 */

import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface TempWorkspace {
  /** Absolute path to the temp root. */
  root: string
  /** Resolve a path relative to the temp root. */
  resolve(...segments: string[]): string
  /** Write a UTF-8 file, creating parent directories. */
  writeFile(relativePath: string, contents: string): Promise<string>
  /** Create a directory (recursive). */
  mkdir(relativePath: string): Promise<string>
  /** Read a UTF-8 file relative to the root. */
  readFile(relativePath: string): Promise<string>
  /** Remove the entire temp tree. Idempotent. */
  cleanup(): Promise<void>
}

export interface CreateTempWorkspaceOptions {
  /** Prefix for `fs.mkdtemp` (default `spw-test-`). */
  prefix?: string
  /**
   * Relative path → file contents to materialize immediately.
   * Parent directories are created automatically.
   */
  files?: Record<string, string>
}

/**
 * Create an isolated temp directory. Prefer `withTempWorkspace` so cleanup is automatic.
 */
export async function createTempWorkspace(
  options: CreateTempWorkspaceOptions = {},
): Promise<TempWorkspace> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), options.prefix ?? 'spw-test-'))
  let cleaned = false

  const workspace: TempWorkspace = {
    root,
    resolve: (...segments: string[]) => path.join(root, ...segments),
    async writeFile(relativePath, contents) {
      const abs = path.join(root, relativePath)
      await fs.mkdir(path.dirname(abs), { recursive: true })
      await fs.writeFile(abs, contents, 'utf8')
      return abs
    },
    async mkdir(relativePath) {
      const abs = path.join(root, relativePath)
      await fs.mkdir(abs, { recursive: true })
      return abs
    },
    async readFile(relativePath) {
      return fs.readFile(path.join(root, relativePath), 'utf8')
    },
    async cleanup() {
      if (cleaned) return
      cleaned = true
      await fs.rm(root, { recursive: true, force: true })
    },
  }

  for (const [relativePath, contents] of Object.entries(options.files ?? {})) {
    await workspace.writeFile(relativePath, contents)
  }

  return workspace
}

/**
 * Run a test body against a temp workspace and always clean up.
 */
export async function withTempWorkspace<T>(
  options: CreateTempWorkspaceOptions,
  fn: (ws: TempWorkspace) => Promise<T> | T,
): Promise<T>
export async function withTempWorkspace<T>(
  fn: (ws: TempWorkspace) => Promise<T> | T,
): Promise<T>
export async function withTempWorkspace<T>(
  optionsOrFn: CreateTempWorkspaceOptions | ((ws: TempWorkspace) => Promise<T> | T),
  maybeFn?: (ws: TempWorkspace) => Promise<T> | T,
): Promise<T> {
  const options = typeof optionsOrFn === 'function' ? {} : optionsOrFn
  const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn!
  const ws = await createTempWorkspace(options)
  try {
    return await fn(ws)
  } finally {
    await ws.cleanup()
  }
}

/**
 * Minimal consumer-shaped layout used by mount/workspace navigation tests.
 * Does not install a full workbench package tree — only the paths many CLI
 * discovery paths need to believe a consumer exists.
 */
export async function createMinimalConsumerLayout(
  ws: TempWorkspace,
  options: {
    workspaceSource?: string
    files?: Record<string, string>
  } = {},
): Promise<void> {
  await ws.mkdir('.spw')
  await ws.writeFile('.spw/index.spw', '^"roots"{ @workspace: ~"./workspace.spw" }\n')
  await ws.writeFile(
    '.spw/workspace.spw',
    options.workspaceSource
      ?? [
        '^["roots"]{',
        '  @index: ~"./index.spw"',
        '  @spw: ~"."',
        '}',
        '',
      ].join('\n'),
  )
  await ws.writeFile('.spw/mount.spw', '# test mount\n')
  for (const [relativePath, contents] of Object.entries(options.files ?? {})) {
    await ws.writeFile(relativePath, contents)
  }
}
