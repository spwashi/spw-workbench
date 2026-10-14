/**
 * The reader reads a file as the editor does, and stays browser-safe.
 *
 * reader.ts is what the parser release ships as reader.min.js. Its role stream
 * must be the editor's role stream token for token, and it must bundle for a
 * browser with seed narrowed to its reader slice — a node built-in reaching it
 * fails here, before a release is cut.
 */

import path from 'node:path'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'
import { anchors, highlightHtml, roles } from '../reader'
import { SEMANTIC_TOKENS_LEGEND, semanticTokens } from '../handlers/semantic-tokens'
import type { HandlerDeps } from '../types'

const rootDir = path.resolve(__dirname, '../../../..')

const PLAN = [
  '^["commits"]{',
  ' .[landed](a124b66a): "&[plans] — landed in a124b66a"',
  ' ~[planned]: "cites 3635905ec3dbeece and 0f0bso"',
  '}',
].join('\n')

const SURFACE = [
  '#>door',
  '^["door"]{ hinge: "<oak>" }',
  '~#lens(living system) #:layer #!pragmatics',
  '@tree#src_x ~"./tmp.spw#door" 16px',
].join('\n')

/** What the server sends for a file, decoded into the reader's shape. */
function served(text: string, filePath: string): ReturnType<typeof roles> {
  const deps = { serverIndex: { getDocument: () => ({ text, filePath }) } } as unknown as HandlerDeps
  const { data } = semanticTokens({ textDocument: { uri: 'file:///x.spw' } } as never, deps)
  const out: ReturnType<typeof roles> = []
  let line = 0
  let char = 0
  for (let i = 0; i < data.length; i += 5) {
    line += data[i]!
    char = data[i] === 0 ? char + data[i + 1]! : data[i + 1]!
    out.push({
      line,
      char,
      length: data[i + 2]!,
      role: SEMANTIC_TOKENS_LEGEND.tokenTypes[data[i + 3]!]!,
      modifiers: SEMANTIC_TOKENS_LEGEND.tokenModifiers.filter((_, bit) => (data[i + 4]! & (1 << bit)) !== 0),
    })
  }
  return out
}

describe('the reader', () => {
  it('reads the same roles the server sends, plan streams included', () => {
    expect(roles(SURFACE)).toEqual(served(SURFACE, 'notes/surface.spw'))
    const planPath = '.agents/plans/example/wip.spw'
    const planRoles = roles(PLAN, { path: planPath })
    expect(planRoles).toEqual(served(PLAN, planPath))
    expect(planRoles.some((span) => span.role === 'commitRef')).toBe(true)
    expect(planRoles.some((span) => span.role === 'hashlike')).toBe(true)
  })

  it('lists anchors where the parser binds them, 0-based', () => {
    expect(anchors(SURFACE)).toEqual([{ name: 'door', line: 0, char: 0 }])
    expect(anchors('')).toEqual([])
  })

  it('writes HTML whose text, unescaped, is the file', () => {
    const html = highlightHtml(SURFACE)
    expect(html).toContain('<span class="spw-keyword spw-declaration">^</span>')
    const text = html
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    expect(text).toBe(SURFACE)
  })

  it('bundles for a browser with seed narrowed to its reader slice', async () => {
    const result = await build({
      entryPoints: [path.join(rootDir, 'packages/spw-lsp/src/reader.ts')],
      absWorkingDir: rootDir,
      bundle: true,
      platform: 'browser',
      format: 'esm',
      write: false,
      logLevel: 'silent',
      alias: { '@spwashi/spw-seed': './packages/spw-seed/src/reader.ts' },
    })
    const code = result.outputFiles[0]!.text
    expect(code).not.toMatch(/from\s*["']node:/)
  })
})
