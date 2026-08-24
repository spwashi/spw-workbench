# Fix: spw-syntax-warning-cleanup

Restore a warning-free source corpus without hiding malformed structured surfaces or treating intentional prose as successfully parsed structure.

## Evidence

`npm run lint:spw` on `main@f01a1d4c` reports 381/381 files passing with 57 warnings. One warning belongs to an ignored `.spw/gen/session/` corpus memo present only in the main worktree; the committed source baseline is 56 warnings.

| # | Failure group | Count | Representative evidence | Class | Priority |
|---|---|---:|---|---|---|
| 1 | Dialect detection reads indented `@dialect:Spw.l` examples as file pragmas | 2 | syntax-profile stack surfaces preprocess to three tokens and degrade at EOF | regression | P1 |
| 2 | `#label:` / `?label:` binding keys are claimed as inline prose before the colon can bind | 3+ | prompt facets close early at `}` | regression | P1 |
| 3 | Structured blocks contain syntax the parser cannot currently own | 40+ | block scalar `|`, bare comparison `>`, prose `+`, path sugar, colon/list ambiguity | stale-spec | P2 |
| 4 | Legacy machine frames use discouraged `^"…"` spelling | 3 | machine-profile soft lint | stale-spec | P2 |
| 5 | Ignored session products are included in source-corpus validation | 1 environment-dependent | `.spw/gen/session/corpus-memo/*.spw` | env | P2 |

All 54 prose-degradation warnings are recoverable parser fallbacks, but they erase structured AST visibility for the affected file. The three machine-profile warnings are spelling guidance. There are no hard parse errors.

## Diagnosis

1. `detectDialect()` scans the first 4096 bytes for free `@dialect:` text. Example payloads therefore retune the whole surface and newline preprocessing lets a leading `//` comment consume the file.
2. `operationNode()` reads line payloads for `#` and `?` before `expressionNode()` can observe a following colon. A binding such as `#voice_hospitable: .{...}` becomes prose, so its first inner `}` is mistaken for the enclosing close.
3. The remaining warnings need construct-level triage. Prefer a small parser repair only when multiple canonical surfaces clearly teach the same syntax. Otherwise revise the surface to an already-supported, more legible spelling. Do not globally suppress prose-degradation warnings.
4. `.spw/gen/session/` is a declared derived product plane and should not participate in source validation.

## Planned Fixes

### Commit 1: `![spw-seed] — constrain dialect and binding lookahead`

- Add header-scoped dialect detection tests, including indented example negative controls.
- Preserve `#name:` and `?name:` for binding parsing instead of line-prose capture.
- Add parser regression tests for sequential facet bindings.
- Files: `packages/spw-seed/src/dialect/detect.ts`, dialect/parser tests, and only directly required grammar code.
- Ripple risk: high; confidence: high.

### Commit 2: `![spw-corpus] — repair degraded canonical surfaces`

- Run targeted prefix/trace diagnostics for each remaining warning.
- Fix shared parser gaps only when the notation is already taught or repeated.
- Otherwise quote prose, normalize legacy frames, or use supported structured values while preserving meaning and archival intent.
- Split corpus commits by coherent syntax family if more than five files remain.
- Ripple risk: medium; confidence: medium. Diagnostic trace precedes edits.

### Commit 3: `![spw-lint] — validate only source-owned Spw surfaces`

- Exclude `.spw/gen/` derived products from source-corpus collection.
- Add a collector regression test or an equivalent observable boundary assertion.
- Run strict corpus validation and the full seed/LSP/CLI suites.
- Ripple risk: low; confidence: high.

## Verification

- Warning count decreases after every fix group and reaches zero for committed sources.
- `npm run lint:spw -- --strict`
- focused seed dialect and grammar tests
- `npm run build`
- `npm run test:seed`
- `npm run test:lsp`
- scoped stabilization/ship fuzz passes for parser changes
- strict staged commit review

## Deferred

- No warning category is intentionally deferred.
- Parser support for a genuinely new syntax form will be planned separately if the corpus does not already establish a stable convention.
