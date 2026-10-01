# Making `~#lens(...)` visible to the LSP: code-change plan (research only, no repo edits)

## Findings

**F1. The parser already builds a structured node for `~#lens(x)`. The LSP never reads it.**
- The lexer emits one `APPOSITION` token (`packages/spw-seed/src/lexer/matchers/apposition.ts:41-110`). The grammar turns it into `Annotation{name, apposition:{body, anonymous}}` (`packages/spw-seed/src/grammar/references.ts:519-560`, `types/ast/nodes.ts:268-289`).
- I checked this on a scratch file. `~#lens(bandwidth symmetry)` produces the token `APPOSITION/named:"~#lens(bandwidth symmetry)"` and the node `Annotation name="lens" appos={"body":"bandwidth symmetry","anonymous":false}`.
- `spw select … --expr '#"lens"'` finds it. The preset `--selector annotations` does not, because it is `{sigil:'#', nodeType:'Operation'}` (`packages/spw-seed/src/query/presets.ts:59`) and returns no matches for any `~#` mark.
- The helpers `appositionParts` and `scanAppositions` are already exported from `@spwashi/spw-seed` (`src/index.ts:114,293`).

**F2. The workspace index drops appositions.** `analyzeFromTokens` (`packages/spw-lsp/src/server-index.ts:1165-1213`) handles only `ANNOTATION`, `PARTICLE` and `OPERATOR('#')`. On my probe the file's index held `…5:lens:depth 5:intent:computational 6:topic:hypothesis…` and nothing for line 5's `~#lens(...)`. As a result:
- workspace symbols for "bandwidth" return `[]`
- workspace symbols for "lens" return only the `~#lens:` colon datum
- the index scan runs through this one function (`:378, :562, :626`), so no file anywhere in the workspace gets its appositions indexed.

**F3. The wonder summary only reads the comment form, and only on the `#:depth` line.** `display.ts:302-304`:
```ts
const depthLine = bodyLines.find((entry) => entry.includes('#:depth'))
const lens = depthLine?.match(/\/\/\s*lens:\s*(.+)/)?.[1]?.trim() ?? null
```
Verified hover output: the comment block shows `**Depth axis:** philosophical · **Lens:** living system`. The apposition block and the colon block show `Depth axis` with no lens.

**F4. The wonder hover is almost unreachable.** Section "1.5 Form geometry" (`display.ts:544-548`) runs before "4. Wonder block hover" (`:628-654`). I hovered every column of `?["…"]`. Only column 0 (the `?` glyph) returns `❓ Wonder`; every other column returns `Form coupling — boundary`.

**F5. The lens part of the wonder inlay hint is dead code.** `buildWonderHint:256` suppresses the lens when `bodyText.includes(lens)`. The lens is always taken from `bodyText`, so it is never shown. The verified hint for the apposition block is ` [? 2 metrics]`, and the comment block gets none. This means inlay parity between forms already holds, since no form shows a lens.

**F6. Hovering the `~#lens(` token itself gives a wrong answer.** `ANNOTATION_RE` (`display.ts:35`) matches `#lens` inside `~#lens(`. The hover says `**#lens** — *topic* … 1 file(s), 1 occurrence(s)`, and that count comes from the `~#lens:` datum on another line (`lookupAnnotation('lens')`, `server-index.ts:679`).

**F7. Semantic tokens do not treat the body as prose.** `~#lens` is painted as property (`semantic-tokens.ts:180-186`) and the body is left unpainted. In `~#lens(it's the root map, 50% done)`, the `50` is painted as a number and the `%` as a keyword (verified). That contradicts `docs/theory/spw/apposition.spw:43-47` ("taken raw to the matching paren").

**F8. The VS Code client would reject a new annotation kind.** `isAnnotationKind` (`extensions/vscode-spw/src/lsp/custom-requests.ts:288-290`) whitelists five kinds. `parseAnnotationRecords` throws on the first unknown entry (`:309-312`), which would empty the whole concepts tree.

**F9. "lens" already means something else in the LSP.** Its `AnnotationKind` `'lens'` is the `#:` particle (`server-index.ts:31,1045-1048`; `display.ts:39,76`; `concepts-tree.ts:64-97`; `docs/theory/index.spw:120 #:lens { read: "categorization / phase", outline: "Enum" }`). So `#:depth` currently shows as "*lens* depth". Putting `~#lens(x)` under kind `'lens'` would pollute:
- the `#:layer` pairing (`display.ts:514-516, 902`)
- the root hover's "Lenses: `#:…`" list (`:857-862`)

**F10. The canonical form is the apposition.**
- (a) What canon says:
  - `docs/theory/spw/apposition.spw:24`: `'~#name(phrase)' { degree: "named reading", … key: queryable }`
  - `:61`: `lens_label: { count: 397, becomes: "~#lens(living system)" }`
  - `:92`: "named the moment it recurs"
- (b) What the code does: commit `cdba3075` migrated 55 lenses via `scripts/migrations/notes-to-appositions.ts:51-53`. The LSP was not updated, so those files lost the lens from their wonder hover.
- (c) Current state outside `.spw/caches`: 336 `// lens:` comments against 56 `~#lens(` appositions. I re-trialled `.spw/editing.spw:56,65` and `.spw/index.spw:100,109`, and all four would now land, so the demoters listed in the commit look fixed for those lines.
- `~#lens:` (datum) is claimed elsewhere as an interpretation key for derived data (`.agents/plans/apposition-cache-granules/apposition-cache-granules.spw:67`) and as a board classification (`docs/features/spw/lens-walk.spw:42-69`).
- `#:lens #!x` is a case+mood braid that binds to the *next* expression (`canonical/particles.ts:4-7`). In a verified test it bound to `null`, and in a full block it would bind to the hypothesis.

**F11. The apposition form gives the depth particles a target.** With `#:depth #!computational ~#lens(x)`, `particleBindings` binds both particles to the `~#lens(x)` expression (verified). With the comment form they bind to `null` or to the next line.

**F12. Canon lenses recur; cache lenses don't.** Canonical files use six lenses for 381 of 387 uses (ecological zone 78, molecular binding 74, formal structure 60, curated collection 59, material grain 56, living system 54). `.spw/caches` has 231 distinct snake_case lenses, 230 of them used once. With single-use lenses, a hover can't aggregate anything.

## Tool-support matrix (verified unless marked)

| Construct | Parser AST | LSP index / ws symbols | Wonder hover | Wonder inlay | Token hover | Sem. tokens | CLI `select --expr '#"lens"'` | CLI `lattice` | CLI census/graph | emit |
|---|---|---|---|---|---|---|---|---|---|---|
| `~#lens(x)` | Annotation + apposition ✓ | ✗ | ✗ | ✗ (dead for all) | misread as `#lens` topic | name ✓, body unpainted, `%`/digits misread | ✓ | ✓ paren | ✗ (only `#:`/`#!`/`#>` counted, `math/corpus.ts:396-397`); counted as "aspect" (`particles.ts:125`) | ✗ |
| `~#lens: "x"` | Annotation + Literal value ✓ | topic "lens" (value not indexed) | ✗ | ✗ | topic | property + string | ✓ | ✓ colon | ✗ | ✓ `traits.lens` (`emit/extract.ts:16-17`) |
| `~#lens: x` | Annotation, **value unbound** (sibling Identifier) | topic "lens" | ✗ | ✗ | topic | property | ✓ | ✓ colon | ✗ | ✗ (needs quotes) |
| `// lens: x` | absent (COMMENT token) | ✗ | ✓ only on the `#:depth` line, col 0 | ✗ | none | comment | ✗ | ✗ | ✗ | ✗ |
| `#:lens #!x` | 2 Particles, bind to next expr | lens "lens" + intent "x" | ✗ | ✗ | `#:lens` lens-kind | type + function | ✓ (Particle) | ✗ | counted | ✗ |

CLI `measure` (`mass.ts`) has no lens or annotation handling; I checked this by grep only.

## Canonical examples (verbatim)

- `.spw/agents.spw:31-32`
  ```
  ?["How would a biology portfolio express .spw/agents?"]{
    #:depth #!stylistic ~#lens(living system)
  ```
- `.spw/editing.spw:55-56`
  ```
  ?["What invariant holds across every frame in Editing?"]{
    #:depth #!computational // lens: material grain
  ```
- `packages/spw-lsp/src/__tests__/display.test.ts:47`
  ```
  '    #:depth #!computational // lens: living system',
  ```
- `.spw/caches/tiktok-live/streaming-pipeline.spw:84`
  ```
    #:depth #!computational ~#lens(bandwidth_symmetry)
  ```

## Recommendations for the caches refactor

Writers should use one line per wonder: `#:depth #!<axis> ~#lens(<phrase>)`.
- Keep the phrase short, lowercase and space-separated (not snake_case).
- Keep it on one line; a newline before `)` is an "Unterminated apposition" error (`apposition.ts:65,78-91`).
- Apostrophes, commas, `%` and balanced nested parens are fine (verified).
- Draw phrases from a small shared lens vocabulary declared once per dated folder, so the hover can report how many wonders share a lens.
- Mark neighbors with `~"path" ~#neighbor(nearest)`, not `~<"path">`. The angle form parses as `op:~` + Capsule, not a PathRef, so `--selector pathRefs` misses it (verified).

Minimal example, verified: it passes `spw-syntax-validate.ts --strict` (1 passed, 62 tokens) with 0 parse errors. `select --expr '#"lens"'` returns lines 6 and 14. `--selector pathRefs` returns line 9. `lattice` shows lens×2, hypothesis×2, neighbor×1.
```
#>wonder_tiktok_live_pipeline_1
?["Why is multiplexing multi-guest video at the edge superior to client-side mesh networking?"]{
  #:depth #!computational ~#lens(bandwidth symmetry)
  ~#hypothesis: "Client-side mesh needs N-squared upload bandwidth; server compositing keeps upload constant per guest."
  !probe{ "Simulate 8 guests on 4G: compare battery and thermal throttling, client mesh vs server-side MCU mixing." }
  ~"../networking/webrtc.spw" ~#neighbor(nearest)
}
```

### Minimal diff plan

**1. `server-index.ts` (index)**
- `:31`: add `'apposition'` to `AnnotationKind`.
- `:33-40`: add `body?: string` to the entry type.
- `:1036`: add `apposition: '~#'` to `BRAID_PREFIX` (the `Record` type forces this).
- `:1166`: add a branch before the `ANNOTATION` branch:
  ```ts
  if (tok.type === 'APPOSITION') { const p = appositionParts(tok.value); if (!p.name) continue
    annotations.push({ file: filePath, line: i, kind: 'apposition', name: p.name, body: p.body.trim(), sectionLabel: framePath.at(-1), framePath }); continue }
  ```
  Leaving appositions out of `localBraids` keeps the context tests unchanged; putting them in is a separate decision.
- `:683-686`: make `searchAnnotations` also match `e.body`.
- Add `lookupReading(name, body)`, which normalises by lowercasing, turning `_` into a space and collapsing whitespace.

**2. `display.ts` (wonder summary, `:302-304`)**
Replace the lens regex with `readLens(bodyLines)`, precedence apposition → datum → comment, scanning the whole body:
```ts
const code = bodyLines.map(stripLineCommentStringAware).join('\n')    // reuse nextVisibleStringDelimiter (:320+)
const cells = scanAppositions(code).cells.filter(c => c.name === 'lens')
lens = paren?.body.trim() ?? unquote(colon?.body) ?? legacyCommentMatch ?? null
```
Add `lensForm: 'apposition'|'datum'|'comment'` to `WonderBlockSummary` (`:63-72`).

**3. `display.ts` (hover, `:476` and `:628`)**
- Move the wonder hover above the section 1.5 form-context hover whenever the cursor is inside `?["…"]`.
- Show `**Lens:** x`, plus "shared by N wonders / M files" from `lookupReading`.
- When `lensForm === 'comment'`, add a note that the lens is not in the AST.
- Add a "section 0.5" apposition hover (find the cell under the cursor with `scanAppositions(line)`) that renders `*apposition (named reading)*` and returns before `ANNOTATION_RE` misreads it as a topic.

**4. `display.ts:1040-1041` (workspace symbols)**
Add `apposition: SK.String` and prefix `~#`, and render the name as `~#lens(bandwidth symmetry)`.

**5. `semantic-tokens.ts:180`**
Match `^~#[\w-]*\(` with a balanced body before the trait match. Emit the name as property+declaration and the body as one `string` token.

**6. Client side**
- `custom-requests.ts:13, 288-290`: add `'apposition'` and `body?`.
- `:309-312`: skip unknown kinds instead of throwing.
- `concepts-tree.ts:64-116`: add the kind-keyed entries; TypeScript will flag any that are missing.

### Tests to add

Existing tests: `display.test.ts` (3), `server-index.test.ts` (2), `semantic-tokens.test.ts` (53). All 58 pass today.

1. The wonder hover at column 5 of `?["…"]` returns Wonder, not Form coupling. This fails today.
2. `~#lens(x)`, `~#lens: "x"` and `// lens: x` give the same hover `**Lens:** x`. The inlay labels stay equal to `[? 2 metrics · neighbor]` (`display.test.ts:75`).
3. When a block has both `~#lens(a)` and `// lens: b`, the lens is `a`.
4. `~#lens(x)` on its own line (not the `#:depth` line) is recognised.
5. `// ~#lens(x)` and `~#hypothesis: "see ~#lens(x)"` do not produce a lens.
6. Hovering `~#lens(` shows `*apposition*`, and the count includes apposition occurrences.
7. The index returns `{kind:'apposition', name:'lens', body:'bandwidth symmetry', framePath}`; anonymous `~#(x)` is not indexed; `~#lens:` stays a topic.
8. `workspaceSymbols({query:'bandwidth'})` finds the apposition.
9. The `getContextAtPosition` braid test (`server-index.test.ts:29+`) is unchanged.
10. The semantic tokens for `~#lens(it's 50% done)` contain no number or keyword token inside the body.
11. The client accepts an `apposition` record and skips an unknown kind.

Run:
```
npx vitest --config vitest.lsp.config.ts run packages/spw-lsp/src/__tests__/{display,server-index,semantic-tokens}.test.ts
npx vitest --config vitest.vscode.config.ts run extensions/vscode-spw/src/lsp/custom-requests.test.ts
npm run build
```

### Risks
- **Client break:** if the server change ships without the client change, the concepts tree empties (F8).
- **Hover ranking shifts:** about 290 existing appositions (232 in `.spw/caches`, 56 elsewhere), plus any the migration adds, would enter `annotationsByName` and change the `topCoOccurrences` rankings in hovers.
- **String and comment blindness:** `scanAppositions` doesn't skip strings or comments. It needs a string-aware strip, or a switch to reading `doc.parseResult.tokens`.
- **Migration order:** rerun `notes-to-appositions.ts` only after the LSP change, or more files lose their hover lens. Run it dry first. Importing the script also starts `main()`, which walks the whole repo (my probe did this and ran over 120s before I killed it, with no writes).

## Open questions and pressure points for Spw theory

1. **"lens" has four meanings:**
   - (i) the `#:` particle kind in the LSP and extension, which the seed canon calls **case** (`particles.ts:2`; `apposition.spw:33`)
   - (ii) the `~#lens(…)` reading
   - (iii) `~#lens:` as a derived-data key, plus the IR lens (`seed/src/ir/lens.ts`)
   - (iv) emit's `lenses: [#a]` list (`emit/extract.ts:25-26,66-69`)

   Renaming the LSP kind from `lens` to `case` would free the word and match the particle lattice.
2. **Apposition vs aspect:** `apposition.spw:33` lists apposition as its own lattice cell. But `ASPECT_MARK = /~#[A-Za-z_]/` (`particles.ts:125`) counts `~#lens(` as aspect, and volatility (`workspace.ts:58-80`) treats that as expiring. A cache full of appositions would be classed volatile by construction.
3. **Binding target (F11):** should depth classify the *reading* (as it does now with the apposition) or the *wonder*? If the wonder, the depth particles belong in the header stack before `?[`.
4. **Scope leak:** LSP ambient braids collect top-level particles for the rest of the file (`server-index.ts:1228-1230`). In my probe, block 2's hover listed `#>wonder_lens_probe_1` as ambient. Seed binding says a particle binds only to the next expression.
5. **Prose body vs reference:** an apposition body can't be a reference, so a lens can't point into a lens registry.
   - `~#lens:~"lenses.spw#x"` binds a PathRef value only **without** the space. `~#lens: ~"…"` leaves the PathRef as an unbound sibling (verified), which looks like a parser quirk.
   - The datum form is also already claimed by the cache-granule plan.
6. **Colon form with a bare identifier:** `~#lens: ident` leaves the value unbound. Is that intended, or should `Identifier` join the value choice (`references.ts:604`)?

Scratch files are in <scratchpad>/understand/:
- `lens-probe.spw`, `variants.spw`, `recommended-wonder.spw`
- `probe-lsp.mts`, `probe-hover.mts`, `probe-bind.mts`, `probe-sem.mts`, `dump-annot.mts`
- `spw.sh`: runs the CLI with the scratch dir as the consumer root.