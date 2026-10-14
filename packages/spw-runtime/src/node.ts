/**
 * The runtime's node-only surface: mount resolution reads the filesystem, and
 * composition evaluation reads the files a composition names. Keeping them here
 * leaves the package root portable, so a browser can bundle the interpreter and
 * the hot session; node consumers import these from `@spwashi/spw-runtime/node`.
 */

export type { SpwMountResolution } from './site-install'
export {
  deriveMountRoots,
  discoverSpwMountResolution,
  findSpwSiteRoot,
  loadSpwMountResolution,
} from './site-install'

export {
  COMPOSITION_EVAL_VERSION,
  evaluateCompositionSource,
  type CompositionEvalOptions,
  type CompositionEvalResult,
} from './session/composition-eval'
