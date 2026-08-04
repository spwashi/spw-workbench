/**
 * `@spwashi/lite-parser` — the browser target.
 *
 * A scanner and a geometry probe, nothing above them. Import this instead of
 * `@spwashi/spw-seed` when the consumer is a client bundle: the full kernel
 * carries the parser, normalizer, query engine, and canonical readers, none of
 * which a runtime module needs to colour or measure a surface.
 *
 * Zero dependencies and zero imports from the rest of the package — that is the
 * property the size budget rests on, and `scripts/release/check-lite-size.ts`
 * enforces it.
 *
 * @see src/lite/scan.ts
 */

export {
  scan,
  scanGeometry,
  SPW_OPERATORS,
  SPW_PARTICLE_AIMS,
  SPW_BOUNDS,
  type LiteToken,
  type LiteTokenKind,
  type LiteBoundKind,
  type LiteGeometry,
} from './lite/scan'
