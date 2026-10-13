/**
 * Stream entries across the repository: every line-start `>>[…]` entry parses
 * with no error on its line, in the dialect its own path gives it. Plan files,
 * saga templates, prompt logs and docs examples all write entries; none of
 * them should depend on being a plan file for a sentence to read as one.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from './parse'

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url))
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'dist-ssr', 'release', 'build', '.claude', '_workbench'])
const ENTRY_LINE = /^[\t ]*>>\[/

async function collectSpw(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await collectSpw(path.join(dir, entry.name), out)
    } else if (entry.isFile() && entry.name.endsWith('.spw')) {
      out.push(path.join(dir, entry.name))
    }
  }
  return out
}

describe('stream entries in the repository', () => {
  it('parse with no error on any entry line, in every dialect', async () => {
    const failures: string[] = []
    let entries = 0
    for (const file of await collectSpw(REPO_ROOT)) {
      const source = await fs.readFile(file, 'utf8')
      const lines = source.split('\n')
      const entryLines = new Set(lines.flatMap((line, index) => (ENTRY_LINE.test(line) ? [index + 1] : [])))
      if (entryLines.size === 0) continue
      entries += entryLines.size
      const rel = path.relative(REPO_ROOT, file)
      for (const error of parse(source, { path: rel }).errors) {
        const line = error.position.line
        if (entryLines.has(line)) failures.push(`${rel}:${line}  ${lines[line - 1]!.trim().slice(0, 80)}`)
      }
    }
    expect(entries).toBeGreaterThan(0)
    expect([...new Set(failures)]).toEqual([])
  }, 60_000)
})
