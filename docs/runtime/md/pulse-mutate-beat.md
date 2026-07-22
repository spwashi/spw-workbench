# Pulse · Mutate · Beat — hot module & REPL roles

These three commands share mutation machinery but **must not** collapse into one alias. Differentiation is about **effect ceiling**, **scope**, and **who owns the buffer** (disk vs REPL).

## Effect ceilings (canonical names)

User-facing names, CLI help, and kernel `EffectGrade` all use **`effect.l*`** slugs (no short `S*` codes).

| Ceiling | Meaning |
|---------|---------|
| **`effect.l0.measure`** | Plan, measure, report — no durable write |
| **`effect.l1.memory`** | In-memory apply of a planned rewrite |
| **`effect.l2.workspace`** | Durable write into the consumer tree |
| **`effect.l3.external`** | Outside workbench authority (refused by pulse) |

Order of escalation:

```text
effect.l0.measure → effect.l1.memory → effect.l2.workspace → effect.l3.external
```

## Command matrix

| Command | Default ceiling | Scope | Buffer owner | Hot / REPL role |
|---------|-----------------|-------|--------------|-----------------|
| **`pulse`** | **`effect.l0.measure`** | One consumer path (or stdin buffer) | Disk file *or* host-owned buffer | **Probe before commit**: topography delta, would-change, matrix; optional atomic single-file **`effect.l2.workspace`** via `--write` |
| **`mutate`** | **`effect.l1.memory` → `effect.l2.workspace`** | Many files / dirs, or stdin | Disk (multi) or host applies returned text | **Hot apply**: after accept; multi-file save-all; REPL returns body under **`effect.l1.memory`** only |
| **`beat`** | *(no tree effect)* | None | N/A | **Cadence**: debounce HMR, REPL tick, agent poll — never touches the tree |
| **`dev`** | orchestrator | `.spw` watch | Disk | On change: light format+parse (**measure-leaning**); no multi-file **`effect.l2.workspace`** |

## Mental model

```
        beat  ── clock only ──────────────────────────────► REPL / HMR loop
                 │
                 ▼
        pulse ── effect.l0.measure ── accept? ──► mutate
                 │                              (l1.memory → l2.workspace)
                 │
                 └── pulse --write → effect.l2.workspace
                     (one file, atomic, risk-gated)
```

- **Pulse** answers: *what would change, and is structure still healthy?* (`effect.l0.measure`)
- **Mutate** answers: *make the tree (or buffer) match the profile now* (`effect.l1.memory`, then `effect.l2.workspace` when writing paths)
- **Beat** answers: *when is the next tick?*

## Hot module (HMR / watcher)

Recommended pipeline:

1. **`beat`** or watcher interval debounces (e.g. 500ms craft unit).
2. On save: **`pulse --check --json <file>`** (or stdin of buffer) under **`effect.l0.measure`** — refuse broken health.
3. If plan is layout-safe / accepted:
   - **`mutate <file> --profile layout_canonical`** → **`effect.l1.memory`** compute + **`effect.l2.workspace`** multi/direct write for speed, **or**
   - **`pulse --write --accept-semantic-risk`** when you need atomic single-file **`effect.l2.workspace`** + authority checks.
4. Never use **mutate** on mounted infrastructure without explicit policy; prefer **pulse** plan-only (`effect.l0.measure`) there.

`spw dev` today: poll `.spw`, canonicalize hygiene, parse validate — a **measure-leaning** hot loop. It should stay light; heavy multi-file **`effect.l2.workspace`** belongs to explicit save-all / agent apply steps.

## REPL / editor host

Host owns the buffer (not yet a path, or path + dirty buffer):

| Step | Command | Ceiling |
|------|---------|---------|
| Plan buffer | `spw pulse --stdin --as buffer.spw --json --profile layout_canonical` | **`effect.l0.measure`** — no disk write; report + `plannedSource` |
| Preview apply | `spw mutate --stdin --json --profile …` | **`effect.l1.memory`** — returns rewritten `source` for host |
| Path dry-run | `spw mutate path.spw --dry-run --json` | **`effect.l1.memory`** only (no **`effect.l2.workspace`**) |
| Apply to disk | `spw mutate path.spw --profile …` | **`effect.l1.memory` → `effect.l2.workspace`** |
| Careful single write | `spw pulse path.spw --write --accept-semantic-risk` | plan **`l1.memory`**, commit **`l2.workspace`** (atomic) |
| Clock | `spw beat --interval 500 --json` | no tree effect |

Flags of interest:

- **`--stdin`** — body from stdin (pulse and mutate).
- **`--as <label>`** — logical name for reports (e.g. virtual path).
- **`--dry-run`** (mutate) — **`effect.l1.memory`** only; no **`effect.l2.workspace`**.
- **`--json`** — machine envelope for hosts (`plannedSource` / `source`, plus usefulness when from pulse).

## Safety contrast

| | pulse `--write` | mutate (paths) |
|--|-----------------|----------------|
| Ceiling | **`effect.l2.workspace`** (one file) | **`effect.l2.workspace`** (many files) |
| Files | **One** consumer file | Many |
| Atomic temp replace | Yes | No (direct write) |
| Default | **`effect.l0.measure`** dry-run | Writes (**`l2.workspace`**) unless `--dry-run` / `--stdin` |
| Semantic risk gate | `--accept-semantic-risk` | Implicit accept by invocation |
| Best for | CI check, careful single edit | Hot reload, batch layout, agent apply |

## Saga / field analogy

- **pulse** ≈ `%measure` under **`effect.l0.measure`** (+ optional guarded **`effect.l2.workspace`**)
- **mutate** ≈ apply under **`effect.l1.memory`**, commit under **`effect.l2.workspace`**
- **beat** ≈ discrete time base for `fieldBeat` / saga steps

## Related

- `docs/theory/spw/mutation-automata.spw`
- `.spw/hot.spw`
- `packages/spw-cli/src/{pulse,mutate,beat,dev}.ts`
- `packages/spw-seed/src/canonical/differential.ts` (`EffectGrade` = `effect.l*`)
