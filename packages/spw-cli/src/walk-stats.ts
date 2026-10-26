/**
 * `--stats` receipt shared by query, doctor and lint: what the command walked,
 * read and parsed, as one line on stderr. stdout, and any JSON envelope on it,
 * stays byte-identical with and without the flag.
 *
 *   spw <command> stats {"files_walked":…,"files_parsed":…,"bytes_read":…,"cache_hits":…,"parse_ms":…,"total_ms":…}
 *
 * Counts are what the command did, never estimates: a command that walks no
 * corpus reports files_walked 0.
 */

export interface WalkStatsLine {
  /** Files the corpus walk discovered. */
  files_walked: number
  /** Sources read and handed to the seed (lexer/parser/selector). */
  files_parsed: number
  /** Bytes read from disk, parsed or not. */
  bytes_read: number
  /** Sources served from a cache instead of re-read; no command memoizes yet. */
  cache_hits: number
  /** Time inside the seed calls, one decimal. */
  parse_ms: number
  /** Wall time since the counter started, one decimal. */
  total_ms: number
}

/** One wording for every command's help page. */
export const WALK_STATS_HELP = 'Compact walk/parse timing on stderr (files, bytes, parse_ms, total_ms)'

/** `--stats` help line padded to a page's option column. */
export function walkStatsHelpLine(column: number): string {
  return `${'--stats'.padEnd(column)}${WALK_STATS_HELP}`
}

export function formatWalkStats(command: string, line: WalkStatsLine): string {
  return `spw ${command} stats ${JSON.stringify(line)}`
}

function tenths(ms: number): number {
  return Math.round(ms * 10) / 10
}

export class WalkStats {
  private readonly started = performance.now()
  private filesWalked = 0
  private filesParsed = 0
  private bytesRead = 0
  private parseMs = 0

  /** Record the size of the corpus walk. */
  walked(files: number): void {
    this.filesWalked += files
  }

  /** A source read and handed to the seed. */
  parsedSource(bytes: number): void {
    this.filesParsed += 1
    this.bytesRead += bytes
  }

  /** Bytes read without a parse (a regex read of a config surface, say). */
  readBytes(bytes: number): void {
    this.bytesRead += bytes
  }

  /** Add parse time measured elsewhere (query's profile stage clock). */
  addParseMs(ms: number): void {
    this.parseMs += ms
  }

  /** Run seed work and count its time as parse time. */
  timeParse<T>(work: () => T): T {
    const started = performance.now()
    try {
      return work()
    } finally {
      this.parseMs += performance.now() - started
    }
  }

  line(): WalkStatsLine {
    return {
      files_walked: this.filesWalked,
      files_parsed: this.filesParsed,
      bytes_read: this.bytesRead,
      cache_hits: 0,
      parse_ms: tenths(this.parseMs),
      total_ms: tenths(performance.now() - this.started),
    }
  }

  /** Write the receipt to stderr. */
  report(command: string): void {
    console.error(formatWalkStats(command, this.line()))
  }
}
