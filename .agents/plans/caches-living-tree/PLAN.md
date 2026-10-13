# Plan: caches-living-tree

Turn the dated caches cut into an undated living tree that agents can extend from one door, give dated material a journal, and revise cache-surface syntax so surfaces carry less prose and index by anchor. (Card, phase, and next move: [wip.spw](./wip.spw) · measures and layout: [caches-living-tree.spw](./caches-living-tree.spw) · index: [../index.spw](../index.spw))

## Goal

`.spw/caches/2026-09-30/` holds 439 corrected, sourced surfaces. Its date names when it opened, not what it holds, and an agent that lands there finds no root index, a 232-line contract, a gate that fails, and a caches index that routes only to the raw shelf.

When this plan is done:
- The cut lives at `.spw/caches/cut/` as a living tree with a root index, relevance tiers, and a short extension door.
- What was true on a given day (resume notes, snapshot manifests, receipt ledgers) lives in a canon-root journal at `.spw/journal/`, one `YYYY-MM-DD-<slug>.spw` file per entry.
- Each snapshot of the tree is a git tag paired with a journal manifest.
- Surfaces stop spending characters on what tools can derive. Today path prefixes take about 417k characters, and receipts and card fields take about 17% of all lines.

Taste note: indexability and thrift. One signal per wire, address by anchor, and derive what can be derived. Claim statements are the knowledge and stay prose.

## Owner decisions (2026-10-13)

- **Syntax:** samples first, then parser changes. New forms are staged as proposals p8 to p11 under `syntax-hardware-alignment`, and no lexer or resolver change lands before the owner picks among the samples.
- **Extension model:** a living tree plus git-tag snapshots, rather than extending the dated directory in place or opening a new dated cut per pass.
- **Dated files:** a journal directory for dated `.spw` files, at `.spw/journal/`.
- **Carried from `caches-cut-2026-09-30`:** the raw shelf stays where it is and stays committed, the quarantine stands, and host-feature caches are residue.

## Scope

- **In scope:**
  - Open the journal and move the caches resume note into it.
  - Tag the shelved cut and write its manifest as a journal entry.
  - Move the cut to `.spw/caches/cut/` and repoint the gate, the caches index, docs, and plan cards and roots.
  - Write a cut root index with relevance tiers and an extension door.
  - Fix the three forward panel refs so the gate passes.
  - Write syntax samples p8 to p11 under `syntax-hardware-alignment`.
  - Pilot the forms that parse today on `making/authorship/`.
  - Make concepts a closed vocabulary.
  - Move receipts to journal ledgers.
  - Trim card fields.
  - If the owner picks a form, add anchor-addressed refs to the resolver, LSP, and gate, then migrate refs.
- **Out of scope:**
  - The raw shelf's content and location.
  - The cut's remaining weave, apparatus, and harm-sweep stages, which stay in `caches-cut-2026-09-30` and run on the new path.
  - Rewriting claim statements.
  - The p1 to p7 proposals.
  - spwashi.com, which is not written from here.
  - Plan stream entries that name the old path. They are history and stay as written.

## Files

```
[NEW] .agents/plans/caches-living-tree/{PLAN.md,wip.spw,caches-living-tree.spw}
[MOD] .agents/plans/index.spw                         — regenerated with the card
[NEW] .spw/journal/index.spw                          — journal contract: entry naming, kinds, routing; lists entries by date
[NEW] .spw/journal/2026-09-30-caches-resume.spw       — moved from .spw/caches/resume/2026-09-30-direction.spw
[DEL] .spw/caches/resume/                             — emptied by the move
[NEW] .spw/journal/2026-10-13-caches-cut-snapshot.spw — tag, commit, counts, gate status
[NEW] .spw/journal/<date>-caches-cut-receipts.spw     — receipt ledgers, one per pass date, generated
[MOD] .spw/index.spw                                  — @journal root
[MOD] .spw/caches/index.spw                           — route @cut and @journal; label the raw shelf
[MOD] .spw/caches/2026-09-30/** → .spw/caches/cut/**  — git mv of 439 files; 13 files name their own dated path
[NEW] .spw/caches/cut/index.spw                       — root: classes, apparatus, relevance tiers
[NEW] .spw/caches/cut/extend.spw                      — extension door
[MOD] .spw/caches/cut/contract.spw                    — living scope, journal receipts, card, concept rules
[MOD] .spw/caches/cut/vocabulary.spw                  — closed concept set
[MOD] .spw/caches/cut/panels/{index,gap-table}.spw, record/information/taxonomy-cautions.spw — planned panels as strings, not refs
[MOD] .spw/caches/cut/making/authorship/*.spw         — pilot
[MOD] .spw/caches/cut/**                              — mechanical passes: concepts, receipts, card
[MOD] scripts/analyzers/spw-cut-gate.ts               — default path, journal receipts, concept vocabulary
[MOD] scripts/analyzers/spw-cut-voice.ts              — doc refs
[NEW] scripts/analyzers/spw-cut-migrate.ts            — receipts-to-journal and card-trim passes, if spw mutate cannot express them
[MOD] docs/design/product/time-paths.spw              — resume note path
[MOD] .agents/plans/{caches-cut-2026-09-30,syntax-hardware-alignment,apposition-cache-granules,citation-navigation,...}/ — cards and roots only
[MOD] .agents/plans/syntax-hardware-alignment/syntax-hardware-alignment.spw — proposals p8 to p11
[NEW] .agents/plans/syntax-hardware-alignment/samples/cut-surface.spw — before and after of one surface
[MOD?] packages/spw-cli/src/resolve.ts, packages/spw-lsp/src/handlers/navigation.ts, packages/spw-lsp/src/server-index.ts, packages/spw-seed/src/lexer/* — only after ?[anchor_ref_form]
```

### Craft guard

- `spw-cut-gate.ts` is 392 lines and gains journal and concept checks. Split the voice-style check families out before it passes 600.
- Receipt ledgers can run long: 2717 receipt lines over 439 files. Group rows by event, date, agent, care, and outcome with file lists, and split by pass date so each entry stays under 600 lines.
- Six source registries already pass 500 lines. They are out of scope, but the extension door names them as split candidates.

## Commits

1. `.[plans]` — caches-living-tree plans the living cut, the journal, and leaner cache syntax
2. `#[journal]` — `.spw/journal` holds dated surfaces, routed from the canon index; the caches resume note is its first entry
3. `.[journal]` — the shelved cut is tagged `caches-cut/2026.09.30` and its manifest is a journal entry
4. `&[caches]` — the cut lives at `.spw/caches/cut`, undated; the gate, the caches index, docs, and plan roots follow
5. `.[caches]` — the cut gets a root index with relevance tiers and an extension door, and the gate passes
6. `^seed[caches]` — samples for anchor-addressed refs, journal receipts, a lean card, and closed concepts, as proposals p8 to p11
7. `.[caches]` — `making/authorship` rewritten with the sampled forms that parse today
8. `#[caches]` — concepts become a closed vocabulary and the gate enforces it
9. `&[caches]` — per-surface receipts move to journal ledgers; each surface keeps as_of and one line that names its ledger
10. `&[caches]` — cards drop fields the title comment and the sources already carry
11. `^seed[resolver]` — only if the owner picks a form: anchor-addressed refs resolve in the CLI, the LSP, and the gate
12. `&[caches]` — only after commit 11: refs into the cut drop their path prefix

The owner reviews the samples between commits 6 and 7, and again before commit 11.

Fuzz strategy:
- **Explore:** after each commit, run the cut gate with `--json`, `spw resolve --from .spw/caches/cut --warn`, and `spw census .spw/caches/cut`, and log the measures to the stream.
- **Stabilize:** `npm run lint:spw`, `npm run spw:plan:check`, and `npm run fuzz:stabilize`.
- **Ship:** `npm run fuzz:ship`, plus `test:cli`, `test:lsp`, and `test:seed` when commit 11 lands.

## Agentic Hygiene

- Rebase target: `main@813444dc`.
- Rebase cadence: before commit 2 and before merge.
- Hygiene split: none. The tree was clean at branch time.
- Plan streams across the ecology name `.spw/caches/2026-09-30`. They are history and stay as written; only cards, roots, and touches follow the move.
- Mechanical passes run as scripts with a dry-run diff first, never as hand edits across the tree.
- Commits and the snapshot tag need the owner's authorization.

## Dependencies

None to merge first.
- **Shares:**
  - `caches-cut-2026-09-30`: its remaining stages run on the new path.
  - `citation-navigation`: anchor resolution in the LSP.
  - `apposition-cache-granules`: cache surfaces.
- **Feeds:** `syntax-hardware-alignment`, which owns the proposals and the parser decision.

## Failure Modes

- **Hard:**
  - Refs from outside the cut still point at the dated path.
  - The tag names a commit whose cut differs from the shelved one.
  - A mechanical pass rewrites a claim statement or renames an anchor.
- **Soft:**
  - LSP and graph indexes keep old paths until reindexed.
  - Local worktrees keep the old layout.
- **Non-negotiable:**
  - No anchor is renamed or reused.
  - Claim statements stay byte-identical through mechanical passes.
  - The raw shelf and its quarantine are untouched.
  - Every commit leaves the gate and `spw resolve` no worse than before.

## Validation

- **Hypotheses:**
  - H1: the move keeps all 8180 anchors and every ref target. The only unresolved refs that change are the three panel refs.
  - H2: every receipt tuple is recoverable from the journal ledgers.
  - H3: receipts plus card trim cut at least 15% of lines.
  - H4: an agent given only the extension door adds a passing surface.
  - H5: anchor-addressed refs remove about 8% of characters.
- **Negative controls:**
  - The raw shelf diff is empty.
  - The quarantine list is unchanged.
  - The sorted claim statements are identical before and after each pass.
- **Demo sequence:**
  1. Open `.spw/caches/cut/index.spw` and follow the extension door.
  2. Add one surface in a worktree and run the gate.
  3. Check out `caches-cut/2026.09.30` and find the shelved cut as it was.

## Spw Artifact

`.agents/plans/caches-living-tree/caches-living-tree.spw` records:
- the baseline measures
- the layout: living tree, journal, and tag
- the journal entry kinds
- what a lean surface keeps and what it derives

It is the reference the extension door and the contract revisions cite.
