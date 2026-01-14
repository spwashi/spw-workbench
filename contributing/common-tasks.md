# Common Tasks Guide

Step-by-step instructions for tasks all contributors need to do. This guide applies regardless of your persona (researcher, engineer, or hobby coder).

## Running Tests

### Watch Mode (Live Feedback)
Perfect during development. Tests re-run as you edit files.

```bash
npm run test
```

What to expect:
- Tests run in a watcher
- Changes to files trigger re-runs automatically
- Press `q` to quit
- Great for iterative development

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
# Run tests for a specific domain
npm run test:run src/ui/__tests__/

# Run a specific test file
npm run test:run src/lang/__tests__/lexer.test.ts

# Run tests matching a pattern
npm run test:run -- --grep "button"
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

### Full Build (TypeScript + Vite)
Checks all TypeScript types, then builds optimized JavaScript.

```bash
npm run build
```

What it does:
1. **TypeScript check** — Verifies all types are correct; catches errors
2. **Vite build** — Optimizes for production; creates `dist/` folder

Use this before:
- Creating a PR
- Deploying to production
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

## Linting and Style

### Check Style Issues
Find code style problems without fixing them.

```bash
npm run lint
```

What to expect:
```
src/ui/button.ts
  45:12  error    'x' is assigned a value but never used
  67:1   warning  Line is too long (121 chars)

2 problems (1 error, 1 warning)
```

### Auto-Fix Style Issues
Fix what can be automatically corrected.

```bash
npm run lint:fix
```

What it does:
- Removes unused variables
- Fixes indentation
- Reformats code
- Updates imports alphabetically

What it **doesn't** do:
- Fix logic errors
- Change behavior
- Remove intentional code

### Check Layer Boundaries
Verify you're not importing from forbidden domains.

```bash
npm run lint:layers
```

What to expect:
```
✅ Layer boundaries OK
```

Or if there's a problem:
```
❌ ERROR: src/lang/index.ts imports from src/app/shell.ts
   - lang (4) cannot import from app (10)
```

→ Change the import to only use inner domains

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
npm run build && npm run test:run && npm run lint:layers
```

If all pass ✅, you're safe to commit.

### Commit Format

Use this format: `scope: description`

**Scope examples:**
- Domain: `ui: `, `lang: `, `runtime: `
- Feature: `keyboard: `, `editor: `, `onboarding: `
- Task: `docs: `, `test: `, `build: `

**Examples:**
```bash
git commit -m "ui: add CopyButton component"
git commit -m "lang: improve error messages"
git commit -m "test: add coverage for keyboard shortcuts"
git commit -m "docs: explain 12-domain architecture"
```

**Good descriptions:**
- Specific (not "fix stuff")
- Past tense ("add", "improve", "fix")
- 50 characters or less

**Bad descriptions:**
- Too vague: "update", "fix bug"
- Too long: "Add a really amazing new feature that does awesome things"
- Wrong format: "Adding new stuff" or "FIXED BUGS"

### Create the Commit
```bash
git add src/ui/components/copy-button.ts
git add src/ui/__tests__/copy-button.test.ts
git commit -m "ui: add CopyButton component"
```

Or add all changes:
```bash
git add .
git commit -m "ui: add CopyButton component"
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
npm run build && npm run test:run && npm run lint:layers
```

### Open the PR

Go to GitHub and click "Open a pull request"

**PR Title:**
Use same format as commits: `scope: description`

```
ui: add CopyButton component
lang: improve error messages
docs: explain layer boundaries
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
- [ ] No layer boundary violations (npm run lint:layers)

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
git commit -m "address review feedback: improve button accessibility"
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

## Fuzz Profiles (Code Quality)

Code quality checks beyond tests. Use before committing:

```bash
npm run fuzz:all
```

This runs all checks:
- **fuzz:types** — Unsafe `any` types, type assertions
- **fuzz:complexity** — Functions that are too long/complex
- **fuzz:async** — Floating promises, async issues
- **fuzz:purity** — Functions that mutate parameters
- **fuzz:dead** — Unused code, dead branches
- **fuzz:runtime** — Unnecessary conditions
- **fuzz:naming** — Naming convention violations

### Interpreting Output

```
src/ui/button.ts(45:5) WARN complexity: function is too complex (12)
  → Function has too many branches; consider breaking it up

src/lang/lexer.ts(100:10) WARN dead: unreachable code
  → This line is never executed; remove it

src/runtime/eval.ts(23:3) WARN purity: parameter reassigned
  → Don't modify function parameters
```

---

## Measuring Token Efficiency

The project tracks token usage for AI-assisted development.

```bash
npm run measure-tokens
```

This shows:
- Current token usage
- Hotspots (files using most tokens)
- Trends over time

Output:
```
Total Tokens: 245,000
Top hotspots:
  - src/lang/parser.ts: 8,500
  - src/runtime/eval.ts: 7,200
  - src/ui/components/: 5,100

Optimization opportunities:
  - Extract large inline data from logic
  - Keep barrel exports under 30 lines
```

See `TOKEN-EFFICIENCY.md` for full documentation.

---

## Debugging in the Browser

### Enable DevTools
1. Start dev server: `npm run dev`
2. Open browser DevTools: F12 or Cmd+Option+I
3. Go to Console tab

### Log Output
```typescript
console.log('value:', myVariable);
console.error('error:', error);
console.table(array);  // Pretty print arrays/objects
```

### Breakpoints
1. Go to Sources tab
2. Click line number to set breakpoint
3. Reload page
4. Execution pauses at breakpoint
5. Use Step Over/Into/Out buttons to debug

### Watch Expressions
In DevTools console:
```javascript
// Watch a variable
myVariable

// Call a function
myFunction()

// Check object properties
myObject.property
```

### Debug in the REPL
The language REPL has step-through debugging:
```
Ctrl+D           # Step debugger
Ctrl+N           # Next step
Ctrl+O           # Step over
Ctrl+I           # Step into
```

---

## Running Specific Tests

### By File
```bash
npm run test:run src/ui/__tests__/button.test.ts
```

### By Pattern
```bash
npm run test:run -- --grep "button"
```
Runs all tests with "button" in the name.

### By Domain
```bash
npm run test:run src/lang/__tests__/
```
Runs all tests in a directory.

### Verbose Output
```bash
npm run test:run -- --reporter=verbose
```
Shows each test name and time.

---

## Checking Architecture Boundaries

Before every commit:

```bash
npm run lint:layers
```

This verifies the 12-domain layered architecture is respected.

**Example violation:**
```
src/lang/index.ts:45
❌ Cannot import from app/ (outer domain)
   lang (4) depends on: core (0), infra (1)
   Suggestion: Move to core/ or runtime/ or features/
```

**To fix:**
- Move the code to an allowed domain, OR
- Use a different import from an allowed domain

See `ARCHITECTURE-STRATEGY.md` for the complete dependency graph.

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

# 3. Check style
npm run lint:fix
# ✅ Should auto-fix issues

# 4. Check boundaries
npm run lint:layers
# ✅ Should show "Layer boundaries OK"

# 5. Commit
git add .
git commit -m "scope: description"

# 6. Push
git push origin branch-name
```

If everything ✅, open the PR!

---

## Troubleshooting

### "npm run dev" won't start
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm run dev
```

### Tests are timing out
```bash
# Increase timeout for long-running tests
npm run test:run -- --testTimeout=10000
```

### Build is very slow
```bash
# Check what's slow
npm run build -- --analyze
```

### Can't find module errors
```bash
# Check the import path in src/<domain>/index.ts
cat src/ui/index.ts | grep 'export'

# Make sure you're importing from barrel exports, not deep paths
# ❌ import Button from '@/ui/components/button'
# ✅ import { Button } from '@/ui'
```

### Changes not showing in browser
```bash
# Hard refresh
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Or check dev server is running
npm run dev
```

---

## Next Steps

1. Pick a task from this guide
2. Follow the step-by-step instructions
3. If you get stuck, check the troubleshooting section
4. Open an issue if something doesn't work

Good luck! 🚀

---

**Back to:** [Contributing Guide Hub](README.md)
