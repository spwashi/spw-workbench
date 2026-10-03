# Plan: caches-cut-2026-09-30

Turn the generated `.spw/caches` shelf into a dated, sourced, addressable reference cut at `.spw/caches/2026-09-30/` that also teaches how to structure a Spw graph. (Card, phase, and next move: [wip.spw](./wip.spw) · evidence: [references/index.spw](./references/index.spw) · distilled findings: [caches-cut-2026-09-30.spw](./caches-cut-2026-09-30.spw) · index: [../index.spw](../index.spw))

This file is the handoff. Any agent can resume from here without the original session.

## Goal

The raw Gemini 3.8 Flash (high) shelf stays in place as provenance (owner commits `5acc5545`, `229aedcf`). A dated cut beside it carries corrected, sourced, faceted surfaces with:
- typed links between anchors
- quantities backed by registry cells
- inspection receipts
- an ethics frame

Each surface is gated by `scripts/analyzers/spw-cut-gate.ts` and the brief emit gate. The cut is meant to stay useful for years, to feed publishing (including the owner's spwashi.com story about shared curricula across generations), and to show future Spw writers how to structure a graph.

Taste: claim discipline, honest provenance, legible graph structure.

## Owner decisions (do not relitigate)

- **Cut location.** Workbench, `.spw/caches/2026-09-30/` (confirmed 2026-09-30). When the cut lands, update the `^"not_in_this_revision"` frame of `.spw/caches/resume/2026-09-30-direction.spw` so it stays true.
- **Raw shelf.** Stays, committed. Do not archive or delete it. The cut cites raw files only as quoted lineage strings.
- **Quarantine.** Nine health and remediation files are quarantined in `.spw/caches/index.spw`. Use them only to produce corrected, sourced, guideline-versioned content.
- **Tool fixes.** Name a wire and a cost for each fix, then apply it to the working tree uncommitted for the owner's Touch ID review.
- **Product hold** (from the resume note):
  - Refuse a command tour as onboarding. Newcomers land on one fragment door.
  - Keep charge off the visit arc.
  - Host-feature caches are residue. Language, mathematics, physics, linguistics, and attention lead.
- **Framing to avoid.** Do not describe the corpus as survival, prepper, or doomer material. Stewardship-style archival patterns are welcome: renvois, faceted classification, claim ledgers, Memex trails, Propaedia tiers, Mendeleev gaps, Llull combinators, Warburg panels, Foxfire kits.
- **Relevant domains** (reframe; do not drop):
  - TikTok LIVE: streamers are likely first Spw users, and chat torrents need parallel processing.
  - Community roles: semiotic charge over time.
  - Physiology: recluster with ecological and biological models.
  - New: histories of literate and playback media form factors and their manufacturing.
- **Production season.** Oct 1 to about Jan 4: post-September reflection, a crescendo, then celebration and reset. Film production and indie-author surfaces should prime it.

## State as of 2026-10-01 06:00

| Workstream | State | Where |
|---|---|---|
| Raw review (2 rounds, 208 files) | done | `references/review/scorecard.md` |
| Understand pass (9 axes: linking, metrics, tags, lens, emit, clustering, syntax, plugin theory, theory) | done | `references/understand/*.md` |
| Cut gate | done; committed in part; receipts and same-line-tag checks uncommitted | `scripts/analyzers/spw-cut-gate.ts` |
| Cut root opened at `.spw/caches/2026-09-30/` (contract, vocabulary with 52 domains, water exemplar at `physical/materials/`, materials-and-engineering registries) | done 2026-10-01; passes gate, validator, emit, resolve; identical to staging | `.spw/caches/2026-09-30/`, `references/staging/2026-09-30/` |
| Ontology panel (3 designs, 3 judges) | done; all judges chose Colon/faceted with grafts | `references/panel/` |
| Ontology synthesizer and critic | done 2026-10-01; critic fixes applied as v2 | `references/panel/final-plan-v2.json` (use this), `final-plan.json`, `critic.json` |
| Persona study (12 practitioner clusters) | done 2026-10-01 | `references/studies/persona-synthesis.json`, `persona.md` |
| Tokenizer/AST/dialects study | done 2026-10-01 | `references/studies/tokens-synthesis.md`, `tokens.md` |
| Rendering/CLI/metacognition study | done 2026-10-01; contract and gate amendments applied (spw tour refused per resume note) | `references/studies/render-synthesis.md`, `render.md`; `scripts/analyzers/spw-cut-voice.ts` |
| Machine empathy, tunable complexity, and IR inspection synthesis; wave 3 spw tree | running 2026-10-01 (run `wf_691aebc2-7bf`) | will land in `references/spw-branch/` |
| Writers, fact-check, fix, weave, apparatus, critic | waves 1 and 2 paused 2026-10-01 13:05 at the owner's request (session limit); 137 files on disk, one package fully fact-checked; gate: 306 pending refs to unwritten files | resume runs `wf_adcc6c3b-5de`, `wf_61afdc2c-769`; script `references/workflows/cut-writers-wave.js` |
| Tool fix: lens visibility (LSP index, hover, tokens, client) | implemented; review approve-with-nits plus should-fix findings; hardening in progress | worktree `wf_7b1587d2-205-1`; `references/patches/lens*.diff` |
| Tool fix: anchor-line navigation | landed on main at `861fa214` after the cost fix (index-read anchor lines; listings never parse); wire and cost in the citation-navigation stream | the worktree `wf_7b1587d2-205-2` is superseded; `references/patches/` keeps the held versions |
| Tool fix: graph and census fragments | implemented; review approve-with-nits (22 false orphans, root_shelves strand); hardening in progress | worktree `wf_7b1587d2-205-3`; `references/patches/graphfrag.diff` |

Worktrees live under `.claude/worktrees/` (gitignored, local only). The diffs under `references/patches/` are the durable copies.

## Ontology (panel outcome, pending synthesis)

**Winner: Colon / faceted archive.** It has a shallow primary tree and pushes variety into closed-vocabulary facets, registries, glossary lattices, and computed panels.

- **Top-level classes:** `formal/`, `physical/`, `living/`, `language-and-mind/`, `society/`, `making/`, `record/`, `learning/`, `spw/`
- **Apparatus:** `registries/`, `trails/`, `panels/`, `provenance/`

Grafts the judges asked for:
- **From Workshop:**
  - a `season/` hub: arc, a dated calendar with fixed, typical, and verify cells, fiscal-year comparison, and a retrospective protocol
  - well-known and internal case dossiers
  - market hooks that map signals to decisions
  - Foxfire kits: intergenerational interview, curriculum memory map
  - a streamers bench
- **From Propaedia:**
  - the engineering math core (calculus, ODE and PDE, probability and statistics, numerics, transforms, optimization)
  - single canonical cores (thermo, stat mech, EM, transport, control and signals)
  - replication-status and guideline-currency ledgers
- **Also:** registry index files, and directory depth 4 where the ontology is real (for example `record/carriers/{sound,moving-image,digital}/`).

The synthesizer prompt now also plans a `spw/` branch written after the studies land:
- perspectives
- familiarity and false friends
- contraptions
- tokens and roles
- transforms
- dialects and play
- rendering and CLI
- inspection and IR
- plugin theory
- graph idioms
- theory questions

## Contract essentials (full text: `references/staging/2026-09-30/contract.spw`)

**Surface shape**, in order:
1. title comment
2. `#>` file anchor
3. axis stack: `#:layer #:domain #:form #:level #:review #:valence`, with optional `#:era #:season`
4. `^"emit"` card
5. `^"provenance"` with `^["receipts"]`
6. `^["edges"]`
7. `^["concepts"]`
8. anchored keystone claim frames
9. `^["try"]` kits
10. wonder blocks

**Links:**
- `^["tree"]` routes; `^["bundle"]{ ={ ~"./x.spw#anchor" } }` transcludes; `^["edges"]{ relation: [ ~"path#anchor" ] }` points.
- No up-links, no dispatch tables, no `~<tag>` forms.

**Claims:**
- `#:claim #!settled|contested|emerging|speculative|refuted|interpretive|superseded`
- a `source:` link into `registries/sources`, and `^["limits"]{ holds fails }`
- `as_of` and edition on anything that changes

**Quantities:** registry cells `%ns.key{ value unit at rel|abs src status }`; cite with `reads: %[ns.key]` or wonder `$%[...]` (at most 3 handles).

**Wonder:**
- `#:depth #!x ~#lens(phrase)` drawn from the vocabulary
- `#:claim #!speculative` before a hypothesis
- a typed `!probe{ =id =kind }`
- a `breaks:` line on cross-domain analogies

**Receipts:**
- `^["rN"]{ event: #x, at: "…", agent: "…", care: #glance|skim|read|audit|adversarial, outcome: #x }`
- Separate same-line bindings with commas.

**Ethics:** attribution, origins, citation integrity, a corrections log, visible dissent, no private individuals, no local paths, and no unsourced numbers.

**Integrity:** health and clinical content is educational reference with a scope frame, a guideline body, version, and year, and contraindications.

**Gate commands:**
- `node --import tsx scripts/analyzers/spw-cut-gate.ts .spw/caches/2026-09-30 [--json] [--emit]`
- `node --import tsx packages/spw-cli/src/main.ts emit pack <file> --host brief --strict-continuity --strict-positive`

## Next steps (any agent)

1. **Ontology synthesis.**
   - If workflow run `wf_1662628c-fe4` finished, read its `final` and `critic` from the session task output. Otherwise re-run `references/workflows/caches-ontology-panel.js` (set constants) with the judges' verdicts and designs from `references/panel/`.
   - Save the final plan JSON to `references/panel/final-plan.json`.
2. **Open the cut.**
   - Copy `references/staging/2026-09-30/` to `.spw/caches/2026-09-30/`.
   - Set `domain: #[ ... ]` in `vocabulary.spw` from the plan.
   - Move `matter/water.spw` and the matter registries to their planned paths, fixing relative refs.
   - Run the gate.
3. **Writers, in waves.** Use `references/workflows/cut-writers-wave.js` (supersedes `cut-writers.js`). Args: `{ repo, cut: ".spw/caches/2026-09-30", planPath: ".agents/plans/caches-cut-2026-09-30/references/panel/final-plan-v2.json", scorecard, packageIds, stages, wave }`. Agents read their package spec from the plan file.
   - Wave 1 (launched 2026-10-01 11:30, stages write/check/fix): `season`, `creators-and-platforms`, `film-stage-visual`, `learning-and-generations`. **Done 2026-10-02**; report `references/waves/wave1.json`.
   - Wave 2 (write/check/fix): `provenance-and-reference`, `formal`, `physical-sciences-and-image`, `materials-and-engineering`, `life-and-mind`, `plants-ecology-care`, `language-and-communities`, `economy-and-markets`, `record-and-carriers`.
   - Wave 3 (launched 2026-10-02 18:50 with `final-plan-v3.json`): `spw-design-studies`, `spw-contraptions`, `spw-hosts-and-history`, `spw-doors-perspectives`, `spw-glossary-specimens`, `spw-branch`.
   - Wave 4a (write/check/fix with plan v3): `concepts`, `trails`. Then stage `weave` over every package, `apparatus` (root), and `sweep`. Use plan v3 from here on.
   - Wave 4: stage `weave` over all branch packages, then `apparatus` (root), then `sweep` (harm sweep and completeness critic).
   - A wave interrupted by limits resumes from its run ID; files already written stay on disk, so a rerun's writer should extend, not overwrite.
4. **Writers (original single-run form).**
   - Run `references/workflows/cut-writers.js` with `args = { repo, cut, S, planPath, scorecard, packages, apparatusId }`.
   - Season and production packages go first, because the season opened Oct 1.
   - Then the global gate, emit gate, `spw resolve --from .spw/caches/2026-09-30 --warn`, and `npm run lint:spw`.
4. **spw/ branch.** After the three studies' syntheses, run one more synthesis through the lens of machine empathy and tunable complexity. It covers:
   - IRs (ONF, `packages/spw-seed/src/ir/*`, census `spw.corpus/1` products, emit IR, form cards) as graded inspection surfaces with receipts
   - practice modes for highlighting
   - CLI predict, check, compare, and reflect affordances
   - dialects for play

   Then write the `spw/` surfaces.
5. **Tool fixes.**
   - Finish hardening and re-review.
   - Record wire and cost in the `shares` plans' streams: lens in `apposition-cache-granules`, anchor navigation in `citation-navigation`, graph in `plan-ecology-clustering` or the CLI plans.
   - Apply the patches to `main` uncommitted.
   - Run `npm run test:lsp test:cli test:seed test:vscode`, the extension typecheck, and `npm run build`.

   Known baseline failures on clean main: 1 test in `form-context.test.ts`; 8 tsc errors in `packages/spw-seed/src/grammar/expression-charge.test.ts`.
6. **Close.**
   - Route `.spw/caches/index.spw` to the cut.
   - Update the resume note.
   - Write `spw/graph-idioms` from what the cut taught.
   - Prepare commits per `wip.spw` `^["commits"]`.

## Known hazards (verified)

**Parser:**
- Valence words as keys degrade a surface.
- Comparisons in `[ ]` degrade.
- `48<hours>` and empty bindings swallow the next line.
- `=>` splits sequences.
- `$%` is two operations.
- `~<tag>"p"` is not a PathRef.
- `~#k: ~"p"` (spaced) detaches.
- A `#tag` followed by a key on the same line nests that key.

**Tools:**
- The LSP jumped to line 1 for anchors; fixed on main at `861fa214`. Hover path-peek and inlay hints still read `x.spw#anchor` as a file path.
- graph/census keep fragments and mint `@alias` pseudo-hubs (fixed by graphfrag).
- The LSP does not see `~#lens()` (fixed by lens).
- `spw emit ir` writes an absolute `sourcePath`; make it relative before publishing packs.
- The VS Code decoration layer blanks text after apostrophes.

## Files

- [NEW] `.agents/plans/caches-cut-2026-09-30/` (this plan, references, distilled artifact)
- [MOD] `scripts/analyzers/spw-cut-gate.ts` (receipts and same-line tag checks; uncommitted)
- [NEW, pending] `.spw/caches/2026-09-30/**`
- [MOD, pending] `.spw/caches/index.spw` (route to cut); `.spw/caches/resume/2026-09-30-direction.spw` (keep true)
- [MOD, pending] `packages/spw-lsp/src/{server-index.ts,handlers/display.ts,handlers/semantic-tokens.ts,handlers/navigation.ts}`, possibly `packages/spw-lsp/src/handlers/wonder.ts` [NEW]
- [MOD, pending] `extensions/vscode-spw/src/{lsp/custom-requests.ts,views/concepts-tree.ts,views/workspace-tree.ts,navigation.ts,annotation-index.ts}`
- [MOD, pending] `packages/spw-cli/src/{corpus-scan.ts,resolve.ts}` and `packages/spw-seed/src/math/corpus.ts`

Craft guard: `display.ts` was already 1461 lines before the lens work. The hardening pass extracts wonder and apposition hover code into `handlers/wonder.ts`.

## Agentic Hygiene

- Rebase target: `main` (base `229aedcf`).
- Commits require the owner's Touch ID. Agents prepare and never commit.
- Never use bare `git stash` (shared across worktrees and sessions).
- Usage limits have interrupted this work twice. Keep the plan stream current after each phase so the next agent can resume.
