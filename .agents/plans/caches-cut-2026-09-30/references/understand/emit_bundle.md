# Axis report: per-script publishing value and bundling resonance

## Findings

**F1. `emit` publishes one file at a time and never follows references.** `emitPackFromFile` reads a single path (`packages/spw-cli/src/emit/index.ts:82`). Pointing it at a directory fails with `spw: EISDIR` (tested on `.spw/caches/language-features`). The IR does collect references into `includes` (`extract.ts:22` regex, `:95` loop, `types.ts:42`), but no code ever reads that list back. The codecs ignore it, and `emit.ts:156` only prints it in `fields` mode. So "bundling" in emit is a manifest of references, never an inlined bundle. **(b)**

**F2. Without a `^"emit"` frame, the whole file is read, and repeated keys overwrite each other.** `extract.ts:43` falls back to the entire source when there is no `^"emit"` frame. Every `key: "string"` becomes a flat trait or slot, and a later value replaces an earlier one (`extract.ts:79`). Checked with an in-process survey of all 208 cache files:
- 0 files have a `^"emit"` frame.
- 0 files have `claim`, and 3 have `title`.
- The brief pack averages 251 characters, which is just goal plus taste.
- 232 `~#hypothesis` values exist but only one per file survives. 30 files lose some this way.

For example, `spw emit fields .spw/caches/language-features/spw-resonance.spw` keeps only the last `spw_adaptation` and `benefit` of five frames. Wonder texts (`?["…"]`) and `!probe{}` bodies are never extracted. **(b)**

**F3. What each host renders is fixed per host** (`codecs.ts`):
- `brief` (`:205`) renders only title, goal, audience, claim, proof, door, taste, acceptance and register.
- `plain` renders every trait, but only when there is no body slot (`summary`, `body`, `final_prompt`, …) (`:90`, `:99-121`).
- `eng_note` (`:182`) and `json` always render every trait.

Provenance mirrored into `^"emit"` as `~#as_of`, `~#source` or `~#status` shows up in `eng_note` and `plain` but not in `brief` (tested). A `^"provenance"{}` frame is read by nothing (grep finds no `as_of` or `"provenance"` reader in `packages/*/src`). **(b)/(c)**

**F4. The IR's `sourcePath` is absolute.** `spw emit ir .spw/caches/vscode/features.spw` prints `"~/…"` (`types.ts:37`, `index.ts:82`). A published JSON pack would leak the local user path, which the project's privacy rule for commit messages forbids. **(b)**

**F5. `spw expand` is the only real transclusion bundler.** It follows only bias-edge path targets (`expand.ts:34-37`):
- It frames each target in `<< # ⟵ ~"…" … >>`.
- It recurses to depth 4 (`:31`) and guards against cycles with a visited set keyed by the label as written.
- It writes `<stem>.expanded.spw`, which scanners skip (`derived-surface.ts`).
- With a `#fragment`, it projects only the node that anchor binds to (`expand.ts:94`, `particles.ts` `deixisTable`).

Verified on scratch: the index's `^"bundle"{ ={ ~"./thin-lens.spw#optics_thin_lens_claim" } … }` expanded into a digest of the two claim frames, including their nested `^"limits"`. The expanded output passes `spw-syntax-validate`. Plain `~"…"` refs, `^"roots"` and `~<…>` are never followed. **(b)**

**F6. Canon and code disagree on which edges `expand` follows.** The registry says `expand: "template — reflexive path edges are provenance"` (`.spw/registries/bias-product.spw:34`). The filter checks only `!site.edge.anchor`, and in `=next{…}` or `=ref{…}` the label is an `operatorLabel`, not a subject. So labeled edges are transcluded too. Verified on scratch (`=next{}` unfolded) and on canon: `spw expand .spw/canon-mount.spw` unfolds the three `=ref{}` edges at lines 49-51. `bias-apply.ts` calls labeled edges "resolution or template edges", so the code is at least consistent with itself. Anchored edges `=@from{@to}` are rewrite patches, but only when passed to `mutate --bias <file>`. **(a)≠(b)**

**F7. An anchor's projection is the anchored node, not the file.** A particle run binds to the first content item after it (`particles.ts`, `bindItems`). So `~"x.spw#cache_x"`, where `#>cache_x` sits in the header, projects only the first frame (usually `^"intent"`). The canon demo shows this: `#spw_dialect_registry` projects only a `^seed[…]` line. Particles placed before an anchored frame are dropped from the projection. Tested: `#>claim_outside` then `#:status #!contested` then `^"claim"{}` unfolds without the status. **(b)**

**F8. Resolution order differs between tools.** `resolve.ts:132` and the LSP try the citing file's directory first, then the root (commit 2c082311). `bias-edges.ts:50` `resolveTilde`, which `expand` and `mount resolve` use, tries cwd first. Verified with a decoy `lens.spw` at the scratch root: `expand` transcluded the decoy while `resolve` reported `basis=file`. The repo root has an `index.spw`, so a future `={ ~"./index.spw" }` in caches, expanded from the repo root, would pull in the root index. **(b) bug**

**F9. The three graph tools disagree about links.**
- **`spw graph`** (`corpus-scan.ts:199`) keeps `#fragment` in the target. On a scratch tree where `spw resolve` reports 6/6 fragment refs OK, it reports "broken path targets (3)" and splits each file into two nodes. It also counts every `@name` as a global `root` link (`:215-229`). That is why `taste` shows as a hub with in-degree 60 in `.spw/caches`: `@taste` is declared 30× in `^"roots"` and used 30× in `^"dispatch"`. The `root_shelves` strand reads this as familiarity.
- **`spw atlas`** works at token level: it counts `~` followed by a STRING only (`atlas.ts:143`), so `~<p>` gives 0 edges (tested). It groups regions by the first path segment (`:73`), so all of `.spw/caches` is one region, `.spw`. It falls back to basename matching (`:150`), which is risky with 53 `index.spw` and 30 `taste.spw`. It does handle fragments and dangling refs.
- **`spw resolve`** counts `~<p>` and checks anchors (`sourceDeclaresAnchor`). **(b)**

**F10. The current caches are almost unlinked.** `spw resolve --from .spw/caches` shows 244 refs, all OK, and 0 with fragments. 34 of the 43 citing files are indexes, and ~165 leaf files cite nothing. `mount resolve` finds 0 bias edges. `atlas` shows 440 anchors (232 `wonder…`, 207 `spw_cache…`) and 0 deep links. `.spw/caches/index.spw` is adrift: `.spw/index.spw` has no route to caches (`atlas --advice`). **(b)**

**F11. Lineage and status have narrow, specific readers.** `^"lineage"{ mode base revision parent derivative_id }` is canon (`prompts/templates/derivatives.spw:34-47`). `emit holes` reads it via `parseLineage` (`template-fill.ts:248`), and `stampDerivative` writes it (`:268`). `parseLineage` accepts `base: "…"` without `~`, so a base that no longer exists does not fail `resolve`. `emit holes` checks lock status only as the key form `status: #locked|#shipped`, not the `#:status` particle. **(b)**

**F12. Emit's integrity checks are copywriting heuristics.**
- `--strict-continuity` requires each `continuity` anchor to appear in the composed text. The anchor list is split on `| ; ,` (`continuity.ts:17-23`), so an anchor containing a comma breaks apart.
- `--strict-positive` flags lines that start with `never`, `avoid`, `do not`, `not a|the…` (`positive-ground.ts:6`). Honest scientific negations can trip it, so writers should state boundary conditions positively (`holds:` / `fails:`).

**(b)**

## Tool-support matrix

(✓ = supported, ✗ = not, ~ = partial or with caveat)

| Construct | Parser | LSP | `graph` | `atlas` / `resolve` | `mount resolve` | `emit` | `expand` |
|---|---|---|---|---|---|---|---|
| `#` title block | Seed prose | – | ✗ | ✗ / ✗ | ✗ | ✗ (hash-resonance.spw:102-106 says it "may travel", (c)) | whole-file only |
| `#>anchor` header stack | Particle; binds to 1st frame | fragment → line | ✗ | anchor namespace, dangling check / `sourceDeclaresAnchor` | anchor check on bias targets | ✗ | projects bound node only |
| `^"roots"{ @x: ~"p" }` | PathRef + Reference | link; @root rename | path edge **+ global `@x` node** | ✓ / ✓ | ✗ | `includes` (not followed) | ✗ |
| `^"dispatch"{ k: @x }` | Reference | @root nav | inflates hubs | ✗ / ✗ | ✗ | ✗ | ✗ |
| `~"p#frag"` in a frame | PathRef | go-to line | ~ **reports "broken"** | ✓ deep link / ✓ | ✗ | `includes` | ✗ |
| `={ ~"p[#a]" }` | Operation, bias | link | ~ (fragment issue) | ✓ / ✓ | ✓ existence + anchor | `includes` | **transcludes** |
| `=label{ ~"p" }` | bias with label | link | ~ | ✓ / ✓ | ✓ | `includes` | transcludes ((a) says it shouldn't) |
| `~<p>` | PathRef (verified) | regex fallback | ✓ | **✗** / ✓ | ✗ | `includes` | ✗ |
| `^"emit"{}` | frame | – | – | – | – | scopes extraction; stops key overwrites | – |
| `^"lineage"{}` | frame | – | – | base ref ✓ | ✗ | `holes` reads it | – |
| `^"provenance"{}` | frame | – | – | – | – | **no reader** | travels if in projection |
| `#:status #!x` | Particle | – | – | mood count | – | ✗ | dropped if before the frame |

## Canonical examples

- A publishable pack's emit frame, `prompts/domains/publishing/packs/quiet-board.spw:41-51`:
  ```
  ^"emit"{
   register: #voice_web_quiet
   ~#title: "Quiet Board"
   ~#claim: "Keep the work visible."
   ~#proof: "one screen, one verb"
   ~#door: "Open the board"
   ...
   continuity: "Quiet Board | one screen | one verb"
  ```
- Labeled bias deep links, which `expand` does unfold, `.spw/canon-mount.spw:49`:
  `=ref{ ~".spw/registries/dialect-spec.spw#spw_dialect_registry" }`
- The bias forms, `.spw/registries/bias-product.spw:22-28`: `reflexive: \`={ ~"template.spw" }\``, `labeled: \`=ref{ … }\``, `anchored: \`=@old{ @new }\``, `axial: \`=[depth]{ deep shallow }\``
- The lineage block shape, `prompts/templates/derivatives.spw:37-44`: `^"lineage"{ mode: #fork base: ~"…" revision: 1 parent: "" derivative_id: "…" }`
- The brief template's fields, `prompts/templates/media/brief.spw:22-35`: `~#title: $title … ~#acceptance: $acceptance continuity: ${continuity=_}`

## Recommendations for the caches refactor

1. **Give every leaf note a fixed shape, in this order:**
   1. Title block of 2-3 `#` lines.
   2. `#>cache_<cluster>_<slug>`, unique across the tree.
   3. Kind and cluster tags: `#:cache #!note` and `#:domain #!<domain>`. Drop `#:layer #!pragmatics`.
   4. `^"emit"{}`.
   5. `^"provenance"{}`.
   6. `^"links"{}`.
   7. The anchored content frames.

   Keys inside `^"emit"` must be unique and use brief's vocabulary: `~#title ~#claim ~#proof ~#door ~#audience ~#goal ~#acceptance continuity:`. Each continuity anchor must appear in title, claim, proof or door. Gate each file with `emit pack <f> --host brief --strict-continuity --strict-positive`.
2. **Split linking into two devices by what they do:**
   - **Pointer, no transclusion:** plain pathRefs in `^"links"{ up: ~"./index.spw#cache_optics" needs: ~"./thin-lens.spw#…" }`. `resolve`, atlas and the LSP all check these. Key names are the typed relation (`up`, `needs`, `contrasts`, `supersedes`).
   - **Bundle membership, transcluded:** reflexive `={ ~"./note.spw#<note>_claim" }` only inside an index's `^"bundle"{}`. Use a fragment for a digest, no fragment for the full text.

   Avoid `=label{}` until F6 is settled. Avoid `~<p>` (atlas can't see it), `^"dispatch"` (fake hubs), and `=@x{}` (rewrite semantics).
3. **Put epistemic status inside the anchored frame, not above it,** so it travels in a bundle (F7): `#>x_claim` then `^"claim"{ #:status #!settled statement: … ^"limits"{ holds: … fails: … } }`. Give every claim or hypothesis its own named anchor: `#>optics_aperture_claim`, not `wonder_…_1`.
4. **Record provenance twice.** Keep `^"provenance"{ as_of generator sources reviewed_by }` as the durable record. Mirror a one-line `~#source` into `^"emit"` so it reaches the `eng_note` and `json` packs. For files ported from the old tree, stamp `^"lineage"{ mode: #fork base: "<old path>" … }` with a quoted string, not `~`, so deleting the old tree doesn't make `resolve` fail.
5. **Give each cluster directory an `index.spw`** with its own `^"emit"` as the cluster pack and a `^"bundle"` digest. Link it from `.spw/caches/2026-09-30/index.spw`, and link that from `.spw/index.spw`. Avoid bare `./index.spw` in bias edges until F8 is fixed; use `../<cluster>/index.spw`.

**Verified minimal example.** It passed `spw-syntax-validate`, `spw select --selector all`, `emit pack --host brief --strict-continuity --strict-positive` (exit 0), `resolve` (6/6), `mount resolve` (2/2 ✓), atlas (6 deep links, 0 dangling) and `expand` (claim digest). File: `<scratchpad>/understand/publish-axis-rec/optics/thin-lens.spw`
```
# Thin Lens Equation
#
# A thin lens maps object distance to image distance through one focal length.

#>cache_optics_thin_lens
#:cache #!note
#:domain #!physics
#:status #!settled

^"emit"{
 ~#title: "Thin Lens Equation"
 ~#claim: "For a thin lens in paraxial light, 1/f = 1/d_o + 1/d_i."
 ~#proof: "Refraction at two surfaces under the small-angle limit (Hecht, Optics, ch. 5)."
 ~#door: "Next: how the aperture trades light against depth of field."
 ~#audience: "first-year optics students"
 continuity: "Thin Lens Equation | paraxial"
}

^"provenance"{
 as_of: "2026-09-30"
 generator: "gemini-3.8-flash-high"
 sources: #[ "Hecht, Optics, 5th ed., ch. 5" ]
 reviewed_by: #none
}

^"links"{
 up: ~"./index.spw#cache_optics"
 next: ~"./aperture.spw#optics_aperture_claim"
}

#>optics_thin_lens_claim
^"claim"{
 #:status #!settled
 statement: "1/f = 1/d_o + 1/d_i"
 ^"limits"{
  holds: "paraxial rays; lens thickness much smaller than focal length"
  fails: "thick lenses and wide field angles need the lensmaker and aberration terms"
 }
}
```
The index has the same shape, plus `^"bundle"{ ={ ~"./thin-lens.spw#optics_thin_lens_claim" } ={ ~"./aperture.spw#optics_aperture_claim" } }`.

**Code fixes that would make this clean** (none made; this was read-only):
- `corpus-scan.ts:199`: strip `#fragment` before resolving.
- `bias-edges.ts:50`: try the file's directory first.
- `emit`: accept a directory, or follow `includes` or `^"bundle"` edges; read `^"provenance"`; make `sourcePath` relative.
- Decide F6 in either the registry or `expand.ts:36`.
- `atlas`: count `~<p>`, and add a region depth option.

## Open questions and pressure points for Spw theory

- **Anchor binding versus a "file" anchor.** A header-stack `#>` addresses the first frame, not the surface. Should there be a surface-level deixis (e.g. `#>>` or a file anchor) so `~"f#x"` can mean "the whole file"? And should a particle run stacked before a frame count as part of the anchored node, so status or case marks travel with it?
- **Does a label turn a lean into a verb?** `=next{}` and `=ref{}` transclude today. If labels carry relation types, the lattice needs a rule for which labels are pointers only, perhaps a valence (`bone` = pointer, `boon` = transclude).
- **Is `@name` global or local?** The graph treats `@taste` as one entity across 30 files. Are root shelves file-scoped bindings (canon's "roots" implies so) or corpus-wide names?
- **Aspect share doubles as volatility.** Atlas reads `~#` density as "content expires" (`particles.ts` ParticleMix doc). The caches use `~#` as a generic key prefix, so the volatility reading gets polluted. Should `^"emit"` keys become case or mood (`#:`) instead?
- **`//` versus `#` marginalia.** hash-resonance.spw:8-10 says to migrate away from `//`, yet the canon wonder blocks put `// lens:` in them (bias-product.spw:46). Publishing needs one inscription form that survives into packs.
- **Scientific status has no particle vocabulary yet.** The existing `#:status` moods are active, proposed, partial and measured; none of them is contested, refuted or superseded. Adding those would clash with emit's positive-ground heuristic.