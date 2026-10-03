## report

{
  "id": "fragnav",
  "patch": "<scratchpad>/patches/fragnav-hardened.diff",
  "worktree": ".claude/worktrees/wf_7b1587d2-205-2",
  "note": "When I started, the worktree already held the hardened references change byte-for-byte; it matches the fragnav-hardened.diff from the Oct 1 run. I checked it, proved the new test catches the old bug, re-ran the tests and the cost probes, and rewrote the patch. The patch is unchanged and nothing is committed.",
  "files_changed": [
    "packages/spw-lsp/src/handlers/navigation.ts (+29/-8)",
    "packages/spw-lsp/src/__tests__/fragment-navigation.test.ts (+262/-5)"
  ],
  "findings_addressed": [
    {
      "finding": "The references handler still used stripAnchor(resolved) (reviewer cited ~:191 and ~:221)",
      "how": "navigation.ts:193 now uses `const targetPath = fileOf(resolved, hit.target)`. navigation.ts:223 now uses `if (fileOf(candidateResolved, candidate.target) !== targetPath) continue`. Each side removes only its own exact `#fragment` suffix, so a `#` in a directory name survives.",
      "test": "fragment-navigation.test.ts:286-351, 'references — anchored citations compare by file'. Fixtures: c#lab/{aberrations,index,peer,coma}.spw and a sibling c#dev/{aberrations,index}.spw. Expected matches are the citing ref, peer:0 (no anchor) and peer:1 (a different anchor in the same file). The test excludes coma.spw and the c#dev copy.",
      "discrimination": "I temporarily put stripAnchor back in only lines 193 and 223. The test then fails ('expected [ …(5) ] to deeply equal [ …(3) ]', 1 failed and 16 passed); every candidate under c#… collapses to the prefix `c`. I then restored the file, and git diff matched the hardened patch exactly."
    },
    {
      "finding": "Test hygiene: the c#lab directory was created inside an it() body",
      "how": "It is now created in the suite's beforeAll (test.ts:183-188)."
    },
    {
      "finding": "Test gap: extension-inferred targets and directory-plus-fragment targets had no tests",
      "how": "Added 'goes to the anchor when the resolver infers the extension' (`./aberrations#seidel_coma_abbe` lands on line 7). Added 'opens a directory target bare when it carries a fragment' (`./lenses#seidel_coma` gives the bare directory URI at line 0, and the link has no fragment)."
    },
    {
      "finding": "The other bug of the same class the reviewer named: display.ts:879 and the inlay hint at ~:1228",
      "how": "Not fixed, because it is outside navigation.ts. Listed under residual risks."
    },
    {
      "finding": "Self-check: remaining first-# splits inside navigation.ts",
      "how": "navigation.ts:22 `stripAnchor(hit.target)` in referenceSearchNeedles works on the raw target, not the resolved path. That matches the resolver's own first-# split at helpers.ts:203-207 and 238-243, so it is not this bug. reference-graph.ts:131 strips the target the same way, which is also consistent. Left as is."
    }
  ],
  "tests": {
    "fragment_file": "npx vitest --config vitest.lsp.config.ts run packages/spw-lsp/src/__tests__/fragment-navigation.test.ts: 17/17 pass in the worktree (main has 6 tests in this file).",
    "lsp_suite": "npx vitest --config vitest.lsp.config.ts run, 5 interleaved runs per side. Worktree: Test Files 1 failed | 20 passed (21), Tests 1 failed | 236 passed (237). Main: Test Files 1 failed | 20 passed (21), Tests 1 failed | 225 passed (226). The only failure on both sides is the known form-context.test.ts 'chains topic → @(topic) → $(topic) and rejects direct free → register'.",
    "build": "npm run build (npx tsc -p tsconfig.typecheck.json --noEmit): 8 errors on both sides, all in packages/spw-seed/src/grammar/expression-charge.test.ts. None are in the touched files."
  },
  "wire": {
    "lsp_methods": [
      "textDocument/definition -> navigation.definition (stdio-server.ts:259, definitionProvider at :211)",
      "textDocument/documentLink -> navigation.documentLinks (stdio-server.ts:264, documentLinkProvider {resolveProvider:false} at :215)",
      "textDocument/references -> navigation.references (stdio-server.ts:308, referencesProvider at :213)"
    ],
    "helpers": "fileOf (new, private, navigation.ts:57) and fragmentRange (navigation.ts:79) consume HandlerDeps.resolveReferencePath, which is helpers.ts:186 via stdio-server.ts:120. helpers.ts is unchanged.",
    "client": "VS Code extension (extensions/vscode-spw/src/extension.ts:73, LSP passthrough). Link targets now carry `#L<n>` on file URIs. There are no CLI commands and no ServerIndex changes."
  },
  "cost": {
    "conditions": "The machine was very heavily loaded during this run (load average 50 to 470, other agents running). Absolute times are dominated by noise. Quieter numbers from the Oct 1 probe of the identical code are given alongside.",
    "suite_ab": {
      "main_wall_s": [8.61, 9.44, 24.98, 24.78, 18.91],
      "main_median_s": 18.91,
      "wt_wall_s": [8.2, 13.64, 19.24, 21.15, 17.03],
      "wt_median_s": 17.03,
      "vitest_duration_median_s": {"main": 13.25, "wt": 11.76},
      "paired_wall_delta_wt_minus_main_s": [-0.41, 4.2, -5.74, -3.63, -1.88],
      "fragment_file_median_ms": {"main_6_tests": 284, "wt_17_tests": 1016},
      "oct1_quiet_reference": "wall median main 6.27s vs wt 6.33s; fragment file 122ms vs 366ms",
      "verdict": "No suite-level regression is measurable. The fragment test file adds about 0.25s when the machine is quiet; it uses real files and parses."
    },
    "build_wall_s": {"main": 34.6, "wt": 24.2, "note": "noise; error count is the same (8 vs 8)"},
    "index": "The patch does not touch ServerIndex. Indexing time and annotation, frame and document entry counts do not change.",
    "per_request_real_corpus": {
      "corpus_wide_oct1_486_files": "documentLinks gives 1729 links on both sides. Links with #L<n>: 0 to 3. Links with an encoded %23: 4 to 0. definition on the 5 anchored hits: 4 resolved on both sides; landed past line 0: 0 to 3; %23 URIs: 4 to 0.",
      "definition_anchored_hit_median_ms": {
        "quiet_oct1": "main 1.2-1.8 vs wt 80-100 (4.6 for the unresolved hit)",
        "loaded_now": "main 2-19 vs wt 360-740"
      },
      "documentLinks_median_ms": {
        "canon-mount.spw (3 anchored refs)": "quiet 2.85 to 212; loaded 20-22 to 1808-3741",
        "observable.spw": "quiet 0.69 to 74; loaded 1.9-2.2 to 432-539",
        "bias-product.spw (unresolved ref)": "about the same (4 vs 4; 19-20 vs 19-31)"
      },
      "where_the_time_goes": "fragmentRange is about 99% parse (cost/fragnav/v3-fragparse.json, under load): parse 298-710ms, read 1-12ms, resolveFragment under 1.1ms. Targets are 43-113 lines. The parse is not cached and repeats on every request.",
      "references": "Result counts match on both sides, [5,5,1,0,3]. The real corpus has no `#`-named directories, so the fileOf change does not alter references results there. Timing is noise-dominated: quiet medians 213-316ms (main) vs 195-387ms (wt)."
    },
    "code_size": {
      "navigation.ts": "465 -> 486 (+21), 6 import statements",
      "fragment-navigation.test.ts": "95 -> 352 (+257)",
      "craft_guard_600": "Neither file exceeds it."
    },
    "scripts": "<scratchpad>/cost/fragnav/ (ab-suite3.sh, ab-suite3b.sh, ab-suite3.out, navcost-lite.mts, v3-lite-*.json, v3-fragparse.json, v3-build-*.log; v2-* is the Oct 1 quiet baseline)"
  },
  "residual_risks": [
    "Uncached read and parse on every anchored ref, on every documentLinks and definition request. That is about 70-100ms per anchored ref on a quiet machine, so canon-mount.spw goes from 3ms to 212ms per link request. Suggested fix: memoize fragmentRange by (path, mtimeMs), or reuse serverIndex.getDocument(uri)?.parseResult for open targets. The second option would also fix the next risk.",
    "fragmentRange reads the target from disk, so unsaved edits in an open target buffer are not seen. Same-file `~\"#anchor\"` refs also read the disk copy.",
    "Same bug class outside navigation.ts, not fixed: display.ts:879, where hover path-peek passes the anchored `x.spw#anchor` to statKind, fs.readFile (~:961) and the serverIndex lookups; and display.ts:~1234, where the inlay hint does `resolved.replace(/#.*$/, '')`, a first-# split that cuts `c#lab/` short.",
    "fileOf is private to navigation.ts but encodes a contract that helpers.ts owns. It should move next to resolveReferencePath, or the resolver should return {file, fragment}.",
    "`#L<n>` on file URIs works in VS Code; other LSP clients may ignore it or take it literally.",
    "rootRef anchors (`@root/x.spw#a`) are cut off by the selector (spw-selector.ts:201) and still land on line 0.",
    "Corpus data found during probing: .spw/state/observable.spw:61 cites `../agent-surface.spw#defaults`, but that file has no `#>defaults` anchor, so the stale fragment lands on line 0. .spw/registries/bias-product.spw:23 `registries/dialect-spec.spw#…` does not resolve on either side.",
    "Pre-existing and not from this patch: the form-context.test.ts failure and the 8 tsc errors in expression-charge.test.ts."
  ]
}

## review

{
  "verdict": "approve-with-nits",
  "summary": "The patch is correct and I found no regressions. Each finding it claims to address is addressed, and I checked each one with a test that fails when the old code is put back. The new tests catch all three old-code variants I tried. The cost numbers are believable: my re-run shows the same direction and order of magnitude. The added latency is real but small for the current corpus, which has only 5 anchored refs. It comes from the existing fragmentRange code working for the first time: on main it always failed reading `x.spw#anchor` and fell back to line 0.",
  "verified": {
    "patch_identity": "The worktree's git diff matches fragnav-hardened.diff byte for byte. `git apply --check` succeeds on main 1aa1dc23, and packages/spw-lsp has not changed since the worktree base da5189bb.",
    "mutation_probes": "I ran these on scratch copies and left the worktree untouched. (1) Putting stripAnchor back at navigation.ts:193 and :223 gives 1 failed and 16 passed, 'expected [ …(5) ] to deeply equal [ …(3) ]', which is exactly what the implementer reported. (2) Using raw `resolved` in definition and documentLinks, which is main's behaviour, gives 12 failed. (3) Using a first-# split of `resolved` in definition and documentLinks makes the c#lab test fail (1 failed). The tests catch all three.",
    "edge_probes": "A same-file `~\"#inner\"` lands on line 2. A directory that has index.spw, cited with a fragment, goes to index.spw line 2, and its link ends in #L3. A directory with no index, cited with a fragment, opens bare (covered by the new test). The selector turns `@root/x.spw#a` into target 'x.spw', which confirms the rootRef residual risk.",
    "tests": "fragment-navigation.test.ts passes 17/17 (main has 6). Full LSP suite: the worktree has 236 passed and 1 failed (237); main has 225 passed and 1 failed (226). The one failure on both sides is form-context.test.ts, and it predates this patch.",
    "typecheck": "`tsc -p tsconfig.typecheck.json` reports 8 errors, all in packages/spw-seed/src/grammar/expression-charge.test.ts. The new test file is in typecheck scope and has no errors.",
    "craft": "navigation.ts is 486 lines with 6 imports. The test file is 352 lines. Both are under the 600-line limit.",
    "residuals_confirmed": "display.ts:879 passes `x.spw#anchor` to statKind, and fs.readFile at :961 then fails silently. display.ts:1234 does `resolved.replace(/#.*$/, '')`, a first-# split. Both are as the implementer reported."
  },
  "cost_rerun": {
    "conditions": "Load average was about 33. I ran navcost-lite.mts once on each side, back to back, against the 769-file corpus.",
    "main": "documentLinks: canon-mount 7.46ms, observable 1.46ms. definition on anchored hits: 1.47 to 3.16ms. Reference counts: [5,6,1,0,3].",
    "wt": "documentLinks: canon-mount 606.82ms, observable 120.23ms. definition on anchored hits: 108 to 183ms, and 4.54ms for the unresolved hit. Reference counts: [5,6,1,0,3], the same as main.",
    "parse_isolated": "A warm parse plus resolveFragment of dialect-spec.spw (57 lines) took 160 to 320ms, and comparison.spw (44 lines) took 105 to 160ms. That supports the claim that about 99% of the time is parsing.",
    "judgement": "This falls between the implementer's quiet numbers from Oct 1 (80-100ms) and their loaded numbers (360-740ms), so the claims are plausible."
  },
  "findings": [
    {
      "severity": "nit",
      "file": ".claude/worktrees/wf_7b1587d2-205-2/packages/spw-lsp/src/handlers/navigation.ts",
      "line": 79,
      "summary": "fragmentRange reads the file from disk and runs a full parse for every anchored ref on every request. documentLinks awaits these one at a time inside its loop (:146-156), so cost grows linearly with the number of anchored refs. For example, 30 anchored refs would take seconds on every documentLinks request.",
      "suggestion": "Use the anchor index the server already keeps: serverIndex.annotationsForFile(targetPath) with kind 'anchor' (server-index.ts:31 and :688). Its lines are 0-indexed and need no parse. Alternatively, memoize by (path, mtimeMs). At minimum, cache by targetPath within a single documentLinks call."
    },
    {
      "severity": "nit",
      "file": ".claude/worktrees/wf_7b1587d2-205-2/packages/spw-lsp/src/handlers/navigation.ts",
      "line": 81,
      "summary": "fs.readFile reads the saved file and skips the open buffer, so unsaved edits are invisible. This includes anchors in the same file as the ref.",
      "suggestion": "Read the text through deps.getDocumentText(deps.uriFromPath(targetPath)). It returns the open buffer first (helpers.ts:468) and is a one-line change."
    },
    {
      "severity": "nit",
      "file": ".claude/worktrees/wf_7b1587d2-205-2/packages/spw-lsp/src/handlers/navigation.ts",
      "line": 57,
      "summary": "The rule that the first `#` in a target starts the fragment is now written out in four places: fileOf (:57), fragmentOf (:41), stripAnchor (helpers.ts:324), and the resolver's two inline splits (helpers.ts:202-208 and :244-250). The test's hashOf (fragment-navigation.test.ts:46) is a fifth. These are not duplicate scanners, but they are four copies of one contract that helpers.ts owns.",
      "suggestion": "Add a single splitAnchor(target) -> {path, hash} in helpers.ts, or have resolveReferencePath return {file, fragment}. The implementer already lists this."
    },
    {
      "severity": "info-preexisting",
      "file": ".claude/worktrees/wf_7b1587d2-205-2/packages/spw-lsp/src/handlers/navigation.ts",
      "line": 212,
      "summary": "This is outside the patch and behaves the same on main. references misses citations without an extension when the citing ref names one. The candidate filter matches on substrings from referenceSearchNeedles (:20-38). When the citing ref is `./claims.spw#inner`, the citation `~\"./claims#top\"` in another file is dropped, because the needle 'claims.spw' does not appear in it.",
      "repro": "<scratchpad>/review-fragnav-probe/__tests__/edges.test.ts returns [cite:0, cite2:0] and is missing cite2:1."
    }
  ],
  "test_adequacy": "The tests are adequate. The tests that stub the resolver now return `path#fragment`, as the real resolver does, and there is a test that pins that resolver behaviour. The tests that use the real resolver cover the path relative to the citing file, the fallback relative to the workspace root, a missing extension, a directory with a fragment, 1-based #L links, and a `#` in a directory name. The references test checks the exact result set, so a wrongly included c#dev or coma.spw makes it fail. Untested: same-file `~\"#anchor\"` (my probe passes), and a directory with index.spw cited with a fragment (my probe passes).",
  "probe_artifacts": "<scratchpad>/review-fragnav-probe/ (handlers/nav_{refs_strip,defs_raw,defs_strip,orig}.ts, __tests__/frag_*.test.ts, __tests__/edges.test.ts, rev-lite-{main,wt}.json, parse-time.mts)"
}