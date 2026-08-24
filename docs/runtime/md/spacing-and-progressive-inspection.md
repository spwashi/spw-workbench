# Spacing and Progressive Inspection

This note describes the lexer, runtime, and CLI ergonomics added in August 2026. It is written for people who read or share `.spw` files as well as people who build tools around them.

The short version: Spw can now name the visible relationship between neighboring pieces of source without yet claiming that every visible difference changes meaning.

## A Reader’s Legend

The lexer reports four kinds of gap:

| Gap | What a reader sees |
|---|---|
| `tight` | two forms touch |
| `open` | space on the same line |
| `cadence` | one line break |
| `episode` | a blank-line boundary |

The exact spaces, comments, tabs, line breaks, and source positions are preserved beside the class. A tool therefore does not have to choose between the human surface and a compact machine description.

For example:

```spw
a.b.c
a . b . c
```

The first line is one tight dotted identifier with the segments `a`, `b`, and `c`. The second line keeps `.` as explicit operator tokens with open gaps around them.

Identifiers were already part of the language. This change makes their dotted segmentation explicit and stops an identifier from swallowing a trailing or repeated dot:

- `a.b.c` remains one identifier, now with segment metadata
- `a.` becomes identifier `a` followed by operator `.`
- `a..b` becomes identifier `a`, connector `..`, identifier `b`
- `a . b` remains an explicit dotted operation surface

Segment metadata is lexical evidence, not an ontological claim. A value such as `index.spw` may also be seen as two tight segments when it appears unquoted; tools must use its surrounding context before calling it a category, property path, or filename.

## One Spacing Product, Three Projections

Run:

```bash
spw inspect spacing path/to/file.spw
```

The default view is a bounded table for quick reading. The same underlying product can be projected as a `.spw` card:

```bash
spw inspect spacing path/to/file.spw --spw
```

or as a versioned JSON envelope:

```bash
spw inspect spacing path/to/file.spw --json
```

This is an intermediate-output pattern: keep one source-linked product, then disclose it at the depth a person, script, or agent needs. The `.spw` card is meant to remain recognizable when copied into a workbench conversation; JSON remains the complete machine interchange form.

The product is marked `observational`. It does not yet make gap classes part of parsing or runtime meaning, and the formatter does not yet migrate between classes.

## Source Products at Useful Depths

Spacing is one question about source. Tools can now ask for three progressively deeper intermediate products without treating every question as a complete parse trace:

| `--through` | Product | Work completed |
|---|---|---|
| `tokens` | `source.tokens/1` | dialect preparation, lexing, exact gaps, lexical diagnostics |
| `structure` | `source.structure/1` | the token product, then the AST and parser diagnostics |
| `trace` | `source.trace/1` | the structural product, then the retained parser event stream |

Use `inspect source` to choose the useful depth:

```bash
spw inspect source path/to/file.spw --through tokens --events none
spw inspect source path/to/file.spw --through structure --sample 8 --spw
spw inspect source path/to/file.spw --through trace --events trace --json
```

A `tokens` request stops before grammar work. `structure` reuses the same lexical pass rather than asking a second parser to reinterpret the source. `trace` widens disclosure over that same structural result and implies the `trace` event policy.

Every stage follows `spw.progressive-product/1` and names its product id, revision, IR kind, sequence, stage, status, completeness, included and omitted fields, deferred deeper forms, and elapsed time. Completeness is measured against the fields requested at that stage. A complete token product can therefore honestly defer an AST rather than calling itself a broken parse.

For a live line-delimited stream, use:

```bash
spw inspect source path/to/file.spw --through trace --events trace --ndjson
```

The lexical record is written when lexing finishes, before grammar work starts. The structure and trace records follow when those products become available. This makes time to first useful output measurable; it is not a final bundle split into lines after completion.

The default human table, bounded Spw card, complete JSON bundle, and live NDJSON stream are projections of the same typed stage records. `--sample N` bounds examples in human and Spw projections only; it does not reduce lexer or parser work. Bounded views state how many token or event samples they omit. JSON and NDJSON retain the complete requested payload.

`index` and `semantic` remain deferred capability names. This increment does not build a sparse workspace index, normalize an AST, incrementally reparse edits, or suppress parser-generator event construction.

## Disclosure and Cost

Parser event products accept three retention policies:

- `none` retains no general events
- `diagnostics` retains errors and warnings in the event channel
- `trace` retains the complete event stream

Errors and warnings remain available through their dedicated arrays under every policy. Products report both generated and retained counts.

Use the CLI flag to compare spacing projections or source-product costs:

```bash
spw inspect spacing path/to/file.spw --events none --sample 12
spw inspect spacing path/to/file.spw --events diagnostics
spw inspect spacing path/to/file.spw --events trace
spw inspect source path/to/file.spw --through structure --events none
spw inspect source path/to/file.spw --through structure --events diagnostics
```

The current parser still constructs its generator events before applying the retention policy. Lower retention reduces stored output, not the full generation cost. The generated/retained receipt makes that limitation measurable for the next performance pass.

The runtime has a parallel policy:

- `none` retains no trace
- `stages` retains normalize/interpret stage landmarks
- `evaluation` retains stage landmarks and node-evaluation detail

Changing either policy must not change tokens, gaps, AST values, runtime values, or register semantics. Hot-session cache keys include the policies so a shallow request cannot accidentally receive a deeper or differently retained cached product.

## Five Different Cost and Meaning Axes

These controls are deliberately separate:

| Concern | CLI | Typed API | What changes |
|---|---|---|---|
| source work | `--through tokens|structure|trace` | `through` | the last progressive stage allowed to execute |
| parser events | `--events none|diagnostics|trace` | `eventPolicy` | retained instrumentation; not yet event generation |
| readable examples | `--sample N` | formatter `limit` | bounded human/Spw disclosure only |
| corpus extent | `--spread near|standard|far` | corpus index configuration | current file/signal preset (`minimal|standard|full`) |
| semantic interpretation | dialect and surface profile | parser profile options | syntax defaults, preprocessing, and provenance |

`through` is not a traversal mode or a parser profile. It means “execute through this stage.” `spread` applies to corpus commands such as `census`, `graph`, `density`, `formula`, `taste`, and `lattice`; it does not change single-source parsing. The current spread presets still couple corpus extent and signal resolution. A later measured slice will separate those dimensions.

Bundle choice is a sixth, package-level concern. A tokens request avoids grammar work at runtime, but it does not make statically imported grammar disappear from a browser bundle. Today Seed exposes a very small lite scanner and a fuller parser entry. Independently built lexer/product/public bundles remain a package-contract question, not a reason to invent performance dialects.

## Clear and Recoverable Output

Readable projections may normalize control characters: token samples use `value_visible` with marks such as `↵`, `⇥`, and `·`. The field name signals that this is a display form. Exact text remains available in JSON and NDJSON.

When a human inspection finishes, its `next` card keeps a safely quoted, copyable command beside the purpose of that move and the additional work or output cost it incurs. This makes a recommendation explainable rather than merely convenient. Help and next steps must not suggest that `--sample` makes parsing faster, that `--events none` suppresses event generation, or that `--through tokens` is a complete syntax judgment.

## Compatibility and Migration

Default library behavior remains disclosure-rich: parser events default to `trace`, and runtime traces default to `evaluation`. The older `captureTrace` runtime option remains as a compatibility alias.

CLI compatibility spellings remain temporarily available: `--product` for `--through`, `--event-policy` for `--events`, `--limit` for source/spacing `--sample`, and `--depth minimal|standard|full` for corpus `--spread near|standard|far`. Compatibility is a migration state. Removal requires an alias inventory, canonical replacement notices, first-party example migration, and one declared version boundary.

The dotted-identifier boundary is the compatibility-sensitive part. Before updating a shared workspace, inspect forms that intentionally end an identifier with `.` or contain `..` without spaces. The new token boundary makes the dot or connector explicit; it does not automatically rewrite the source.

No formatter should collapse `a . b` into `a.b` as an ordinary layout change. A future profile may declare that gap-class crossing as a semantic migration with preview, reparse verification, and a receipt.

## Why This Direction

Spw can act like cartilage between evolving human and machine languages: compliant enough to preserve local expression, but structured enough to carry relationships, costs, and provenance across tools. That metaphor is useful only when the implementation remains inspectable. Raw source, classified gaps, stable projections, and explicit omissions are the present engineering commitments.

Local style learning, workspace-weighted formatting, brace interaction, and HTML/CSS/JS budget projections remain follow-on experiments. This increment supplies observable material for those experiments without silently turning one workspace’s taste into universal syntax.
