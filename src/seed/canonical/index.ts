/**
 * Canonicalization Utilities
 *
 * Normalizes Spw source for hashing and comparison.
 * This is intentionally deterministic and portable (no Node-only crypto).
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
}

/**
 * Deterministically normalize and hash source.
 */
export function canonicalize(
  input: string,
  options: Partial<CanonicalOptions> = {}
): CanonicalResult {
  const opts: CanonicalOptions = { ...DEFAULT_OPTIONS, ...options }

  let normalized = input

  if (opts.normalizeNewlines) {
    normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  }

  if (opts.trimTrailingWhitespace) {
    normalized = normalized
      .split('\n')
      .map(line => line.replace(/\s+$/g, ''))
      .join('\n')
  }

  if (opts.collapseBlankLines) {
    normalized = normalized.replace(/\n{3,}/g, '\n\n')
  }

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
