# Phase 4 Preparation Report

## Audit Results

### 1. Current Operator System
- [x] Operators found: emit(!), ref(@), bind(^), query(?), iter(~), exchange(<>), set(=), match(*) in `src/core/operators.ts`
- [x] Lexer coverage: `! ^ ~ <> ? * = @` in `src/lib/spw/lexer/matchers/operators.ts`
- [x] Semantic coverage: operator semantics in `src/semantics/spw-knowledge.ts`; operator feature mapping in `src/app/components/detail-drawer.ts` (`getOperatorFeatures`)
- [x] Keybinding coverage: operator-focused motions in `src/features/keyboard/geology-schema.ts` (O/T/I/E/P/A/V/C), plus mappings in `src/features/keyboard/vim-pragmatic-motions.ts`
- [x] # (reflect) references/conflicts: resolved by renaming annotations to `~#` in lexer + grammar; `.spw` docs/examples updated. `#` is now free for operator use.
- [x] Existing tests: operator tokenization in `src/lib/spw/__tests__/lexer.test.ts`; parser operator tests in `src/lib/spw/__tests__/parser.test.ts` (no explicit `<>' or `#` coverage)
- [x] Risk level: 🟡 (reflect operator not implemented yet)

### 2. Container System
- [x] <> usage count: 33 matches (includes comments/tests)
- [x] Capsule tests: Yes (`src/lib/spw/__tests__/lexer.test.ts`, `src/lib/spw/__tests__/parser.test.ts`)
- [x] Disambiguation logic: Lexer matches `<>` operator before container delimiters; capsule uses `<` `>` tokens (`src/lib/spw/lexer/tokenize.ts`, `src/lib/spw/lexer/matchers/operators.ts`, `src/lib/spw/lexer/matchers/containers.ts`)
- [x] Ambiguity notes: `<>` vs `< >` whitespace; no explicit tests for spaced form. `<`/`>` are capsule shell tokens, so operator/capsule ambiguity is resolver-order dependent.
- [x] Risk level: 🟡 (missing parser tests for `<>' operator and spaced edge cases)

### 3. Layer Boundaries
- [x] Violations found: 0 no-restricted-imports violations detected
- [x] lib/spw purity: ✅ (`rg "@/" src/lib/spw` found no matches)
- [x] Import chains verified: ✅ (no `src/app|src/features|src/viz` imports from `src/lang` or `src/runtime`)
- [x] Lint notes: `npm run lint:layers` now passes (warnings only, no errors)
- [x] Risk level: 🟢 (layer boundaries clean)

### 4. Determinism
- [x] UUID/random locations: 4 (replaced with deterministic IDs)
  - `src/features/keyboard/editor-history.ts`
  - `src/runtime/session/state.ts`
  - `src/app/events/selection-bus.ts`
  - `src/core/layers/differential.ts`
- [x] Hash lib available: ✅ (`src/lib/spw/canonical/index.ts` FNV-1a hash; no crypto/sha256)
- [x] Span types exist: ✅ (`src/lib/spw/types/position.ts`, referenced in tokens/AST)
- [x] Parser IDs: no explicit ID assignment in `src/lib/spw/parser` or AST types
- [x] TraceEvent types: ❌ none found (only TraceNode in `src/lib/spw/parser/trace.ts`)
- [x] Risk level: 🟡 (trace types still absent)

### 5. Test Infrastructure
- [x] Property testing: Available via zero-dep harness (`src/test/property.ts`)
- [x] Snapshot testing: Supported by Vitest but not used (`toMatchSnapshot` not found)
- [x] Current test count: 11 files (`rg --files -g "*.test.ts" src`)
- [x] Test file locations: `src/lib/spw/__tests__`, `src/runtime/__tests__`, `src/app/__tests__`, `src/lang/semantic/__tests__`
- [x] Test setup file: None configured in `vitest.config.ts` (property harness is explicit import)
- [x] Vitest version: v3.2.4 (runtime), package.json declares ^3.0.0
- [x] Risk level: 🟡 (snapshot infra unused; property harness ready)

## Blockers Found
- `npm run test:run -- --grep=operator` failed (Vitest CLI does not support `--grep`). Used `-t operator` instead.
- `npm run grep` is not defined in package.json (used `rg` directly instead).
- `npm run lint:layers` now passes (warnings only). No blocker.

## Scaffolding Status
- [x] Test file templates created
- [x] Golden snapshot structure set up
- [x] Type stubs added
- [x] Ready for Opus implementation

## Scaffolding Artifacts Created
- `src/core/operators.test.ts`
- `src/lib/spw/__tests__/parser.determinism.test.ts`
- `src/lib/spw/__tests__/container-disambiguation.test.ts`
- `src/design/__tests__/color-wheel.test.ts`
- `src/lib/spw/__tests__/snapshots/phase-4-golden/` (examples + expected-outputs.json)
- `src/infra/lifecycle/trace.ts`
- `src/lib/spw/types/token.ts` (Phase 4 TODO comment)
- `src/core/ids.ts` (deterministic ID helper)
- `src/test/property.ts` (zero-dep property harness)

## Opus Handoff Notes
- Annotation syntax is now `~#` (lexer + grammar updated; `.spw` docs/examples migrated). `#` is free for reflect operator.
- Operator kind union in `src/lib/spw/types/token.ts` includes `/` and `->` (connectors). Decide whether reflect belongs in OperatorKind or a new token kind.
- `< >` capsule and `<>` couple operator are resolved by matcher order; spaced `< >` remains untested.
- Lint:layers passes (warnings only).
- Determinism: random IDs replaced with deterministic hashing via `src/core/ids.ts` (still need trace types).

---

## Execution Order (Completed)
1. Ran audits 1-5
2. Generated audit notes and blockers
3. Created scaffolding artifacts (tests + golden snapshots + type stubs)
4. Produced this prep report
5. No commit created (per prep-only scope)

---

## Success Criteria Check
- ✅ All 5 audits completed with actionable intel
- ✅ No unknown blockers hidden from Opus
- ✅ Test scaffolds mirror Phase 4 acceptance criteria
- ✅ Golden snapshots cover: inject, reflect, couple, capsule, mixed examples
- ✅ Type stubs show exact diff pattern to follow
- ✅ Prep report is human-readable and machine-actionable
- ✅ Prep artifacts present, uncommitted
