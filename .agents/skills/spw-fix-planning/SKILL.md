---
name: spw-fix-planning
description: >
  Plan a fix for failing tests or UI regressions before writing any code.
  Triage failures, classify root causes, predict ripple, draft fix commits,
  and write a FIX.md in .agents/plans/<slug>/. Use when responding to test
  failures, build regressions, or UI bug reports.
---

# Skill: spw-fix-planning

## When to Use

Use this skill when you encounter **broken state** in tests or UI and need
to plan a remediation before diving into code.

Triggers:
- Test suite reports failures (vitest, jest, playwright)
- `tsc --noEmit` reports type errors
- User reports a visual regression or interaction bug
- CI pipeline fails on a pull request
- An audit skill surfaces broken invariants

---

## Instructions

### Step 1: Collect evidence

Run the failing suite with verbose output. Capture:
- **Exact error messages** (assertion text, stack traces)
- **File + line** of each failure
- **Pass/fail summary** (e.g. `406 passed, 8 failed / 414`)

Do **not** start editing code yet.

### Step 2: Classify each failure

For every failure, assign a **root cause class**:

| Class | Description | Example | Suggested Fuzz Lens |
|---|---|---|---|
| `stale-spec` | Test expects old behavior that was intentionally changed | Renamed type, removed field | `fuzz:stabilize` |
| `missing-impl` | Feature not yet implemented but test was written optimistically | `<>` couple operator | `fuzz:stabilize` |
| `regression` | Previously passing code now fails due to a recent change | Broken import path | `fuzz:ship` |
| `env` | Environment issue (permissions, missing dep, flaky timing) | `EPERM` on node_modules | `fuzz:explore` |
| `type-drift` | Types changed upstream and downstream consumers are stale | `null` vs `undefined` | `fuzz --profile=types+async` |
| `ui-visual` | Visual regression — layout, color, animation broken | Overflow, z-index | `fuzz --profile=runtime+complexity --level=warn` |
| `ui-interaction` | Interaction regression — click, focus, keyboard broken | Event handler missing | `fuzz --profile=runtime+async` |
| `axis-collapse` | Fix inadvertently neutralizes a deformation axis (e.g., replaces swing curve with `ease-in-out`) | Genre-scoped timing flattened | `fuzz:boonhonk` |

### Step 3: Triage priority

Assign each failure a priority:

| Priority | Criteria | Action |
|---|---|---|
| **P0** | Blocks other developers or CI | Fix immediately |
| **P1** | Breaks user-facing functionality | Fix in this session |
| **P2** | Test hygiene, cosmetic, or speculative tests | Fix when convenient |
| **P3** | Known limitation, deferred feature | Document and skip |

### Step 4: Predict fix scope

For each fix, predict:
- **Files touched** — which files need edits
- **Ripple risk** — could this fix break other things? (low / medium / high)
- **Confidence** — how certain is the diagnosis? (high / medium / low)

**Guard rails:**
- If ripple risk is `high`, write the fix in a feature branch
- If confidence is `low`, add a diagnostic step before the fix (console.log, debugger, minimal repro)
- If the fix touches > 5 files, consider splitting into multiple commits

### Step 5: Draft fix commits

Use the project's commit sigil conventions:

| Sigil | Use for |
|---|---|
| `![scope]` | Test fix / verify |
| `&[scope]` | Integration fix |
| `vocab[scope]` | Type / naming fix |
| `.[scope]` | Documentation fix |

Order commits by dependency: types → logic → tests → wiring.
Each commit should leave the build passing.

### Step 6: Write FIX.md

Create `.agents/plans/<slug>/FIX.md` with:

```markdown
# Fix: <slug>

## Failures

| # | File | Test/Error | Class | Priority |
|---|---|---|---|---|
| 1 | path/to/test.ts | "expected X to be Y" | stale-spec | P2 |

## Diagnosis

Brief explanation of root cause per failure group.

## Planned Fixes

### Commit 1: `![scope] — description`
- File changes
- Ripple risk: low/medium/high

## Deferred

Items intentionally not fixed and why.
```

### Step 7: Execute and verify

After each fix commit:
1. Run `tsc --noEmit` — must pass
2. Run relevant test file — failures should decrease
3. Run a scoped fuzz pass matching the failure class
4. Run full suite — no new failures introduced

Recommended command shape:
```bash
npm run fuzz:stabilize --target=<changed-path-or-domain>
# or
npm run fuzz --profile=types+async --target=<changed-path-or-domain>
```

### Step 8: Update wip.spw (if exists)

If a `wip.spw` exists for the parent feature, append stream entries:
```
>>[timestamp] fix — resolved N test failures in <scope>
```

---

## Output Checklist

- [ ] Evidence collected (error messages, file:line, pass/fail counts)
- [ ] Each failure classified (root cause class)
- [ ] Priority assigned (P0–P3)
- [ ] Fix scope predicted (files, ripple risk, confidence)
- [ ] Fix commits drafted using project sigils
- [ ] FIX.md written (or inlined if ≤3 failures)
- [ ] Each commit verified (tsc + test)
- [ ] Scoped fuzz profile run for each failure class/group
- [ ] No new failures introduced

---

## Integration with Other Skills

| Situation | Also use |
|---|---|
| Fix involves type changes | `spw-typescript-affordances` |
| Fix involves UI layout / containment | `spw-ui-containment-audit` |
| Fix involves CSS / DOM behavior | `spw-css-dom-lab` |
| Fix touches naming / layering | `spw-craft-quality` |
| Ready to commit | `spw-commit-review` |
| Fix reveals missing feature | `spw-feature-planning` |

---

## Differences from spw-feature-planning

| Concern | Feature Planning | Fix Planning |
|---|---|---|
| Starting point | Blank slate / user request | Broken state / failing tests |
| Goal | Design a new capability | Restore correctness |
| Key artifact | PLAN.md + wip.spw | FIX.md (lighter weight) |
| Commit ordering | Dependency-first | Severity-first |
| Taste focus | Improving design quality | Minimal footprint, no regressions |
| Scope control | Predict affected files | Predict ripple risk |
