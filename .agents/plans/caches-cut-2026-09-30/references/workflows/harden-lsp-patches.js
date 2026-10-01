export const meta = {
  name: 'harden-lsp-patches',
  description: 'Address review findings on lens and fragnav patches in their worktrees, measure wire+cost, re-emit patches',
  phases: [
    { title: 'Harden', detail: 'one agent per worktree, disjoint files' },
    { title: 'Re-review', detail: 'independent reviewer per hardened patch' },
  ],
}
const M = '.'
const S = '<scratchpad>'
const COMMON = `You continue work inside an EXISTING git worktree (absolute path below) that already holds an uncommitted patch. Work ONLY inside that worktree directory (cd into it for every command; never edit files under ${M} directly, never touch other worktrees). Do NOT commit (Touch ID hook). Do NOT use git stash. When done: rewrite the patch with 'git -C <worktree> diff > ${S}/patches/<ID>-hardened.diff' (git add -N any new files first). Also measure COST and name the WIRE:
- WIRE: which LSP requests/handlers/client surfaces/CLI commands the change touches (method names, files).
- COST: (1) test-suite timing and counts before vs after, measured interleaved A/B in the SAME conditions: run the relevant vitest config in ${M} (unpatched main) and in the worktree back-to-back twice and report median seconds + pass/fail counts (main has 1 known failing test in form-context.test.ts and 8 known tsc errors in packages/spw-seed/src/grammar/expression-charge.test.ts — not yours); (2) runtime/index cost relevant to the change (e.g. ServerIndex entry counts and indexing time over the real workspace .spw + docs trees before vs after, or per-request timing on a sample document), measured with a small scratch script under ${S}/cost/; (3) code size delta per file (wc -l) and whether any touched file exceeds the 600-line craft guard.
Final answer: JSON-ish text with patch path, files changed, findings addressed (each with how), tests (commands + results), wire, cost (numbers), residual risks.`

const TASKS = [
  { id: 'lens', wt: `${M}/.claude/worktrees/wf_7b1587d2-205-1`, prompt: `ID=lens. Worktree: ${M}/.claude/worktrees/wf_7b1587d2-205-1. The reviewer's full report is in ${S}/fix-result-4.md and the implementer report in ${S}/fix-result-2.md — read both. Fold in ${S}/patches/lens-typefallout.diff (apply it in the worktree). Address findings: (2) apposition body reaches the Concepts tree: add body to extensions/vscode-spw/src/annotation-index.ts AnnotationEntry and copy it; render '~#lens(reading)' labels in concepts-tree renderEntryItem; (3) workspace-tree getSpiritNodes percentages must still sum to 100 with the apposition kind (merge like groupByPhase does); (4) readLens must only read the wonder's OWN body: fix parseWonderBlock braceDepth when the block closes on its header line, read an apposition on the header line itself, stop at a nested ?[ — add tests for all three; (5) keep apposition entries out of co-occurrence (display.ts ~:745) and resonance edges (spw-probes.ts ~:240) or render them via annotationLabel so they don't inflate '#lens' counts — add tests; (6) REMOVE the third apposition scanner: read APPOSITION tokens from the document's parse result (doc.parseResult.tokens or the seed lexer) and split with the seed's appositionParts; if display.ts would still exceed 600 lines, extract the wonder/apposition hover code into a new module packages/spw-lsp/src/handlers/wonder.ts (keep display.ts at or below its original 1461 lines or smaller); (7) skip empty readings; (8) escape backticks in hover readings (use a fence-safe rendering); (9) make paren modifiers consistent or document why. Run: npx vitest --config vitest.lsp.config.ts run ; npx vitest --config vitest.vscode.config.ts run ; (cd extensions/vscode-spw && npx tsc --noEmit) ; npm run build (expect only the 8 pre-existing errors).` },
  { id: 'fragnav', wt: `${M}/.claude/worktrees/wf_7b1587d2-205-2`, prompt: `ID=fragnav. Worktree: ${M}/.claude/worktrees/wf_7b1587d2-205-2. Read the implementer report ${S}/fix-result-0.md and review ${S}/fix-result-1.md. Address the nit: the references handler (packages/spw-lsp/src/handlers/navigation.ts ~:191 and ~:221) still uses stripAnchor(resolved); switch to the same exact-suffix fileOf(...) so directories containing '#' don't collapse candidates; add a test. Check the other same-bug-class follow-up the reviewer names and fix it if it is in navigation.ts; otherwise list it. Run: npx vitest --config vitest.lsp.config.ts run ; npm run build (expect only the 8 pre-existing errors).` },
]

phase('Harden')
const out = await pipeline(TASKS,
  t => agent(`${COMMON}\n\n${t.prompt}`, { label: `harden:${t.id}`, phase: 'Harden' }).then(r => ({ id: t.id, wt: t.wt, report: r })),
  r => agent(`Independent reviewer (read-only on ${M} and on the worktree ${r.wt}; you may run tests inside the worktree). Review ${S}/patches/${r.id}-hardened.diff: correctness, regressions, whether each claimed finding is really addressed (probe it), test adequacy, craft (file sizes <= 600 new growth, no duplicate scanners), and whether the cost numbers are plausible (re-run one timing pair). Verdict approve|approve-with-nits|reject with file:line findings.\n\nIMPLEMENTER REPORT:\n${r.report}`,
    { label: `rereview:${r.id}`, phase: 'Re-review' }).then(v => ({ ...r, review: v }))
)
return out.filter(Boolean)
