export const meta = {
  name: 'cut-writers',
  description: 'Write the 2026-09-30 cut: per-package writers, adversarial fact-check, fix; global gate; renvois weave; root apparatus; completeness critic',
  phases: [
    { title: 'Write', detail: 'one writer per package' },
    { title: 'Check', detail: 'adversarial fact-check per package' },
    { title: 'Fix', detail: 'apply corrections, receipts, regate' },
    { title: 'Weave', detail: 'claim-level renvois across packages' },
    { title: 'Apparatus', detail: 'root index, doors, panels, trails, gaps, manifest' },
    { title: 'Critic', detail: 'completeness against plan and directives' },
  ],
}

// args: { repo, cut, S, planPath, scorecard, packages: [{id, owns_files:[...], owns_registries:[...], raw_inputs:[...], notes}], apparatusId, skip: [ids] }
const A = args
const GATE = `cd ${A.repo} && node --import tsx scripts/analyzers/spw-cut-gate.ts ${A.cut}`
const COMMON = `You are writing part of a dated reference cut for the spw-workbench repo at ${A.repo}. The cut lives at ${A.cut}. Write ONLY the files your package owns (listed below); never edit other packages' files, the contract, the vocabulary, or anything outside ${A.cut}. Do not commit; do not use git stash.

READ FIRST, fully: ${A.cut}/contract.spw (the rules), ${A.cut}/vocabulary.spw (closed sets: axes, claim, depth, lens, probe_kind, relation, event, care, outcome), and the exemplar surface named in the contract's edges (a verified surface showing every rule once: header stack, ^"emit" card, ^"provenance" with ^["receipts"], ^["edges"], ^["concepts"], anchored keystone claim frames with #:claim status + source links into registries + limits, ^["try"] kit, a wonder block). The full plan (tree with every planned path + file anchor, cross_links, trails, gaps) is JSON at ${A.planPath}. The two-round review scorecard with per-file errors, harms, and verdicts for the raw inputs is at ${A.scorecard} — every error it lists for your raw inputs must be corrected, not carried over.

WRITING RULES (beyond the contract):
- Each owned file opens with the EXACT file anchor the plan assigns. Link other packages' files only by their planned path + planned file anchor (they may not exist yet; that is expected).
- Scientific integrity: no invented numbers, effect sizes, or sources. Cite works you can name exactly (title, authors, year, venue/publisher) in YOUR registries/sources file; when unsure, verify with WebSearch/WebFetch (load them with ToolSearch "select:WebSearch,WebFetch"), or leave the claim at #:claim #!speculative / #:review #!spot_checked. Dated facts (rules, prices, platform policy, guidelines, release status) carry as_of and the version/edition. Clinical and health content is educational reference with a ^["scope"] frame, guideline body + version + year on every protocol, and principal contraindications; never advice.
- Attribution and origins: credit named methods and frameworks to their originators; credit cultural origins (non-Western and community sources included); no stereotypes; no private individuals.
- Quantities: define cells only in YOUR registries/quantities file under namespaces specific to your domain; cite with reads: %[ns.key] or in wonders $%[...] (max 3). Prefer fewer, meaningful cells that several files reuse.
- Architecture: use the script architecture the plan assigns each file (timeline ladder, prerequisite DAG with typed =~ bias edges or ^["edges"] needs, comparison matrix, protocol state machine with ?match, cadence schedule << >>, claim ledger, glossary lattice, case dossier, probe battery, registry, trail, calendar). Nest ^ frames deeply where the ontology is real. Keep each file under ~300 lines; one claim per line; strings never wrap.
- Wonder: 1-2 per leaf, #:depth + ~#lens from the vocabulary, #:claim #!speculative before hypotheses that state direction not magnitude, a typed !probe with a unique =id[p_<anchor>...], and $%[...] handles that resolve to registry cells or the gate's reflexive list. Cross-domain wonders include breaks: "where the analogy fails".
- Receipts in provenance: r1 generated (gemini-3.8-flash-high, care #glance, outcome #raw) when lineage includes raw files; r2 revised (agent "claude-opus-5.5 writer", care #audit, outcome #corrected or #pass); r3 gated (agent "spw-cut-gate", care #skim, outcome #pass) after the gate passes. Separate same-line bindings with commas.
- #:review: sourced only when every factual keystone claim links a registry source; otherwise spot_checked.
- GATE: run ${GATE} --quiet and then ${GATE} --json, and fix EVERY failure in your own files, except 'unresolved ref' / 'no #> in target' for planned files other packages have not written yet (list those in your report). Then run the brief emit gate on each of your leaf and index files: cd ${A.repo} && node --import tsx packages/spw-cli/src/main.ts emit pack <file> --host brief --strict-continuity --strict-positive (exit 0 required; continuity anchors must appear in title/claim/proof/door; phrase boundaries positively).`

const WRITE_SCHEMA = { type: 'object', properties: {
  package: { type: 'string' }, files: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, anchor: { type: 'string' }, lines: { type: 'number' }, architecture: { type: 'string' } }, required: ['path', 'anchor'] } },
  registry_cells: { type: 'number' }, sources: { type: 'number' }, corrected_errors: { type: 'array', items: { type: 'string' } },
  pending_refs: { type: 'array', items: { type: 'string' } }, web_checks: { type: 'array', items: { type: 'string' } },
  uncertainties: { type: 'array', items: { type: 'string' } }, gate: { type: 'string' } }, required: ['package', 'files', 'gate'] }

const CHECK_SCHEMA = { type: 'object', properties: {
  corrections: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, anchor: { type: 'string' }, claim: { type: 'string' }, problem: { type: 'string' }, correct: { type: 'string' }, evidence: { type: 'string' }, severity: { type: 'string', enum: ['harm', 'error', 'imprecise', 'unsourced', 'attribution'] } }, required: ['file', 'claim', 'problem', 'correct', 'severity'] } },
  confirmed: { type: 'array', items: { type: 'string' } }, sources_checked: { type: 'array', items: { type: 'object', properties: { source: { type: 'string' }, exists: { type: 'boolean' }, note: { type: 'string' } }, required: ['source', 'exists'] } } },
  required: ['corrections', 'confirmed', 'sources_checked'] }

const pkgText = (p) => `YOUR PACKAGE: ${p.id}\nOWNS FILES (exact paths under ${A.cut}):\n${JSON.stringify(p.owns_files, null, 1)}\nOWNS REGISTRIES: ${JSON.stringify(p.owns_registries)}\nRAW INPUTS (read fully; under ${A.repo}/.spw/caches/): ${JSON.stringify(p.raw_inputs)}\nPACKAGE NOTES: ${p.notes || ''}`

const writers = A.packages.filter((p) => p.id !== A.apparatusId && !(A.skip || []).includes(p.id))
log(`writer packages: ${writers.length} (${writers.map((p) => p.id).join(', ')})`)

const results = await pipeline(writers,
  (p) => agent(`${COMMON}\n\n${pkgText(p)}\n\nWrite every owned file now. Final answer: JSON per schema.`, { label: `write:${p.id}`, phase: 'Write', schema: WRITE_SCHEMA }).then((w) => ({ p, w })),
  ({ p, w }) => agent(`You are an adversarial FACT-CHECKER for package ${p.id} of the cut at ${A.cut}. Read every file the package wrote: ${JSON.stringify((w && w.files || []).map((f) => f.path))} plus its registries ${JSON.stringify(p.owns_registries)}. Default to doubt. Check: every number and unit; every date and as_of; every attribution and named method; every source entry (does the work exist with that title/author/year/venue? use WebSearch/WebFetch via ToolSearch "select:WebSearch,WebFetch"); every clinical/health/legal/platform claim against current guidance (name the guideline and year); cultural origins; claims marked settled that are contested. Prioritize harm > error > attribution > imprecise > unsourced. Also re-run ${GATE} --quiet and note any failures in this package's files. Return JSON per schema.`, { label: `check:${p.id}`, phase: 'Check', schema: CHECK_SCHEMA }).then((c) => ({ p, w, c })),
  ({ p, w, c }) => agent(`${COMMON}\n\n${pkgText(p)}\n\nFIX PASS. A fact-checker reviewed your package. Apply every correction below that holds up (if you disagree with one, verify and explain in your report). Update claims, sources, statuses (#:claim), limits, and #:review honestly; add a receipt r4 { event: #fact_checked, at: "2026-09-30", agent: "claude-opus-5.5 fact-checker", care: #adversarial, outcome: #corrected or #pass }; set #:review #!adversarial_checked only if every factual keystone claim is sourced and the check found no unresolved harm or error. Re-run the gate and the emit gate. Final answer: JSON per schema (files reflect final state).\n\nCORRECTIONS:\n${JSON.stringify(c)}`, { label: `fix:${p.id}`, phase: 'Fix', schema: WRITE_SCHEMA }).then((f) => ({ id: p.id, write: w, check: c, fix: f }))
)
const done = results.filter(Boolean)
log(`packages written: ${done.length}/${writers.length}`)

phase('Weave')
const woven = await parallel(writers.map((p) => () => agent(`${COMMON}\n\n${pkgText(p)}\n\nWEAVE PASS (renvois). All packages are now written. For each of your files, add or refine ^["edges"] so it links to the most relevant CLAIM-LEVEL anchors in OTHER packages (use the plan's cross_links as a starting list, then search the cut: grep -rn '^#>' ${A.cut} and read the target frames). Relations from the vocabulary only; each edge must be defensible (an edge is a claim); 2-6 outbound renvois per leaf; never link up to your own index; prefer contrasts/analog/grounds/needs/feeds that a learner would follow. Add a receipt { event: #woven, ..., care: #read, outcome: #pass }. Re-run the gate; fix your failures. Final answer: a short list of edges added per file and the gate line.`, { label: `weave:${p.id}`, phase: 'Weave' })))

phase('Apparatus')
const app = A.packages.find((p) => p.id === A.apparatusId)
const apparatus = app ? await agent(`${COMMON}\n\n${pkgText(app)}\n\nAPPARATUS PASS. Every branch is written and woven. Write the root apparatus you own: the root index (outline of knowledge in Propaedia spirit, doors by reader/persona, legend of facets, ^["tree"] routing to every branch index, ^["bundle"] of branch digests), branch registry indexes if owned, trails (Memex-style ordered stops using real anchors, each a << >> schedule plus ^["stops"] with path refs), panels (Warburg-style cross-era affinity panels citing anchors from several branches), gap tables (Mendeleev-style: facet matrices whose empty cells are named open questions), a computed-cluster placeholder that states it is a prompt not a claim, and the provenance manifest (raw path -> new path(s) with action, plus the raw fixity list at ${A.S}/raw-fixity.txt and the raw archive file in ${A.cut}/provenance/). Then run the full gate and fix failures in your files; report remaining failures elsewhere. Final answer: JSON per schema.`, { label: 'apparatus', phase: 'Apparatus', schema: WRITE_SCHEMA }) : null

phase('Critic')
const critic = await agent(`You are the COMPLETENESS CRITIC for the cut at ${A.cut}. Compare the plan at ${A.planPath} against what exists: every planned path written? anchors as planned? every raw file accounted for in the provenance manifest? Run ${GATE} --json and summarize failures by package and kind. Sample 10 files across branches and judge depth, independent value, script value, tree fit, accessibility (curricular/informative/experiential) 1-5 like the earlier review, and integrity (sources real, no invented numbers, harms handled). List concrete follow-ups. Return markdown.`, { label: 'critic', phase: 'Critic' })

return { done, woven, apparatus, critic }
