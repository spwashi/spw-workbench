# Math Modeling, Granular Processing & Novel Hardware Roadmap

**Status**: active plan (seed math probes v0.1 implemented)  
**Theory**: `docs/theory/spw/math-modeling.spw`  
**Kernel**: `packages/spw-seed/src/math/`  
**Related**: dimensional axes, pulse matrices, form geometry, hash-resonance, file-physics

## Goal

Raise Spw’s **mathematical modeling value**: authors should be able to state graphs, loops, and equations in Spw-aligned form and **test** them without leaving the workbench. In parallel, plan **finer-grained processing mechanics** and **honest mappings** to novel hardware—without confusing metaphor for implementation.

## Current baseline (implemented / measured)

| Layer | What exists | Test surface |
|-------|-------------|--------------|
| Graphs | Cycle detect, topo sort, Dijkstra, adjacency matrix | `math/math.test.ts` |
| Loops | Fixed point, bounded while, range fold, orbits, logistic map | same |
| Equations | Polynomials, bisection, dense linear solve, product constraints, cosine | same |
| Fields | Decay, diffuse, transfer, cascade, capacity, affinity, beat | `field.test.ts` |
| PE Hold | F2 product under salience α(c) | `emit/axes.ts` + emit tests |
| Production ensembles | Sites/carriers/beats for show & template lines | `prompts/production/ensemble.spw` |
| Mutation dynamics | Step×metric matrices | `spw pulse --matrix` |
| Structure | Brace projection, topography | pulse / topography-probe |

## Phase A — Model authoring + tests (near)

1. **Spw model packs** under `prompts/math/` for graph/loop/equation includes (dispatch + hooks).
2. **Exhibit corpus**: small `.spw` models with twin vitest cases (path-ref DAG, saga fixed-point, Hold linear constraints).
3. **CLI skim**: optional `spw` help pointer; keep kernel tests as source of truth (no heavy math CLI yet).
4. **Falsifier discipline**: every new formula names status + one falsifier (math-modeling.spw).

**Exit**: contributors can add a graph/loop/equation and a failing/passing test in one PR pattern.

## Phase B — Granular processing mechanics

Move from file/match granularity toward **Act-level observability**:

| Grain | Today | Next |
|-------|-------|------|
| File | format, pulse write | unchanged |
| Match | query/select | path-ref graphs from workspace |
| ONF Act | interpret batch | **queue + schedule** with step IDs |
| Micro-step | hidden in interpreter | emit `reduce → dispatch → write` events |
| Register | bank API | spatial address + locality metrics |

Proposed mechanics:

1. **Evented interpreter** — each `#` resonate / `&` merge / `%` measure yields a structured event (for tests + future hardware).
2. **Wavefront evaluation** — ready Acts fire when dependencies (register reads) resolve; natural dataflow.
3. **Phasor clocks** — layer rotation (syntactic/semantic/pragmatic) as scheduling domains, not only UI.
4. **Budget automata** — unify saga maxIter / pulse budgets / fixedPoint maxIter under one `SearchBudget` type.

**Exit**: a single Spw program’s evaluation can be replayed as an event log and compared across engines.

## Phase C — Novel hardware maps (research → spike)

Treat each hardware class as a **profile** with: mapping, measure, falsifier, non-goal.

### C1 Optical / wavefront
- **Map**: Acts as pulse fronts; `#` resonate as mode lock-in; `%` as intensity tap.
- **Measure**: latency of wavefront depth vs nest depth; energy proxy = event count.
- **Falsifier**: deeper brace nest does not increase critical path when claimed “fully parallel.”
- **Non-goal**: claiming optical compute without an event-log simulator.

### C2 Neuromorphic / event-driven
- **Map**: register writes as spikes; confluence `&` as coincidence detection; thrift as rate code.
- **Measure**: spike count vs Hold improvement; refractory = bonk budget.
- **Falsifier**: “sparse” programs that still emit dense full-bank updates every step.
- **Non-goal**: training DNNs inside the parser.

### C3 FPGA / dataflow
- **Map**: ONF Act graph → pipeline stages; topology freeze at “bake” (file-physics).
- **Measure**: II (initiation interval) vs topo depth; resource estimate from Act kinds.
- **Falsifier**: cyclic Act dependency claimed as static schedule without SCC break.
- **Non-goal**: shipping bitstreams in-repo before a pure software scheduler works.

### C4 Print / carve / bake (non-volatile culture hardware)
- **Map**: already in `.spw/conventions/file-physics.spw` — continuity pins, revision pins, messy-desk vs anatomy.
- **Measure**: continuity miss rate on print hosts; dual-read window length on carve.
- **Falsifier**: merch SKU without `profile_revision`.
- **Role**: human-scale “hardware” for cultural computation.

### C5 Speculative further out
- Analog crossbar for cosine/salience vectors  
- Reversible computing for pure measure (`%`) paths  
- Spatial light modulators for brace projection equality checks  

Each requires a seed-level **toy model** before naming silicon.

## Phase D — Integration with Spw culture

- **`#` light vs runtime resonate** — document strata remain distinct (hash-resonance).
- **Messy-desk models** — math experiments declare `#:desk #!experiment` until Hold/tests pass.
- **Anatomy** — promoted formulas live in `prompts/math/*` with machine parity.
- **No `//` lore** — math docs and models use `#` prose.

## Suggested implementation order

1. ~~Kernel probes + tests~~ (done: `packages/spw-seed/src/math/`)  
2. PE includes + theory surface (this change set)  
3. Extract path-ref DAG from a workspace root → `detectCycle` / topo (CLI or script)  
4. Event log spike in runtime interpreter (opt-in flag)  
5. Wavefront scheduler toy on ONF Act graph  
6. Hardware profile cards only after (4–5) produce measures  

## Falsifiers for the roadmap itself

- “Math modeling” that cannot fail a vitest.  
- Hardware section without a software intermediate that runs in CI.  
- Granularity claims that never appear in an event or matrix.

## Commands (today)

```bash
# Kernel math suite
npx vitest run packages/spw-seed/src/math/math.test.ts

# Mutation dynamics matrix (related)
npm run spw -- pulse --matrix --profile layout_canonical --check path/to/file.spw

# PE Hold (constraint product family)
npm run spw -- emit fractal path.spw --profile line_propagate --context canon --measure
```
