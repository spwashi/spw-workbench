import type { ParserOptions, SeedNode } from '../types'
import type { ParseOutput } from './output'
import { parseSourceStructure } from './products'

/**
 * Parse Spw source code into AST.
 *
 * The implementation shares one source pipeline with progressive products so
 * lexical inspection and structural parsing cannot drift into separate kernels.
 *
 * @spw:portable:seed[layer=parser,system=seed-parser,extract=candidate,basis=no-dom|core-invariants]
 * @spw:seed:kernel[system=seed-parser,extract=candidate,density=kernel,basis=core-invariants]
 * @spw:lens:syntactic
 */
export function parse(
  input: string,
  options: Partial<ParserOptions> = {},
): ParseOutput<SeedNode> {
  return parseSourceStructure(input, options)
}
