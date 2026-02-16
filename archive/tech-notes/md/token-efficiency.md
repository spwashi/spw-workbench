# Token Efficiency

Strategies for making this codebase efficient for AI coding models.

## Current State

**Statistics:**
- TypeScript: 258 files, 38,380 lines (~149 avg lines/file)
- CSS: 8,560 lines
- Barrel exports: 60 files (avg size reduced from ~92 to ~42 lines)

**Efficiency notes:**
- Average TypeScript file size is trending down; barrels are much slimmer.
- Inefficiency remains in 6 files >500 lines (max 632 lines).

**Strengths:**
- 12-domain layered architecture with strict import boundaries
- Shared event pattern in `src/core/events.ts`
- Consistent barrel export structure
- Domain READMEs with documentation

## Optimization Opportunities

### 1. Split Large Files

Files over 500 lines are token hotspots. Current candidates:

| File | Lines | Split Strategy |
|------|-------|----------------|
| `src/platform/bootstrap.ts` | 632 | UI state, modal/drawer handling, settings, init wiring |
| `src/runtime/interpreter/interpreter.ts` | 620 | Types, evaluation steps, operator handlers |
| `src/design/mode/effects.ts` | 586 | Styles, DOM creation, panel rendering, tooltip actions |
| `src/design/themes/token-bank.ts` | 554 | Types, scopes, mutations, CSS mapping |
| `src/app/spw-workbench.ts` | 519 | Parsing, state, renderers |
| `src/app/components/mode-toggle.ts` | 510 | Types, toggle/group classes, factories |

### 2. ~~Migrate Event Types~~ ✅ Complete

`src/core/events.ts` provides `DomainEvent<TType, TData>` base types. All major event definitions now use it.

**Migrated events:**
- `TimingEvent` (infra/timing/phases.ts)
- `RuntimeEvent` (runtime/state/index.ts)
- `DocumentChangeEvent` (runtime/document/index.ts)
- `TokenChangeEvent` (design/themes/token-bank.ts)
- `PipelineStageEvent` (runtime/pipeline/index.ts)
- `DebugParseEvent` (debug/yield-capture.ts)
- `ThemeEvent` (design/themes/theme-bus.ts)
- `SelectionEvent` (app/events/selection-bus.ts)
- `SessionEvent` (runtime/session/types.ts)
- `OnboardingEvent` (features/onboarding/types.ts)
- `LifecycleEvent` (infra/lifecycle/lifecycle.ts)
- `ReplEvent` (runtime/repl/index.ts)
- `StepEvent` (debug/step-controller.ts)

**Pattern:**
```typescript
import type { DomainEvent } from '@/core/events'

export type SessionEventType = 'session.started' | 'session.ended'
export type SessionEvent = DomainEvent<SessionEventType, SessionEventData>
```

**Note:** `ParseEvent` in `lib/spw/types/events.ts` cannot use DomainEvent (lib/spw cannot import from @/ paths).

### 3. ~~Slim Large Barrel Exports~~ ✅ Complete

Implementation extracted from barrel exports:

| File | Before | After | New Files |
|------|--------|-------|-----------|
| `runtime/interpreter/index.ts` | 620 | 17 | `interpreter.ts` |
| `runtime/state/index.ts` | 458 | 41 | `types.ts`, `register-bank.ts`, `runtime-state.ts`, `helpers.ts` |
| `runtime/repl/index.ts` | 427 | 23 | `repl.ts` |
| `ui/i18n/index.ts` | 312 | 18 | `i18n.ts`, `types.ts`, `strings/en.ts` |
| `runtime/document/index.ts` | 307 | 26 | `types.ts`, `document.ts`, `fragment.ts` |
| `core/conventions/index.ts` | 298 | 42 | `static.ts`, `runtime.ts`, `parsing.ts`, `domain-helpers.ts` |
| `cli/index.ts` | 293 | 23 | `types.ts`, `commands.ts`, `formatters.ts` |

**Total barrel reduction:** 5,432 → 2,909 lines (46% reduction)

**Remaining large barrels** (in `lib/spw`, cannot import from @/):
- `lib/spw/parser/index.ts` (226 lines)
- `lib/spw/lexer/index.ts` (179 lines)

### 4. Extract Inline Data ✅ Complete

Data extracted into standalone files:

- `src/ui/elements/settings-data.ts`
- `src/design/component-definitions.ts`
- `src/design/themes/base-tokens.ts`
- `src/features/keyboard/shortcuts-data.ts`

## Measurement

Track with line counts:

```bash
# Total TypeScript
find src -name "*.ts" -exec wc -l {} + | tail -1

# Large files (>500 lines)
find src -name "*.ts" -exec wc -l {} + | sort -rn | awk '$1 > 500'

# Barrel export sizes
find src -name "index.ts" -exec wc -l {} + | sort -rn | head -10
```

**Targets:**
- Files >500 lines: reduce from 6 to <4
- Max file size: <550 lines
- ~~Barrel exports: avg <30 lines/file~~ ✅ Complete (5,432 → 2,909 lines, 46% reduction)
- ~~Event type definitions: all using shared `DomainEvent` base~~ ✅ Complete

## Architectural Advantages

The 12-domain layered architecture already optimizes for AI consumption:

1. **Isolation:** Each domain loads independently
2. **Boundaries:** Strict imports prevent circular dependencies
3. **Predictability:** Barrel exports make navigation consistent
4. **Locality:** Related code co-located within domains

## Guidelines for New Code

1. **Keep barrel exports minimal** - Under 30 lines, implementation elsewhere
2. **Use shared patterns** - `DomainEvent` from `core/events.ts`
3. **Separate data from logic** - Configuration in dedicated files
4. **Follow layer rules** - Check with `npm run lint:layers`
5. **Target file size** - Aim for <400 lines per file
