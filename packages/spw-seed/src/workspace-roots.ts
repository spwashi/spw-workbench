import { parse } from './parser'
import type { Token } from './types'

export interface WorkspaceRootDeclaration {
  sigil: string
  relativePath: string
}

export type WorkspaceRootManifestDiagnosticCode =
  | 'parse_error'
  | 'missing_roots_frame'
  | 'unterminated_roots_frame'
  | 'empty_roots_frame'
  | 'invalid_root_declaration'
  | 'duplicate_root_sigil'

export interface WorkspaceRootManifestDiagnostic {
  code: WorkspaceRootManifestDiagnosticCode
  message: string
  sigil?: string
}

export interface WorkspaceRootManifestAnalysis {
  status: 'valid' | 'invalid'
  declarations: WorkspaceRootDeclaration[]
  diagnostics: WorkspaceRootManifestDiagnostic[]
}

/** Parse @root: ~"path" declarations from the first ^"roots" or ^["roots"] frame. */
export function parseWorkspaceRootDeclarations(source: string): WorkspaceRootDeclaration[] {
  return analyzeWorkspaceRootManifest(source).declarations
}

/**
 * Analyze the contents of an existing workspace manifest.
 *
 * File absence belongs to the caller's I/O layer. Once a manifest exists, an
 * unusable roots frame is invalid and must not be silently reinterpreted as an
 * absent manifest. Duplicate sigils are invalid because root identity must be
 * deterministic across CLI, LSP, and editor clients.
 */
export function analyzeWorkspaceRootManifest(source: string): WorkspaceRootManifestAnalysis {
  const output = parse(source)
  const { tokens } = output
  const significant = tokens.filter((token) => token.type !== 'WHITESPACE' && token.type !== 'EOF')
  const diagnostics: WorkspaceRootManifestDiagnostic[] = []

  if (!output.success) {
    diagnostics.push({
      code: 'parse_error',
      message: 'Workspace manifest did not parse successfully.',
    })
  }

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

    if (depth !== 0) {
      diagnostics.push({
        code: 'unterminated_roots_frame',
        message: 'Workspace roots frame does not have a closing body delimiter.',
      })
    }

    const parsed = parseRootEntries(bodyTokens)
    if (parsed.invalidRootDeclaration) {
      diagnostics.push({
        code: 'invalid_root_declaration',
        message: 'Workspace roots must use @sigil: ~"path" declarations.',
      })
    }
    if (parsed.declarations.length === 0) {
      diagnostics.push({
        code: 'empty_roots_frame',
        message: 'Workspace roots frame contains no valid root declarations.',
      })
    }

    const seen = new Set<string>()
    for (const declaration of parsed.declarations) {
      if (seen.has(declaration.sigil)) {
        diagnostics.push({
          code: 'duplicate_root_sigil',
          message: `Workspace root @${declaration.sigil} is declared more than once.`,
          sigil: declaration.sigil,
        })
      }
      seen.add(declaration.sigil)
    }

    return {
      status: diagnostics.length === 0 ? 'valid' : 'invalid',
      declarations: parsed.declarations,
      diagnostics,
    }
  }

  diagnostics.push({
    code: 'missing_roots_frame',
    message: 'Workspace manifest has no ^"roots" or ^["roots"] frame.',
  })
  return { status: 'invalid', declarations: [], diagnostics }
}

function parseRootEntries(tokens: Token[]): {
  declarations: WorkspaceRootDeclaration[]
  invalidRootDeclaration: boolean
} {
  const roots: WorkspaceRootDeclaration[] = []
  let invalidRootDeclaration = false

  for (let index = 0; index < tokens.length; index += 1) {
    const at = tokens[index]
    if (at.type === 'COMMENT') continue
    if (at.type !== 'OPERATOR' || at.kind !== '@') continue

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
      invalidRootDeclaration = true
      continue
    }

    roots.push({
      sigil: name.value,
      relativePath: unquote(pathToken.value),
    })
    index += 4
  }

  return { declarations: roots, invalidRootDeclaration }
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
