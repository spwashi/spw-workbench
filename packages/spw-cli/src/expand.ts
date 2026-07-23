/**
 * spw expand — the template consumer for bias edges.
 *
 * A reflexive path edge `={ ~"template.spw" }` (anchor elided → the enclosing
 * node) is *provenance*: "this surface is expanded from / conforms to that
 * template." expand reads the same neutral bias edge as a template:
 *
 *   unfold (boon)  — materialize the template's content inline, between markers
 *   fold   (bane)  — collapse the materialized content back to the one-line edge
 *
 * Reversible: unfold then fold is the identity. It is a specialization of the
 * mutate reading (a fold/unfold rewrite against a template edge). readBias stays
 * verb-neutral in seed; the "template" verb lives here.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { BIAS, readBias, spwq } from '@spwashi/spw-seed'
import { printHelpPage } from './help'

interface ExpandArgs {
  targets: string[]
  fold: boolean
  write: boolean
  json: boolean
  help: boolean
}

interface TemplateEdge {
  template: string
  endLine: number
}

const BEGIN = '# >>expand'
const END = '# <<expand'

/** Reflexive path edges are template-lineage edges: `={ ~"tpl" }`, `=label{ ~"tpl" }`. */
function templateEdges(source: string): TemplateEdge[] {
  let matches
  try {
    matches = spwq.fromSource(source, BIAS)
  } catch {
    return []
  }
  const edges: TemplateEdge[] = []
  for (const match of matches) {
    const edge = readBias(match.node)
    if (!edge || edge.anchor) continue // reflexive only — an anchored edge is a rewrite
    const target = edge.targets[0]
    if (!target || target.kind !== 'path') continue
    edges.push({ template: target.value.split('#')[0]!, endLine: match.span.endLine })
  }
  return edges
}

/** Read a tilde-relative template: workspace root first, then the surface dir. */
async function readTemplate(template: string, baseDir: string): Promise<string> {
  for (const candidate of [path.resolve(template), path.resolve(baseDir, template)]) {
    try {
      return (await fs.readFile(candidate, 'utf8')).replace(/\n$/, '')
    } catch {
      // try next candidate
    }
  }
  throw new Error(`template not found: ${template}`)
}

/** Insert each template's content in a marked block after its edge (idempotent). */
async function unfold(source: string, baseDir: string): Promise<{ text: string; count: number }> {
  const edges = templateEdges(source)
  if (edges.length === 0) return { text: source, count: 0 }
  const lines = source.split('\n')
  let count = 0
  // Bottom-up so inserted lines never shift a not-yet-processed edge's index.
  for (const edge of [...edges].sort((a, b) => b.endLine - a.endLine)) {
    const marker = `${BEGIN} ${edge.template}`
    if (lines.includes(marker)) continue // already unfolded
    // Template paths are tilde-relative: try the workspace root first, then the
    // surface's own directory.
    let body: string
    try {
      body = await readTemplate(edge.template, baseDir)
    } catch {
      body = `# (template not found: ${edge.template})`
    }
    lines.splice(edge.endLine + 1, 0, marker, body, `${END} ${edge.template}`)
    count += 1
  }
  return { text: lines.join('\n'), count }
}

/** Strip every `# >>expand P` … `# <<expand P` block, restoring the edge alone. */
function fold(source: string): { text: string; count: number } {
  const lines = source.split('\n')
  const out: string[] = []
  let skipping = false
  let count = 0
  for (const line of lines) {
    if (!skipping && line.startsWith(BEGIN)) {
      skipping = true
      count += 1
      continue
    }
    if (skipping && line.startsWith(END)) {
      skipping = false
      continue
    }
    if (!skipping) out.push(line)
  }
  return { text: out.join('\n'), count }
}

async function runExpand(args: ExpandArgs): Promise<void> {
  if (args.targets.length === 0) {
    console.error('spw expand: name at least one surface to expand')
    process.exitCode = 1
    return
  }
  const applied = args.write ? 'write' : 'plan'
  const verb = args.fold ? 'fold' : 'unfold'
  const results: Array<Record<string, unknown>> = []
  let touched = 0

  for (const target of args.targets) {
    const abs = path.resolve(target)
    const before = await fs.readFile(abs, 'utf8')
    const { text, count } = args.fold ? fold(before) : await unfold(before, path.dirname(abs))
    if (count === 0 || text === before) {
      if (!args.json) console.log(`= ${target}  (no ${verb})`)
      continue
    }
    touched += 1
    if (args.write) await fs.writeFile(abs, text, 'utf8')
    if (args.json) results.push({ file: target, verb, blocks: count, applied })
    else console.log(`~ ${target}  ${args.write ? verb : `would ${verb}`} blocks=${count}`)
  }

  if (args.json) {
    console.log(JSON.stringify({ command: 'expand', verb, mode: applied, touched, results }, null, 2))
  } else {
    console.error(`spw-expand: ${verb} ${args.write ? 'applied' : 'would-apply'}=${touched}${args.write ? '' : '  (plan-only; pass --write to apply)'}`)
  }
}

function parseExpandArgs(args: string[]): ExpandArgs {
  const targets: string[] = []
  let fold = false
  let write = false
  let json = false
  let help = false
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') help = true
    else if (arg === '--fold') fold = true
    else if (arg === '--unfold') fold = false
    else if (arg === '--write') write = true
    else if (arg === '--json') json = true
    else if (!arg.startsWith('--')) targets.push(arg)
  }
  return { targets, fold, write, json, help }
}

export function printExpandHelp(): void {
  printHelpPage({
    title: 'Spw Expand — template unfold / fold',
    usage: [
      'spw expand <surface...> [--write]           unfold template edges inline',
      'spw expand --fold <surface...> [--write]    collapse expansions back to the edge',
    ],
    sections: [
      {
        title: 'Template lineage',
        lines: [
          'A reflexive path edge `={ ~"template.spw" }` declares provenance.',
          'unfold materializes the template between markers; fold removes it.',
          'Reversible: unfold then fold restores the original. Plan-only unless --write.',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--fold / --unfold  Direction (default unfold)',
          '--write            Apply to disk (default is plan-only)',
          '--json             Machine envelope',
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
