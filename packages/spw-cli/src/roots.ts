import process from 'node:process'
import { printHelpPage } from './help'
import { discoverSpwWorkspace } from './workspace'

interface RootsOptions {
  startPath: string
  json: boolean
}

export async function runSpwRootsCli(argv: string[] = process.argv): Promise<void> {
  const options = parseRootsOptions(normalizeArgs(argv))
  const workspace = await discoverSpwWorkspace(options.startPath)
  const roots = workspace.roots.map(({ sigil, relativePath, role, kind }) => ({
    sigil,
    path: relativePath,
    role,
    kind,
  }))

  if (options.json) {
    console.log(JSON.stringify({
      consumerRoot: '.',
      mode: workspace.mode,
      source: workspace.rootSource,
      roots,
    }, null, 2))
    return
  }

  console.log(`# spw roots (${workspace.mode}, ${workspace.rootSource})`)
  for (const root of roots) {
    console.log(`@${root.sigil}\t${root.role}\t${root.kind}\t${root.path}`)
  }
}

export function printRootsHelp(): void {
  printHelpPage({
    title: 'Spw Roots',
    usage: ['spw roots [start-path] [--json]'],
    sections: [{
      title: 'Behavior',
      lines: [
        'discovers the nearest consumer containing .spw/mount.spw',
        'reads root declarations from .spw/workspace.spw',
        'reports paths relative to the consumer root',
        'labels .spw/_workbench as infrastructure',
      ],
    }],
  })
}

function normalizeArgs(argv: string[]): string[] {
  const args = argv.slice(2)
  return args[0] === 'roots' ? args.slice(1) : args
}

function parseRootsOptions(args: string[]): RootsOptions {
  return {
    startPath: args.find((arg) => !arg.startsWith('--')) ?? '.',
    json: args.includes('--json'),
  }
}
