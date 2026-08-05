/**
 * CLI help rendering — accepts legacy HelpPage and command-shaped pages.
 *
 * Prefer CommandHelpPage for modules (name + summary + groups + examples).
 * Section titles can be full loc keys (module.section.key) or plain strings.
 *
 * Shared help chrome strings live here (not a global catalog dump).
 */

import { defineLoc, isLocKey, t, type LocKey } from './loc'

/** Common help chrome — defined in this file for copy editors. */
export const helpLoc = defineLoc('common', {
  'help.usage': 'Usage:',
  'help.options': 'Options',
  'help.notes': 'Notes',
  'help.examples': 'Examples',
  'help.compatibility': 'Compatibility',
  'error.unknown_command': 'unknown command "{command}"',
  'error.did_you_mean': 'did you mean: {hints}?',
  'error.prefix': 'spw: {message}',
})

export interface HelpSection {
  title: string
  lines: string[]
}

/** Legacy shape used by mem/geometry/root. */
export interface HelpPage {
  title: string
  usage?: string[]
  sections?: HelpSection[]
}

/**
 * Command module shape (lattice, delta, …).
 * Normalized to HelpPage before render.
 */
export interface CommandHelpPage {
  name: string
  summary: string
  usage?: string[]
  groups?: HelpSection[]
  examples?: string[]
}

export type HelpInput = HelpPage | CommandHelpPage

function isCommandHelp(page: HelpInput): page is CommandHelpPage {
  return 'name' in page && typeof (page as CommandHelpPage).name === 'string'
}

function resolveTitle(raw: string): string {
  if (isLocKey(raw)) return t(raw as LocKey)
  return raw
}

function resolveLine(raw: string): string {
  if (isLocKey(raw)) return t(raw as LocKey)
  return raw
}

/** Normalize command-shaped help into the legacy page model. */
export function normalizeHelpPage(page: HelpInput): HelpPage {
  if (!isCommandHelp(page)) {
    return {
      title: resolveTitle(page.title),
      usage: page.usage,
      sections: page.sections?.map(s => ({
        title: resolveTitle(s.title),
        lines: s.lines.map(resolveLine),
      })),
    }
  }

  const sections: HelpSection[] = []
  for (const g of page.groups ?? []) {
    sections.push({
      title: resolveTitle(g.title),
      lines: g.lines.map(resolveLine),
    })
  }
  if (page.examples && page.examples.length > 0) {
    sections.push({
      title: helpLoc('help.examples'),
      lines: page.examples.map(resolveLine),
    })
  }

  const title = `${page.name} — ${resolveLine(page.summary)}`
  return {
    title,
    usage: page.usage,
    sections,
  }
}

export function renderHelpPage(page: HelpInput): string {
  const normalized = normalizeHelpPage(page)
  const lines: string[] = [normalized.title]

  if (normalized.usage && normalized.usage.length > 0) {
    lines.push('', helpLoc('help.usage'))
    for (const usage of normalized.usage) {
      lines.push(`  ${resolveLine(usage)}`)
    }
  }

  for (const section of normalized.sections ?? []) {
    lines.push('', `${section.title}:`)
    for (const line of section.lines) {
      lines.push(`  ${line}`)
    }
  }

  return lines.join('\n')
}

export function printHelpPage(page: HelpInput): void {
  console.log(renderHelpPage(page))
}
