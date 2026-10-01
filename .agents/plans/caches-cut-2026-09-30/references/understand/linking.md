# Spw linking devices: what the tools actually honour

The best form for a claim-level link today is a bias edge carrying a fragment: `=ref{ ~"path.spw#anchor" }`. `spw resolve`, `spw mount resolve` and `spw expand` all check the anchor. The LSP opens the right file but, because of a bug, not the right line. `spw graph` and `lint:docs:strict` report false breaks on this form. A link to an anchor in another file therefore works in the parser and the CLI, and does not yet land on the line in the editor. `@root` names declared in a parent index are not visible in child files.

## Findings (with evidence)

**F1. Anchors (the `#>` particle) are the only addresses inside a file that the seed resolves.**
- `resolveFragment` looks the name up in `deixisTable`: `packages/spw-seed/src/canonical/resolve-fragment.ts:24-31` and `particles.ts:148-156`. The first anchor with a given name wins (`particles.ts:153`).
- An anchor binds to the next content item (`particles.ts:59-79`).
- Anchors nested three levels deep resolve. In the scratch tree, `#>seidel_coma_abbe` sits inside `^"claim"{^"refinements"{^"coma"{^"conditions"{…}}}}`. Mount marks it ✓ and the fixed LSP wiring lands on L19.
- Edge cases from the scratch probe (`probe5/t.spw`):
  - `#>x` inside a `#[ ]` set does not bind. Mount says "anchor missing".
  - `#>x` inside a `.{}` facet binds only to the next binding line (`k: "v"`), not to the whole facet.
  - A trailing `#>tail` with nothing after it passes mount but `expand` reports it missing.
  - Duplicate anchors are silently first-wins.

**F2. `spw resolve` accepts more fragment forms than the seed.**
- `sourceDeclaresAnchor` (`resolve-citation.ts:76-87`) is a regex that also accepts `^"name"{`, `^["name"]`, `^name[` and `name:`.
- So `~"t.spw#a"`, where `a` is only a frame name, passes resolve but dangles in mount and expand, and the LSP falls back to line 1.
- A `#>in_set` inside a set also passes resolve (verified).

**F3. Bug: in the real LSP, jumping to an anchor goes to line 1.**
- `helpers.ts:212/220/254` return `resolved + hash`.
- `navigation.ts:101-107` and `130-137` pass that string to `fragmentRange`, whose `fs.readFile("…/x.spw#anchor")` fails, so it returns `FILE_START`. The Location and document-link URIs also end in a raw `#anchor`, never `#L<n>`.
- The unit test hides this: `fragment-navigation.test.ts:48` stubs `resolveReferencePath` to return a path without the fragment.
- Verified with `scratchpad/understand/lsp-probe.mts`, which drives the real handlers:
  - real wiring: `~"./aberrations.spw#seidel_five"` → `aberrations.spw#seidel_five L1`
  - with the fragment stripped: → `L9`, link `aberrations.spw#L9`
- `reference-graph.ts:131` already strips the anchor. The fix is the same `stripAnchor` call in `navigation.ts`.

**F4. `@root` references cannot carry fragments.**
- The parser's reference path tokens stop at `#` (`references.ts:32-43`), and so does the LSP regex (`spw-selector.ts:180`).
- Probe: `@spw/tooling/vscode-spw.spw#spw_tooling_vscode` parses as a Reference followed by a detached `op:#:spw_tooling_vscode` mark.
- So `.spw/consequence.spw:17` (`@biome/algos/geom.spw#metric[depth]`) and `.spw/biome/ocean/lsp.spw:14` are not links to an anchor.

**F5. Root scope is per file; parent roots are not inherited.**
- LSP roots are the union of:
  - hardcoded defaults (`helpers.ts:112-139`)
  - `.spw/shelves.spw` (`server-index.ts:386-417`)
  - `.spw/config.json` `roots` (currently `{}`)
  - the same file's `@x: ~"…"` declarations (`parseRoots`, `helpers.ts:141-169`)
- Verified: in the probe, the child's `@sibling/x` and the sibling's `@kid/kid.spw` do not resolve, even though the parent index declares both.
- A bare `@alias` with no slash is never a link, because the regex requires a `/` (`spw-selector.ts:180`). It only gets a hover (`display.ts:839-869`). So `^"dispatch"{ k: @alias }` values cannot be clicked.
- `.spw/index.spw` `^"roots"` is file-local; `mount check` only does substring checks on it (`mount.ts:87-107, 333-336`).
- One cache note is wrong because of this: `.spw/caches/vscode/navigation.spw:53` says `@root` resolves "via .spw/index.spw roots". Its `#>anchor` row there is also wrong: the anchor is a definition site, not a link. And `registerDocumentLinkProvider` does not appear in `extensions/vscode-spw/src`; links come from the LSP (`stdio-server.ts:215`).

**F6. The root registries disagree.**
- `@spec` points to three different places:
  - LSP: `lib/spw-v0.2.0-alpha` (`shelves.spw:18` overrides `helpers.ts:116`; verified)
  - `spw roots`: `lib/spw-v0.3.0` (`workspace.spw:20`)
  - `spw-path-check.ts:295`: `lib/spw-v0.1.0-alpha`
- `lint:docs:strict` does not know `@spw` (verified: "Unknown root @spw").

**F7. `spw graph` / `spw census` resolve path refs file-relative only, keep the fragment, and never resolve root refs.**
- Path refs: `corpus-scan.ts:199-200`. Root refs are kept as raw pseudo-nodes (`corpus-scan.ts:215-227`). Only `kind: 'path'` targets are checked for breakage (`corpus.ts:200`).
- **Same canon links, three verdicts** (`.spw/canon-mount.spw:49-51`):
  - graph: 3 broken (`.spw/.spw/registries/…`)
  - `spw resolve`: `ok=3 via_root=3`
  - `mount resolve`: 3 ✓, anchors checked
- Whole `.spw` tree: graph reports 22 broken; resolve reports 3 missing (19 resolved via the root).
- Current caches: 208 files, 696 links, of which only 244 are path refs. The other 452 are alias pseudo-edges. The pseudo-node `taste` has in-degree 60 and is the #3 hub: 30 indexes each have `@taste` in both `^"roots"` and `^"dispatch"`, and all 30 different `taste.spw` files collapse into one node.
- Any anchored ref whose resolved path contains `/` is flagged broken, and each `file#anchor` becomes its own node, split from the file.

**F8. The "`~` in string list" discrepancy did not reproduce.**
- Census and `select` path-ref counts match on `jetbrains/features` (2/2), `cache-layer` (2/2) and `syntax-highlighting` (0/0, which contains `["!", "^", "~", …]`).
- The `~:N` figure in `sigil_rhythm` / `sigilTop` is a raw character histogram (`corpus.ts:379-389`) that counts `~#` marks.
- The discrepancies that are real:
  - The LSP runs its regex pass first (`spw-selector.ts:131, 300-304`). It therefore links `~"…"` inside `#` comments (verified: `# see ~"./nothere.spw"` produces a pathRef and an unresolved diagnostic).
  - It also catches the labeled form, which the parser drops (F9).

**F9. Parser bug: the labeled form `~<tag>"path"` is not a path ref.**
- The bounded-path branch (`references.ts:304-345`) fails on any identifier inside `<…>` before the tag branch (`:351`) runs.
- Result: `~<see>"./x.spw"` parses as `op:~` + `Capsule<see>` + a separate Literal (verified).
- There are 394 of these in the corpus, e.g. `docs/toc.spw:44,45,79,107`. They are missing from `select pathRefs`, graph and resolve, while the LSP still links them.
- Canon specifies `parse_rule: "~ < identifier > string"` (`docs/specs/spw/reference-conventions.spw:33-46`). No seed test covers the form.

**F10. Other forms that no tool treats as links.**
- `~<"path">`, the quoted-angle "neighbor" form (157 uses, e.g. `.spw/index.spw:114`), is invisible to the parser and to both LSP regexes.
- `~#tag "path"`, the tagged ref in `reference-conventions.spw:47-58`, parses as an Annotation plus a Literal.
- `~<@root>` parses as a plain Reference.
- `a <> b` gives a standalone `op:<>` expression. `=>` splits the sequence. `~>` leaves two unrelated PathRefs in one expression. No tool reads any of these as an edge. Per `coupling-constructors.spw:31`, `<>` couples registers at runtime, not surfaces.

**F11. Bias edges are the only typed, anchor-aware relation between files.**
- `readBias` keeps the fragment (`read-bias.ts:57-63`). `mount resolve` checks anchors and suggests existing ones (`mount.ts:540-553`).
- `expand` inlines the region an anchor binds to, recursively, and stops on cycles (verified output). This is a working bundling device.
- Canon: `.spw/registries/bias-product.spw:22-34`.
- Caveats:
  - `resolveTilde` tries the current working directory first (`bias-edges.ts:48-50`). Run from a subdirectory, root-relative targets give "template not found" (verified).
  - `templateSites` (`expand.ts:34-38`) inlines every reflexive path edge, including `=bane[contests]`.

**F12. Current caches: the anchors exist but nothing links to them.**
- 440 anchors, 0 anchored refs, 0 bias edges, 135 numbered `#>wonder_N` anchors.
- 18 `../`-relative cross-tree refs (7 to `extensions/`, 6 to `tooling/`, …). All of them break when the tree moves one level down into `2026-09-30/`.

**F13. What the LSP does with anchors.**
- Outline shows only anchors among particles, nested correctly (`outline.ts:40-48, 81-83`). Workspace symbol search finds anchors (`display.ts:1017-1055`).
- "Find references" on `#>name` returns every particle with that name workspace-wide (`navigation.ts:225-242`). There is no reverse lookup for "who cites `file#name`".

**F14. Other tools.**
- `spw measure`'s `@self: ~"…"` is file-relative only (`mass.ts:185`).
- Emit's "anchors" are prompt-continuity anchors (`emit/continuity.ts`), not `#>` anchors.
- `.spw/surfaces/publish.spw:24` maps `#>anchor` to `<span id>`, but no code implements it (grep for `spw-anchor` finds 0 hits). That mapping is aspirational.

## Tool-support matrix

✓ works · ✗ not recognised or wrong · ~ partial · ◌ becomes a pseudo-node (unresolved, never checked)

| Construct | Parser node | LSP def / link | LSP line for `#frag` | graph / census | `spw resolve` | mount / expand | path-check |
|---|---|---|---|---|---|---|---|
| `~"./x.spw"` | PathRef | ✓ | – | ✓ | ✓ | ✓ | ✓ |
| `~"./x.spw#a"` | PathRef | ✓ file | ✗ (F3) | ✗ split node, false broken | ✓ (loose, F2) | ✓ checks `#>` | ✓ (fragment stripped) |
| `~".spw/x.spw#a"` (root-relative) | PathRef | ✓ via root fallback | ✗ (F3) | ✗ broken | ✓ via root | ✓ (cwd-dependent) | ✗ |
| `~<./x.spw>` | PathRef | ✓ | – | ✓ | ✓ | – | ~ |
| `~<tag>"x"` | ✗ (F9) | ✓ via regex | ✗ | ✗ | ✗ | ✗ | ~ |
| `~<"x">` / `~#tag "x"` | ✗ | ✗ | – | ✗ | ✗ | ✗ | ✗ |
| `@root/path` | Reference | ✓ with shelves / defaults / same-file roots | – | ◌ | ignored | not checked | ~ (roots differ) |
| `@root/path#a` | Reference + stray mark | file only | ✗ | ◌ | ignored | ✗ | ~ |
| bare `@alias` | Reference | hover only | – | ◌ (e.g. `taste` ×60) | – | – | – |
| `=ref{…}` / `=[ax]{…}` / `=bane{…}` wrapping `~"…#a"` | Operation (bias) | as its inner PathRef | ✗ (F3) | as its PathRef | ✓ | ✓ / expand bundles | as its PathRef |
| `#>a` definition | Particle | outline, workspace symbol ✓ | target | – | – | ✓ | – |
| `<>`, `=>`, `~>` between refs | op / separator | ✗ | – | ✗ | ✗ | ✗ | ✗ |
| `~"x"` in a `#` comment | – | ✓ (false link) | – | – | – | – | – |

`spw measure`: only `@self: ~"…"`. `spw emit`: no link handling.

## Canonical examples (verbatim)

- `.spw/conventions/naming.spw:19-20`
  ```
  anchors: "one #>spw_* anchor per canonical file"
  root_refs: "@root/path for cross-tree, ~\"./sibling\" for local adjacency"
  ```
- `.spw/shelves.spw:22-23`
  ```
  "Use @roots for cross-tree references.",
  "Use relative ~\"./...\" only for siblings in the same shelf."
  ```
- `docs/specs/spw/reference-conventions.spw:75-77`
  ```
  paths: "Always relative from the referencing file"
  roots: "Define @alias in ^[roots]{} at doc top"
  ```
- `.spw/canon-mount.spw:49`
  ```
  =ref{ ~".spw/registries/dialect-spec.spw#spw_dialect_registry" }
  ```
- `.spw/registries/bias-product.spw:24,26`
  ```
  labeled: `=ref{ ~"registries/dialect-spec.spw#spw_dialect_registry" }`
  axial: `=[depth]{ deep shallow }`
  ```
- `.spw/index.spw:15-17` / `50-52` (the roots-plus-dispatch pair)
  ```
  @workspace: ~"./workspace.spw"
  …
  mount: @mount
  ```
- `.spw/topology.spw:13-14`
  ```
  ^subroot[biome]{
   path: @biome
  ```
  The LSP reads this for tier classification only, not for resolving links (`server-index.ts:419-480`).

Canon itself is split. It says to use file-relative paths and `@roots` for cross-tree links, while `canon-mount.spw` uses root-relative bias edges.

## Recommendations for the caches refactor

Write the form that canon means, and fix the small tool gaps (listed below), rather than bending the surfaces around bugs.

1. **Parent → child routing.** Use one `^"dispatch"{ key: ~"./child/index.spw" }` table with path values and no fragment. Drop the `^"roots"` + `^"dispatch"` pair (F5, F7).
2. **Siblings and cousins inside the snapshot.** Use file-relative paths such as `~"./x.spw#anchor"` or `~"../other_domain/x.spw#anchor"`. The whole dated tree moves as one unit, so these stay valid.
3. **Cross-tree links into canon** (`.spw/…`, `docs/theory/…`, `packages/…`, `extensions/…`). Use a root-relative path inside a bias edge, e.g. `=ref{ ~".spw/tooling/vscode-spw.spw#spw_tooling_vscode" }`. `canon-mount.spw` already does this, and it does not depend on how deep the file sits. Do not use `@spw/…`: it cannot carry an anchor, and resolve, mount and path-check do not handle it.
4. **Links to a specific claim.**
   - Put `#>domain_claim` directly before one boundaried `^"claim"{…}` frame. Never put anchors inside `#[ ]` or `.{}`, and never cite a frame name as a fragment.
   - Make anchor names unique across the workspace and meaningful (not `wonder_N`), because workspace symbols and "find references" look anchors up by name (F13).
   - Express relations as bias edges:
     - `=ref{}` for keystone citations (`expand` bundles these).
     - `=[prereq|evidence|contrasts|extends]{}` for typed relations.
     - `=bane[contests]{}` for contested or refuted claims.
     - Keep `#:status #!settled|contested|refuted` on each claim.
5. **No up-links.** Children should not link back to their parent. Backlinks come from the LSP `spw/referenceGraph`. Up-links would make the graph cyclic, and the layer view disappears on cyclic graphs (`corpus.ts:168-178`).

**Verified sample** (in the scratch mirror consumer root `scratchpad/understand/probe4/.spw/caches/2026-09-30/`):

```
#>seidel_five
^"claim"{
 #:status #!settled
 text: "Third-order (Seidel) theory names five monochromatic aberrations: …"
 =[prereq]{ ~"./emulsion.spw#grain_granularity" }
 ^"refinements"{ #>seidel_coma ^"coma"{ … ^"conditions"{ #>seidel_coma_abbe ^"abbe_sine"{ … } } } }
}
#>chromatic_split
^"claim"{
 #:status #!contested
 =bane[contests]{ ~"./aberrations.spw#seidel_five" }
}
```

The optics index uses `^"dispatch"{ aberrations: ~"./aberrations.spw" … }` and `^"canon"{ =ref{ ~".spw/tooling/vscode-spw.spw#spw_tooling_vscode" } … }`.

Results:
- Syntax check: 4/4 pass. `select --selector all` gives 39, 74, 101 and 39 nodes.
- `spw resolve`: `ok=11/11, via_root=3`.
- `mount resolve`: 8 edges, `dangling=0`.
- `expand`: inlines the keystone claims recursively.
- `spw graph`: **6 broken**, all false positives (3 anchor-split nodes, 3 root-relative paths).
- LSP: correct file; correct line only with the F3 fix.

**Tool fixes this depends on, in priority order:**
1. `navigation.ts`: call `stripAnchor` on the resolved path before `fragmentRange` and `uriFromPath`, and fix the test stub.
2. `corpus-scan.ts:199`: split the fragment with `classifyCitation` and try the file directory, then the consumer root, the same order `resolve.ts:131-144` uses.
3. `references.ts:304-345`: when the angle interior is not path-shaped and a string follows, fall through to the tag branch. Add a test.
4. `bias-edges.ts:50`: resolve against the consumer root instead of the working directory.
5. Make shelves, workspace, the LSP defaults and path-check agree on one root registry, and make path-check fall back to the root.
6. Graph: resolve `@root` refs, or at least stop creating pseudo-nodes for `@x:` declarations.

## Open questions for Spw theory

- **A root-qualified path that can carry a fragment.** Could `~<@spw>"tooling/x.spw#a"` (the labeled form with an `@` perspective) be it? The alternative, `@x/y#z`, collides with how `#z` lexes as a particle.
- **Only anchors as addresses?** Should anchors be the only address, as `outline.ts:40-47` assumes (resolve would then drop frame names)? Or should frames get implicit anchors?
- **Binding scope.** Should an anchor bind to the rest of its enclosing container? Today inside a facet it binds only the next line, and inside a set it binds nothing.
- **Duplicate and trailing anchors.** Duplicates (silently first-wins) and a trailing anchor with nothing after it should produce diagnostics.
- **Relation type vs axis.** `=[axis]` means "the register being biased" (`bias-product.spw:17`). Using it for relation types stretches that meaning. Should `expand` also skip `bane` edges and filter edges by label?
- **Inheriting roots.** Should an index's `^"roots"` pass down to its children (for example through `^subroot`), or stay file-scoped as `reference-conventions.spw:77` says?
- **Inbound citations per anchor.** No tool counts how many links point at each anchor. That count is the natural measure of a claim's weight and could be a metric handle for the caches.

Scratch evidence is in `<scratchpad>/understand/`: `probe1/`, `probe4/` (the mirror tree), `probe5/`, and `lsp-probe.mts` / `lsp-probe-stripped.mts`.