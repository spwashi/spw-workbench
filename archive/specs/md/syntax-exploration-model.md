# Syntax Exploration Model: The Sandbox Strategy

This document outlines how to balance **creative language exploration** with **architectural rigor** in the Spw Workbench.

## 1. The Doc Tree Topology

To keep the formal spec (`/lib/spw-v0.1.0-alpha`) clean while allowing for radical experimentation, the documentation tree should follow this "Gradient of Rigor":

| Tier | Directory | Focus | Rigor |
|------|-----------|-------|-------|
| **Core** | `/lib/spw-v0.1.0-alpha/` | Finalized Spec, Deterministic Contracts | High (Saturated) |
| **Blueprint**| `/src/lang/` | Implementation logic, Stable Grammar | High (Saturated) |
| **Labs** | `/lab/syntax/` | Speculative Sigils, Experimental Modifiers | Low (Probing) |
| **Playground**| `/examples/explorations/` | `.spw` scripts testing "vibe" and "syntax-feel" | None (Creative) |

## 2. Recommendation: The "Labs" Domain

Introduce a `/lab` root directory. This is where "resonant" ideas live before they are "saturated" into the core.

### 2.1 Proposed structure for `/lab`
- `/lab/syntax/[experiment-name].md`: Narrative description of the intent (e.g., "The BOONHONK modifier for ultra-saturated state shifts").
- `/lab/syntax/[experiment-name].spw`: Visual/code examples showing the syntax in use.
- `/lab/syntax/AUDIT-LOG.md`: A running log of results from syntax audits (resonance vs. confusion).

## 3. Creative Syntax Exploration vs. Formal Implementation

When implementing a "Creative Enhancement":

1.  **Draft in Playground**: Create a `.spw` file in `/examples/explorations/`. Focus on the *aesthetic* and *semantic feel* of the code.
2.  **Saturation Mapping**: Use the `OPERATIONAL-PHYSICS.md` model to map the new syntax to saturation levels:
    - What does it mean at **0.0 (Probing)**? (e.g., a "naked" operator)
    - What happens at **0.5 (Resonant)**? (e.g., partial bindings)
    - How does it resolve at **1.0 (Saturated)**? (e.g., absolute determinism)
3.  **Cross-Domain Testing**:
    - **Visual**: Does the syntax look distinct in the 9-operator color wheel?
    - **Audio**: Does the syntax generate a unique "auditory fingerprint" when analyzed?
    - **Logic**: Is it parseable without breaking the `Capsule` vs `Couple` disambiguation?

## 4. Operational "Fast-Path" for Claude

To enable "targeted enhancements" during exploration:
- **Skip the spec update initially**: Implement the lexer/parser changes in a `lab/` branch or feature flag.
- **Visual-First Verification**: Use the `Flow Inspector` to verify that the new syntax creates the correct nodes before worrying about the 1000-pass determinism test.
- **"Vibe Checks"**: Document the *emotional response* to syntax. Spw is a "Poetic" workbench; if a syntax feels "mechanistic" when it should be "fluid," it fails the audit regardless of parsing success.
