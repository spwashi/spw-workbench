# Sense loop — inventory, topography, formulas, analysis

A short path for learning a Spw tree (novel or familiar) without drowning in
full AST walks.

**Learnability:** progressive path [docs/learn](../../learn/README.md) ·
worked transcript [worked-cli.md](../../learn/worked-cli.md) ·
example surface [examples/spw/sense-loop.spw](../../examples/spw/sense-loop.spw).

## Commands

| Step | Command | Question |
|------|---------|----------|
| 1 Inventory | `spw invent [paths]` | What surfaces exist? How warm is each (hub/leaf/orphan)? |
| 2 Topography | `spw map [paths]` | Who depends on whom? Cycles? Broken refs? Shared strands? |
| 3 Formulas | `spw formula [paths]` | Which math patterns are named or embedded? |
| 4 Analysis | `spw analyze [paths]` | Multi-selector densities + top active files |
| 5 Drill | `spw query` / `spw skim` / `spw select` | Exact hits and outlines |

Aliases: `inv`/`inventory`, `topo`, `formulas`, `stats`.

## Examples

```bash
# Enter a pack
spw invent prompts --sort degree -n 25
spw invent prompts --role hub

# Relationship graph + familiarity vs theory
spw map prompts --hubs 12
spw map prompts --compare docs/theory

# Named catalog (no scan) then corpus discovery
spw formula --catalog
spw formula prompts --family field --top 15

# One-pass multi-selector stats
spw analyze prompts
spw analyze prompts --selectors pathRefs,ops:frame,annotations --json

# Detail
spw query --from prompts --count --selector pathRefs
spw skim prompts/index.spw
```

## Machine

| Concern | Module |
|---------|--------|
| Graph / topo / familiarity | `packages/spw-seed/src/math/corpus.ts` |
| Formula catalog + scan | `packages/spw-seed/src/math/formula-scan.ts` |
| Hold / literacy products | `packages/spw-cli/src/emit/axes.ts` |
| Shared CLI scan | `packages/spw-cli/src/corpus-scan.ts` |
| Theory | `docs/theory/spw/math-modeling.spw`, `relationship-topography.spw` |

## JSON envelopes

All four commands accept `--json` for host tooling (editors, agents, notebooks).

## Refuse

- Treating invent/map JSON as genotype source of truth
- Claiming formula scan *evaluates* prose equations (it discovers patterns)
- Skipping topography before mass mutate of novel trees
