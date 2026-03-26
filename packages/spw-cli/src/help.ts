export interface HelpSection {
  title: string
  lines: string[]
}

export interface HelpPage {
  title: string
  usage?: string[]
  sections?: HelpSection[]
}

export function renderHelpPage(page: HelpPage): string {
  const lines: string[] = [page.title]

  if (page.usage && page.usage.length > 0) {
    lines.push('', 'Usage:')
    for (const usage of page.usage) {
      lines.push(`  ${usage}`)
    }
  }

  for (const section of page.sections ?? []) {
    lines.push('', `${section.title}:`)
    for (const line of section.lines) {
      lines.push(`  ${line}`)
    }
  }

  return lines.join('\n')
}

export function printHelpPage(page: HelpPage): void {
  console.log(renderHelpPage(page))
}
