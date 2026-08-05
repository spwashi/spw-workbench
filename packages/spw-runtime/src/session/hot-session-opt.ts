/**
 * Dialect opt-channel wiring for interconnect / phrase optimization.
 */

import { openOptChannel } from '@spwashi/spw-seed'
import type { OptHandleId } from './dialect-policy'

export function optChannelsFor(handles: readonly OptHandleId[]) {
  const all: Record<string, ReturnType<typeof openOptChannel>> = {
    parse_reuse: openOptChannel('parse_reuse', ['parse', 'lex', 'preprocess'], {
      via: ['produces', 'consumes'],
    }),
    phrase_opt: openOptChannel('phrase_opt', ['phrase', 'form', 'flow'], {
      scheme: 'thrift',
      via: ['optimizes', 'projects'],
    }),
    path_memo: openOptChannel('path_memo', ['graph', 'selection'], {
      via: ['traverses', 'cites'],
      budget: { nodes: 4096 },
    }),
    label_opt: openOptChannel('label_opt', ['phrase', 'form', 'identity'], {
      scheme: 'default',
      via: ['optimizes', 'cites'],
      cacheFragment: 'label',
    }),
    bias_rank: openOptChannel('bias_rank', ['bias', 'flow', 'attention'], {
      via: ['optimizes', 'resonates'],
      cacheFragment: 'bias',
    }),
    schedule_opt: openOptChannel('schedule_opt', ['flow', 'stream'], {
      via: ['resonates', 'projects'],
      cacheFragment: 'schedule',
    }),
    probe_opt: openOptChannel('probe_opt', ['probe', 'measure', 'resonance'], {
      scheme: 'thrift',
      via: ['resonates', 'optimizes'],
      cacheFragment: 'probe',
    }),
    precipitate_cite: openOptChannel('precipitate_cite', ['precipitate', 'onf', 'parse'], {
      via: ['precipitates', 'projects'],
    }),
  }
  return handles.map(h => all[h]).filter((c): c is NonNullable<typeof c> => !!c)
}
