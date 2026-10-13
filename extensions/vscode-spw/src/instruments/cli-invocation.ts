import { promises as fs } from 'node:fs'
import path from 'node:path'

export type SpwInstrumentOutput = 'spw' | 'json' | 'text'

export interface SpwCliInvocation {
  title: string
  arguments: string[]
  output: SpwInstrumentOutput
  /** Shown in place of the raw arguments when they carry inline source. */
  display?: string
}

/** Inline source rides as one process argument; past this, inspect the file. */
export const INLINE_SOURCE_LIMIT = 32_000

export interface SpwCliHost {
  consumerRoot: string
  toolRoot: string
}

export interface SpwCliProcess {
  command: 'npm'
  arguments: string[]
  cwd: string
}

export function formInvocation(consumerRoot: string, file: string): SpwCliInvocation {
  return {
    title: 'Spw Form',
    arguments: ['form', consumerPath(consumerRoot, file), '--resonance', '--spw'],
    output: 'spw',
  }
}

export function stackInvocation(consumerRoot: string, file: string): SpwCliInvocation {
  return {
    title: 'Spw Surface Stack',
    arguments: ['stack', consumerPath(consumerRoot, file), '--json'],
    output: 'json',
  }
}

export function cacheInvocation(consumerRoot: string, file: string): SpwCliInvocation {
  return {
    title: 'Spw Cache',
    arguments: ['inspect', 'cache', consumerPath(consumerRoot, file), '--json'],
    output: 'json',
  }
}

/** Tokens → structure → trace for a file, or for a selection passed inline. */
export function sourceInvocation(
  consumerRoot: string,
  file: string,
  selection?: string,
): SpwCliInvocation {
  const title = 'Spw Source Inspection'
  if (selection !== undefined) {
    const text = inlineSource(selection, 'Select some source to inspect.')
    return {
      title,
      // The `=` form keeps a selection that starts with `--` from reading as a flag.
      arguments: ['inspect', 'source', `--text=${text}`, '--through', 'trace'],
      output: 'text',
      display: `spw inspect source --text <${describeInline(text)}> --through trace`,
    }
  }
  return {
    title,
    arguments: ['inspect', 'source', consumerPath(consumerRoot, file), '--through', 'trace'],
    output: 'text',
  }
}

export function fingerprintInvocation(expression: string): SpwCliInvocation {
  const text = inlineSource(
    expression.trim(),
    'Select an expression, or put the cursor on a line that holds one.',
  )
  return {
    title: 'Spw Fingerprint',
    arguments: ['fingerprint', `--expr=${text}`],
    output: 'text',
    display: `spw fingerprint --expr <${describeInline(text)}>`,
  }
}

/** `inspect memory` routes to `mem status`; `mem list` names the dumps it counts. */
export function memoryInvocations(): SpwCliInvocation[] {
  return [
    { title: 'Spw Runtime Memory', arguments: ['inspect', 'memory'], output: 'text' },
    { title: 'Spw Memory Dumps', arguments: ['mem', 'list'], output: 'text' },
  ]
}

/** Walk and parse timings for the folder that holds the file (stats arrive on stderr). */
export function performanceInvocation(consumerRoot: string, file: string): SpwCliInvocation {
  const folder = consumerFolderPath(consumerRoot, path.dirname(path.resolve(file)))
  if (folder.includes(',')) {
    throw new Error('spw query reads --from as a comma-separated list; this folder name holds a comma.')
  }
  return {
    title: 'Spw Performance',
    arguments: ['query', '--from', folder, '--selector', 'pathRefs', '--count', '--stats'],
    output: 'text',
  }
}

/** The host-neutral emit IR (spw.emit/1) for a file; no --out, so nothing is written. */
export function projectionInvocation(consumerRoot: string, file: string): SpwCliInvocation {
  return {
    title: 'Spw Projection',
    arguments: ['emit', 'ir', consumerPath(consumerRoot, file)],
    output: 'json',
  }
}

export function refactorPlanInvocation(spec: string): SpwCliInvocation {
  const rename = validateRenameSpec(spec)
  return {
    title: 'Spw Corpus Refactor Plan',
    arguments: ['refactor', '.', '--rename', rename, '--json'],
    output: 'json',
  }
}

export function cliProcess(host: SpwCliHost, invocation: SpwCliInvocation): SpwCliProcess {
  return {
    command: 'npm',
    arguments: [
      '--prefix', path.resolve(host.toolRoot),
      'run', '--silent', 'spw', '--',
      ...invocation.arguments,
    ],
    cwd: path.resolve(host.consumerRoot),
  }
}

export async function resolveSpwCliHost(
  consumerRoot: string,
  configuredToolRoot = '',
): Promise<SpwCliHost | undefined> {
  const root = path.resolve(consumerRoot)
  const configured = configuredToolRoot.trim()
  if (configured) {
    const toolRoot = path.isAbsolute(configured) ? configured : path.resolve(root, configured)
    return await hasNpmScript(toolRoot, 'spw') ? { consumerRoot: root, toolRoot } : undefined
  }
  if (await hasNpmScript(root, 'spw')) return { consumerRoot: root, toolRoot: root }

  const mountedWorkbench = path.join(root, '.spw', '_workbench')
  if (await hasNpmScript(mountedWorkbench, 'spw')) {
    return { consumerRoot: root, toolRoot: mountedWorkbench }
  }
  return undefined
}

export function validateRenameSpec(spec: string): string {
  const normalized = spec.trim()
  const match = /^(mark|anchor|case|mood):([^=\r\n]+)=([^\r\n]+)$/.exec(normalized)
  if (!match || !match[2]?.trim() || !match[3]?.trim()) {
    throw new Error('Expected kind:from=to with kind mark, anchor, case, or mood.')
  }
  return normalized
}

async function hasNpmScript(root: string, name: string): Promise<boolean> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
    if (!isRecord(parsed) || !isRecord(parsed.scripts)) return false
    return typeof parsed.scripts[name] === 'string'
  } catch {
    return false
  }
}

function consumerPath(consumerRoot: string, file: string): string {
  const relative = path.relative(path.resolve(consumerRoot), path.resolve(file))
  if (relative === '' || isOutside(relative)) {
    throw new Error('Spw instruments require a file inside the consumer workspace.')
  }
  return relative.split(path.sep).join('/')
}

function consumerFolderPath(consumerRoot: string, folder: string): string {
  const relative = path.relative(path.resolve(consumerRoot), path.resolve(folder))
  if (isOutside(relative)) {
    throw new Error('Spw instruments require a folder inside the consumer workspace.')
  }
  return relative === '' ? '.' : relative.split(path.sep).join('/')
}

function isOutside(relative: string): boolean {
  return relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)
}

function inlineSource(text: string, emptyMessage: string): string {
  if (!text.trim()) throw new Error(emptyMessage)
  if (text.length > INLINE_SOURCE_LIMIT) {
    throw new Error(
      `The selection holds ${text.length} characters; inline source stops at ${INLINE_SOURCE_LIMIT}. Inspect the whole file instead.`,
    )
  }
  return text
}

function describeInline(text: string): string {
  const lines = text.split(/\r?\n/).length
  return `${lines} line${lines === 1 ? '' : 's'}, ${text.length} chars`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
