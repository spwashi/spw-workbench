## report

{
  "id": "fragnav",
  "patch": "<scratchpad>/patches/fragnav-hardened.diff",
  "patch_checks": "Rewritten from `git diff` in the worktree. Reverse-applies cleanly to the worktree and applies cleanly to main 229aedcf (main has no drift under packages/ since the worktree base da5189bb). Contains no /Users/ paths. Has no new files, so no add -N was needed.",
  "worktree": ".claude/worktrees/wf_7b1587d2-205-2",
  "note": "The hardening edits were already in the worktree when I started. They came from an earlier run that was interrupted during cost measurement (its nav-main-2.json was empty), and they match its fragnav-hardened.diff byte for byte. I reviewed them, proved the new test catches the bug, and redid every test and cost measurement myself.",
  "files_changed": {
    "packages/spw-lsp/src/handlers/navigation.ts": "+29/-8 (465 -> 486 lines, 6 imports)",
    "packages/spw-lsp/src/__tests__/fragment-navigation.test.ts": "+262/-5 (95 -> 352 lines, 10 imports)",
    "craft_guard": "Neither file exceeds 600 lines or 12 imports."
  },
  "findings_addressed": [
    {"finding": "references still used stripAnchor(resolved) (navigation.ts:191/:221)", "how": "Changed to `fileOf(resolved, hit.target)` at navigation.ts:193 and `fileOf(candidateResolved, candidate.target) !== targetPath` at :223. Each side now drops only its own exact fragment suffix. A side effect: the basename prefilter needle is now 'aberrations.spw' instead of 'c', so the prefilter is tighter under `#` directories."},
    {"finding": "test for the references fix", "how": "New describe 'references — anchored citations compare by file'. It uses the real resolver against a fixture with c#lab/{aberrations,index,peer,coma}.spw and c#dev/{aberrations,index}.spw. It expects exactly [index:0, peer:0 (no anchor), peer:1 (other anchor)]. Checked against the old code: with only the two references lines reverted to stripAnchor it fails (1 failed | 16 passed) and returns two false positives, c#dev/index.spw:0 (a sibling directory's file) and c#lab/peer.spw:2 (a different file). With the fix it passes. navigation.ts was restored afterwards and its diff is unchanged."},
    {"finding": "test hygiene: c#lab directory created inside an `it` body", "how": "Moved into beforeAll."},
    {"finding": "untested resolver branches: extension inferred, directory plus fragment", "how": "Added 'goes to the anchor when the resolver infers the extension' (`./aberrations#seidel_coma_abbe` lands on line 7) and 'opens a directory target bare when it carries a fragment' (`./lenses#…` gives the bare directory URI at line 0 and a link with no fragment)."},
    {"finding": "same-bug-class follow-up the reviewer named", "how": "Not in navigation.ts, so listed, not fixed. display.ts:879 (hover path-peek) passes the anchored `resolved` to statKind, fs.readFile (~:961) and the serverIndex lookups. display.ts:1234/1237 (inlay hints) split at the first `#` with `replace(/#.*$/,'')`. I also checked navigation.ts for any remaining first-`#` split. The only one is referenceSearchNeedles at :22, `stripAnchor(hit.target)`. It works on the target text, matches the resolver's own first-`#` split (helpers.ts:204/:246), and only feeds a prefilter, so it is not a bug."},
    {"finding": "design: fileOf duplicates a contract that helpers.ts owns", "how": "Not done; listed under residual_risks."}
  ],
  "tests": {
    "full_lsp": "npx vitest --config vitest.lsp.config.ts run. Worktree: Test Files 1 failed | 20 passed (21); Tests 1 failed | 236 passed (237). Main: Test Files 1 failed | 20 passed (21); Tests 1 failed | 225 passed (226). On both sides the only failure is the known form-context.test.ts:133 test ('chains topic → @(topic) → $(topic)…').",
    "focused": "npx vitest run -c vitest.lsp.config.ts fragment-navigation + navigation + path-refs: 3 files passed, 46/46 tests passed. fragment-navigation is 17/17 (6 on main).",
    "build": "npm run build exits 2 on both worktree and main with exactly 8 errors, all in packages/spw-seed/src/grammar/expression-charge.test.ts. There are 0 errors in the touched files."
  },
  "wire": {
    "lsp_requests": [
      "textDocument/definition -> definition() navigation.ts:102 (stdio-server.ts:259; definitionProvider:true at :211)",
      "textDocument/documentLink -> documentLinks() navigation.ts:130 (stdio-server.ts:264; documentLinkProvider {resolveProvider:false} at :215)",
      "textDocument/references -> references() navigation.ts:172, path-ref branch only (stdio-server.ts:308; referencesProvider:true at :213)"
    ],
    "shared_deps_unchanged": "deps.resolveReferencePath -> helpers.ts resolveReferencePath (stdio-server.ts:120-124); uriFromPath/pathFromUri; fragmentRange -> @spwashi/spw-seed parse + resolveFragment",
    "client_surface": "VS Code and IntelliJ receive document-link targets of the form `<file uri>#L<n>` (1-based) and definition Locations on the bare file URI. Before the patch these were a `%23anchor` URI to a file that does not exist.",
    "not_touched": "No CLI commands, ServerIndex, helpers.ts, display.ts or rename/prepareRename."
  },
  "cost": {
    "suite_ab": {
      "conditions": "Three interleaved rounds this run (main, wt, main, wt, main, wt) of npx vitest --config vitest.lsp.config.ts run. Machine load average was about 24-53 throughout.",
      "main_wall_s": [5.86, 6.27, 6.55], "main_median_wall_s": 6.27, "main_median_vitest_duration_s": 4.52,
      "wt_wall_s": [6.33, 5.75, 6.46], "wt_median_wall_s": 6.33, "wt_median_vitest_duration_s": 4.67,
      "fragment_navigation_file_ms_median": {"main_6_tests": 122, "wt_17_tests": 366},
      "counts": "main 225 pass / 1 fail (226); wt 236 pass / 1 fail (237); +11 tests",
      "prior_run_consistent": "Earlier 2-round run: main 7.82/6.41s, wt 6.48/6.28s"
    },
    "runtime_real_corpus": {
      "script": "<scratchpad>/cost/fragnav/navcost.mts (driver ab-nav2.sh; outputs v2-nav-{main,wt}-{1,2}.json). Both sides run their own handler code against the same live .spw + docs corpus.",
      "corpus": "486 files, 2416 path-ref hits, 5 anchored refs (34 across .spw/docs/.agents/prompts/lib). There are 0 paths with `#` in their names in the workspace.",
      "correctness_delta": "definition: main returns 4/4 resolved targets as `%23` URIs at line 0. wt returns 0 encoded URIs; 3 land on the `#>` anchor line (L4), and 1 stale anchor (`agent-surface.spw#defaults` does not exist) falls back to L0. documentLinks: `#L<n>` targets 0 -> 3; `%23` targets 4 -> 0; total links 1729 on both sides.",
      "definition_warm_median_ms_per_anchored_hit_K7": {"main": "0.55-1.97", "wt": "67-102 for the 4 that resolve to a file; 2.2-4.6 for the unresolved one"},
      "documentLinks_warm_median_ms_K7": {"canon-mount.spw (3 anchored)": "main 2.85/4.11 -> wt 212/236", "state/observable.spw (1 stale anchor)": "main 0.69/0.75 -> wt 74/59", "registries/bias-product.spw (anchored ref unresolved)": "main 3.6/4.2 -> wt 4.0/4.0"},
      "decomposition": "fragparse.mts, median of 9 runs on the 4 real targets (44-114 lines, 1.6-6.9 KB): readFile 0.7-0.9 ms, seed parse 76-206 ms, resolveFragment 0.3-0.5 ms. Parsing is almost all of the added cost. fragmentRange was already in main but never got that far, because readFile always failed on `x.spw#anchor`; the patch is what makes it run.",
      "full_documentLinks_pass_486_files_s": {"main": [11.9, 19.2], "wt": [13.7, 26.3], "note": "Mostly noise from machine load; the real added work is about 4 target parses."},
      "references": "Result counts are identical on both sides, [5,5,1,0,3]. Medians were main 213/316 ms vs wt 195/387 ms, which is noise. fileOf is an O(len) string comparison.",
      "server_index": "Not affected: navigation.ts is not imported by server-index.ts, so there is no change to indexing time or entry counts. Not measured, because no indexing code path changed."
    },
    "code_size": "navigation.ts 465 -> 486 (+21); fragment-navigation.test.ts 95 -> 352 (+257). Both are under 600."
  },
  "residual_risks": [
    "COST (new, measured): every documentLinks and definition request on an anchored ref re-parses the whole target file from disk, with no cache. That is about 100 ms per anchored target under load (212-236 ms for canon-mount.spw on every documentLink request), and a stale anchor pays the full parse for nothing. Mitigations, cheapest first: use deps.serverIndex.getDocument(targetUri)?.parseResult when the target is open, which also fixes the unsaved-buffer risk; add an AST or anchor-line cache keyed by (path, mtime); set documentLinkProvider resolveProvider:true and find the anchor at documentLink/resolve (needs stdio-server.ts wiring); or use the ServerIndex annotation index (kind 'anchor'), which must first be shown to agree with resolveFragment's binding rules.",
    "Same bug class outside scope: display.ts:879/~961 (hover path-peek with an anchored path) and display.ts:1234/1237 (inlay hints split at the first `#`).",
    "fileOf is a private copy of a contract that helpers.ts owns (`resolved + hash`, helpers.ts:212/220/254). The contract test pins it. A better fix is to move fileOf into helpers.ts, or have the resolver return {file, fragment}; display.ts needs it too.",
    "A `#` inside the target text's own directory part (e.g. `~\"../c#lab/x.spw\"`) is still unsupported, because the resolver splits at the first `#` (helpers.ts:204/246). Only a `#` in a directory above the citing file is handled.",
    "rootRef fragments are cut off by the selector (spw-selector.ts:201), so `@root/x.spw#a` still lands on line 0.",
    "`#L<n>` on file URIs works in VS Code; other clients may ignore it or read it literally.",
    "fragmentRange reads from disk, not from the live buffer, so unsaved edits in an open target are not seen. This predates the patch.",
    "The form-context.test.ts failure and the 8 tsc errors in expression-charge.test.ts predate this patch and are unrelated."
  ],
  "artifacts": {
    "suite_logs": "<scratchpad>/cost/fragnav/v2-suite-{main,wt}-{1,2,3}.log; summary in ab-suite2.out",
    "build_logs": "<scratchpad>/cost/fragnav/v2-build-{wt,main}.log",
    "nav_cost": "<scratchpad>/cost/fragnav/v2-nav-{main,wt}-{1,2}.json; navcost.mts, fragparse.mts"
  },
  "committed": false
}

## review

**Verdict: approve-with-nits.** The fix is correct, and every claimed finding is really addressed. I checked each one by breaking the code on purpose, and the new tests catch each break. The cost numbers hold up when re-run, but the cost section misses the worst case in the live workspace. Adding a small per-request parse cache before merge is strongly recommended.

**What checks out**
- **Patch integrity:** the patch is byte-identical to `git diff` in the worktree. It applies cleanly to main 229aedcf and contains no `/Users/` paths. The worktree was unchanged after review. (`.agents/plans/index.spw` shows as modified in main's working tree; I did not touch it.)
- **Tests:**
  - Focused run: 46/46 pass, with fragment-navigation at 17/17 (6 tests on main).
  - Full LSP suite: 236 pass, 1 fail. The failure is the known `form-context.test.ts` one.
  - `tsc` reports only the 8 known errors in `packages/spw-seed/src/grammar/expression-charge.test.ts`, none in the touched files.
- **Breakage probes:** run on a scratch copy of the worktree, not the worktree itself.

  | What I broke | Tests that failed |
  |---|---|
  | `references` reverted to `stripAnchor` (`navigation.ts:193`, `:223`) | 1 of 17, with exactly the two false positives the report claims: `c#dev/index.spw:0` and `c#lab/peer.spw:2` |
  | `definition` URI built from raw `resolved` | 6 |
  | `documentLinks` target built from raw `resolved` | 4 |
  | `fileOf` cut at the first `#` | 2 (the `c#lab` tests) |
  | `fileOf` without its `endsWith` guard | 1 (the directory test) |
  | whole of main's `navigation.ts` | 13 |

- **Edge cases, using the real resolver:**
  - A self-reference `~"#here"` goes to the citing file at the right line (L2).
  - A directory with an index, `./withidx#inner`, goes to `index.spw` at L1.
  - A directory without an index opens bare, as the patch's test shows.
  - The selector drops the fragment from `@root/x.spw#a`, as the report says.
- **Other claims:** the same bug at `display.ts:879` and `:1234`/`:1237` is real. `analysis.ts:123` only checks whether the path resolves, so it is not affected.
- **Cost re-run** (one main/worktree pair, load average 16–33):

  | Measurement | Main | Worktree |
  |---|---|---|
  | `documentLinks` on `canon-mount.spw` | 3.4 ms | 322 ms |
  | `documentLinks` on `observable.spw` | 0.73 ms | 61 ms |
  | `definition` per anchored ref | 1.6–1.9 ms | 81–112 ms |
  | Parse of each target file | — | 40–84 ms (vs the report's 76–206 under heavier load) |
  | Reference result counts | [5,5,1,0,3] | [5,5,1,0,3] |

  These match the report's shape. To test the report's claim that the full-pass difference is noise, I re-ran with the worktree going first:

  | Full `documentLinks` pass | Worktree | Main |
  |---|---|---|
  | All 486 files (four runs each) | 24.8 / 21.0 / 22.7 / 18.0 s | 22.4 / 19.5 / 18.4 / 18.4 s |
  | The 481 files with no anchored refs | 21.3 / 15.9 s | 21.3 / 20.7 s |

  So the claim holds: the difference is machine load, not the patch.

**Findings**

1. **Cost, should fix — `navigation.ts:79-83` and `:155`.** `documentLinks` reads and parses the target file again for every anchored ref, one after another, with no reuse within the request. The cost study only measured `.spw` and `docs`, where no file has more than 3 anchored refs, so it missed the dense files in the live workspace (the untracked caches-cut plan):

   | File | Anchored refs | Main | Worktree | With per-request cache |
   |---|---|---|---|---|
   | `.agents/plans/caches-cut-2026-09-30/references/staging/2026-09-30/matter/water.spw` | 14 | 9 ms | 888–1086 ms | 357 ms |
   | `…/registries/quantities/matter.spw` | 8, all to one file | 5 ms | 286–415 ms | 63 ms |
   | `.spw/canon-mount.spw` | 3, to 3 different files | — | — | unchanged |

   The report's "about 100 ms per anchored target" is right per ref, but it does not give the per-request worst case, which is about 1.1 s. The cache I tried is a `Map<path, Promise<ast>>` created once per `documentLinks` call and passed into `fragmentRange`. It is about 8 lines and keeps all 17 tests passing.
2. **Craft, non-blocking — `navigation.ts:57-62` (`fileOf`).** The package already handles this a simpler way at `reference-graph.ts:130-131`: it strips the fragment from the target before resolving, with `deps.resolveReferencePath({ ...hit, target: stripAnchor(hit.target) }, …)`. That gives the same result, because the resolver splits at the same first `#` (`helpers.ts:204`, `:246`). Using it here would remove `fileOf` and its suffix matching, make the residual risk about moving `fileOf` into `helpers.ts` unnecessary, and leave one way of doing this across the package.
3. **Minor — `navigation.ts:79`.** `fragmentRange` runs the Spw parser on a target of any file type. My probe with `~"./doc.md#heading"` ends up correct (line 0, plain link), but the parse is wasted. There are no such refs in the workspace today. Only run it for `.spw` targets.
4. **Test gaps, minor — `fragment-navigation.test.ts`.**
   - No test has several anchored refs to one target, which is where a cache would be tested.
   - No `documentLinks` test covers an anchor on line 0, the plain-link branch at `navigation.ts:156`.
   - No test covers a non-`.spw` target with a fragment.
5. **Problems that predate the patch (not regressions):**
   - The `references` prefilter (`navigation.ts:20-38`) works in one direction only. From `~"./target.spw"`, it misses `~"./target#deep"`; from `~"./target#deep"`, it finds both. Main behaves the same way.
   - Root-ref fragments are dropped by the selector. That affects 10 refs in the workspace (`@biome/algos/geom.spw#metric` and others), which still open at line 0.

My test and timing scripts and outputs are in `<scratchpad>/review-fragnav/`: `densefile.mts`, `linkpass.mts`, `linkpass.out`, `nav-main.json`, `nav-wt.json`, `fragparse-review.json`, and the scratch copy `wt/` with the cache attempt applied.