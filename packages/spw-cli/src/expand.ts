/**
 * spw expand — the template consumer for bias edges.
 *
 * A reflexive path edge `={ ~"template.spw" }` (anchor elided → the enclosing
 * node) is *provenance*: "this surface is expanded from that template." expand
 * reads the same neutral bias edge as a template and renders the unfolded view.
 *
 * It is a **projection**, not a mutation: the edge IS the canonical fold, so the
 * source is never rewritten. Inlining a foreign surface into the source cannot
 * round-trip through the parser reliably; projecting a view sidesteps that whole
 * class of fragility. Each template is framed in a `<< … >>` stream (flow of
 * content) with a provenance line, and nested reflexive edges expand
 * recursively under a visited-set so cycles terminate. readBias stays
 * verb-neutral in seed; the "template" verb lives here.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { derivedSurfaceName, parse, resolveFragment } from '@spwashi/spw-seed'
import { biasSites, resolveTilde } from './bias-edges'
import { printHelpPage } from './help'

interface ExpandArgs {
  targets: string[]
  write: boolean
  json: boolean
  help: boolean
  maxDepth: number
}

const DEFAULT_DEPTH = 4

/** Reflexive path edges are the template-lineage edges: `={ ~"tpl" }`, `=label{ ~"tpl" }`. */
function templateSites(source: string) {
  return biasSites(source).filter(
    (site) => !site.edge.anchor && site.edge.targets[0]?.kind === 'path',
  )
}

/**
 * Render the surface with each template edge's content unfolded beneath it,
 * recursively. Pure projection — returns text, never touches disk state of the
 * input. `visited` carries the template paths already open on this branch so a
 * self- or mutually-referential template terminates instead of looping.
 */
export async function project(
  source: string,
  baseDir: string,
  visited: ReadonlySet<string>,
  depth: number,
  maxDepth: number,
): Promise<{ text: string; unfolded: number }> {
  const sites = templateSites(source)
  if (sites.length === 0) return { text: source, unfolded: 0 }

  const lines = source.split('\n')
  let unfolded = 0
  // Bottom-up so inserted blocks never shift a not-yet-processed edge's line.
  for (const site of [...sites].sort((a, b) => b.endLine - a.endLine)) {
    const target = site.edge.targets[0]!
    const template = target.value.split('#')[0]!
    const block = await renderTemplate(template, target.fragment, baseDir, visited, depth, maxDepth)
    lines.splice(site.endLine, 0, block)
    unfolded += 1
  }
  return { text: lines.join('\n'), unfolded }
}

/** Frame one template's (recursively projected) content as a provenance stream. */
async function renderTemplate(
  template: string,
  fragment: string | undefined,
  baseDir: string,
  visited: ReadonlySet<string>,
  depth: number,
  maxDepth: number,
): Promise<string> {
  const label = fragment ? `${template}#${fragment}` : template
  const open = `<<  # ⟵ ~"${label}"`
  if (visited.has(label)) return `${open}\n  # (cycle: already expanding ${label})\n>>`
  if (depth >= maxDepth) return `${open}\n  # (depth limit ${maxDepth} reached)\n>>`

  const resolved = await resolveTilde(template, baseDir)
  if (!resolved) return `${open}\n  # (template not found)\n>>`

  let raw = (await fs.readFile(resolved, 'utf8')).replace(/\n$/, '')
  if (fragment) {
    // Project only the deixis-anchored node's region, not the whole surface.
    const answer = resolveFragment(parse(raw).ast!, fragment)
    const bound = answer.binding?.bound
    if (!bound) {
      return `${open}\n  # (anchor missing; has: ${answer.available.join(', ') || 'none'})\n>>`
    }
    raw = raw.slice(bound.span.start.offset, bound.span.end.offset).trimEnd()
  }
  const nested = await project(raw, path.dirname(resolved), new Set([...visited, label]), depth + 1, maxDepth)
  return `${open}\n${nested.text}\n>>`
}

async function runExpand(args: ExpandArgs): Promise<void> {
  if (args.targets.length === 0) {
    console.error('spw expand: name at least one surface to expand')
    process.exitCode = 1
    return
  }

  const results: Array<Record<string, unknown>> = []
  for (const target of args.targets) {
    const abs = path.resolve(target)
    const source = await fs.readFile(abs, 'utf8')
    const { text, unfolded } = await project(source, path.dirname(abs), new Set(), 0, args.maxDepth)

    if (args.write) {
      // Derived artifact, never the source — the source stays the canonical fold.
      const out = derivedSurfaceName(abs, 'expanded')
      await fs.writeFile(out, text.endsWith('\n') ? text : `${text}\n`, 'utf8')
      results.push({ file: target, unfolded, out: path.relative(process.cwd(), out) })
      if (!args.json) console.error(`~ ${target}  unfolded=${unfolded} → ${path.relative(process.cwd(), out)}`)
    } else if (args.json) {
      results.push({ file: target, unfolded, text })
    } else {
      process.stdout.write(text.endsWith('\n') ? text : `${text}\n`)
    }
  }

  if (args.json) console.log(JSON.stringify({ command: 'expand', results }, null, 2))
}

function parseExpandArgs(args: string[]): ExpandArgs {
  const targets: string[] = []
  let write = false
  let json = false
  let help = false
  let maxDepth = DEFAULT_DEPTH
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!
    if (arg === '--help' || arg === '-h') help = true
    else if (arg === '--write') write = true
    else if (arg === '--json') json = true
    else if (arg === '--depth') maxDepth = Number(args[++i]) || DEFAULT_DEPTH
    else if (arg.startsWith('--depth=')) maxDepth = Number(arg.slice('--depth='.length)) || DEFAULT_DEPTH
    else if (!arg.startsWith('--')) targets.push(arg)
  }
  return { targets, write, json, help, maxDepth }
}

export function printExpandHelp(): void {
  printHelpPage({
    title: 'Spw Expand — template projection',
    usage: [
      'spw expand <surface...> [--depth N]           project the unfolded view to stdout',
      'spw expand <surface...> --write               write <surface>.expanded.spw (source untouched)',
    ],
    sections: [
      {
        title: 'Template lineage',
        lines: [
          'A reflexive path edge `={ ~"template.spw" }` declares provenance.',
          'expand projects each template inline, framed in a `<< … >>` stream,',
          'recursively (depth-bounded, cycle-guarded). The source is the canonical',
          'fold and is never rewritten — --write emits a derived .expanded.spw.',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--depth N   Max recursion depth (default 4)',
          '--write     Emit <surface>.expanded.spw instead of stdout',
          '--json      Machine envelope',
        ],
      },
    ],
  })
}

export async function runSpwExpandCli(argv: string[] = process.argv): Promise<void> {
  const raw = argv.slice(2)
  const rest = raw[0] === 'expand' ? raw.slice(1) : raw
  const args = parseExpandArgs(rest)
  if (args.help) {
    printExpandHelp()
    return
  }
  await runExpand(args)
}
