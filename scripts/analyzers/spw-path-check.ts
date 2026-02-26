#!/usr/bin/env tsx
/**
 * .spw reference checker
 *
 * Validates that @root declarations and ~"/@" references resolve to existing files/dirs.
 * Intended for quick doc linting ahead of releases.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parse, type Token } from '../../src/seed'

type RootMap = Record<string, string>

interface Reference {
  kind: 'root-ref' | 'local-ref'
  raw: string
  root?: string
  target: string
}

interface Issue {
  file: string
  ref: Reference
  message: string
}

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist'])

async function collectSpwFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectSpwFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.spw')) {
      files.push(full)
    }
  }

  return files
}

function parseRoots(content: string, fileDir: string): RootMap {
  const roots: RootMap = {}
  const rootRegex = /@([A-Za-z0-9_-]+):\s*~"([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = rootRegex.exec(content))) {
    const [, name, rel] = match
    roots[name] = path.resolve(fileDir, rel)
  }
  return roots
}

function parseReferences(content: string): Reference[] {
  const refs: Reference[] = []
  const output = parse(content)
  const tokens = output.tokens

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (!token || token.type !== 'OPERATOR') continue

    // Local references: ~"../path"
    if (token.value === '~') {
      if (isRootDeclarationValue(tokens, i)) continue
      const str = nextSignificant(tokens, i + 1)
      if (str && (str.token.type === 'STRING' || str.token.type === 'PHRASE')) {
        refs.push({
          kind: 'local-ref',
          raw: `~${str.token.value}`,
          target: unquoteToken(str.token.value),
        })
        i = str.index
      }
      continue
    }

    // Root references: @root/path/to/file
    if (token.value === '@') {
      const rootTok = nextSignificant(tokens, i + 1)
      if (!rootTok || rootTok.token.type !== 'IDENTIFIER') continue

      const parts: string[] = [rootTok.token.value]
      let cursor = rootTok.index + 1
      let previous = rootTok.token

      while (true) {
        const slashTok = nextSignificant(tokens, cursor)
        if (!slashTok || slashTok.token.type !== 'CONNECTOR' || slashTok.token.value !== '/') {
          break
        }
        if (!isContiguous(previous, slashTok.token)) break

        const segTok = nextSignificant(tokens, slashTok.index + 1)
        if (!segTok || !isPathSegmentToken(segTok.token)) break
        if (!isContiguous(slashTok.token, segTok.token)) break

        parts.push(segTok.token.value)
        cursor = segTok.index + 1
        previous = segTok.token
      }

      if (parts.length > 1) {
        const [root, ...rest] = parts
        refs.push({
          kind: 'root-ref',
          raw: `@${parts.join('/')}`,
          root,
          target: rest.join('/'),
        })
        i = cursor - 1
      }
    }
  }

  return refs
}

function nextSignificant(tokens: Token[], start: number): { token: Token; index: number } | null {
  for (let i = start; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (!token) continue
    if (token.type === 'WHITESPACE' || token.type === 'COMMENT') continue
    return { token, index: i }
  }
  return null
}

function prevSignificant(tokens: Token[], start: number): { token: Token; index: number } | null {
  for (let i = start; i >= 0; i -= 1) {
    const token = tokens[i]
    if (!token) continue
    if (token.type === 'WHITESPACE' || token.type === 'COMMENT') continue
    return { token, index: i }
  }
  return null
}

function isRootDeclarationValue(tokens: Token[], operatorIndex: number): boolean {
  const colon = prevSignificant(tokens, operatorIndex - 1)
  if (!colon || colon.token.type !== 'COLON') return false

  const rootName = prevSignificant(tokens, colon.index - 1)
  if (!rootName || rootName.token.type !== 'IDENTIFIER') return false

  const at = prevSignificant(tokens, rootName.index - 1)
  return !!at && at.token.type === 'OPERATOR' && at.token.value === '@'
}

function isPathSegmentToken(token: Token): boolean {
  if (token.type === 'IDENTIFIER') return true
  if (token.type === 'CONNECTOR' && token.value === '..') return true
  return false
}

function isContiguous(left: Token, right: Token): boolean {
  return left.span.end.offset === right.span.start.offset
}

function unquoteToken(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('`') && value.endsWith('`'))) {
    return value.slice(1, -1)
  }
  return value
}

function sanitizeTarget(target: string): string {
  let t = target
  t = t.trim()
  // Strip simple wrapping quotes/backticks.
  t = t.replace(/^['"`]+/, '')
  t = t.replace(/['"`]+$/, '')
  // Strip anchors/qualifiers and trailing braces/brackets
  t = t.replace(/\^.*$/, '')
  t = t.replace(/[\[{].*$/, '')
  t = t.replace(/[#;].*$/, '')
  // Drop trailing slashes
  t = t.replace(/\/+$/, '')
  // Drop trailing bracket/brace artifacts
  t = t.replace(/[>\]}\)\{`]+$/, '')
  // Drop trailing punctuation from prose like "@src/foo.ts," or "(@src/foo/)".
  t = t.replace(/[,.:;`]+$/, '')
  t = t.trim()
  return t
}

function isLikelyPathTarget(target: string, kind: Reference['kind']): boolean {
  if (!target) return false
  if (/\s/.test(target)) return false

  if (kind === 'root-ref') return true

  return (
    target.startsWith('.') ||
    target.startsWith('/') ||
    target.includes('/') ||
    /\.(spw|md|ts|tsx|js|mjs|cjs|css|json|html|ebnf)$/.test(target)
  )
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function checkFile(
  file: string,
  defaultRoots: RootMap,
  repoRoot: string
): Promise<Issue[]> {
  const content = await fs.readFile(file, 'utf8')
  const fileDir = path.dirname(file)
  const parsedRoots = parseRoots(content, fileDir)
  const roots: RootMap = { ...defaultRoots, here: inferHereRoot(fileDir, repoRoot) }
  for (const [name, resolved] of Object.entries(parsedRoots)) {
    // Keep existing default roots when a local override points to nowhere.
    if (await fileExists(resolved) || !(name in roots)) {
      roots[name] = resolved
    }
  }
  const refs = parseReferences(content)
  const issues: Issue[] = []

  for (const ref of refs) {
    const target = sanitizeTarget(ref.target)

    // Skip obvious globbing/wildcards and non-path prose fragments.
    if (!target || target.includes('*') || !isLikelyPathTarget(target, ref.kind)) continue

    if (ref.kind === 'local-ref') {
      const resolved = path.resolve(fileDir, target)
      if (!(await fileExists(resolved))) {
        issues.push({ file, ref, message: `Missing local path ${ref.target}` })
      }
      continue
    }

    // root-ref
    let base = roots[ref.root!]
    if (!base) {
      const srcCandidate = path.join(repoRoot, 'src', ref.root!)
      const repoCandidate = path.join(repoRoot, ref.root!)
      if (await fileExists(srcCandidate)) {
        base = srcCandidate
      } else if (await fileExists(repoCandidate)) {
        base = repoCandidate
      }
    }

    if (!base) {
      if (ref.root === 'root') continue
      issues.push({ file, ref, message: `Unknown root @${ref.root}` })
      continue
    }
    const resolved = path.resolve(base, target)
    if (!(await fileExists(resolved))) {
      issues.push({
        file,
        ref,
        message: `Missing path @${ref.root}/${ref.target}`,
      })
    }
  }

  return issues
}

function inferHereRoot(fileDir: string, repoRoot: string): string {
  const rel = path.relative(repoRoot, fileDir)
  const parts = rel.split(path.sep)
  const docsIndex = parts.lastIndexOf('docs')
  if (docsIndex > 0) {
    const candidate = path.join(repoRoot, ...parts.slice(0, docsIndex))
    const srcRoot = path.join(repoRoot, 'src')
    if (candidate === srcRoot || candidate.startsWith(`${srcRoot}${path.sep}`)) {
      return candidate
    }
  }
  return fileDir
}

async function main(): Promise<void> {
  const repoRoot = process.cwd()
  const srcRoot = path.join(repoRoot, 'src')
  const defaultRoots: RootMap = {
    src: path.join(repoRoot, 'src'),
    spec: path.join(repoRoot, 'lib', 'spw-v0.1.0-alpha'),
    docs: path.join(repoRoot, 'docs'),
    examples: path.join(repoRoot, 'examples'),
    lib: path.join(repoRoot, 'lib'),
    bench: path.join(repoRoot, 'bench'),
    scripts: path.join(repoRoot, 'scripts'),
    app: path.join(srcRoot, 'app'),
    cli: path.join(srcRoot, 'cli'),
    core: path.join(srcRoot, 'core'),
    debug: path.join(srcRoot, 'debug'),
    design: path.join(srcRoot, 'design'),
    features: path.join(srcRoot, 'features'),
    infra: path.join(srcRoot, 'infra'),
    lang: path.join(srcRoot, 'lang'),
    platform: path.join(srcRoot, 'platform'),
    publishing: path.join(srcRoot, 'publishing'),
    runtime: path.join(srcRoot, 'runtime'),
    seed: path.join(srcRoot, 'seed'),
    semantics: path.join(srcRoot, 'semantics'),
    styles: path.join(srcRoot, 'styles'),
    ui: path.join(srcRoot, 'ui'),
    viz: path.join(srcRoot, 'viz'),
    here: repoRoot,
  }
  const spwFiles = await collectSpwFiles(repoRoot)
  const issues: Issue[] = []

  for (const file of spwFiles) {
    const fileIssues = await checkFile(file, defaultRoots, repoRoot)
    issues.push(...fileIssues)
  }

  if (issues.length === 0) {
    console.log(`✓ .spw references OK (${spwFiles.length} files checked)`)
    return
  }

  console.error(`✗ Found ${issues.length} broken references:`)
  for (const issue of issues) {
    console.error(
      ` - ${path.relative(repoRoot, issue.file)} :: ${issue.message} (${issue.ref.raw})`
    )
  }
  process.exit(1)
}

main().catch((err) => {
  console.error('Reference check failed:', err)
  process.exit(1)
})
