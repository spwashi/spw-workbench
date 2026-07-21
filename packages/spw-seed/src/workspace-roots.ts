import { parse } from './parser'
import type { Token } from './types'

export interface WorkspaceRootDeclaration {
  sigil: string
  relativePath: string
}

/** Parse @root: ~"path" declarations from the first ^"roots" or ^["roots"] frame. */
export function parseWorkspaceRootDeclarations(source: string): WorkspaceRootDeclaration[] {
  const { tokens } = parse(source)
  const significant = tokens.filter((token) => token.type !== 'WHITESPACE' && token.type !== 'EOF')

  for (let index = 0; index < significant.length; index += 1) {
    const frame = matchFrameHeader(significant, index)
    if (!frame || frame.name !== 'roots') continue

    const bodyTokens: Token[] = []
    let depth = 1
    index = frame.bodyStartIndex

    while (++index < significant.length && depth > 0) {
      const token = significant[index]
      if (token.type === 'CONTAINER_OPEN' && token.kind === '{') {
        depth += 1
      } else if (token.type === 'CONTAINER_CLOSE' && token.kind === '}') {
        depth -= 1
        if (depth === 0) break
      }
      bodyTokens.push(token)
    }

    return parseRootEntries(bodyTokens)
  }

  return []
}

function parseRootEntries(tokens: Token[]): WorkspaceRootDeclaration[] {
  const roots: WorkspaceRootDeclaration[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const at = tokens[index]
    const name = tokens[index + 1]
    const colon = tokens[index + 2]
    const tilde = tokens[index + 3]
    const pathToken = tokens[index + 4]

    if (
      at?.type !== 'OPERATOR' || at.kind !== '@' ||
      name?.type !== 'IDENTIFIER' ||
      colon?.type !== 'COLON' ||
      tilde?.type !== 'OPERATOR' || tilde.kind !== '~' ||
      pathToken?.type !== 'STRING'
    ) {
      continue
    }

    roots.push({
      sigil: name.value,
      relativePath: unquote(pathToken.value),
    })
    index += 4
  }

  return roots
}

function matchFrameHeader(
  tokens: Token[],
  index: number,
): { name: string; bodyStartIndex: number } | null {
  const caret = tokens[index]
  if (caret?.type !== 'OPERATOR' || caret.kind !== '^') return null

  const next = tokens[index + 1]
  if (!next) return null

  if (next.type === 'STRING') {
    const brace = tokens[index + 2]
    return brace?.type === 'CONTAINER_OPEN' && brace.kind === '{'
      ? { name: unquote(next.value), bodyStartIndex: index + 2 }
      : null
  }

  if (next.type !== 'CONTAINER_OPEN' || next.kind !== '[') return null

  const label = tokens[index + 2]
  const close = tokens[index + 3]
  const brace = tokens[index + 4]
  if (
    (label?.type === 'STRING' || label?.type === 'IDENTIFIER') &&
    close?.type === 'CONTAINER_CLOSE' && close.kind === ']' &&
    brace?.type === 'CONTAINER_OPEN' && brace.kind === '{'
  ) {
    return { name: unquote(label.value), bodyStartIndex: index + 4 }
  }

  return null
}

function unquote(value: string): string {
  return value.replace(/^["'`]|["'`]$/g, '')
}
