/**
 * Reader names — what a person calls each operator and container while reading.
 *
 * The names are the interpretive vocabulary of docs/theory/spw/operators.spw
 * (`operators` and `containers` facets). They are reader-facing labels, not a
 * runtime behavior table; learn/readers.test.ts parses that file and holds this
 * table to it.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

import type {
  ASTNode,
  CapsuleNode,
  OperationNode,
  PathRefNode,
} from '../types'
import { walkAST } from '../instrumentation'

/** Operator sigil → reader name (docs/theory/spw/operators.spw `operators`). */
export const OPERATOR_READER_NAMES: Readonly<Record<string, string>> = Object.freeze({
  '~': 'potential',
  '#': 'vibration',
  '.': 'ground',
  '?': 'wonder',
  '!': 'action',
  '*': 'value',
  '&': 'subject',
  '@': 'perspective',
  '^': 'ascension',
  $: 'substrate',
  '%': 'measure',
  '=': 'configuration',
  '<>': 'coupling',
})

/** Brace pair → reader name (docs/theory/spw/operators.spw `containers`). */
export const CONTAINER_READER_NAMES: Readonly<Record<string, string>> = Object.freeze({
  '< >': 'concept',
  '()': 'scene',
  '[]': 'mode',
  '{}': 'definition',
})

/** One mark found in a line, with the name a reader gives it. */
export interface ReaderMark {
  /** The written sigil (`~`) or brace pair (`[]`). */
  mark: string
  /** Reader name from operators.spw (`potential`, `mode`). */
  name: string
}

/** What a reader sees in a parsed line: operators and containers, first-seen order. */
export interface LineReading {
  operators: ReaderMark[]
  containers: ReaderMark[]
}

interface Hit {
  offset: number
  mark: string
}

/**
 * Name the operators and containers in a parse tree.
 *
 * Operators come from Operation and PathRef nodes, `@` from Reference nodes,
 * `#` from particles (`#>name`), and `~ #` from annotations (`~#name`).
 * Containers come from Frame `[]`, Body `{}`, Scope `()` and Capsule `< >`.
 * Marks without a reader name (`<< >>`, `(( ))`) are left out, not renamed.
 */
export function readMarks(root: ASTNode | undefined): LineReading {
  const operators: Hit[] = []
  const containers: Hit[] = []
  if (!root) return { operators: [], containers: [] }

  walkAST(root, (node) => {
    const offset = node.span?.start?.offset ?? 0
    switch (node.type) {
      case 'Operation':
        operators.push({ offset, mark: (node as OperationNode).operator.value })
        break
      case 'PathRef':
        operators.push({ offset, mark: (node as PathRefNode).operator.value })
        break
      case 'Reference':
        operators.push({ offset, mark: '@' })
        break
      case 'Particle':
        operators.push({ offset, mark: '#' })
        break
      case 'Annotation':
        operators.push({ offset, mark: '~' }, { offset: offset + 1, mark: '#' })
        break
      case 'Frame':
        containers.push({ offset, mark: '[]' })
        break
      case 'Body':
        containers.push({ offset, mark: '{}' })
        break
      case 'Scope':
        containers.push({ offset, mark: '()' })
        break
      case 'Capsule':
        if ((node as CapsuleNode).open) containers.push({ offset, mark: '< >' })
        break
    }
  })

  return {
    operators: named(operators, OPERATOR_READER_NAMES),
    containers: named(containers, CONTAINER_READER_NAMES),
  }
}

/** Unique marks in source order, each with its reader name. */
function named(hits: Hit[], names: Readonly<Record<string, string>>): ReaderMark[] {
  const seen = new Set<string>()
  const out: ReaderMark[] = []
  for (const hit of [...hits].sort((a, b) => a.offset - b.offset)) {
    const name = names[hit.mark]
    if (!name || seen.has(hit.mark)) continue
    seen.add(hit.mark)
    out.push({ mark: hit.mark, name })
  }
  return out
}

/** `~ potential, [] mode` — one line for terminals and hovers. */
export function formatLineReading(reading: LineReading): string {
  const parts = [...reading.operators, ...reading.containers].map(m => `${m.mark} ${m.name}`)
  return parts.length > 0 ? parts.join(', ') : 'words only'
}
