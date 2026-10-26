import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const extensionRoot = fileURLToPath(new URL('..', import.meta.url))

interface Manifest {
  contributes: {
    commands: Array<{ command: string; title: string; icon?: string }>
    configuration: { properties: Record<string, { type: string; default?: unknown }> }
    menus: Record<string, Array<{ command: string; when?: string; group?: string }>>
  }
}

const manifest = JSON.parse(readFileSync(path.join(extensionRoot, 'package.json'), 'utf8')) as Manifest

function sourceText(): string {
  const read = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return read(full)
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [readFileSync(full, 'utf8')] : []
  })
  return read(path.join(extensionRoot, 'src')).join('\n')
}

const NEW_COMMANDS: Record<string, string> = {
  'spw.inspectSource': 'Spw: Inspect Source',
  'spw.fingerprintSelection': 'Spw: Fingerprint Selection',
  'spw.inspectMemory': 'Spw: Inspect Memory',
  'spw.checkPerformance': 'Spw: Check Performance',
  'spw.showProjection': 'Spw: Show Projection',
  'spw.toggleCaptureMode': 'Spw: Toggle Capture Mode',
}

describe('extension contributions', () => {
  const contributed = new Map(manifest.contributes.commands.map(entry => [entry.command, entry.title]))

  it('contributes each instrument with its plain title, and the source registers it', () => {
    const source = sourceText()
    for (const [command, title] of Object.entries(NEW_COMMANDS)) {
      expect(contributed.get(command)).toBe(title)
      expect(source).toContain(`'${command}'`)
    }
  })

  it('keeps the lens commands internal to code lenses, and registers each', () => {
    const source = sourceText()
    for (const command of ['spw.peekReferences', 'spw.showLocations', 'spw.openUri', 'spw.rebuildGenerated']) {
      expect(contributed.has(command)).toBe(false)
      expect(source).toContain(`'${command}'`)
    }
  })

  it('names every lens command the server sends as one the extension registers', () => {
    const serverRoot = path.join(extensionRoot, '..', '..', 'packages', 'spw-lsp', 'src', 'handlers')
    const server = ['citation-lenses.ts', 'generated-lenses.ts']
      .map(file => readFileSync(path.join(serverRoot, file), 'utf8')).join('\n')
    const sent = [...server.matchAll(/_COMMAND = '(spw\.[A-Za-z]+)'/g)].map(match => match[1])
    expect(sent.sort()).toEqual(['spw.openUri', 'spw.rebuildGenerated', 'spw.showLocations'])
    for (const command of sent) expect(sourceText()).toContain(`'${command}'`)
  })

  it('offers spw.codeLens.enabled, on by default', () => {
    expect(manifest.contributes.configuration.properties['spw.codeLens.enabled'])
      .toMatchObject({ type: 'boolean', default: true })
  })

  it('points every command palette entry at a contributed command', () => {
    for (const entry of manifest.contributes.menus.commandPalette ?? []) {
      expect(contributed.has(entry.command)).toBe(true)
    }
  })

  it('gives every view title action an icon, so its title never crowds out the view name', () => {
    const icons = new Map(manifest.contributes.commands.map(entry => [entry.command, entry.icon]))
    const bare = (manifest.contributes.menus['view/title'] ?? [])
      .filter(entry => entry.group?.startsWith('navigation') && !icons.get(entry.command))
      .map(entry => entry.command)
    expect(bare).toEqual([])
  })
})
