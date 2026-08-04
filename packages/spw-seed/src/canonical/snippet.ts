/**
 * Spw snippet generation and hydration.
 *
 * A **snippet** is a tagged, instantiable seed (operator + structure + holes).
 * **Generate** materializes catalog entries for editors (VS Code) or stdout.
 * **Hydrate** fills `${name=default}` / `${name}` slots without mutating the
 * catalog definition (expand ≠ mutate; hydrate ≠ interpret `!` register).
 *
 * @see .spw/patterns/literate-ui.spw  snippet_economy
 * @see packages/spw-cli/src/emit/template-fill.ts  related expand path
 */

export const SPW_SNIPPET_VERSION = 'spw.snippet/1' as const

export type SnippetFamily =
  | 'form'
  | 'sense'
  | 'measure'
  | 'flow'
  | 'dialect'
  | 'plan'
  | 'nav'
  | 'wonder'
  | 'general'

export interface SpwSnippet {
  /** Stable id (catalog / CLI). */
  id: string
  /** Editor trigger prefix. */
  prefix: string
  /** Body lines (VS Code tabstops ${1:name} or hydrate ${name=default}). */
  body: string[]
  description: string
  family: SnippetFamily
  /** Optional dialect product surface. */
  dialect?: string
  /** Catalog / theory reference. */
  docs?: string
}

export type SnippetBindings = Record<string, string>

export interface HydrateOptions {
  applyDefaults?: boolean
  strict?: boolean
}

export interface HydrateResult {
  version: typeof SPW_SNIPPET_VERSION
  id: string
  text: string
  filled: string[]
  defaultsUsed: string[]
  open: string[]
  complete: boolean
}

/** ${name} or ${name=default} — not VS Code ${1:label} tabstops. */
const HYDRATE_SLOT = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?:=([^}]*))?\}/g
/** VS Code numeric tabstops — leave alone during hydrate. */
const VSCODE_TABSTOP = /^\$\{(\d+)(?::([^}]*))?\}$/

/**
 * Core catalog — sense renames, measure kernel, flow schedules, dual-read.
 * Keep portable; editors generate from this.
 */
export const CORE_SNIPPETS: readonly SpwSnippet[] = [
  {
    id: 'seed.header',
    prefix: 'seed',
    family: 'general',
    description: 'Seed with profile and intent',
    body: [
      '^seed[${Name=Demo} v:0.1 @profile:Spw.${dialect=b} @intent:${intent=sketch}]',
      '$0',
    ],
  },
  {
    id: 'frame.named',
    prefix: 'frame',
    family: 'form',
    description: 'Named integrate frame ^["label"]{ }',
    body: ['^["${label=name}"]{', '  $0', '}'],
  },
  {
    id: 'roots.bind',
    prefix: 'roots',
    family: 'nav',
    description: 'Roots frame with @name path binds',
    body: [
      '^["roots"]{',
      '  @${name=self}: ~"${path=./path}"',
      '  $0',
      '}',
    ],
  },
  {
    id: 'wonder.probe',
    prefix: 'wonder',
    family: 'wonder',
    description: 'Wonder block with depth, probe, measure',
    body: [
      '#>${id=wonder_id}',
      '?["${question=What holds?}"]{',
      '  #:depth #!${depth=computational}',
      '  !probe{ =id[${probe=p1}] }',
      '  $%[${metric=Hold}]',
      '}',
    ],
  },
  {
    id: 'measure.mass',
    prefix: 'mass',
    family: 'measure',
    description: 'Thrift family: @self + %mass (measure kernel specialization)',
    docs: '.spw/registries/measure-context.spw',
    body: [
      '^["${label=module}"]{',
      '  @self: ~"${subject=./src/file.ts}"',
      '  %mass{ lines: ${lines=0}, bytes: ${bytes=0} }',
      '}',
    ],
  },
  {
    id: 'measure.density',
    prefix: 'density',
    family: 'measure',
    description: 'Syntax plane %density (proposed family)',
    docs: '.spw/registries/measure-context.spw',
    body: [
      '^["${label=surface}"]{',
      '  %density{ ops: ${ops=0}, depth: ${depth=0}, frames: ${frames=0} }',
      '}',
    ],
  },
  {
    id: 'flow.schedule',
    prefix: 'schedule',
    family: 'flow',
    dialect: 'Spw.f',
    description: 'CA / stream schedule with ; and ||',
    docs: 'docs/theory/spw/flow-protocol-sigils.spw',
    body: [
      '@dialect:Spw.f',
      '=phi[ id: ${id=soft} ]{ << ~ ; ? ; % ; ! ; ^ >> }',
      '=ceiling[ ${ceiling=l0} ]',
    ],
  },
  {
    id: 'flow.pipeline',
    prefix: 'pipeline',
    family: 'flow',
    description: 'Bare sequential schedule stream',
    body: ['<< ~ ; ? ; % ; ! ; * ; ^ >>'],
  },
  {
    id: 'dialect.header',
    prefix: 'dialect',
    family: 'dialect',
    description: 'Dialect mark + seed stack',
    body: [
      '@dialect:Spw.${dialect=b}',
      '^seed[${Name=Surface} v:0.1 @profile:Spw.${dialect=b}]',
      '$0',
    ],
  },
  {
    id: 'sense.surface_card',
    prefix: 'surface',
    family: 'sense',
    description: 'Minimal surface stack card seed',
    body: [
      '@dialect:Spw.${dialect=b}',
      '^seed[${Name=Card} v:0.1 @profile:Spw.${dialect=b} @intent:${intent=sense}]',
      '^["roots"]{',
      '  @here: ~"."',
      '}',
      '^["intent"]{',
      '  ~#goal: "${goal=describe this surface}"',
      '}',
    ],
  },
  {
    id: 'ref.dual_read',
    prefix: 'dualref',
    family: 'nav',
    description: 'Point and follow dual-read (ref-deref literacy)',
    docs: 'docs/theory/spw/reference-deref-geometry.spw',
    body: [
      '@self: ~"${path=./mod.spw}"',
      '$~"${path=./mod.spw}"',
    ],
  },
  {
    id: 'exp.cite',
    prefix: 'exp',
    family: 'general',
    description: 'Cite experimental catalog id',
    body: ['=exp[ id: ${id=flow.sigma_chain} , status: ${status=proposed} ]'],
  },
  {
    id: 'plan.stream',
    prefix: 'planstream',
    family: 'plan',
    dialect: 'Spw.p',
    description: 'Plan stream + open question',
    body: [
      '@dialect:Spw.p',
      '^["stream"]{',
      '  >>["${date=2026-07-27}"] "${type=note}: ${message=…}"',
      '}',
      '^["open"]{',
      '  ?[${qid=x}]: "${question=…}"',
      '}',
    ],
  },
  {
    id: 'form.wrap',
    prefix: 'formwrap',
    family: 'form',
    description: 'Confluence wrap sequence',
    body: ['& => {&} => {&[#${label=label}]} => {&<#${tag=tag}>_${label=label}}'],
  },
  {
    id: 'episode.commit',
    prefix: 'episode',
    family: 'plan',
    description: 'Commit episode block',
    body: [
      '#[episode]{',
      '  ~[scene]{ "${scene=…}" }',
      '  ![change]{ ${change=…} }',
      '  *[verify]{ ${verify=…} }',
      '}',
    ],
  },
  {
    id: 'path.ref',
    prefix: 'tref',
    family: 'nav',
    description: 'Tilde path reference',
    body: ['~"${path=./path.spw}"'],
  },
  {
    id: 'probe.block',
    prefix: 'probe',
    family: 'wonder',
    description: 'Bare !probe cell',
    body: ['!probe{ =id[${id=p}] }'],
  },
] as const

const BY_ID = new Map(CORE_SNIPPETS.map(s => [s.id, s]))

export function getSnippet(id: string): SpwSnippet | undefined {
  return BY_ID.get(id)
}

export function listSnippets(filter?: {
  family?: SnippetFamily
  prefix?: string
  dialect?: string
}): SpwSnippet[] {
  return CORE_SNIPPETS.filter(s => {
    if (filter?.family && s.family !== filter.family) return false
    if (filter?.prefix && !s.prefix.startsWith(filter.prefix) && s.prefix !== filter.prefix) {
      return false
    }
    if (filter?.dialect && s.dialect && s.dialect !== filter.dialect) return false
    return true
  })
}

/** Join body lines for hydrate / stdout. */
export function snippetSource(snippet: SpwSnippet): string {
  return snippet.body.join('\n')
}

/**
 * Hydrate named slots. Leaves VS Code `${1:tab}` tabstops intact when they
 * start with a digit; fills `${name}` / `${name=default}` hydrate slots.
 */
export function hydrateSnippet(
  snippet: SpwSnippet | string,
  bindings: SnippetBindings = {},
  opts: HydrateOptions = {},
): HydrateResult {
  const id = typeof snippet === 'string' ? 'inline' : snippet.id
  const source = typeof snippet === 'string' ? snippet : snippetSource(snippet)
  const applyDefaults = opts.applyDefaults !== false
  const filled: string[] = []
  const defaultsUsed: string[] = []
  const open = new Set<string>()

  const text = source.replace(HYDRATE_SLOT, (match, name: string, def?: string) => {
    // Preserve VS Code-style numeric tabstops if someone used ${1:x}
    if (/^\d+$/.test(name)) return match
    if (bindings[name] !== undefined) {
      filled.push(name)
      return bindings[name]!
    }
    if (applyDefaults && def !== undefined) {
      defaultsUsed.push(name)
      return def
    }
    open.add(name)
    return match
  })

  const openList = [...open].sort()
  const complete = openList.length === 0
  if (opts.strict && !complete) {
    throw new Error(`snippet hydrate incomplete: open ${openList.join(', ')}`)
  }

  return {
    version: SPW_SNIPPET_VERSION,
    id,
    text,
    filled: [...new Set(filled)],
    defaultsUsed: [...new Set(defaultsUsed)],
    open: openList,
    complete,
  }
}

/** VS Code snippets.json shape. */
export type VscodeSnippetMap = Record<
  string,
  { prefix: string; body: string[]; description: string }
>

/**
 * Emit VS Code snippet map. Converts hydrate `${name=default}` to tabstops
 * `${n:default}` for the editor; keeps `$0` cursor.
 */
export function toVscodeSnippets(snippets: readonly SpwSnippet[] = CORE_SNIPPETS): VscodeSnippetMap {
  const out: VscodeSnippetMap = {}
  for (const s of snippets) {
    let tab = 1
    const body = s.body.map(line =>
      line.replace(HYDRATE_SLOT, (_m, name: string, def?: string) => {
        if (/^\d+$/.test(name)) return _m
        if (name === '0' || _m === '$0') return '$0'
        const n = tab++
        return def !== undefined ? `\${${n}:${def}}` : `\${${n}:${name}}`
      }),
    )
    const title = s.id
      .split('.')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ')
    out[title] = {
      prefix: s.prefix,
      body,
      description: s.description,
    }
  }
  return out
}

export function formatVscodeSnippetsJson(snippets?: readonly SpwSnippet[]): string {
  return `${JSON.stringify(toVscodeSnippets(snippets), null, 4)}\n`
}

/** Parse `k=v` pairs from CLI. */
export function parseBindings(pairs: string[]): SnippetBindings {
  const out: SnippetBindings = {}
  for (const p of pairs) {
    const i = p.indexOf('=')
    if (i <= 0) continue
    out[p.slice(0, i)] = p.slice(i + 1)
  }
  return out
}
