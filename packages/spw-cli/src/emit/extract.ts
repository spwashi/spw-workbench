/**
 * Extract emit-relevant fields from a .spw surface source.
 * Line-oriented + light brace awareness — stable for PE frames without full AST dependence.
 */

import type { EmitDocument } from './types'
import { SPW_EMIT_IR_VERSION } from './types'
import { applyDimSets, resolveRegisterDims } from './registers'
import {
  collectAnchors,
  collectGenreAnchors,
  collectStyleAnchors,
  collectSubjectAnchors,
} from './continuity'

const STRING_ASSIGN =
  /^\s*(?:(?<star>\*)?(?<key>[a-zA-Z_][\w-]*)|(?<trait>~#[a-zA-Z_][\w-]*))\s*[=:]\s*(?<q>["'`])(?<val>(?:\\.|(?!\k<q>)[\s\S])*?)\k<q>/

const BARE_HANDLE =
  /^\s*(?:register|focus)\s*[:=]\s*#(?<name>[a-zA-Z_][\w-]*)/

const INCLUDE_PATH =
  /(?:^|\s)(?:@[\w][\w-]*:\s*)?~"([^"]+)"|(?:^|\s)~<([^>]+)>/g

const LENS_OR_FACET =
  /^\s*(?:lenses|facets)\s*[:=]\s*\[([^\]]*)\]/

export function extractEmitDocument(
  source: string,
  sourcePath: string,
  options: { register?: string; set: Record<string, number> },
): EmitDocument {
  const traits: Record<string, string> = {}
  const slots: Record<string, string> = {}
  const includes: string[] = []
  const lenses: string[] = []
  const facets: string[] = []
  let register = options.register?.replace(/^#/, '')
  const warnings: string[] = []

  // Prefer content inside ^"emit" / ^["emit"] when present;
  // also pull publishing genotype frames for style/subject/genre/title.
  const emitBody = sliceNamedFrame(source, 'emit') ?? source
  const traitBody = [
    sliceNamedFrame(source, 'intent'),
    sliceNamedFrame(source, 'brief'),
    sliceNamedFrame(source, 'title'),
    sliceNamedFrame(source, 'job'),
    sliceNamedFrame(source, 'house'),
    sliceNamedFrame(source, 'style'),
    sliceNamedFrame(source, 'subject'),
    sliceNamedFrame(source, 'genre'),
    sliceNamedFrame(source, 'continuity'),
    emitBody,
  ]
    .filter(Boolean)
    .join('\n')

  for (const line of traitBody.split('\n')) {
    const handle = line.match(BARE_HANDLE)
    if (handle?.groups?.name && !options.register) {
      register = handle.groups.name
    }

    const lensLine = line.match(LENS_OR_FACET)
    if (lensLine) {
      const names = [...lensLine[1].matchAll(/#([a-zA-Z_][\w-]*)/g)].map((m) => m[1])
      if (line.includes('lens')) lenses.push(...names)
      else facets.push(...names)
    }

    const m = line.match(STRING_ASSIGN)
    if (!m?.groups) continue
    const key = (m.groups.trait ?? m.groups.key ?? '').replace(/^~#/, '')
    const val = unquoteSpwString(m.groups.val ?? '')
    if (!key || !val) continue

    if (m.groups.trait || key.startsWith('#') || isTraitKey(key)) {
      traits[key.replace(/^#/, '')] = val
    } else if (isSlotKey(key) || m.groups.star) {
      slots[normalizeSlotKey(key)] = val
    } else if (TRAIT_KEYS.has(key)) {
      traits[key] = val
    } else if (SLOT_KEYS.has(key)) {
      slots[normalizeSlotKey(key)] = val
    } else {
      // publishing / freeform string assigns land as slots
      slots[normalizeSlotKey(key)] = val
    }
  }

  // Global includes from full source
  let im: RegExpExecArray | null
  const includeRe = new RegExp(INCLUDE_PATH.source, 'g')
  while ((im = includeRe.exec(source)) !== null) {
    const p = im[1] ?? im[2]
    if (p) includes.push(p)
  }

  // working_summary etc.
  const summary = source.match(/working_summary\s*=\s*(["'`])((?:\\.|(?!\1).)*)\1/)
  if (summary?.[2] && !slots.summary) {
    slots.summary = unquoteSpwString(summary[2])
  }

  let dims = resolveRegisterDims(register)
  dims = applyDimSets(dims, options.set)

  if (!register && Object.keys(slots).length === 0 && Object.keys(traits).length === 0) {
    warnings.push('no emit slots or traits extracted — surface may use non-standard frames')
  }

  const anchors = collectAnchors(traits, slots)
  const styleAnchors = collectStyleAnchors(traits, slots)
  const subjectAnchors = collectSubjectAnchors(traits, slots)
  const genreAnchors = collectGenreAnchors(traits, slots)

  return {
    version: SPW_EMIT_IR_VERSION,
    sourcePath,
    register,
    dims,
    traits,
    slots,
    includes: unique(includes),
    optics: {
      lenses: unique(lenses),
      facets: unique(facets),
    },
    anchors,
    styleAnchors,
    subjectAnchors,
    genreAnchors,
    line: {
      style_id: slots.style_id || traits.style_id,
      subject_id: slots.subject_id || traits.subject_id,
      genre_id: slots.genre_id || traits.genre_id,
    },
    meta: {
      positive_ground: true,
      vendor_free: true,
      warnings,
    },
  }
}

const TRAIT_KEYS = new Set([
  'claim',
  'proof',
  'door',
  'goal',
  'taste',
  'status',
  'intent',
  'title',
  'subtitle',
  'audience',
  'acceptance',
  'continuity',
  'anchors',
  'working_title',
  'logline',
  'style',
  'subject',
  'genre',
  'promise',
  'weather',
  'fill',
  'style_lock',
  'subject_lock',
  'genre_lock',
])

const SLOT_KEYS = new Set([
  'short_prompt',
  'final_prompt',
  'negative_prompt',
  'copy',
  'body',
  'text',
  'summary',
  'flags',
  'headline',
  'dek',
  'hook',
  'cold_open',
  'cta',
  'duration',
  'beat',
  'channel',
  'hashtag',
  'continuity',
  'anchors',
  'style_lock',
  'subject_lock',
  'genre_lock',
  'style_id',
  'subject_id',
  'genre_id',
  'subject_name',
])

function isTraitKey(key: string): boolean {
  return TRAIT_KEYS.has(key.toLowerCase())
}

function isSlotKey(key: string): boolean {
  return SLOT_KEYS.has(key.toLowerCase())
}

function normalizeSlotKey(key: string): string {
  // Keep body/copy distinct for copy host; plain host still prefers final_prompt.
  if (key === 'text') return 'text'
  if (key === 'copy') return 'body'
  return key
}

function unquoteSpwString(raw: string): string {
  return raw.replace(/\\(["'`\\nrt])/g, (_, ch: string) => {
    if (ch === 'n') return '\n'
    if (ch === 't') return '\t'
    if (ch === 'r') return '\r'
    return ch
  })
}

/** Slice body of ^"name"{ … } or ^["name"]{ … } (best-effort brace match). */
export function sliceNamedFrame(source: string, name: string): string | null {
  const patterns = [
    new RegExp(`\\^\\s*"${name}"\\s*\\{`, 'i'),
    new RegExp(`\\^\\s*\\[\\s*"${name}"\\s*\\]\\s*\\{`, 'i'),
  ]
  let start = -1
  for (const re of patterns) {
    const m = re.exec(source)
    if (m) {
      start = m.index + m[0].length
      break
    }
  }
  if (start < 0) return null

  let depth = 1
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i]
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, i)
    }
  }
  return source.slice(start)
}

function unique(items: string[]): string[] {
  return [...new Set(items)]
}
