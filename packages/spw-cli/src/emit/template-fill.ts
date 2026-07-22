/**
 * Spw template fill / expand — holes, named slots, defaults, open reports.
 *
 * Syntax (matches prompts/sagas/macros.spw):
 *   ${name=default}  named slot with default
 *   ${name}          named slot, open if unbound
 *   $name            short named slot (not $_ match wildcard)
 *   _                creative hole (reported; not auto-filled unless --fill-holes)
 *
 * Law: expand is not mutate. Locked surfaces block overwrite of listed slots.
 *
 * @see prompts/templates/fill.spw
 * @see prompts/sagas/macros.spw
 * @see prompts/templates/derivatives.spw
 */

export const SPW_TEMPLATE_VERSION = 'spw.template/1' as const

export interface TemplateBindings {
  [slot: string]: string
}

export interface ExpandOptions {
  /** Fail if any named $slot remains open after expand */
  strictHoles?: boolean
  /** Replace bare `_` tokens that are whole words with binding `_` or empty skip */
  fillBareHoles?: boolean
  /** Value for bare `_` when fillBareHoles (default empty string removes hole marker poorly — use explicit) */
  bareHoleValue?: string
  /**
   * Slot names that must not change if present as already-filled literals
   * (optional harden path for lock discipline)
   */
  lockedSlots?: string[]
  /** If true, leave ${name=default} unbound as default rather than open */
  applyDefaults?: boolean
}

export interface ExpandResult {
  version: typeof SPW_TEMPLATE_VERSION
  text: string
  bindings: TemplateBindings
  filled: string[]
  defaultsUsed: string[]
  open: string[]
  bareHolesRemaining: number
  lockedBlocked: string[]
  complete: boolean
}

export interface HoleReport {
  version: typeof SPW_TEMPLATE_VERSION
  named: Array<{ name: string; hasDefault: boolean; defaultValue?: string; count: number }>
  bareHoleCount: number
  requiredOpen: string[]
  /** Heuristic: status: #locked or status: #locked in surface */
  surfaceLocked: boolean
  lineage?: DerivativeLineage
}

export interface DerivativeLineage {
  mode: 'in_place' | 'fork' | 'overlay' | 'unknown'
  base?: string
  revision?: number
  parent?: string
  derivative_id?: string
}

export interface DerivativeStamp {
  base: string
  mode: 'in_place' | 'fork' | 'overlay'
  revision: number
  parent?: string
  derivative_id: string
  note?: string
}

// Named slots: ${name} or ${name=default} — name is [A-Za-z_][A-Za-z0-9_]*
const BRACED_SLOT = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?:=([^}]*))?\}/g
// Short $name — not followed by { ; not $_ alone as match wildcard we leave
const SHORT_SLOT = /\$([A-Za-z][A-Za-z0-9_]*)\b/g
// Bare creative holes: underscore as whole token (not inside identifiers)
const BARE_HOLE = /(?<![A-Za-z0-9_$])_(?![A-Za-z0-9_])/g

export function expandTemplate(
  source: string,
  bindings: TemplateBindings,
  opts: ExpandOptions = {},
): ExpandResult {
  const applyDefaults = opts.applyDefaults !== false
  const filled: string[] = []
  const defaultsUsed: string[] = []
  const openSet = new Set<string>()
  const lockedBlocked: string[] = []
  const locked = new Set(opts.lockedSlots ?? [])

  let text = source

  // Pass 1: braced slots
  text = text.replace(BRACED_SLOT, (match, name: string, def?: string) => {
    if (locked.has(name) && bindings[name] !== undefined) {
      lockedBlocked.push(name)
      return match
    }
    if (bindings[name] !== undefined) {
      filled.push(name)
      return bindings[name]!
    }
    if (applyDefaults && def !== undefined) {
      defaultsUsed.push(name)
      return def
    }
    openSet.add(name)
    return match
  })

  // Pass 2: short $name (skip if already expanded braces left $ only)
  text = text.replace(SHORT_SLOT, (match, name: string) => {
    // Avoid double-counting if still inside unresolved ${
    if (locked.has(name) && bindings[name] !== undefined) {
      if (!lockedBlocked.includes(name)) lockedBlocked.push(name)
      return match
    }
    if (bindings[name] !== undefined) {
      if (!filled.includes(name)) filled.push(name)
      return bindings[name]!
    }
    openSet.add(name)
    return match
  })

  let bareHolesRemaining = countBareHoles(text)
  if (opts.fillBareHoles && opts.bareHoleValue !== undefined) {
    text = text.replace(BARE_HOLE, opts.bareHoleValue)
    bareHolesRemaining = countBareHoles(text)
  }

  const open = [...openSet].sort()
  const complete = open.length === 0 && bareHolesRemaining === 0

  if (opts.strictHoles && !complete) {
    const parts = [
      open.length ? `open slots: ${open.join(', ')}` : '',
      bareHolesRemaining ? `bare holes: ${bareHolesRemaining}` : '',
    ].filter(Boolean)
    throw new Error(`spw template: incomplete expand — ${parts.join('; ')}`)
  }

  return {
    version: SPW_TEMPLATE_VERSION,
    text,
    bindings: { ...bindings },
    filled: unique(filled),
    defaultsUsed: unique(defaultsUsed),
    open,
    bareHolesRemaining,
    lockedBlocked: unique(lockedBlocked),
    complete,
  }
}

export function reportHoles(source: string): HoleReport {
  const namedMap = new Map<string, { hasDefault: boolean; defaultValue?: string; count: number }>()

  for (const m of source.matchAll(BRACED_SLOT)) {
    const name = m[1]!
    const def = m[2]
    const prev = namedMap.get(name)
    namedMap.set(name, {
      hasDefault: prev?.hasDefault || def !== undefined,
      defaultValue: def ?? prev?.defaultValue,
      count: (prev?.count ?? 0) + 1,
    })
  }
  for (const m of source.matchAll(SHORT_SLOT)) {
    const name = m[1]!
    const prev = namedMap.get(name)
    namedMap.set(name, {
      hasDefault: prev?.hasDefault ?? false,
      defaultValue: prev?.defaultValue,
      count: (prev?.count ?? 0) + 1,
    })
  }

  const named = [...namedMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const requiredOpen = named.filter(n => !n.hasDefault).map(n => n.name)
  const surfaceLocked = /status:\s*#locked\b/.test(source) || /status:\s*#shipped\b/.test(source)
  const lineage = parseLineage(source)

  return {
    version: SPW_TEMPLATE_VERSION,
    named,
    bareHoleCount: countBareHoles(source),
    requiredOpen,
    surfaceLocked,
    lineage,
  }
}

export function parseBindingsList(pairs: string[]): TemplateBindings {
  const out: TemplateBindings = {}
  for (const raw of pairs) {
    const eq = raw.indexOf('=')
    if (eq <= 0) throw new Error(`spw template: binding must be key=value (got "${raw}")`)
    const key = raw.slice(0, eq).trim().replace(/^\$/, '')
    const value = raw.slice(eq + 1)
    if (!key) throw new Error(`spw template: empty binding key in "${raw}"`)
    out[key] = value
  }
  return out
}

/** Parse --set style maps also used by emit dims: name=value */
export function mergeBindingMaps(...maps: TemplateBindings[]): TemplateBindings {
  return Object.assign({}, ...maps)
}

export function parseLineage(source: string): DerivativeLineage | undefined {
  const modeM = source.match(/^\s*mode:\s*#(in_place|fork|overlay)\b/m)
  const baseM = source.match(/^\s*base:\s*~?"([^"]+)"/m) || source.match(/^\s*base:\s*~'([^']+)'/m)
  const revM = source.match(/^\s*revision:\s*(\d+)\b/m)
  const parentM = source.match(/^\s*parent:\s*"([^"]+)"/m)
  const idM = source.match(/^\s*derivative_id:\s*"([^"]+)"/m)
  if (!modeM && !baseM && !idM) return undefined
  return {
    mode: (modeM?.[1] as DerivativeLineage['mode']) ?? 'unknown',
    base: baseM?.[1],
    revision: revM ? Number(revM[1]) : undefined,
    parent: parentM?.[1],
    derivative_id: idM?.[1],
  }
}

/**
 * Stamp a derivative header block for in-place / fork / overlay scripts.
 * Inserts or replaces ^"lineage"{ … } near the top after first header comments.
 */
export function stampDerivative(source: string, stamp: DerivativeStamp): string {
  const block = [
    '^"lineage"{',
    ` mode: #${stamp.mode}`,
    ` base: ~"${stamp.base}"`,
    ` revision: ${stamp.revision}`,
    stamp.parent ? ` parent: "${stamp.parent}"` : ' parent: ""',
    ` derivative_id: "${stamp.derivative_id}"`,
    stamp.note ? ` note: "${stamp.note.replace(/"/g, '\\"')}"` : '',
    '}',
  ]
    .filter(Boolean)
    .join('\n')

  if (/^"lineage"\{/.test(source) || /\^"lineage"\{/.test(source)) {
    return source.replace(/\^"lineage"\{[\s\S]*?\n\}/, block)
  }

  // After first non-comment content block of # headers
  const lines = source.split('\n')
  let insertAt = 0
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]!.trim()
    if (t === '' || t.startsWith('#') || t.startsWith('//')) {
      insertAt = i + 1
      continue
    }
    break
  }
  lines.splice(insertAt, 0, '', block, '')
  return lines.join('\n')
}

export function renderHoleReport(report: HoleReport, mode: 'text' | 'json' = 'text'): string {
  if (mode === 'json') return JSON.stringify(report, null, 2)
  const lines: string[] = [
    `# holes version=${report.version} locked=${report.surfaceLocked} bare=${report.bareHoleCount}`,
  ]
  if (report.lineage) {
    lines.push(
      `# lineage mode=${report.lineage.mode} base=${report.lineage.base ?? '—'} rev=${report.lineage.revision ?? '—'}`,
    )
  }
  for (const n of report.named) {
    const def = n.hasDefault ? ` default=${JSON.stringify(n.defaultValue ?? '')}` : ' required'
    lines.push(`  $${n.name} ×${n.count}${def}`)
  }
  if (report.requiredOpen.length) {
    lines.push(`# required open: ${report.requiredOpen.join(', ')}`)
  }
  if (!report.named.length && report.bareHoleCount === 0) {
    lines.push('  (no template slots found)')
  }
  return lines.join('\n')
}

export function renderExpandResult(result: ExpandResult, mode: 'text' | 'json' = 'text'): string {
  if (mode === 'json') return JSON.stringify(result, null, 2)
  const head = [
    `# expand complete=${result.complete} filled=${result.filled.length} open=${result.open.length} bare=${result.bareHolesRemaining}`,
    result.open.length ? `# open: ${result.open.join(', ')}` : '',
    result.defaultsUsed.length ? `# defaults: ${result.defaultsUsed.join(', ')}` : '',
    result.lockedBlocked.length ? `# locked-blocked: ${result.lockedBlocked.join(', ')}` : '',
    '',
  ]
    .filter(Boolean)
    .join('\n')
  return `${head}${result.text}`
}

/** Catalog ids for built-in script templates (mirrors prompts/templates/). */
export const BUILTIN_TEMPLATE_IDS = [
  'saga.stream',
  'saga.nest',
  'saga.line',
  'publish.job',
  'publish.title',
  'publish.line',
  'show.line_field',
  'media.image',
  'media.copy',
  'media.audio',
  'media.social',
  'media.brief',
  'modality.still',
  'modality.motion',
  'modality.prose',
  'modality.embodied',
] as const

export type BuiltinTemplateId = (typeof BUILTIN_TEMPLATE_IDS)[number]

/** Repo-relative paths for builtin templates (when workbench present). */
export const BUILTIN_TEMPLATE_PATHS: Record<BuiltinTemplateId, string> = {
  'saga.stream': 'prompts/sagas/templates/stream.spw',
  'saga.nest': 'prompts/sagas/templates/nest.spw',
  'saga.line': 'prompts/sagas/templates/line.spw',
  'publish.job': 'prompts/templates/publish/job-instance.spw',
  'publish.title': 'prompts/templates/publish/title-instance.spw',
  'publish.line': 'prompts/templates/publish/line-instance.spw',
  'show.line_field': 'prompts/templates/show/line-field.spw',
  'media.image': 'prompts/templates/media/image.spw',
  'media.copy': 'prompts/templates/media/copy.spw',
  'media.audio': 'prompts/templates/media/audio.spw',
  'media.social': 'prompts/templates/media/social.spw',
  'media.brief': 'prompts/templates/media/brief.spw',
  'modality.still': 'prompts/templates/modality/still.spw',
  'modality.motion': 'prompts/templates/modality/motion.spw',
  'modality.prose': 'prompts/templates/modality/prose.spw',
  'modality.embodied': 'prompts/templates/modality/embodied.spw',
}

function countBareHoles(text: string): number {
  const m = text.match(BARE_HOLE)
  return m?.length ?? 0
}

function unique(items: string[]): string[] {
  return [...new Set(items)]
}
