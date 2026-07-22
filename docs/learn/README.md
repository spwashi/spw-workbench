# Learn Spw

Progressive paths for humans and agents. Prefer **small runnable commands** over long prose.

## Start here (pick one)

| Time | Path | Outcome |
|------|------|---------|
| **15 min** | [Path §15](path.md#15-minutes) + [cheat sheet](cheat-sheet.md) | Read a surface, open a ref, list CLI |
| **1 hour** | [Path §1h](path.md#1-hour) + [worked CLI](worked-cli.md) | Sense-loop a tree; form wrap; dry pulse |
| **1 day** | [Path §1d](path.md#1-day) + [examples](../examples/) | Theory + editors + one small change |
| **Agent** | [Agent brief](agent-brief.md) | Bounded tools, refuse list, verify loop |

## Surfaces

| Kind | Entry |
|------|--------|
| Language few-shots | [lang/few-shot](../lang/md/few-shot.spw.md) |
| Install / mount | [runtime/quick-start](../runtime/md/quick-start.md) |
| CLI sense loop | [runtime/sense-loop](../runtime/md/sense-loop.md) |
| Effect grades | [runtime/pulse-mutate-beat](../runtime/md/pulse-mutate-beat.md) |
| Memory / cache | [runtime/runtime-memory](../runtime/md/runtime-memory.md) |
| Editors + LSP | [runtime/lsp-editor-integration](../runtime/md/lsp-editor-integration.md) |
| Form ladders | [theory/form-ladders](../theory/spw/form-ladders.spw) |
| Math modeling | [theory/math-modeling](../theory/spw/math-modeling.spw) |
| Onboarding (feature) | [features/onboarding](../features/spw/onboarding.spw) |
| Contributors | [contributing](../contributing/README.md) |

## Routing table (Spw)

`index.spw` in this folder is the machine-readable map of the same spine.

## Law of learnability

1. **One question per stop** — each step answers a single “what can I do now?”
2. **Measure before mutate** — default effect is `effect.l0.measure` (plan/read).
3. **Expand ≠ mutate** — template `#expand` fills holes; creative change is `#mutate`.
4. **Editors are thin clients** — LSP owns semantics; CLI owns corpus tooling.
5. **Falsify claims** — if a doc names a command, it must run from repo root with `npm run spw -- …`.
