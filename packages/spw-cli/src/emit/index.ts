/**
 * Emit API — collapse Spw surfaces to host packets.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { extractEmitDocument } from './extract'
import { encodeHost } from './codecs'
import type { EmitHost, EmitOptions, EmitPackResult } from './types'
import { listBuiltinRegisters } from './registers'

export * from './types'
export { listBuiltinRegisters, resolveRegisterDims, applyDimSets } from './registers'
export { extractEmitDocument, sliceNamedFrame } from './extract'
export { encodeHost } from './codecs'
export { holdPositive, countNegationSpine } from './positive-ground'
export { collectAnchors, measureContinuity, parseAnchors, measureHold } from './continuity'
export {
  FRACTAL_PROFILES,
  listFractalProfiles,
  resolveFractalProfile,
  mergeFractalConfig,
  planFractalMutation,
  runFractalEmit,
  parseHostList,
  parseCoordinateList,
  renderFractalResult,
  type FractalRunConfig,
  type FractalPlan,
  type FractalEmitResult,
  type FractalMutationConfig,
  type FractalEmitConfig,
  type FractalCoordinate,
  type FractalObjective,
} from './fractal'
export {
  AXIS_CATALOG,
  AXIS_CONTEXTS,
  AXIS_RELATIONS,
  HOLD_FACTORS,
  salienceForContext,
  holdAlphaForContext,
  holdProduct,
  literacyProduct,
  normalizeSalience,
  weightedMean,
  cacheAxisContext,
  parseAxisContext,
  defaultContextForProfile,
  estimateLiteracy,
  type AxisContext,
  type AbstractAxisId,
  type AxisCacheSnapshot,
  type HoldFactorId,
  type AxisEdge,
} from './axes'
export {
  SPW_TEMPLATE_VERSION,
  expandTemplate,
  reportHoles,
  parseBindingsList,
  mergeBindingMaps,
  parseLineage,
  stampDerivative,
  renderHoleReport,
  renderExpandResult,
  BUILTIN_TEMPLATE_IDS,
  BUILTIN_TEMPLATE_PATHS,
  type TemplateBindings,
  type ExpandOptions,
  type ExpandResult,
  type HoleReport,
  type DerivativeStamp,
  type BuiltinTemplateId,
} from './template-fill'

export async function emitPackFromFile(
  filePath: string,
  options: Partial<EmitOptions> = {},
): Promise<EmitPackResult> {
  const abs = resolve(filePath)
  const source = await readFile(abs, 'utf8')
  return emitPackFromSource(source, abs, options)
}

export function emitPackFromSource(
  source: string,
  sourcePath: string,
  options: Partial<EmitOptions> = {},
): EmitPackResult {
  const opts: EmitOptions = {
    set: options.set ?? {},
    host: options.host ?? 'plain',
    register: options.register,
    strictPositive: options.strictPositive,
    strictContinuity: options.strictContinuity,
    strictStyle: options.strictStyle,
    strictSubject: options.strictSubject,
    strictGenre: options.strictGenre,
  }

  const ir = extractEmitDocument(source, sourcePath, {
    register: opts.register,
    set: opts.set,
  })
  const pack = encodeHost(ir, opts.host)

  if (opts.strictPositive && !pack.measure.hold_positive) {
    const detail = pack.measure.warnings.join('; ')
    throw new Error(`spw emit: positive_ground failed — ${detail}`)
  }

  if (opts.strictContinuity && !pack.measure.continuity.ok) {
    const detail = pack.measure.continuity.missing.join('; ')
    throw new Error(`spw emit: continuity failed — missing anchors: ${detail}`)
  }

  if (opts.strictStyle && !pack.measure.style_hold.ok) {
    throw new Error(
      `spw emit: style hold failed — missing: ${pack.measure.style_hold.missing.join('; ')}`,
    )
  }
  if (opts.strictSubject && !pack.measure.subject_hold.ok) {
    throw new Error(
      `spw emit: subject hold failed — missing: ${pack.measure.subject_hold.missing.join('; ')}`,
    )
  }
  if (opts.strictGenre && !pack.measure.genre_hold.ok) {
    throw new Error(
      `spw emit: genre hold failed — missing: ${pack.measure.genre_hold.missing.join('; ')}`,
    )
  }

  // Reflect measure warnings onto IR
  ir.meta.warnings = unique([...ir.meta.warnings, ...pack.measure.warnings])
  ir.meta.positive_ground = pack.measure.hold_positive

  return { ir, pack }
}

export function renderPack(result: EmitPackResult, host: EmitHost = result.pack.host): string {
  if (host === 'json') {
    return JSON.stringify(
      {
        ir: result.ir,
        pack: {
          host: result.pack.host,
          fields: result.pack.fields,
          measure: result.pack.measure,
        },
      },
      null,
      2,
    )
  }
  return result.pack.text ?? Object.values(result.pack.fields).join('\n\n')
}

export async function writePack(result: EmitPackResult, outPath: string, host?: EmitHost): Promise<void> {
  const body = renderPack(result, host ?? result.pack.host)
  await writeFile(resolve(outPath), body.endsWith('\n') ? body : `${body}\n`, 'utf8')
}

function unique(items: string[]): string[] {
  return [...new Set(items)]
}
