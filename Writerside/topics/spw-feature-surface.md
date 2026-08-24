# Spw at Three Depths

Spw helps people and tools ask structural questions of source-shaped knowledge without requiring every question to become a full application or a lossy text search.

The same workbench can be read at three depths. Start with what it enables, open the internals when consequences matter, and treat syntax experiments as experiments until evidence promotes them.

## Feature surface

| Need | Spw affordance | First move |
| --- | --- | --- |
| Recognize a repository | Roots, trees, selectors, and bounded maps | `npm run spw -- roots` |
| Inspect source progressively | Tokens, structure, and retained trace products | `npm run spw -- inspect source file.spw --through tokens` |
| Compare relationships | Census, graph, formula, and analysis projections | `npm run spw -- graph path --spread near` |
| Keep a consumer authoritative | Mount the workbench at `.spw/_workbench` | `npm run spw:mount` |
| Read in an editor | Shared LSP semantics with native editor projection | `npm run lsp` |

Human tables, Spw cards, JSON envelopes, and NDJSON streams are projections of shared products. A compact view may omit detail, but it should say what it omitted and how to ask for more.

### Why the feature is recognizable {collapsible="true"}

- Commands name the question they answer: `roots`, `tree`, `inspect`, `graph`, `formula`.
- `--through` names how far source work proceeds; `--spread` names how much corpus context participates.
- A mounted workbench owns tools, while the surrounding repository owns its documents and local culture.
- Syntax, folding, and structure remain useful when an optional language server cannot start.

## Internal surface

The implementation keeps meaning in portable packages and treats editors as adapters.

| Layer | Owns | Primary path |
| --- | --- | --- |
| Seed | Lexing, parsing, tokens, AST types, source products | `packages/spw-seed/` |
| Runtime | Interpretation, registers, traces, substrate events | `packages/spw-runtime/` |
| LSP | Shared semantic and workspace behavior | `packages/spw-lsp/` |
| CLI | Question-oriented commands and projections | `packages/spw-cli/` |
| Editors | Packaging, launch discovery, and native presentation | `extensions/` |
| Canon | Current claims, conventions, and tooling coordinates | `.spw/`, `lib/spw-v0.3.0/` |

<tabs>
    <tab title="Source pipeline">
        <code-block lang="text">
source → gaps/tokens → structure → retained trace → runtime or projection
        </code-block>
        `inspect source --through tokens|structure|trace` exposes useful boundaries without pretending that every request needs the deepest product.
    </tab>
    <tab title="Editor pipeline">
        <code-block lang="text">
consumer document → editor adapter → shared LSP → Seed/Runtime contracts
        </code-block>
        WebStorm builds against the 2024.2.1 compatibility floor and is verified on 2026.2.0.1 and 2026.2.1. The native LSP adapter remains compatible through platform branch 262; its deprecation is a decision gate before 263.
    </tab>
    <tab title="Mounted pipeline">
        <code-block lang="text">
consumer root → .spw/mount.spw → .spw/_workbench → shared CLI/LSP
        </code-block>
        Consumer paths and workspace identity stay consumer-owned even when the mounted workbench supplies the executable toolchain.
    </tab>
</tabs>

## Syntax laboratory

Spw syntax work should name its evidence state:

| State | Meaning | Example |
| --- | --- | --- |
| Stable | Implemented, tested, and suitable for consumer guidance | `^["frame"]{ ... }` as a named structural container |
| Observational | Tooling preserves evidence without assigning new meaning | `a.b.c` versus `a . b . c` gap and token products |
| Experimental | A proposal with a probe, negative control, and migration question | Semicolon ordinality, workspace-weighted formatting, or prefix/postfix affinity |

```spw
a.b.c
a . b . c

^["sequence"]{
  a ; b ; c
}
```

Spacing products can report `tight`, `open`, `cadence`, and `episode` gaps. They do not yet make every gap semantically significant. A formatter must not silently turn `a . b` into `a.b` as ordinary layout cleanup.

### Run a bounded syntax probe {collapsible="true"}

```bash
npm run spw -- inspect spacing path/to/file.spw --sample 12
npm run spw -- inspect source path/to/file.spw --through tokens --events none --spw
npm run spw -- inspect source path/to/file.spw --through trace --events trace --ndjson
```

Record the source profile, product revision, included and omitted fields, and whether a proposed formatting change reparses to an equivalent structure. Local style may inform a future profile; it does not become universal language law by convenience.

## Continue at the depth you need

- Reader path: `docs/learn/README.md`
- Progressive source products: `docs/runtime/md/spacing-and-progressive-inspection.md`
- Editor and LSP contract: `docs/runtime/md/lsp-editor-integration.md`
- Language few-shots: `docs/lang/md/few-shot.spw.md`
- Architecture and package map: `Writerside/topics/workbench-architecture.md`
