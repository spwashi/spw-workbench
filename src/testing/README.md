# Headless testing infrastructure

Shared helpers for node-side Spw tests. Prefer these over ad-hoc `mkdtemp`,
`console` spies, and `process.exitCode` juggling.

## Modules

| Module | Use |
|--------|-----|
| `capture-stdio.ts` | Capture `console.log` / `error` / `warn` without a subprocess |
| `temp-workspace.ts` | Temp dirs with auto-cleanup and file layout helpers |
| `cli-harness.ts` | In-process `runHeadlessCli({ args })` → `{ exitCode, outText, errText }` |
| `runtime-harness.ts` | `runtime.success(source)` / `runtime.failure(source)` around `runSpw` |
| `dom-css-harness.ts` | jsdom CSS/DOM fixtures (`npm run test:dom`) |

Import from `src/testing` (or a relative path into this folder).

## Scripts

```bash
npm run test:harness   # this directory (node)
npm run test:headless  # seed + runtime + cli + harness
npm run test:dom       # jsdom DOM fixture only
npm run test:run       # headless + dom
```

## CLI exit codes

`@spwashi/spw-cli` exports `SpwExit` / `setExitCode` / `resetExitCode`:

| Code | Reason | Meaning |
|------|--------|---------|
| 0 | `ok` | Completed (including zero matches) |
| 1 | `assertion` | `--require-match` / `--check` failed |
| 2 | `usage` | Syntax or option / unknown command |
| 3 | `source` | Unreadable or strictly invalid source |
| 4 | `apply` | Refactor apply refused |

Handlers should call `setExitCode(...)` instead of `process.exit` so headless
runners can observe the code.

## Example

```ts
import { runHeadlessCli, withTempWorkspace, runtime } from '../../testing'
import { SpwExit } from '@spwashi/spw-cli'

const ok = runtime.success('!["hello"]')
expect(ok.runtime.traces.length).toBeGreaterThan(0)

await withTempWorkspace({ files: { 'a.spw': '@a\n' } }, async (ws) => {
  const result = await runHeadlessCli({ cwd: ws.root, args: ['help'] })
  expect(result.exitCode).toBe(SpwExit.ok)
})
```
