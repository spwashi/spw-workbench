/**
 * Plan stream completion — the stamp and type that open a stream entry.
 *
 * A plan stream entry reads `>>[YYYY-MM-DD HH:MM] <type> — <content>`. After
 * `>>[` the current stamp is offered; after `>>[stamp] ` the schema's entry
 * types are. Only plan files (`.agents/plans/**\/wip.spw`) are served.
 *
 * The stamp's clock: a zone the consumer declares in a `^"clock"` (or
 * `^["clock"]`) frame as `zone = "Area/City"` in `.spw/site.spw` or
 * `.spw/workspace.spw`, else the SPW_TZ environment variable, else the
 * machine's local time. A zone the runtime does not know is passed over.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { lex, type Token } from '@spwashi/spw-seed'
import { CK, type LspCompletionItem, type LspPosition } from '../types'
import { isPlanStreamFile } from './commit-refs'

/** Entry types from the plan schema (.agents/plans/_schema/wip-template.spw). */
export const STREAM_TYPES = [
  'observe', 'decide', 'surprise', 'revise', 'blocked', 'taste',
  'rebase', 'hygiene', 'implement', 'verify', 'note',
] as const

/** Workspace surfaces that may declare the clock, in the order they are asked. */
const CLOCK_SURFACES = ['.spw/site.spw', '.spw/workspace.spw']

/** `>>[` and the stamp typed so far. */
const STAMP_PREFIX = />>\s?\[([0-9:\- ]*)$/
/** Stamp characters after the cursor up to a closing `]`. */
const STAMP_REST = /^[0-9:\- ]*(?=\])/
/** `>>[stamp] ` and the type typed so far. */
const TYPE_PREFIX = />>\s?\[[^\]\n]*\]\s+([a-z]*)$/

export type StreamClockSource = 'workspace' | 'env' | 'local'

export interface StreamClock {
  /** IANA zone; undefined reads the machine's local time. */
  zone?: string
  source: StreamClockSource
  /** Workspace-relative surface that declared the zone. */
  declaredIn?: string
}

function isKnownZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/** `YYYY-MM-DD HH:MM` for `now`, on the zone's wall clock. */
export function streamStamp(now: Date, zone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`
}

function significant(tokens: readonly Token[]): Token[] {
  return tokens.filter((token) => token.type !== 'WHITESPACE' && token.type !== 'COMMENT')
}

function unquote(value: string): string {
  return /^(["'`]).*\1$/s.test(value) ? value.slice(1, -1) : value
}

/** Index just past a `^"clock"` / `^["clock"]` head, at its `{`; -1 when absent. */
function clockFrameBody(tokens: readonly Token[], from: number): number {
  const op = tokens[from]
  if (op?.type !== 'OPERATOR' || op.kind !== '^') return -1
  const quoted = tokens[from + 1]
  if (quoted?.type === 'STRING' && unquote(quoted.value) === 'clock') {
    return tokens[from + 2]?.type === 'CONTAINER_OPEN' && tokens[from + 2].kind === '{' ? from + 2 : -1
  }
  const framed = tokens[from + 2]
  if (
    quoted?.type === 'CONTAINER_OPEN' && quoted.kind === '[' &&
    framed?.type === 'STRING' && unquote(framed.value) === 'clock' &&
    tokens[from + 3]?.type === 'CONTAINER_CLOSE' && tokens[from + 3].kind === ']' &&
    tokens[from + 4]?.type === 'CONTAINER_OPEN' && tokens[from + 4].kind === '{'
  ) {
    return from + 4
  }
  return -1
}

/** The `zone` a clock frame declares, read from tokens so quoted prose never counts. */
export function declaredClockZone(text: string): string | null {
  let tokens: Token[]
  try {
    tokens = significant(lex(text, { eventPolicy: 'none' }).tokens)
  } catch {
    return null
  }
  for (let i = 0; i < tokens.length; i += 1) {
    const open = clockFrameBody(tokens, i)
    if (open < 0) continue
    let depth = 0
    for (let k = open; k < tokens.length; k += 1) {
      const token = tokens[k]
      if (token.type === 'CONTAINER_OPEN') depth += 1
      if (token.type === 'CONTAINER_CLOSE') {
        depth -= 1
        if (depth === 0) break
      }
      const binder = tokens[k + 1]
      const value = tokens[k + 2]
      if (
        token.type === 'IDENTIFIER' && token.value === 'zone' &&
        (binder?.type === 'COLON' || (binder?.type === 'OPERATOR' && binder.kind === '=')) &&
        value?.type === 'STRING'
      ) {
        return unquote(value.value)
      }
    }
  }
  return null
}

/** The clock a plan stream stamps with in this workspace. */
export async function resolveStreamClock(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<StreamClock> {
  for (const surface of CLOCK_SURFACES) {
    let text: string
    try {
      text = await fs.readFile(path.join(workspaceRoot, surface), 'utf8')
    } catch {
      continue
    }
    const zone = declaredClockZone(text)
    if (zone && isKnownZone(zone)) return { zone, source: 'workspace', declaredIn: surface }
  }
  const fromEnv = env.SPW_TZ?.trim()
  if (fromEnv && isKnownZone(fromEnv)) return { zone: fromEnv, source: 'env' }
  return { source: 'local' }
}

function describeClock(clock: StreamClock): string {
  if (clock.source === 'workspace') return `${clock.zone} — clock declared in ${clock.declaredIn}`
  if (clock.source === 'env') return `${clock.zone} — from SPW_TZ`
  return 'local time'
}

export interface StreamCompletionRequest {
  filePath: string | null | undefined
  /** Line text before the cursor. */
  prefix: string
  /** Line text from the cursor on. */
  suffix: string
  position: LspPosition
  workspaceRoot: string
  now?: Date
  env?: NodeJS.ProcessEnv
}

/**
 * Stamp or entry-type items when the cursor opens a stream entry in a plan
 * file; null when the request is not one, so other completion runs.
 */
export async function planStreamCompletion(request: StreamCompletionRequest): Promise<LspCompletionItem[] | null> {
  if (!isPlanStreamFile(request.filePath)) return null
  const { prefix, suffix, position } = request

  const stamp = STAMP_PREFIX.exec(prefix)
  if (stamp) {
    const clock = await resolveStreamClock(request.workspaceRoot, request.env)
    const value = streamStamp(request.now ?? new Date(), clock.zone)
    const typed = stamp[1] ?? ''
    // Inside an existing `[…]` the rest of the old stamp is replaced and its `]` kept.
    const rest = STAMP_REST.exec(suffix)
    return [{
      label: value,
      kind: CK.Value,
      detail: `now · ${describeClock(clock)}`,
      filterText: value,
      sortText: '0',
      textEdit: {
        range: {
          start: { line: position.line, character: position.character - typed.length },
          end: { line: position.line, character: position.character + (rest?.[0].length ?? 0) },
        },
        newText: rest ? value : `${value}] `,
      },
    }]
  }

  const type = TYPE_PREFIX.exec(prefix)
  if (type) {
    const typed = type[1] ?? ''
    // At the end of a line the separator comes too; mid-line, only the word.
    const separator = suffix.trim() === '' ? ' — ' : ''
    return STREAM_TYPES.map((name, index) => ({
      label: name,
      kind: CK.EnumMember,
      detail: 'stream entry type',
      filterText: name,
      sortText: String(index).padStart(2, '0'),
      textEdit: {
        range: {
          start: { line: position.line, character: position.character - typed.length },
          end: position,
        },
        newText: `${name}${separator}`,
      },
    }))
  }

  return null
}
