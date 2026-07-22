# Learning path

Assume you are at the **workbench repo root** (or a consumer with `.spw/_workbench`).  
Prefix CLI with `npm run spw --` when the binary is not on `PATH`.

---

## 15 minutes

**Goal:** see Spw as surfaces + refs, not as a mystery dialect.

1. Open `docs/examples/spw/spirit-cycle.spw` (six-phase spirit walk on a toy value).
2. Open `docs/lang/md/few-shot.spw.md` (tiny syntax cards).
3. Run:

```bash
npm run spw -- help
npm run spw -- skim docs/examples/spw/spirit-cycle.spw
npm run spw -- select docs/examples/spw/spirit-cycle.spw --skim --selector navigable -n 20
```

4. In an editor with the Spw extension (or Neovim `neovim-spw`): open the same file, press hover on a sigil (`&`, `~`, `^`).

**Checkpoint:** you can skim a file and name one operator by role (action `!`, wonder `?`, confluence `&`, …).

---

## 1 hour

**Goal:** learn a *tree* with the sense loop; touch form sequences without writing.

```bash
# Inventory warmth
npm run spw -- invent docs/examples --sort degree -n 20

# Relationship graph
npm run spw -- map docs/examples --hubs 8

# Formulas / patterns
npm run spw -- formula docs/theory/spw --family field --top 10

# Multi-selector stats
npm run spw -- analyze docs/examples --quiet

# Form algebra (notation only — not file mutation)
# Prefer: VS Code "Spw: Explain Form Sequence" or Neovim :SpwFormSeq
# CLI form command may land separately; notation is documented below.
```

Form sequence to read aloud (confluence wrap → label → membrane):

```text
&  =>  {&}  =>  {&[#label]}  =>  {&<#tag>_label}
```

Reduce (conceptual reverse):

```text
{&<#tag>_label}  =>  {&[#label]}  =>  {&}  =>  &
```

Dry measure a theory surface (no write):

```bash
npm run spw -- pulse docs/theory/spw/form-ladders.spw --check
```

**Checkpoint:** you can say what a *hub* is, what `effect.l0.measure` means, and that expand ≠ mutate.

Worked transcript: [worked-cli.md](worked-cli.md).

---

## 1 day

**Goal:** one reversible contribution (docs or probe) with hygiene.

### Morning — map + theory

1. [sense-loop](../runtime/md/sense-loop.md) + [relationship-topography](../theory/spw/relationship-topography.spw)
2. [form-ladders](../theory/spw/form-ladders.spw) + example [form-sequence.spw](../examples/spw/form-sequence.spw)
3. [math-modeling](../theory/spw/math-modeling.spw) + `npm run spw -- formula --catalog`

### Afternoon — tools + edit

4. Editors: [lsp-editor-integration](../runtime/md/lsp-editor-integration.md)  
   - VS Code: Operator Frequency, Insert Form Sequence  
   - Neovim: `:SpwOperatorFreq`, `:SpwFormSeq`, comment with `#`
5. Memory: [runtime-memory](../runtime/md/runtime-memory.md) — `npm run spw -- mem status`
6. Templates: [template-holes.spw](../examples/spw/template-holes.spw) +  
   `npm run spw -- emit holes docs/examples/spw/template-holes.spw`

### Evening — change + verify

7. Branch or worktree; plan under `.agents/plans/` if multi-commit  
8. Prefer docs/examples first; run:

```bash
npm run test:seed   # or scoped tests for your area
npm run spw -- invent docs/examples --role hub -n 5
```

**Checkpoint:** one PR-sized artifact (example, doc fix, or probe) with a named falsifier.

---

## Personas (optional branch)

| Persona | After 1 hour, prefer… |
|---------|------------------------|
| Hobby | [examples](../examples/), emit expand, form snippets |
| Engineer | packages/spw-seed + CLI sense loop + mutation dry |
| Researcher | theory/*.spw + math catalog + field dynamics |
| Agent | [agent-brief.md](agent-brief.md) only until asked to expand |

Contributor depth: [contributing](../contributing/README.md).
