/**
 * Form fingerprint — node-count signature of one parsed expression or surface.
 *
 * A grammar claim is cheap to verify when the contour is a stable Type=count
 * map rather than a tree diff. Completeness rides along so a prose fallback
 * cannot masquerade as the taught shape.
 */

import { countNodeTypes } from '../instrumentation'
import { parse, parseExpression, type ParseCompletenessReceipt } from '../parser'
import type { ASTNode } from '../types'

export const FINGERPRINT_VERSION = 'spw.fingerprint/1' as const

export interface FormFingerprint {
  version: typeof FINGERPRINT_VERSION
  byType: Record<string, number>
  total: number
  signature: string
  success: boolean
  complete: boolean
  proseFallback: boolean
  actualRootKind?: string
  expectedRootKind: ParseCompletenessReceipt['expectedRootKind']
  warningCount: number
  errorCount: number
}

export interface FingerprintSourceOptions {
  /** Parse as a standalone expression rather than a seed surface. */
  expression?: boolean
}

function countsFromAst(ast: ASTNode): { byType: Record<string, number>; total: number; signature: string } {
  const map = countNodeTypes(ast)
  const byType = Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)))
  const total = [...map.values()].reduce((sum, n) => sum + n, 0)
  return { byType, total, signature: formatFingerprintSignature(byType) }
}

/** Sorted `Type=count` contour, stable enough to assert in tests. */
export function formatFingerprintSignature(byType: Record<string, number>): string {
  return Object.entries(byType)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => `${type}=${count}`)
    .join(' ')
}

export function fingerprintSource(
  source: string,
  options: FingerprintSourceOptions = {},
): FormFingerprint {
  const output = options.expression ? parseExpression(source) : parse(source)
  const ast = output.ast as ASTNode | undefined
  const counted = ast
    ? countsFromAst(ast)
    : { byType: {}, total: 0, signature: '' }

  return {
    version: FINGERPRINT_VERSION,
    ...counted,
    success: output.success,
    complete: output.completeness.complete,
    proseFallback: output.completeness.proseFallback,
    actualRootKind: output.completeness.actualRootKind,
    expectedRootKind: output.completeness.expectedRootKind,
    warningCount: output.warnings.length,
    errorCount: output.errors.length,
  }
}
