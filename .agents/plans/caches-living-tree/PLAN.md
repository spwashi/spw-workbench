# Plan: caches-living-tree

Restructure `.spw/caches` into two layers: a living tree that agents edit to keep true, and an append-only journal of what was seen or made on a day. Both are entered from one root and one extension door, and surface syntax is revised so surfaces carry less prose and address by anchor. (Card, phase, and next move: [wip.spw](./wip.spw) · measures and layout: [caches-living-tree.spw](./caches-living-tree.spw) · index: [../index.spw](../index.spw))

## Goal

`.spw/caches/2026-09-30/` holds 439 corrected, sourced surfaces. Its date names when it opened, not what it holds. Beside it, 13 raw topic folders fill the caches root. An agent that lands here finds no root index, a 232-line contract, a gate that fails, and a caches index that routes only to the raw shelf.

When this plan is done:

```
.spw/caches/
  index.spw        one root: the tree, the journal, the door
  extend.spw       how to add to each layer
  tree/            living synthesis: a later agent edits it to keep it true
  journal/         dated and append-only: never edited after its day
    2026-09-30-gemini-shelf/    the raw generation, moved whole
    2026-09-30-resume.spw
    2026-10-01-season-2026-q4/  the season instance: calendar and trail
    <date>-cut-receipts.spw     receipt ledgers
    2026-10-13-cut-snapshot.spw manifest for the tag caches-cut/2026.09.30
```

- **What each layer holds:** the tree is a view over the journal and the sources. Each snapshot of the tree is a git tag paired with a journal manifest.
- **How refs address anchors:** `@tree#src_x` and `@journal#entry_anchor`, with both roots declared once in `.spw/workspace.spw`.
- **Where the size goes:** surfaces stop spending characters on what tools can derive. Today path prefixes take about 417k characters, and receipts and card fields take about 17% of the cut's lines.

Taste note: indexability and thrift. One signal per wire, address by anchor, and derive what can be derived. Claim statements are the knowledge and stay prose.

## Owner decisions (2026-10-13)

- **Syntax:** samples first, then parser changes. New forms are staged as proposals p8 to p11 under `syntax-hardware-alignment`.
- **Ref form:** a root figure with a fragment, starting from `@cut#src_x`. Because the root is named for the layer, refs read `@tree#…` and `@journal#…`.
- **Layout:**
  - `index.spw`, `extend.spw`, `tree/` and `journal/` inside `.spw/caches`.
  - The living layer is named `tree`.
  - The canon-root journal from the first draft is dropped.
- **Raw generation:** it becomes the journal entry `2026-09-30-gemini-shelf/`, moved whole. This revises the earlier "shelf stays in its topic folders" decision. Nothing is deleted, the disclosure and the quarantine move with it, and the shelf stays committed.
- **Season:** the 2026 Q4 calendar and trail become a journal entry, and the recurring season forms stay in the tree.
- **Snapshot tag:** `caches-cut/2026.09.30` on `main@813444dc`. Later snapshots are `caches/YYYY.MM.DD`.
- **Carried from `caches-cut-2026-09-30`:** the quarantine stands, and host-feature caches are residue.

## Scope

- **In scope:**
  - The tag and its manifest.
  - Opening the journal and declaring the workspace roots.
  - Moving the shelf into the journal.
  - Moving the cut to `tree/`.
  - Moving the season instance into the journal.
  - The root index and extension door, plus the three forward panel refs so the gate passes.
  - Syntax samples p8 to p11, and the `making/authorship/` pilot.
  - Closed concepts, receipts moved to journal ledgers, and the card trim.
  - Anchor-addressed refs in the resolver, LSP, and gate after the samples review, then the ref migration.
- **Out of scope:**
  - The raw generation's content.
  - The cut's weave, apparatus, and harm-sweep stages, which stay in `caches-cut-2026-09-30` and run on the new path.
  - Rewriting claim statements.
  - The p1 to p7 proposals.
  - spwashi.com.
  - Plan stream entries that name old paths. They are history.
  - Renaming `spw-cut-gate`. That waits for a vocab commit.
  - Moving `tree/provenance` into the journal (`?[provenance_home]`).

## Files

```
[MOD] .agents/plans/caches-living-tree/{PLAN.md,wip.spw,caches-living-tree.spw}
[MOD] .agents/plans/index.spw
[MOD] .spw/workspace.spw                              — @caches, @tree, @journal roots
[NEW] .spw/caches/journal/index.spw                   — entry naming, kinds, append-only rule; entries by date
[NEW] .spw/caches/journal/2026-09-30-resume.spw       — moved from .spw/caches/resume/2026-09-30-direction.spw
[NEW] .spw/caches/journal/2026-10-13-cut-snapshot.spw — tag, commit, counts, gate result
[NEW] .spw/caches/journal/2026-09-30-gemini-shelf/**  — 13 topic folders (207 files) and the old caches index, moved whole
[NEW] .spw/caches/journal/2026-10-01-season-2026-q4/{calendar,trail}.spw — moved from the cut
[NEW] .spw/caches/journal/<date>-cut-receipts.spw     — receipt ledgers, one per pass date, generated
[MOD] .spw/caches/index.spw                           — rewritten as the two-layer root
[NEW] .spw/caches/extend.spw                          — extension door
[MOD] .spw/caches/2026-09-30/** → .spw/caches/tree/** — git mv of 439 files; 13 name their own dated path
[MOD] .spw/caches/tree/contract.spw                   — living scope, journal receipts, card, concept rules
[MOD] .spw/caches/tree/vocabulary.spw                 — closed concept set
[MOD] .spw/caches/tree/season/index.spw and refs to the season instance
[MOD] .spw/caches/tree/panels/{index,gap-table}.spw, record/information/taxonomy-cautions.spw — planned panels as strings
[MOD] .spw/caches/tree/**                             — lineage strings; mechanical passes: concepts, receipts, card
[MOD] .spw/caches/tree/making/authorship/*.spw        — pilot
[MOD] scripts/analyzers/spw-cut-gate.ts               — default path, journal receipts, concept vocabulary
[MOD] scripts/analyzers/spw-cut-voice.ts              — doc refs
[NEW] scripts/analyzers/spw-cut-migrate.ts            — receipts-to-journal and card-trim passes, if spw mutate cannot express them
[MOD] docs/design/product/time-paths.spw              — resume note path
[MOD] .agents/plans/{caches-cut-2026-09-30,syntax-hardware-alignment,...}/ — cards and roots only
[MOD] .agents/plans/syntax-hardware-alignment/syntax-hardware-alignment.spw — proposals p8 to p11
[NEW] .agents/plans/syntax-hardware-alignment/samples/cut-surface.spw — before and after of one surface
[MOD] packages/spw-cli/src/resolve.ts, packages/spw-lsp/src/handlers/navigation.ts, packages/spw-lsp/src/server-index.ts — @root#anchor lookup through a directory root's anchor index
[MOD?] packages/spw-seed/src/lexer/* — only if @root#anchor does not already lex as one figure
```

### Craft guard

- `spw-cut-gate.ts` is 392 lines and gains journal and concept checks. Split check families out before it passes 600.
- Receipt ledgers group rows by event, date, agent, care, and outcome with file lists, and split by pass date so each entry stays under 600 lines.
- Six source registries already pass 500 lines. The door names them as split candidates.

## Commits

1. `.[plans]` — caches-living-tree plans the living cut, the journal, and leaner cache syntax (landed `5383dfa2`)
2. `.[plans]` — caches-living-tree takes the journal into the cache tree, with the raw generation and the season instance as entries
3. No commit: the owner tags `main@813444dc` as `caches-cut/2026.09.30`.
4. `#[caches]` — `.spw/caches/journal` holds dated append-only entries; the resume note and the snapshot manifest are its first, and the workspace declares `@caches`, `@tree` and `@journal`
5. `&[caches]` — the raw generation becomes the journal entry `2026-09-30-gemini-shelf`, moved whole; its index keeps the disclosure and the quarantine, and lineage strings in the cut follow
6. `&[caches]` — the cut lives at `.spw/caches/tree`, undated; the gate, docs, and plan cards and roots follow
7. `&[caches]` — the 2026 Q4 calendar and trail become the journal entry `2026-10-01-season-2026-q4`; recurring season forms stay in the tree
8. `.[caches]` — one root index routes the tree and the journal, an extension door says how to add to each, and the gate passes
9. `^seed[caches]` — samples for `@tree#anchor` refs, journal receipts, a lean card, and closed concepts, as proposals p8 to p11
10. `.[caches]` — `making/authorship` rewritten with the sampled forms that parse today
11. `#[caches]` — concepts become a closed vocabulary and the gate enforces it
12. `&[caches]` — per-surface receipts move to journal ledgers; each surface keeps as_of and one line that names its ledger
13. `&[caches]` — cards drop fields the title comment and the sources already carry
14. `^seed[resolver]` — after the samples review: `@tree#anchor` and `@journal#anchor` resolve in the CLI, the LSP, and the gate
15. `&[caches]` — refs inside the caches drop their path prefix

The owner reviews the samples between commits 9 and 10.

Fuzz strategy:
- **Explore:** after each commit, run the cut gate with `--json`, `spw resolve --from .spw/caches --warn`, and `spw census .spw/caches/tree`, and log the measures to the stream.
- **Stabilize:** `npm run lint:spw`, `npm run spw:plan:check`, and `npm run fuzz:stabilize`.
- **Ship:** `npm run fuzz:ship`, plus `test:cli`, `test:lsp`, and `test:seed` with commit 14.

## Agentic Hygiene

- Rebase target: `main@813444dc`.
- Rebase cadence: before commit 4 and before merge.
- Hygiene split: none. The tree was clean at branch time.
- Moves use `git mv` only, so git records pure renames. Content edits land in separate commits from moves.
- Plan streams across the ecology name old paths. They are history and stay as written; only cards, roots, and touches follow.
- Mechanical passes run as scripts with a dry-run diff first.
- Commits and the snapshot tag need the owner's authorization.

## Dependencies

None to merge first.
- **Shares:**
  - `caches-cut-2026-09-30`: its remaining stages run on the new path.
  - `citation-navigation`: anchor resolution in the LSP.
  - `apposition-cache-granules`: cache surfaces.
- **Feeds:** `syntax-hardware-alignment`, which owns the proposals.

## Failure Modes

- **Hard:**
  - A move leaves refs or lineage strings pointing at old paths.
  - The tag names the wrong commit.
  - A mechanical pass rewrites a claim statement or renames an anchor.
- **Soft:**
  - LSP and graph indexes keep old paths until reindexed.
  - Local worktrees keep the old layout.
- **Non-negotiable:**
  - No anchor is renamed or reused.
  - Claim statements stay byte-identical through mechanical passes.
  - The raw generation moves whole as pure renames.
  - The quarantine keeps every file it names.
  - Every commit leaves the gate and `spw resolve` no worse than before.

## Validation

- **Hypotheses:**
  - H1: the moves keep all 8180 anchors and every ref target. The only unresolved refs that change are the three panel refs.
  - H2: every receipt tuple is recoverable from the journal ledgers.
  - H3: receipts plus card trim cut at least 15% of the tree's lines.
  - H4: an agent given only the extension door adds a passing tree surface and a passing journal entry.
  - H5: anchor-addressed refs remove about 8% of the tree's characters.
- **Negative controls:**
  - Every shelf file is a 100% rename.
  - The quarantine names the same nine files.
  - The sorted claim statements are identical before and after each pass.
- **Demo sequence:**
  1. Open `.spw/caches/index.spw` and follow the door.
  2. Add a surface and a journal entry in a worktree and run the gate.
  3. Check out `caches-cut/2026.09.30` and find the old layout.

## Spw Artifact

`.agents/plans/caches-living-tree/caches-living-tree.spw` records:
- the baseline measures
- the two-layer layout and the rule that places a surface
- the journal entry kinds
- what a lean surface keeps and derives
- the relevance tiers

The extension door and the contract revisions cite it.
