import type { IrKind } from './kinds'

export const PROGRESSIVE_PRODUCT_SURFACE = 'spw.progressive-product/1' as const

export type ProgressiveProductStatus = 'complete' | 'partial'

export interface ProgressiveProductSequence {
  index: number
  total: number
}

export interface ProgressiveProductCompleteness {
  /** Completeness of the requested fields, not of every deeper product. */
  basis: 'requested-fields'
  value: number
  included: readonly string[]
  omitted: readonly string[]
}

export interface ProgressiveProductRecord<
  ProductId extends string = string,
  Stage extends string = string,
  Data = unknown,
> {
  surface: typeof PROGRESSIVE_PRODUCT_SURFACE
  product: ProductId
  revision: number
  ir: IrKind
  sequence: ProgressiveProductSequence
  stage: Stage
  status: ProgressiveProductStatus
  completeness: ProgressiveProductCompleteness
  /** Products or fields intentionally left for a deeper request. */
  deferred: readonly string[]
  /** Time from request start until this product became available. */
  elapsedMs: number
  data: Data
}

export interface BuildProgressiveProductInput<
  ProductId extends string,
  Stage extends string,
  Data,
> {
  product: ProductId
  revision: number
  ir: IrKind
  sequence: ProgressiveProductSequence
  stage: Stage
  included: readonly string[]
  omitted?: readonly string[]
  deferred?: readonly string[]
  elapsedMs: number
  data: Data
}

export function buildProgressiveProduct<
  ProductId extends string,
  Stage extends string,
  Data,
>(
  input: BuildProgressiveProductInput<ProductId, Stage, Data>,
): ProgressiveProductRecord<ProductId, Stage, Data> {
  const omitted = input.omitted ?? []
  const fieldCount = input.included.length + omitted.length
  const completeness = fieldCount === 0 ? 1 : input.included.length / fieldCount

  return {
    surface: PROGRESSIVE_PRODUCT_SURFACE,
    product: input.product,
    revision: input.revision,
    ir: input.ir,
    sequence: { ...input.sequence },
    stage: input.stage,
    status: omitted.length === 0 ? 'complete' : 'partial',
    completeness: {
      basis: 'requested-fields',
      value: completeness,
      included: [...input.included],
      omitted: [...omitted],
    },
    deferred: [...(input.deferred ?? [])],
    elapsedMs: input.elapsedMs,
    data: input.data,
  }
}
