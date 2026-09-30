# Plan: syntax-hardware-alignment

Seven hardware-aligned Spw syntax proposals staged as sample exhibits before any parser change. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

Evolve the particle paradigm along its own hardware reading — deixis as address lines, case as control lines, mood as strobe, aspect as latched state, `$%[...]` as readback register — so that cache/cut surfaces stop duplicating wires and gain the missing ones. Each proposal is tested against a single invariant: **one signal per wire**. The proposals live as commented samples in [syntax-hardware-alignment.spw](./syntax-hardware-alignment.spw) until a lexer/parser spike earns them catalog entries; nothing becomes law by fiat.

Taste note:
- expressiveness (shorter, hoverable, runnable constructs) and naming/layering honesty (no shadow registers, provenance travels with the word)

## Proposals (with samples)

1. **Derive routes from roots** — `#!route(...)` mood on the binding; tooling derives the dispatch table as a view.

   ```spw
   ^"roots"{
     @jetbrains: ~"./jetbrains/index.spw" #!route(overview)
     @vscode:    ~"./vscode/index.spw"    #!route
   }
   ```

2. **Metric latch slot** — `$%[handle = value @rev]` fill-in-place readback with provenance.

   ```spw
   $%[cache.anchor_count]                      # port declared (tool: "unmeasured")
   $%[cache.anchor_count = 412 @rev da5189bb]  # latched readback + provenance
   ```

3. **Probe privilege rings** — S0–S3 effect grades surface grammatically; S0 probes become auto-runnable.

   ```spw
   !probe[S0]{ "Count #> anchors across the cut; verify cross-refs resolve." }
   !probe[S2]{ "Rewrite stale ~#as_of stamps." }   # requires apply authority
   ```

4. **Evidential particle** — `#~` carries provenance with the word, like a parity bit on the data line.

   ```spw
   #>spw_cache_jetbrains_index
   #:layer #!pragmatics
   #~derived(plugin.xml @rev 1f17c86e)     # evidential: how do I know this?
   ```

5. **Temporal strobe for caches** — standardized refresh line; staleness renders as literal fade.

   ```spw
   #:era #!2026-09
   ~#as_of: "2026-09-30"
   ```

6. **Scoped anchors** — base + offset addressing; the segment base is the file's head anchor.

   ```spw
   #>spw_cache_jetbrains_index      # segment base
   #>.wonder.1                      # resolves as spw_cache_jetbrains_index.wonder.1
   ```

7. **Fuse the lens gesture** — one control word per interpretive gesture.

   ```spw
   ~#lens(universal_lattice, depth: philosophical)
   ```

## Scope

- In scope: sample exhibits, lexer/parser spike for the two particle-family extensions (`#!route` payload, `#~` evidential aim), cut-gate lints (S0 verb lint, latch diffing, `#~derived` staleness), a wonder probe over the proposals.
- Out of scope: runtime lowering of any proposal; rewriting existing cache surfaces to the new forms; changing the cut gate's existing banned-pattern table.

## Files

[NEW] .agents/plans/syntax-hardware-alignment/PLAN.md — this plan
[NEW] .agents/plans/syntax-hardware-alignment/wip.spw — coordination memory
[NEW] .agents/plans/syntax-hardware-alignment/syntax-hardware-alignment.spw — sample exhibits
[MOD?] packages/spw-seed/src/canonical/particles.ts — only if the spike lands: `ParticleNode.aim` union gains `~` (evidential); `particleMix` gains an evidential count
[MOD?] packages/spw-seed/src/types/ast/nodes.ts — aim union + optional mood payload
[MOD?] scripts/analyzers/spw-cut-gate.ts — S0 probe verb lint, `$%[… = …]` latch diffing, `#~derived` staleness check
[NEW?] src/lang/seeds/probes/ — wonder probe over the seven proposals

Craft guard:
- spw-cut-gate.ts is 337 lines; three new checks must not push it past 600 — extract a `checks/` module if it does.
- particles.ts stays single-concept: binding derivation only; evidential counting joins `particleMix`, not a new file.

## Commits

1. .[plans] — initialize syntax-hardware-alignment plan surfaces
2. ^seed[particles] — lexer/parser spike: #!route(...) payload and #~ evidential aim
3. ![cut-gate] — S0 probe verb lint, $%[… = …] latch diffing, #~derived staleness check
4. ^seed[probes] — wonder probe over the seven proposals in src/lang/seeds/probes/

Fuzz strategy:
- Explore loop: `fuzz:explore --target=seed` while the aim-union spike is open
- Stabilize loop: `fuzz:stabilize --target=seed` once `#~` tokens lex
- Ship gate: `fuzz:ship --target=seed`

## Agentic Hygiene

- Rebase target: `main` (base `main@da5189bb`)
- Rebase cadence: before commit 1, before merge
- Hygiene split: none — but note the untracked `.spw/caches/` surface predates this plan; its `#:cache` / `^"dispatch"` vocabulary is the tension this plan resolves, not drift introduced here.

## Dependencies

- shares: [shape-syntax-ecology](../shape-syntax-ecology/PLAN.md) (experimental syntax stays catalog-referenceable), [syntax-profile-stack](../syntax-profile-stack/PLAN.md) (dialect/profile resolution), [directive-lattice](../directive-lattice/PLAN.md)

## Failure Modes

- Hard: `#~` collides with aspect `~#` in the lexer's longest-match table — spike must prove the token boundary before anything else builds on it.
- Soft: latch values (`= 412 @rev …`) drift silently if no tool owns the `--emit` pass; latch without a writer is worse than no latch.
- Non-negotiable: samples remain comment-fenced until the grammar accepts them; `npm run lint:spw` stays green throughout.

## Validation

- Hypotheses: the two particle-family extensions parse with only a token-table change; latch slot and probe rings need new payload grammar.
- Negative controls: existing `.spw` corpus parses byte-identically; `particleMix` counts on the untouched corpus are unchanged.
- Demo sequence: open the artifact → hover a `$%` port → run the S0 probes in a cut → watch latch diffs render.

## Spw Artifact

[syntax-hardware-alignment.spw](./syntax-hardware-alignment.spw) — the seven sample exhibits with per-proposal status, removed/added wires, play affordances, and gate hooks.
