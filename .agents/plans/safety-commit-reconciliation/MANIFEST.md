# Safety checkpoint revision map

This manifest partitions safety checkpoint `a333db8d33606c362439487f41371ad4091506b6` relative to parent `b4832193891b2b89b7e1e20dc0e462e2e4c9236e`. The commit object remains the exhaustive byte-level inventory:

```bash
git diff-tree --no-commit-id --name-status -r a333db8d
```

Checkpoint size: 147 files, 17,539 insertions, 1,245 deletions. The original episode records only `npm run build`; each reconstructed partition needs behavioral verification proportionate to its effects.

## Partition map

| Order | Owner | Primary paths | Required exclusions or hunk splits |
|---|---|---|---|
| 1 | portable Seed | `packages/spw-seed/**`, `src/seed/**` | No runtime, CLI, LSP, extension, DOM, date, randomness, or workbench-layer imports. Root export hunks travel with their implementation. Repair Seed-owned blockers before committing. |
| 2 | runtime | `packages/spw-runtime/**`, runtime-owned tests | Do not absorb CLI integration tests merely because they live under `src/runtime/__tests__`. |
| 3 | CLI and analyzers | `packages/spw-cli/**`, `scripts/analyzers/**`, `scripts/spw-pulse.ts`, CLI-owned tests/templates | Separate navigation/workspace commands from mutation/probe surfaces if either cannot build independently. |
| 4 | LSP and editor | `packages/spw-lsp/**`, `extensions/vscode-spw/**` | LSP transports Seed observations; extension remains a thin client. |
| 5 | canon and skills | `.agents/skills/**`, `.spw/**`, `docs/**`, `lib/spw-v0.3.0/**` | Restore semantic exhibits only after their executable references exist; keep plan caches out. |
| 6 | plan ecology | `.agents/plans/**` | Restore and refresh plans against stable implementation commits; split garden/editor plans when their dependencies differ. |

## Amendment blockers

1. `<>[a,b]` stores Frame parameters separately from operator arguments, so coupling arity remains zero and runtime creates no edge.
2. `collectPlannedEdits()` concatenates sequential edits expressed against different intermediate sources.
3. `parallel_plan` appends cumulative differentials and duplicates already-applied edits after two steps.
4. Mixed effect ceilings report blocked rules as though they ran.
5. Coupling constructors/readers admit non-finite arity, prototype keys, and contradictory occupancy/payload states.
6. CLI and LSP use different manifest fallback and duplicate-root policies.
7. Matrix transpose discards row-label meaning through an incompatible axis cast.

Resolution status after Seed partition:

- resolved: `<>` Frame operands now determine ONF arguments and arity;
- resolved: mutation runs expose one input-coordinate `plannedDifferential` and distinguish planned/applied work;
- resolved: parallel composition replaces, rather than appends, the cumulative base transform;
- resolved: mixed-authority profiles fail atomically with explicit blocked-rule receipts;
- resolved: coupling construction/reading validates arity, own keys, surfaces, placement, and occupancy/payload compatibility;
- pending LSP partition: shared manifest fallback and duplicate-root policy;
- resolved: transpose returns a separately labeled, non-vector-multipliable matrix type.

## Reviewed post-checkpoint candidates

Replay only after the checkpoint partitions build:

- retain the corrected runtime-test import;
- retain canonical S0 read / S1 in-memory / S2 workspace / S3 external wording;
- retain payload-safe `@(L) <-> $(L)` mobility and explicit non-equivalence receipts;
- repair contour identity, immutability, and actual lost-axis accounting before landing contours;
- validate liminality options before any RegisterBank mutation and define target-order behavior;
- reject `--contour` without one ladder before mutation dispatch;
- prevent `measure_only --write` from acquiring workspace authority;
- reconcile mobility catalogs with their executable `apply` domains;
- keep `swap-grace.spw` out until its boundary kinds, Frame/Body spelling, surface/runtime liminality, and alternate-form witness are corrected.

## History and plan constraints

- Nine current-main plan references name `main@a333db8d`; refresh them only after the replacement series has stable SHAs.
- Existing plans that call untracked contour/liminality files “landed” remain conditional until the implementation partition commits.
- Editor order is `form-geometry P0 -> protocol registry -> formContext P1+`; do not encode a dependency cycle.
- Human authority and effect grade are orthogonal: confirming an in-memory mutation does not make it S2.

## Completion comparison

The reconstructed checkpoint is compared by tree and by behavior:

```bash
git diff --stat a333db8d..HEAD
git diff --name-status a333db8d..HEAD
npm run build
npm run test:seed
npm run test:runtime
npm run test:lsp
npm run test:dom
npm run lint:spw
npm run lint:docs
```

Every nonempty final diff must map to a blocker or reviewed candidate above and have an adjacent regression test or falsification probe.
