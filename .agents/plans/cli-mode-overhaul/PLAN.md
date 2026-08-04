# Plan: cli-mode-overhaul

Overhaul the Spw CLI around **effect modes** (measure, preview, stream, precipitate, generate, patch, write), intermediate **Spw precipitation** and **flow caches** for hot-reload/patching, and agent-first composition — without treating unused verb names as sacred muscle memory.

## Goal

Today’s CLI grew as a registry of present-tense verbs with partial JSON, uneven `--write` semantics, and two incomplete stories of intermediate state: the hot pulse→mutate→beat ladder (effect ceilings) and the runtime precipitate pipeline (stage artifacts that can re-render as Spw). Derived surfaces only know `expanded`. Flow for HMR/patching is documented in prose (`pulse-mutate-beat.md`) but not a first-class, queryable mode lattice on every command.

This plan:

1. **Audits** every shipped and adjacent tool for what it may do to the world (mode × ceiling × buffer owner × artifact kind).  
2. **Names** intermediate products — precipitates (stage Spw/JSON), flow caches (beat-keyed, invalidatable), patches (planned diffs), generations (`@gen` / `.<kind>.spw`).  
3. **Overhauls assumptions**: mode-first help and envelope fields; free rename/merge of underused verbs; one wire contract; plan/agent tools on the binary; optional flow-cache for hot/patch loops.  
4. **Implements** in dependency order: mode registry → envelope migration → precipitate/flow-cache kinds → hot-loop wiring → agent capabilities.

Taste note:
- **correctness** — no silent write; every path declares mode + ceiling  
- **clarity** — one vocabulary for intermediate artifacts  
- **expressiveness** — precipitates as Spw when possible (`precipitates.spw` invariant)  
- **agent affordance** — discoverable modes, composable JSON, relative paths  

**Assumption change:** aliases and stable names are *not* prioritized for verbs that have not earned usage. Prefer a legible mode lattice over historical registry shape. Keep pulse/mutate/beat differentiation (ceilings), but everything else is open to rename, merge, or demote.

## Scope

- **In scope**:
  - Mode taxonomy and per-command audit matrix (shipped as Spw exhibit + PLAN appendix).  
  - CommandSpec extensions: `modes[]`, `ceiling`, `artifacts[]`, `buffer` (disk | stdin | host | none).  
  - Envelope v1 fields for `mode`, `ceiling`, optional `precipitates[]` / `patch` / `cacheKey`.  
  - Derived-surface kind expansion beyond `expanded` (e.g. `planned`, `precipitate`, `patch` — exact set from audit).  
  - Flow-cache design: beat- or content-hash-keyed intermediate state for HMR/patch (location under `.spw/gen/` or memory-only; never hand-edited).  
  - Hot-loop integration: beat → measure/preview → optional precipitate to cache → patch/write.  
  - Agent surface: `spw capabilities` listing modes/ceilings/json contracts; absorb or wrap plan ecology verbs.  
  - Refresh `conventions/cli.spw` and `hot.spw` to match the mode lattice.  
  - Deprecate or rehome orphan analyzers under the registry.

- **Out of scope**:
  - LSP server-index / granule / shapeFingerprint feature spines.  
  - Full runtime `runSpwStepped` UI debugger (consumes precipitates; not required to ship CLI modes).  
  - History rewrite of past CLI commits.  
  - Preserving every current verb name for “muscle memory.”

## Files

```
[NEW] .agents/plans/cli-mode-overhaul/PLAN.md
[NEW] .agents/plans/cli-mode-overhaul/wip.spw
[NEW] .agents/plans/cli-mode-overhaul/cli-mode-overhaul.spw
[NEW] .agents/plans/cli-mode-overhaul/mode-audit.spw
[MOD] packages/spw-cli/src/commands.ts
[NEW] packages/spw-cli/src/modes.ts
[NEW] packages/spw-cli/src/modes.test.ts
[MOD] packages/spw-cli/src/envelope.ts
[MOD] packages/spw-cli/src/envelope.test.ts
[MOD] packages/spw-cli/src/help.ts
[MOD] packages/spw-cli/src/pulse.ts
[MOD] packages/spw-cli/src/mutate.ts
[MOD] packages/spw-cli/src/beat.ts
[MOD] packages/spw-cli/src/dev.ts
[MOD] packages/spw-cli/src/expand.ts
[MOD] packages/spw-cli/src/emit.ts
[MOD] packages/spw-cli/src/refresh.ts
[MOD] packages/spw-cli/src/mass.ts
[MOD] packages/spw-cli/src/format.ts
[MOD] packages/spw-cli/src/atlas.ts
[MOD] packages/spw-cli/src/authority.ts
[MOD] packages/spw-cli/src/geometry.ts
[MOD?] packages/spw-cli/src/flow-cache.ts
[MOD?] packages/spw-cli/src/plan.ts
[MOD?] packages/spw-cli/src/capabilities.ts
[MOD] packages/spw-seed/src/derived-surface.ts
[MOD] .spw/hot.spw
[MOD] .spw/conventions/cli.spw
[MOD] .spw/runtime/precipitates.spw
[MOD] .spw/gen/index.spw
[MOD] docs/runtime/md/pulse-mutate-beat.md
[MOD?] package.json
[MOD] schemas/spw-cli-envelope.v1.schema.json
```

### Craft guard

- `modes.ts` owns taxonomy + audit table; keep &lt;400 lines.  
- `commands.ts` stays a registry; mode metadata as data, not prose in every module.  
- Flow-cache module must not grow `server-index` or runtime interpreter.  
- Envelope remains transport-only; no domain scoring inside builders.

## Commits

1. `.[plans] — file cli-mode-overhaul with mode audit matrix`  
2. `vocab[cli] — mode taxonomy (measure preview stream precipitate generate patch write) + CommandSpec fields`  
3. `![cli] — complete mode×ceiling×artifact audit for all registry verbs + orphans`  
4. `#[cli] — envelope v1: mode, ceiling, optional precipitates/patch/cacheKey`  
5. `^seed[derived] — register precipitate/planned/patch (or audit-chosen) derived kinds; exclude from canon walks`  
6. `&[cli] — flow-cache for hot/patch intermediate Spw (beat- or hash-keyed under gen policy)`  
7. `&[cli] — migrate writers to mode-declared paths; help lists modes not only verbs`  
8. `#[cli] — spw capabilities --json from registry modes; absorb plan status/check`  
9. `vocab[cli] — free rename/merge pass driven by audit (no muscle-memory veto)`  
10. `![cli] — envelope coverage, flow-cache fixpoint, hot-loop smoke, agent compose demos`

Fuzz strategy:
- Explore (1–3): `lint:spw` on plan exhibits; unit tests for modes table completeness.  
- Stabilize (4–7): `test:cli`, `fuzz:types`.  
- Ship (8–10): `fuzz:ship` scoped to cli + seed derived-surface; `spw capabilities --json` smoke.

## Agentic Hygiene

- Rebase target: `main@0c7cdfb7` (update at branch cut)  
- Rebase cadence: before commit 2, before merge  
- Hygiene split: **required** relative to `hygiene-index-consolidation` commit 7 (plan status on spw) — either land hygiene first and rebase, or absorb plan-status into commit 8 of this plan and mark hygiene’s commit 7 superseded.  
- Do not mix server-index / geometry AST work into this branch.

## Dependencies

- **`hygiene-index-consolidation` Appendix C** — prior CLI audit; this plan supersedes its “keep aliases for muscle memory” stance and deepens mode/precipitate design.  
- **`spw-cli-overhaul`** — envelope foundation; this plan completes migration and may close overhaul remainder.  
- **`spw-beat-diff-precipitation`** — beat TTL / stateReload; flow-cache must **share** workspace cache vocabulary with `surface-identity`, not fork a second beat block. Land apposition before beat feature spine if both touch `server-index`; CLI flow-cache can stay out of server-index.  
- **`.spw/runtime/precipitates.spw`** — stage precipitate doctrine; CLI modes must not invent a conflicting “precipitate” meaning without cross-ref.  
- **`derived-surface.ts`** — only `expanded` today; kinds expand here.

## Failure Modes

- **Hard**: mode labels diverge from effect.l* ceilings → agents write when they think they measure. Mitigation: single table; tests that every `write` mode maps to l2+ and default is measure/preview.  
- **Hard**: flow-cache written as hand-editable canon. Mitigation: only under `@gen` / derived suffix; scanners skip.  
- **Soft**: rename churn without capabilities → agents break. Mitigation: capabilities + deprecation aliases for one release *optional*, not sacred.  
- **Soft**: precipitate Spw that does not re-parse. Mitigation: kinds that are not round-tripable stay JSON-in-envelope or marked `parse:false`.  
- **Non-negotiable**: no absolute user paths; no silent `--write`; plan streams append-only.

## Validation

- **Hypotheses**:
  - Every `COMMANDS` entry can be assigned a non-empty `modes[]` without “misc”.  
  - Hot loop can store a planned rewrite as intermediate Spw/JSON and reapply without re-parsing the whole corpus.  
  - Agents can select tools by `mode=preview` / `ceiling=effect.l0.measure` from capabilities alone.  
- **Negative controls**:
  - beat still never writes the tree.  
  - expand `--write` still emits derived only, never source.  
  - pulse default remains measure without `--write`.  
- **Demo sequence**:
  1. `spw capabilities --json | jq '.data.commands[] | {name,modes,ceiling}'`  
  2. `spw pulse f.spw --json` → precipitate/planned in envelope or flow-cache  
  3. `spw mutate --stdin` preview (l1) then path write (l2) with mode fields  
  4. `spw expand x.spw --write` → `x.expanded.spw` still derived  
  5. Flow-cache invalidate on content hash change; second beat sees miss  

## Spw Artifact

- `cli-mode-overhaul.spw` — doctrine: modes, precipitates, flow-cache, free-rename stance.  
- `mode-audit.spw` — living matrix of verb → modes × ceiling × artifact (updated in commit 3).

---

## Appendix M — Mode taxonomy (draft)

| Mode | Meaning | Typical ceiling | Artifact |
|------|---------|-----------------|----------|
| **measure** | Observe only; report | `effect.l0.measure` | envelope `data` |
| **preview** | Show would-be result; no durable tree write | `effect.l0` / `l1.memory` | planned source, diff |
| **stream** | Emit ordered events / saga steps / stdout frames | `effect.l0` | event stream |
| **precipitate** | Materialize a pipeline stage as Spw or structured blob | `effect.l1.memory` (mem) or gen | stage precipitate |
| **generate** | Write derived projection (`@gen`, `.<kind>.spw`) | `effect.l2.workspace` on derived only | derived surface |
| **patch** | Addressable structural edit plan (semantic edits) | `l0` plan / `l2` apply | patch set |
| **write** | Durable authoring-tree mutation | `effect.l2.workspace` | source files |
| **cadence** | Clock only | none | tick |

**Buffer owners:** `disk` | `stdin` | `host` | `none` | `flow_cache`.

---

## Appendix A — Explicit effect audit (initial, commit 3 will freeze)

Status at plan filing. Columns: default mode → elevated modes; ceiling; writes authoring tree?

| Verb / tool | Default mode | Elevated | Ceiling (default→max) | Authoring write? | Intermediate / derived |
|-------------|--------------|----------|------------------------|------------------|------------------------|
| init | generate | write | l2 | yes (scaffold) | templates |
| doctor | measure | — | l0 | no | report |
| roots | measure | — | l0 | no | report |
| mount | measure | write? (init) | l0→l2 | check vs init | resolve |
| tree | measure | — | l0 | no | — |
| invent | measure | — | l0 | no | envelope |
| map | measure | — | l0 | no | envelope |
| atlas | measure | generate (html?) | l0→l2 derived | report; HTML may generate | html snapshot |
| formula | measure | — | l0 | no | catalog |
| analyze | measure | — | l0 | no | — |
| geometry | measure | — | l0 | no | stdin buffer |
| mass | measure | **write** | l0→**l2** | **yes** digits | — |
| authority | measure | — | l0 | no | — |
| taste | measure | — | l0 | no | — |
| query | measure | stream (table) | l0 | no | rows |
| select | measure | — | l0 | no | hits |
| skim | measure | — | l0 | no | outline |
| ls | measure | stream | l0 | no | op/brace streams |
| format | preview | **write** | l0→l2 | **yes** | diff |
| expand | preview | **generate** | l0→l2 derived | **no source**; `.expanded.spw` | derived |
| refactor | preview/patch | **write** | l0→l2 | **yes** | plan |
| refresh | preview/patch | **write** | l0→l2 | **yes** cache marks | semantic plan |
| emit | generate/stream | write packs | l0→l2/l3? | packs | host IR, saga stream |
| pulse | measure/preview | **write** (1 file) | l0→l2 | **yes** atomic | plannedSource |
| mutate | preview (stdin/dry-run) | **write** | l1→l2 | **yes** multi | source body |
| beat | cadence | — | none | **no** | ticks |
| mem | measure | write mem surface | l1→l2? | mem paths | memory |
| dev | measure + light write | format hygiene | orchestrator | **yes** whitespace | watch |
| path-check (orphan) | measure | — | l0 | no | — |
| census (orphan) | measure | — | l0 | no | — |
| plan:* (bash) | measure | write stream | l0→l2 | plan files | stream/cache |
| syntax-validate | measure | — | l0 | no | — |

**Audit findings baked into plan:**

1. **Too many writers** without mode labels in the registry (mass, refresh, format, dev, expand-as-generate).  
2. **No shared “preview” flag** — mutate has `--dry-run`, pulse defaults measure, format has `--check`, refresh plans then `--write`. Unify under mode.  
3. **Precipitate vocabulary exists in runtime** but CLI never emits stage precipitates for hot reload.  
4. **Flow cache absent** — HMR re-parses; no beat-keyed planned body store.  
5. **Generate vs write conflated** — expand correctly uses derived; atlas HTML and emit packs need the same discipline.  
6. **Muscle memory is not a constraint** — free to rename invent/analyze/ls or merge sense verbs once modes carry meaning.

---

## Appendix F — Flow cache & precipitation (design sketch)

### Precipitate (CLI sense)

Aligned with `.spw/runtime/precipitates.spw`: an intermediate artifact of a pass, preferably renderable as Spw.

| Kind | Producer | Consumer | Durable? |
|------|----------|----------|----------|
| `planned` | pulse/mutate preview | host apply, flow-cache | optional gen/`*.planned.spw` or memory |
| `expanded` | expand | human/review | derived surface (exists) |
| `patch` | refresh/refactor/pulse | apply | envelope or `*.patch.spw` |
| `stage.*` | optional seed stepped run | debug | gen only |

### Flow cache

| Field | Role |
|-------|------|
| `key` | `contentHash` + profile/rule id + mode (not only path) |
| `beat` or `ttl` | optional cadence coupling to beat (share identity vocab with surface-identity) |
| `payload` | planned source, patch set, or precipitate Spw |
| `location` | memory default; disk only under `.spw/gen/flow/` or similar, scanner-excluded |
| `invalidate` | on contentHash miss, explicit clear, or beat TTL |

Hot loop target:

```text
beat → pulse measure (l0) → precipitate planned → flow-cache put
     → host/agent accept → mutate/patch write (l2) OR pulse --write
     → flow-cache invalidate
```

Patching mode: serve planned body from cache without full re-sense of the corpus.

---

## Relation to prior CLI notes

| Prior | Relation |
|-------|----------|
| hygiene-index-consolidation Appendix C | Supersedes “keep aliases for muscle memory”; reuses envelope/agent findings |
| spw-cli-overhaul | Completes envelope migration; may archive overhaul when modes land |
| pulse-mutate-beat.md | Remains ceiling law; modes wrap it rather than replace it |
