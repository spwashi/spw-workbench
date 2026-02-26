# Plan Schema

Every agent feature branch has two artifacts at `.agents/plans/<slug>/`:

- **PLAN.md** — pre-flight scope; filed before any code is written
- **wip.spw** — running development stream; updated throughout

See `_schema/wip.spw` for the wip.spw convention and memory model.

---

## Required Sections

### `# Plan: <slug>`

One-line description. Should match the branch name intent.

---

### `## Goal`

2–5 sentences. What is the desired end state? What quality bar or craft concern
does this address? Write for a curious stakeholder, not just the implementer.

Include a **taste note** — which design quality is being improved:
clarity, correctness, containment, performance, naming, layering, or expressiveness.

---

### `## Scope`

- **In scope**: ...
- **Out of scope**: ...

Be explicit about boundaries. Sustainable development means saying no to scope creep.

---

### `## Files`

Predicted files — `[NEW]`, `[MOD]`, `[DEL]`, or `[MOD?]` (uncertain).

```
[MOD] src/app/components/prism-view/prism-view.ts
[NEW] src/app/components/prism-view/prism-canvas.ts
[DEL] (none)
```

### Craft guard

Flag any file that would exceed 600 lines or 12 imports after changes.
Note concept-count concerns (file has multiple responsibilities).

---

### `## Commits`

High-level commit sequence — 1 line each. Use Spw sigil conventions:

```
1. &[prism-view] — extract prism-canvas sub-component
2. &[prism-view] — extract prism-controls sub-component
3. vocab[prism-view] — tighten types on extracted interfaces
```

The canonical running version lives in `wip.spw`.

---

### `## Agentic Hygiene`

Required for every feature branch plan.

Document:

- **Rebase target**: `main` (or `origin/main`) with recorded base SHA
- **Rebase cadence**: before commit 1 and before merge
- **Hygiene split**: whether unrelated branch drift exists and how it will be isolated

Example:

```
## Agentic Hygiene

- Rebase target: `origin/main@abc1234`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none
```

If unrelated files are present in `main...feature/<slug>` and are out of scope,
they must be moved into a dedicated hygiene branch or explicitly deferred.

---

### `## Dependencies`

Other feature branches or plan slugs that must be merged first.
Write `none` if standalone.

---

### `## Spw Artifact` *(optional)*

If this work warrants a distilled `.spw` commentary (novel abstraction, design
decision worth recording), describe it here. `wip.spw` is always present and is
**not** this artifact — it is a working stream. The optional artifact here is a
clean, distilled record intended to endure beyond the branch.

```
.agents/plans/<slug>/<slug>.spw
```

---

## Multi-agent Coordination

When two plans share files, the later-merged branch must note the conflict risk
under `## Dependencies`. The reviewing human resolves ordering at merge time.
