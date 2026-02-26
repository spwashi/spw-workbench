# Semantics Rigor Method

Use this to translate “metaphor” into something checkable.

## 1) Define Terms

- Provide a crisp definition.
- Provide at least one counterexample.
- Specify the scope and what is intentionally excluded.

## 2) Map to Code

- Identify where the concept lives (types, parser rules, runtime behavior, UI).
- Identify the smallest observable trace of the concept (events, spans, values).

## 3) State Invariants

- Write 1–3 invariants as “must always hold” statements.
- Make them testable (unit tests, property tests, lint rules, runtime assertions).

## 4) Add Enforcement

- Prefer tests for stable invariants.
- Prefer instrumentation for exploratory or performance-sensitive invariants.
- Keep enforcement local and cheap.

## 5) Document How to Falsify

- Describe what evidence would disprove the claim.
- List the exact probes/commands to collect that evidence.
