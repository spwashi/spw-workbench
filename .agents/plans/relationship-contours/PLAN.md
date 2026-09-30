# Plan: relationship-contours

Shape the language's tooling so each kind of reader — stranger, author, agent, tool, host, consumer, designer, steward, wanderer — finds a first move. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

The plan schema pass of 2026-09-28 gave every plan a card, derived a flat index with "doors" for different readers, and made `spw resolve` agree with the LSP. This plan holds what that pass learned about the wider developer experience: which relationships to Spw are served, which surfaces know them, what friction is measured, and which language questions tooling keeps surfacing. Taste: legibility and truthfulness across surfaces — the same question gets the same answer at comparable depth wherever it is asked.

## Scope

- **In scope**: the relationship map and evidence in `relationship-contours.spw`; the landed plan-schema pieces (cards, index, doors, generator, gate readout, resolve parity) as this plan's first slice; ranked predictable improvements; unpredictable instruments; language contours as questions for the designer.
- **Out of scope**: parser performance work itself (owned by whichever seed plan takes the budget), host plugin changes, promoting the card pattern into `.spw/patterns/` before one non-plan trial.

## Files

Landed in the first slice:

- [NEW] scripts/plans/plan-index.ts — derive `.agents/plans/index.spw` from cards; `--check`, `--touch`, `--wander`, `--json`
- [NEW] .agents/plans/index.spw — legend, doors (authored); phase frames, touches, kin, drift (derived)
- [MOD] .agents/plans/_schema/{wip.spw, wip-template.spw, plan.md, plan-template.md} — CARD, LANE GLYPHS, PHASES, EDGES, INDEX
- [MOD] .agents/plans/*/wip.spw — a card (and evidenced edges) on every live plan
- [MOD] .agents/scripts/agent-lib.sh — `plan:status` shows card glyph/phase/next; `plan:check` flags `missing_card`; `plan:init` substitutes `<slug_id>`
- [MOD] scripts/commit-review/run-review.sh — card readout, index-staleness nudge, accurate stream/open counts
- [MOD] packages/spw-cli/src/resolve.ts (+ test) — file-relative then consumer-root resolution with `basis`
- [MOD] packages/spw-seed/src/canonical/derived-marks.ts, [NEW] derived-marks.test.ts — `latestTimestamp` reads date-only and quoted entry heads, ignores dates inside messages
- [MOD] scripts/analyzers/spw-marker-audit.ts — scan `packages/`
- [MOD] .spw/index.spw, .spw/agents.spw, docs/plans/index.spw — routes to the plan index
- [MOD] CLAUDE.md, .agents/README.md, planning and maintenance skills, /maintain-plans

Next slices are proposals in `relationship-contours.spw` `^["predictable"]`.

### Craft guard

plan-index.ts is ~520 lines with 4 imports (under the 600-line guard); split card reading from index rendering before adding another mode. agent-lib.sh is already ~1100 lines — card helpers were added as two small functions rather than a new mode.

## Commits

1. &[plans] — schema v2: lane-glyph cards, phases, edges, and an index generator
2. &[cli] — resolve refs against the citing file, then the consumer root
3. &[seed] — read every stream entry head in latestTimestamp
4. ![audit] — scan packages in the marker audit; describe boonhonk truthfully
5. .[plans] — card every live plan; derive the index; route readers to it

## Agentic Hygiene

- Rebase target: main@3eaab637767222ffe248449da7262a251c4c608b
- Rebase cadence: before commit 1, before merge
- Hygiene split: none — the pass touched plan surfaces, agent tooling, and one CLI command; the resolve change is separable as its own commit.

## Dependencies

None. Shares vocabulary with plan-ecology-clustering (lanes) and citation-navigation (relation model, reader journeys).

## Failure Modes

- Hard: a card that fails to parse hides a plan from the index — `--check` exits 1 and names it.
- Soft: gists and phases drift like caches did; the commit-gate nudge and `drift.cooling` make the drift visible rather than preventing it.
- Non-negotiable: the index is never hand-edited below the authored frames; the card stays the source.

## Validation

- `npm run spw:plan:index -- --check` passes with every live plan carded.
- `npm run test:cli` covers resolve bases; `npm run spw:agent:test` covers card-aware status/check.
- Negative control: `spw resolve` still reports the 32 genuinely dead refs in plans.

## Spw Artifact

`relationship-contours.spw` — relationships, surfaces that know them, measured evidence, predictable and unpredictable improvements, language contours.
