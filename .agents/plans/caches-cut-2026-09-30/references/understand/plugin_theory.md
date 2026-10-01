# Axis report: VS Code and JetBrains plugin theory and feature awareness

**How to read this report**
- **(a)** means the canon says it. **(b)** means the code does it. **(c)** means it is aspirational or only in docs.
- **Verified** means I ran it: a node port of the plugin logic, the seed or LSP code, or the `spw` CLI, run on scratch files.
- Path abbreviations:
  - `vsc/` = `extensions/vscode-spw/src/`
  - `ij/` = `extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/`
  - `lsp/` = `packages/spw-lsp/src/`

## 1. Findings

1. **VS Code has two semantic layers: the LSP client and a regex layer of its own.**
   - (b) `package.json` declares 22 commands, 14 settings, 23 colors, 24 snippets, 2 views and **0 keybindings**.
   - `vsc/surface-decorations.ts:191-401` classifies annotations, `status:` tiers and valences again, using regex. That breaks invariant (a) `.spw/tooling/vscode-spw.spw:108`.
   - Dead code: `vsc/semantics.ts:7-33` (SIGIL_SEMANTICS is passed through `context.ts` and never read). Only 1 of the 7 event-bus events is ever emitted, and nothing listens (`vsc/context.ts:52-105`).
2. **JetBrains is TextMate, line-regex native features, and the default native LSP client.**
   - There is no ParserDefinition and no `spw/*` custom request (`plugin.xml:33-73`; `ij/SpwLspServerSupportProvider.kt:128-143`).
3. **The LSP advertises 19 providers and dispatches 23 `spw/*` methods.**
   - Providers: `lsp/stdio-server.ts:209-245`. Methods: `:328-396`.
   - VS Code calls 14 of the methods; JetBrains calls none.
   - The client syncs the `spw` settings section (`vsc/extension.ts:98`), but the server has no `workspace/didChangeConfiguration` case (`:413-479`). Settings are read only at initialize (`lsp/helpers.ts:77-78`).
4. **"lens" names four different constructs.**
   - (b) The LSP annotation kind `lens` is the `#:` case particle (`lsp/server-index.ts:1038,1047`).
   - (b) The seed's named apposition is `~#lens(x)` (`packages/spw-seed/src/lexer/matchers/apposition.ts:1-12`).
   - (b) The wonder inlay hint reads only `// lens: x` on the `#:depth` line (`lsp/handlers/display.ts:302-304`).
   - (b) emit reads only `lenses: [#x]` (`packages/spw-cli/src/emit/extract.ts:25-26,65-69`).
   - (a) The canon migrates `// lens:` to `~#lens()` (`scripts/migrations/notes-to-appositions.ts:50-54`), but the LSP was never updated.
   - Counts: in the canon, 333 of 416 `#:depth` lines use `// lens:` and 55 use `~#lens()`. In the caches, all 232 use `~#lens()`, which the LSP cannot see.
   - Verified: the APPOSITION token is absent from the index and from the context braids. localBraids on a wonder line was `[#:depth, #!computational]`.
5. **A Spw-native linking device already exists, and the caches never use it.**
   - `~"x.spw#anchor"` jumps to the `#>anchor` line (`lsp/handlers/navigation.ts:40-83`, using `resolveFragment`).
   - `=ref{ ~"x.spw#anchor" }` is the labeled bias edge (`.spw/registries/bias-product.spw:24`). `spw mount resolve` checks both the file and the anchor (`packages/spw-cli/src/mount.ts:531-553`).
     - Verified: it reported `dangling … (anchor missing; has: …)`.
     - It does not check plain `key: ~"…#a"` bindings.
   - The canon has 5 fragment refs; the caches have 0.
   - **Problem:** `spw graph` keeps `#fragment` in the node id (`packages/spw-cli/src/corpus-scan.ts:196-205`).
     - Verified: `vscode.spw` showed in-degree 0 while `vscode.spw#plugin_theory_vscode` counted as a separate node.
     - The LSP graph strips the fragment (`lsp/handlers/reference-graph.ts:127-131`), so the two graphs disagree.
6. **The header and metric facts are subtler than the review assumed.**
   - `#:layer #!x` does feed tooling: the LSP hover builds a "Layers:" distribution from the `#!x` on the same line (`display.ts:508-525,896-905`). Because every cache file says `#!pragmatics`, that distribution carries no information.
   - `$%[k]` binds to only two things: 16 hard-coded names (`display.ts:692-709`) or `frame.key` entries in `.spw/state/observable.spw` (`lsp/context.ts:102-126`).
   - The caches hold 469 metric names, all unique. 2 match the dictionary.
7. **The VS Code snippets are the templates behind the cache anti-patterns.**
   - `header` emits `#:${4:layer} #!${5:intent}`.
   - `wonder` emits one `\$%[${6:register.path}]`.
   - `roots` emits `^"roots"`.
   - Source: `snippets/spw.json:47-57,112-119,131-141`.
8. **Bare `#tag` values are indexed; set literals are not.**
   - A bare `#tag` becomes a topic with its framePath (verified: `topic:partial@27[parity]`).
   - `#[a, b]` sets are not indexed (`server-index.ts:1064-1083`). The caches use them heavily, e.g. `.spw/caches/vscode/features.spw:19-20,34,57`.
9. **Frame form decides visibility.**
   - Only `^` frames enter the LSP framePath (`server-index.ts:1086-1108`) and the IntelliJ structure view and folding (`ij/SpwLineParsers.kt:95-97`).
   - `?[…]` and `![…]` blocks show up only in the LSP outline (`lsp/handlers/outline.ts:25-37`). Verified.
10. **Deep nesting is allowed but flagged.** Brace depth of 5 or more gets a Hint, "exceeds budget (4)" (`lsp/handlers/analysis.ts:209-217`).

## 2. Feature inventory

### 2.1 VS Code

| id | kind | what it does | source |
|---|---|---|---|
| activation / server | manifest | onLanguage and onView ×2; bundled `dist/server/spw-lsp.cjs` over stdio; client id `spwLanguageServer` | package.json:27-37; vsc/extension.ts:70-125 |
| spw.navigate | command | QuickPick of manifest roots and indexed annotations | vsc/navigation.ts:22-106 |
| spw.inspectGeometry ("Inspect Form") | instrument | `spw/geometry`, TTL cache keyed by uri and version | vsc/instruments/commands.ts:92-123 |
| spw.showSurfaceProfile | instrument | `spw/surfaceProfile`, rendered as markdown | :125-158 |
| spw.inspectCache | instrument | `spw/cacheReflection` plus the editor probe plane | :160-190 |
| spw.renameSymbol | instrument | runs `editor.action.rename` | :192-195 |
| spw.planCorpusRefactor | instrument | mark\|anchor\|case\|mood rename, then CLI `refactor --json`, never `--write` | :197-234,277-297 |
| spw.clearProbeCache | command | clears the editor probe cache | :236-239 |
| showOperatorFrequency, showPhaseContext, showFormSequence, insertFormSequence, showFlowProtocol, showGeometricResonance, showProbeMeasure | probes | raw `sendRequest`; results open as untitled markdown | vsc/commands.ts:15-96,170-267 |
| showWorkspaceTemperature, showReferenceHubs, restartLanguageServer | commands | temperature as untitled spw; hubs QuickPick; restart | :98-168 |
| spwConcepts.* (4 contributed, 2 internal) | view | group by concept, kind, file or phase; co-occurrence children | vsc/views/concepts-tree.ts:27,601-661 |
| spwWorkspace.refresh (+ internal selectRoot) | view | sections You Are Here, Roots, Memory, Spirit; only refreshes when visible | vsc/views/workspace-tree.ts:150-240,444-476 |
| status strip `spw.context` | status bar | `spw/contextAtPosition` on every selection or edit (80 ms debounce) | vsc/context-strip.ts:8-59 |
| decorations | regex layer | path refs, annotations, braces, 10 sigils, `~#k:`, `=exp[`, pipes, `status:`, valences | vsc/surface-decorations.ts:191-455 |
| settings (14) | config | inlayHints ×3 and diagnostics.unresolvedRefs (read at init only); trace.server (inert); surface ×5; compute ×2; cache.probeTtlMs; cli.toolRoot | package.json:151-228 |
| colors (23), semanticTokenScopes (21), snippets (24), language config | contributions | lineComment `//`, block `/* */`, onEnter continues `#` and `//` | package.json:230-307; language-configuration.json:2-8,103-130 |

### 2.2 JetBrains

| id | kind | what it does | source |
|---|---|---|---|
| fileType Spw | extension point | `.spw` extension and icon | plugin.xml:34-38 |
| TextMate bundle | extension point | a drifted copy of the grammar: no dialect-exp, no `(?<!\w)'` fix, no onEnterRules | ij/SpwTextMateBundleProvider.kt; resources/textmate/ |
| LSP | lsp.serverSupportProvider | runs `npm run --silent lsp` from the tool root (configured, then project, then `.spw/_workbench`); command override; one-time preflight notices | ij/SpwLspServerSupportProvider.kt:19-89; ij/SpwLspLauncher.kt:18-41 |
| settings | projectConfigurable | enabled, command, workDir | ij/settings/SpwLspConfigurable.kt |
| folding | foldingBuilder | `^` frames and `#{1,3} ` headings | ij/SpwFoldingBuilder.kt:12-72 |
| structure | structureViewFactory | flat list of headings, `^` frames and `##?>` anchors | ij/SpwStructureViewFactory.kt:41-118 |
| gutter | lineMarkerProvider | anchor, frame and claim icons | ij/SpwAnnotationLineMarkerProvider.kt:11-77 |
| live templates (7) | defaultLiveTemplates | frame, intent, anno, subroot, prop, episode, stream | resources/liveTemplates/spwTemplates.xml |
| commenter | lang.commenter | line `# `, block `/* */` | ij/SpwCommenter.kt:6-8 |
| spellcheck | spellchecker.support | `EMPTY_TOKENIZER`, which turns spellcheck off | ij/SpwSpellcheckingStrategy.kt:9 |
| Spw.Inspect{Form,Stack,Cache} | actions (Tools menu) | saved-file CLI; a dirty buffer gets save-and-retry; results open read-only in a LightVirtualFile | ij/SpwInstrumentActions.kt:14-65; ij/SpwCliInvocation.kt:27-43; ij/SpwCliRunner.kt:88-104 |
| Spw.Rename, Spw.PlanCorpusRefactor | actions | ACTION_RENAME; input dialog, then `refactor . --rename … --json` | ij/SpwInstrumentActions.kt:67-106 |

### 2.3 spw-lsp

- **Providers:** definition, declaration, references, rename (with prepare), documentLink, hover, documentSymbol, workspaceSymbol, codeAction, completion (triggers `@ ~ / # $`), codeLens, formatting, rangeFormatting, documentHighlight, inlayHint, foldingRange, semanticTokens/full. Source: `stdio-server.ts:209-231`.
  - codeAction offers trait↔facet toggle, "did you mean", and wrap-in-frame (`handlers/editing.ts:236-330`).
  - Every codeLens has `command: ''`, so none are clickable (`display.ts:1070-1198`).
  - semanticTokens has 9 types and 6 modifiers (`semantic-tokens.ts:75-78`).
- **workspaceFolders:** not supported (`:232-234`).
- **Custom methods:** select, annotations, contextAtPosition, workspaceManifest/v1, workspaceTemperature, cacheReflection, referenceGraph (same as corpus), plus 15 probes (`:328-396`).
  - VS Code types these but never calls them: resonance, registerSnapshot, corpus, formContext.

## 3. Parity matrix

| feature | VS Code | JetBrains | LSP |
|---|---|---|---|
| standard LSP features | languageclient | native API defaults; which providers are used depends on the IDE version (**unverified**) | 19 providers |
| form / stack | live buffer, markdown | saved file, spw/json | geometry, surfaceProfile |
| cache | editor plane only (bug B1) | CLI JSON | returns `layers` |
| rename / corpus plan | yes / QuickPick | yes / dialog | rename; the plan is CLI-only |
| outline | LSP symbols (all sigil frames) | regex (`^` frames only) | outline.ts |
| folding | LSP character scan | regex (bug B4) | analysis.ts:294-356 |
| concepts, navigate, cursor context | tree, QuickPick, strip | none | annotations, contextAtPosition |
| templates | 24 snippets | 7 templates; the episode shape differs (IntelliJ's is closer to CLAUDE.md) | completion |
| comment toggle | `//` | `# ` | — |
| spellcheck / trace | host default / inert | off / host log | — |

## 4. Stale theory lines, with corrections

| line | says | truth |
|---|---|---|
| vscode-spw.spw:14 | server is `stdio-server.ts` | Ships the bundled `dist/server/spw-lsp.cjs` (package.json:36,42). |
| :21 | client owns typed `spw/*` requests | 9 of 14 calls skip the validated client (vsc/commands.ts:22-248). The regex decoration layer and status strip are left out. |
| **:22** | startup ladder (workbench root, checkout, mount, …) | VS Code uses **only** the bundled server (README:28; vsc/extension.ts:114-125). The ladder describes `npm run lsp` via the upstream bridge (package.json:76; lsp/upstream-bridge.ts:8-9,65-88), which is what IntelliJ uses. |
| :27 | definition forms | Missing `~"path#anchor"`, which jumps to the `#>` line (navigation.ts:63-83). |
| :34 | "anchor and annotation lenses" | Frame summary, anchor refs, register, projection, generated-file banner and phase lenses; none are clickable (display.ts:1070-1198). |
| **:46** | atlas shows "projections" | Sections are You Are Here, Roots, Memory, Spirit (workspace-tree.ts:444-476). The legacy `projections` payload is rejected (custom-requests.test.ts:49-66). |
| :51 | five instruments | Nine other palette commands are not listed. |
| :61 | "mounted resolution as shipped" | True for IntelliJ, false for VS Code. |
| :67 | `status: #proposed` | Gets no decoration; `classifyStatus` only matches a bare `proposed` (surface-decorations.ts:141-150). |
| :107 | server spawned per workspace | One per VS Code window (workspaceFolders unsupported); one per project in IntelliJ (ProjectWideLspServerDescriptor). |
| :108 | no second semantics stack | Broken by surface-decorations.ts. |
| intellij-plugin.spw:24 | `#commenter #spellcheck` | Commenter uses `# ` plus a `/* */` block that the lexer does not treat as a comment (B5). Spellcheck is off (B6). |
| :25 | `#claim_candidate` | Never reached (B8). |
| :26 | `#color_settings`, `#gutter_markers` | No ColorSettingsPage is registered (colors come from the TextMate bundle page, README:108). Gutter markers do nothing on click (B7). |
| editor-instruments.spw:16 | `idle_probe_traffic: 0` | True for instruments only. The status strip sends a request on every cursor move (context-strip.ts:44-54). |
| :26 | cache shows "which memo plane paid" | VS Code cannot show the LSP plane (B1). |
| editor-surface-audit.spw:25 | `#configuration` | Configured on the client, never invoked on the server (B12). |
| :26-27 | standard and custom axes | Missing `#document_highlight` and `#range_formatting`. Lists 7 custom methods; there are 23. |
| lsp/handlers/spw-probes.ts:2 | IntelliJ shares the probes | IntelliJ calls none. |

**Wrong claims in the current caches:**
- `caches/vscode/features.spw`
  - :26 says the stack preview is JSON; it is markdown.
  - :42-43 describe background badges and pairing glyphs; the decorations only set foreground color and weight (surface-decorations.ts:176-187).
  - :98 and :114 describe live-updating previews; they are one-shot snapshots.
  - :107 says the cache flushes on contentHash drift. The key is uri plus version (instruments/commands.ts:97), and it only clears on a config change or the clear command.
- `caches/vscode/lsp-client.spw`
  - :17 lists a fallback server binary; only the bundled server is used.
  - :24 cites the trace setting, which is inert (B2).
- `caches/jetbrains/features.spw`
  - :22 says the commenter uses `//`; it uses `# `.
  - :23 says spellcheck is active; it is off.
  - :39 claims an AST index; it is regex.
  - :46 lists 6 LSP capabilities; the server advertises 19.
- `caches/jetbrains/folding.spw:44` says `//` cuts off brace scanning; in fact `#` does.
- `caches/jetbrains/live-templates.spw`
  - :78-80 describe the commenter wrongly.
  - :86 and :93 make false spellcheck claims.

## 5. Confirmed bugs

| id | where | failure scenario |
|---|---|---|
| B1 | vsc/lsp/custom-requests.ts:377-387 | Drops `layers` and `plane`. `instruments/commands.ts:165` then always gets `undefined` and prints placeholder planes ("no LSP session in this process"), even though the server sent layers (lsp/handlers/cache-reflection.ts:164-171). No test covers it: the test file only covers the manifest (custom-requests.test.ts:33-68). |
| B2 | package.json:175 vs vsc/extension.ts:77 | languageclient reads `getConfiguration(this._id).get('trace.server')` (node_modules/vscode-languageclient/lib/common/client.js:1211-1215). With the id `spwLanguageServer`, `spw.trace.server` is ignored. |
| B3 | vsc/commands.ts:29,94,104,204,234,262; vsc/instruments/commands.ts:224,270 | `openTextDocument({content})` makes an untitled document with content, which VS Code treats as dirty. Tabs pile up and each prompts to save on close. With `geometryOnSave` on, every save adds a new tab (surface-decorations.ts:466-468). This follows from API semantics; I did not observe it in a running VS Code. |
| B4 | ij/SpwFoldingBuilder.kt:121 | Treats every `#` as a line comment, and does not handle `//`. The canon's rule is that `#` is a comment only before whitespace (packages/spw-seed/src/lexer/matchers/comments.ts:55-67). Verified with a port: 4 of 1242 frames lose their fold, e.g. `.spw/tooling/editor-instruments.spw:19` (`asks = #… }` on :20). |
| B5 | ij/SpwCommenter.kt:6-8; both language-configuration.json:2-8 | The lexer has no block comments (comments.ts:4-6). Verified: `/* note { */` lexes as CONNECTOR, OPERATOR, IDENTIFIER, CONTAINER_OPEN, so a block toggle inserts live code with an open brace. IntelliJ's `# ` line toggle also turns commented lines into headings (SpwLineParsers.kt:87). |
| B6 | ij/SpwSpellcheckingStrategy.kt:9 | Spellcheck is off everywhere, including prose strings. |
| B7 | ij/SpwAnnotationLineMarkerProvider.kt:28-36 | Nav handler is `null`, while the tooltip at :32 promises "navigate to references". |
| B8 | ij/SpwLineParsers.kt:95-97 | The typed-frame pattern matches `^claim[id]` first, so the claim branches never run (SpwAnnotationLineMarkerProvider.kt:58-74; SpwStructureViewFactory.kt:100-112). Verified. |
| B9 | vsc/surface-decorations.ts:89-107 | Treats `'` as a string start and does not mask `# ` lines. A header such as `master's …` blanks decorations until the next apostrophe. Verified: 20 of 208 cache files, 544 lines; 0 of 120 canon files. |
| B10 | vsc/context-strip.ts:133 | The `~#` aspect branch never fires: the server sends braids as `#name` (server-index.ts:1171), and appositions are not indexed at all. |
| B11 | vsc/commands.ts:121,159-161 | Hub paths are joined onto `workspaceFolders[0]`, although README:41 promises opaque URIs. PLAUSIBLE: breaks when the consumer root is not the first folder. |
| B12 | stdio-server.ts:413-479 | inlayHints and diagnostics setting changes need a server restart. |
| B13 | packages/spw-cli/src/corpus-scan.ts:196-205 | Fragment links split graph nodes (verified). |
| B14 | display.ts:302-304 | `~#lens()` is invisible to the wonder hint. |

## 6. Tool-support matrix

| construct | parser | LSP | CLI graph | CLI measure | emit | VS Code client | IntelliJ |
|---|---|---|---|---|---|---|---|
| `# Title` | COMMENT | none | – | – | – | TextMate comment; not masked (B9) | heading, structure row, fold |
| `#>anchor` | Particle `>` | index, outline, fragment target, code lens | – | – | `anchors` field is unrelated | Navigate, Concepts, color | structure, gutter (no nav) |
| `#:case #!mood` | Particles | index with framePath; `#:layer` feeds hover | – | – | – | Concepts, strip | none |
| bare `#tag` value | OPERATOR + IDENT | topic with framePath | – | – | only `register:`/`focus:` | Concepts | – |
| `#[a,b]` | set | **not indexed** | – | – | only in `lenses:`/`facets:` | – | – |
| `~#k: "v"` | ANNOTATION | topic; code action; soft register | – | – | trait | tildeHash color | – |
| `~#lens(x)` | APPOSITION → Annotation | **not indexed; no hint**; counted as aspect (particles.ts:125-130) | – | – | **`lenses: []`** (verified) | colored; `'` spill | `'` spill (grammar) |
| `~"p.spw#a"` | PathRef | jumps to anchor; missing anchor not diagnosed | **fragment kept** | – | includes (verified) | pathRef color | TextMate only |
| `=ref{ ~"p#a" }` | bias edge | as PathRef | link | – | include | – | – |
| `^["x"]{` | frame | outline, framePath, workspace symbols | frame count | – | named frames feed traits | – | structure, fold, gutter |
| `?[…]{` `![…]{` | operations | outline only | – | – | – | – | none |
| `$%[k]` | `$` op + `%[k]` op | 16-name hover, observable binding, hint count | – | no (`measure` reads `%mass` only; verified) | – | 2 colors | – |
| `status: proposed` | Binding | – | – | – | – | tier color when the value is bare | – |
| depth ≥ 5 | – | Hint | – | – | – | – | – |

**Legend:** a dash (–) means the tool does nothing with the construct. "Verified" means I ran the tool on the construct. **Bold** marks a gap or bug.

## 7. Canonical examples (verbatim)

- `.spw/tooling/editor-instruments.spw:20`: `form: .{ cli = "spw form <surface>", live = "spw/geometry", asks = #brace_geometry_and_resonance, effect = #l0_measure }[reg=facet]` (this line also triggers B4)
- `.spw/canon-mount.spw:50`: `=ref{ ~".spw/tooling/vscode-spw.spw#spw_tooling_vscode" }`
- `.spw/editing.spw:56`: `#:depth #!computational // lens: material grain` (the form the LSP can read)
- `.spw/agents.spw:32`: `#:depth #!stylistic ~#lens(living system)` (the migration target, which the LSP cannot see)
- `.spw/state/observable.spw:10-11`: `^"cache"{` / `.. %[hit_ratio]   null` (binds `$%[cache.hit_ratio]`)
- `.spw/tooling/editor-surface-audit.spw:16-20`: evidence states advertised, configured, invoked, observed, tested. Verdicts are at :40-43.

## 8. Recommendations for `.spw/caches/2026-09-30/`

**Syntax writers should use**
1. **Header**
   - One `# Title` line plus description lines, with no apostrophes outside strings (B9).
   - Then `#>{slug}`, then 2–4 *different* case/mood pairs drawn from canon vocabulary: `#:host #!vscode`, `#:evidence #!configured`, `#:verdict #!misleading`.
   - Keep `#:layer #!x` only where it is true, because it drives the hover.
   - Drop `~#protocol: "cache.layer/1"`. That is the editor cache-card protocol (vsc/instruments/commands.ts:169).
2. **Provenance**
   - Use `^"provenance"{ as_of: "…" source_rev: "<sha>" method: #source_read }`. emit picks these up as slots (verified).
3. **Rows**
   - Put `#>row_anchor` before `^["id"]{…}`. This form gives framePath in the LSP index plus IntelliJ structure and folding.
   - Keep depth at 4 or less.
   - Write facets that contain `#tag` values across several lines, so the brace is not on the tag's line (B4).
4. **Links**
   - For navigation: `key: ~"./x.spw#anchor"`.
   - For load-bearing citations: `=ref{ ~"./x.spw#anchor" }`, then gate on `spw mount resolve`.
   - For code evidence: `src: ~"…/file.ts"` plus `at: [start, end]`. A fragment on a non-.spw target falls back to the top of the file.
   - Replace the duplicated `^"roots"` and `^"dispatch"` blocks with one map of anchored refs.
5. **Tags:** use bare `#tag` values, which are indexed, not `#[…]` sets, which are not.
6. **Status**
   - Use bare `status: implemented|partial|proposed|deprecated`; VS Code colors these.
   - Record epistemic standing as a mood particle, `#!confirmed` / `#!contested` / `#!refuted`. These are navigable through Navigate and workspace symbols.
7. **Metrics**
   - Use only names in the hover dictionary, or `ns.key` pairs registered as `.. %[key] value` under `^"ns"{}`.
   - The loader reads only `.spw/state/observable.spw`, so cache-local registries need a code change before they bind.
8. **Lens:** write `~#lens(…)` and land two small code fixes:
   - `display.ts:304`: read the APPOSITION via `appositionParts`.
   - `server-index.ts:1166-1210`: index APPOSITION tokens as an aspect kind.

**Verified minimal example.** This is an excerpt of `…/plugin-theory/vscode.spw`.
- `spw-syntax-validate --strict`: 4 files passed.
- `select --skim`: Particle, PathRef and Annotation nodes as intended.
- `mount resolve`: 2 edges, 0 dangling.
- The LSP index gave `intent:confirmed@34[defects>cache_reflection_drops_layers]`.
- The fold and mask ports reported 0 issues.

```
#>plugin_theory_vscode
#:host #!vscode
#:evidence #!configured
#:verdict #!misleading

^"defects"{
  #>bug_cache_reflection_drops_layers
  ^["cache_reflection_drops_layers"]{
    #:defect #!confirmed
    #:owner #!vscode_client
    claim: "cacheReflection() rebuilds the payload without layers, so Inspect Cache renders placeholder planes"
    src: ~"../../../../extensions/vscode-spw/src/lsp/custom-requests.ts"
    at: [377, 387]
    =ref{ ~"./lsp.spw#lsp_cache_reflection" }
    status: proposed
  }
}
```

**Proposed `plugin-theory/` tree.** Every row carries `src:` + `at:` and an anchor; the index gets a `^"provenance"` block.
- `index.spw` `#>plugin_theory`: provenance, the host map, and `.. %[count]` measures with `measured_by:`.
- `lsp.spw`: `#>lsp_cap_*` for the 19 providers and `#>lsp_req_*` for the 23 methods.
- `vscode/{index,commands,views,settings,decorations}.spw`: `#>vscode_cmd_*` and so on.
- `jetbrains/{index,extensions,actions,line-parsers}.spw`: `#>jb_ep_*`, `#>jb_act_*`.
- `parity.spw`: one `^["question"]` per row, facets per host.
- `defects.spw`: B1–B14 as `#!confirmed` / `#!plausible`.
- `theory-drift.spw`: `=ref{ ~"../../../tooling/vscode-spw.spw#spw_tooling_vscode" }` plus `line:` and `correction:` for each item in section 4.
- `vocabulary.spw`: the particle crosswalk below.

## 9. Open questions and pressure points

1. **The particle lattice has four vocabularies.**
   - seed: deixis, case, mood, aspect (`packages/spw-seed/src/types/ast/nodes.ts:306-316`; `canonical/particles.ts:106-139`).
   - LSP and VS Code colors: anchor, lens, intent, topic, prompt_root (`server-index.ts:31`; package.json:231-235).
   - Atlas: `#:` lens maps to `?` wonder and topic maps to `~` (`workspace-tree.ts:100-106`).
   - Refactor verb: mark, anchor, case, mood.
   - Settling what particle and anchor mean should settle one naming across all of these.
2. **Should an apposition count as aspect ("expiring state")?** The count is inflated today (particles.ts:125-130). An apposition is a reading of something, not deferred data.
3. **Should the `$%` handle become one construct?** Today it parses as two operations. Should it bind to per-surface registries, not only the single global observable file?
4. **Should frames other than `^` join framePath?** That is the question of whether `?`/`!` blocks are places or events.
5. **Fragment identity:** the CLI graph, the LSP graph and `mount` each treat `#anchor` differently. Choose one rule.
6. **JetBrains verification (unverified):** there is no ParserDefinition, so the PSI may be plain text. That would mean the Spw-keyed extension points (folding, structure, commenter) never fire. This needs a `runIde` smoke test.

**Scratch files** (all under `<scratchpad>/understand/`):
- The example corpus: `plugin-theory/index.spw`, `plugin-theory/vscode.spw`, `plugin-theory/lsp.spw`, `plugin-theory/refs.spw`
- The fold and mask ports: `fold-sim.mjs`, `mask-sim.mjs`
- The index, lexer and fragment probes: `index-probe.mts`, `lex-probe.mts`, `lex2.mts`, `frag.mts`