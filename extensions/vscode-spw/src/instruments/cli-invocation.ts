import { promises as fs } from 'node:fs'
import path from 'node:path'

export type SpwInstrumentOutput = 'spw' | 'json'

export interface SpwCliInvocation {
  title: string
  arguments: string[]
  output: SpwInstrumentOutput
}

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

export async function resolveSpwCliHost(consumerRoot: string): Promise<SpwCliHost | undefined> {
  const root = path.resolve(consumerRoot)
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
  const root = path.resolve(consumerRoot)
  const surface = path.resolve(file)
  const relative = path.relative(root, surface)
  if (relative === '' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    throw new Error('Spw instruments require a file inside the consumer workspace.')
  }
  return relative.split(path.sep).join('/')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
