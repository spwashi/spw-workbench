export interface SpwCliCommand {
  command: string
  args: string[]
}

export type ViewFormat = 'lines' | 'json' | 'skim' | 'table'

export interface QueryArgs {
  roots: string[]
  selector: string
  expr: string
  where: string
  select: string
  format: ViewFormat
  limit: number
  summary: boolean
  /** Group output by file */
  group: boolean
  /** Count only (no row dump) */
  count: boolean
  /** Surrounding source lines when format=skim/lines with --context */
  context: number
  /** Suppress header banner on stdout (meta still on stderr if summary) */
  quiet: boolean
}

export interface SelectArgs {
  file: string
  selector: string
  expr: string
  format: ViewFormat
  summary: boolean
  limit: number
  context: number
  group: boolean
  quiet: boolean
}

export interface SkimArgs {
  file: string
  /** Outline only (default) */
  outline: boolean
  /** Max outline items */
  limit: number
  /** Also show path-ref heavy skim */
  paths: boolean
  json: boolean
  /** 1-based inclusive line range "a-b" or single line */
  lines?: string
  /** Read window around a 1-based line */
  around?: number
  context: number
}

export interface QueryRow {
  file: string
  kind: string
  sigil: string
  brace: string
  root: string
  target: string
  label: string
  line: number
  column: number
  text: string
}
