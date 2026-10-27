# Plan: syntax-hardware-alignment

Hardware-aligned Spw syntax proposals staged as sample exhibits before any parser change: p1 to p7 below, p8 to p11 from the caches tree and p12 (digit-led words) in the artifact. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

Evolve the particle paradigm along its own hardware reading — anchor (`#>`) as address lines, lens (`#:`) as control lines, focus (`#!`) as strobe, the `~#` stance as latched state, `$%[...]` as readback register — so that cache/cut surfaces stop duplicating wires and gain the missing ones. Each proposal is tested against a single invariant: **one signal per wire**. The proposals live as commented samples in [syntax-hardware-alignment.spw](./syntax-hardware-alignment.spw) until a lexer/parser spike earns them catalog entries; nothing becomes law by fiat.

Taste note:
- expressiveness (shorter, hoverable, runnable constructs) and naming/layering honesty (no shadow registers, provenance travels with the word)

## Proposals (with samples)

1. **Derive routes from roots** — `#!route(...)` focus on the binding; tooling derives the dispatch table as a view.

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
[MOD?] packages/spw-seed/src/types/ast/nodes.ts — aim union + optional focus payload
[MOD?] scripts/analyzers/spw-cut-gate.ts — S0 probe verb lint, `$%[… = …]` latch diffing, `#~derived` staleness check

Craft guard:
- spw-cut-gate.ts is 337 lines; three new checks must not push it past 600 — extract a `checks/` module if it does.
- particles.ts stays single-concept: binding derivation only; evidential counting joins `particleMix`, not a new file.

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name] lines have landed.

Fuzz strategy:
- Explore loop: `fuzz:explore --target=seed` while the aim-union spike is open
- Stabilize loop: `fuzz:stabilize --target=seed` once `#~` tokens lex
- Ship gate: `fuzz:ship --target=seed`

## Agentic Hygiene

- Rebase target: `main` (base `main@da5189bb`)
- Rebase cadence: before init_plan_surfaces, before merge
- Hygiene split: none — but note the untracked `.spw/caches/` surface predates this plan; its `#:cache` / `^"dispatch"` vocabulary is the tension this plan resolves, not drift introduced here.

## Dependencies

- shares: [shape-syntax-ecology](../shape-syntax-ecology/PLAN.md) (experimental syntax stays catalog-referenceable), [syntax-profile-stack](../syntax-profile-stack/PLAN.md) (dialect/profile resolution), [directive-lattice](../directive-lattice/PLAN.md)

## Failure Modes

- Hard: `#~` collides with the `~#` stance in the lexer's longest-match table — spike must prove the token boundary before anything else builds on it.
- Soft: latch values (`= 412 @rev …`) drift silently if no tool owns the `--emit` pass; latch without a writer is worse than no latch.
- Non-negotiable: samples remain comment-fenced until the grammar accepts them; `npm run lint:spw` stays green throughout.

## Validation

- Hypotheses: the two particle-family extensions parse with only a token-table change; latch slot and probe rings need new payload grammar.
- Negative controls: existing `.spw` corpus parses byte-identically; `particleMix` counts on the untouched corpus are unchanged.
- Demo sequence: open the artifact → hover a `$%` port → run the S0 probes in a cut → watch latch diffs render.

## Spw Artifact

[syntax-hardware-alignment.spw](./syntax-hardware-alignment.spw) — the sample exhibits (p1 to p12) with per-proposal status, removed/added wires, play affordances, and gate hooks.

## Linguistic physics checkpoint — 2026-10-19

Treat physics as a way to predict a useful difference under a declared intervention. A candidate law needs a state space, operation, observable, invariant, counterexample, profile and implementation boundary. Hardware language can suggest the experiment; it does not determine parser behavior or grant execution authority.

Three promising questions are attachment sensitivity (does moving a mark across one boundary change its bearer?), structural sensitivity (what changes under a one-token or spacing perturbation?), and memory dependence (does the same source under the same declared state produce the same result after different histories?). The design review at `../naming-profile-convention-align/language-design-review.spw` gives controls and separates token, AST, ONF, value, register and trace observations.

Keep operational charge packets, delimiter polarity and material valence distinct. The `~#` count (`particleMix.aspect`) is not a lifetime measure: it currently counts a quoted annotation spelling, and a stable declaration can use `~#` syntax. A useful physics instrument should expose where the analogy fails as readily as where it predicts. Preserve current p1–p7 verdict work and the p4-only spike boundary; these new questions do not promote all proposed syntax cells.
