/**
 * Lexer Profiles
 *
 * Registry and helpers for tunable lexing.
 */

import type { LexProfile } from '../types'
import type { OperatorKind } from '../types/token'

/** All Spw operator sigils — must stay consistent with OperatorKind in types/token.ts */
export const DEFAULT_OPERATOR_MAP = {
  '!': '!',
  '^': '^',
  '~': '~',
  '?': '?',
  '*': '*',
  '=': '=',
  '@': '@',
  '#': '#',
  '.': '.',
  '&': '&',
  '$': '$',
  '%': '%',
  '<>': '<>',
} as const satisfies Record<OperatorKind, string>

export const DEFAULT_CONNECTOR_MAP: Record<string, string> = {
  '..': '..',
  '->': '->',
  '|': '|',
  '/': '/',
}

export const DEFAULT_LEX_PROFILE: LexProfile = {
  id: 'default',
  name: 'Default',
  operators: DEFAULT_OPERATOR_MAP,
  connectors: DEFAULT_CONNECTOR_MAP,
  // Prompt-pack boonhonk formulas use infix `+` between measures.
  // Treat it as a connector so canonical prompt files stop producing
  // false lexer diagnostics while keeping the change surface narrow.
  extraConnectors: ['+'],
  stringQuotes: ['"', "'"],
}

export const PROSE_LEX_PROFILE: LexProfile = {
  id: 'prose',
  name: 'Prose',
  operators: DEFAULT_OPERATOR_MAP,
  connectors: DEFAULT_CONNECTOR_MAP,
  unknownAsText: true,
  stringQuotes: ['"'],
}

const registry = new Map<string, LexProfile>([
  [DEFAULT_LEX_PROFILE.id, DEFAULT_LEX_PROFILE],
  [PROSE_LEX_PROFILE.id, PROSE_LEX_PROFILE],
])

export function registerLexProfile(profile: LexProfile): void {
  registry.set(profile.id, profile)
}

export function getLexProfile(id: string): LexProfile | undefined {
  return registry.get(id)
}

export function listLexProfiles(): LexProfile[] {
  return Array.from(registry.values())
}

export function resolveLexProfile(profile?: LexProfile | string): LexProfile {
  if (!profile) return DEFAULT_LEX_PROFILE
  if (typeof profile === 'string') {
    return registry.get(profile) ?? DEFAULT_LEX_PROFILE
  }
  return profile
}

export function buildOperatorMap(profile?: LexProfile): Record<string, string> {
  const resolved = resolveLexProfile(profile)
  const map: Record<string, string> = { ...DEFAULT_OPERATOR_MAP, ...(resolved.operators ?? {}) }
  for (const extra of resolved.extraOperators ?? []) {
    map[extra] = extra
  }
  for (const disabled of resolved.disabledOperators ?? []) {
    delete map[disabled]
  }
  return map
}

export function buildConnectorMap(profile?: LexProfile): Record<string, string> {
  const resolved = resolveLexProfile(profile)
  const map = { ...DEFAULT_CONNECTOR_MAP, ...(resolved.connectors ?? {}) }
  for (const extra of resolved.extraConnectors ?? []) {
    map[extra] = extra
  }
  for (const disabled of resolved.disabledConnectors ?? []) {
    delete map[disabled]
  }
  return map
}
