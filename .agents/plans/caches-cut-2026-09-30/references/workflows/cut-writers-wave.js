export const meta = {
  name: 'cut-writers-wave',
  description: 'Write a wave of 2026-09-30 cut packages: writer, adversarial fact-check, fix (optionally weave, apparatus, harm sweep, critic)',
  phases: [
    { title: 'Write', detail: 'one writer per package' },
    { title: 'Check', detail: 'adversarial fact-check per package' },
    { title: 'Fix', detail: 'apply corrections, receipts, regate' },
    { title: 'Weave', detail: 'claim-level renvois across packages' },
    { title: 'Apparatus', detail: 'root index, registries indexes, panels, trails, gaps' },
    { title: 'Sweep', detail: 'harm sweep and completeness critic' },
  ],
}
// args: { repo, cut, planPath, scorecard, packageIds, stages, wave }
const A = args
const run = (s) => !A.stages || A.stages.includes(s)
const GATE = `cd ${A.repo} && node --import tsx scripts/analyzers/spw-cut-gate.ts ${A.cut}`
const COMMON = `You are writing part of a dated reference cut in the spw-workbench repo (cwd ${A.repo}). The cut lives at ${A.cut}. Write ONLY the files your package owns; never edit other packages' files, the contract, the vocabulary, or anything outside ${A.cut}. Do not commit; do not use git stash.

YOUR PACKAGE SPEC is the writer_packages entry with your id in the plan JSON ${A.planPath} (read it with: python3 -c "import json;f=json.load(open('${A.planPath}'));print(json.dumps([p for p in f['writer_packages'] if p['id']=='<ID>'][0],indent=1))"). Paths in the plan are relative to .spw/caches/ (so 2026-09-30/season/x.spw means ${A.cut}/season/x.spw); owns_registries paths are relative to ${A.cut}/; raw_inputs are under .spw/caches/. The plan's tree gives every planned path with its file anchor, form, level, domain, purpose, architecture, and sources; cross_links, trails, and gaps are also in the plan.

READ FIRST, fully: ${A.cut}/contract.spw (rules incl. ethics, inspection receipts, permanence, graph, hazards), ${A.cut}/vocabulary.spw (closed sets), and the exemplar ${A.cut}/physical/materials/water.spw with its registries ${A.cut}/registries/quantities/materials-and-engineering.spw and ${A.cut}/registries/sources/materials-and-engineering.spw (a verified surface that applies every rule once). Read the review scorecard ${A.scorecard} for your raw inputs: every error it lists must be corrected, not carried over. Quarantined raw files (listed in .spw/caches/index.spw ^"quarantine") are never a source for a claim; successors are written from real sources.

WRITING RULES (beyond the contract):
- Each owned file opens with the EXACT file anchor the plan assigns. Link other packages' files by planned path + planned file anchor only (they may not exist yet).
- Scientific integrity: no invented numbers, effect sizes, or sources. Cite works you can name exactly (title, authors, year, venue/publisher) in YOUR registries/sources file under your namespace (src_<ns>_*); when unsure, verify with WebSearch/WebFetch (load with ToolSearch "select:WebSearch,WebFetch") or mark the claim speculative and the surface spot_checked. Dated facts carry as_of and version/edition; anything past your verified knowledge is a verify cell, never asserted. Health content is educational reference only (scope frame, guideline body + version + year, contraindications), never advice, doses, diets, supplements, or remediation.
- Attribution and origins: credit named methods to originators; credit cultural origins including non-Western and community sources; no stereotypes; no private individuals. Repository source code is cited as quoted path:line strings, not ~ refs.
- Quantities: cells only in YOUR registries/quantities file under your namespace (e.g. mateng.water.cp_j_per_g_k); cite with reads: %[ns.key] or $%[...] in wonders (max 3). Fewer, reused, meaningful cells.
- Architecture: use the architecture the plan assigns each file (timeline ladder, prerequisite DAG with typed =~ bias edges or ^["edges"] needs, comparison matrix, protocol state machine with ?match, cadence schedule << >>, claim ledger, glossary lattice, case dossier, probe battery, registry, calendar, kit). Nest ^ frames deeply where the ontology is real. Under ~300 lines per file; one claim per line; strings never wrap; separate same-line bindings with commas.
- Wonder: 1-2 per leaf with #:depth + ~#lens from the vocabulary, #:claim #!speculative before hypotheses (direction, not magnitude), typed !probe with unique =id[p_<ns>_...], $%[...] resolving to registry cells or reflexive handles; cross-domain wonders include breaks:.
- Experiential: leaves that teach a practice get a ^["try"] kit (materials, steps as << a ; b >>, time, safety, shows: link).
- Receipts: r1 generated (gemini-3.8-flash-high, care #glance, outcome #raw) when lineage includes raw files; r2 revised (agent "claude-opus-5.5 writer", care #audit, outcome #corrected or #pass); r3 gated (agent "spw-cut-gate", care #skim, outcome #pass). #:review sourced only when every factual keystone claim links a registry source; else spot_checked.
- Write each package index.spw with ^["tree"] routing to children (plain paths) and ^["bundle"]{ ={ ~"./child.spw#child_anchor" } } of children's file anchors; never link up to parents.
- GATE: run ${GATE} --quiet then ${GATE} --json; fix EVERY failure in your files except unresolved refs or missing anchors pointing at planned files other packages have not written yet (list those). Then for each of your files run: cd ${A.repo} && node --import tsx packages/spw-cli/src/main.ts emit pack <file> --host brief --strict-continuity --strict-positive (exit 0 required).`

const WRITE_SCHEMA = { type: 'object', properties: {
  package: { type: 'string' }, files: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, anchor: { type: 'string' }, lines: { type: 'number' } }, required: ['path'] } },
  registry_cells: { type: 'number' }, sources: { type: 'number' }, corrected_errors: { type: 'array', items: { type: 'string' } },
  pending_refs: { type: 'array', items: { type: 'string' } }, web_checks: { type: 'array', items: { type: 'string' } },
  uncertainties: { type: 'array', items: { type: 'string' } }, gate: { type: 'string' } }, required: ['package', 'files', 'gate'] }
const CHECK_SCHEMA = { type: 'object', properties: {
  corrections: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, anchor: { type: 'string' }, claim: { type: 'string' }, problem: { type: 'string' }, correct: { type: 'string' }, evidence: { type: 'string' }, severity: { type: 'string', enum: ['harm', 'error', 'imprecise', 'unsourced', 'attribution'] } }, required: ['file', 'claim', 'problem', 'correct', 'severity'] } },
  confirmed: { type: 'array', items: { type: 'string' } }, sources_checked: { type: 'array', items: { type: 'object', properties: { source: { type: 'string' }, exists: { type: 'boolean' }, note: { type: 'string' } }, required: ['source', 'exists'] } } },
  required: ['corrections', 'confirmed', 'sources_checked'] }

const ids = A.packageIds
log(`wave ${A.wave}: ${ids.join(', ')}; stages ${(A.stages || ['all']).join(',')}`)
let done = []
if (run('write')) {
  done = (await pipeline(ids,
    (id) => agent(`${COMMON}\n\nYOUR PACKAGE ID: ${id}. Read your spec. Some owned files may already exist from an interrupted run: read each existing file first and complete, correct, and gate it rather than rewriting it from scratch; then write the owned files that are still missing and your two registry files. Final answer: JSON per schema.`, { label: `write:${id}`, phase: 'Write', schema: WRITE_SCHEMA }).then((w) => ({ id, w })),
    ({ id, w }) => run('check') ? agent(`You are an adversarial FACT-CHECKER for package ${id} of the cut at ${A.cut} (repo ${A.repo}). Read every file the package wrote: ${JSON.stringify((w && w.files || []).map((f) => f.path))} plus its registries (see the package spec in ${A.planPath}). Default to doubt. Check every number and unit, date and as_of, attribution and named method, and every source entry (does the work exist with that title, author, year, venue? use WebSearch/WebFetch via ToolSearch "select:WebSearch,WebFetch"); clinical, legal, union, platform, royalty, and festival claims against current terms with year; cultural origins; claims marked settled that are contested. Prioritize harm > error > attribution > imprecise > unsourced. Also run ${GATE} --quiet and note failures in this package's files. Return JSON per schema.`, { label: `check:${id}`, phase: 'Check', schema: CHECK_SCHEMA }).then((c) => ({ id, w, c })) : { id, w, c: null },
    ({ id, w, c }) => (run('fix') && c) ? agent(`${COMMON}\n\nYOUR PACKAGE ID: ${id}. FIX PASS. A fact-checker reviewed your files. Apply every correction that holds up (verify any you dispute and explain). Update claims, sources, #:claim statuses, limits, and #:review honestly; add receipt r4 { event: #fact_checked, at: "2026-10-01", agent: "claude-opus-5.5 fact-checker", care: #adversarial, outcome: #corrected or #pass }; set #:review #!adversarial_checked only if every factual keystone claim is sourced and no harm or error remains. Re-run the gate and the emit gate. Final answer: JSON per schema (final state).\n\nCORRECTIONS:\n${JSON.stringify(c)}`, { label: `fix:${id}`, phase: 'Fix', schema: WRITE_SCHEMA }).then((f) => ({ id, write: w, check: c, fix: f })) : { id, write: w, check: c, fix: null }
  )).filter(Boolean)
  log(`wave ${A.wave} packages finished: ${done.length}/${ids.length}`)
}
let woven = null
if (run('weave')) {
  woven = await parallel(ids.map((id) => () => agent(`${COMMON}\n\nYOUR PACKAGE ID: ${id}. WEAVE PASS (renvois). Other packages are now written. For each of your files, add or refine ^["edges"] links to the most relevant CLAIM-LEVEL anchors in OTHER packages (start from the plan's cross_links, then grep -rn '^ *#>' ${A.cut} and read the target frames). Relations from the vocabulary only; each edge must be defensible; 2-6 outbound renvois per leaf; never link up to your own index. Add receipt { event: #woven, at: "2026-10-01", agent: "claude-opus-5.5 weaver", care: #read, outcome: #pass }. Re-run the gate; fix your failures. Final answer: edges added per file and the gate line.`, { label: `weave:${id}`, phase: 'Weave' })))
}
let apparatus = null
if (run('apparatus')) {
  apparatus = await agent(`${COMMON}\n\nYOUR PACKAGE ID: root. APPARATUS PASS. Write root's owned files: the root index (outline of knowledge, doors by reader and practitioner, facet legend, ^["tree"] to every class index and apparatus dir, ^["bundle"] of class digests), registries indexes, trails (ordered stops in ^["stops"] plus a << >> schedule; each trail crosses at least two classes), panels (concept lattice, computed-kin and facet-census as prompts not claims), and audit vocabulary leftovers per your notes. Run the full gate and fix failures in your files; report remaining failures elsewhere. Final answer: JSON per schema.`, { label: 'apparatus', phase: 'Apparatus', schema: WRITE_SCHEMA })
}
let sweep = null, critic = null
if (run('sweep')) {
  sweep = await agent(`You are the HARM SWEEPER for the cut at ${A.cut} (repo ${A.repo}). Grep and read living/, society/communities/, learning/, and spw/perspectives/ (if present) for imperatives addressed to a reader about their body or care, dose units, supplement and diet names, protocol steps presented as instructions, and remediation verbs. For each hit decide: educational description with source and scope (ok) or advice (harm). Fix harms in place with minimal edits that keep the knowledge (reframe as history, policy, or mechanism; add scope frame; remove imperatives); add a receipt { event: #fact_checked, ..., care: #audit, outcome: #corrected } to each edited file. Run the gate. Report every hit and decision.`, { label: 'harm-sweep', phase: 'Sweep' })
  critic = await agent(`You are the COMPLETENESS CRITIC for the cut at ${A.cut} (repo ${A.repo}). Compare the plan ${A.planPath} against what exists: planned paths written? anchors as planned? Run ${GATE} --json and summarize failures by package and kind. Sample 10 files across classes and score depth, independent value, script value, tree fit, accessibility (curricular/informative/experiential) 1-5, and integrity (sources real, no invented numbers, harms handled). List concrete follow-ups. Return markdown.`, { label: 'critic', phase: 'Sweep' })
}
return { wave: A.wave, done, woven, apparatus, sweep, critic }
