# CONTAINERS (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha container semantics — expanded with worked examples.

## Container Table

Braces are primordial semantic constructs, not mere punctuation:

| Brace | Name | Type | Spirit Role | Parser |
|:---:|:--|:--|:--|:--|
| `[ ]` | Frame | selection, ordered, indexable | `[#.]` — merge categorized truths | `frameNode` |
| `{ }` | Body | scope, fundamental container | `{#.}` — materialize properties | `bodyNode` |
| `( )` | Scope | grouping, parenthetical | `(#.)` — observe ground truth | `scopeNode` |
| `< >` | Capsule | channel, directed, typed | `<#.>` — name the coupling | `capsuleNode` |
| `(( ))` | N-range | numeric range bounds | depth expression | `nrangeNode` |
| `<< >>` | Stream | streaming boundary | arrival-order flow | `streamNode` |

## v0.2.0 Contract

Containers encode grouping, scope, and attachment context:
- Legal container forms and nesting rules
- Disambiguation behavior for borderline syntax
- Parse tree guarantees for grouped expressions

## Worked Examples

### 1. Frame — selecting and categorizing

```spw
^seed[Workbench.Mount.V01 v:0.1 @profile:Spw.m @intent:mount-slice]
```

**AST:** `FrameNode { content: [IdentifierNode("Workbench.Mount.V01"), ParameterNode("v", "0.1"), ReferenceNode("@profile:Spw.m"), ReferenceNode("@intent:mount-slice")] }`

**Meaning:** Frames `[...]` hold an **ordered selection** — the metadata is indexed, queryable, and position-significant.

### 2. Body — materializing scope

```spw
^"roots"{
  @repo: ~".."
  @spw: ~"."
  @docs: ~"../docs"
}
```

**AST:** `BodyNode { sequence: SequenceNode { items: [KeyValueNode("@repo", ...), KeyValueNode("@spw", ...), KeyValueNode("@docs", ...)] } }`

**Meaning:** Bodies `{...}` are the **fundamental container** — they materialize properties within a scope. Everything between braces belongs to the enclosing frame.

### 3. Scope — observing and grouping

```spw
?(
  @(Orchestrator, #[SyntaxEvolver, CanonicalizerHasher, FuzzerAdversary]),
  "promote .spw/ to live canon root"
)
```

**AST:** `ScopeNode { sequence: SequenceNode { items: [ReferenceNode("@(Orchestrator, ...)"), LiteralNode("promote .spw/...")] } }`

**Meaning:** Scopes `(...)` **group** and **observe** — they don't create new scope, they parenthetically associate. Named scopes `(name: ...)` bind a label.

### 4. Capsule — directed channel

```spw
~<detail>"./OPERATORS.md"
```

**AST:** `CapsuleNode { label: "detail", content: LiteralNode("./OPERATORS.md") }`

**Meaning:** Capsules `<...>` are **directed and typed** — they name a coupling channel. The content flows through the channel.

### 5. Stream — arrival-order data flow

```spw
<<event_data, timestamp, context>> @sink
```

**AST:** `StreamNode { sequence: [...], sink: ReferenceNode("@sink") }`

**Meaning:** Streams `<<...>>` handle **arrival-order** data. The optional `@sink` declares where the stream terminates.

## Nesting Rules

Containers nest freely but semantics compound:

```spw
# Frame inside body — selection within materialization
^"config"{ mode: [debug, verbose, trace] }

# Scope inside frame — observation within selection
^seed[?(active, stable)]{ ... }

# Body inside scope — materialization within grouping
?(condition, { then_branch }, { else_branch })
```

**Invalid nesting** fails fast with position-rich diagnostics:

```spw
# ❌ Mismatched delimiters
[content}     # Error: expected ']' but found '}'

# ❌ Unclosed containers
{open but     # Error: unexpected EOF, expected '}'
```

## Counter-Examples

### ❌ Conflating frame and body

```spw
# BAD: using [] where {} is meant
^"config"[mode: debug]     # Frame: ordered selection, not scope
^"config"{mode: debug}     # Body: correct — materializes property
```

Frames select; bodies materialize. The choice is semantic, not stylistic.

### ❌ Using capsule as generic container

```spw
# BAD: capsule without directional intent
<random stuff here>        # Capsule implies a named channel coupling
{random stuff here}        # Body: correct for general containment
```

## Brace Charge Model

Left and right braces are **not symmetric**. They carry opposite charge:

| Brace | Left (Open) | Right (Close) |
|:---:|:--|:--|
| `{` / `}` | +tension — accumulates semantic mass | −discharge — collapses field into unit |
| `[` / `]` | +selection — pins a coordinate | −release — lets go of selection |
| `(` / `)` | +containment — captures flow | −emission — releases captured flow |
| `<` / `>` | +channel — directs into conduit | −delivery — completes the conduit |

### Tension Gradient

The distance (line count) between `{` and `}` is the **tension gradient**:

- **1 line** (percussive): `!deploy{ @prod }` — snap, immediate
- **10–50 lines** (sustained): held note, weight builds until `}` releases
- **50+ lines** (epic): gravitational body with internal sub-structure

### Depth Budget

Recommended maximum nesting depth: **4**. Beyond that, extract a named sub-frame.

## Invariants

- Container boundaries are preserved in AST output.
- Ambiguous container shapes resolve consistently under one rule-set.
- Invalid nesting fails fast with position-rich diagnostics.
- Each brace pair has one semantic meaning — selection, scope, materialization, or channel.
- Left braces accumulate charge; right braces discharge.
- Nesting depth past 4 is a structural smell.

## Implementation Hooks

- Grammar container rules: `src/seed/grammar/containers.ts`
- Container parser tests: `src/seed/__tests__/container-disambiguation.test.ts`
- Parsing entry points: `src/seed/parser/parse.ts`
- Container kind types: `src/seed/types/token.ts#ContainerKind`
- Brace physics registry: `.spw/registries/brace-physics.spw`

## Open Questions

- Should mixed container families be normalized or preserved as-authored?
- Which ambiguity cases need profile toggles versus one canonical rule?

