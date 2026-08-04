/**
 * Experimental / plan-syntax catalog — greppable reference ids.
 *
 * These make plan-surface syntax (σ-chain, dialects, =exp, …) **referenceable**
 * by tests, LSP hover, and CLI without implying full runtime execution.
 *
 * runtimeHook:
 *   none  — documentation / plan only
 *   lint  — may produce warnings or diagnostics
 *   lower — may compile toward MutationRule / SemanticEdit later
 *   parse — observed by parse()/scan today
 */

export type ExpRuntimeHook = 'none' | 'lint' | 'lower' | 'parse'

export type ExpStatus = 'proposed' | 'partial' | 'implemented'

export interface SyntaxCatalogEntry {
  id: string
  status: ExpStatus
  /** Optional dialect product surface */
  dialect?: string
  /** docs or plan path (repo-relative) */
  docs: string
  runtimeHook: ExpRuntimeHook
  /** One-line description for hover / spw exp show */
  summary: string
}

/** Canonical catalog — keep ids stable; plans may cite with =exp[ id: … ]. */
export const SYNTAX_CATALOG: readonly SyntaxCatalogEntry[] = [
  {
    id: 'dialect.stack',
    status: 'partial',
    docs: 'packages/spw-seed/src/dialect/syntax-stack.ts',
    runtimeHook: 'parse',
    summary: 'Multi-axis SurfaceProfileStack (dialect × review × format × …)',
  },
  {
    id: 'dialect.detect',
    status: 'implemented',
    docs: 'packages/spw-seed/src/dialect/detect.ts',
    runtimeHook: 'parse',
    summary: 'Header/pragma/path dialect detection for Spw.b/l/m/x/q/f/p/t',
  },
  {
    id: 'dialect.preprocess.newline',
    status: 'implemented',
    dialect: 'Spw.l',
    docs: 'packages/spw-seed/src/dialect/detect.ts',
    runtimeHook: 'parse',
    summary: 'Newline-as-space preprocess for Spw.l / Spw.q',
  },
  {
    id: 'dialect.machine_lint',
    status: 'partial',
    dialect: 'Spw.m',
    docs: 'packages/spw-seed/src/dialect/syntax-stack.ts',
    runtimeHook: 'lint',
    summary: 'Soft warnings for quoted frames / @domain on machine dialect',
  },
  {
    id: 'flow.sigma_chain',
    status: 'proposed',
    dialect: 'Spw.f',
    docs: 'docs/theory/spw/mutation-flow-automata.spw',
    runtimeHook: 'lower',
    summary: 'Intermediate σ pipeline << ~ ; ? ; % ; ! ; * ; ^ >>',
  },
  {
    id: 'flow.phi',
    status: 'proposed',
    dialect: 'Spw.f',
    docs: 'docs/theory/spw/mutation-flow-automata.spw',
    runtimeHook: 'lower',
    summary: 'Mutation profile φ as cellular rule table',
  },
  {
    id: 'flow.cell',
    status: 'proposed',
    dialect: 'Spw.f',
    docs: 'docs/theory/spw/mutation-flow-automata.spw',
    runtimeHook: 'none',
    summary: 'CA cell (locus, σ, ∂) and neighborhood N(c)',
  },
  {
    id: 'flow.schedule_par',
    status: 'proposed',
    dialect: 'Spw.f',
    docs: 'docs/theory/spw/mutation-flow-automata.spw',
    runtimeHook: 'lower',
    summary: 'Parallel schedule || vs sequential ; in pulse pipelines',
  },
  {
    id: 'refactor.plan_v1',
    status: 'proposed',
    docs: '.agents/plans/refactor-experiment-lifecycle/PLAN.md',
    runtimeHook: 'lower',
    summary: 'spw.refactor.plan/1 select→plan→check→apply lifecycle',
  },
  {
    id: 'refactor.worktree_l1',
    status: 'proposed',
    docs: '.agents/plans/refactor-experiment-lifecycle/PLAN.md',
    runtimeHook: 'none',
    summary: 'Multi-file apply in git worktree (effect.l1.worktree)',
  },
  {
    id: 'measure.eval_scheme',
    status: 'partial',
    docs: 'packages/spw-seed/src/canonical/measure-protocol.ts',
    runtimeHook: 'lower',
    summary: 'EvalScheme exact|band|tol|ratio|profile|prior — general measure, not mass-only',
  },
  {
    id: 'measure.context_kernel',
    status: 'partial',
    docs: '.spw/registries/measure-context.spw',
    runtimeHook: 'parse',
    summary: 'Spw-defined families/algorithms; %mass is thrift specialization of measure kernel',
  },
  {
    id: 'measure.attention_scope_walk',
    status: 'proposed',
    docs: 'docs/theory/spw/measure-context-kernel.spw',
    runtimeHook: 'none',
    summary: 'Algorithm: process SelectionIR across perceptive planes into MeasureIR',
  },
  {
    id: 'measure.lsp_diag',
    status: 'proposed',
    docs: '.agents/plans/measure-invariant-generalization/PLAN.md',
    runtimeHook: 'lint',
    summary: 'LSP diagnostics for mass/authority drift',
  },
  {
    id: 'form.material_packet',
    status: 'partial',
    docs: '.agents/plans/form-geometry-editor/PLAN.md',
    runtimeHook: 'lint',
    summary: 'Brace coupling occupancy/payload hover packet',
  },
  {
    id: 'form.formContext',
    status: 'proposed',
    docs: '.agents/plans/form-geometry-editor/PLAN.md',
    runtimeHook: 'lower',
    summary: 'spw/formContext revision-addressed geometry probe',
  },
  {
    id: 'curiosity.visit_set',
    status: 'proposed',
    dialect: 'Spw.f',
    docs: '.agents/plans/curiosity-mutation-ergonomics/PLAN.md',
    runtimeHook: 'none',
    summary: 'Combinator cell visit/invite/stabilize memory',
  },
  {
    id: 'lsp.stack_hover',
    status: 'partial',
    docs: '.agents/plans/shape-syntax-ecology/PLAN.md',
    runtimeHook: 'lint',
    summary: 'Hover shows dialect stack + experimental refs',
  },
  {
    id: 'cli.profile_show',
    status: 'proposed',
    docs: '.agents/plans/syntax-profile-stack/PLAN.md',
    runtimeHook: 'none',
    summary: 'spw profile --show <file> stack dump',
  },
  {
    id: 'editor.gestalt_tokens',
    status: 'partial',
    docs: '.agents/plans/vscode-cognitive-surface/PLAN.md',
    runtimeHook: 'parse',
    summary: 'Semantic tokens emphasize operator/brace gestalt for shape literacy',
  },
  {
    id: 'cognitive.dual_read_policy',
    status: 'proposed',
    docs: '.agents/plans/vscode-cognitive-surface/PLAN.md',
    runtimeHook: 'lint',
    summary: 'Screenshot/LLM play requires AST dual-read before edit trust',
  },
  {
    id: 'brace.capture_vs_shield',
    status: 'proposed',
    docs: 'docs/theory/spw/brace-charge-crawl.spw',
    runtimeHook: 'none',
    summary: 'Paired bounds as capture (charge in) vs shield (channel/membrane wall)',
  },
  {
    id: 'charge.portable_triple',
    status: 'partial',
    docs: 'docs/theory/spw/brace-charge-crawl.spw',
    runtimeHook: 'none',
    summary: 'Portable charge carriers: value · subject · substrate + provenance',
  },
  {
    id: 'crawl.verb_set',
    status: 'partial',
    docs: 'docs/theory/spw/brace-charge-crawl.spw',
    runtimeHook: 'none',
    summary: 'Crawl verbs: potentiate accumulate distribute confluence collate discharge',
  },
  {
    id: 'channel.stability',
    status: 'partial',
    docs: 'packages/spw-runtime/src/session/channels.ts',
    runtimeHook: 'none',
    summary: 'Stability channels orthogonal to dialect; cache key includes channel',
  },
  {
    id: 'fixity.prefix_postfix_dual',
    status: 'partial',
    docs: 'docs/theory/spw/fixity-brace-phrases.spw',
    runtimeHook: 'parse',
    summary: 'Act fixity dual: prefix (primary) vs postfix (L→R); ONF frames.fixity',
  },
  {
    id: 'phrase.brace_family',
    status: 'proposed',
    docs: 'docs/theory/spw/fixity-brace-phrases.spw',
    runtimeHook: 'lint',
    summary: 'Named brace phrases (Act×Bound silhouettes) as emergent grammar units',
  },
  {
    id: 'phrase.opt_cache',
    status: 'proposed',
    dialect: 'Spw.x',
    docs: 'docs/theory/spw/fixity-brace-phrases.spw',
    runtimeHook: 'lower',
    summary: 'Phrase rewrite optimization under fixity laws + OptCacheIR key',
  },
  {
    id: 'regional.ocean_o',
    status: 'proposed',
    dialect: 'Spw.o',
    docs: '.spw/biome/ocean/experiments/syntax.spw',
    runtimeHook: 'none',
    summary: 'Ocean regional dense dialect Spw.o — channel=ocean|experimental only',
  },
  {
    id: 'flow.protocol_module',
    status: 'partial',
    docs: 'packages/spw-seed/src/canonical/flow-protocol.ts',
    runtimeHook: 'parse',
    summary: 'Sigil×brace×adjacency roles: flow/routine/strategy/procedure/bias/probe',
  },
  {
    id: 'resonance.geometric',
    status: 'partial',
    docs: 'packages/spw-seed/src/canonical/geometric-resonance.ts',
    runtimeHook: 'parse',
    summary: 'Form-geometry and schedule adjacency resonances (not only substrate events)',
  },
  {
    id: 'probe.measure_substrate',
    status: 'partial',
    docs: 'packages/spw-runtime/src/session/probe-measure.ts',
    runtimeHook: 'none',
    summary: 'Wonder/probe/metric census + substrate write vibration',
  },
] as const

const BY_ID = new Map(SYNTAX_CATALOG.map(e => [e.id, e]))

export function getSyntaxCatalogEntry(id: string): SyntaxCatalogEntry | undefined {
  return BY_ID.get(id)
}

export function listSyntaxCatalog(filter?: {
  status?: ExpStatus
  dialect?: string
  runtimeHook?: ExpRuntimeHook
}): SyntaxCatalogEntry[] {
  return SYNTAX_CATALOG.filter(e => {
    if (filter?.status && e.status !== filter.status) return false
    if (filter?.dialect && e.dialect !== filter.dialect) return false
    if (filter?.runtimeHook && e.runtimeHook !== filter.runtimeHook) return false
    return true
  })
}

/** Format a catalog entry as markdown for hover. */
export function formatCatalogEntryMarkdown(entry: SyntaxCatalogEntry): string {
  const lines = [
    `**\`${entry.id}\`** — *${entry.status}* · hook=\`${entry.runtimeHook}\``,
    '',
    entry.summary,
    '',
    `docs: \`${entry.docs}\``,
  ]
  if (entry.dialect) lines.push(`dialect: \`${entry.dialect}\``)
  if (entry.runtimeHook === 'none' || entry.status === 'proposed') {
    lines.push('', '_Reference only — not executed as runtime law._')
  }
  return lines.join('\n')
}
