import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from '../parser'
import { walkAST } from '../instrumentation'
import type { BindingNode, ExpressionNode, OperationNode, TermNode } from '../types'
import { literalText } from './quest'
import { CONTAINER_READER_NAMES, OPERATOR_READER_NAMES, formatLineReading, readMarks } from './readers'

const OPERATORS_SPW = fileURLToPath(new URL('../../../../docs/theory/spw/operators.spw', import.meta.url))

let operatorsSpw: ReturnType<typeof parse> | undefined

/** Read a `.{ `sigil` = name … }` facet from operators.spw by walking its parse. */
function facetFromOperatorsSpw(facetName: string): Record<string, string> {
  operatorsSpw ??= parse(readFileSync(OPERATORS_SPW, 'utf8'))
  expect(operatorsSpw.success).toBe(true)
  let terms: TermNode[] = []
  walkAST(operatorsSpw.ast!, node => {
    if (node.type !== 'Binding') return
    const binding = node as BindingNode
    if (binding.key.type !== 'Identifier' || binding.key.token.value !== facetName) return
    const facet = binding.value.terms[0] as OperationNode
    terms = (facet.body?.sequence.expressions ?? []).flatMap((e: ExpressionNode) => e.terms)
  })

  const out: Record<string, string> = {}
  for (let i = 0; i + 1 < terms.length; i++) {
    const mark = terms[i]
    const eq = terms[i + 1]
    if (mark?.type !== 'Literal' || eq?.type !== 'Operation' || eq.operator.value !== '=') continue
    // `= potential` reads its name as a modifier, `=potential` as a label.
    const name = eq.modifiers?.modifiers[0]?.value ?? eq.operatorLabel?.value
    if (name) out[literalText(mark.token.value)] = name
  }
  return out
}

describe('reader names', () => {
  it('match the operators facet of docs/theory/spw/operators.spw', () => {
    expect({ ...OPERATOR_READER_NAMES }).toEqual(facetFromOperatorsSpw('operators'))
  })

  it('match the containers facet of docs/theory/spw/operators.spw', () => {
    expect({ ...CONTAINER_READER_NAMES }).toEqual(facetFromOperatorsSpw('containers'))
  })
})

describe('readMarks', () => {
  const read = (line: string) => readMarks(parse(line).ast)

  it('names operators and containers in the order they are written', () => {
    expect(read('?["why"]{ !probe{ "count" } }')).toEqual({
      operators: [
        { mark: '?', name: 'wonder' },
        { mark: '!', name: 'action' },
      ],
      containers: [
        { mark: '[]', name: 'mode' },
        { mark: '{}', name: 'definition' },
      ],
    })
  })

  it('reads @ from a Reference and ~ from a PathRef', () => {
    expect(read('@yesterday: ~"./yesterday.spw"').operators).toEqual([
      { mark: '@', name: 'perspective' },
      { mark: '~', name: 'potential' },
    ])
  })

  it('reads # from a particle and leaves plain words unnamed', () => {
    expect(read('#>my_notes').operators).toEqual([{ mark: '#', name: 'vibration' }])
    expect(formatLineReading(read('the same door'))).toBe('words only')
  })

  it('formats one line for terminals', () => {
    expect(formatLineReading(read('door[closed]{hinge, frame}'))).toBe('[] mode, {} definition')
  })
})
