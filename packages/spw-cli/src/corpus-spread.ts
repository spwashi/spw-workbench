import type { IndexDepth } from './corpus-scan'

export const CORPUS_SPREADS = ['near', 'standard', 'far'] as const
export type CorpusSpread = (typeof CORPUS_SPREADS)[number]

const INDEX_DEPTH_BY_SPREAD = {
  near: 'minimal',
  standard: 'standard',
  far: 'full',
} as const satisfies Record<CorpusSpread, IndexDepth>

const SPREAD_BY_INDEX_DEPTH = {
  minimal: 'near',
  standard: 'standard',
  full: 'far',
} as const satisfies Record<IndexDepth, CorpusSpread>

export interface CorpusSpreadArgument {
  spread: CorpusSpread
  indexDepth: IndexDepth
  nextIndex: number
  spelling: '--spread' | '--depth'
}

/** Read the lyrical corpus-work handle or its temporary technical alias. */
export function readCorpusSpreadArgument(
  args: readonly string[],
  index: number,
  command: string,
): CorpusSpreadArgument | undefined {
  const argument = args[index]
  if (argument === '--spread') {
    return fromSpread(args[index + 1], index + 1, command)
  }
  if (argument?.startsWith('--spread=')) {
    return fromSpread(argument.slice('--spread='.length), index, command)
  }
  if (argument === '--depth') {
    return fromDepth(args[index + 1], index + 1, command)
  }
  if (argument?.startsWith('--depth=')) {
    return fromDepth(argument.slice('--depth='.length), index, command)
  }
  return undefined
}

export function indexDepthForSpread(spread: CorpusSpread): IndexDepth {
  return INDEX_DEPTH_BY_SPREAD[spread]
}

export function parseCorpusSpread(raw: string | undefined, command: string): CorpusSpread {
  if (raw && CORPUS_SPREADS.includes(raw as CorpusSpread)) return raw as CorpusSpread
  const received = raw === undefined || raw.length === 0 ? 'missing' : raw
  throw new Error(
    `spw ${command}: --spread must be near|standard|far (got ${received}; --depth is an alias)`,
  )
}

function parseIndexDepthAlias(raw: string | undefined, command: string): IndexDepth {
  if (raw === 'minimal' || raw === 'standard' || raw === 'full') return raw
  const received = raw === undefined || raw.length === 0 ? 'missing' : raw
  throw new Error(
    `spw ${command}: --depth must be minimal|standard|full (got ${received}); prefer --spread near|standard|far`,
  )
}

function fromSpread(raw: string | undefined, nextIndex: number, command: string): CorpusSpreadArgument {
  const spread = parseCorpusSpread(raw, command)
  return {
    spread,
    indexDepth: INDEX_DEPTH_BY_SPREAD[spread],
    nextIndex,
    spelling: '--spread',
  }
}

function fromDepth(raw: string | undefined, nextIndex: number, command: string): CorpusSpreadArgument {
  const indexDepth = parseIndexDepthAlias(raw, command)
  return {
    spread: SPREAD_BY_INDEX_DEPTH[indexDepth],
    indexDepth,
    nextIndex,
    spelling: '--depth',
  }
}
