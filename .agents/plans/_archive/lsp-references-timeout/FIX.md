# Fix: lsp-references-timeout

## Failures

| # | File | Test/Error | Class | Priority |
|---|---|---|---|---|
| 1 | `scripts/lsp/smoke-navigation.ts` | `timeout waiting for textDocument/references` on `references — path ref (~"...")` | `regression` | P1 |
| 2 | `scripts/lsp/smoke-navigation.ts` | `timeout waiting for textDocument/references` on `references — @root path ref` | `regression` | P1 |

## Diagnosis

- The failure is intermittent: `npm run lsp:smoke` failed twice earlier on the two references probes, then passed on the next run.
- The hot path in `scripts/lsp/handlers/navigation.ts` rescans the full workspace on each path-reference lookup: collect `.spw` files, read matching files, run `selectPathRefs()`, then resolve every candidate hit back to an absolute path.
- The smoke client uses a fixed `5000ms` request timeout in `scripts/lsp/smoke-navigation.ts`. Cold workspace scans plus repeated path resolution can exceed that window, so the references capability looks flaky even when it eventually completes.

## Planned Fixes

### Commit 1: `&[lsp] =bound[reference-search] — narrow candidate scans and seed the current hit`
- Derive tighter search needles from the raw target, requested basename, resolved basename, and root alias.
- Include the current occurrence in the references result immediately so path-ref queries never fail empty on the source site.
- Keep the workspace scan, but skip files and candidate hits that cannot plausibly match the resolved target.
- Ripple risk: low

### Commit 2: `![lsp] =verify[references-timeout] — harden smoke expectations`
- Keep the smoke path explicit about the references probes and verify the tightened search still returns results.
- Raise the references-specific smoke timeout to `10000ms`, because the workspace-wide search can legitimately exceed the old `5000ms` budget on a cold run.
- Ripple risk: low

## Deferred

- Broader LSP performance work outside references (hover, workspace symbols, diagnostics) is not part of this fix.
- Semicolon syntax support is unrelated to the LSP timeout and remains deferred.
