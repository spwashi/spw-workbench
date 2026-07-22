/**
 * Canonicalization Utilities
 *
 * Normalizes Spw source for hashing and comparison.
 * This is intentionally deterministic and portable (no Node-only crypto).
 *
 * Formatting capabilities (opt-in):
 *   indentBraces           — auto-indent by brace depth (string-safe)
 *   alignComments          — align trailing # comments to a consistent column
 *   blankLineBetweenFrames — ensure exactly one blank line between ^["..."]{ } blocks
 *   reflowProse            — wrap block-level `#` prose to printWidth
 *   migrateSlashComments   — rewrite borrowed `//` line comments to `#` light
 */

export interface CanonicalOptions {
  /** Normalize all line endings to \n */
  normalizeNewlines: boolean
  /** Trim trailing whitespace on each line */
  trimTrailingWhitespace: boolean
  /** Ensure the file ends with a single newline */
  ensureFinalNewline: boolean
  /** Collapse runs of blank lines to at most one */
  collapseBlankLines: boolean
  /** Auto-indent content inside { } based on brace depth */
  indentBraces: boolean
  /** Spaces per indent level (default: 2) */
  indentSize: number
  /** Align trailing # comments to a consistent column per block */
  alignComments: boolean
  /** Minimum column for aligned trailing comments (default: 40) */
  commentColumn: number
  /** Ensure exactly one blank line between top-level ^[...]{} frames */
  blankLineBetweenFrames: boolean
  /**
   * Reflow consecutive block-level `#` prose to printWidth.
   * Does not touch `#>` / `#:` / `#!` / `##` directives or code.
   * Spw culture: prefer `#` light — do not teach `//` as native comment.
   */
  reflowProse: boolean
  /** Wrap column for prose reflow (default: 88) */
  printWidth: number
  /**
   * Convert borrowed `// …` line comments to `# …` Spw light.
   * Does not convert `/* … *\/` block comments (also slash-lore; leave for later dialect).
   */
  migrateSlashComments: boolean
}

export interface CanonicalResult {
  source: string
  hash: string
}

/** Named bundles for CLI / pulse profiles. */
export type FormatProfileId = 'canonical' | 'pretty' | 'layout' | 'prose' | 'culture'

export const FORMAT_PROFILES: Record<FormatProfileId, Partial<CanonicalOptions>> = {
  /** Whitespace hygiene only (CLI default historically) */
  canonical: {
    normalizeNewlines: true,
    trimTrailingWhitespace: true,
    ensureFinalNewline: true,
    collapseBlankLines: false,
    indentBraces: false,
    alignComments: false,
    blankLineBetweenFrames: false,
    reflowProse: false,
    migrateSlashComments: false,
  },
  /** Readable authoring: indent + frame spacing + `#` prose wrap */
  pretty: {
    normalizeNewlines: true,
    trimTrailingWhitespace: true,
    ensureFinalNewline: true,
    collapseBlankLines: true,
    indentBraces: true,
    indentSize: 2,
    alignComments: false,
    blankLineBetweenFrames: true,
    reflowProse: true,
    printWidth: 88,
    migrateSlashComments: false,
  },
  /** Structure layout without rewriting prose paragraphs */
  layout: {
    normalizeNewlines: true,
    trimTrailingWhitespace: true,
    ensureFinalNewline: true,
    collapseBlankLines: true,
    indentBraces: true,
    indentSize: 2,
    alignComments: true,
    commentColumn: 40,
    blankLineBetweenFrames: true,
    reflowProse: false,
    migrateSlashComments: false,
  },
  /** Prose-focused: wrap `#` light; hygiene; no re-indent */
  prose: {
    normalizeNewlines: true,
    trimTrailingWhitespace: true,
    ensureFinalNewline: true,
    collapseBlankLines: true,
    indentBraces: false,
    blankLineBetweenFrames: false,
    alignComments: false,
    reflowProse: true,
    printWidth: 88,
    migrateSlashComments: false,
  },
  /**
   * Cultural cleanup: pretty + migrate borrowed `//` → `#` light.
   * Use for anatomy promotion; avoid on #:desk #!challenge without intent.
   */
  culture: {
    normalizeNewlines: true,
    trimTrailingWhitespace: true,
    ensureFinalNewline: true,
    collapseBlankLines: true,
    indentBraces: true,
    indentSize: 2,
    alignComments: false,
    blankLineBetweenFrames: true,
    reflowProse: true,
    printWidth: 88,
    migrateSlashComments: true,
  },
}

const DEFAULT_OPTIONS: CanonicalOptions = {
  normalizeNewlines: true,
  trimTrailingWhitespace: true,
  ensureFinalNewline: true,
  collapseBlankLines: false,
  indentBraces: false,
  indentSize: 2,
  alignComments: false,
  commentColumn: 40,
  blankLineBetweenFrames: false,
  reflowProse: false,
  printWidth: 88,
  migrateSlashComments: false,
}

export function resolveFormatProfile(
  profile: FormatProfileId | string,
  overrides: Partial<CanonicalOptions> = {},
): CanonicalOptions {
  const base = FORMAT_PROFILES[profile as FormatProfileId] ?? FORMAT_PROFILES.canonical
  return { ...DEFAULT_OPTIONS, ...base, ...overrides }
}

// ── String-safe brace tracking ─────────────────────────────────

interface BraceStatsResult {
  delta: number
  opensOnLine: boolean
  closesOnLine: boolean
  bracketDelta: number
  bracketOpens: boolean
  bracketCloses: boolean
}

/**
 * Count net brace/bracket delta on a line, ignoring those inside strings.
 */
function braceStats(line: string): BraceStatsResult {
  let delta = 0
  let opensOnLine = false
  let closesOnLine = false
  let bracketDelta = 0
  let bracketOpens = false
  let bracketCloses = false
  let inString: string | false = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    // Track string boundaries (double-quote, single-quote, backtick)
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch
      continue
    }
    if (inString && ch === inString && line[i - 1] !== '\\') {
      inString = false
      continue
    }
    if (inString) continue

    // Line comment — stop scanning
    if (ch === '/' && line[i + 1] === '/') break

    if (ch === '{') { delta++; opensOnLine = true }
    if (ch === '}') { delta--; closesOnLine = true }
    if (ch === '[') { bracketDelta++; bracketOpens = true }
    if (ch === ']') { bracketDelta--; bracketCloses = true }
  }

  return { delta, opensOnLine, closesOnLine, bracketDelta, bracketOpens, bracketCloses }
}

/**
 * Determine if a line is a "frame header" — starts a new top-level
 * ^["name"]{ or ^"name"{ or ^[Name]{ block.
 */
function isFrameHeader(line: string): boolean {
  return /^\s*\^(?:\["[^"]*"\]|"[^"]*"|\[[A-Za-z_]\w*\])\s*\{/.test(line)
}

// ── Comment alignment ──────────────────────────────────────────

/**
 * Split a line into content and trailing comment, respecting strings.
 * Returns [content, comment] where comment includes the leading `# `.
 * Returns [line, null] if there's no trailing comment.
 */
function splitTrailingComment(line: string): [string, string | null] {
  let inString: string | false = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch
      continue
    }
    if (inString && ch === inString && line[i - 1] !== '\\') {
      inString = false
      continue
    }
    if (inString) continue

    // Line comment: // — not a trailing Spw comment, skip
    if (ch === '/' && line[i + 1] === '/') return [line, null]

    // Trailing # comment (must be preceded by whitespace)
    if (ch === '#' && i > 0 && /\s/.test(line[i - 1])) {
      // But not annotation-like (#>, #:, #!, or #word at line start)
      const afterHash = line[i + 1]
      if (afterHash === '>' || afterHash === ':' || afterHash === '!') continue
      // It's a trailing comment
      const content = line.slice(0, i).replace(/\s+$/, '')
      const comment = line.slice(i)
      return [content, comment]
    }
  }

  return [line, null]
}

/**
 * Align trailing comments within a group of consecutive commented lines.
 * Each group is aligned independently (groups are separated by uncommented lines).
 */
function alignCommentsInBlock(lines: string[], minColumn: number): string[] {
  const result: string[] = []
  let group: Array<{ index: number; content: string; comment: string }> = []

  function flushGroup(): void {
    if (group.length === 0) return
    // Find the max content width in this group
    const maxWidth = Math.max(minColumn, ...group.map(g => g.content.length + 2))
    for (const g of group) {
      result[g.index] = g.content.padEnd(maxWidth) + g.comment
    }
    group = []
  }

  for (let i = 0; i < lines.length; i++) {
    const [content, comment] = splitTrailingComment(lines[i])
    if (comment) {
      group.push({ index: i, content, comment })
      result.push(lines[i]) // placeholder, will be overwritten by flush
    } else {
      flushGroup()
      result.push(lines[i])
    }
  }
  flushGroup()

  return result
}

// ── Block-level prose reflow ───────────────────────────────────

interface ProseLine {
  indent: string
  text: string
}

/**
 * True for reflowable Spw document light (`#` prose) — not directives, not `//`.
 * Culture: `/` has no operator lore yet; do not treat `//` as native Spw comment.
 */
export function isProseCommentLine(line: string): boolean {
  const t = line.trimStart()
  if (!t.startsWith('#')) return false
  // Directives: #>, #:, #! — never reflow
  if (/^#(?:>|:|!)/.test(t)) return false
  // ## meta-stratum — leave alone (hash-resonance.spw)
  if (/^##/.test(t)) return false
  // Bare `#`, `# prose`, or `#Heading` style titles
  return true
}

/** Borrowed C-style line comment (lexer recovery only; not Spw culture). */
export function isSlashLineComment(line: string): boolean {
  return /^\s*\/\//.test(line)
}

/**
 * Convert `// …` lines to `# …` Spw light. String-safe enough for line-leading only.
 */
export function migrateSlashCommentsToHash(source: string): string {
  return source
    .split('\n')
    .map(line => {
      const m = line.match(/^(\s*)\/\/\s?(.*)$/)
      if (!m) return line
      const indent = m[1] ?? ''
      const text = m[2] ?? ''
      return text === '' ? `${indent}#` : `${indent}# ${text}`
    })
    .join('\n')
}

function parseProseLine(line: string): ProseLine | null {
  if (!isProseCommentLine(line)) return null
  const indentMatch = line.match(/^(\s*)/)
  const indent = indentMatch?.[1] ?? ''
  const body = line.slice(indent.length)
  const text = body === '#' ? '' : body.slice(1).replace(/^\s?/, '')
  return { indent, text }
}

/**
 * Wrap words to width; empty text → empty paragraph (caller may emit marker-only).
 */
export function wrapWords(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (!cur) {
      cur = w
      continue
    }
    if (cur.length + 1 + w.length <= width) {
      cur = `${cur} ${w}`
    } else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

/**
 * Reflow consecutive prose comment lines sharing indent + marker.
 * Does not reflow inside code / string-heavy lines.
 */
export function reflowProseBlocks(source: string, printWidth: number): string {
  const lines = source.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const parsed = parseProseLine(lines[i]!)
    if (!parsed) {
      out.push(lines[i]!)
      i++
      continue
    }

    // Collect block of `#` light at same indent
    const block: ProseLine[] = [parsed]
    let j = i + 1
    while (j < lines.length) {
      const next = parseProseLine(lines[j]!)
      if (!next || next.indent !== parsed.indent) break
      block.push(next)
      j++
    }

    // Split block into paragraphs on empty prose lines
    const paragraphs: ProseLine[][] = []
    let para: ProseLine[] = []
    for (const pl of block) {
      if (pl.text.trim() === '') {
        if (para.length) {
          paragraphs.push(para)
          para = []
        }
        paragraphs.push([pl]) // keep blank marker line
      } else {
        para.push(pl)
      }
    }
    if (para.length) paragraphs.push(para)

    const prefix = `${parsed.indent}#`
    const contentWidth = Math.max(20, printWidth - prefix.length - 1)

    for (const p of paragraphs) {
      if (p.length === 1 && p[0]!.text.trim() === '') {
        out.push(`${parsed.indent}#`)
        continue
      }
      const joined = p.map(x => x.text.trim()).filter(Boolean).join(' ')
      const wrapped = wrapWords(joined, contentWidth)
      for (const w of wrapped) {
        out.push(w === '' ? `${parsed.indent}#` : `${parsed.indent}# ${w}`)
      }
    }

    i = j
  }

  return out.join('\n')
}

// ── Main canonicalize ───────────────────────────────────────────

/**
 * Deterministically normalize and hash source.
 */
export function canonicalize(
  input: string,
  options: Partial<CanonicalOptions> = {}
): CanonicalResult {
  const opts: CanonicalOptions = { ...DEFAULT_OPTIONS, ...options }

  let normalized = input

  // 1. Normalize line endings
  if (opts.normalizeNewlines) {
    normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  }

  // 2. Trim trailing whitespace
  if (opts.trimTrailingWhitespace) {
    normalized = normalized
      .split('\n')
      .map(line => line.replace(/\s+$/g, ''))
      .join('\n')
  }

  // 2a. Cultural migration: borrowed // → # light (before reflow)
  if (opts.migrateSlashComments) {
    normalized = migrateSlashCommentsToHash(normalized)
  }

  // 2b. Block-level `#` prose reflow (before indent so widths are stable)
  if (opts.reflowProse) {
    normalized = reflowProseBlocks(normalized, opts.printWidth)
  }

  // 3. Brace-depth indentation (with bracket continuation)
  if (opts.indentBraces) {
    const indent = ' '.repeat(opts.indentSize)
    const lines = normalized.split('\n')
    const out: string[] = []
    let depth = 0
    let bracketDepth = 0

    for (const rawLine of lines) {
      const stripped = rawLine.replace(/^\s+/, '')

      // Empty lines pass through
      if (stripped === '') { out.push(''); continue }

      // Lines starting with # (headings/comments at depth 0) — keep as-is
      if (depth === 0 && bracketDepth === 0 && stripped.startsWith('#')) { out.push(stripped); continue }

      const stats = braceStats(stripped)
      const totalDepth = depth + bracketDepth

      // If line starts with } or ], it belongs at the parent depth
      if (stripped.startsWith('}') || stripped.startsWith(']')) {
        depth = Math.max(0, depth + stats.delta)
        bracketDepth = Math.max(0, bracketDepth + stats.bracketDelta)
        const newTotal = depth + bracketDepth
        out.push(indent.repeat(Math.max(0, newTotal)) + stripped)
        continue
      }

      // Normal line: indent at current depth, then update depth
      out.push(indent.repeat(Math.max(0, totalDepth)) + stripped)
      depth = Math.max(0, depth + stats.delta)
      bracketDepth = Math.max(0, bracketDepth + stats.bracketDelta)
    }

    normalized = out.join('\n')
  }

  // 4. Align trailing comments
  if (opts.alignComments) {
    normalized = alignCommentsInBlock(normalized.split('\n'), opts.commentColumn).join('\n')
  }

  // 5. Blank line between top-level frames
  if (opts.blankLineBetweenFrames) {
    const lines = normalized.split('\n')
    const out: string[] = []
    let braceDepth = 0
    let closedTopLevelFrame = false
    let prevBlankCount = 0

    for (const line of lines) {
      const isBlank = line.trim() === ''
      const isFrame = isFrameHeader(line)

      if (isBlank) {
        prevBlankCount++
        continue
      }

      // Insert exactly one blank line before a frame header or after a top-level frame close
      if (out.length > 0 && (isFrame || closedTopLevelFrame)) {
        out.push('')
        prevBlankCount = 0
        closedTopLevelFrame = false
      } else if (prevBlankCount > 0 && out.length > 0) {
        // Preserve blank lines elsewhere, but collapse to max 1
        out.push('')
        prevBlankCount = 0
      }

      // Track brace depth to detect top-level frame close
      const stats = braceStats(line)
      if (isFrame) braceDepth = 1
      else braceDepth = Math.max(0, braceDepth + stats.delta)

      if (line.trim().startsWith('}') && braceDepth === 0) {
        closedTopLevelFrame = true
      }

      out.push(line)
      prevBlankCount = 0
    }

    normalized = out.join('\n')
  }

  // 6. Collapse blank lines (if requested and not already handled by blankLineBetweenFrames)
  if (opts.collapseBlankLines && !opts.blankLineBetweenFrames) {
    normalized = normalized.replace(/\n{3,}/g, '\n\n')
  }

  // 7. Final newline
  if (opts.ensureFinalNewline && !normalized.endsWith('\n')) {
    normalized += '\n'
  }

  return {
    source: normalized,
    hash: hashString(normalized),
  }
}

/**
 * Lightweight, deterministic string hash (FNV-1a 32-bit).
 * Not cryptographically secure; suitable for change detection.
 */
export function hashString(value: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  // Return hex padded to 8 characters
  return hash.toString(16).padStart(8, '0')
}

