# Spw Operator Metaphysics

## Current Inventory

### Primitive Operators (single glyph → intent)

| Glyph | Name         | Metaphor            | Runtime Fn         | Frame | Body | Prefix | Postfix | Notes                        |
|-------|-------------|----------------------|--------------------|-------|------|--------|---------|------------------------------|
| `!`   | Action      | Kinetic energy      | `applyAction`      | ✓     | ✓    | ✓      | ✗       | Creates values/functions     |
| `^`   | Integration | Fusion/binding       | `applyIntegration` | ✓     | ✗    | ✓      | ✗       | Tap/resolve references       |
| `~`   | Potential   | Superposition        | `applyPotential`   | ✓     | ✓    | ✓      | ✗       | Transform/apply functions    |
| `<>`  | Exchange    | Interaction/couple   | `applyExchange`    | ✓     | ✗    | ✓      | ✗       | Pair creation                |
| `?`   | Wonder      | Uncertainty/query    | `applyWonder`      | ✓     | ✗    | ✓      | ✗       | Conditional test (+ `?match`)|
| `*`   | Value       | Observable/measure   | `applyValue`       | ✓     | ✓    | ✓      | ✗       | Conditional execution        |
| `=`   | Set         | Assignment/bias      | `applySet`         | ✓     | ✗    | ✓      | ✗       | Binding name→value           |
| `@`   | Perspective | Reference frame      | `applyPerspective` | ✓     | ✗    | ✓      | ✗       | Output/emit a value          |

### Connectors (infix binary)

| Glyph | Name        | Metaphor       |
|-------|------------|----------------|
| `..`  | Range/chain | Sequence        |
| `\|`  | Alternative | Choice/branch   |
| `/`   | Path       | Derivation      |
| `->`  | Mapping    | Flow/transform  |

### Modifiers (valence)

| Name   | Effect                |
|--------|----------------------|
| `bone` | Neutral/structural    |
| `boon` | Positive/affirm       |
| `bane` | Negative/negate       |
| `bonk` | Emphatic/strong       |
| `honk` | Warning/alert         |

### Containers (paired delimiters)

| Syntax   | Name    | Semantics          |
|----------|---------|-------------------|
| `[ ]`    | Frame   | Argument list      |
| `{ }`    | Body    | Code block/scope   |
| `( )`    | Scope   | Named scope        |
| `<< >>` | Stream  | Reactive boundary   |
| `(( ))` | NRange  | Numeric range       |
| `< >`    | Capsule | Concept/type def    |

---

## Identified Inconsistencies

### 1. Asymmetric Grammar Shape

Every operator currently parses as:

```
modifier_chain? OPERATOR label? frame? body? inline_payload?
```

But the actual **accepted combinations** differ wildly per operator:

| Op  | frame? body? → result shape                              |
|-----|----------------------------------------------------------|
| `!` | frame→value, body→function, both→value+execution         |
| `^` | frame→resolve, body→ignored                              |
| `~` | frame→input, body→apply (iff input is function)          |
| `<>`| frame[2]→pair, frame[1]+accumulator→pair, body→ignored   |
| `?` | frame→test, body→ignored (but `?match` hijacks entirely) |
| `*` | frame→ignored, body→conditional exec (uses `?`'s state)  |
| `=` | frame[2]→assign, frame[1]+accumulator→assign, body→ign   |
| `@` | frame→emit, body→ignored                                 |

**Problem**: 5 of 8 operators silently ignore `body`. The grammar allows `^{...}`, `<>{...}`, `?{...}`, `={...}`, `@{...}` to parse successfully, but the runtime discards the body. This violates the principle that "if it parses, it has meaning."

### 2. `?` / `*` Hidden Coupling

`?` sets `state.registers.condition`. `*` reads it. This is **implicit state coupling** — `*` only makes sense immediately after `?`. There's no syntactic or type-level enforcement.

```
?[x] *{ do_something }    // works: ? sets condition, * reads it
*{ do_something }          // also parses but uses stale/default condition
```

### 3. `?match` as Grammar Exception

`?match` is a composite form hardcoded in `termNode` — it hijacks `?` when followed by the identifier `match`. This means:
- `?` + `match` = `MatchNode` (completely different AST shape)
- `?` + anything else = `OperationNode`

This pattern should be **the rule, not the exception**. Every operator should support labeled specialization.

### 4. `#` and `.` Present in Operator Map but Missing from Runtime

`OperatorKind` includes `#` (ground) and `.` (subject), and they're in the lexer. But:
- `ExecutionContext.operator` type: `'!' | '^' | '~' | '<>' | '?' | '*' | '=' | '@'` — **no `#` or `.`**
- No runtime handler exists for either
- `#` has inline payload behavior in the grammar but no execution semantics

### 5. `&` in Operator Map, No Grammar or Runtime

`&` (`OperatorKind`) ships in the lexer but has **zero presence** in grammar or runtime.

### 6. No Postfix Support

The grammar is prefix-only. The AST `OperationNode` has no concept of whether the operator appeared before or after its arguments. This means compositions like:

```
value !        // "action on value" (postfix)
value ^        // "integrate value" (postfix)
```

...cannot be distinguished from prefix operations syntactically.

### 7. Composite Operator Composition Not Formalized

Some natural compositions should be expressible:

```
?*             // test-and-execute (currently requires two nodes)
!~             // act-then-transform
^=             // integrate-and-assign
?match         // currently hardcoded; should be generalizable
!emit          // action with labeled intent
```

But there's no grammar rule for operator-operator composition.

---

## Proposed Framework: Operator Algebra

### Design Principles

1. **Canonical Form**: `prefix? OPERATOR label? modifier? frame? body?`
2. **Every slot has meaning**: If it parses, it executes. No silent drops.
3. **Composability**: Operators compose via labeled specialization and chaining.
4. **Position-awareness**: Prefix vs postfix changes semantic role.
5. **Internal consistency**: All operators share the same structural grammar.

### Uniform Operator Signature

Every operator should resolve to a common interface:

```typescript
interface OperatorSemantics {
  // What the operator does to its input
  kind: OperatorKind

  // Positional role
  position: 'prefix' | 'postfix' | 'circumfix'

  // Optional specialization via label
  label?: string

  // Valence modifier
  valence: Valence

  // Structural arguments
  frame?: FrameNode     // explicit arguments
  body?: BodyNode       // deferred computation

  // Chained composition
  next?: OperatorSemantics  // for ?* or !~ chains
}
```

### Phase 1: Complete the Primitive Operator Set

Define semantics for `#`, `.`, and `&`:

```
# (Ground)
  Metaphor: Earth/foundation/anchoring
  Semantics: Assert/declare a ground truth or annotation
  Frame: The assertion content
  Body: Documentation/proof block
  Prefix: #["name"] { proof }    — declare
  Postfix: value #               — reify/ground a value

. (Subject)
  Metaphor: Focus/attention/this
  Semantics: Dereference / member access / focus
  Frame: Path components
  Body: Method body
  Prefix: .["field"]             — access
  Postfix: value.field           — (already exists as connector ..)

& (Confluence)
  Metaphor: Join/merge/parallel
  Semantics: Combine multiple values into one
  Frame: Values to merge
  Body: Merge strategy
  Prefix: &[a, b, c]            — merge
  Postfix: value & other         — join with
```

### Phase 2: Operator Labels as First-Class Specialization

The `?match` pattern should generalize. Any operator can be specialized by label:

```
Grammar:
  operation ::= modifier? OPERATOR label? frame? body?
  label     ::= IDENTIFIER (when immediately following operator, no whitespace)

Built-in specializations:
  ?match[x]{ ... }         — pattern match (existing)
  ?type[x]                 — type query
  ?has[x, key]             — membership test
  !log[value]              — action: log
  !emit[event]             — action: emit
  =let[name, value]        — assignment: let-binding
  =const[name, value]      — assignment: const-binding
  ^import[path]            — integration: import
  ~map[fn]                 — potential: map transform
  ~fold[fn, init]          — potential: fold/reduce
```

The interpreter dispatches first by operator, then by label:

```typescript
// Registry pattern
type OperatorHandler = (
  state: RuntimeState,
  label: string | undefined,
  frame: SpwValue[],
  body: BodyNode | undefined,
  valence: Valence
) => Generator<InterpreterStep, SpwValue | undefined, void>

const operatorRegistry = new Map<string, Map<string | undefined, OperatorHandler>>()
```

### Phase 3: Position-Aware Parsing

Extend the grammar to support postfix operators:

```
term ::= primary_term postfix_op*
primary_term ::= prefix_operation | scope | reference | literal | ...
prefix_operation  ::= modifier? OPERATOR label? frame? body?
postfix_op        ::= OPERATOR label? frame?
```

AST extension:

```typescript
interface OperationNode extends ASTNode {
  type: 'Operation'
  position: 'prefix' | 'postfix'  // NEW
  modifiers?: ModifierChainNode
  operator: Token<'OPERATOR'>
  operatorLabel?: Token<'IDENTIFIER'>
  frame?: FrameNode
  body?: BodyNode
  subject?: TermNode              // NEW: the term this postfix op applies to
  linePayload?: ProseChunkNode
}
```

Postfix examples:

```spw
value !                    // action on value (force/evaluate)
collection ~map[fn]        // transform a collection
result @                   // emit/publish result
name =                     // assign accumulator to name
x ?                        // query truthiness of x
```

### Phase 4: Operator Composition Chains

Allow adjacent operators to form pipelines:

```
?*     →  test-then-branch (currently implicit via registers)
!~     →  act-then-transform
^=     →  resolve-then-assign
?!     →  test-then-act (conditional action)
~@     →  transform-then-emit
```

Grammar:

```
composite_operation ::= modifier? OPERATOR+ label? frame? body?
```

AST:

```typescript
interface CompositeOperationNode extends ASTNode {
  type: 'CompositeOperation'
  operators: Token<'OPERATOR'>[]   // ordered chain
  modifiers?: ModifierChainNode
  operatorLabel?: Token<'IDENTIFIER'>
  frame?: FrameNode
  body?: BodyNode
}
```

Runtime: composed operators are evaluated left-to-right, each feeding its result to the next.

---

## Composition Matrix

How each operator relates to every other when composed:

```
     !    ^    ~    <>   ?    *    =    @    #    &
!    !!   !^   !~   !<>  !?   !*   !=   !@   !#   !&
     ↑    act  act  act  act  act  act  act  act  act
     |    then then then then then then then then then
     |    fuse xfrm pair test val  bind emit grnd join
     dbl
     eff

^    ^!   ^^   ^~   ^<>  ^?   ^*   ^=   ^@   ^#   ^&
     fuse deep fuse fuse fuse fuse fuse fuse fuse fuse
     act  fuse xfrm pair test val  bind emit grnd join

?    ?!   ?^   ?~   ?<>  ??   ?*   ?=   ?@   ?#   ?&
     cond cond cond cond deep C.E  cond cond cond cond
     act  fuse xfrm pair test x    bind emit grnd join
```

### Priority Compositions (most useful)

1. **`?*` (test-execute)**: Already implicitly coupled. Make explicit.
2. **`^=` (resolve-assign)**: Import-and-bind pattern.
3. **`!@` (act-emit)**: Action that produces output.
4. **`~!` (transform-act)**: Transform then apply side-effect.
5. **`?!` (conditional-act)**: Test then act (guard pattern).

---

## Implementation Roadmap

### Immediate (consistency fixes)
- [x] Add `#`, `.` and `&` to `ExecutionContext.operator` types
- [x] Implement `applyGround`, `applySubject`, and `applyConfluence` in operators.ts
- [ ] Make operators that ignore body emit a parse warning
- [x] Add `position: 'prefix'` field to `OperationNode` (default, backward-compat)

### Short-term (labeled specialization)
- [ ] Generalize `?match` pattern to operator registry
- [x] Add `OperatorRegistry` with label-based dispatch
- [ ] Define built-in specializations for each operator
- [ ] Move `?match` from hardcoded grammar to registry entry

*Note: `#` (Ground) and `.` (Subject) now accept both string literals (`["key"]`) and references (`[@key]`) for names/paths.*

### Medium-term (position awareness)  
- [ ] Extend grammar for postfix operators
- [ ] Add `subject` field to `OperationNode`
- [ ] Implement postfix evaluation in interpreter
- [ ] Add syntax highlighting for prefix/postfix distinction

### Long-term (composition)
- [ ] Add `CompositeOperationNode` to AST
- [ ] Implement operator composition chains in grammar
- [ ] Build composition matrix evaluation
- [ ] Add composition type checking
