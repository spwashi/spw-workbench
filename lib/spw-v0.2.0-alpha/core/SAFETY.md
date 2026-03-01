# SAFETY (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha safety posture — expanded with worked examples.

## What Is Safety?

Safety defines how the kernel handles **malformed input, uncertain states, and potentially unsafe execution assumptions**. It is the grammar layer's self-defense.

## Safety Model

```
Input → Lex → Parse → Validate
                         ↓
              ┌──────────┼──────────┐
              ↓          ↓          ↓
           Success    Warning     Error
           (clean)    (accepted)  (rejected)
```

- **Success:** Valid input, clean AST, no diagnostics.
- **Warning:** Parseable but ambiguous or deprecated — accepted with diagnostic.
- **Error:** Unparseable or unsafe — rejected with position-rich context.

## Worked Examples

### 1. Fail-fast — unclosed container

```spw
^seed[hello v:0.1
```

```
Error at line 1, col 18:
  Unexpected EOF — expected ']' to close frame opened at col 6
  Hint: add ']' before end of file
```

**Behavior:** Parser stops immediately. No partial AST is emitted for invalid input.

### 2. Warning — deprecated form

```spw
# Using legacy .. connector in block mode
item1 .. item2
```

```
Warning at line 1, col 7:
  '..' connector is deprecated in Spw.b block mode
  Hint: use newline separation instead
```

**Behavior:** Parse succeeds, AST is valid, warning is recorded.

### 3. Safe error recovery — position context

```spw
^"config"{
  mode: debug
  count: [1, 2, }
}
```

```
Error at line 3, col 17:
  Unexpected '}' — expected ']' to close frame opened at col 10
  Context: count: [1, 2, }
                          ^
```

**Behavior:** Error includes opening position, expected delimiter, and visual pointer.

## Counter-Examples

### ❌ Silent failure

```typescript
// BAD: parse failure returns null with no context
const result = parse(broken_input)
// result === null — WHY? WHERE? WHAT?
```

### ❌ Safety depends on editor state

```typescript
// BAD: error handling changes based on UI context
if (isVSCode) { showInlineError() }
else { silentlyIgnore() }  // ❌ Safety must be UI-independent
```

## Invariants

- Unsafe or invalid states never silently pass as success.
- Errors include enough position/context for repair.
- Safety checks do not depend on editor or runtime UI context.
- The seed kernel produces identical errors regardless of environment.

## Implementation Hooks

- Parse error and warning surfaces: `src/seed/parser/output.ts`
- Parse tracing and diagnostics: `src/seed/parser/trace.ts`
- Validation entrypoint: `scripts/analyzers/spw-syntax-validate.ts`

## Open Questions

- Which warnings should be promoted to errors in ship profile?
- Do we need a separate safety profile for exploratory parsing modes?
