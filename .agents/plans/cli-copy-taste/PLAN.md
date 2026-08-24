# Plan: cli-copy-taste

Audit and refine the CLI's public language so recognizable commands, lyrical handles, output consequences, and Spw conventions reinforce rather than obscure one another.

## Goal

Give root help, command help, recommendation cards, and the canonical CLI convention one consistent editorial contract. A reader should be able to tell what a command produces, how much work a handle authorizes, whether output is bounded or exact, and whether a name is canonical or transitional without first learning the workbench's internal architecture.

Taste note: improve **clarity**, **recognizability**, **naming**, and **expressiveness**. Lyrical tokens such as `through` and `spread` may carry motion and memory, but their adjacent copy must name a concrete operational consequence.

## Scope

- **In scope**:
  - Audit root command summaries, group blurbs, inspect help, corpus-spread help, and inspection recommendation copy.
  - Establish a small voice law: outcome first; cost or disclosure second; compatibility last.
  - Distinguish public outcome language from internal IR/effect addresses without removing useful technical precision.
  - Define `through`, `events`, `sample`, and `spread` with one wording across CLI and Spw convention surfaces.
  - Make exact, bounded, streaming, and legacy machine output terms explicit and non-interchangeable.
  - Keep recommendations copyable and pair each command with the question it answers and the additional work or disclosure it incurs.
  - Add cheap checks for stable summary and alias-teaching invariants where they can be enforced without snapshotting prose.
  - Record implemented wording as implemented, proposed retirement as proposed, and metaphor mappings as interpretive unless code makes them observable.
- **Out of scope**:
  - Renaming commands, removing compatibility aliases, changing parser/runtime behavior, or adding CLI commands.
  - Parser bundles, package entry points, caching policy, association semantics, formatter migrations, and Spw `v0.4` release meaning.
  - Treating manufacturing, print, photoelectronics, or field metaphors as semantics without an implementation mapping and counterexample.
  - Rewriting all historical docs or standardizing unrelated CLI modules in one editorial episode.

## Files

```text
[NEW] .agents/plans/cli-copy-taste/PLAN.md
[NEW] .agents/plans/cli-copy-taste/wip.spw
[MOD] packages/spw-cli/src/commands.ts
[MOD] packages/spw-cli/src/commands.test.ts
[MOD?] packages/spw-cli/src/help.ts
[MOD] packages/spw-cli/src/inspect.ts
[MOD] packages/spw-cli/src/inspect-source.ts
[MOD] packages/spw-cli/src/inspect-spacing.ts
[MOD?] packages/spw-cli/src/inventory.ts
[MOD?] packages/spw-cli/src/map.ts
[MOD?] packages/spw-cli/src/analyze.ts
[MOD?] packages/spw-cli/src/formula.ts
[MOD?] packages/spw-cli/src/taste.ts
[MOD?] packages/spw-cli/src/lattice.ts
[MOD] packages/spw-cli/src/view-recommendations.test.ts
[MOD] .spw/conventions/cli.spw
[MOD] docs/runtime/spw/cli-command-surface.spw
[MOD?] docs/runtime/md/spacing-and-progressive-inspection.md
```

### Craft guard

- `packages/spw-cli/src/inspect.ts` is already above 600 lines and carries several retention planes. This pass changes help copy only; it adds no dispatch or rendering responsibility.
- `packages/spw-cli/src/commands.ts` is 500 lines and owns both registry and root-help projection. Keep the pass editorial and do not introduce another catalog or abstraction.
- Avoid sentence snapshots. Tests should enforce durable structural laws while allowing later copy editing.

## Commits

1. `.[plans] — bound CLI copy and taste audit`
2. `vocab[cli] — clarify outcomes, controls, and recommendations`
3. `.[conventions] — codify CLI voice and metaphor boundaries`

## Agentic Hygiene

- Rebase target: `main@c46558ffbb29a10abb1fee11dbec8aa522cbc8b3`
- Rebase cadence: main is an ancestor before commit 1; recheck before merge
- Hygiene split: continue in the clean `codex/gap-affinity-tooling` worktree because the audited controls landed on this branch; isolate this editorial slice in three commits and do not absorb unrelated main/worktree drift

## Dependencies

- `gap-affinity-tooling`: this pass audits the public copy introduced for `through`, `events`, `sample`, `spread`, exact output, and recommendation cards.

## Failure Modes

- **Hard**: taught copy contradicts accepted arguments or output behavior.
- **Soft**: metaphor remains memorable but requires internal vocabulary to decode; compatibility text overwhelms the primary path; a prose-only test makes later copy editing brittle.
- **Non-negotiable**: aliases remain route-only; bounded output discloses omissions; exact output stays recoverable; copy makes no claims about a person's traits, intent, or authority.

## Validation

- **Hypotheses**:
  - Root help can state each command's outcome before implementation vocabulary without losing technical precision.
  - One control lexicon can describe the same consequence in source inspection, corpus commands, docs, and conventions.
- **Negative controls**:
  - Routing, aliases, defaults, exit status, parser work, event retention, and emitted machine schemas remain unchanged.
  - `near|standard|far` continue to map to `minimal|standard|full` exactly as implemented.
- **Counterexamples**:
  - `--sample 8` is not a performance budget; it bounds visible examples only.
  - `--events none` is not proof that event construction was skipped; it controls retention under the current implementation.
  - `spread` is not semantic distance or social proximity; it selects the current corpus index extent/profile.
- **Demo sequence**:
  - `spw --help`
  - `spw inspect --help`
  - `spw census --help`
  - `spw inspect source docs/index.spw --through tokens --events none --sample 4 --spw`

## Spw Artifact

None beyond `wip.spw`; `.spw/conventions/cli.spw` is the durable public convention surface.
