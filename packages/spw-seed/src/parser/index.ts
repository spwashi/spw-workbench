/**
 * Spw Parser
 *
 * Main parser entry point. Combines lexer and grammar to produce AST.
 * Provides utilities for logging, debugging, and error collection.
 */

import type { LogFormatter } from './formatters'
import { textFormatter } from './formatters'
import { parseStream } from './parse-stream'

export type { ParseOutput } from './output'
export type {
  SourceProductDepth,
  SourceProductIdentity,
  SourceProductProfile,
  SourceProductDiagnostics,
  SourceProductEvents,
  SourceTokensData,
  SourceStructureData,
  SourceTraceData,
  SourceTokensProduct,
  SourceStructureProduct,
  SourceTraceProduct,
  SourceProduct,
  SourceProductObserver,
  SourceProductOptions,
  SourceProductResult,
} from './products'
export { SOURCE_PRODUCT_DEPTHS, SOURCE_PRODUCT_IDS, produceSourceProducts } from './products'
export type { LogFormatter } from './formatters'
export { textFormatter, jsonFormatter, compactFormatter } from './formatters'
export type { TraceNode } from './trace'
export {
  filterEvents,
  extractTokens,
  extractErrors,
  buildTrace,
  printAST,
} from './trace'

export { parse } from './parse'
export { parseExpression } from './parse-expression'
export { parseStream } from './parse-stream'

export function parseWithLog(
  input: string,
  formatter: LogFormatter = textFormatter
) {
  const gen = parseStream(input)
  let step = gen.next()

  while (!step.done) {
    const formatted = formatter.format(step.value)
    if (formatted) {
      console.log(formatted)
    }
    step = gen.next()
  }

  return step.value
}
