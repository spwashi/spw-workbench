/**
 * Brace-phrase fingerprints and fixity helpers — greenfield optimizable grammar.
 *
 * Recognition is lightweight (regex/heuristic); full FormIR lives in seed geometry.
 *
 * @see docs/theory/spw/fixity-brace-phrases.spw
 */

import type { StabilityChannel } from './channels'

/** Act placement relative to Bound — aligns with seed ActPlacement / ONF fixity. */
export type FixityKind =
  | 'prefix'
  | 'postfix'
  | 'interior'
  | 'membrane'
  | 'infix'
  | 'none'

export interface BracePhraseId {
  id: string
  fixity: FixityKind
  /** Canonical silhouette sketch (not a full parser). */
  form: string
  role: string
}

/** Nursery of named phrases — extend via catalog / biome; do not ossify early. */
export const CORE_BRACE_PHRASES: readonly BracePhraseId[] = [
  { id: 'phrase.select_empty', fixity: 'prefix', form: '![]', role: 'select empty frame' },
  { id: 'phrase.collapse_body', fixity: 'prefix', form: '*{…}', role: 'discharge into body' },
  { id: 'phrase.integrate_frame', fixity: 'prefix', form: '^["n"]{}', role: 'named integrate' },
  { id: 'phrase.path_potential', fixity: 'prefix', form: '~"p"', role: 'potentiate path' },
  { id: 'phrase.probe_body', fixity: 'prefix', form: '?{…}', role: 'wonder capture' },
  { id: 'phrase.stream_window', fixity: 'none', form: '<<…>>', role: 'order-capture' },
  { id: 'phrase.scope_path', fixity: 'none', form: '@(a/b)', role: 'hold + path' },
  { id: 'phrase.postfix_defer', fixity: 'postfix', form: 'data~', role: 'potential after subject' },
  { id: 'phrase.couple', fixity: 'infix', form: '<>["a","b"]', role: 'relation product' },
  { id: 'phrase.apposition', fixity: 'prefix', form: '~#goal:', role: 'stance apposition' },
] as const

export interface PhraseHit {
  phraseId: string
  fixity: FixityKind
  index: number
  match: string
}

/** Heuristic scan — not a substitute for parse/FormIR. */
export function scanBracePhrases(source: string): PhraseHit[] {
  const hits: PhraseHit[] = []
  const patterns: Array<{ id: string; fixity: FixityKind; re: RegExp }> = [
    { id: 'phrase.select_empty', fixity: 'prefix', re: /!\s*\[\s*\]/g },
    { id: 'phrase.collapse_body', fixity: 'prefix', re: /\*[a-zA-Z]*\s*\{/g },
    { id: 'phrase.integrate_frame', fixity: 'prefix', re: /\^\s*\[/g },
    { id: 'phrase.path_potential', fixity: 'prefix', re: /~"[^"]*"/g },
    { id: 'phrase.probe_body', fixity: 'prefix', re: /\?[a-zA-Z]*\s*\{/g },
    { id: 'phrase.stream_window', fixity: 'none', re: /<<[\s\S]*?>>/g },
    { id: 'phrase.scope_path', fixity: 'none', re: /@\([^)]*\)/g },
    { id: 'phrase.postfix_defer', fixity: 'postfix', re: /\w+~/g },
    { id: 'phrase.couple', fixity: 'infix', re: /<>/g },
    { id: 'phrase.apposition', fixity: 'prefix', re: /~#[\w.]+/g },
  ]
  for (const p of patterns) {
    p.re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = p.re.exec(source)) !== null) {
      hits.push({
        phraseId: p.id,
        fixity: p.fixity,
        index: m.index,
        match: m[0],
      })
    }
  }
  return hits.sort((a, b) => a.index - b.index)
}

/** OptCache / AlgoIR key fragment for phrase rewrite. */
export function phraseOptKey(parts: {
  phraseId: string
  fixity: FixityKind
  dialect?: string
  channel?: StabilityChannel | string
  contentHash?: string
  scheme?: string
}): string {
  return [
    `ph:${parts.phraseId}`,
    `fx:${parts.fixity}`,
    parts.dialect ? `d:${parts.dialect}` : '',
    parts.channel ? `ch:${parts.channel}` : '',
    parts.contentHash ? `hash:${parts.contentHash}` : '',
    parts.scheme ? `sch:${parts.scheme}` : '',
  ]
    .filter(Boolean)
    .join('|')
}

export function countPhrasesById(hits: readonly PhraseHit[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const h of hits) {
    out[h.phraseId] = (out[h.phraseId] ?? 0) + 1
  }
  return out
}
