/**
 * Spw Selector — LSP Bridge
 *
 * Citations come from the parser. `~"path"`, `~<path>` and `@root/path` are
 * the PathRef and Reference nodes the seed builds, so a path written inside a
 * string, a backtick phrase or a comment is text and never a citation. The
 * text fallback runs only over what the parser could not structure — a prose
 * fallback, an unconsumed tail, a parse that threw — and every hit it finds
 * there carries `recovered: true`.
 *
 * Span contract: startOffset/endOffset and startCharacter/endCharacter are
 * half-open [start, end) — end is exclusive, matching LSP Range semantics.
 * Spans are source offsets of the node itself, mapped back through a dialect
 * that rewrote whitespace before parsing.
 *
 * Labeled form `~<label>"path"` is an LSP compatibility projection: the seed
 * reads it as an operation on a capsule followed by a string, not a PathRef.
 * It is read from the parser's token stream, so it shares the parser's
 * knowledge of where strings and comments begin.
 */

import {
  parse,
  spwq,
  NAVIGABLE,
  applyDialectPreprocess,
  isDialectId,
  type ASTNode,
  type DialectId,
  type ParseOutput,
  type ProseNode,
  type Token,
} from '@spwashi/spw-seed'

export type SpwSelectorKind = 'pathRef' | 'rootRef'

/** Half-open span: endOffset / endCharacter are exclusive (LSP-compatible). */
export interface SpwSelectorSpan {
  startOffset: number
  /** Exclusive byte/code-unit offset (one past last included character). */
  endOffset: number
  startLine: number
  startCharacter: number
  endLine: number
  /** Exclusive character on endLine (LSP Range.end.character). */
  endCharacter: number
}

export interface SpwSelectorHit {
  kind: SpwSelectorKind
  raw: string
  span: SpwSelectorSpan
  target: string
  root?: string
  /**
   * Read by the text fallback from source the parser could not structure.
   * A recovered hit is a guess at a citation, not one the grammar vouches for.
   */
  recovered?: boolean
}

interface LinePosition {
  line: number
  character: number
}

interface OffsetRange {
  start: number
  end: number
}

const REF_ENVELOPE_OPERATORS = new Set(['&', '^', '*', '?', '~', '!', '%', '='])
const REF_BOUNDARY_CHARS = new Set(['(', '[', '{', ',', ':', '=', '|', '&', '^', '*', '?', '~', '!', '%'])
/** Token kinds whose inside is text: a citation-shaped run there is not a citation. */
const QUIET_TOKENS = new Set(['STRING', 'PHRASE', 'COMMENT'])
const ROOT_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

function buildLineOffsets(source: string): number[] {
  const offsets = [0]
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '\n') offsets.push(i + 1)
  }
  return offsets
}

function offsetToPosition(offsets: number[], offset: number): LinePosition {
  let lo = 0
  let hi = offsets.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const start = offsets[mid]
    const next = mid + 1 < offsets.length ? offsets[mid + 1] : Number.POSITIVE_INFINITY
    if (offset < start) {
      hi = mid - 1
    } else if (offset >= next) {
      lo = mid + 1
    } else {
      return { line: mid, character: offset - start }
    }
  }
  return { line: 0, character: offset }
}

function buildSpan(offsets: number[], startOffset: number, endOffsetExclusive: number): SpwSelectorSpan {
  const start = offsetToPosition(offsets, startOffset)
  // Exclusive end maps directly to LSP Range.end (one past last included char).
  const end = offsetToPosition(offsets, Math.max(startOffset, endOffsetExclusive))
  return {
    startOffset,
    endOffset: endOffsetExclusive,
    startLine: start.line,
    startCharacter: start.character,
    endLine: end.line,
    endCharacter: end.character,
  }
}

function isBoundaryBeforeRef(ch: string): boolean {
  if (!ch) return true
  if (/\s/.test(ch)) return true
  return REF_BOUNDARY_CHARS.has(ch)
}

/** True when angle-bracket content is a navigable path, not a label or pattern. */
export function isAnglePathLike(inner: string): boolean {
  const s = inner.trim()
  if (!s) return false
  // Reject pattern/selector fragments: ~<#.>, ~<core> labels without path shape
  if (/[#*{}()[\]|]/.test(s)) return false
  if (s.includes('/')) return true
  if (s.startsWith('.')) return true
  if (/\.(spw|ts|tsx|js|mjs|cjs|md|json)$/i.test(s)) return true
  return false
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith('`') && value.endsWith('`')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

// ── Text fallback (recovery only) ────────────────────────────

function fallbackPathRefs(source: string, offsets: number[]): SpwSelectorHit[] {
  const hits: SpwSelectorHit[] = []
  // Track covered ranges so quoted and angle forms do not double-hit.
  const covered: OffsetRange[] = []
  const isCovered = (start: number, end: number) =>
    covered.some((r) => start < r.end && end > r.start)

  // 1) ~"./path", ~<label>"./path" — quoted tilde refs (highest priority)
  // Keep this intentionally strict to avoid matching arbitrary "~" inside prose/commands.
  const pathRegex = /~\s*(?:<[^>\n"]+>\s*)?"([^"\n]+)"/g
  let pathMatch: RegExpExecArray | null
  while ((pathMatch = pathRegex.exec(source)) !== null) {
    const raw = pathMatch[0] ?? ''
    const target = pathMatch[1] ?? ''
    if (!target) continue

    // Guard against accidental mid-token captures while keeping operator-wrapped refs discoverable.
    const prev = pathMatch.index > 0 ? source[pathMatch.index - 1] : ''
    if (!isBoundaryBeforeRef(prev)) continue

    const start = pathMatch.index
    const end = start + raw.length
    covered.push({ start, end })
    hits.push({ kind: 'pathRef', raw, target, span: buildSpan(offsets, start, end) })
  }

  // 2) ~<.spw/foo.spw>, ~<./index.spw> — angle path without trailing quote.
  // Do not match ~<label>"path" (already covered) or non-path labels like ~<core>.
  const anglePathRegex = /~\s*<([^>\n"]+)>(?!\s*")/g
  let angleMatch: RegExpExecArray | null
  while ((angleMatch = anglePathRegex.exec(source)) !== null) {
    const raw = angleMatch[0] ?? ''
    const target = (angleMatch[1] ?? '').trim()
    if (!target || !isAnglePathLike(target)) continue

    const prev = angleMatch.index > 0 ? source[angleMatch.index - 1] : ''
    if (!isBoundaryBeforeRef(prev)) continue

    const start = angleMatch.index
    const end = start + raw.length
    if (isCovered(start, end)) continue
    covered.push({ start, end })
    hits.push({ kind: 'pathRef', raw, target, span: buildSpan(offsets, start, end) })
  }

  // 3) @root/path
  const rootRegex = /@([A-Za-z_][A-Za-z0-9_]*)\/([A-Za-z0-9_.\-/*]+)/g
  let rootMatch: RegExpExecArray | null
  while ((rootMatch = rootRegex.exec(source)) !== null) {
    let raw = rootMatch[0] ?? ''
    const root = rootMatch[1] ?? ''
    let target = rootMatch[2] ?? ''
    if (!raw || !root || !target) continue

    const prev = rootMatch.index > 0 ? source[rootMatch.index - 1] : ''
    if (!isBoundaryBeforeRef(prev)) continue

    // Keep wildcard refs (e.g. "@spw/harness/*"), but trim postfix envelope "*" wrappers.
    if (target.endsWith('*') && !target.endsWith('/*')) {
      target = target.slice(0, -1)
      raw = raw.slice(0, -1)
      if (!target || !raw) continue
    }

    const start = rootMatch.index
    const end = start + raw.length
    hits.push({ kind: 'rootRef', raw, root, target, span: buildSpan(offsets, start, end) })
  }

  return hits
}

// ── Parser offsets → document offsets ────────────────────────

/** Maps offsets in the text the parser read back onto the document. */
interface OffsetReader {
  /** Document offset of the first character at or after a parser offset. */
  start(offset: number): number
  /** Document offset one past the last character before a parser offset. */
  end(offset: number): number
}

const SAME_OFFSETS: OffsetReader = { start: (offset) => offset, end: (offset) => offset }

/**
 * A line dialect collapses whitespace before it parses, so its offsets drift
 * from the document's. Only whitespace moves, so the non-whitespace characters
 * pair up in order, and every citation starts and ends on one of them.
 */
function offsetReader(source: string, output: ParseOutput): OffsetReader {
  if (!output.dialectPreprocessed || !output.dialect || !isDialectId(output.dialect)) return SAME_OFFSETS
  const prepared = applyDialectPreprocess(source, output.dialect as DialectId, true)
  const toSource = new Int32Array(prepared.length).fill(-1)
  let j = 0
  for (let i = 0; i < prepared.length; i += 1) {
    const ch = prepared[i]
    if (/\s/.test(ch)) continue
    while (j < source.length && source[j] !== ch) j += 1
    if (j >= source.length) break
    toSource[i] = j
    j += 1
  }
  return {
    start(offset) {
      for (let i = Math.max(0, offset); i < prepared.length; i += 1) {
        if (toSource[i] >= 0) return toSource[i]
      }
      return source.length
    },
    end(offset) {
      for (let i = Math.min(prepared.length, offset) - 1; i >= 0; i -= 1) {
        if (toSource[i] >= 0) return toSource[i] + 1
      }
      return 0
    },
  }
}

// ── Parser hits ──────────────────────────────────────────────

interface ReadContext {
  source: string
  lineOffsets: number[]
  at: OffsetReader
}

function isAngleForm(source: string, tildeOffset: number): boolean {
  let i = tildeOffset + 1
  while (i < source.length && (source[i] === ' ' || source[i] === '\t')) i += 1
  return source[i] === '<'
}

/** The target as written in the document: `~"a.spw"` → `a.spw`, `~<a/b.spw>` → `a/b.spw`. */
function writtenPathTarget(raw: string): string | null {
  const body = raw.replace(/^~\s*/, '')
  if (body.startsWith('<') && body.endsWith('>')) return body.slice(1, -1).trim()
  const unquoted = unquote(body)
  return unquoted !== body ? unquoted : null
}

// Glob a root ref may carry past the seed's last slash: a star run and the path after it.
const GLOB_TAIL = /^\*[A-Za-z0-9_.\-/*]*/

function nodeToHit(node: ASTNode, ctx: ReadContext): SpwSelectorHit | null {
  const start = ctx.at.start(node.span.start.offset)
  let end = ctx.at.end(node.span.end.offset)
  if (end <= start) return null

  if (node.type === 'PathRef') {
    const raw = ctx.source.slice(start, end)
    const token = (node as { path?: { token?: { value?: string } } }).path?.token?.value ?? ''
    const target = writtenPathTarget(raw) ?? unquote(token)
    if (!target) return null
    // `~<core>` names a label; only a path-shaped angle body is a citation.
    if (isAngleForm(ctx.source, start) && !isAnglePathLike(target)) return null
    return {
      kind: 'pathRef',
      raw,
      target,
      span: buildSpan(ctx.lineOffsets, start, end),
    }
  }

  if (node.type === 'Reference') {
    // Read the reference as written: the node's own `raw` is rebuilt from
    // segments and drops characters such as the `-` in `spw-v0.1.0-alpha`.
    const spanText = ctx.source.slice(start, end)
    const written = spanText.startsWith('@') ? spanText.slice(1) : (node as { raw?: string }).raw ?? ''
    const slash = written.indexOf('/')
    if (slash <= 0) return null
    const root = written.slice(0, slash)
    let target = written.slice(slash + 1)
    if (!ROOT_NAME.test(root)) return null
    // `@spw/harness/*` names every file under a directory; the seed stops at the slash.
    const glob = (target === '' || target.endsWith('/')) ? GLOB_TAIL.exec(ctx.source.slice(end)) : null
    if (glob) {
      target += glob[0]
      end += glob[0].length
      // A lone trailing `*` after a name is a postfix envelope, not a glob.
      if (target.endsWith('*') && !target.endsWith('/*') && target !== '*') {
        target = target.slice(0, -1)
        end -= 1
      }
    }
    if (!target) return null
    return {
      kind: 'rootRef',
      raw: ctx.source.slice(start, end),
      root,
      target,
      span: buildSpan(ctx.lineOffsets, start, end),
    }
  }

  return null
}

function isInlineWhitespace(token: Token | undefined): boolean {
  return token?.type === 'WHITESPACE' && !token.value.includes('\n')
}

/** `~<label>"path"` — the operator, a one-line capsule, then a string. */
function labeledPathHits(tokens: readonly Token[], ctx: ReadContext): SpwSelectorHit[] {
  const hits: SpwSelectorHit[] = []
  for (let i = 0; i < tokens.length; i += 1) {
    const tilde = tokens[i]
    if (tilde.type !== 'OPERATOR' || tilde.kind !== '~') continue

    let k = i + 1
    while (isInlineWhitespace(tokens[k])) k += 1
    if (tokens[k]?.type !== 'CAPSULE_OPEN') continue
    k += 1
    let labelled = false
    while (k < tokens.length && tokens[k].type !== 'CAPSULE_CLOSE') {
      const inside = tokens[k]
      if (inside.type === 'STRING' || inside.type === 'EOF' || inside.value.includes('\n')) break
      labelled = true
      k += 1
    }
    if (!labelled || tokens[k]?.type !== 'CAPSULE_CLOSE') continue
    k += 1
    while (isInlineWhitespace(tokens[k])) k += 1
    const pathToken = tokens[k]
    if (pathToken?.type !== 'STRING') continue

    const target = unquote(pathToken.value)
    if (!target) continue
    const start = ctx.at.start(tilde.span.start.offset)
    const end = ctx.at.end(pathToken.span.end.offset)
    if (end <= start) continue
    hits.push({
      kind: 'pathRef',
      raw: ctx.source.slice(start, end),
      target,
      span: buildSpan(ctx.lineOffsets, start, end),
    })
    i = k
  }
  return hits
}

// ── Where the parse failed ───────────────────────────────────

function subtractRanges(whole: OffsetRange, holes: OffsetRange[]): OffsetRange[] {
  const result: OffsetRange[] = []
  let cursor = whole.start
  for (const hole of [...holes].sort((a, b) => a.start - b.start)) {
    if (hole.start > cursor) result.push({ start: cursor, end: Math.min(hole.start, whole.end) })
    cursor = Math.max(cursor, hole.end)
  }
  if (cursor < whole.end) result.push({ start: cursor, end: whole.end })
  return result.filter((range) => range.end > range.start)
}

/**
 * Stretches the parser read as text because it could not structure them: a
 * prose fallback minus the expressions it still recognised, and whatever the
 * parse left unconsumed. A prose fallback can drop a stretch from its chunks
 * altogether, so the region is the Prose span itself, not its chunk texts.
 */
function failedRegions(output: ParseOutput, ctx: ReadContext): OffsetRange[] {
  const regions: OffsetRange[] = []
  const toSource = (start: number, end: number): OffsetRange => ({ start: ctx.at.start(start), end: ctx.at.end(end) })

  if (output.ast && output.completeness?.proseFallback) {
    for (const match of spwq(output.ast, { nodeType: 'Prose' })) {
      const prose = match.node as ProseNode
      const islands = prose.chunks
        .filter((chunk) => chunk.type !== 'ProseChunk')
        .map((chunk) => toSource(chunk.span.start.offset, chunk.span.end.offset))
      regions.push(...subtractRanges(toSource(prose.span.start.offset, prose.span.end.offset), islands))
    }
  }

  const remaining = output.completeness?.remaining?.span
  if (remaining && remaining.end.offset > remaining.start.offset) {
    regions.push(toSource(remaining.start.offset, remaining.end.offset))
  }

  if (!output.success && regions.length === 0) regions.push({ start: 0, end: ctx.source.length })
  return regions
}

function quietRanges(tokens: readonly Token[], ctx: ReadContext): OffsetRange[] {
  return tokens
    .filter((token) => QUIET_TOKENS.has(token.type))
    .map((token) => ({ start: ctx.at.start(token.span.start.offset), end: ctx.at.end(token.span.end.offset) }))
}

function overlaps(a: OffsetRange, b: OffsetRange): boolean {
  return a.start < b.end && b.start < a.end
}

function spanRange(hit: SpwSelectorHit): OffsetRange {
  return { start: hit.span.startOffset, end: hit.span.endOffset }
}

function recover(hits: SpwSelectorHit[]): SpwSelectorHit[] {
  return hits.map((hit) => ({ ...hit, recovered: true }))
}

// ── Envelope ─────────────────────────────────────────────────

function isEnvelopeOperator(ch: string | undefined): boolean {
  return !!ch && REF_ENVELOPE_OPERATORS.has(ch)
}

function expandSpanWithOperatorEnvelope(lines: string[], span: SpwSelectorSpan): SpwSelectorSpan {
  const next = { ...span }

  const startLineText = lines[next.startLine] ?? ''
  while (next.startCharacter > 0 && isEnvelopeOperator(startLineText[next.startCharacter - 1])) {
    next.startCharacter -= 1
    next.startOffset = Math.max(0, next.startOffset - 1)
  }

  // endCharacter is exclusive: the first character after the hit is at endCharacter.
  const endLineText = lines[next.endLine] ?? ''
  let suffixIndex = next.endCharacter
  while (suffixIndex < endLineText.length && isEnvelopeOperator(endLineText[suffixIndex])) {
    next.endCharacter += 1
    next.endOffset += 1
    suffixIndex += 1
  }

  return next
}

function withOperatorEnvelopeExpandedSpans(source: string, hits: SpwSelectorHit[]): SpwSelectorHit[] {
  const lines = source.split('\n')
  return hits.map((hit) => ({
    ...hit,
    span: expandSpanWithOperatorEnvelope(lines, hit.span),
  }))
}

// ── Public API ───────────────────────────────────────────────

function parseQuietly(source: string): ParseOutput | null {
  try {
    return parse(source)
  } catch {
    return null
  }
}

/**
 * Path and root citations in a document, in source order.
 *
 * Pass the document's existing parse to skip a second one; `null` means the
 * parse threw, and the whole document is read by the text fallback.
 */
export function selectPathRefs(source: string, parsed?: ParseOutput | null): SpwSelectorHit[] {
  const output = parsed === undefined ? parseQuietly(source) : parsed
  const lineOffsets = buildLineOffsets(source)
  if (!output?.ast) {
    return withOperatorEnvelopeExpandedSpans(source, recover(fallbackPathRefs(source, lineOffsets)))
  }

  const ctx: ReadContext = { source, lineOffsets, at: offsetReader(source, output) }
  const hits: SpwSelectorHit[] = []
  for (const match of spwq(output.ast, NAVIGABLE)) {
    const hit = nodeToHit(match.node, ctx)
    if (hit) hits.push(hit)
  }
  for (const hit of labeledPathHits(output.tokens, ctx)) {
    if (!hits.some((known) => overlaps(spanRange(known), spanRange(hit)))) hits.push(hit)
  }

  const regions = failedRegions(output, ctx)
  if (regions.length > 0) {
    const quiet = quietRanges(output.tokens, ctx)
    const parsedRanges = hits.map(spanRange)
    for (const hit of fallbackPathRefs(source, lineOffsets)) {
      const range = spanRange(hit)
      if (!regions.some((region) => range.start >= region.start && range.start < region.end)) continue
      if (parsedRanges.some((known) => overlaps(known, range))) continue
      if (quiet.some((text) => range.start >= text.start && range.start < text.end)) continue
      hits.push({ ...hit, recovered: true })
    }
  }

  hits.sort((a, b) => a.span.startOffset - b.span.startOffset)
  return withOperatorEnvelopeExpandedSpans(source, hits)
}

export function findPathRefAtPosition(
  hits: SpwSelectorHit[],
  line: number,
  character: number,
): SpwSelectorHit | null {
  // Spans are half-open [start, end): character == endCharacter is outside.
  const containing = hits.filter((hit) => {
    if (line < hit.span.startLine || line > hit.span.endLine) return false
    if (line === hit.span.startLine && character < hit.span.startCharacter) return false
    if (line === hit.span.endLine && character >= hit.span.endCharacter) return false
    return true
  })

  if (containing.length === 0) return null
  containing.sort(
    (a, b) =>
      (a.span.endOffset - a.span.startOffset) -
      (b.span.endOffset - b.span.startOffset)
  )
  return containing[0] ?? null
}
