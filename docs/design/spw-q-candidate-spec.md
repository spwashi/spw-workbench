# Spw.q Candidate Specification

Structural query dialect, evidence protocol, and stabilization gates.

## Contract status

| Field | Value |
|---|---|
| Dialect id | `spw.q` |
| Current candidate | `0.2.0-experimental.1` |
| Stability | experimental |
| Selector IR id | `spw.selector` |
| Match-record id | `spw.query-match` |
| Producer | independently versioned package or host |

This document is a **pre-v1 candidate**, not a compatibility promise. It records current behavior, proposed syntax, and the evidence needed to promote the dialect. `1.0.0` is withheld until the promotion gates in §8 pass.

Statement labels:

- **Implemented** — observable in the current parser, matcher, validator, or CLI.
- **Proposed** — candidate behavior that still requires implementation and fixtures.
- **Interpretive** — design motivation; never treated as runtime behavior.

## 0. Contract invariants

1. An exact dialect version selects grammar and meaning.
2. Validation policy may change acceptance, diagnostics, or recovery, but never the IR produced for a query accepted under both policies.
3. Persisted queries and match records identify their exact dialect and wire schema.
4. Evidence basis is categorical, not ordinal. There is no `evidenceAtMost`.
5. Effect grades remain a separate ordered authority model.
6. `@spwashi/spw-seed` stays portable; workspace I/O and transactions belong to hosts.

A counterexample to invariant 2 is `$!probe` compiling as a modifier in compatibility mode and as a label in strict mode under the same dialect version. That behavior requires two dialect versions or an unambiguous deprecated alias that normalizes to the same IR.

## 1. Evidence model

Evidence has independent dimensions:

```typescript
type EvidenceBasis = 'observed' | 'derived' | 'reported'

type EvidenceDomain =
  | 'source'
  | 'syntax'
  | 'structure'
  | 'topology'
  | 'layout'
  | 'runtime'
  | 'architecture'
  | 'preference'

type EvidenceRole = 'match' | 'filter' | 'projection' | 'annotation'
```

Definitions:

- `observed` — read from a named, revision-addressed artifact without applying another semantic classification rule.
- `derived` — computed from referenced inputs by a named, versioned method. Method metadata declares determinism, profile identity, and uncertainty when applicable.
- `reported` — attributed to a named human, agent, or model context.

Examples:

| Claim | Basis | Domain |
|---|---|---|
| AST node span | `observed` | `syntax` |
| Parser-owned parent relation | `observed` | `structure` |
| Normalized operation product | `derived` | `structure` |
| Path-reference degree | `derived` | `topology` |
| User rendering preference | `reported` | `preference` |

Counterexamples to an evidence ladder:

- A topology edge read from a revisioned index can be observed rather than “level 1”.
- A product derived from syntax is not a direct observation merely because its input is an AST.
- A user preference is authoritative for that user’s preference even though no parser can verify it.

A filter that controls inclusion contributes evidence with `role: 'filter'`; it does not merely decorate an otherwise independent match.

## 2. Current selector surface

### 2.1 Implemented

The experimental parser lives in `packages/spw-seed/src/query/selector-expr.ts` and compiles to the programmatic algebra in `@spwashi/spw-seed`.

- `$` opens a closed structural atom: `$@_`, `$![_]`, `$_`.
- Bare sigil atoms remain experimental compatibility projections.
- `and`, spaced `&`, `|`, `or`, `not`, and `/` compile to the existing boolean and descendant selectors.
- Bare `&` remains the integrate sigil; only spaced `&` can be conjunction.
- Programmatic `capture()` and `seq()` exist and are validated.
- Sequence matching uses adjacent term slots under `Sequence` and `Expression`.
- `A / B` returns the participant matched by `B`; captures from a matching ancestor may merge into the result.
- Descendant truth requires some matching ancestor. When evidence binds an ancestor, the current walk selects the nearest successful one.
- `$["intent"]` uses the current first-descendant-scalar derivation.
- `..` remains reserved for range/slice and `>>` for streams.

### 2.2 Proposed gaps

The following are candidate features, not accepted syntax today:

- composite annotation and particle atoms;
- textual named captures;
- comma-driven sequence tuples;
- valence-versus-label disambiguation;
- an immediate-child combinator;
- an explicit product predicate;
- line/column caret diagnostics.

## 3. Candidate syntax

Every item in this section is **proposed** unless §2.1 says it is implemented.

### 3.1 Canonical structural atoms

Canonical candidate atoms use `$`:

```spw
$_
$@_
$~"./path"
$^[_]{_}
$["intent"]
$~_
$$_
$&_
$*_
$<>_
$<_>
```

Bare atoms may remain compatibility aliases during 0.x only if they normalize to the same selector IR.

### 3.2 Composite marks

Candidate lexemes:

| Spelling | Selector intent |
|---|---|
| `$~#Name` | annotation named `Name` |
| `$#>Name` | particle with aim `>` and value `Name` |
| `$#:Name` | particle with aim `:` and value `Name` |
| `$#!Name` | particle with aim `!` and value `Name` |
| `$~#_`, `$#>_`, `$#:_`, `$#!_` | same kind/aim, any name |

Identifier names are the candidate baseline. Quoted mark names stay unresolved until the source grammar can represent the same values; a query dialect must not advertise unreachable source states.

### 3.3 Named captures

Candidate spelling:

```spw
?intent:$^[_]{_} / $["intent"]
?status:$~#status
?op:($!_ | $~_)
```

`?op:(A | B)` means one capture around the whole union. Captures inside either union branch remain invalid under the current query-truth contract. Duplicate names and captures beneath `not` remain invalid.

`?name` without `:` is a syntax error. `$?_` remains the atom for a `?` operation.

### 3.4 Ordered sequence tuples

| Form | Candidate meaning |
|---|---|
| `(A, B)` | `seq(A, B)` |
| `(A)` | grouping |
| `(A and B)` | boolean grouping |
| `(A,)` | invalid |
| `((A, B), C)` | invalid while nested sequences remain unsupported |
| `A / (B, C)` | invalid while sequences remain top-level |

Comma, rather than whitespace, distinguishes a sequence from grouping.

### 3.5 Boolean and structural relations

| Relation | Spelling | IR |
|---|---|---|
| conjunction | `A and B` | `and(A, B)` |
| compatibility conjunction | `A & B` | `and(A, B)` |
| disjunction | `A \| B`, `A or B` | `or(A, B)` |
| negation | `not A` | `not(A)` |
| descendant ancestry | `A / B` | `descend(A, B)` |
| immediate child | unresolved | unresolved |

`>` is a candidate child spelling because it is familiar and leaves `>>` reserved. It is not fixed until “child” is defined against semantic participants rather than incidental AST wrapper nodes.

### 3.6 Modifiers, labels, and products

The candidate reserves `bone`, `boon`, `bane`, `bonk`, and `honk` as valence modifiers. Other trailing identifiers are intended as operation labels.

```spw
$!boon[_]       // valence modifier
$!probe[_]      // operation label
$!"boon"[_]     // literal label
```

The existing experimental interpretation of a trailing identifier may differ. That is a dialect-version boundary, not a strictness toggle.

`$=bias` is **not fixed** as a product predicate because it also reads naturally as an `=` operation labeled `bias`. Product matching needs a field-qualified spelling that cannot collide with value matching.

### 3.7 Depth and projections

The existing `@n` / `@n-m` suffix measures raw AST ancestry. Public output should call it `astDepth` unless a separately defined semantic-depth projection is implemented.

| Projection | Evidence |
|---|---|
| `name.source` | `observed.source` |
| `name.value` | `observed.syntax` |
| `name.kind` | `observed.syntax` |
| `name.sigil` | `observed.syntax` |
| `name.span` | `observed.source` |
| `name.slot` | `observed.structure` |
| `name.product` | `derived.structure`, with method identity |
| `name.degree` | `derived.topology`, with graph generation and method identity |

Unknown projections fail closed.

## 4. CLI contract

Candidate interface:

```bash
spw query '<spw.q>' \
  --dialect spw.q@0.2.0-experimental.1 \
  [--validation strict|compat] \
  [--preset NAME] \
  [--from ROOT ...] \
  [--where CLAUSE ...] \
  [--format lines|skim|table|json|jsonl] \
  [--select PROJECTION ...] \
  [--require-match] \
  [--require-complete] \
  [--explain]
```

Rules:

- Shell examples single-quote query expressions.
- Unknown flags, formats, presets, projections, and malformed filters fail closed.
- Repeated `--from` values accumulate.
- `--validation strict` rejects deprecated or recovered input according to command policy.
- `--validation compat` may accept declared aliases with migration diagnostics.
- Neither validation mode changes the meaning of an accepted query.
- Output echoes the exact resolved dialect version and query hash.
- Persisted queries declare an exact dialect version; declaration syntax remains open.

Recommended exit classes:

| Code | Meaning |
|---|---|
| `0` | completed, including zero matches |
| `1` | assertion failed |
| `2` | option or query syntax error |
| `3` | source unavailable or parse completeness requirement failed |
| `4` | mutation plan refused |

## 5. Match-record protocol

The wire contract is independently versioned from the dialect and package:

```typescript
interface SpwQueryMatchRecordV1 {
  surface: 'spw.query.match'
  schemaVersion: 1
  dialect: {
    id: 'spw.q'
    version: string
  }
  producer: {
    name: string
    version: string
  }
  query: {
    sha256: string
  }
  source: {
    uri: string
    sha256: string
    documentVersion?: number
    lexProfile: string
    parseHealth: 'complete_structured' | 'recovered' | 'invalid'
  }
  result: {
    kind: string
    sigil?: string
    value?: string
    text: string
    span: SourceSpan
    relation: 'node' | 'adjacent-term-slots'
    slots?: Array<{ expressionIndex: number; termIndex: number }>
  }
  captures?: Record<string, {
    kind: string
    value?: string
    text: string
    span: SourceSpan
  }>
  evidence: EvidenceContribution[]
}
```

Offsets are UTF-16 code-unit offsets when they originate from JavaScript string indexing; they are not byte offsets. JSONL records must each be independently interpretable or use a separately specified header-record protocol.

## 6. Rewrite and host horizon

Rewrite planning, transactional apply, REPL sessions, and LSP methods are intentionally outside this stabilization slice.

Future work must preserve these boundaries:

- seed plans pure edits and hash-bound proposals;
- hosts own filesystem reads, writes, authorization, and recovery;
- rewrite requires a complete, non-recovered parse;
- every target carries a source hash;
- multi-file apply uses a recoverable transaction protocol or emits a reviewable patch bundle;
- write authority is explicit and non-sticky;
- evidence basis never grants mutation authority.

“Atomic multi-write” is not assumed to exist across arbitrary filesystems.

## 7. Version lifecycle

Contracts version independently:

| Concern | Version rule |
|---|---|
| Spw.q grammar and meaning | semantic version |
| selector IR | schema id + schema version |
| match/rewrite records | schema id + schema version |
| CLI or LSP producer | package version |
| derived method/profile | method version + optional profile hash |

Pre-v1 policy:

- `0.y.z` minor changes may intentionally break grammar or meaning and require migration fixtures.
- Patch changes preserve intended grammar and meaning.
- `-experimental.N` identifies implementation iterations of one candidate.
- `1.0.0-alpha.N` begins feature-complete stabilization.
- `1.0.0-beta.N` freezes features while dogfooding persists.
- `1.0.0-rc.N` freezes grammar, IR, and wire compatibility except release-blocking corrections.
- `1.0.0` establishes the public compatibility promise.

Changing the meaning of an existing token is breaking. Adding an enum member may be breaking for strict wire validators and therefore requires an explicit schema compatibility decision.

Removing the former exported `EpistemicGrade` values and ordering helper is likewise a breaking `@spwashi/spw-seed` API change. It must ship in the next declared pre-v1 minor release (currently expected to be `0.4.0`), never as a `0.3.x` patch.

## 8. Promotion gates

Before alpha:

1. Resolve immediate-child semantics and product-predicate spelling.
2. Define persisted query version declarations.
3. Publish grammar-to-IR goldens for every accepted form.
4. Publish negative and recovery fixtures.

Before beta:

1. Run semantic fingerprints: query → result spans, captures, and projections across a representative corpus.
2. Exercise the same fixtures through CLI, LSP, and any REPL host.
3. Provide migrations for every intentional 0.x semantic break.
4. Dogfood saved queries in real workbench tasks.

Before RC:

1. Freeze grammar, selector IR, match schema, and rewrite-plan schema.
2. Validate producer output against checked-in schemas.
3. Meet declared performance and diagnostic-quality budgets.
4. Leave no unresolved decision that can change match truth.

Goldens alone are necessary but insufficient for v1.

## 9. How to falsify this candidate

The candidate is disproved or must be revised if any of these probes succeeds:

- one query accepted under both strict and compatibility validation compiles to different IR;
- a saved query changes meaning without changing its declared dialect version;
- a match record cannot be replayed because source, query, parser profile, or method identity is absent;
- an observed topology fact or derived syntax fact cannot be represented without inventing an evidence order;
- a raw AST wrapper change alters the proposed child relation without a dialect-version change;
- a product constraint and an operation label share an indistinguishable spelling.

Required probes:

```bash
npm run test:seed
npm run test:cli
npm run lint:docs
```

Candidate-specific semantic fingerprint and migration commands remain to be added with their fixtures.

## 10. Open decisions

| ID | Decision needed |
|---|---|
| O1 | field-qualified product predicate spelling |
| O2 | semantic participant definition for immediate child |
| O3 | persisted query-file dialect declaration |
| O4 | bounded set of 0.x dialect versions a single parser must accept |
| O5 | JSONL header-record versus self-contained-record policy |

## 11. Non-goals

- Calling the current draft canonical or v1.
- Querying memory-substrate lattices before a concrete graph adapter exists.
- Arbitrary trivia-preserving subtree rewrites.
- Nested sequence tuples.
- Captures inside disjunction branches.
- Using `>>` for descendant syntax.
- Letting validation mode select semantics.
- Letting evidence basis grant effect authority.
