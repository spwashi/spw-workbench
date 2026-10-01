/**
 * Spw Cut Gate: legibility, voice, readings, and arcs
 *
 * Checks that keep a cut surface readable without color and speakable in
 * one breath, that keep reader appositions honest, and that keep engagement
 * arcs well-formed. Split from spw-cut-gate.ts so each file has one reason
 * to change.
 *
 * @see .spw/caches/2026-09-30/contract.spw — ^["legibility"] ^["voice"] ^["marginalia"] ^["arcs"]
 * @see .agents/plans/caches-cut-2026-09-30/references/studies/render-synthesis.md — §2.3 check table
 */

export type Level = 'fail' | 'warn'
export type Add = (level: Level, line: number, message: string) => void

const WORDS = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
const SYSTEM_CLOCKS = new Set(['beat', 'pulse', 'epoch'])

/** Body text of the first ^"name"{…} or ^["name"]{…} frame, brace-matched on code-only text. */
function body(code: string, src: string, name: string, bracketOnly = false): { text: string; line: number } | null {
  const m = new RegExp(bracketOnly ? `\\^\\["${name}"\\]\\s*\\{` : `\\^\\[?"${name}"\\]?\\s*\\{`).exec(src)
  if (!m) return null
  let depth = 0
  for (let i = m.index + m[0].length - 1; i < code.length; i++) {
    if (code[i] === '{') depth++
    else if (code[i] === '}' && --depth === 0) return { text: src.slice(m.index + m[0].length, i), line: src.slice(0, m.index).split('\n').length }
  }
  return null
}

function stringValue(text: string, key: string): string | null {
  const m = new RegExp(`(?:^|\\s)(?:~#)?${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(text)
  return m ? m[1] : null
}

export function checkLegibility(src: string, code: string, add: Add): void {
  const lines = src.split('\n')
  const codeLines = code.split('\n')
  lines.forEach((line, i) => {
    const n = i + 1
    // L2: an anchor follows a boundary and precedes what it names
    if (/^\s*#>/.test(line) && i > 0) {
      const prev = lines[i - 1].trim()
      if (prev && !/[{}]$/.test(prev) && !/^#[>:!]/.test(prev) && !/^#(\s|$)/.test(prev)) add('warn', n, 'anchor should follow a blank line, an opener, or a closer')
    }
    // L4: particle lines carry one case and one mood, optionally one lens
    if (/^\s*#:[a-z_]+/.test(line) && !/^\s*#:[a-z_]+ #![A-Za-z0-9_-]+( ~#[a-z_]+\([^)]*\))?\s*$/.test(line)) add('warn', n, 'particle line should be #:case #!mood, optionally followed by one ~#lens(phrase)')
    // L5: statements stay speakable
    for (const m of line.matchAll(/\b(statement|claim|~#hypothesis|hypothesis):\s*"((?:[^"\\]|\\.)*)"/g)) {
      if (WORDS(m[2]) > 35) add('warn', n, `${m[1].replace('~#', '')} runs ${WORDS(m[2])} words; keep it at or under 35`)
    }
    // L7: code outside strings stays within 88 columns, not counting indent
    const c = codeLines[i] ?? ''
    const closedSet = /^\s*[a-z_]+:\s*#\[/.test(c)
    if (!closedSet && c.trim().length > 88 && c.replace(/"[^"]*"/g, '""').trim().length > 88) add('warn', n, 'code outside strings exceeds 88 columns')
    // L8: apostrophes and non-ASCII stay inside double-quoted strings
    if (!/^\s*#(\s|$)/.test(line) && /['\u0080-￿]/.test(c)) add('fail', n, 'apostrophe or non-ASCII outside a double-quoted string')
  })
}

export function checkVoice(src: string, code: string, add: Add, digitsAllowed = false): void {
  const emit = body(code, src, 'emit')
  if (!emit) return
  const cold = stringValue(emit.text, 'cold_open')
  if (cold === null) { add('warn', emit.line, '^"emit" card has no cold_open: one spoken sentence in one breath'); return }
  if (WORDS(cold) > 25) add('fail', emit.line, `cold_open runs ${WORDS(cold)} words; keep it at or under 25`)
  if (!digitsAllowed && /\d/.test(cold)) add('fail', emit.line, 'cold_open carries digits; numbers belong in the claim frame')
  const continuity = stringValue(emit.text, 'continuity')
  if (continuity && continuity.includes('|')) {
    for (const phrase of continuity.split('|').slice(1).map((s) => s.trim()).filter(Boolean)) {
      if (!cold.toLowerCase().includes(phrase.toLowerCase())) add('fail', emit.line, `cold_open does not carry continuity phrase "${phrase}"`)
    }
  }
}

export function checkReadings(ast: any, add: Add, readings: Set<string> | undefined, walk: (n: any, v: (x: any) => void) => void): void {
  const anonymous = new Map<string, number>()
  walk(ast, (n) => {
    if (n.type !== 'Annotation' || !n.apposition) return
    const line = n.span?.start?.line ?? 0
    if (n.apposition.anonymous) {
      const key = String(n.apposition.body ?? '').trim().toLowerCase()
      anonymous.set(key, (anonymous.get(key) ?? 0) + 1)
      if (anonymous.get(key) === 2) add('warn', line, `anonymous reading "${key}" recurs; name it`)
      return
    }
    const name = n.name?.value
    if (name === 'say' && /\d/.test(String(n.apposition.body ?? ''))) add('fail', line, '~#say(...) carries digits; numbers belong in the claim')
    if (readings && name && !readings.has(name)) add('fail', line, `reading ~#${name}(...) is not in the reading set`)
  })
}

export function checkArcs(code: string, src: string, add: Add, clocks: Set<string> | undefined): void {
  const arc = body(code, src, 'arc', true)
  if (!arc) return
  for (const key of ['clock', 'archetype', 'steps', 'counts', 'limit']) {
    if (!new RegExp(`(?:^|\\s)${key}:`).test(arc.text)) add('fail', arc.line, `^["arc"] missing ${key}:`)
  }
  const clock = /(?:^|\s)clock:\s*#?([A-Za-z_][\w-]*)/.exec(arc.text)?.[1]
  if (clock && SYSTEM_CLOCKS.has(clock)) add('fail', arc.line, `arc clock ${clock} reuses a system clock name`)
  if (clock && clocks && !clocks.has(clock)) add('fail', arc.line, `arc clock ${clock} is not in vocabulary.spw`)
  if (/(?:^|\s)steps:/.test(arc.text) && !/(?:^|\s)steps:\s*<</.test(arc.text)) add('fail', arc.line, 'arc steps must be a << a ; b >> schedule')
  if (!/\bfeeds:/.test(src)) add('warn', arc.line, 'arc file has no feeds edge to hand off to the next arc')
}
