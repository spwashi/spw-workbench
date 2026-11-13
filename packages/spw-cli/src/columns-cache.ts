/**
 * Parse columns from the nearest tier that holds them: this process's memory,
 * then a file under .spw/gen/session/columns, then the parser.
 *
 * A file's columns are keyed by the SHA-256 of its text and by a fingerprint of
 * the parser's own source (every non-test .ts under packages/spw-seed/src), so
 * a change to the parser is a change of key: no tree read from disk was made by
 * another parser. Where the parser's source cannot be read (a bundle, a copy),
 * the disk tier is off and only memory is used.
 *
 * The disk form is spw.parse-columns-bytes/1 (seed experimental/columns-bytes):
 * a column read back is copied out of a buffer, not parsed. Measured over this
 * repository's 1,312 tracked surfaces: parsing them took 90.7 s, reading the
 * same columns back from bytes 57 ms.
 */

import { createHash } from 'node:crypto'
import { promises as fs, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { columnsFromBytes, columnsToBytes, parseColumns, type ParseColumns } from '@spwashi/spw-seed'

export type ColumnsTier = 'memory' | 'disk' | 'parsed'

export interface ColumnsCacheStats {
  memory: number
  disk: number
  parsed: number
  written: number
  /** Milliseconds spent getting columns, whichever tier gave them. */
  ms: number
  /** Why the disk tier is off, when it is. */
  diskOff?: string
}

export interface ColumnsCacheOptions {
  /** Directory for the disk tier; absent turns it off. */
  dir?: string | null
  /** read: use the disk tier and never write it; off: memory and the parser only. */
  mode?: 'on' | 'read' | 'off'
}

const memory = new Map<string, ParseColumns | null>()

let fingerprint: string | null | undefined

/** A short hash of the parser's source, or null when it cannot be read from here. */
export function parserFingerprint(): string | null {
  if (fingerprint !== undefined) return fingerprint
  try {
    const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../spw-seed/src')
    const hash = createHash('sha256')
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
          hash.update(path.relative(src, full))
          hash.update(readFileSync(full))
        }
      }
    }
    walk(src)
    fingerprint = hash.digest('hex').slice(0, 16)
  } catch {
    fingerprint = null
  }
  return fingerprint
}

export class ColumnsCache {
  readonly stats: ColumnsCacheStats = { memory: 0, disk: 0, parsed: 0, written: 0, ms: 0 }
  private readonly dir: string | null
  private readonly mode: 'on' | 'read' | 'off'

  constructor(options: ColumnsCacheOptions = {}) {
    this.mode = options.mode ?? 'on'
    const parser = parserFingerprint()
    if (this.mode === 'off') this.stats.diskOff = 'asked off'
    else if (!options.dir) this.stats.diskOff = 'no workspace to keep it in'
    else if (!parser) this.stats.diskOff = 'the parser source is not readable from here, so a parser change could not be told'
    this.dir = this.stats.diskOff ? null : path.join(options.dir!, parser!)
  }

  /** Columns for a text, from the nearest tier that holds them. */
  async get(text: string): Promise<{ tree: ParseColumns | null; tier: ColumnsTier }> {
    const began = performance.now()
    const key = createHash('sha256').update(text).digest('hex').slice(0, 32)
    try {
      if (memory.has(key)) {
        this.stats.memory++
        return { tree: memory.get(key)!, tier: 'memory' }
      }
      const file = this.dir ? path.join(this.dir, `${key}.spwc`) : null
      if (file) {
        const bytes = await fs.readFile(file).catch(() => null)
        if (bytes) {
          try {
            const tree = columnsFromBytes(bytes)
            memory.set(key, tree)
            this.stats.disk++
            return { tree, tier: 'disk' }
          } catch {
            // A file this reader refuses is read as absent and written again.
          }
        }
      }
      const tree = parseColumns(text)
      memory.set(key, tree)
      this.stats.parsed++
      if (file && tree && this.mode === 'on') {
        await fs.mkdir(path.dirname(file), { recursive: true })
        await fs.writeFile(file, columnsToBytes(tree))
        this.stats.written++
      }
      return { tree, tier: 'parsed' }
    } finally {
      this.stats.ms += performance.now() - began
    }
  }

  /** One line saying where the columns came from and what they cost. */
  describe(): string {
    const { memory: m, disk, parsed, written, ms, diskOff } = this.stats
    const tiers = `columns: ${disk} from disk, ${m} from memory, ${parsed} parsed${written ? ` (${written} kept)` : ''} in ${Math.round(ms)} ms`
    return diskOff ? `${tiers}; disk tier off: ${diskOff}` : tiers
  }
}

/** Forget what this process holds, for tests. */
export function clearColumnsMemory(): void {
  memory.clear()
}
