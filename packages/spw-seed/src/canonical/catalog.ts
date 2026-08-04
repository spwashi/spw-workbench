/**
 * Language catalog — completion vocabulary for LSP/CLI/snippets.
 *
 * Prefer **Spw-native** relational channels (couples, depends-on, maps-to…)
 * over host-domain metaphors. Medial capsules accept any identifier; this
 * list is guidance for authors, not a closed grammar.
 *
 * Configure further via Spw surfaces (conventions, registries) — not host JSON.
 *
 * @spw:portable:seed
 */

export interface MedialChannelDef {
  name: string
  description: string
  category: 'relational' | 'temporal' | 'structural' | 'semantic'
}

/**
 * Default medial channel completions — graph/edge physics, not sensory host words.
 * Qualitative freeform channels remain legal syntax; they are not promoted here.
 */
export const MEDIAL_CAPSULE_CHANNELS: readonly MedialChannelDef[] = [
  { name: 'couples', description: 'entanglement / resonance relation', category: 'relational' },
  { name: 'resonates', description: 'soft geometric or protocol couple', category: 'relational' },
  { name: 'depends-on', description: 'dependency graph edge', category: 'structural' },
  { name: 'contains', description: 'structural containment edge', category: 'structural' },
  { name: 'bounds', description: 'boundary / constraint envelope', category: 'structural' },
  { name: 'maps-to', description: 'functional transformation mapping', category: 'semantic' },
  { name: 'implements', description: 'specification fulfillment edge', category: 'semantic' },
  { name: 'refines', description: 'specification refinement edge', category: 'semantic' },
  { name: 'projects', description: 'view / projection of a form', category: 'semantic' },
  { name: 'cites', description: 'pathref / handle citation', category: 'semantic' },
  { name: 'scheduled', description: 'stream / schedule timing channel', category: 'temporal' },
  { name: 'affects', description: 'mutation vector or state effect', category: 'semantic' },
] as const

export interface ValenceParticleDef {
  name: string
  role: string
  description: string
}

export const VALENCE_PARTICLES: Record<string, ValenceParticleDef> = {
  boon: { name: 'boon', role: 'growth / implemented', description: 'Expansive growth, completed deliverable, positive outcome' },
  bane: { name: 'bane', role: 'hazard / error', description: 'Destructive hazard, blocking issue, error state' },
  bone: { name: 'bone', role: 'scaffold / partial', description: 'Structural scaffold, partial implementation, incomplete' },
  bonk: { name: 'bonk', role: 'conflict / interruption', description: 'Boundary collision, interruption, unexpected conflict' },
  honk: { name: 'honk', role: 'signal / telemetry', description: 'High-priority signal, announcement, telemetry alert' },
}

export interface TemplateSlotDef {
  name: string
  description: string
}

/** Spw-shaped template holes — avoid host-domain saga/genre unless in domain packs. */
export const TEMPLATE_SLOTS: readonly TemplateSlotDef[] = [
  { name: 'label', description: 'frame or facet identifier' },
  { name: 'path', description: 'tilde path reference payload' },
  { name: 'profile', description: 'dialect / surface profile id' },
  { name: 'intent', description: 'seed intent phrase' },
  { name: 'subject', description: '@self or subject path' },
  { name: 'scheme', description: 'measure or resonance weight scheme' },
  { name: 'channel', description: 'stability or medial channel id' },
  { name: 'claim', description: 'falsifiable assertion text' },
  { name: 'from', description: 'source origin (bias / edge)' },
  { name: 'to', description: 'target destination (bias / edge)' },
  { name: 'id', description: 'stable handle id' },
  { name: 'grade', description: 'effect grade or ceiling' },
] as const

export interface SigilSnippetDef {
  label: string
  insert: string
  detail?: string
}

export const SIGIL_SNIPPET_CATALOG: Record<string, SigilSnippetDef[]> = {
  '^': [
    { label: '^["section"] {', insert: '^["${1:section}"] {\n\t$0\n}', detail: 'frame container' },
    { label: '^seed[name]', insert: '^seed[${1:Name} v:0.1 @profile:Spw.${2:b} @intent:${3:sketch}]', detail: 'seed declaration' },
  ],
  '!': [
    { label: '!boon["label"]', insert: '!boon["${1:label}"]', detail: 'boon valence (growth)' },
    { label: '!bane["label"]', insert: '!bane["${1:label}"]', detail: 'bane valence (hazard)' },
    { label: '!bone["label"]', insert: '!bone["${1:label}"]', detail: 'bone valence (scaffold)' },
    { label: '!bonk["label"]', insert: '!bonk["${1:label}"]', detail: 'bonk valence (conflict)' },
    { label: '!honk["label"]', insert: '!honk["${1:label}"]', detail: 'honk valence (signal)' },
    { label: '!probe{ }', insert: '!probe{ =id[${1:p1}] }', detail: 'named probe' },
  ],
  '#': [
    { label: '##>prompt_root', insert: '##>${1:prompt_root}', detail: 'prompt-root navigation landmark' },
    { label: '#>anchor', insert: '#>${1:anchor}', detail: 'navigation anchor' },
    { label: '#:lens', insert: '#:${1:lens}', detail: 'conceptual axis / case particle' },
    { label: '#!intent', insert: '#!${1:intent}', detail: 'action orientation / mood particle' },
  ],
  '?': [
    { label: '?["question"]', insert: '?["${1:question}"]{\n\t$0\n}', detail: 'probe question block' },
  ],
  '~': [
    { label: '~#trait: value', insert: '~#${1:trait}: ${2:value}', detail: 'concise aspect trait' },
    { label: '~"path"', insert: '~"${1:path}"', detail: 'local path reference' },
  ],
  '&': [
    { label: '& => {&}', insert: '& => {&}', detail: 'confluence wrap step' },
    { label: '&[label]', insert: '&[${1:label}]', detail: 'subject reference' },
  ],
  '%': [
    { label: '%mass{ }', insert: '%mass{ lines: ${1:0}, bytes: ${2:0} }', detail: 'thrift mass facet' },
    { label: '%[measure]', insert: '%[${1:measure.path}]', detail: 'scalar observation' },
  ],
  '*': [
    { label: '*variant', insert: '*${1:variant}', detail: 'collapse / variant' },
  ],
  '$': [
    { label: '$["selector"]', insert: '$["${1:selector}"]', detail: 'selector query' },
    { label: '$~"path"', insert: '$~"${1:path}"', detail: 'select pathref (follow)' },
    { label: '$%[register]', insert: '$%[${1:register.path}]', detail: 'register state query' },
  ],
  '=': [
    { label: '=bias[axis]', insert: '=${1:axis}[ ${2:id} ]{ ${3:_} }', detail: 'bias / schedule axis' },
    { label: '@dialect:', insert: '@dialect:Spw.${1:b}', detail: 'dialect mark' },
  ],
  '<': [
    { label: 'left<couples>right', insert: '${1:left}<couples>${2:right}', detail: 'medial couple (Spw-native)' },
    { label: 'left<depends-on>right', insert: '${1:a}<depends-on>${2:b}', detail: 'medial dependency' },
    { label: 'left<maps-to>right', insert: '${1:from}<maps-to>${2:to}', detail: 'medial mapping' },
  ],
}
