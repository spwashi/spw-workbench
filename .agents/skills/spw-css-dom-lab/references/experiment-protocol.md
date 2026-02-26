# CSS + DOM Experiment Protocol

Use this to keep UI experiments small, reversible, and evidence-driven.

## 1) Hypothesis

- Write one sentence: “If we change X, users will experience Y because Z.”

## 2) Switch

- Gate the experiment behind a single explicit switch:
  - `data-experiment="name"` on a high-level container, or
  - a query param, or
  - a feature flag in state.
- Ensure the default path is unchanged.

## 3) Probe (Minimal Implementation)

- Prefer the smallest possible change:
  - a single CSS rule,
  - a small DOM attribute toggle,
  - a tiny event hook.
- Avoid multi-file refactors until the hypothesis is validated.

## 4) Instrumentation

- Define one primary metric and one negative control.
- Record just enough data to decide (timings, counts, visible state changes).
- Keep logs cheap and removable.

## 5) Decision + Rollback

- Define exit criteria before running:
  - “Keep” if metric improves and control stays stable.
  - “Revert” if regressions or ambiguity.
- Prefer reverting code over keeping flags around.

## 6) Note

- Write a short note (question → method → results → interpretation → next steps).
