# Optimization Plan

Prioritized roadmap for improving codebase token efficiency, indexability, and extensibility.

## Completed Phases ✅

### Phase 1: Event Type Standardization
- **Status:** Complete (commit 356655a)
- **Result:** 13 event types migrated to `DomainEvent<TType, TData>` pattern
- **Impact:** Consistent event handling across all domains

### Phase 2: Barrel Export Slimming
- **Status:** Complete (commit 356655a)
- **Result:** 7 large barrels extracted, 46% reduction (5,432 → 2,909 lines)
- **Impact:** Faster context loading, selective module loading

### Phase 3A: Large File Splitting (Original Targets)
- **Status:** Complete
- **Result:** Original 10 targets split or extracted to smaller modules
- **Impact:** Original targets were brought below 500 lines at completion; current >500 files are new/regressed targets

### Phase 4: Data Extraction
- **Status:** Complete
- **Result:** Data moved into standalone files:
  - `src/ui/elements/settings-data.ts`
  - `src/design/component-definitions.ts`
  - `src/design/themes/base-tokens.ts`
  - `src/features/keyboard/shortcuts-data.ts`
- **Impact:** Cleaner separation of data and logic

### Phase 5: lib/spw Restructuring
- **Status:** Complete
- **Result:** `src/lib/spw` barrels trimmed (parser/lexer/grammar all <150 lines)
- **Impact:** Smaller entrypoints, lower context load cost

## Pending Phases

### Phase 3B: Large File Splitting (Priority: HIGH)

**Goal:** Reduce files >500 lines from 6 to <4

#### Targets by Size & Complexity

**1. src/platform/bootstrap.ts (632 lines)**
- Strategy: Separate UI state, modal/drawer handling, settings, and init wiring
- Files to create:
  - `bootstrap/mode.ts` - `currentMode`, `setMode`
  - `bootstrap/inspector-tabs.ts` - `showInspectorTab`
  - `bootstrap/drawer.ts` - `openDrawer`, `closeDrawer`, `showDrawerTab`
  - `bootstrap/modal.ts` - `openModal`, `closeModal`
  - `bootstrap/toasts.ts` - `showToast`
  - `bootstrap/editor.ts` - `updateLineNumbers`, `syncLineNumbersScroll`, `updateEditorHighlights`
  - `bootstrap/parse.ts` - `runParse`, `updateWorkbenchViews`, `handleAction`, `loadSample`
  - `bootstrap/settings.ts` - `applySettingChange`, `loadAndApplySettings`
  - `bootstrap/theme.ts` - `initThemeSystem`, `cycleTheme`, `toggleThemeReactions`
  - `bootstrap/onboarding.ts` - `initOnboardingSystem`, `cycleDisclosureLevel`
  - `bootstrap/init.ts` - `init`, `initPlatform`
  - Keep `bootstrap.ts` as orchestrator (<120 lines)

**2. src/runtime/interpreter/interpreter.ts (620 lines)**
- Strategy: Separate types, evaluation steps, and operation handlers
- Files to create:
  - `interpreter/types.ts` - `InterpreterStep`, `InterpreterOptions`, defaults
  - `interpreter/evaluate.ts` - `evaluateExpression`, `evaluateFrame`, `evaluateLiteral`, `evaluateReference`, `evaluateScope`, `evaluateSequence`, `evaluateBody`, `extractValence`
  - `interpreter/operators.ts` - `execute*` operator handlers
  - `interpreter/valence.ts` - `applyValence`
  - Keep `interpreter.ts` as public class + `createInterpreter`/`interpret`

**3. src/design/mode/effects.ts (586 lines)**
- Strategy: Split styles, DOM creation, panel rendering, and tooltip actions
- Files to create:
  - `effects/styles.ts` - `styles` template string
  - `effects/dom.ts` - `injectStyles`, `createOverlay`, `createFloatingButton`, `createTooltip`, `createPanel`
  - `effects/panel.ts` - `render`, `renderPanel`, `renderTokenList`, `renderComponentList`, `attachItemListeners`
  - `effects/tooltip.ts` - `showTooltip`, `hideTooltip`, `copyToClipboard`, `showCopyFeedback`, `highlightComponent`
  - Keep `effects.ts` as entrypoint

**4. src/design/themes/token-bank.ts (554 lines)**
- Strategy: Extract types, scopes, mutations, and CSS mapping
- Files to create:
  - `token-bank/types.ts` - `TokenValue`, `TokenScope`, events, snapshot types
  - `token-bank/scopes.ts` - `currentScope`, `scopeDepth`, `pushScope`, `popScope`
  - `token-bank/mutations.ts` - `set`, `setMany`, `delete`, `createTokenValue`, `setInCurrentScope`
  - `token-bank/computed.ts` - `defineComputed`, `recomputeAll`
  - `token-bank/resolve.ts` - `resolve`, `extractDependencies`, `resolveDependents`
  - `token-bank/batch.ts` - `batch`
  - `token-bank/observable.ts` - `subscribe`, `emit`
  - `token-bank/snapshot.ts` - `snapshot`, `reset`
  - `token-bank/css.ts` - `toCSS`, `applyToDOM`, `applyLegacyVars`
  - Keep `token-bank.ts` for class + wiring

**5. src/app/spw-workbench.ts (519 lines)**
- Strategy: Split parsing, state, and renderers
- Files to create:
  - `workbench/state.ts` - `WorkbenchState`, `state`, getters
  - `workbench/parse.ts` - `parseInput`, hook setup, collectors
  - `workbench/samples.ts` - `sampleInputs`, `initWithSample`
  - `workbench/selection.ts` - `handleTokenClick`, `handleASTNodeClick`, highlights
  - `workbench/ast.ts` - `renderASTTree`, `renderASTNode`, node traversal helpers
  - `workbench/tokens.ts` - `renderTokenList`, `highlightTokensInRange`
  - `workbench/render/event-log.ts`
  - `workbench/render/coverage.ts`
  - `workbench/render/timing.ts`
  - `workbench/render/errors.ts`
  - `workbench/render/flow.ts`
  - `workbench/utils.ts` - `escapeHtml`

**6. src/app/components/mode-toggle.ts (510 lines)**
- Strategy: Separate types, toggle class, group class, and factories
- Files to create:
  - `mode-toggle/types.ts` - `ToggleState`, config/callbacks/state types
  - `mode-toggle/toggle.ts` - `ModeToggle` class
  - `mode-toggle/group.ts` - `ModeToggleGroup` class
  - `mode-toggle/index.ts` - factories + exports

**Execution Order:** Split in size order (largest first)

## Metrics & Targets

| Metric | Current | Target | Phase |
|--------|---------|--------|-------|
| Files >500 lines | 6 | <4 | 3B |
| Avg file size (src/*.ts) | 149 | <145 | 3B |
| Max file size | 632 | <550 | 3B |
| Data-only files | ~9 | >=9 | 4 |
| lib/spw barrel max size | 69 | <150 | 5 |

## Success Criteria

- [ ] Phase 3B: Files >500 lines reduced to <4
- [ ] Phase 3B: Top 2 files <450 lines each
- [ ] Phase 3B: Max file size <550 lines
- [x] Phase 4: Target data files extracted (settings, components, base tokens, shortcuts)
- [x] Phase 5: lib/spw barrels <150 lines each

## Implementation Approach

1. **Create focused modules** - One concern per file
2. **Preserve API surface** - No breaking changes to barrel exports
3. **Add comments** - Document module purposes
4. **Update tests** - Fix import paths
5. **Commit incrementally** - One split per commit

## Estimated Effort

- Phase 3B: 4-6 commits, ~2-3 hours
- Phase 4: Complete
- Phase 5: Complete

## Long-term Vision

This optimization supports:

1. **AI Indexability** - Smaller files = faster context loading
2. **Modularity** - Each file has single responsibility
3. **Extensibility** - Easy to add new concerns
4. **Maintainability** - Easier to reason about each module
5. **Testability** - Smaller units easier to test

See `TOKEN-EFFICIENCY.md` for token analysis and architectural rationale.
