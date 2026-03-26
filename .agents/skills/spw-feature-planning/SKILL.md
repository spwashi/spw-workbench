---
name: spw-feature-planning
description: >
  Plan a feature before writing any code. Predict files, draft commits,
  write a PLAN.md and wip.spw in .agents/plans/<slug>/. Use when starting
  a new agent task, refactor, or audit response.
---

# Skill: spw-feature-planning

## When to Use

Use this skill at the **start of any bounded agent task** before editing files.
It enforces the planning-before-coding discipline and produces artifacts
that make review, hand-off, and stakeholder communication tractable.

Triggers:
- User says "plan", "design", or "scope out" a feature
- Starting a `/worktree-task` workflow
- Responding to an audit finding with a refactor proposal
- Any task that will span more than one commit

---

## Instructions

### Step 1: Understand the task

Read any relevant files indicated by the user or by context (open documents, audit output).
Do **not** read the entire codebase — target only the files that are plausibly in scope.

**Deformation check**: Does this feature intersect any deformation axis (timing, disclosure, stability, affect, resolution, noise)? If so, read the axis primitives (e.g., `src/styles/timing/`, genre `.spw` ontologies) rather than hardcoding values. Note which axes constrain the design.

### Step 2: Name the feature

Choose a `<slug>`: lowercase, hyphenated, ≤5 words. This becomes the branch name.

Examples:
- `split-prism-view`
- `consolidate-design-tokens`
- `keyboard-manager-decompose`

### Step 2.5: Agentic hygiene baseline

Before creating plan artifacts, verify branch hygiene and rebase state.

- Record base reference SHA from `main` (or `origin/main`)
- Use `main@<sha>` only if that commit is actually on the current mainline
  history. If you are preserving an older lore-era or otherwise detached basis,
  label it explicitly as `historical@<sha>` or `historical-missing@<sha>`
  instead of pretending it is still `main`.
- Rebase before planning if the branch already exists:
  - `git fetch origin`
  - `git rebase origin/main`
- Detect unrelated drift:
  - `git diff --name-only origin/main...HEAD -- . ':(exclude).agents/plans/'`

If unrelated files are present, plan a dedicated hygiene split branch and note it
in PLAN.md `## Agentic Hygiene`.

### Step 3: Create wip.spw

Copy `.agents/plans/_schema/wip-template.spw` to `.agents/plans/<slug>/wip.spw`.

**Populate immediately:**
- `^["intent"]` — write `~#goal` and `~#taste` (which craft quality is being improved)
- `^["commits"]` — draft initial `~[N]: "sigil[scope] — description"` using project sigils
- `^["cache"]` — set `~#status: "planning"` (already in template)

**Populate during work:**
- `^["stream"]` — append `>>[timestamp] type — content` entries as you go
- `^["open"]` — add `?[label]: "question"` entries; remove when resolved
- `^["cache"]` — update `~#status`, `~#files_hot`, `~#next_commit` as state changes

**Populate at merge:**
- `^["done"]` — retrospective: shipped, dropped, surprised, duration, taste

See `.agents/plans/_schema/wip.spw` for the full convention and memory model.

### Step 4: Predict affected files

Walk the import graph from the entry point of the feature.
For each file, list whether it will be:
- `[NEW]` — created fresh
- `[MOD]` — modified (describe what changes)
- `[DEL]` — removed
- `[MOD?]` — uncertain

**Craft guard**: flag any file that would exceed 600 lines or 12 imports after changes.
Note files with multiple responsibilities (high concept count).

### Step 5: Draft the commit sequence

Refine the `^["commits"]` block in `wip.spw`. Then write a 1-line summary per commit
into PLAN.md's `## Commits`. The two stay in sync — `wip.spw` is the living source;
PLAN.md is the human-facing summary.

Use the project's commit sigil conventions from `/commit-review`:

| Sigil | Use for |
|---|---|
| `&[scope]` | Integrate, merge, restructure |
| `vocab[scope]` | Type / naming refactor |
| `![scope]` | Test / verify |
| `.[scope]` | Documentation / `.spw` updates |
| `^seed[scope]` | New seed or probe |
| `#[scope]` | New spec or config |
| `.[scope] — literature` | Pure readability improvement (naming, derivations, axis attribution) |

Each commit should pass the build and have a single concern.
Prefer dependency order: types → pure logic → components → wiring.

Add a short **fuzz strategy** in PLAN.md (or commit notes) mapping each stage:
- Explore loop: usually `fuzz:explore --target=<scope>`
- Stabilize loop: `fuzz:stabilize --target=<scope>`
- Ship gate: `fuzz:ship --target=<scope>`

### Step 6: Assess design taste

Every plan should **improve or preserve boutique quality**. Consult the
craft checklist at `.agents/skills/spw-craft-quality/references/craft-checklist.md`.

Check:
- **Naming clarity** — do new names reveal intent? Do they fit the existing vocabulary?
- **File size discipline** — target <400 lines; flag anything that would exceed 600
- **Import hygiene** — no file should import >12 distinct modules
- **Layer discipline** — imports flow inward only: infra ← platform ← app ← ui
- **Concept count** — each file should have one reason to change
- **Containment** — who owns width/height/scroll in affected components?
- **Data-structure clarity** — prefer clear data over clever control flow
- **Axis attribution** — can a reader identify which deformation axis shaped each constant?

**Literature quality checkpoint**: For each file predicted to change, ask: *Would a new contributor understand this file without external docs?* If not, the plan should include a naming/comment upgrade commit.

Log taste observations in the stream: `>>[timestamp] taste — <observation>`.
Record deferred concerns in cache: `~#taste_debt: "<description>"`.

### Step 7: Write the Spw artifact (if warranted)

A distilled `.spw` artifact (separate from `wip.spw`) is warranted when the feature:
- Introduces a novel abstraction or protocol
- Records a domain concept worth preserving
- Documents a design decision future engineers should understand

Store at `.agents/plans/<slug>/<slug>.spw`.
Reference `docs/design/spw/` and `docs/research/spw/` for idiom examples.

### Step 8: Write PLAN.md

Follow the schema at `.agents/plans/_schema/plan.md` exactly.
Include a **taste note** in `## Goal` — which design quality is being improved.
Include `## Agentic Hygiene` with rebase target, cadence, and hygiene split.
When a preserved basis is not on rewritten `main`, say so explicitly in prose;
do not label detached history as `main@...`.
Commit PLAN.md and `wip.spw` to the feature branch **before touching any source files**.

---

## Output Checklist

- [ ] `<slug>` chosen and documented
- [ ] `wip.spw` created with `^["intent"]` (goal + taste) and initial `^["commits"]`
- [ ] All predicted files listed with change type
- [ ] Craft guard checked (file size, imports, concept count)
- [ ] Commit sequence in `wip.spw` using project sigils, summarized in PLAN.md
- [ ] Design taste assessed; observations logged
- [ ] Fuzz strategy recorded (explore → stabilize → ship) with scoped targets
- [ ] Distilled `.spw` artifact written if warranted
- [ ] PLAN.md + `wip.spw` committed to feature branch before any code edits
- [ ] Agentic hygiene recorded (base SHA, rebase cadence, hygiene split)
- [ ] Dependencies noted (or `none`)

---

## Integration with Other Skills

| Situation | Also use |
|---|---|
| Plan touches types / branded unions | `spw-typescript-affordances` |
| Plan involves semantic model changes | `spw-semantics-rigor` |
| Plan is a UI refactor | `spw-ui-containment-audit` or `spw-css-dom-lab` |
| Plan involves naming / layering cleanup | `spw-craft-quality` |
| Ready to commit | `spw-commit-review` |
| Plan requires algorithmic design | `spw-math-algorithm-radar` |
