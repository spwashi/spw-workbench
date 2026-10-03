## report

{
  "patch": "<scratchpad>/patches/graphfrag-hardened.diff",
  "patch_notes": "1168 lines, 13 files. `git apply --check` passes against main 1aa1dc23. Nothing is committed and nothing was stashed. The two new files were marked with `git add -N` (intent-to-add only) so the diff includes them. The worktree already held most of findings 1–8 from an earlier hardening pass. This pass checked that work, measured it, and made two more fixes, marked NEW below.",
  "findings_addressed": {
    "1_false_orphans": {
      "how": "`scanCorpus` now loads a root registry: the manifest's `workspace.roots`, then `.spw/shelves.spw` (@repo @spw @index @docs @src @biome @spec ...). A root ref the file does not declare falls back to this registry before being dropped. The registry name and its bases are part of the memo key.",
      "new_files_only": "NEW: a registry fallback now makes an edge only when it lands on a file. Before this, a bare `@biome` or `@spw` linked to its directory, and in `spw graph .spw/biome` the directory `.spw/biome/ocean` ranked #2 hub with 21 in-links. A test covers this.",
      "example": "`.spw/biome/ocean/lsp.spw` now has 5 file edges (`@biome/query/hot.spw`, `@spw/workspace.spw`, …).",
      "orphans_worktree_corpus": "On the worktree corpus (da5189bb, 356 files, `.spw docs prompts lib`): pre-patch 1, first patch 23, hardened 21. `lsp.spw` and `runtime.spw` are no longer orphans.",
      "orphans_main_snapshot": "On a frozen `git archive` of main HEAD (702 files): pre-patch 14, hardened 21.",
      "why_not_near_pre_patch": "Each of the 20 new orphans cites no file at all. They use only deixis (@here, @workspace, @_), `&[@_, @spw]`, `@key:` metadata declarations, or `@spw:` markers. Before the patch they had edges only to pseudo-nodes. No file that has a resolvable file citation is an orphan.",
      "variant_rejected": "I measured a variant that allows directory edges: orphans would be 16. The 5 extra files are the `&[@_, @spw]` deixis form, which would be wired to the `.spw/` directory, so I did not use it."
    },
    "2_root_shelves": "Shelves are counted from every root ref that is not a declaration, before any ref is dropped, and passed in as `analyzeTopography(opts.rootShelves)`. The score is kept at or below 1. Wide strand: pre-patch '@src×301, @here×160, @biome×90, @docs×82, @workspace×78, @profile×58'; first patch '@here×37, @src×16, …'; now '@src×269, @here×127, @biome×76, @workspace×75, @docs×70, @spw×42'. Declarations are no longer counted.",
    "3_declared_missing_target": {
      "how": "A missing target under a root the file declares is added to `brokenTargets` (test: `gone: @canon/gone.spw`).",
      "new_dedup": "NEW: when the declared root's own path is missing (for example `@src: ~\"../src\"` in `docs/features/spw/*`), the break is reported once, through the declaration, and refs made through that root add no further breaks. Without this, broken went from 184 to 413, mostly copies of about 12 bad declarations. With it, 184 → 249."
    },
    "4_citationCandidates": "New `packages/spw-cli/src/citation-candidates.ts` is used by both `corpus-scan.ts` and `resolve.ts::resolveOne`. The order is unchanged: `/route` resolves against the root only; anything else tries the citing file's directory, then the consumer root. `ResolveBasis` is re-exported from `resolve.ts`. `resolve.test.ts` passes.",
    "5_memo": "`CorpusMemoKeyParts` gains `productVersion` and `rootRegistry`, both hashed into the fingerprint, and the NUL key in `fileStats` is gone. `getDiskCorpusProduct` also rejects a product whose version differs. `CORPUS_PRODUCT_VERSION` is now 'spw.corpus/2'; the schema stays 'spw.corpus/1'. I grepped every consumer: `corpus-memo.ts`, `inventory.ts` (prints the version), `corpus-disclosure.ts` (version atom) and `docs/theory/spw/cache-field.spw` (memo row updated). The only test that asserts the string checks the schema, which is unchanged.",
    "6_external": "`CorpusFileSignals.externalRefCount` (optional) plus `externalRefTotal()`. Census shows `external=N` on its detail line and `stats.externalRefs` in JSON; the graph/map header shows `external`. There are 3 on the wide corpus, including prose written as a path.",
    "7_imports": "One `@spwashi/spw-seed` import in `corpus-scan.ts` and one in `corpus-memo.ts`.",
    "8_tests": {
      "corpus-scan.test.ts": "9 link-resolution tests: `/route` reads only the consumer root even when a file-relative twin exists; `dir/` targets become directory nodes and a missing dir is broken; non-path declaration `@lock: \"text\"`; multi-term declarations (`old -> ~\"…\"`, `~a -> ~b`); registry fallback with roles (source/leaf/orphan, deixis-only file is an orphan, bare shelf makes no node); declared-root break and the missing-base dedup; rescan when the root registry changes; external count; `resolvePaths:false`.",
      "corpus-memo.test.ts (new)": "The fingerprint changes when the product version or the registry changes; a disk product with an old version is not served.",
      "math/corpus.test.ts": "2 tests: shelves named from the label, and from the passed-in tally."
    }
  },
  "tests": {
    "test:cli": "29 files, 265 tests passed (run twice in the A/B). Main has 252.",
    "test:seed": "77 files, 793 tests passed.",
    "build": "Only the 8 known errors, all in `packages/spw-seed/src/grammar/expression-charge.test.ts`.",
    "lint": "`docs/theory/spw/cache-field.spw` passes the syntax validator."
  },
  "wire": {
    "commands": "Everything that calls `scanCorpus`: census/invent, graph/map, analyze, formula, lattice, taste and `inspect corpus`. They all now see nodes that are files only (fragment in `link.anchor`), far fewer root links, about 100 newly visible real breaks, and different orphan/leaf/source roles.",
    "products": "CorpusProduct is spw.corpus/2. Old disk memos in `.spw/gen/session/corpus-memo` are never served, and the first run after merge rescans.",
    "seed_api": "`CorpusLink.anchor?`, `CorpusFileSignals.externalRefCount?`, `analyzeTopography` option `rootShelves`, new export `rootShelfName`.",
    "compose_advice": "`buildComposition` / `compositionBrief` ('review cold orphans…') has no caller in the repo. It is affected only in principle: its orphan input would be 21 rather than 1 or 14.",
    "resolve": "Behavior unchanged; it now shares the candidate helper."
  },
  "measurements_wide": {
    "worktree_corpus_356_files": "links 3769→2215 (root links 2090→539). Broken 184→249: 35 false breaks fixed, 100 real breaks added, 47 of them from `spw-garden-audit`'s `@docs: ~\"..\"` and others from stale `@src/*`. Nodes containing '#' 4→0. Non-file nodes 1052→479. Pseudo-hubs: before here:160, workspace:78, profile:58, intent:55, src:52; now none. pathRefSum (1679) and rootRefSum (2090) are unchanged.",
    "main_HEAD_snapshot_702_files": "links 7204→5381 (root links 2596→776). Broken 1607 (457 distinct files once fragments are collapsed) → 393. Nodes containing '#' 1416→0. Non-file nodes 2701→634. Signal sums are unchanged."
  },
  "cost": {
    "conditions": "Load average was 30 falling to 10 during the A/B, and reached 436 earlier in the session, so the timings are noisy. Each round ran main first.",
    "test:cli": "main 29.59 s and 24.03 s (median 26.81 s, 252 tests); worktree 23.57 s and 18.31 s (median 20.94 s, 265 tests). The worktree being faster is within noise.",
    "census_.spw_docs/theory": "Same corpus (worktree checkout, 159 files), each checkout's CLI, memo cleared before every run. main 33.10 s and 28.65 s (median 30.88 s); worktree 17.61 s and 14.53 s (median 16.07 s), about 1.9× faster from parsing once instead of twice. Links 1292→671, broken 41→21, orphans 0→9 (all cite no file), product /1→/2.",
    "wide_scan": "Run in parallel under contention: main snapshot 279 s → 171 s.",
    "code_size": "13 files, +736/−62. Non-test +378/−62; tests +358. The first patch was 4 files, +326/−36. `corpus-scan.ts` grows from 343 to 573 lines, under the 600-line guard."
  },
  "residual_risks": [
    "Orphans stay at 21, not near 1. The only way back is to restore pseudo-nodes or redefine the orphan role, which needs a human decision.",
    "Census and graph broken counts rise because about 100 real breaks under declared roots become visible.",
    "Registry fallback only links files. It never reports a break, because shelf names also stand for concepts, and directory refs made through a registry root make no edge.",
    "A local declaration shadows the registry even when its own path is missing: refs through it get no edge.",
    "The memo fingerprint still does not cover whether files outside the scanned set exist. This predates the patch.",
    "Review nit 7 is unchanged: one `try` still wraps the parse and both queries.",
    "Timing numbers come from a loaded machine."
  ],
  "files": [
    ".claude/worktrees/wf_7b1587d2-205-3/packages/spw-cli/src/corpus-scan.ts",
    ".claude/worktrees/wf_7b1587d2-205-3/packages/spw-cli/src/citation-candidates.ts",
    ".claude/worktrees/wf_7b1587d2-205-3/packages/spw-cli/src/corpus-memo.ts",
    ".claude/worktrees/wf_7b1587d2-205-3/packages/spw-cli/src/corpus-memo.test.ts",
    ".claude/worktrees/wf_7b1587d2-205-3/packages/spw-cli/src/corpus-scan.test.ts",
    ".claude/worktrees/wf_7b1587d2-205-3/packages/spw-seed/src/math/corpus.ts",
    "<scratchpad>/hard-graphfrag-2/ab.sh",
    "<scratchpad>/hard-graphfrag-2/wtc-base.json",
    "<scratchpad>/hard-graphfrag-2/wtc-wt3.json",
    "<scratchpad>/hard-graphfrag-2/snap-main-base.json",
    "<scratchpad>/hard-graphfrag-2/snap-main-wt3.json"
  ]
}

## review

**Verdict: approve-with-nits.** All 9 findings from the original review are addressed, and I found no correctness regressions. The rise in orphans (1 → 21) is a real change in what "orphan" means, and it needs to be stated in the commit episode. Line numbers below are in the patched worktree files.

**Checks**
- **Patch:** matches the worktree diff exactly (ignoring `index` lines) and `git apply --check` passes on main 1aa1dc23.
- **Corpus probe:** I ran `scanCorpus` with `noMemo`, worktree corpus `.spw docs prompts lib` (356 files), once with main's code and once with the patch.

| Measure | Main | Patched |
|---|---|---|
| Links | 3769 | 2215 |
| Broken | 184 | 249 |
| Orphans | 1 | 21 |
| Nodes containing `#` | 4 | 0 |
| Non-file nodes | 1052 | 479 |
| Non-file hubs | (pseudo-hubs) | 0 |

pathRef (1679) and rootRef (2090) totals are the same on both sides. These match the implementer's numbers.

**Findings, one by one**
1. **False orphans: fixed.** The only orphan before was `docs/specs/spw/shadow-dom-policy.spw`. Each of the 20 new orphans has pathRefCount 0. Their root refs are only:
   - deixis: `@here`, `@workspace`, `@_`
   - `@key:` metadata or `@spw:` markers
   - `# @see` lines, which are comments

   None of them cites a file. `.spw/biome/ocean/lsp.spw` is no longer an orphan.
2. **root_shelves: fixed.** The strand now reads `@src×269, @here×127, @biome×76, @workspace×75, @docs×70, @spw×42`. The declaration `@profile×58` no longer counts.
3. **Declared missing target: fixed.** I checked both lists:
   - All 35 removed breaks were false: doubled `.spw/.spw/…` joins, `#frag` nodes, and 3 prose strings that now count as external.
   - All 100 new breaks come from root links in 5 files: garden-audit (48 links, its `@docs: ~".."`), `docs/toc.spw` (40), `docs/plans/spw/architecture.spw` (19), `docs/index.spw` (15), `.spw/shelves.spw` (1). 99 are real; nit 2 covers the one that is not.
4. **Shared candidate order: fixed.** `citation-candidates.ts` is used by both callers, and `resolve.test` passes.
5. **Memo and product version: fixed.** I grepped every consumer:
   - `corpus-memo.ts:176-177` rejects a disk product with another version.
   - `inventory.ts:292` prints the version.
   - `corpus-disclosure.ts:141` has the version atom.
   - `corpus.test.ts:119` checks only the schema, which is still /1.

   Nothing in the LSP, the extensions or `scripts/` reads the version.
6. **External refs: fixed.** There are 3 on the wide corpus.
7. **Single `try`: unchanged** (`corpus-scan.ts:212-220`). The implementer acknowledged this.
8. **Imports: fixed** (one block).
9. **Tests: fixed.** The new assertions would catch it if any of these were removed: the missing-base dedup, the files-only registry fallback, the version check, or the registry in the fingerprint.

**Tests and build**
- `test:cli`: 29 files, 265 tests passed.
- Focused seed tests (math/corpus, corpus-disclosure, compose): 14 passed.
- `tsc -p tsconfig.typecheck.json`: only the 8 known errors in `expression-charge.test.ts`.
- `cache-field.spw` parses.

**Cost (one A/B pair re-run)**
- Census `.spw docs/theory` on a scratch copy of the worktree corpus (150 files), memo cleared before each run:

| Run | Wall time | User CPU | Links | Version |
|---|---|---|---|---|
| Main | 117.7 s | 91.0 s | 1292 | /1 |
| Patched | 44.2 s | 46.7 s | 666 | /2 |

  User CPU is 1.95× lower, which matches the claimed 1.9×. The wall-time gap is exaggerated because load average fell from about 205 to 110 between the two runs.
- Wide probe: main 181.6 s user CPU against 100.0 s patched, so about 1.8×. The claim is plausible. Load average was between 66 and 436 for the whole session.

**Nits (none blocking)**
1. **Root lookup order differs from the LSP** (`corpus-scan.ts:405-420`).
   - The scan tries the manifest first, then `shelves.spw`. The LSP lets shelves override (`packages/spw-lsp/src/helpers.ts:134-137`).
   - On the real corpus, bare `@agents` in `.spw/index.spw` and `.spw/topology.spw` now links to `.spw/agents.spw`; the LSP would go to `.agents/`.
   - `@spec` gets two bases (v0.3.0, then v0.2.0-alpha). A `@spec/x` missing from v0.3.0 would silently link into the archived spec; no current ref does this.
   - The docstring at :397-404 suggests the scan matches the LSP. Either say it differs, or add a test that pins the order.
2. **No extension guessing** (`corpus-scan.ts:451-463`, used at :268-273). `.spw/shelves.spw:29` `@biome/trace` is reported broken as `.spw/biome/ocean/trace`, but `trace.spw` exists and the LSP's `resolveCandidate` (helpers.ts:165-176) would open it. This is 1 of the 100 new breaks.
3. **Orphan meaning changes and needs sign-off.** The jump from 1 to 21 shows up in:
   - census role counts
   - `map.ts:362-364` ("orphans (no edges)")
   - the `corpus-disclosure.ts:120` orphans list

   The episode should say so.
4. **Missing paths under registry roots stay silent.** They make neither an edge nor a break:
   - `docs/waypoints/spw/architecture.spw`: 9 refs (`@src/app`, `@src/core`, …)
   - `.spw/topology.spw`: 4 refs (`@gen/cache/*`)

   This is not a regression (before the patch they were never reported as breaks) and it is listed in the residual risks.
5. **Test gaps:**
   - the manifest-vs-shelves order for a name both declare
   - a local declaration shadowing a registry name
   - the `external=` output in census and graph (`inventory.ts:284-285`, `map.ts:243`)

   Also, `graph --json` (`serializeReport`, `map.ts:369-383`) has no external count; it is reachable only through `product.signals`.

Files are in <scratchpad>/rv5/:
- probe.mts
- base.json
- wt.json
- ab1.sh
- ab1.out
- testcli.log
- tsc2.log