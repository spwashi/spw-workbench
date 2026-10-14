import { createHash } from 'node:crypto'
import path from 'node:path'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'
import { sha256Hex, sha256HexBytes, utf8ByteLength } from './content-hash'

const node = (text: string): string => createHash('sha256').update(text).digest('hex')

describe('content hash', () => {
  it('matches node:crypto sha256 on known vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('matches node:crypto on every length across the padding boundaries', () => {
    for (let n = 0; n <= 130; n++) {
      const text = 'x'.repeat(n)
      expect(sha256Hex(text), `length ${n}`).toBe(node(text))
    }
  })

  it('hashes UTF-8 bytes, so accents, CJK, and astral characters match node:crypto', () => {
    for (const text of ['été — naïve', '日本語のテキスト', '😀 #>anchor 🧪', 'a\u0000b', '~#lens(living system)']) {
      expect(sha256Hex(text), text).toBe(node(text))
      expect(utf8ByteLength(text), text).toBe(Buffer.byteLength(text, 'utf8'))
    }
  })

  it('matches node:crypto on a large input and on raw bytes', () => {
    const big = '^["frame"]{ key: "value" }\n'.repeat(40_000)
    expect(sha256Hex(big)).toBe(node(big))
    const bytes = new Uint8Array([0, 255, 128, 64, 1])
    expect(sha256HexBytes(bytes)).toBe(createHash('sha256').update(bytes).digest('hex'))
  })
})

describe('seed in a browser', () => {
  it('bundles the whole seed index for a browser with no node built-in', async () => {
    const rootDir = path.resolve(__dirname, '../../../..')
    const result = await build({
      entryPoints: [path.join(rootDir, 'packages/spw-seed/src/index.ts')],
      absWorkingDir: rootDir,
      bundle: true,
      platform: 'browser',
      format: 'esm',
      write: false,
      logLevel: 'silent',
    })
    expect(result.outputFiles[0]!.text).not.toMatch(/from\s*["']node:/)
  })
})
