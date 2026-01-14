# Engineer's Guide

Welcome! This guide is for **feature developers, platform engineers, library vendors, and architects** who want to build, extract, or extend the Spw language workbench.

## Why Contribute as an Engineer?

This project gives you:

- **Modular Components** — Extract reusable libraries (`@spw/lang`, `@spw/ui`, `@spw/design`, `@spw/runtime`)
- **Clean Architecture** — 12-domain layered system with ESLint-enforced boundaries
- **Composable Patterns** — See Phase 2 event consolidation as a model for refactoring
- **Reduced Technical Debt** — Architecture prevents layering violations before they exist
- **Real-World Applicability** — Build portable components you can use in other projects

Your contributions become reusable libraries. Your architectural improvements become patterns others adopt. Your refactoring methodology shapes best practices.

---

## Quick Start (5 Minutes)

### 1. Clone and Setup
```bash
git clone <repo>
cd hud-dashboard
npm install
npm run dev
```

### 2. Explore a Domain
Pick one of the 12 domains and read its docs:
```bash
# Examples:
cat src/lang/docs/README.md         # Language engine
cat src/ui/docs/README.md           # Web components
cat src/runtime/docs/README.md      # Execution engine
```

### 3. Understand the Architecture
```bash
# View the 12-domain dependency graph
cat CLAUDE.md | grep -A 20 "Domain Dependency Graph"

# Verify boundaries
npm run lint:layers
```

### 4. Make a Small Change
```bash
# Edit a domain (try src/ui/components/action-button.ts)
npm run dev                          # See live update
npm run test:run                     # Verify tests pass
npm run lint:fix                     # Auto-fix style
```

**You now understand the development workflow.** Continue reading for what you can build.

---

## The 12-Domain Architecture

The codebase is organized as a strict layered system. Inner layers cannot import from outer layers. This prevents technical debt and ensures components are composable.

```
                          Outer (Higher Order)
                                  ↓
              Platform (11) ── App (10) ── Features (7)
                               │              │
                               ↓              ↓
                        Design (2) ←─── UI (3) ←─ Viz (5) ←─ Lang (4)
                               │              │              │
                               └──────────────┴──────────────┘
                                        │
                                   Core (0)
                                        ↑
                              Infra (1) ── Runtime (6)

                          Inner (Lower Order)
```

**Key Principle:** The darker the box, the fewer dependencies it should have. `core/` is dependency-free except for the language spec. `platform/` imports from everything.

### Domain Purposes

| Domain | Purpose | Dependencies | Extractable? |
|--------|---------|--------------|---|
| **core** | Spw primitives (operators, domains, layers) | None | Yes |
| **infra** | Timing, lifecycle, accessibility | core | Partial |
| **design** | Visual design system (themes, tokens) | core | Yes |
| **ui** | Web components (buttons, panels, editors) | core, infra, design | Yes |
| **lang** | Language engine (lexer, parser, grammar) | core, infra | Yes |
| **viz** | Visualizations (AST, tokens, flow) | core, infra, ui, lang | Yes |
| **runtime** | Interpreter, REPL, session state | core, infra, lang | Yes |
| **features** | Keyboard, editor, onboarding interactions | all above | Depends |
| **debug** | Step controller, profiling, tracing | all above | Partial |
| **cli** | Command-line interface | all above | Partial |
| **app** | Shell, layout, navigation | all above | No |
| **platform** | Browser bootstrap, wiring | all | No |

---

## Five Extractable Libraries (Current State)

These modules are designed to be extracted and published as npm packages:

### 1. **@spw/lang** — Parser & Interpreter
- **Location:** `src/lib/spw/` + `src/lang/`
- **What it is:** Portable Spw parser, lexer, and language engine
- **Size:** ~5,400 lines (lib/spw) + ~2,000 lines (lang)
- **Status:** Parser is fully portable (no @/ imports); ready for extraction
- **Use cases:** Server-side parsing, build tools, language analysis

**Example:**
```typescript
import { createLexer } from '@spw/lang';
const lexer = createLexer(input);
const tokens = lexer.tokenize();
```

### 2. **@spw/ui** — Web Components
- **Location:** `src/ui/`
- **Components:** action-button, sidebar, tab-bar, settings-panel, editor-highlight
- **Size:** ~3,000 lines
- **Status:** Web Components with shadow DOM; platform-agnostic
- **Use cases:** Design systems, component libraries, UI frameworks

**Example:**
```html
<spw-action-button icon="play" label="Execute">
<spw-tab-bar>
  <spw-tab label="Source" />
  <spw-tab label="Output" />
</spw-tab-bar>
```

### 3. **@spw/design** — Design System
- **Location:** `src/design/`
- **Includes:** Themes (light/dark), tokens (colors, spacing, typography), modes
- **Size:** ~1,500 lines
- **Status:** Pure CSS + token definitions; zero runtime dependencies
- **Use cases:** Theme system, design tokens, brand management

**Example:**
```typescript
import { theme, tokens } from '@spw/design';
const color = tokens.emphasis.primary; // #0066cc (light theme)
```

### 4. **@spw/runtime** — State Management & REPL
- **Location:** `src/runtime/`
- **Includes:** Interpreter, session management, REPL interface
- **Size:** ~4,000 lines
- **Status:** Event-based architecture; clean interfaces
- **Use cases:** Embedded interpreters, state management, computation engines

**Example:**
```typescript
import { createSession } from '@spw/runtime';
const session = createSession();
const result = session.evaluate(seed);
```

### 5. **@spw/core** — Type System & Primitives
- **Location:** `src/core/`
- **Includes:** Operators, domains, event patterns, type utilities
- **Size:** ~2,000 lines
- **Status:** Fully portable; no external dependencies
- **Use cases:** Type definitions, domain modeling, event systems

**Example:**
```typescript
import type { Operator, Domain, DomainEvent } from '@spw/core';
```

---

## Feature Development Workflow

### Step 1: Pick a Domain
Determine which domain your feature belongs to. Ask:
- Does it involve UI? → `ui/`
- Does it involve keyboard interaction? → `features/keyboard/`
- Does it involve the REPL? → `runtime/repl/`
- Does it involve visualization? → `viz/`

**Rule:** Only import from inner domains (dependencies below yours in the graph).

### Step 2: Explore the Domain
```bash
# Read the domain's documentation
cat src/<domain>/docs/README.md

# Check the barrel export to understand what's exported
cat src/<domain>/index.ts

# Look at types
cat src/<domain>/types.ts

# Check for examples
ls src/<domain>/__tests__/
```

### Step 3: Create Your Feature
```bash
# Create a new file in the appropriate domain
touch src/<domain>/features/my-feature.ts

# Write code following patterns in that domain
# (see examples in the domain)

# Add tests
touch src/<domain>/__tests__/my-feature.test.ts
```

### Step 4: Verify Boundaries
```bash
# Check that imports don't violate layer boundaries
npm run lint:layers

# If it fails, fix imports. Only import from:
# - Current domain
# - Inner domains (those it depends on)
# - Never from outer domains
```

### Step 5: Test and Lint
```bash
# Run tests
npm run test:run

# Fix style issues
npm run lint:fix

# Check TypeScript
npm run build

# Check complexity and code quality
npm run fuzz:all
```

### Step 6: Create a PR
```bash
# Commit with clear message
git add .
git commit -m "ui: add dark mode toggle button"

# Push and create PR with template
git push origin my-feature-branch
```

---

## Example: Adding a New UI Component

Let's say you want to add a "copy to clipboard" button. Here's how:

### Step 1: Create the Component
```typescript
// src/ui/components/copy-button.ts
import { defineComponent } from '@/infra/lifecycle';
import { icon } from '@/ui/icons';

export const CopyButton = defineComponent({
  name: 'copy-button',
  render() {
    return html`
      <button class="spw-copy-button" @click=${this.handleCopy}>
        ${icon('copy')}
        <span>Copy</span>
      </button>
    `;
  },

  private handleCopy() {
    // Copy to clipboard logic
    navigator.clipboard.writeText(this.content);
  }
});
```

### Step 2: Add Tests
```typescript
// src/ui/__tests__/copy-button.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CopyButton } from '../components/copy-button';

describe('CopyButton', () => {
  it('copies to clipboard on click', async () => {
    const btn = new CopyButton();
    vi.spyOn(navigator.clipboard, 'writeText');

    btn.handleCopy();

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
```

### Step 3: Export from Barrel
```typescript
// src/ui/index.ts
export { CopyButton } from './components/copy-button';
```

### Step 4: Verify
```bash
npm run test:run                      # Tests pass
npm run lint:layers                   # No boundary violations
npm run build                         # TypeScript checks
npm run dev                           # Verify in browser
```

### Step 5: Document
```typescript
// src/ui/components/copy-button.ts
/**
 * CopyButton - Copy content to clipboard with visual feedback
 *
 * Usage:
 * ```html
 * <spw-copy-button content="Hello">
 * ```
 *
 * Events:
 * - copy: Emitted when content is copied
 *
 * @public
 */
```

### Step 6: Create PR
```
Title: ui: add CopyButton component

Problem: Users need a way to quickly copy code snippets

Changes:
- Added CopyButton component with clipboard integration
- Added comprehensive tests
- Updated ui/index.ts barrel export
- Follows existing ui component patterns

Testing:
- Unit tests passing (100% coverage)
- Manual testing in dev server
- Verified no layer boundary violations

Affected domains: ui/
```

---

## Architecture Patterns

### Event Pattern (Phase 2 Model)
All domain state changes use the `DomainEvent<Type, Data>` pattern:

```typescript
// Define event type
type UIEvent = DomainEvent<'button:click', { buttonId: string }>;

// Emit event
emitter.emit<UIEvent>({
  type: 'button:click',
  data: { buttonId: 'execute-btn' }
});

// Listen to event
emitter.on<UIEvent>('button:click', (event) => {
  console.log(event.data.buttonId);
});
```

### Config Type Pattern (Phase 3 Foundation)
All config objects extend from base patterns:

```typescript
import { BaseConfig } from '@/core/types/config';

interface MyConfig extends BaseConfig {
  theme: 'light' | 'dark';
  fontSize: number;
}
```

### Barrel Exports (<30 lines)
Domain barrel exports stay under 30 lines to keep them lightweight:

```typescript
// src/ui/index.ts - Keep this small
export { ActionButton } from './components/action-button';
export { TabBar } from './components/tab-bar';
export { SettingsPanel } from './components/settings-panel';

// For larger exports, document in docs/README.md instead
```

---

## Phase Methodology: Refactoring at Scale

Phase 2 consolidated 7 domain event systems into a unified pattern. This is the model for large-scale refactoring:

### The Phase 2 Approach:
1. **Measure** — Document current state (TOKEN-EFFICIENCY.md)
2. **Identify** — Find 5-10 candidates for consolidation
3. **Implement** — Create new pattern in one domain
4. **Migrate** — Update all domains to use new pattern
5. **Validate** — Run full test suite (127 tests)
6. **Document** — Record methodology and impact

### Next Phase (Phase 3): Config Consolidation
19 config interfaces have been identified as candidates. Similar approach coming.

---

## Layer Boundary Enforcement

The ESLint plugin at `scripts/eslint-plugin-spw/` enforces boundaries:

```javascript
// ❌ VIOLATES BOUNDARY - Will fail lint:
import { AppComponent } from '@/app';  // In lang/, can't import from app/
import { FeatureBehavior } from '@/features';

// ✅ FOLLOWS BOUNDARY - Will pass lint:
import { Operator } from '@/core';     // Inner domain ✓
import { UIComponent } from '@/ui';    // Same layer ✓
```

The rule applies to all imports:
- ESLint: `no-restricted-imports` rule
- Enforces at build time and in editor
- Non-negotiable for PR approval

---

## Code Review Expectations

For engineering contributions, reviewers will check:

1. **Layer boundaries** — Run `npm run lint:layers` (non-negotiable)
2. **Tests** — Coverage for new code; existing tests still pass
3. **Style consistency** — Follow domain patterns; run `npm run lint:fix`
4. **Documentation** — If touching a domain, update `src/<domain>/docs/README.md`
5. **Type safety** — No `any` types; pass `npm run build`
6. **Architecture impact** — Does it introduce dependencies it shouldn't?

---

## Resources

### Architecture & Design
- `ARCHITECTURE-STRATEGY.md` — 12 tensions and how we resolve them
- `TOKEN-EFFICIENCY.md` — Phase methodology and refactoring patterns
- `CLAUDE.md` — Domain dependency graph and context loading
- `src/README.md` — Directory map with quick reference tables

### Domain Documentation
- Each domain has `src/<domain>/docs/README.md` with:
  - AI-SUMMARY block (quick reference)
  - Purpose and scope
  - Key entry points
  - Export summary
  - Dependency notes

### Example Implementations
- **Keyboard System:** `src/features/keyboard/` — How to handle input
- **Editor Interaction:** `src/features/editor/` — How to build editors
- **Onboarding:** `src/features/onboarding/` — How to structure progressive features
- **Visualizations:** `src/viz/` — How to build interactive displays

### Testing
- **Test structure:** `src/<domain>/__tests__/<feature>.test.ts`
- **Test patterns:** Read existing tests for examples
- **Running tests:** `npm run test` (watch) or `npm run test:run` (once)

---

## Common Tasks

For step-by-step instructions, see [Common Tasks Guide](common-tasks.md):
- Running tests
- Fixing style issues
- Committing code
- Creating PRs
- Checking layer boundaries

---

## Getting Help

- **Architecture question?** Read `ARCHITECTURE-STRATEGY.md`
- **Domain structure question?** Read `src/<domain>/docs/README.md`
- **Type discovery question?** Check `src/<domain>/types.ts`
- **Stuck on implementation?** Look at similar features in same domain
- **Code review feedback?** Reach out in PR discussion

---

## Next Steps

1. Pick a domain or feature to work on
2. Read the domain's `docs/README.md`
3. Set up your dev environment: `npm install && npm run dev`
4. Make a small change to understand the workflow
5. Open an issue if you want to work on something large
6. Create a PR when ready

We're excited to have engineers contribute. Your work makes this project more modular and reusable for everyone. 🎉

---

**Back to:** [Contributing Guide Hub](README.md)
