# .spw/review scorecard (snapshot of .spw/caches, 2026-09-30)

Scores 1–5: D depth · I independent value · S script value · T tree fit · A accessibility (curricular/informative/experiential).
Verdict: KEEP (fix listed errors) · PROMOTE (move into canon) · MERGE · REGEN (regenerate from source) · DROP.

## Editor caches (grounded; verified against extensions/ + packages/spw-lsp)

| file | D I S T A | verdict | note |
|---|---|---|---|
| jetbrains/instruments | 4 3 3 3 4 | KEEP→PROMOTE | dirty-buffer text verbatim, BGT/LightVirtualFile right; tool_resolution step 3 invented |
| jetbrains/compatibility | 3 2 4 4 3 | KEEP | Java 21/Gradle 9.5/Kotlin 2.4.10/242..262 exact; Gradle task paths wrong (standalone root project) |
| vscode/syntax-highlighting | 3 2 3 3 3 | KEEP | scope map = package.json semanticTokenScopes; "delta" tokens false (server: full only) |
| jetbrains/lsp-client | 3 3 2 3 3 | PROMOTE bits | two-stage discovery + LSP-workDir-as-tool-root → .spw/tooling/intellij-plugin.spw; settings names invented |
| jetbrains/cache-layer | 3 2 3 3 3 | REGEN | claims LSP plane present; IntelliJ path is CLI-only |
| vscode/cache-layer | 3 2 3 2 3 | MERGE+REGEN | plane names right; stat names (expired/disabled), "background timer", renderer wrong |
| vscode/decorations | 3 2 2 3 3 | REGEN | settings/hex exact; ~/#/$ phase map wrong; cites missing src/surface/; parse degrades at :100 |
| vscode/features | 2 2 3 2 3 | MERGE | 14 command IDs right, 8 of 22 missing; grouping is the one useful idea → README |
| vscode/instruments | 3 2 2 3 3 | REGEN | invents CLI fallback, spw-*:// URIs, read-only tabs |
| vscode/lsp-client | 3 2 2 3 3 | REGEN | 5-step server ladder contradicts README:28 (inherited from stale .spw/tooling/vscode-spw.spw:22) |
| vscode/views | 3 1 2 3 3 | REGEN | real sections: You Are Here/Roots/Memory/Spirit; grouping modes invented |
| jetbrains/features | 3 2 3 2 3 | MERGE | action registry exact; commenter/spellcheck/"AST tree" wrong |
| vscode/taste | 2 3 1 2 2 | PROMOTE 1 idea | "anti-echo" doctrine → vscode-spw.spw quality_bar |
| vscode/probe-cache | 2 1 1 2 2 | DROP | 8 invented claims (key shape, LRU 256, purge-on-close…); probe-cache.ts (74 lines) is clearer |
| vscode/navigation | 2 1 1 3 2 | DROP | only command ID + 3 settings real |
| jetbrains/navigation | 2 1 1 3 2 | DROP | sorting/filters/icons/parser method invented |
| jetbrains/syntax-highlighting | 2 1 1 3 2 | DROP | 6 of 7 scope names absent from grammar |
| jetbrains/live-templates | 2 1 1 3 3 | DROP | 5 of 7 templates wrong |
| jetbrains/folding | 3 1 1 3 2 | DROP | regexes/placeholders/comment char wrong |
| vscode/index, jetbrains/index | 1 1 3 3 2 | DROP dispatch | ^"dispatch" renames ^"roots" 1:1 |

Code bugs surfaced while verifying (independent of caches):
1. VS Code `cacheReflection()` drops `layers` (custom-requests.ts:372-381) → cache card always shows LSP plane absent (commands.ts:165). VERIFIED.
2. `spw.trace.server` inert — client id is `spwLanguageServer` (extension.ts:77). VERIFIED.
3. IntelliJ folding treats `#` as line comment (SpwFoldingBuilder.kt `'#' -> inLineComment`) → `~#k: .{` lines can close folds early. VERIFIED (code); impact narrower than "every #[".
4. IntelliJ commenter `# ` vs language-configuration `//` disagree.
5. IntelliJ spellcheck returns EMPTY_TOKENIZER (off).
6. Anchor gutter markers pass null nav handler (violates intellij-plugin.spw:50).
7. VS Code instrument previews open as editable/dirty untitled docs.
Upstream stale: .spw/tooling/vscode-spw.spw:22 (startup ladder), :46 ("projections" section).

## University — STEM + top-level

| file | D I S T A | verdict | note |
|---|---|---|---|
| ece/undergrad-computer-engineering | 2 3 2 4 4 | KEEP | most concrete practice (RISC-V green sheet, NVIC, Yocto, ILA); pipelining 5x claim wrong (:76) |
| thermo/non-equilibrium-and-information | 3 3 2 3 2 | KEEP (move under physics) | Jarzynski/Crooks/Sagawa-Ueda right; Landauer "micro-joules" (:65) off by 10^15 |
| phys/undergrad-physics | 2 2 2 3 4 | KEEP | textbook anchors, real advanced-lab list |
| phys/masters-mechanical-engineering | 2 2 2 4 2 | KEEP | distinctive (PoE, keyhole); Lie-group overclaim (:74) |
| mse/masters-materials-science | 3 2 2 3 2 | KEEP | real scaling laws; HEA creep claim backwards (:99) |
| governance-and-tenure | 2 2 3 4 3 | KEEP | senate "binding" (:69) overclaims |
| research-and-funding | 2 2 3 4 3 | KEEP | NSF "$10B+" (:17) high |
| curricular-architecture | 2 2 3 2 3 | KEEP+FIX | only .{component,credits} records; refs buried in strings (:56-63); claims a prereq DAG no leaf fills |
| chem/undergrad-chemistry | 2 2 2 3 3 | KEEP | faithful ACS TOC |
| chem/masters-chemistry | 2 2 2 3 2 | FIX | HMBC "Coherence" (:53), Rietveld under single-crystal (:43) |
| chem/undergrad-chemical-engineering | 2 2 2 2 3 | MERGE | transport/HX duplicates ME; r^5 pumping (:91) regime-specific |
| chem/masters-chemical-engineering | 2 2 2 3 2 | KEEP | accurate list |
| phys/undergrad-mechanical-engineering | 2 2 2 2 3 | MERGE | thermo-fluids duplicated 3 ways |
| phys/masters-physics | 2 2 2 2 3 | FIX | water/iron same universality class (:78) wrong; "Z2 Chern" (:92) |
| mse/undergrad-materials-science | 2 2 2 3 3 | KEEP | "flawless crystals brittle" (:86) wrong |
| mse/characterization-and-computation | 2 3 2 2 3 | MERGE→masters | reporting invariants (:94-96) useful |
| ece/undergrad-electrical-engineering | 2 2 2 3 3 | FIX | conjugate match (:80); PM>45° "guarantees" (:87); "Lorentz gauge" (:55) |
| ece/masters-ece | 2 2 2 3 2 | KEEP | accurate |
| thermo/statistical-and-molecular | 3 2 2 2 2 | MERGE | 1/T=∂S/∂E inverted (:71); ~70% dup of physics |
| thermo/classical-and-engineering | 3 1 2 1 3 | DROP (exergy → ME) | ~80% duplicated in ME + ChemE |
| pedagogical-scaffolding | 2 2 2 3 3 | KEEP | "5x faster" (:68) invented |
| institutional-infrastructure | 2 1 2 3 2 | DROP | Wikipedia-level |
| */taste (5) | 1-3 2 1 3 2 | FOLD 3-5 lines into index | carry most factual errors: mse:17 "millions of minerals", :27 Si "insulator"; ece:17 EUV<DNA, :18 trillion-transistor die; phys:19 fatigue inverted, :17 pumps need viscosity. thermo/taste is the best (photon arithmetic) |
| taste (top) | 1 2 1 3 2 | DROP | "reading Hypatia" (:35) — no writings survive |
| */index (6) | 1 1 3 2-4 1 | KEEP routing only | invented % hypotheses |

## University — arts, social sci + secondary

| file | D I S T A | verdict | note |
|---|---|---|---|
| econ/undergrad-econometrics | 5 4 3 3 3 | KEEP | OVB/attenuation, LATE, staggered DiD; F>10 rule dated (:30) |
| econ/graduate-advanced-micro | 5 3 3 3 2 | KEEP | MWG-level, all correct |
| econ/graduate-macro-and-econometrics | 5 3 3 2 2 | KEEP (split) | bundles two fields |
| econ/undergrad-micro-macro | 4 3 3 3 3 | KEEP | correct |
| ling/sociolinguistics-and-documentation | 4 4 3 2 3 | KEEP | historical ling buried here |
| ling/phonetics-and-phonology | 4 3 3 3 2 | FIX | F2 inverse to backness (:19); place nodes ≠ SPE (:32); OT input not universal (:37) |
| ling/morphology-and-syntax | 4 3 3 3 2 | FIX | Ross/islands (:38); Minimalism-only |
| ling/semantics-pragmatics | 4 3 3 3 2 | FIX | determiner type (:19) |
| sec/family-and-community-wraparound | 3 4 2 4 4 | KEEP | McKinney-Vento actionable; "HIPAA/FERPA interoperability" (:82), cap/gown waivers (:34) |
| sec/student-support-services | 3 3 3 4 4 | KEEP | IEP parent "mandatory" (:66); ratio (:15) |
| design/undergrad-industrial-engineering | 4 3 3 3 3 | KEEP | Jackson nets are Markovian (:35); M/M/c/K is blocking not balking (:34) |
| hort/undergrad-horticultural-science | 3 3 2 4 3 | KEEP | best working numbers; EOD far-red does stretch (:98) |
| hort/masters-horticulture-genomics | 4 3 2 4 2 | FIX | base editors → transitions (:33); NLR convergent (:70) |
| film-theatre/undergrad-theatre | 3 3 2 3 4 | KEEP | method map correct; MAT founders (:53) |
| film-theatre/graduate-theatre-mfa | 3 2 2 3 3 | KEEP | correct lineages |
| hort/undergrad-botany | 3 2 2 4 2 | FIX | "wood wide web" as fact (:71); Casparian strip lignin (:20) |
| design/undergrad-industrial-design | 3 2 2 3 3 | MOVE → art+design | G3 def wrong (:43) |
| illus/undergrad-animation | 3 2 2 3 3 | FIX | "12 principles" lists 8 (:14-23); flat tangents prevent overshoot (:44) |
| illus/undergrad-illustration | 2 2 2 4 3 | KEEP | McCloud uncredited (:56) |
| film-theatre/undergrad-film | 3 2 2 2 3 | FIX | Field/Snyder mixed (:29) |
| design/masters-design-and-industrial-systems | 3 2 2 1 2 | RENAME → ISE | no design content |
| illus/masters-animation | 2 1 2 2 2 | MERGE w/ film MFA | −24 LUFS is broadcast (:77) |
| film-theatre/graduate-film-mfa | 2 1 2 1 2 | MERGE/FIX | 1.33 "portrait" (:80); telecentric primes (:18); 12h crew turnaround (:73) |
| sec/advanced-curricula | 2 2 3 4 3 | KEEP | dual-enroll "guaranteed" (:41) |
| sec/stem-and-humanities-pathways | 2 2 3 3 3 | KEEP | only grade-by-grade sequence (as strings); CEDA is collegiate (:40) |
| */taste (6) | 1-2 2 1 2-3 1 | FOLD or DROP | real stances (seed sovereignty, labor dignity, descriptivism) in one reverent voice; ling:33 "LLMs are n-gram" |
| */index (7) | 1-2 1-2 2 1-4 1 | routing only | econ index "Pareto-efficient tyrant" (:46) is a real point |

## Podcasting · language-features · tiktok-live

| file | D I S T A | verdict | note |
|---|---|---|---|
| podcasting/year2-systems-programming | 4 3 4 3 3 | PROMOTE → CS curriculum | .{week,topic,spec} rows; CFS dated (EEVDF); Spectre before caches |
| podcasting/year1-web-development | 4 3 4 3 3 | PROMOTE | RFC 9000/6455 right; Sea of Nodes dated (Turboshaft) |
| podcasting/year3-abstract-computation | 4 3 4 3 3 | PROMOTE | PBFT 3f+1 right; Coq→Rocq; graph theory after compilers used it |
| podcasting/episode-architecture | 3 3 3 4 4 | KEEP | only producer-usable artifact: minute-level 3h run sheet |
| podcasting/long-form-cadence | 3 2 3 3 3 | MERGE w/ episode-arch | 13h budget sums; silent day contradicts 1,095 consecutive |
| podcasting/curriculum-arc | 2 2 2 3 3 | MERGE | bridges good; own "never on faith" invariant broken by ordering |
| podcasting/topical-index | 2 1 3 2 1 | REGEN from year rows | "episodes" are week numbers; 5/36 prereqs + 2/48 leads_to resolve; `spw select --query` flag doesn't exist |
| podcasting/market-research | 2 1 3 1 1 | DROP | platform shares inverted vs Edison (YouTube 32/Spotify 25/Apple 15); RSS "W3C" |
| language-features/structural-and-homoiconic | 3 1 2 2 3 | → design-research | CL/Clojure macros not hygienic (:19) |
| language-features/systems-and-memory | 3 1 2 2 3 | → design-research | GPA renamed DebugAllocator (:31) |
| language-features/type-systems | 3 1 2 2 3 | → design-research | satisfies doesn't check hex (:31) |
| language-features/functional-and-pipeline | 2 1 2 2 2 | → design-research | OCaml/F# |> is last-arg (:60) |
| language-features/array-and-concatenative | 2 1 2 2 1 | → design-research | Uiua is right-to-left (:41) |
| language-features/developer-joy | 2 1 1 2 3 | DROP | generic; contradicts type-systems:60 |
| language-features/spw-resonance | 2 2 1 1 2 | REGEN into docs/design/spw/design-research.spw | wrong about Spw: omits # and . sigils; = as "constraint"; valence as emotional charge (contradicts valence-architecture.spw); revives retired "dual_read_cards" (cli.spw:41) |
| tiktok-live/* (9) | 1-3 1-2 2-4 1 1-3 | DROP (keep gift table as dated receipt, if anything) | no repo connection; payout 50% cut double-counted (:29); Lion $500 vs $450; ranking formula fabricated; omits 18+/1k-follower gates |

## Community · physiology · film · indie author

| file | D I S T A | verdict | note |
|---|---|---|---|
| FC/geometric-optics-and-aberrations | 5 3 3 3 4 | KEEP | best file in tree; Petzval Σ1/(n·f) (:53); Helios 44-2 is double-Gauss (:55) |
| FC/cinematographic-lens-design | 4 3 3 3 4 | KEEP | format diagonals exact; 4:3×2 = 2.66 not 2.39 (:38) |
| FC/photochemical-emulsion | 4 3 2 3 4 | KEEP | accurate; omits orange mask |
| FC/photographic-processing | 4 3 3 3 3 | KEEP | ECN-2 41.1°C right; C-41 promised, absent; ISO 5-2 not 5-4 (:11) |
| FP/intimacy-coordination | 3 3 2 3 4 | KEEP | coherent best-practice |
| FP/set-operations-and-crew | 3 2 3 3 3 | KEEP+FIX | IATSE turnaround is 10h (12h is SAG-AFTRA) (:48); 3x golden time; director calls cut |
| FP/crew-morale-safety | 3 2 2 3 3 | FIX | same turnaround; invented "three-point clearance ceremony" |
| FP/hollywood-careers | 3 2 2 3 3 | FIX | managers can't procure in CA (Marathon v. Blasi) (:17) |
| FP/novel-adaptations | 3 3 1 2 3 | MOVE → film-and-theatre | public domain now pre-1931 (:19) |
| IA/publishing-platforms | 3 2 2 3 4 | KEEP + ~#as_of | Smashwords merged into D2D 2022 (:22) |
| IA/genre-conventions | 3 3 1 3 3 | FIX | LitRPG is Russian-origin, cultivation from xianxia (:22) |
| IA/author-software | 2 2 2 3 3 | KEEP + as_of | mobi deprecated |
| IA/marketing | 2 2 2 3 3 | FIX | "30-day cliff" folklore; ARCs must be disclosed |
| CR/* (5) | 1-2 2 1-2 3 2-3 | REGEN or DROP | sunflowers don't remediate lead (ecological:17) + free greens = exposure risk; test strips are immunoassays; doula RR 0.75 not 50%; stereotypes (cultural:35) |
| PD/common-deficiencies | 3 1 2 3 1 | DROP | MTHFR→methylfolate (:47); D-must-pair-K2 invariant (:80, warfarin risk); zinc:copper 10:1 serum (:82) |
| PD/nutritional-support | 2 1 2 3 1 | DROP | liver w/o pregnancy warning (:45, ~2× UL, teratogenic); raw dairy; whole-food invariant vs folic acid |
| PD/taste | 1 1 1 2 1 | DROP | cholesterol/hypertension recast as adaptive (:27-28) |
| PD/developmental-stages | 3 2 1 3 2 | DROP or REGEN | "delay puberty 18 months via diet → +15% bone" (:81) is backwards and invites manipulating kids' diets |
| PD/circadian | 3 1 2 3 2 | DROP or REGEN | "plain water fails to hydrate" (:55); ambiguous sun-in-eyes (:17/:62) |

## Tree-wide measurements

- 152 files / 11,672 lines; all parse (1 degrade: vscode/decorations.spw:100). Median leaf 76 lines.
- Only 11/152 declare a source; 0 declare generator/run id/date. Root invariant "every cached entry declares its provenance" fails 141/152.
- `#:layer #!pragmatics` on 152/152 — zero information.
- Furniture: leaves ~30% template (intent/taste/invariants/wonder) + 9% header; index+taste files ≈ 2,140 lines (21% of tree) are routing/stance only. Per-cluster reviewer counts: 35–65%.
- 337 `$%[...]` handles, 337 unique — no handle reused, so nothing can aggregate. LSP registerSnapshot regex-scrapes them into named registers that nothing fills. Canon (shelves.spw) points $%[] at the file's own material (operator density); caches point it at the world.
- 165 distinct `~#lens(...)` values for 167 uses; the LSP reads `// lens:`, not `~#lens()`.
- Two generator template versions (A: leaf taste + bare wonder + invented %; B: `^"wonder_probes"` wrapper, dense key:formula facets). B is stronger (linguistics, economics, FP, IA, half of FC).
- ~49 invented effect sizes in wonder hypotheses (Version A), styled like findings.
- Root ^"roots" + ^"dispatch" is 1:1 duplication; root also re-routes university subdirs directly (two paths to each).
- Snapshot artifacts (not defects): unrouted film-*/indie-author/economics/linguistics/film-and-theatre (live caches index has since routed them + mathematics/); broken economics/taste.spw.
- CLI side-finding: `spw graph/census` count `"~", "` inside a string list (jetbrains/syntax-highlighting.spw:33) as a path ref; parser-backed `spw select` doesn't.

---
# Round 2 — live caches snapshot 13:28 (scratchpad/snap2), 52 new files

## materials-matter-and-history (reviewed directly)
Template B throughout; hypotheses are mechanisms, not invented effect sizes (except steel "400%").
Lens matrix: history 6/6 (`world_history_*` prefix) · applications 4/6 (paint, fibers lack) · bonding/phase as keys 0/6. No inter-leaf refs.
| file | D I S T A | note |
|---|---|---|
| water | 4 3 2 3 3 | constants all correct; Wittfogel as fact w/ counterexamples (Grand Canal, Indus); Watt condenser ≠ rotary; no phase diagram |
| steel | 4 3 2 2 3 | Fe–C numbers correct; folding "thousands of times" myth; yakibare = quench crack; Hittite/tin myth; wonder credits Cottrell for 400% (wrong mechanism); dups materials-science |
| ink | 4 4 2 3 3 | Washburn right, Fenton corrosion right; "pyrogallate" → gallate; Habermas≠Anderson; no Islamic paper route |
| paint | 4 4 2 3 3 | refractive indices right; Chauvet BP≠BCE; no applications frame |
| acrylic | 4 3 2 3 3 | PMMA props right; Liquitex = Levison; Magna solvent-based; Bf 109 not bubble; coalescence ≠ 30 min |
| fibers | 4 4 2 3 3 | cellulose H-bond sites right; "ten-thousand-fold"; Han death-penalty legend; no India/khipu |
| phases-and-bonds | 3 3 2 3 3 | hub w/o refs; fountain pen ink ≈ Newtonian; no coordinate/π bonds; no phase diagrams |
| taste | 1 2 1 2 2 | oil paint "dried in minutes" (days); Bouchon 1725 predates Jacquard; Hollerith ← railway tickets |
| index | 2 2 3 3 2 | history folded in as lens; no standalone world history |

## Life sciences (nursing / neuro / MCB / bioeng) — 21 files, all template B
Neuro/MCB/bioeng ~95% correct; nursing ~88% w/ guideline drift. Best: MCB/protein-structure (4 4 4 4 3), nursing/critical-care (4 3 3 5 3 but see harms).
Nursing harms (VERIFIED verbatim 1–3,5):
1. pathophys:26-27 nitro contraindication list = PDE-5 only (omits hypotension, RV infarct); AF-RVR diltiazem/metoprolol w/o WPW/instability/HFrEF caveats; heparin/nitro as "nursing interventions" (need orders).
2. pathophys:20 vanc trough 15-20 "preventing nephrotoxicity" — backwards; 2020 ASHP/IDSA → AUC 400–600.
3. critical-care:32 chlorhexidine oral care as protocol — 2022 SHEA "generally not recommended".
4. pathophys:31 DKA = 2009 protocol; dextrose rationale wrong; no insulin-overlap/peds caveat.
5. ethics:39 "physiological peace without pharmacologic intervention" at withdrawal — reads as under-treat terminal dyspnea.
6. critical-care:17 CVP for fluid responsiveness (refuted); sepsis 30 mL/kg unconditional.
Other: Cas9 "1D sliding, seconds" backwards (nucleic:38-40); Na+ inactivation ≠ ball-and-chain (cellular:22); PECAM shear backwards (instrumentation:40); split-brain/neurogenesis/energy overclaims (neuro taste).
Overlap: neuro↔cog-psych (predictive processing, streams, DMN); SNAREs ×2; biomaterials↔materials-science.

## Math / cog-psych / LIS / hospitality / econ taste — 25 files, all template B
~90% core accuracy. Best: cog-psych/perception (4 4 3 4 4), LIS/knowledge-org (4 4 3 4 4), LIS/IR (4 4 4 3 3), math undergrad files (4 4 3 3-4 3).
High: math/taste:41 Gödel w/o "effectively axiomatized" + Lucas–Penrose as consequence; topology:29 Cauchy–Riemann "iff"; hospitality/index:44 recovery paradox as loyalty; cog-dev:39 false-belief "48 months across cultures"; F&B:39 money priming; LIS/IR:41 TREC-COVID "legal".
Medium: dropped conditions (Fatou ≥0, σ-finiteness ×3, van Kampen, covering spaces); forgetting curve not exponential; Wason drinking-age = Griggs & Cox; marshmallow, nudges uncritical; rate parity outdated (EU DMA); NSL framing; Gold OA ≠ APC.
Gaps: math is pure-only (no probability/stats/numerics/transforms) → does NOT fill engineering math core; no language acquisition anywhere; hospitality lacks EMSR-b/overbooking, labor/tip law; LIS lacks RDA, PageRank, CIPA/FERPA.
Missing links: cog-psych↔econ (behavioral), hospitality↔IE (queueing/newsvendor), hospitality↔econ (price discrimination), LIS↔linguistics archives, math↔all engineering.
Ethical conflict: cog-psych/taste:20 calls pain-of-paying exploitation a dark pattern; hospitality F&B:21,39 recommends it.
