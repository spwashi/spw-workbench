# Fix: vscode-archive-command-surface

## Failures

| # | File | Test/Error | Class | Priority |
|---|---|---|---|---|
| 1 | `scripts/release/smoke-vscode-extension.mjs:127` | `Command palette contributions do not match the reviewed public surface.` | stale-spec | P0 |

## Diagnosis

The packaged VS Code manifest contains four implemented and registered commands added after the smoke test's reviewed allowlist: `spw.showSurfaceProfile`, `spw.showFlowProtocol`, `spw.showGeometricResonance`, and `spw.showProbeMeasure`. The extension build and focused tests pass; the release archive fails because the static public-surface receipt was not advanced with the manifest.

## Planned Fixes

### Commit 1: `![vscode,release] — align archive smoke with the public command surface`

- Add the four manifest-and-source-backed commands to the reviewed expected surface.
- Rename the assertion copy from “command palette” to “command contributions”; the check evaluates `contributes.commands`, not `menus.commandPalette`.
- Re-run the VS Code build/tests and extracted-archive smoke.
- Ripple risk: low.
- Confidence: high.

## Deferred

- Do not derive the expectation from the manifest under test; the static list is an intentional independent review receipt.
- Do not change command behavior, titles, menus, or activation semantics in this fix.

## Resolution

- The reviewed list now includes all four manifest-and-source-backed commands.
- `npm run build:vscode`, `npm run test:vscode`, and `npm run bundle:extensions -- --skip-build` pass.
