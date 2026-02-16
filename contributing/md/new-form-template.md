# New Spw Form Template

Use this checklist when adding a new Spw language form so the change stays
portable, testable, and consistent with the architecture.

## Checklist

1. Spec and alignment
- Add a spec entry under `lib/spw-v0.1.0-alpha/` covering syntax, AST shape,
  semantics, runtime behavior, and errors.
- Link it from `docs/spec-alignment.spw` and add usage patterns in
  `docs/patterns.spw`.
- If the syntax is novel, add rationale in `docs/design-research.spw`.

2. Grammar and AST (lib/spw)
- Add lexer matchers in `src/lib/spw/lexer/matchers/` for new tokens.
- Update grammar in `src/lib/spw/grammar/` and parser flows in
  `src/lib/spw/parser/`.
- Define AST types in `src/lib/spw/types/` and update canonicalization in
  `src/lib/spw/canonical/`.
- Keep `lib/spw` portable (no `@/` imports).

3. Semantics (lang)
- Add validation and analysis in `src/lang/semantic/`.
- Use consistent error codes and messages.

4. Runtime
- Implement evaluation in `src/runtime/interpreter/`.
- Update runtime state in `src/runtime/state/` as needed.
- Keep side effects explicit and localized.

5. Tests and examples
- Parser and AST tests in `src/lib/spw/__tests__/`.
- Semantic and runtime tests in `src/**/__tests__/`.
- Examples in `examples/reference/` and `examples/test-suite/`, including
  error recovery cases.

6. Docs and maps
- Update `docs/toc.spw` and `docs/index.spw` if you add or move docs.
- Update layer docs in `src/lang/docs/README.md` and any affected domain docs.

## Spec Skeleton

```text
Form: <name>
Sigil/keyword: <syntax>
Parse shape: <AST node>
Semantics: <constraints and meaning>
Runtime: <execution rules>
Errors: <codes + messages>
Examples: <valid and invalid snippets>
```
