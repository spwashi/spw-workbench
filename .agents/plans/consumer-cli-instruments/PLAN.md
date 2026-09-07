# Plan: consumer-cli-instruments

Lift mounted-consumer gaps into portable workbench language and CLI instruments.

## Goal

A mounted consumer should not have to shell `find`, re-split citations, or count AST nodes by hand. Land the grammar and commands that report named: `~>` as a project connector, lattice cells for both `~#name(…)` and `~#name:`, `spw fingerprint`, `spw resolve`, `spw lint`, default infrastructure pruning with `--include-infrastructure`, and compact `--stats` on query.

Taste note: improve **truthfulness**, **composability**, and **portability**. Empty lattice fields and silent under-parses are worse than errors.

## Scope

- **In scope**: lex `~>` as one CONNECTOR; lattice colon-form cells as a distinct species; fingerprint / resolve / lint CLI; walker defaults (`build`, `_workbench`) plus `--include-infrastructure`; query `--stats`.
- **Out of scope**: `.spwignore`; content-addressed parse cache; `--spw` round-trip of every collate product; onboarding-arc; summarize; absorbing consumer identity or site scripts.

## Files

```
[NEW] .agents/plans/consumer-cli-instruments/PLAN.md
[NEW] .agents/plans/consumer-cli-instruments/wip.spw
[MOD] packages/spw-seed/src/types/token.ts
[MOD] packages/spw-seed/src/lexer/profiles.ts
[MOD] packages/spw-seed/src/lexer/matchers/operators.ts
[MOD] packages/spw-seed/src/lexer/ascii-connectors.test.ts
[MOD] packages/spw-seed/src/grammar/separators.test.ts
[MOD] packages/spw-seed/src/grammar/expressions.ts
[MOD] packages/spw-seed/src/lite/scan.ts
[MOD] packages/spw-seed/src/canonical/apposition-scan.ts
[MOD] packages/spw-seed/src/canonical/apposition-scan.test.ts
[NEW] packages/spw-seed/src/canonical/fingerprint.ts
[NEW] packages/spw-seed/src/canonical/fingerprint.test.ts
[NEW] packages/spw-seed/src/canonical/resolve-citation.ts
[NEW] packages/spw-seed/src/canonical/resolve-citation.test.ts
[MOD] packages/spw-seed/src/canonical/index.ts
[MOD] packages/spw-seed/src/index.ts
[NEW] packages/spw-cli/src/fingerprint.ts
[NEW] packages/spw-cli/src/fingerprint.test.ts
[NEW] packages/spw-cli/src/resolve.ts
[NEW] packages/spw-cli/src/resolve.test.ts
[NEW] packages/spw-cli/src/lint.ts
[NEW] packages/spw-cli/src/lint.test.ts
[MOD] packages/spw-cli/src/commands.ts
[MOD] packages/spw-cli/src/lattice.ts
[MOD] packages/spw-cli/src/fs-walk.ts
[MOD] packages/spw-cli/src/fs-walk.test.ts
[MOD] packages/spw-cli/src/query.ts
[MOD] packages/spw-cli/src/args.ts
[MOD] packages/spw-cli/src/types.ts
[MOD] package.json
```

### Craft guard

- New CLI modules stay one concern each and under 400 lines.
- Seed citation classification stays filesystem-free; CLI owns existence checks.
- No consumer identifiers, routes, or machine-local paths in workbench artifacts.

## Commits

1. `.[plans] =scope[consumer-cli-instruments] — record mounted-consumer CLI and grammar gaps`
2. `^seed[project-join] — lex ~> as one project connector`
3. `&[lattice] — count ~#name: cells as a distinct species`
4. `^seed[fingerprint] — name AST node-count signatures`
5. `#[cli] — add fingerprint, resolve, and lint commands`
6. `&[cli] — prune infrastructure by default and emit query --stats`

Fuzz strategy:
- Explore: targeted seed lexer/parse tests for `~>` and lattice colon cells.
- Stabilize: `npm run test:seed` on changed files, `npm run test:cli` for new commands.
- Ship: `npx tsc -p tsconfig.typecheck.json --noEmit` and staged commit review.

## Agentic Hygiene

- Rebase target: `main@55c16e3b`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none; working tree was clean at plan creation

## Dependencies

- `mounted-consumer-tooling` — portable audit boundary and walker exclusions
- `query-profile` — query stage receipts; `--stats` is the compact sibling

## Failure Modes

- **Hard**: `~>` still tokenizes as `~` plus capsule-close, so bodies degrade to prose.
- **Soft**: lattice reports colon cells mixed with paren cells so the two forms cannot be told apart.
- **Non-negotiable**: no consumer repository names, private corpus excerpts, or machine-local paths enter workbench canon.

## Validation

- **Hypothesis**: `{sow ~> tend ~> harvest}` parses structured with CONNECTOR `~>`; lattice on a mixed `~#name(…)` / `~#name:` surface reports both species; `spw fingerprint --expr` emits a stable Type=count signature; `spw resolve` classifies `./x.spw#a` without regex false positives on prose tildes.
- **Negative control**: `;` / `||` schedule separators and `->` chains keep their current ranks.
- **Demo sequence**: lex `a ~> b` → parse the garden body → lattice a two-form fixture → fingerprint the noun form → resolve a pathRef → lint `#:operation contract`.

## Spw Artifact

None beyond `wip.spw`; the branch memory is the retained operational surface.
