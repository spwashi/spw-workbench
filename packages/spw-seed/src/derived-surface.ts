/**
 * Derived .spw surfaces and gen-root conventions — not authored canon.
 *
 * ## Derived (double-suffix)
 * A derived surface names its transform in a `.<kind>.spw` double-suffix, e.g.
 * `dialect.expanded.spw` from `dialect.spw`. Tooling recognizes these so it can
 * (a) skip them in canon scans — lint, mount resolve, audit — and (b) recover
 * the authored source they came from.
 *
 * Why exclusion matters: a derived artifact is not guaranteed to re-parse as
 * canon. `spw expand` frames foreign content in `<< … >>` streams that need not
 * round-trip the parser, so a scanner that walked `x.expanded.spw` as a source
 * would fail or double-count. Derived surfaces are outputs, not inputs.
 *
 * The set of kinds is small and explicit rather than a broad `*.*.spw` pattern,
 * so an authored file with an incidental dotted stem is never mistaken for one.
 *
 * ## Gen root (`.spw/gen/`)
 * Host and intermediate artifacts that are not Spw-shaped projections live under
 * `.spw/gen/` (atlas HTML, field dumps, session precipitates). Never invent/map
 * them as roots. Prefer Spw dual-read cards on stdout when teaching; gen is for
 * durable offline receipts agents may re-open.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

/** Registered derived-artifact kinds (Spw-shaped projections of a source). */
export const DERIVED_SPW_KINDS = ['expanded'] as const
export type DerivedSpwKind = (typeof DERIVED_SPW_KINDS)[number]

const DERIVED_RE = new RegExp(`\\.(${DERIVED_SPW_KINDS.join('|')})\\.spw$`)

/** Workspace-relative gen root for non-canon intermediates. */
export const SPW_GEN_ROOT = '.spw/gen'

/** Named gen subtrees — inspectable layout, not a second language. */
export const SPW_GEN_KINDS = [
  'atlas',
  'geometry',
  'field',
  'resonance',
  'cycle',
  'session',
  'index',
] as const
export type SpwGenKind = (typeof SPW_GEN_KINDS)[number]

/** True when a path or basename is a derived .spw artifact (e.g. `x.expanded.spw`). */
export function isDerivedSurface(name: string): boolean {
  return DERIVED_RE.test(name)
}

/** The authored source a derived surface came from, or null when not derived. */
export function sourceSurfaceOf(name: string): string | null {
  const match = DERIVED_RE.exec(name)
  return match ? name.slice(0, match.index) + '.spw' : null
}

/** Build the derived surface name for a source and transform kind. */
export function derivedSurfaceName(source: string, kind: DerivedSpwKind): string {
  return source.replace(/\.spw$/, '') + `.${kind}.spw`
}

/** True when path is under `.spw/gen/` (any separator). */
export function isGenPath(name: string): boolean {
  const p = name.replace(/\\/g, '/')
  return p.includes('/.spw/gen/') || p.startsWith('.spw/gen/') || p === '.spw/gen'
}

/**
 * Build a gen-relative path for a kind + stem.
 * Example: genSurfacePath('field', 'prompts') → `.spw/gen/field/prompts.spw`
 * Stem may already include an extension; default is `.spw` for dual-read dumps.
 */
export function genSurfacePath(
  kind: SpwGenKind | string,
  stem: string,
  ext = '.spw',
): string {
  const clean = stem.replace(/^\/+/, '').replace(/\\/g, '/')
  const withExt = clean.endsWith(ext) || /\.[a-z0-9]+$/i.test(clean) ? clean : clean + ext
  return `${SPW_GEN_ROOT}/${kind}/${withExt}`
}

/** Skip in corpus walks: derived double-suffix or gen root. */
export function shouldSkipCorpusSurface(name: string): boolean {
  return isDerivedSurface(name) || isGenPath(name)
}
