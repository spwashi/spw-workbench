/**
 * Canonicalization Utilities
 *
 * Normalizes Spw source for hashing and comparison.
 * This is intentionally deterministic and portable (no Node-only crypto).
 *
 * Formatting capabilities (opt-in):
 *   indentBraces          — auto-indent by brace depth (string-safe)
 *   alignComments         — align trailing # comments to a consistent column
 *   blankLineBetweenFrames — ensure exactly one blank line between ^["..."]{ } blocks
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
}

export interface CanonicalResult {
  source: string
  hash: string
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

