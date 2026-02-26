# Claims

A claim is a sentence the system is willing to be judged by.

In this repo, claims are treated as engineering artifacts:
- They name **invariants**.
- They name **interfaces**.
- They name **verification** (even if the verification is "manual for now").

## Claim types

- **Semantic**: what an operator means; what normalization guarantees.
- **Structural**: layer boundaries; portability of the kernel.
- **Behavioral**: what the runtime does under specific inputs.
- **Aesthetic**: taste constraints that are enforced as contracts or audits.

## Where claims live

- Commit bodies: `#[episode]{ ... ![change]{... invariant: "..." } ... }`
- Spec library: `lib/spw-v0.2.0-alpha/` (and `DELTAS.md`)
- Canon docs: `docs/specs/` and `docs/waypoints/`

## How to add a claim

1. Write the claim in plain language.
2. Attach it to a specific surface (spec, exhibit, instrument, or episode).
3. Add a verification step (lint, test, script, or a documented manual protocol).
