export const meta = {
  name: 'spw-persona-evaluation',
  description: 'Evaluate Spw design from 12 learner/professional clusters implied by the corpus; verify; synthesize familiarity matrix, doors, contraptions, tree amendments',
  phases: [
    { title: 'Evaluate', detail: '12 persona-cluster evaluators' },
    { title: 'Verify', detail: 'notation historian + Spw canon checker per evaluation' },
    { title: 'Synthesize', detail: 'familiarity matrix, doors, contraption catalog, tree amendments, theory questions' },
  ],
}

const REPO = '.'
const S = '<scratchpad>'
const CANON = `Spw canon to read first (read-only; do not edit the repo): docs/theory/spw/operators.spw (operator reader vocabulary), docs/theory/spw/valence-architecture.spw (valence = charge-neutral material quality, NOT moral judgment or success/error), docs/theory/spw/apposition.spw, docs/theory/spw/flow-protocol-sigils.spw, docs/theory/spw/operator-atlas.spw (every reading must name where it breaks), docs/theory/spw/materials-ontology.spw, docs/theory/spw/semantics-physics.spw, docs/theory/spw/dimensional-axes.spw, docs/theory/spw/math-modeling.spw, docs/theory/spw/field-dynamics.spw, docs/theory/spw/register-geometry.spw, .spw/conventions/cli.spw (metaphor boundary ~:45-51: analogies only beside an observable mapping and a stated limit), lib/spw-v0.3.0/README.md and architecture/index.spw, packages/spw-seed/src/types/token.ts (the real sigil set). Research reports on what the tools actually do: ${S}/understand-out/theory_state.md (READ IT: corrected facts — e.g. $% parses as two operations; ~#lens() is invisible to the LSP until a fix lands; #: is 'case', #! 'mood', #> 'deixis/anchor', ~# 'aspect'; valence words are MODIFIER tokens; canon operator names: ~ potential, # resonance/vibration, . ground, & confluence, ^ integration/ascension, $ substrate, = configuration/bias, @ perspective, ? wonder, ! action, * value, % measure, <> coupling; repo naming is inconsistent in places), ${S}/understand-out/syntax_breadth.md (what parses structurally and 9 verified script architectures), ${S}/understand-out/tags.md, ${S}/understand-out/linking.md. The cut being built: ${S}/cut-staging/2026-09-30/contract.spw, vocabulary.spw, and the exemplar matter/water.spw (a verified surface).`

const PERSONAS = [
  { key: 'c_programmers', who: 'C-family programmers on ANSI keyboards (C, C++, JavaScript/TypeScript, Python, shell, Rust)', prior: 'braces as blocks, [] indexing, ! not, & address/and, * pointer/deref/multiply, ^ xor, ~ bitwise not, % modulo/format, @ decorators/annotations, $ shell variables/template literals, # preprocessor/comment/private field, ?: ternary and optional chaining, . member access, = assignment vs ==, <> generics/not-equal, JSON/YAML shapes' },
  { key: 'physics', who: 'physics students and physicists (undergrad through research; also thermodynamics and optics people)', prior: 'vectors and tensors, index notation and Einstein summation, bra-ket <psi|phi>, operators and eigenvalues, ^ hats/exponents, ~ approximately/proportional/order-of, * complex conjugate/convolution, dot and cross products, units and dimensional analysis, conservation laws, fields and potentials, phase space, Feynman diagrams, free-body diagrams; tends to cluster concepts by symmetry and invariants' },
  { key: 'designers', who: 'graphic designers, illustrators, animators, and industrial designers', prior: 'CSS selectors (.class, #id, @media, :hover, {} rule blocks), Figma/Illustrator layers, frames, components and variants, auto-layout, grids and baselines, Gestalt grouping (proximity, similarity, closure), hex colors #rrggbb, typographic hierarchy, keyframes and easing curves, moodboards; tends to cluster by visual affinity and composition' },
  { key: 'mathematicians', who: 'mathematicians and math students (pure and applied)', prior: 'LaTeX, set-builder notation, ~ equivalence relations, ^ exponent/wedge, % mod, & and, commutative diagrams and arrows, proofs as structured argument, definitions/lemmas/theorems, hypotheses and conditions, lattices, categories and functors' },
  { key: 'engineers_chemists', who: 'chemists, materials scientists, and engineers (chemical, mechanical, electrical/computer, industrial)', prior: 'reaction arrows -> and equilibrium <=>, SMILES and structural formulas, phase diagrams, units and significant figures, P&IDs and block diagrams, Verilog/VHDL, Simulink signal flow, state machines, tolerances, bills of materials, process control loops' },
  { key: 'life_clinical', who: 'life scientists, neuroscientists, bioengineers, and nurses/clinicians', prior: 'pathway diagrams (activation/inhibition arrows), gene/protein naming, SBAR handoffs, nursing process (ADPIE), charting and flowsheets, protocols and bundles, medication rights, early-warning scores, evidence hierarchies, safety culture and checklists' },
  { key: 'linguists', who: 'linguists and language teachers', prior: 'labeled bracket and tree notation [NP [D the] [N cat]], feature matrices [+voice, -nasal], * for ungrammatical and ? for marginal acceptability, IPA and slashes /phonemes/ vs [phones], morpheme glossing (Leipzig rules with - and = and .), lambda calculus for semantics, apposition as a grammatical term, case/mood/aspect as grammatical categories (which Spw particle names borrow)' },
  { key: 'social_scientists', who: 'economists and social scientists (incl. hospitality and management)', prior: 'equations and subscripted variables, Stata/R syntax, causal DAGs, regression tables, game-theory payoff matrices, flowcharts, balance sheets, KPIs (RevPAR etc.), survey instruments, codebooks' },
  { key: 'librarians', who: 'librarians, archivists, and information scientists', prior: 'MARC fields and subfields ($a $b), Dublin Core, faceted classification (Ranganathan PMEST with : ; , . punctuation!), Dewey, controlled vocabularies and authority files, RDF/SPARQL, finding aids, provenance and fixity (OAIS/PREMIS), citation styles' },
  { key: 'production_crews', who: 'film, theatre, and production crews (directors, ADs, stage managers, DPs, editors)', prior: 'call sheets, shot lists and slate notation (scene/shot/take), script formatting (sluglines INT./EXT.), stage-manager cue calls (standby / go), EDLs and timecode, lighting plots, schedules and stripboards, safety bulletins; strong sense of cadence and sequence' },
  { key: 'creators', who: 'indie authors, podcasters, and TikTok LIVE streamers (Spw\'s likely first users)', prior: 'Markdown and outlines, Scrivener binders, chat commands !cmd, @mentions, #hashtags (three Spw sigils already social habits), OBS scenes and sources, show run sheets, content calendars, fast chat torrents needing triage/clustering, audience wonder prompts' },
  { key: 'educators_community', who: 'educators, parents, and community organizers (secondary and university teaching, intergenerational learning, community roles)', prior: 'syllabi, lesson plans, rubrics, standards codes, agendas and minutes, sign-up sheets, family calendars, oral history and interview protocols, story circles; care about accessibility, reading level, and cultural difference' },
]

const EVAL_SCHEMA = { type: 'object', properties: {
  persona: { type: 'string' },
  familiar_shapes: { type: 'array', items: { type: 'object', properties: { spw: { type: 'string' }, prior_meaning: { type: 'string' }, spw_meaning: { type: 'string' }, verdict: { type: 'string', enum: ['helpful_bridge', 'false_friend', 'neutral', 'mixed'] }, note: { type: 'string' } }, required: ['spw', 'prior_meaning', 'spw_meaning', 'verdict'] } },
  friction: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, evidence: { type: 'string' }, severity: { type: 'string' }, mitigation: { type: 'string' } }, required: ['issue', 'mitigation'] } },
  clustering_entrances: { type: 'array', items: { type: 'object', properties: { entrance: { type: 'string' }, spw_constructs: { type: 'string' }, why_it_fits: { type: 'string' } }, required: ['entrance', 'spw_constructs'] } },
  contraptions: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, what_it_explores: { type: 'string' }, spw_sketch: { type: 'string' }, parses: { type: 'boolean' }, tooling_needed: { type: 'string' }, exists_today: { type: 'string' }, wonder: { type: 'string' } }, required: ['name', 'what_it_explores', 'spw_sketch', 'parses', 'tooling_needed'] } },
  doors: { type: 'array', items: { type: 'object', properties: { start_at: { type: 'string' }, then: { type: 'string' }, why: { type: 'string' } }, required: ['start_at', 'why'] } },
  architecture_recs: { type: 'array', items: { type: 'string' } },
  theory_questions: { type: 'array', items: { type: 'string' } },
  metaphor_limits: { type: 'array', items: { type: 'string' } },
}, required: ['persona', 'familiar_shapes', 'friction', 'clustering_entrances', 'contraptions', 'doors', 'architecture_recs', 'theory_questions'] }

const VERIFY_SCHEMA = { type: 'object', properties: {
  corrections: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, problem: { type: 'string' }, correct: { type: 'string' } }, required: ['item', 'problem', 'correct'] } },
  confirmed: { type: 'array', items: { type: 'string' } },
  sketch_checks: { type: 'array', items: { type: 'object', properties: { contraption: { type: 'string' }, parses: { type: 'boolean' }, detail: { type: 'string' } }, required: ['contraption', 'parses'] } },
}, required: ['corrections', 'confirmed'] }

const evalPrompt = (p) => `${CANON}

You evaluate the DESIGN of Spw from the perspective of: ${p.who}.
Their prior notations and habits: ${p.prior}.
The owner (Spw's designer) says: shapes of Spw will feel familiar because of ANSI keyboards and C-style languages; they want to be more mindful of physics students and graphic designers who approach Spw from a conceptual-clustering perspective; and they see opportunity to extend wonder and build unique mathematical exploration contraptions, wanting the file architecture and tree structure to make exploring the design of languages and materials more wonderful. The corpus being refactored (a dated reference cut under .spw/caches/2026-09-30/) spans curricula and careers in physics, chemistry, materials, engineering, math, biology, neuroscience, nursing, linguistics, economics, library science, hospitality, design, animation, film and theatre, indie publishing, podcasting, TikTok LIVE, community roles, and media history.

Do real work: read canon, write small .spw sketches into ${S}/persona/${p.key}/ and verify each parses STRUCTURALLY with: cd ${REPO} && node --import tsx scripts/analyzers/spw-syntax-validate.ts -- ${S}/persona/${p.key} (and inspect with node --import tsx packages/spw-cli/src/main.ts select <file> --selector all --skim -q run from a cwd whose consumer root contains the file, or via the wrapper ${S}/understand/spw.sh with cwd ${S}/persona). Only mark parses:true when verified. Ground every claim about Spw in canon file:line; never claim tooling behavior the reports say does not exist (say 'needs tooling' instead).

Deliver:
- familiar_shapes: every Spw sigil/brace/particle form this persona will pattern-match (aim for 12-20), with prior meaning, Spw meaning, and verdict (helpful_bridge / false_friend / neutral / mixed).
- friction: where they will stumble (parsing hazards, naming inconsistencies, jargon, keyboard reach, reading order), with mitigations (docs, doors, lint, syntax profile, glossary).
- clustering_entrances: how this persona's native way of grouping concepts maps onto Spw constructs (facets .{}, sets #[], frames ^[], particles #: #!, appositions ~#lens(), bias edges =, coupling <>, schedules << >>, registries %ns.key{}, anchors and trails).
- contraptions: 2-4 mathematical/conceptual exploration contraptions this persona would love, each with a VERIFIED Spw sketch (short), what it explores, what tooling it needs (existing CLI command vs new), and the wonder it opens. Think: dimensional-analysis checkers, phase-space or phase-diagram walkers, symmetry/invariant finders, color/valence wheels, grid/lattice composers, Llull combinators, Mendeleev gap finders, Warburg affinity panels, prerequisite DAG walkers, cadence simulators, chat-torrent clusterers, glossing aligners, faceted catalog browsers.
- doors: where in a reference tree this persona should enter first and what next (by kind of surface, e.g. "a glossary lattice of operators with physics analogs and stated limits", "a registry of quantities with units").
- architecture_recs: concrete file-architecture and tree-structure recommendations for the cut so this persona finds exploring language design and materials wonderful.
- theory_questions: questions for the language designer (not decisions).
- metaphor_limits: where analogies from this persona's field to Spw break (per the metaphor boundary).
Return JSON only.`

phase('Evaluate')
const results = await pipeline(PERSONAS,
  p => agent(evalPrompt(p), { label: `eval:${p.key}`, phase: 'Evaluate', schema: EVAL_SCHEMA }).then(e => ({ p, e })),
  ({ p, e }) => {
    if (!e) return null
    return parallel([
      () => agent(`You are a NOTATION HISTORIAN for ${p.who}. Adversarially check every claim this evaluation makes about the persona's PRIOR notations and habits (familiar_shapes.prior_meaning, friction evidence about their field, contraption premises about their field). Be precise (e.g. linguistics * = ungrammatical, ? = marginal; CSS # = id selector; C ^ = xor). Default to flagging anything imprecise. Return JSON.\n\nEVALUATION:\n${JSON.stringify(e)}`,
        { label: `verify-notation:${p.key}`, phase: 'Verify', schema: VERIFY_SCHEMA }),
      () => agent(`${CANON}\n\nYou are the SPW CANON CHECKER. Adversarially check every claim this evaluation makes about SPW (spw_meaning fields, clustering constructs, tooling claims, theory statements) against canon and the understand reports; flag operator-name errors, valence misreadings (valence is charge-neutral material quality), claims that $% or ~#lens() are wired when they are not, and invented tooling. Re-run the syntax validator on every contraption sketch file under ${S}/persona/${p.key}/ (cd ${REPO} && node --import tsx scripts/analyzers/spw-syntax-validate.ts -- ${S}/persona/${p.key}) and report sketch_checks. Return JSON.\n\nEVALUATION:\n${JSON.stringify(e)}`,
        { label: `verify-canon:${p.key}`, phase: 'Verify', schema: VERIFY_SCHEMA }),
    ]).then(([notation, canon]) => ({ key: p.key, who: p.who, evaluation: e, notation, canon }))
  }
)
const done = results.filter(Boolean)
log(`evaluations verified: ${done.length}/${PERSONAS.length}`)

phase('Synthesize')
const synthesis = await agent(`${CANON}\n\nYou are the SYNTHESIZER of a persona-based design evaluation of Spw. Inputs: 12 persona evaluations with notation-historian and canon-checker corrections (apply every correction; drop anything refuted; keep only contraption sketches whose parses was confirmed). Produce JSON with:\n- familiarity_matrix: rows = Spw forms (sigils ~ # . & ^ $ = @ ? ! * % <> plus { } [ ] ( ) << >> .{ } #[ ] ^[ ] #> #: #! ~# ~#name() ~"path#anchor" =~ bias -> ~> =>), columns = personas; each cell {verdict: helpful_bridge|false_friend|neutral|mixed, prior: short}. Include a 'keyboard' note per sigil (ANSI position/shift reach).\n- false_friends_top: the 10 most consequential false friends across personas, with the mitigation (glossary entry, lint message, door text).\n- doors: per persona, an ordered entrance path through a reference tree (by surface kind), plus one shared 'first hour' path for everyone.\n- contraption_catalog: deduplicated, prioritized contraptions (name, personas served, what it explores, verified sketch, tooling status: exists | small_cli_addition | new_tool, wonder), 12-20 items.\n- tree_amendments: concrete additions/changes to the cut's tree so exploring the design of languages and materials is wonderful: e.g. a spw/perspectives/ branch (one surface per persona cluster), a contraptions/ branch (one surface per contraption with probe batteries), an operator glossary lattice with per-field analogs and stated limits, persona doors in the root index, cross-links between materials surfaces and operator/valence theory, how physics students and designers should find clusters. Each amendment: path, anchor suggestion, form, purpose, sources to draw on.\n- theory_questions: deduplicated, grouped (particles, operators, valence, linking, measures, lens, syntax profiles for C-habituated vs clustering-oriented readers), each with the personas who raise it.\n- metaphor_limits: consolidated per field.\nReturn JSON only.\n\nINPUTS:\n${JSON.stringify(done)}`,
  { label: 'synthesize', phase: 'Synthesize', schema: { type: 'object', properties: {
    familiarity_matrix: { type: 'array', items: { type: 'object' } }, false_friends_top: { type: 'array', items: { type: 'object' } },
    doors: { type: 'array', items: { type: 'object' } }, contraption_catalog: { type: 'array', items: { type: 'object' } },
    tree_amendments: { type: 'array', items: { type: 'object' } }, theory_questions: { type: 'array', items: { type: 'object' } },
    metaphor_limits: { type: 'array', items: { type: 'object' } } },
    required: ['familiarity_matrix', 'false_friends_top', 'doors', 'contraption_catalog', 'tree_amendments', 'theory_questions'] } })

return { synthesis, evaluations: done }
