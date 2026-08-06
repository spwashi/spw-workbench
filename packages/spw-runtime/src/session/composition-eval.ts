/**
 * Evaluate geometric composition forms under a host conceptual space.
 *
 * effect.l0.measure by default — loads surfaces, prepares, probes; no writes.
 *
 *   <file>@"appendix.spw"?  → load host membrane, resolve lens relative to host, probe
 *   !{…} ~<consequence>     → discharge sketch + potential membrane (not PathRef)
 *
 * @see packages/spw-seed/src/canonical/composition-forms.ts
 */

import path from 'node:path'
import { promises as fs } from 'node:fs'
import {
  recognizeCompositionSource,
  compositionToProduct,
  formatCompositionSpw,
  hostLabel,
  actBodySketch,
  type CompositionForm,
  type ConceptualProbeForm,
  type ActConsequenceForm,
  parse,
  resolveSurfaceProfile,
} from '@spwashi/spw-seed'
import { createHotSession } from './hot-session'
import type { StabilityChannel } from './channels'

export const COMPOSITION_EVAL_VERSION = 'spw.composition_eval/1' as const

export interface CompositionEvalOptions {
  /** Directory used to resolve relative host/lens paths. */
  cwd?: string
  channel?: StabilityChannel | string
  /** Optional map of logical host names → absolute paths (e.g. file → ./file.spw). */
  hostMap?: Record<string, string>
}

export interface CompositionEvalResult {
  version: typeof COMPOSITION_EVAL_VERSION
  form: CompositionForm
  product: ReturnType<typeof compositionToProduct>
  dualReadSpw: string
  ok: boolean
  findings: string[]
  /** Host surface path when resolved. */
  hostPath?: string
  /** Lens surface path when resolved (conceptual probe). */
  lensPath?: string
  /** Whether lens loaded and parse-probed. */
  lensParseOk?: boolean
  /** Host stack dialect when prepared. */
  hostDialect?: string
  cacheHit?: boolean
}

function resolveMaybe(
  name: string,
  cwd: string,
  hostMap?: Record<string, string>,
): string {
  if (hostMap?.[name]) return path.resolve(cwd, hostMap[name]!)
  if (name.includes('/') || name.endsWith('.spw')) {
    return path.resolve(cwd, name)
  }
  // bare membrane name → name.spw beside cwd
  return path.resolve(cwd, `${name}.spw`)
}

async function readIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return undefined
  }
}

async function evalConceptualProbe(
  form: ConceptualProbeForm,
  options: CompositionEvalOptions,
): Promise<CompositionEvalResult> {
  const cwd = options.cwd ?? process.cwd()
  const findings: string[] = []
  const hostName = hostLabel(form.host)
  const hostPath = resolveMaybe(hostName, cwd, options.hostMap)
  const hostSource = await readIfExists(hostPath)

  if (!hostSource) {
    findings.push(`host membrane not found: ${hostPath}`)
    return {
      version: COMPOSITION_EVAL_VERSION,
      form,
      product: compositionToProduct(form),
      dualReadSpw: formatCompositionSpw(form),
      ok: false,
      findings,
      hostPath,
    }
  }

  const hostStack = resolveSurfaceProfile(hostSource, { path: hostPath })
  findings.push(`host space dialect=${hostStack.dialect} (${hostStack.dialectSource})`)

  // Lens relative to host directory (conceptual space of the file)
  const hostDir = path.dirname(hostPath)
  const lensPath = path.resolve(hostDir, form.lens)
  const lensSource = await readIfExists(lensPath)

  if (!lensSource) {
    findings.push(`lens not in host space: ${lensPath}`)
    return {
      version: COMPOSITION_EVAL_VERSION,
      form,
      product: compositionToProduct(form),
      dualReadSpw: formatCompositionSpw(form),
      ok: false,
      findings,
      hostPath,
      lensPath,
      hostDialect: hostStack.dialect,
    }
  }

  const session = createHotSession({
    channel: (options.channel as StabilityChannel) ?? 'trial',
  })
  // Evaluate lens under host path context (conceptual space)
  const record = session.inspect(lensSource, {
    path: lensPath,
    dialect: hostStack.dialect,
  })
  const lensParseOk = record.parse?.success !== false
  findings.push(
    form.probe
      ? `probe within ${hostName}: lens parse=${lensParseOk ? 'ok' : 'fail'}`
      : `open lens within ${hostName}: parse=${lensParseOk ? 'ok' : 'fail'}`,
  )
  findings.push(`eval space = host membrane, not cwd-global path alone`)

  return {
    version: COMPOSITION_EVAL_VERSION,
    form,
    product: compositionToProduct(form),
    dualReadSpw: formatCompositionSpw(form),
    ok: lensParseOk,
    findings,
    hostPath,
    lensPath,
    lensParseOk,
    hostDialect: hostStack.dialect,
    cacheHit: record.cacheHit,
  }
}

function evalActConsequence(
  form: ActConsequenceForm,
  _options: CompositionEvalOptions,
): CompositionEvalResult {
  const sketch = actBodySketch(form.act)
  const head = form.head ?? '!'
  const findings = [
    head === '?'
      ? `probe ?{ ${sketch} }`
      : `act !{ ${sketch} }`,
    `consequence membrane ~<${form.consequenceName ?? '?'}>`,
    form.scoped ? 'head under observation scope ()' : 'head bare',
    head === '?'
      ? 'link: probe → potential membrane (not PathRef)'
      : 'link: discharge → potential membrane (not PathRef)',
  ]
  return {
    version: COMPOSITION_EVAL_VERSION,
    form,
    product: compositionToProduct(form),
    dualReadSpw: formatCompositionSpw(form),
    ok: true,
    findings,
  }
}

/**
 * Parse surface source, recognize composition, evaluate.
 */
export async function evaluateCompositionSource(
  source: string,
  options: CompositionEvalOptions = {},
): Promise<CompositionEvalResult | null> {
  const form = recognizeCompositionSource(source)
  if (!form) {
    // still check bare membrane potential parses
    const p = parse(source.trim())
    if (!p.success) return null
    return null
  }
  if (form.kind === 'conceptual_probe') {
    return evalConceptualProbe(form, options)
  }
  return evalActConsequence(form, options)
}
