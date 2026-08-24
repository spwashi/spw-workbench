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

## One Product, Three Projections

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

## Disclosure and Cost

Parser event products accept three retention policies:

- `none` retains no general events
- `diagnostics` retains errors and warnings in the event channel
- `trace` retains the complete event stream

Errors and warnings remain available through their dedicated arrays under every policy. Products report both generated and retained counts.

Use the CLI flag to compare the projections:

```bash
spw inspect spacing path/to/file.spw --event-policy none
spw inspect spacing path/to/file.spw --event-policy diagnostics
spw inspect spacing path/to/file.spw --event-policy trace
```

The current parser still constructs its generator events before applying the retention policy. Lower retention reduces stored output, not the full generation cost. The generated/retained receipt makes that limitation measurable for the next performance pass.

The runtime has a parallel policy:

- `none` retains no trace
- `stages` retains normalize/interpret stage landmarks
- `evaluation` retains stage landmarks and node-evaluation detail

Changing either policy must not change tokens, gaps, AST values, runtime values, or register semantics. Hot-session cache keys include the policies so a shallow request cannot accidentally receive a deeper or differently retained cached product.

## Compatibility and Migration

Default library behavior remains disclosure-rich: parser events default to `trace`, and runtime traces default to `evaluation`. The older `captureTrace` runtime option remains as a compatibility alias.

The dotted-identifier boundary is the compatibility-sensitive part. Before updating a shared workspace, inspect forms that intentionally end an identifier with `.` or contain `..` without spaces. The new token boundary makes the dot or connector explicit; it does not automatically rewrite the source.

No formatter should collapse `a . b` into `a.b` as an ordinary layout change. A future profile may declare that gap-class crossing as a semantic migration with preview, reparse verification, and a receipt.

## Why This Direction

Spw can act like cartilage between evolving human and machine languages: compliant enough to preserve local expression, but structured enough to carry relationships, costs, and provenance across tools. That metaphor is useful only when the implementation remains inspectable. Raw source, classified gaps, stable projections, and explicit omissions are the present engineering commitments.

Local style learning, workspace-weighted formatting, brace interaction, and HTML/CSS/JS budget projections remain follow-on experiments. This increment supplies observable material for those experiments without silently turning one workspace’s taste into universal syntax.
