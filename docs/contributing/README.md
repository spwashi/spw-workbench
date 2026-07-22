# Contributing Guide Hub

This directory contains detailed guides for different types of contributors to the hud-dashboard project—a Spw language workbench (IDE for a symbolic grammar language).

## Pick Your Path

Choose the guide that matches your background and interests:

| | **Researchers** | **Engineers** | **Hobby Coders** |
|---|---|---|---|
| **Interest** | Language design, cognitive science, linguistics | Modular architecture, reusable components, features | Creative exploration, storytelling, play |
| **Time to First Contribution** | 1-2 weeks (analysis) | 2-4 days (feature) | 1 hour (first seed) |
| **Impact Area** | Language theory, validation | Libraries, platforms, services | Examples, creative applications |
| **[→ View Guide →](researchers.md)** | [Researchers Guide](researchers.md) | [Engineers Guide](engineers.md) | [Hobby Coders Guide](hobby-coders.md) |

## Plans by Persona

Each guide includes a 6-week contributor plan:

- **Researchers:** `researchers.md#contributor-plan-6-weeks`
- **Engineers:** `engineers.md#contributor-plan-6-weeks`
- **Hobby Coders:** `hobby-coders.md#contributor-plan-6-weeks`

---

## All Contributors

Regardless of your path, everyone uses:

- **[Learn spine](../learn/README.md)** — 15 min / 1 h / 1 day before deep contribution
- **[Agent brief](../learn/agent-brief.md)** — prefer/refuse/verify for automated work
- **[Common Tasks](common-tasks.md)** — How to build, test, commit, and debug
- **[New Spw Form Template](new-form-template.md)** — Checklist for adding language forms
- **[AGENTS.md](../../Agents.md)** — General rules (layer boundaries, testing, code style)
- **[CONTRIBUTING.md](../../CONTRIBUTING.md)** — Quick entry point (start here if you haven't read it)

---

## Architecture at a Glance

This codebase is organized as a **12-domain layered architecture**. Inner layers cannot import from outer layers. This enforces clear separation of concerns:

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

**What this means for contributors:**

- **Researchers:** Focus on `lang/` (language engine) and `core/` (primitives)
- **Engineers:** Can add features in any domain; architecture ensures modularity
- **Hobby Coders:** Mostly work in `lang/` (creating new domains) and `features/` (interactive behaviors)

For the full architectural graph, see [ARCHITECTURE-STRATEGY.md](../ARCHITECTURE-STRATEGY.md).

---

## Domain Entry Points

| Domain | Purpose | Key Files |
|--------|---------|-----------|
| **core** | Spw primitives: operators, layers, domains | `src/core/types.ts`, `src/core/operators.ts`, `src/core/layers/` |
| **infra** | Infrastructure: timing, lifecycle, state | `src/infra/timing/`, `src/infra/lifecycle/` |
| **design** | Visual design: themes, tokens | `src/design/themes/`, `src/design/tokens/` |
| **ui** | Portable Web Components | `src/ui/components/`, `src/ui/tokens/` |
| **lang** | Language engine: lexer, parser, grammar | `src/lang/` (wraps `src/lib/spw`) |
| **viz** | Visualizations: AST, tokens, flow graphs | `src/viz/ast/`, `src/viz/tokens/` |
| **runtime** | Execution: interpreter, REPL, session | `src/runtime/interpreter/`, `src/runtime/repl/` |
| **features** | Interactive behaviors: keyboard, editor | `src/features/keyboard/`, `src/features/editor/` |
| **debug** | Dev tools: step controller, yield capture | `src/debug/` |
| **cli** | Command-line interface | `src/cli/` |
| **app** | Application shell: layout, navigation | `src/app/shell/`, `src/app/layout/` |
| **platform** | Browser entrypoint: bootstrap, wiring | `src/platform/` |

Each domain has a `docs/README.md` with detailed information. For example: `src/lang/docs/README.md` explains the language domain's structure and exports.

---

## Commands Every Contributor Should Know

```bash
npm run dev              # Start development server
npm run build            # TypeScript check + build
npm run test             # Run tests (watch mode)
npm run test:run         # Run tests once
npm run lint             # Check code style
npm run lint:fix         # Auto-fix style issues
npm run lint:layers      # Verify layer boundaries
npm run measure-tokens   # Check token efficiency
```

See [Common Tasks](common-tasks.md) for detailed explanations.

---

## Key Documents

**Strategy & Philosophy:**
- [VISION.md](../VISION.md) — Why we built this
- [ARCHITECTURE-STRATEGY.md](../ARCHITECTURE-STRATEGY.md) — Design philosophy & 12 architectural tensions
- [TOKEN-EFFICIENCY.md](../TOKEN-EFFICIENCY.md) — How we optimize for AI-assisted development

**Technical Guides:**
- [AGENTS.md](../AGENTS.md) — Contributor rules & code style
- [src/README.md](../src/README.md) — Directory guide with learning paths
- [lib/spw-v0.1.0-alpha/](../lib/spw-v0.1.0-alpha/) — Language specification

**Language Spec:**
- `SPEC.md` — Core primitives (operators, containers, modifiers)
- `LAYERS.md` — Abstraction layer theory
- `PHASES.md` — Five-phase interpretation model
- `applications/` — Creative uses (Hardware, Theatre, Broadcast)

---

## Common Patterns by Persona

### Researchers
→ [Detailed Guide](researchers.md)

**Quick Pattern:**
1. Read the language spec in `lib/spw-v0.1.0-alpha/`
2. Identify a research question (operator semantics, cognitive load, etc.)
3. Write analysis tools or corpus annotations in a research branch
4. Document findings in a PR with links to papers/analysis

### Engineers
→ [Detailed Guide](engineers.md)

**Quick Pattern:**
1. Identify a feature or refactor in the 12-domain architecture
2. Create a branch and modify code in the relevant domain
3. Run `npm run lint:layers` to verify boundaries
4. Include tests; run `npm run test:run`
5. PR with clear explanation of what domain(s) changed and why

### Hobby Coders
→ [Detailed Guide](hobby-coders.md)

**Quick Pattern:**
1. Open the dev server (`npm run dev`)
2. Try creating seeds with different operators and domains
3. Design a custom domain (Music@, Art@, etc.) in a sketch file
4. Contribute examples or tutorial videos
5. Share your work in a PR or GitHub discussion

---

## Need Help?

- **Getting started?** Read your persona guide above
- **Stuck on a task?** See [Common Tasks](common-tasks.md)
- **Architecture question?** Read the domain's `docs/README.md` (e.g., `src/ui/docs/README.md`)
- **Language question?** See `lib/spw-v0.1.0-alpha/SPEC.md`
- **Still stuck?** Open an issue with your question

---

## Contribution Workflow

All PRs follow this basic flow:

1. **Fork and branch** — `git checkout -b descriptive-branch-name`
2. **Make changes** — Edit files, add tests, follow code style
3. **Verify quality** — Run `npm run build && npm run test:run && npm run lint:layers`
4. **Commit** — Use format: `scope: description` (see [AGENTS.md](../AGENTS.md))
5. **Open PR** — Link related issues, describe your changes
6. **Iterate** — Respond to review feedback
7. **Merge** — Reviewer merges when ready

See [Common Tasks](common-tasks.md) for detailed steps on each.

---

## Respect the Architecture

The 12-domain architecture is **enforced by ESLint**. You cannot commit code that violates layer boundaries. This is intentional—it prevents technical debt and ensures maintainability.

**The rule:** Inner layers cannot import from outer layers.

```
❌ BAD:  lang/ imports from app/     (violates boundary)
✅ GOOD: app/ imports from lang/     (follows hierarchy)
```

Run `npm run lint:layers` to check. See [ARCHITECTURE-STRATEGY.md](../ARCHITECTURE-STRATEGY.md) section "Why Layers Matter" for the reasoning.

---

## Questions?

If this guide doesn't answer your question:
1. Check the [FAQ in CONTRIBUTING.md](../CONTRIBUTING.md#faq)
2. Read your persona guide (top of this page)
3. Open an issue with your question

Welcome! 🎉
