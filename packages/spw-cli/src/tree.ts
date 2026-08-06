import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { DEFAULT_IGNORED_DIRS } from './fs-walk'
import { printHelpPage } from './help'
import {
  discoverSpwWorkspace,
  findWorkspaceRoot,
  isWithin,
  relativeToConsumer,
  resolveWorkspacePath,
  type SpwWorkspace,
} from './workspace'

export type SpwTreeNode =
  | { kind: 'directory'; name: string; path: string; children: SpwTreeNode[] }
  | { kind: 'file'; name: string; path: string }

interface TreeOptions {
  selector: string
  startPath: string
  depth: number
  json: boolean
  includeWorkbench: boolean
}

export async function buildSpwTree(
  workspace: SpwWorkspace,
  selector: string = '@spw',
  options: { depth?: number; includeWorkbench?: boolean } = {},
): Promise<SpwTreeNode | null> {
  const depth = options.depth ?? 4
  const includeWorkbench = options.includeWorkbench ?? false
  const declaredRoot = selector.startsWith('@') ? findWorkspaceRoot(workspace, selector) : null
  const target = await resolveWorkspacePath(workspace, selector)
  const workbenchBoundary = workspace.mode === 'mounted-consumer'
    ? await realPathOrResolved(workspace.workbenchRoot)
    : null
  const targetBoundary = await realPathOrResolved(target)

  if (
    workbenchBoundary &&
    !includeWorkbench &&
    (declaredRoot?.role === 'infrastructure' || isWithin(workbenchBoundary, targetBoundary))
  ) {
    throw new Error('Tree target is mounted infrastructure; pass --include-workbench to inspect it explicitly')
  }

  return collectTree(workspace, target, depth, includeWorkbench, workbenchBoundary)
}

export async function runSpwTreeCli(argv: string[] = process.argv): Promise<void> {
  const options = parseTreeOptions(normalizeArgs(argv))
  const workspace = await discoverSpwWorkspace(options.startPath)
  const tree = await buildSpwTree(workspace, options.selector, options)

  if (options.json) {
    console.log(JSON.stringify({
      command: 'tree',
      consumerRoot: '.',
      selector: options.selector,
      tree,
    }, null, 2))
    return
  }

  console.log(`# spw tree ${options.selector}  depth≤${options.depth}`)
  if (!tree) {
    console.log('(no .spw files)')
    return
  }
  renderTree(tree)
  const stats = countTree(tree)
  console.error(`── tree  files=${stats.files}  dirs=${stats.dirs}`)
}

export function printTreeHelp(): void {
  printHelpPage({
    title: 'Spw Tree',
    usage: [
      'spw tree [@root|relative-path] [--from start-path] [--depth 4] [--json]',
      'spw tree prompts --depth 2',
    ],
    sections: [
      {
        title: 'Notes',
        lines: [
          'Shows directories that contain .spw files (and the files themselves).',
          'Pair with: spw outline <file> · spw select <file> --skim · spw query --from <dir> --skim',
        ],
      },
      {
        title: 'Examples',
        lines: [
          'spw tree',
          'spw tree prompts --depth 2',
          'spw tree @docs --depth 3',
          'spw tree @shared --depth 2  # declared external root',
          'spw tree .agents/plans --depth 2',
          'spw tree @workbench --include-workbench --depth 2',
        ],
      },
    ],
  })
}

async function collectTree(
  workspace: SpwWorkspace,
  target: string,
  depth: number,
  includeWorkbench: boolean,
  workbenchBoundary: string | null,
): Promise<SpwTreeNode | null> {
  const stat = await statOrNull(target)
  if (!stat) return null
  if (
    workbenchBoundary &&
    !includeWorkbench &&
    isWithin(workbenchBoundary, await realPathOrResolved(target))
  ) return null

  if (stat.isFile()) {
    return target.endsWith('.spw')
      ? { kind: 'file', name: path.basename(target), path: relativeToConsumer(workspace, target) }
      : null
  }
  if (!stat.isDirectory()) return null

  const children: SpwTreeNode[] = []
  if (depth > 0) {
    const entries = await fs.readdir(target, { withFileTypes: true })
    entries.sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory() && DEFAULT_IGNORED_DIRS.has(entry.name)) continue
      const childPath = path.join(target, entry.name)
      if (
        workspace.mode === 'mounted-consumer' &&
        !includeWorkbench &&
        isWithin(workspace.workbenchRoot, childPath)
      ) continue
      const child = await collectTree(
        workspace,
        childPath,
        depth - 1,
        includeWorkbench,
        workbenchBoundary,
      )
      if (child) children.push(child)
    }
  }

  if (children.length === 0) return null
  return {
    kind: 'directory',
    name: path.basename(target) || '.',
    path: relativeToConsumer(workspace, target),
    children,
  }
}

function countTree(node: SpwTreeNode): { files: number; dirs: number } {
  if (node.kind === 'file') return { files: 1, dirs: 0 }
  let files = 0
  let dirs = 1
  for (const c of node.children) {
    const s = countTree(c)
    files += s.files
    dirs += s.dirs
  }
  return { files, dirs }
}

function fileCount(node: SpwTreeNode): number {
  if (node.kind === 'file') return 1
  return node.children.reduce((n, c) => n + fileCount(c), 0)
}

function renderTree(node: SpwTreeNode, prefix = '', isLast = true, root = true): void {
  const branch = root ? '' : isLast ? '└─ ' : '├─ '
  if (node.kind === 'directory') {
    const n = fileCount(node)
    console.log(`${prefix}${branch}${node.name}/  (${n})`)
  } else {
    console.log(`${prefix}${branch}${node.name}`)
  }
  if (node.kind !== 'directory') return

  const childPrefix = root ? '' : `${prefix}${isLast ? '   ' : '│  '}`
  node.children.forEach((child, index) => {
    renderTree(child, childPrefix, index === node.children.length - 1, false)
  })
}

function normalizeArgs(argv: string[]): string[] {
  const args = argv.slice(2)
  return args[0] === 'tree' ? args.slice(1) : args
}

function parseTreeOptions(args: string[]): TreeOptions {
  let selector = '@spw'
  let startPath = '.'
  let depth = 4
  let json = false
  let includeWorkbench = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--from') {
      startPath = args[index + 1] ?? startPath
      index += 1
    } else if (arg.startsWith('--from=')) {
      startPath = arg.slice('--from='.length)
    } else if (arg === '--depth') {
      depth = parseDepth(args[index + 1], depth)
      index += 1
    } else if (arg.startsWith('--depth=')) {
      depth = parseDepth(arg.slice('--depth='.length), depth)
    } else if (arg === '--json') {
      json = true
    } else if (arg === '--include-workbench') {
      includeWorkbench = true
    } else if (!arg.startsWith('--')) {
      selector = arg
    }
  }

  return { selector, startPath, depth, json, includeWorkbench }
}

function parseDepth(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 20 ? parsed : fallback
}

async function statOrNull(target: string) {
  try {
    return await fs.stat(target)
  } catch (error) {
    const code = nodeErrorCode(error)
    if (code === 'ENOENT' || code === 'ENOTDIR') return null
    throw error
  }
}

async function realPathOrResolved(target: string): Promise<string> {
  try {
    return await fs.realpath(target)
  } catch (error) {
    const code = nodeErrorCode(error)
    if (code === 'ENOENT' || code === 'ENOTDIR') return path.resolve(target)
    throw error
  }
}

function nodeErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined
}
