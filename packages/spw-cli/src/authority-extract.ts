/**
 * Extract authority a JavaScript/TypeScript file actually exercises.
 *
 * Uses the TypeScript compiler API as a parser only — no type checking, no
 * program, no tsconfig resolution. A single source file is parsed and walked,
 * which keeps this fast enough to run over a directory and free of any
 * requirement that the subject typecheck or even resolve its imports.
 *
 * Recognition is deliberately syntactic and therefore incomplete. It sees
 * `el.dataset.x = …`, not `el[prop] = …` through an alias. That bounds the
 * claim this tool makes: a `leak` finding is evidence the surface is out of
 * date, while the absence of findings is not proof the surface is complete.
 */

import ts from 'typescript'
import type { AuthorityKind, ObservedAuthority } from '@spwashi/spw-seed'

/** DOM properties whose assignment is a write to shared document state. */
const WRITE_PROPERTIES = new Set([
  'dataset',
  'style',
  'textContent',
  'innerHTML',
  'innerText',
  'className',
  'value',
  'checked',
  'hidden',
])

/** Method calls that write document state without an assignment. */
const WRITE_METHODS = new Set([
  'setAttribute',
  'removeAttribute',
  'toggleAttribute',
  'append',
  'appendChild',
  'prepend',
  'remove',
  'removeChild',
  'replaceChildren',
  'insertAdjacentHTML',
])

/** Constructors that join this module to an external event source. */
const JOIN_CONSTRUCTORS = new Set([
  'MutationObserver',
  'IntersectionObserver',
  'ResizeObserver',
  'PerformanceObserver',
  'EventSource',
  'WebSocket',
  'AbortController',
])

interface Sink {
  add(kind: AuthorityKind, name: string, site: string): void
}

function createSink(): Sink & { drain(): ObservedAuthority[] } {
  const byKey = new Map<string, ObservedAuthority>()
  return {
    add(kind, name, site) {
      const key = `${kind}:${name}`
      const existing = byKey.get(key)
      if (existing) {
        if (!existing.sites.includes(site)) existing.sites.push(site)
        return
      }
      byKey.set(key, { kind, name, sites: [site] })
    },
    drain() {
      return [...byKey.values()].sort(
        (a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name),
      )
    },
  }
}

/** `foo.bar.baz` → `['foo','bar','baz']`; anything computed stops the chain. */
function propertyChain(node: ts.Node): string[] {
  const parts: string[] = []
  let cur: ts.Node = node
  while (ts.isPropertyAccessExpression(cur)) {
    parts.unshift(cur.name.text)
    cur = cur.expression
  }
  if (ts.isIdentifier(cur)) parts.unshift(cur.text)
  return parts
}

/**
 * Observe one subject file.
 *
 * `displayPath` appears in site strings; it is not read from disk.
 */
export function extractAuthority(source: string, displayPath: string): ObservedAuthority[] {
  const sink = createSink()
  const file = ts.createSourceFile(
    displayPath,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    displayPath.endsWith('.ts') || displayPath.endsWith('.tsx')
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS,
  )

  const siteOf = (node: ts.Node): string => {
    const { line } = file.getLineAndCharacterOfPosition(node.getStart(file))
    return `${displayPath}:${line + 1}`
  }

  const visit = (node: ts.Node): void => {
    // `x.dataset.y = …`, `x.style.color = …`, `x.textContent = …`
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      if (ts.isPropertyAccessExpression(node.left)) {
        const chain = propertyChain(node.left)
        // Walk from the deepest property outward so `el.dataset.x` reports
        // `dataset` rather than `x`.
        const hit = [...chain].reverse().find(part => WRITE_PROPERTIES.has(part))
        if (hit) sink.add('writes', hit, siteOf(node))
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression

      if (ts.isPropertyAccessExpression(callee)) {
        const method = callee.name.text
        const chain = propertyChain(callee)

        if (WRITE_METHODS.has(method)) {
          sink.add('writes', method, siteOf(node))
        }

        // `el.classList.add(…)` is a write to `classList`.
        if (chain.includes('classList')) {
          sink.add('writes', 'classList', siteOf(node))
        }

        if (method === 'addEventListener' || method === 'removeEventListener') {
          const [first] = node.arguments
          const eventName =
            first && ts.isStringLiteralLike(first) ? first.text : 'addEventListener'
          sink.add('joins', eventName, siteOf(node))
        }

        if (method === 'dispatchEvent') {
          sink.add('writes', 'dispatchEvent', siteOf(node))
        }
      }

      if (ts.isIdentifier(callee) && (callee.text === 'fetch' || callee.text === 'require')) {
        sink.add('joins', callee.text, siteOf(node))
      }
    }

    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      if (JOIN_CONSTRUCTORS.has(node.expression.text)) {
        sink.add('joins', node.expression.text, siteOf(node))
      }
    }

    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      sink.add('reads', node.moduleSpecifier.text, siteOf(node))
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      sink.add('reads', (node.arguments[0] as ts.StringLiteralLike).text, siteOf(node))
    }

    ts.forEachChild(node, visit)
  }

  visit(file)
  return sink.drain()
}
