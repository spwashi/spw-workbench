# Fix: spw-cli-overhaul-runtime-regressions

## Failures

| # | File | Test/Error | Class | Priority |
|---|---|---|---|---|
| 1 | `src/runtime/__tests__/run-spw.test.ts` | semantic frames expected absent after interpreter began preserving body geometry | stale-spec | P2 |
| 2 | `src/runtime/__tests__/spw-workspace-navigation.test.ts` | select JSON object treated as a bare array | stale-spec | P1 |
| 3 | `src/runtime/__tests__/pulse-write.test.ts` | mutate invoked with pulse-only geometry arguments | stale-spec | P1 |
| 4 | `src/runtime/__tests__/pulse-write.test.ts` | beat invoked without a count and timed out | regression | P1 |

## Diagnosis

The public router correctly sends `pulse`, `mutate`, and `beat` to distinct command
contracts. The integration test instead applied the pulse geometry contract to all
three commands, causing mutate to emit no JSON and beat to enter its documented
unbounded cadence loop. Two adjacent assertions also described older output shapes:
`select --format=json` returns an object with `matches`, and interpreted body
geometry now survives as register semantic-frame metadata.

## Planned Fixes

### Commit 1: `![cli] — align runtime integration tests with routed command contracts`

- Assert the semantic frame and select envelope shapes that the runtime publishes.
- Exercise pulse with pulse geometry arguments, mutate through its help surface, and
  beat with a bounded one-tick JSON invocation.
- Ripple risk: low; tests only.
- Confidence: high; each corrected assertion follows the command's existing public
  help or output implementation.

## Deferred

No production behavior changes are required for these failures.
