## report

Waiting for the index A/B rounds to finish before the final verification run.

## review

**Verdict: approve-with-nits.** Fix finding 1 (workspace symbols) before merge. It is a small fix and a real regression against main.

**What I checked** (worktree untouched; mutation tests ran in a scratch copy at `…/scratchpad/review-lens-hardened/tree`):
- **Patch applies:** `lens-hardened.diff` applies cleanly to HEAD da5189bb and to main's current working tree. It contains no `/Users/` paths.
- **Patch is one test behind the worktree:** the worktree has an extra test in `display.test.ts` ("agrees with the lexer and the index when a backtick phrase swallows the apposition"). Regenerate the diff.
- **LSP suite:** 261 passed, 1 failed. The failure is the known `form-context` test.
- **VS Code suite:** 14 of 14 pass. The extension typecheck exits 0.
- **`npm run build`:** only the 8 known errors in `expression-charge.test.ts`.
- **Mutation checks**, each caught by the new tests:
  - Ignoring the `}` on the header line: 1 test fails (one-line wonder).
  - Removing the nested `?[` break: 1 test fails.
  - Removing the apposition filter in `coOccurrences`: 2 tests fail.
  - Dropping `hoverWonder`: 15 tests fail.
  - Forcing a fresh lex in `sourceTokens`: all 25 still pass, so the index-token path and the fresh-lex path agree.

**Earlier findings 1–10**
- **1–3: addressed.**
  - 1: the extension typecheck passes.
  - 2: the reading now reaches the tree through `annotationLabel`.
  - 3: phase rows come from `bucketByPhase`, and a test checks they sum to the whole.
- **4: addressed for wonders with a `{` body** (header-line tail, one-line wonders, nested wonders). The indented form without a brace is still open; see finding 2 below.
- **5: addressed for every consumer that reads the index.** Appositions get their own map, `appositionsByName`, and stay out of co-occurrence, completion and the directory hover. Handlers that read names with a line regex are still open; see finding 3.
- **6: mostly addressed.** The display.ts scanner is gone, and `display.ts` drops from 1461 to 1326 lines. Two small paren balancers are new; see finding 5.
- **7, 8, 9: addressed, each with a test.**
- **10: partly addressed.** The new `annotation-kinds` module is tested. The client name-map exclusion and the concepts-tree co-occurrence filter have no tests.

**Findings, most severe first:**
1. **Medium: readings crowd lens topics out of workspace symbols** (`packages/spw-lsp/src/server-index.ts:712`, `packages/spw-lsp/src/handlers/display.ts:900-905`).
   - `searchAnnotations` matches every reading named `lens` by its name, and `slice(0, 40)` cuts in index order.
   - Live corpus, query "lens":
     - main: 32 symbols, including all 12 `lens` topic and particle entries
     - worktree: 49 symbols, of which 39 are readings, 1 is a topic and 9 are other kinds; only 1 of the 12 survives
   - Synthetic repro (`review-lens-hardened/sym-probe.mts`): 41 files of readings plus one `#:lens` file returns 40 symbols, none of them `#:lens`.
   - Fix: match appositions on their body only, or rank name matches of other kinds before the cap. Add a test.
2. **Low: a wonder without a brace reads its sibling's reading** (`packages/spw-lsp/src/handlers/wonder.ts:137-139`).
   - The indented-body check measures from column 0, not from the header's indentation.
   - Probe: `  ?["q1"] #:depth #!a` followed by `  ~#lens(sibling reading)` gives `**Lens:** sibling reading`.
   - This is new: the old code read the lens only from the `#:depth` line. The reach stops at the next `?[`.
   - The corpus has 18 such headers, mostly with a 1-space indent, where the body comes out empty.
3. **Low, already true on main: some handlers still read `~#lens(` as `#lens`.** This contradicts the claim in the doc comment at `server-index.ts:176-181`.
   - `spw-probes.ts:231` (resonance, source side). The new test at `spw-probes.test.ts:89` locks in an edge from a file that holds only readings to the `#:lens` file.
   - `navigation.ts:226` (references).
   - `display.ts:1235` (documentHighlight). Probe: highlighting `~#lens(a)` also marks `#:lens` on another line.
   - `navigation.ts:353` (rename): renaming `#:lens` rewrites every `~#lens(` reading.
   - Either narrow the doc comment, or make those regexes skip `~#name(` in a follow-up.
4. **Nit (craft):**
   - `server-index.ts` grows from 1237 to 1342 lines (+105) in a file already over the 600-line guard. The new helpers at `:1090-1130` (`normalizeReading`, `readAppositionToken`, `annotationFromApposition`, `isClosedApposition`, `annotationLabel`), plus the newly exported `escapeMarkdownInline` at `:165`, belong in a small `apposition.ts`.
   - `display.ts` is now at 12 imports, the limit.
   - The new files and the other touched files are fine: `wonder.ts` is 355 lines with 4 imports, `semantic-tokens.ts` is 455 lines, and both tree views shrank.
5. **Nit (duplicate scanners):** `semantic-tokens.ts:72` (`appositionAt`) and `server-index.ts:1117` (`isClosedApposition`) each re-derive the paren balance that the seed's `lexer/matchers/apposition.ts` already computes. Having `appositionParts` return `closed` would remove both. After an unclosed backtick, the painter still paints `~#lens(…)`, while the lexer, the index and the hover see nothing.
6. **Nit (duplicate tables):** the client's `annotationLabel` and `KIND_PREFIX` (`extensions/vscode-spw/src/views/annotation-kinds.ts:20,30`) duplicate the server's `annotationLabel` and `BRAID_PREFIX` (`server-index.ts:1127,1077`). They could live in `workspace-protocol.ts`, which the client already imports.
7. **Nit (wire):**
   - `spw/annotations` records now carry `kind: 'apposition'` and `body`, because `stdio-server.ts:336` spreads each entry.
   - A client built before this patch would reject the whole payload. That is acceptable, because the server is bundled with the extension.
   - `docs/runtime/md/lsp-editor-integration.md:48` does not mention the new kind or field.

**Cost: I re-ran one main/worktree pair** (`review-lens-hardened/index-{main,wt}.json`).
- **The run was not clean:**
  - Load average was 150–300 during the main side and 10–100 during the worktree side.
  - The corpus changed during the run (747 → 759 files) because the cache writers are active, so the two sides scanned different corpora.
  - The scan times (889 s vs 350 s) tell us nothing, and the earlier runs already spread from 62 to 120 s on each side.
- **Per-request medians on documents that did not change:**

  | Request | main (ms) | worktree (ms) | Note |
  |---|---|---|---|
  | `hover.wonderHeader` | 0.149 | 0.921 | earlier runs: 0.12–0.14 → 0.52–0.99 |
  | `inlayHints.wonderDoc` | 0.279 | 0.322 | |
  | `inlayHints.bigDoc` | 0.818 | 1.014 | |
  | `semanticTokens.bigDoc` | 5.03 | 6.79 | |
  | `workspaceSymbols.lens` | 10.5 | 15.0 | the corpus differs between sides |

- **The earlier per-request numbers are plausible:** under a millisecond per hover, and roughly 10–35% added to the token painter.
- **The `wonderHeader` row compares different work:** on main, the form-geometry hover answers that position, not the wonder hover.
- **The implementer's `run2/index-main-1.json` is still empty.** Before comparing scans in that run, check that `scan.files` is the same on both sides.