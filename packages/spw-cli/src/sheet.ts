/**
 * spw sheet — read quantity sheets written in Spw and say what they define
 * (seed experimental/physics).
 *
 * A file's sheets (each ^name{ %term[expression] … }) are read in order, each
 * extending the ones before it, optionally on top of the SI constants. Each term
 * prints its value in SI base units and its dimension; --in shows it in a unit,
 * --natural in natural units with chosen constants set to 1, and --pi lists the
 * dimensionless groups the last sheet's own terms form.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  SI_CONSTANTS,
  formatDimension,
  inNaturalUnits,
  inUnit,
  piGroups,
  readQuantitySheet,
  type PhysicalQuantity,
  type QuantitySheet,
} from '@spwashi/spw-seed'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'
import { meta } from './view'

export function printSheetHelp(): void {
  printHelpPage({
    title: 'Spw Sheet — quantities defined in Spw, with their dimensions',
    usage: [
      'spw sheet <file.spw> [--si] [--in <unit>] [--natural c,hbar] [--unit <unit>] [--pi] [--json]',
      "spw sheet --line '^pendulum{ %T[2 s] %L[1 m] %g[9.81 m/s^2] }' --pi",
      "spw sheet --si --line '^planck{ %l[(@hbar*@G/@c^3)^(1/2)] }' --in m",
    ],
    sections: [
      {
        title: 'Flags',
        lines: [
          "--line '<sheet>'       Read one sheet given on the command line",
          '--si                   Read on top of the SI constants (c, h, hbar, e, k_B, N_A, G, m_e, m_p, epsilon_0, alpha, Planck units)',
          '--in <unit>            Also show each term in this unit, where the dimensions agree (GeV, km, ms, …)',
          '--natural <names>      Also show each term in natural units, the named constants set to 1 (c,hbar or c,hbar,G)',
          '--unit <unit>          With --natural, the unit left dimensions are measured in (GeV)',
          '--pi                   The dimensionless groups the last sheet\'s own terms form',
          '--json                 Everything as JSON',
        ],
      },
      {
        title: 'Writing a sheet',
        lines: [
          '^name{ %term[expression] … }: an expression is numbers, units with SI prefixes, @other terms, pi, * / + - and ^ to a rational power (3, -2, (1/2)).',
          'A space between atoms multiplies: 6.674e-11 m^3/(kg*s^2). A sum of different dimensions is refused.',
          'Experimental (spw.quantity-sheet/1). Each sheet in a file extends the ones before it.',
        ],
      },
    ],
  })
}

/** The ^name{ … } blocks of a text, in order, by brace matching. */
export function sheetBlocks(text: string): string[] {
  const blocks: string[] = []
  const head = /\^[A-Za-z_][\w]*\s*\{/g
  let m: RegExpExecArray | null
  while ((m = head.exec(text))) {
    let depth = 0
    let end = -1
    for (let i = m.index + m[0].length - 1; i < text.length; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}' && --depth === 0) {
        end = i
        break
      }
    }
    if (end < 0) break
    const block = text.slice(m.index, end + 1)
    if (/%[A-Za-z_]/.test(block)) blocks.push(block)
    head.lastIndex = end + 1
  }
  return blocks
}

const sig = (n: number): string => (Math.abs(n) >= 1e-3 && Math.abs(n) < 1e6 ? String(Number(n.toPrecision(7))) : n.toPrecision(7))

export async function runSpwSheetCli(args: string[]): Promise<void> {
  const flag = (name: string): string | undefined => {
    const at = args.indexOf(name)
    return at >= 0 ? args[at + 1] : undefined
  }
  const has = (name: string) => args.includes(name)
  const valued = new Set(['--line', '--in', '--natural', '--unit'])
  const file = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1] ?? ''))
  const text = flag('--line') ?? (file ? await fs.readFile(path.resolve(file), 'utf8') : undefined)
  if (text === undefined) throw new Error("spw sheet: name a file, or pass --line '^name{ %term[expression] }'")

  let sheet: QuantitySheet | null = has('--si') ? readQuantitySheet(SI_CONSTANTS) : null
  const blocks = sheetBlocks(text)
  if (!blocks.length) throw new Error('spw sheet: no ^name{ %term[…] } sheet found')
  // Terms the file defines (shown), and the last sheet's own terms (what --pi groups).
  const fileTerms = new Set<string>()
  const own: string[] = []
  const problems: Array<{ sheet: string; term: string; problem: string; detail: string }> = []
  for (const block of blocks) {
    const read = readQuantitySheet(block, sheet)
    for (const p of read.problems) problems.push({ sheet: read.name, ...p })
    own.splice(0, own.length, ...Object.keys(read.written).filter((k) => !(sheet?.written && k in sheet.written) || read.written[k] !== sheet.written[k]))
    own.forEach((k) => fileTerms.add(k))
    sheet = read
  }
  const last = sheet!
  const unitText = flag('--in')
  const naturalNames = flag('--natural')?.split(',').map((s) => s.trim()).filter(Boolean)
  const naturalUnit = flag('--unit')
  const unitQuantity = naturalUnit ? readQuantitySheet(`^u{ %u[1 ${naturalUnit}] }`).quantities.u ?? null : null
  const constants = Object.fromEntries((naturalNames ?? []).map((n) => [n, last.quantities[n]!]).filter(([, v]) => v)) as Record<string, PhysicalQuantity>
  const missing = (naturalNames ?? []).filter((n) => !last.quantities[n])
  if (missing.length) throw new Error(`spw sheet: --natural names ${missing.join(', ')}, which no sheet defines (add --si for the SI constants)`)

  const rows = Object.keys(last.written)
    .filter((name) => last.quantities[name])
    .map((name) => {
      const q = last.quantities[name]!
      const inGiven = unitText ? inUnit(q, unitText) : null
      const natural = naturalNames ? inNaturalUnits(q, constants, unitQuantity) : null
      return { name, own: fileTerms.has(name), si: q.scale, dimension: formatDimension(q.dim), ...(unitText ? { in: inGiven } : {}), ...(naturalNames ? { natural } : {}) }
    })
  const groups = has('--pi') ? piGroups(Object.fromEntries(own.filter((n) => last.quantities[n]).map((n) => [n, last.quantities[n]!]))) : []

  if (has('--json')) {
    console.log(formatJsonEnvelope('sheet', { rows, problems, groups }, { sheets: blocks.length, terms: rows.length }))
    return
  }
  meta(`# spw sheet  sheets=${blocks.length}${has('--si') ? ' on the SI constants' : ''}  terms=${rows.length}  problems=${problems.length}`)
  const shown = rows.filter((r) => r.own || !has('--si'))
  const width = Math.max(4, ...shown.map((r) => r.name.length))
  for (const r of shown) {
    let line = `${r.name.padEnd(width)}  ${sig(r.si).padStart(14)}  ${r.dimension}`
    if (unitText) line += `   ${r.in === null || r.in === undefined ? `(not ${unitText})` : `${sig(r.in)} ${unitText}`}`
    if (r.natural !== undefined) line += r.natural ? `   ${sig(r.natural.value)}${naturalUnit && r.natural.unitPower !== '0' ? ` ${naturalUnit}${r.natural.unitPower === '1' ? '' : `^${r.natural.unitPower}`}` : ''}` : '   (not reachable)'
    console.log(line)
  }
  for (const p of problems) console.log(`problem ${p.sheet}.${p.term}: ${p.problem} — ${p.detail}`)
  if (has('--pi')) {
    console.log(groups.length ? 'Dimensionless groups:' : 'No dimensionless group: no product of these terms is a pure number.')
    for (const g of groups) console.log(`  ${g.text}  = ${sig(g.value)}`)
  }
}
