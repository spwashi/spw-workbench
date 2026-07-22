# Runtime memory & caching

Two layers:

| Layer | Surface | Role |
|-------|---------|------|
| **Live bank** | `RegisterBank` | Working-set cells, phases, liminality, pressure eviction |
| **Beat cache** | `BeatCache` | Discrete TTL tiers (hot/warm/cold) for selectors / LSP |
| **Disk dumps** | `spw mem` | Snapshot / restore / prune `.agents/state/runtime` |

## Register bank

### Budget

```ts
import { RegisterBank } from '@spwashi/spw-runtime'

const bank = new RegisterBank()
bank.setMemoryBudget({
  maxCost: 256,          // soft cost units (magnitude + facets + provenance)
  maxCells: 64,          // optional cell cap (protected keys excluded from drop)
  preferFacetEviction: true,
  maxEvictLiminality: 'visible', // never drop global by default policy
})

const pressure = bank.memoryPressure()
// { cells, estimatedCost, overBudget, costRatio, byLiminality, … }

bank.enforceMemoryBudget() // strip early facets, then drop cold cells
bank.purgeColdCells({ maxLiminality: 'local', limit: 16 })
bank.setFacetEvictable(key, true) // allow facet strip under pressure
```

### Protection

Never auto-deleted: focus key, default `"`, history `0`–`9`, `@`, `mark:*`.

### LRU

`get` / `deposit` / `touch` update `lastUsedAt`. Eviction scores favor old, local, low-frequency, low-coupling cells.

### Phase facets

When `phases.evictable` is true, `evictEarlyFacets` keeps only the latest facet (cheaper recompute for lex/parse).

## Beat cache

Matches `.spw/biome/ocean/algos/cache.spw`:

| Tier | Default TTL (beats) |
|------|---------------------|
| hot  | 8 |
| warm | 64 |
| cold | 256 |

```ts
import { BeatCache, cacheKey } from '@spwashi/spw-runtime'

const cache = new BeatCache({ maxEntries: 1024 })
const key = cacheKey({ fileHash: '…', selectorId: 'pathRefs', channel: 'stable' })
cache.set(key, payload, 'hot')
cache.tick()              // advance beat clock + sweep
cache.get(key)            // promotes after repeated hits
cache.invalidateFileHash(hash) // prefix invalidation
```

## Disk (`spw mem`)

```bash
spw mem status [--json]     # live dir size + dump footprint + soft pressure
spw mem dump [--label x]    # snapshot runtime cells to dumps/
spw mem load [--from dir] [--wipe]
spw mem list
spw mem prune [--keep 5]    # retain newest N dumps
```

## Theory pointers

- Liminality GC policy: `docs/runtime/index.spw` acoustic fields
- Ocean cache contract: `.spw/biome/ocean/algos/cache.spw`
- Effect grade for in-memory rewrite: `effect.l1.memory` (pulse/mutate)
