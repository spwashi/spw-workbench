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
- **Handoff:** the journal kind once called `resume` is `handoff` (`3e3fb1fa`), as the default after the owner noted that "resume" reads like résumé. `?[handoff_name]` stays open, and reverting is one commit.
- **Plugin pass (later 2026-10-13):** the owner chose three things: p8 refs, refs only where they are refs, and journal-aware plugins.
  - p8 and the refs-only fix go to `citation-navigation` as `~[root_anchor_refs]`, `~[root_anchor_lsp]`, `~[root_anchor_grammar]`, and `~[refs_outside_strings]`.
  - The journal-aware plugins stay here.
  - p10's emit derivation is out of this pass.
  - p9 to p11 wait for the owner's review of their samples.

## Scope

- **In scope:**
  - The tag and its manifest.
  - Opening the journal and declaring the workspace roots.
  - Moving the shelf into the journal.
  - Moving the cut to `tree/`.
  - Moving the season instance into the journal.
  - The root index and extension door, plus the three forward panel refs so the gate passes.
  - Syntax samples p8 to p11, and the `making/authorship/` pilot.
  - Closed concepts (p11), receipts moved to journal ledgers (p9), and the card trim (p10), after the owner reviews their samples.
  - Journal-aware plugins:
    - an entry shows its date and kind
    - an edit to an entry after its day warns
    - a tree surface shows the journal entries that cite it as backlinks
  - The p8 ref migration inside the caches, after `citation-navigation` lands the resolver and LSP work.
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
[NEW] .spw/caches/journal/2026-09-30-handoff.spw      — moved from .spw/caches/resume/2026-09-30-direction.spw
[NEW] .spw/caches/journal/2026-10-13-handoff.spw      — supersedes its state frames
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
[MOD] packages/spw-lsp/src/server-index.ts           — journal entries indexed with date, kind, and supersedes edge
[MOD] packages/spw-lsp/src/handlers/display.ts        — entry hover and code lens; backlinks from journal entries to tree surfaces
[MOD] packages/spw-lsp/src/handlers/analysis.ts       — append-only warning on an entry edited after its day
[NEW] packages/spw-lsp/src/handlers/journal.ts        — journal reading kept out of display.ts (already over 1400 lines)
[MOD] packages/spw-lsp/src/__tests__/journal.test.ts  — entry frame, moved-in entries, exemptions, backlinks
(resolver and LSP work for @root#anchor lives in citation-navigation; see its Files)
```

### Craft guard

- `spw-cut-gate.ts` is 392 lines and gains journal and concept checks. Split check families out before it passes 600.
- Receipt ledgers group rows by event, date, agent, care, and outcome with file lists, and split by pass date so each entry stays under 600 lines.
- Six source registries already pass 500 lines. The door names them as split candidates.

## Commits

Landed:
1. `5383dfa2` `.[plans]` — the plan
2. `5842dcc0` `.[plans]` — the journal moves into the cache tree
3. Tag `caches-cut/2026.09.30` on `813444dc`
4. `61252c65` `#[caches]` — the journal opens
5. `f11e432f` `&[caches]` — the gemini shelf becomes a journal entry
6. `2a61b1c8` `&[caches]` — the cut becomes `tree/`
7. `78bd7f56` `&[caches]` — the season instance becomes a journal entry
8. `3e3fb1fa` `vocab[caches]` — resume becomes handoff
9. `c796d4a8` `.[caches]` — the root, the door, and a passing gate
10. `d9d6c019` `^seed[caches]` — samples p8 to p11

Planned (this pass):
11. `&[lsp]` — `journal_entry_lens`: an entry shows its date and kind; an entry moved in whole shows where it came from
12. `&[lsp]` — `journal_append_only`: editing an entry after its day warns and names the supersedes path
13. `&[lsp]` — `journal_backlinks`, after `citation-navigation` `~[root_anchor_refs]`: a tree surface shows the journal entries that cite it

Planned (after the samples review):
14. `.[caches]` — p9 to p11: the `making/authorship` pilot
15. `#[caches]` — p11: closed concepts
16. `&[caches]` — p9: receipts to journal ledgers
17. `&[caches]` — p10: the card trim (conventions only; emit derivation is out of this pass)
18. `&[caches]` — p8, after `citation-navigation` `~[root_anchor_lsp]`: refs inside the caches drop their path prefix, and lineage becomes `@journal` anchor refs

Fuzz strategy:
- **Explore:** after each commit, run the cut gate with `--json`, `spw resolve --from .spw/caches --warn`, and `spw census .spw/caches/tree`, and log the measures to the stream.
- **Stabilize:** `npm run lint:spw`, `npm run spw:plan:check`, and `npm run fuzz:stabilize`.
- **Ship:** `npm run fuzz:ship`, plus `test:lsp` with commits 11 to 13.

## Agentic Hygiene

- Rebase target: `main@813444dc`.
- Rebase cadence: before commit 4 and before merge.
- Hygiene split: none. The tree was clean at branch time.
- Moves use `git mv` only, so git records pure renames. Content edits land in separate commits from moves.
- Plan streams across the ecology name old paths. They are history and stay as written; only cards, roots, and touches follow.
- Mechanical passes run as scripts with a dry-run diff first.
- Commits and the snapshot tag need the owner's authorization.

## Dependencies

None to merge first for the journal lens and the append-only warning.
- **Ordering:** `journal_backlinks` and the p8 migration wait on `citation-navigation` `~[root_anchor_refs]` and `~[root_anchor_lsp]`.
- **Shares:**
  - `caches-cut-2026-09-30`: its remaining stages run on the new path.
  - `citation-navigation`: owns p8 and refs outside strings.
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
  - The raw generation moves whole; only outward links that spw refactor rebases change.
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
  - Every shelf file is a rename, 100% except files with rebased outward links.
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
