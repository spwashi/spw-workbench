/**
 * Derived .spw surfaces — generated artifacts, not authored canon.
 *
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
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

/** Registered derived-artifact kinds. Extend as new projecting tools land. */
export const DERIVED_SPW_KINDS = ['expanded'] as const
export type DerivedSpwKind = (typeof DERIVED_SPW_KINDS)[number]

const DERIVED_RE = new RegExp(`\\.(${DERIVED_SPW_KINDS.join('|')})\\.spw$`)

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
