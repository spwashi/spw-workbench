export interface SpwCliCommand {
  command: string
  args: string[]
}

export interface QueryArgs {
  roots: string[]
  selector: string
  expr: string
  where: string
  select: string
  format: 'lines' | 'json'
  limit: number
  summary: boolean
}

export interface SelectArgs {
  file: string
  selector: string
  expr: string
  format: 'lines' | 'json'
  summary: boolean
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
