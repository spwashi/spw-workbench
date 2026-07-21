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
| 3 | analyzers | `scripts/analyzers/**`, analyzer-only tests/config/scripts | Delegate parse health and topography to Seed; do not classify syntax independently. |
| 4 | workspace navigation | CLI workspace/roots/tree, mounted-aware query/select/orientation, CLI-owned tests/templates | Consumer authority, manifest validity, and external/infrastructure traversal policy must agree before mutation tooling consumes them. |
| 5 | pulse | CLI pulse module/entrypoint/tests and pulse-only command wiring | Plan every file before any `effect.l2.workspace`; reject incompatible or unknown authority inputs. Contours remain deferred. |
| 6 | LSP authority | `packages/spw-lsp/**` | Expose Seed diagnostics through a versioned URI-first contract; re-anchor indexing to consumer authority and quarantine the path-bearing legacy endpoint. |
| 7 | VS Code client | `extensions/vscode-spw/**`, extension release checks | Consume v1 as a thin URI-native client; repair contributions and ship a self-contained matching server. |
| 8 | canon and skills | `.agents/skills/**`, `.spw/**`, `docs/**`, `lib/spw-v0.3.0/**` | Restore semantic exhibits only after their executable references exist; keep plan caches out. |
| 9 | plan ecology | `.agents/plans/**` | Restore and refresh plans against stable implementation commits; split garden/editor plans when their dependencies differ. |

## Amendment blockers

1. `<>[a,b]` stores Frame parameters separately from operator arguments, so coupling arity remains zero and runtime creates no edge.
2. `collectPlannedEdits()` concatenates sequential edits expressed against different intermediate sources.
3. `parallel_plan` appends cumulative differentials and duplicates already-applied edits after two steps.
4. Mixed effect ceilings report blocked rules as though they ran.
5. Coupling constructors/readers admit non-finite arity, prototype keys, and contradictory occupancy/payload states.
6. CLI and LSP use different manifest fallback and duplicate-root policies.
7. Matrix transpose discards row-label meaning through an incompatible axis cast.

Resolution status after Seed partition:

Portable Seed reconstruction landed as `86d433b4`; later partitions may consume it but must not silently redefine these invariants.

Parse-health follow-up `55190299` makes Seed's topography snapshot the shared lexeme-closure authority; analyzers should delegate to it instead of copying escape logic.

Mutation-plan follow-up `86e0469e` advances a virtual source to convergence during plan-only runs, so fixed-point source, hash, vector, and terminal evidence agree with in-memory execution while returned source bytes remain unapplied.

Workspace contract `51d36684` distinguishes valid from invalid present manifests and reports duplicate, malformed, empty, missing-frame, unterminated, and parse diagnostics. File absence remains an I/O-layer fact.

- resolved: `<>` Frame operands now determine ONF arguments and arity;
- resolved: mutation runs expose one input-coordinate `plannedDifferential` and distinguish planned/applied work;
- resolved: parallel composition replaces, rather than appends, the cumulative base transform;
- resolved: mixed-authority profiles fail atomically with explicit blocked-rule receipts;
- resolved: coupling construction/reading validates arity, own keys, surfaces, placement, and occupancy/payload compatibility;
- resolved by `0a8adfe2`: LSP v1 delegates manifest validity to Seed, distinguishes absent/invalid/unreadable authority, and blocks unusable roots without inferred fallback;
- resolved: transpose returns a separately labeled, non-vector-multipliable matrix type.

Runtime integration status:

- ready: `<>["a","b"]` lowers two operands, creates exact bidirectional adjacency, and emits a traceable relation event;
- ready: relation affinity is distinct from Capsule boundary affinity;
- ready: coupling density is explicitly derived from exact edges and refreshed as register population changes;
- ready: executable runtime tables no longer present chemistry or acoustic readings as implementation fact.

Tooling integration status:

- landed `f96015fc`: analyzers consume Seed topography evidence, crossed boundaries do not manufacture pairs, and incomplete inputs cannot receive refactor-equivalence receipts;
- landed `eb45f240`: navigation distinguishes consumer, infrastructure, canonical, and explicitly declared external authority while rejecting invalid manifests, unknown sigils, and realpath aliases into mounted infrastructure;
- landed `5f1dff99`: pulse plans all requested files before one guarded `effect.l2.workspace`, refuses macro/cross-authority writes, rejects non-round-tripping UTF-8, and reports semantic equivalence as unclaimed.
- landed `28906c5d`: designated mounted-workbench identity takes precedence over generic external classification when the mount resolves through a symlink;
- landed `0a8adfe2`: LSP initialization inside a designated mount resolves outer consumer authority before config, observable state, indexing, and scanning while ordinary nested folders remain explicit; v1 is a closed URI-only shape and the legacy method is explicitly quarantined;
- ready for human gate: VS Code consumes the shared v1 decoder, carries URI/role/kind evidence through navigation and atlas state, removes local root inference and legacy projections, bundles the matching server, and passes an extracted-archive smoke.

## Reviewed post-checkpoint candidates

Replay only after the checkpoint partitions build:

- retain the corrected runtime-test import;
- retain compact `effect.l0.measure`, `effect.l1.memory`, `effect.l2.workspace`, and `effect.l3.external` identifiers in human-facing plans and transports;
- retain payload-safe `@(L) <-> $(L)` mobility and explicit non-equivalence receipts;
- repair contour identity, immutability, and actual lost-axis accounting before landing contours;
- validate liminality options before any RegisterBank mutation and define target-order behavior;
- reject `--contour` without one ladder before mutation dispatch;
- prevent `measure_only --write` from acquiring workspace authority;
- retain the LSP split from editor packaging: v1 protocol/authority first, then a URI-native client with an extracted-archive server smoke;
- repair selector truth before plugin exposure: require full-token consumption, separate `any` from `*`, project all boundary-coupling discriminants, and define ordered-group semantics before choosing collision-free surface syntax;
- keep projections out of workspace-manifest v1 until base/target URI, readiness, provenance, revision, and hypothetical status are explicit;
- keep Neovim workspace evidence in its own partition: negotiate the advertised method and retire local regex/path/write authority before adding root navigation;
- reconcile mobility catalogs with their executable `apply` domains;
- keep `swap-grace.spw` out until its boundary kinds, Frame/Body spelling, surface/runtime liminality, and alternate-form witness are corrected.

## History and plan constraints

- Nine current-main plan references name `main@a333db8d`; refresh them only after the replacement series has stable SHAs.
- Existing plans that call untracked contour/liminality files “landed” remain conditional until the implementation partition commits.
- Editor order is `form-geometry P0 -> protocol registry -> formContext P1+`; do not encode a dependency cycle.
- Query order is `query-truth-v1 -> workspaceQuery/v1 -> saved editor profiles`; current cross-file reference navigation does not validate arbitrary selector expressions.
- Human authority and effect ceiling are orthogonal: confirming an `effect.l1.memory` plan does not grant `effect.l2.workspace`.

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
