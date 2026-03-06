# Common Tasks Guide

Step-by-step instructions for tasks all contributors need to do. This guide applies regardless of your persona (researcher, engineer, or hobby coder).

## Running Tests

### Watch Mode (DOM Feedback)
The current rewrite snapshot exposes a watch loop for the DOM suite.

```bash
npm run test:dom:watch
```

What to expect:
- DOM-targeted tests run in a watcher
- Changes to files trigger re-runs automatically
- Press `q` to quit
- Use `npm run test:runtime` for the runtime suite when you want a single fast pass

### Single Run (CI/Before PR)
Run tests once and get results. Use this before committing.

```bash
npm run test:run
```

What to expect:
- All tests run once
- Shows coverage summary
- Exit with pass/fail code
- Use this before creating a PR

### Run Specific Test File
Test a single file without running the whole suite:

```bash
# Run runtime tests for a specific file
npm run test:runtime -- src/runtime/__tests__/register-bank.test.ts

# Run DOM tests for a specific file
npm run test:dom -- src/dom/__tests__/dom-smoke.test.ts

# Run tests matching a pattern
npm run test:runtime -- -t "phase"
```

### Reading Test Output
```
PASS  src/ui/__tests__/button.test.ts
  ✓ renders with label (15ms)
  ✓ emits click event (8ms)

Tests: 2 passed, 2 total
Coverage: 95% statements, 92% branches, 100% functions
```

✅ Green = All tests pass
❌ Red = Tests failed

---

## Building the Project

### TypeScript Build Gate
Checks the TypeScript surface without emitting a bundle.

```bash
npm run build
```

What it does:
1. **TypeScript check** — Verifies all types are correct
2. **No emit** — Confirms the repo typechecks without producing build artifacts

Use this before:
- Creating a PR
- Checking if your types are correct

### If Build Fails

**TypeScript errors?**
```
ERROR in src/ui/button.ts(45,12):
TS2322 Type 'string' is not assignable to type 'number'
```

→ Go to the file and line, fix the type mismatch

**Module not found?**
```
ERR! Cannot find module '@/lang'
```

→ Check that the import path matches an actual export in `src/lang/index.ts`

**Circular dependency?**
```
ERR! Circular dependency detected: a.ts -> b.ts -> a.ts
```

→ One file is importing the other; break the cycle

---

## Linting and Audit Surfaces

### Repo Validation
Run the current local validation surface for canon docs and `.spw` syntax.

```bash
npm run lint
```

What it does:
- `npm run lint:spw` — parse-validates `.spw` files through the real parser
- `npm run lint:docs` — runs the Writerside/doc reference checks

Useful subcommands:

```bash
npm run lint:spw
npm run lint:docs
npm run lint:docs:strict
```

### Audit Inventory
Use the truthful `audit:*` names when you want inventory rather than pass/fail validation.

```bash
npm run audit                  # Marker inventory
npm run audit:markers:json     # Machine-readable marker report
npm run audit:markers:md       # Markdown marker report
npm run audit:ui:selectors     # UI selector/data-attribute counts
npm run audit:ui:context-panel # Context panel mention counts
npm run audit:spw:syntax       # `.spw` syntax audit (alias of lint:spw)
```

Legacy aliases such as `audit:json`, `audit:md`, `audit:types`, and `audit:ui-selectors` remain available, but the `audit:markers:*`, `audit:ui:*`, and `audit:spw:*` names are the contract going forward.

---

## Committing Code

### Before Committing

1. **Check what changed**
```bash
git status
```

Shows files that are modified, added, or deleted.

2. **Review your changes**
```bash
git diff
```

Shows exactly what changed in each file. Use arrow keys to scroll, `q` to exit.

3. **Run all checks**
```bash
npm run build && npm run test:run && npm run lint && npm run audit:markers:json
```

If all pass ✅, you're safe to commit.

### Commit Format

Use the repo’s sigil-based format, not conventional `scope: description` commits.

Common patterns:
- `.[scope] — docs / plan / canon updates`
- `#[scope] — contract or spec changes`
- `&[scope] — integration or wiring`
- `vocab[scope] — naming / type / contract alignment`
- `![scope] — verification or test coverage`

**Examples:**
```bash
git commit -m ".[plans] — refresh audit-fuzz roadmap"
git commit -m "#[audit] — define truthful audit/fuzz contract and package script map"
git commit -m "&[marker] =extend[extraction-seed-contracts] — retag pilots and update craft skill"
```

Every commit body must include exactly one `#[episode]{ ... }` block, and the pre-commit gate requires human authorization before the commit is accepted.

**Minimal pattern:**

```bash
git commit -m "#[audit] — define truthful audit/fuzz contract and package script map" -m $'#[episode]{\n  title = `Audit contract`\n  why = `Make script names match reality`\n  exhibits = #[\n    `package.json`\n  ]\n}'
```

### Create the Commit
```bash
git add package.json docs/contributing/md/common-tasks.md
git commit -m "#[audit] — define truthful audit/fuzz contract and package script map" -m $'#[episode]{\n  title = `Audit contract`\n  why = `Make audit and fuzz script names match their actual checks`\n  exhibits = #[\n    `package.json`\n    `docs/contributing/md/common-tasks.md`\n  ]\n}'
```

Or add all changes:
```bash
git add .
git commit -m "#[scope] — description" -m $'#[episode]{\n  title = `Episode title`\n  why = `Why this change exists`\n  exhibits = #[\n    `path/to/file`\n  ]\n}'
```

---

## Creating Pull Requests

### Before Opening PR

1. **Push your branch**
```bash
git push origin my-feature-branch
```

2. **Verify everything passes**
```bash
npm run build && npm run test:run && npm run lint && npm run audit:markers:json
```

### Open the PR

Go to GitHub and click "Open a pull request"

**PR Title:**
Use the same sigil-based format as commits.

```
.[plans] — refresh audit-fuzz roadmap
#[audit] — define truthful audit/fuzz contract and package script map
&[marker] =extend[extraction-seed-contracts] — retag pilots and update craft skill
```

**PR Description:**

Use this template:

```
## Problem
What problem does this solve? What's the motivation?

## Changes
What did you change? List the main modifications.

## Testing
How can someone verify this works?
- [ ] Manual testing in dev server
- [ ] All tests passing (npm run test:run)
- [ ] Local validation passing (npm run build && npm run test:run && npm run lint)

## Affected Domains
Which domains changed? (e.g., ui/, runtime/, docs/)
```

**Example:**
```
## Problem
Users can't easily copy code snippets from the REPL

## Changes
- Added CopyButton component in src/ui/components/
- Integrated with clipboard API
- Added comprehensive tests

## Testing
- Run npm run test:run and verify copy-button.test.ts passes
- Manual: click button, paste elsewhere to verify content

## Affected Domains
- ui/ (new component)
```

### Respond to Review

Reviewers might ask questions or request changes. You can:

1. **Make changes** — Edit files, commit, push (updates PR automatically)
2. **Discuss** — Reply in comment thread to clarify

For fixes:
```bash
# Make changes
git add .
git commit -m "&[scope] — address review feedback" -m $'#[episode]{\n  title = `Review follow-up`\n  why = `Respond to requested changes`\n  exhibits = #[\n    `path/to/file`\n  ]\n}'
git push origin my-feature-branch
# PR automatically updates
```

---

## Understanding TypeScript Errors

### Common Error Types

**Type Mismatch**
```
Type 'string' is not assignable to type 'number'
```
→ You're passing wrong type to function

**Missing Property**
```
Property 'label' is missing in type '{}' but required in 'ButtonProps'
```
→ You forgot to provide a required property

**Cannot Find**
```
Cannot find name 'foo'. Did you mean 'Foo'?
```
→ Variable doesn't exist or is wrong case

**Import Error**
```
Module '@/fake' has no exported member 'Bar'
```
→ Either the module doesn't exist or doesn't export that name

### How to Fix

1. **Read the error message** — It tells you exactly what's wrong
2. **Check the line number** — Go to that file and line
3. **Look at the type** — Figure out what type is expected vs. provided
4. **Fix the code** — Usually obvious once you understand the issue

Example:
```typescript
// ❌ ERROR: Type 'string' is not assignable to type 'number'
const count: number = "5";

// ✅ FIX: Convert to number
const count: number = 5;
```

---

## Fuzz Profiles (Current Rewrite Surface)

The truthful `fuzz:*` surface is currently stage-based and local-only. Use these names as the supported contract while deeper per-lens runners are rebuilt.

```bash
npm run fuzz:explore
npm run fuzz:stabilize
npm run fuzz:ship
npm run fuzz:all
```

Common stage aliases:
- **fuzz:explore** — runtime test surface (`npm run test:runtime`)
- **fuzz:stabilize** — typecheck + runtime tests
- **fuzz:ship** — build gate + full test run
- **fuzz:all** — current alias of `fuzz:ship`

Single-dimension lenses:
- **fuzz:types** — TypeScript compile surface
- **fuzz:runtime** — runtime Vitest suite

Compatibility aliases such as `fuzz:complexity`, `fuzz:dead`, `fuzz:naming`, `fuzz:async`, and `fuzz:boonhonk` still exist in this snapshot, but they do **not** yet represent dedicated analyzers. Treat them as transitional until the audit-fuzz rewrite lands the real runners.

---

## Measuring Token Efficiency

There is no dedicated `measure-tokens` script in the current rewrite snapshot.

For a quick size/signal check, use:

```bash
git diff --stat
npm run audit:markers:json
npm run build
```

---

## Using the Spw Dev Loop

The rewrite snapshot does not expose a generic browser dev-server script. The live local loop that **is** available is the `.spw` watcher:

```bash
npm run spw:dev
```

What it does:
- Watches the `.spw/` tree
- Canonicalizes changed `.spw` files
- Re-parses them and reports token/error counts

Stop it with `Ctrl+C`.

---

## Running Specific Tests

### By File
```bash
npm run test:runtime -- src/runtime/__tests__/register-bank.test.ts
```

### By Pattern
```bash
npm run test:runtime -- -t "phase"
```
Runs runtime tests with "phase" in the name.

### By Domain
```bash
npm run test:dom -- src/dom/__tests__/
```
Runs DOM tests in a directory.

### Verbose Output
```bash
npm run test:run -- --reporter=verbose
```
Shows each test name and time.

---

## Checking Canon and Spec Surfaces

Before every commit:

```bash
npm run lint
npm run lint:docs:strict
```

When you touch the `v0.2.0-alpha` library architecture specifically, run:

```bash
npm run lint:v020:architecture
```

---

## Checking Code Coverage

See test coverage (what percentage of code is tested):

```bash
npm run test:run -- --coverage
```

Output:
```
Statements   : 89.5%
Branches     : 83.2%
Functions    : 91.7%
Lines        : 89.1%

Files with low coverage:
  - src/ui/button.ts: 65%
  - src/runtime/eval.ts: 70%
```

**Goal:** Aim for >80% coverage on new code.

---

## Quick Checklist Before PR

Copy and use this before opening a PR:

```bash
# 1. Run all tests
npm run test:run
# ✅ All tests should pass

# 2. Check types
npm run build
# ✅ Should complete without errors

# 3. Validate canon/docs
npm run lint
# ✅ Should complete without parser/docs failures

# 4. Capture audit inventory
npm run audit:markers:json
# ✅ Should emit machine-readable inventory

# 5. Commit
git add .
git commit -m "#[scope] — description" -m $'#[episode]{\n  title = `Episode title`\n  why = `Why this change exists`\n  exhibits = #[\n    `path/to/file`\n  ]\n}'

# 6. Push
git push origin branch-name
```

If everything ✅, open the PR!

---

## Troubleshooting

### "npm run spw:dev" won't start
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm run spw:dev
```

### Tests are timing out
```bash
# Increase timeout for long-running tests
npm run test:run -- --testTimeout=10000
```

### Build is very slow
```bash
# Time the core gates directly
time npm run build
time npm run test:run
```

### Can't find module errors
```bash
# Check the import path in src/<domain>/index.ts
cat src/ui/index.ts | grep 'export'

# Make sure you're importing from barrel exports, not deep paths
# ❌ import Button from '@/ui/components/button'
# ✅ import { Button } from '@/ui'
```

### Changes not showing in the Spw dev loop
```bash
# Restart the watcher
npm run spw:dev
```

---

## Next Steps

1. Pick a task from this guide
2. Follow the step-by-step instructions
3. If you get stuck, check the troubleshooting section
4. Open an issue if something doesn't work

**Back to:** [Contributing Guide Hub](README.md)
