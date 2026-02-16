# Architecture Strategy: Research-Oriented Craft Development

## The Core Question

**"How do we build software that is simultaneously optimized for human understanding, machine reasoning (AI), and rigorous architectural constraints?"**

This document describes the strategic philosophy behind the hud-dashboard architecture and the implicit architectural questions it answers. It's designed for:
- **Architects** planning feature additions and refactors
- **Teams** considering similar multi-dimensional optimization approaches
- **Newcomers** understanding why architectural decisions were made

---

## I. Three-Dimensional Optimization

Most codebases optimize along one or two dimensions. This codebase treats three as first-class concerns:

1. **Human Understanding** - 12-domain layered architecture with explicit dependency graph
2. **Machine Reasoning** - Token efficiency metrics, barrel exports <30 lines, AI-SUMMARY blocks
3. **Architectural Constraints** - Enforced layer boundaries via ESLint, custom @spw: markers

The synthesis creates **"research-oriented craft development"**: treating code quality as measurable data while maintaining boutique-level attention to architectural intent.

---

## II. Five Unique Characteristics

### A. Constraints as Clarity

The 12-domain layered architecture (core:0 → platform:11) with explicit import ordering creates a dependency graph that is both restrictive and liberating. Layer violations are blocked at lint time, not discovered in code review.

**Strategic Value**: Constraints eliminate architectural ambiguity. When a developer knows `lang/` cannot import from `app/`, the question "where does this live?" has a deterministic answer. This reduces team coordination overhead at scale.

**Key Question Answered**: "How do we encode architectural intent so it survives team turnover and time?"

### B. Three-Layer Phasor Model

The same Spw source can be interpreted through three orthogonal lenses at 120° phase angles:
- **Phase 0° (Syntactic)**: Structure and form
- **Phase 120° (Semantic)**: Meaning and relationships
- **Phase 240° (Pragmatic)**: Effects and execution

**Strategic Value**: Different teams need different views of the same system. The phasor model provides a formal framework for multi-perspective reasoning without multiplying source artifacts.

**Key Question Answered**: "How do we represent complex systems without creating multiple source-of-truth problems?"

### C. Token Efficiency as Research Discipline

`TOKEN-EFFICIENCY.md` documents baseline metrics (38,380 TS lines, 60 barrel exports), tracks changes, and treats AI context windows as a design constraint—analogous to memory budgets in embedded systems or latency budgets in real-time systems.

**Strategic Value**: As AI-assisted development becomes standard, codebases optimized for AI context loading will have compounding advantages. Files >500 lines become "token hotspots" that fragment reasoning.

**Key Question Answered**: "How do we design code for both human and AI comprehension without compromising either?"

### D. lib/spw Isolation (Portability-by-Design)

`src/lib/spw/` cannot import from `@/` paths. It's a portable parser core designed for isolation from the start, wrapped by `src/lang/` domain integration.

**Strategic Value**: When multiple teams need shared core logic, designing for portability from day one prevents the "big ball of mud" that emerges from trying to extract tightly coupled code later.

**Key Question Answered**: "How do we prevent feature creep from contaminating core abstractions?"

### E. Custom ESLint Rules as Architectural Documentation

`scripts/eslint-plugin-spw/` contains 9 custom rules that encode architectural intent at the file level:
- `@spw:portable` - Must not import from `@/`
- `@spw:bonk` - Temporary hack requiring justification
- `@spw:debt` - Technical debt with explicit reasons
- `@spw:split` - Files exceeding size thresholds

**Strategic Value**: Technical debt is explicit and searchable, not hidden in comments. Breaking architectural decisions is a lint violation, not a code review comment.

**Key Question Answered**: "How do we make architectural decisions auditable and enforceable?"

---

## III. Phase 2 Methodology: Foundation Before Application

Phase 2 (token efficiency optimizations) demonstrated a proven refactoring methodology:

1. **Design abstraction first** - Create `DomainEvent<Type, Data>` in isolation
2. **Validate theoretically** - Verify with type-level tests
3. **Apply incrementally** - Migrate 7 systems with checkpoints
4. **Checkpoint after 30%** - MVP validation before full commitment
5. **Document trade-offs** - Breaking changes explain alternatives considered

**Enterprise Translation**: When planning multi-week refactors, invest in designing shared abstractions before applying them. The upfront cost pays dividends in reduced rework.

---

## IV. 12 Architectural Tensions

These fundamental trade-offs become more acute as the codebase scales:

| Tension | Resolution | Scaling Question |
|---------|-----------|------------------|
| **Portable vs Integrated** | Explicit boundary at `src/lang/` | Will feature pressure erode isolation? |
| **Token Efficiency vs Completeness** | Move detail to `docs/README.md` | Will docs diverge from code at 100k+ lines? |
| **Type Safety vs Flexibility** | Tagged unions with discriminators | Will type narrowing become unwieldy? |
| **Boundaries vs Velocity** | `@spw:bonk` markers for temp violations | Will bonk markers accumulate faster than resolution? |
| **Foundation vs Pragmatism** | Build when 3+ use cases identified | How prevent premature vs insufficient abstraction? |
| **Research vs Production** | Measurement = quality; automate scripts | Will discipline survive deadline pressure? |
| **Explicit vs Implicit** | Document via AI-SUMMARY blocks | How keep docs synchronized? |
| **Dimensional vs Hierarchical** | Domain isolation ignores unused dimensions | Can newcomers grasp phasor thinking? |
| **Incremental vs Revolutionary** | Small commits enable surgical rollbacks | Will granularity slow or improve reviews? |
| **Quality as Data vs Binary** | `Qualified<T>` with boon/bane context | How integrate quality types into CI/CD? |
| **Custom Tooling vs Standard** | Rules are 50-100 lines, rarely change | Will custom tooling become a bottleneck? |
| **Single vs Monorepo** | ESLint enforces boundaries in single repo | At what scale does monorepo become unwieldy? |

---

## V. Five Strategic Questions This Codebase Answers

1. **How do we prevent circular dependencies at scale?**
   → Explicit layer ordering with enforced import restrictions

2. **How do we onboard complex architectures?**
   → AI-SUMMARY blocks, CLAUDE.md context loading, barrel exports

3. **How do we maintain architectural intent over time?**
   → Custom ESLint rules encode decisions in tooling, not docs

4. **How do we balance research rigor with feature velocity?**
   → Treat quality as measurable data (token metrics, fuzz profiles)

5. **How do we design for AI-assisted development?**
   → Token efficiency as first-class constraint, slim barrel exports

---

## VI. Strategic Recommendations

### A. Expand Measurement Infrastructure
Track beyond tokens:
- **Onboarding velocity** - Time for new contributors to understand a domain
- **Refactor safety** - Breaking changes per lines modified
- **Documentation drift** - Divergence between AI-SUMMARY blocks and exports

### B. Create Architectural Decision Records
Formalize implicit decisions in `docs/adr/`:
- `001-twelve-domain-architecture.md`
- `002-lib-spw-isolation.md`
- `003-token-efficiency-as-constraint.md`
- `004-three-layer-phasor-model.md`

### C. Document Integration Testing Strategy
Answer in `docs/testing-strategy.md`:
- Which cross-domain interactions are tested?
- How are layer boundary violations tested?
- What manual smoke tests are required after refactors?

### D. Create Newcomer Guide
In `docs/newcomer-guide.md`:
- 30-minute orientation of 12 domains
- Step-by-step first contribution walkthrough
- Common pitfalls (layer violations, token hotspots, breaking changes)

### E. Plan Phase 3 Using Phase 2 Methodology
Config migrations (200-300 line reduction) using foundation-before-application approach:
1. Foundation validation (isolation)
2. MVP checkpoint (3-5 configs)
3. Full migration (remaining configs)
4. Measurement verification

---

## VII. Enterprise Translation

For teams considering similar approaches:

**1. Start with Layer Enforcement**
- Define explicit domain boundaries
- Encode in ESLint rules
- Measure violations over time

**2. Treat AI Assistants as Stakeholders**
- Measure token counts (files >600 lines are hotspots)
- Keep barrel exports <30 lines
- Add AI-SUMMARY blocks to key files

**3. Make Architectural Intent Explicit**
- Use custom ESLint markers (@spw:portable, @spw:bonk, @spw:debt)
- Document decisions in ADRs, not just commit messages
- Test docs match reality via AI assistant effectiveness

**4. Measure What Matters**
- Token efficiency (AI context optimization)
- Onboarding velocity (contributor productivity)
- Refactor safety (breaking changes per lines modified)

**5. Design Foundations Before Applications**
- Create shared abstractions before applying
- Validate with checkpoints (MVP after 3-5 use cases)
- Document trade-offs explicitly

---

## VIII. What Makes This Strategically Interesting

Most codebases align with one orientation:
- **Boutique/Craft** - High attention, bespoke solutions, limited reusability
- **Research** - Experimental approaches, heavy documentation, unclear productionization
- **Enterprise** - Pragmatic compromises, velocity over perfection, technical debt accumulation

This codebase synthesizes all three:
- **Craft**: Custom ESLint rules, dimensional taxonomies, phasor model
- **Research**: Token efficiency metrics, quality as data, measurement infrastructure
- **Enterprise**: Enforced layer boundaries, barrel exports, clear dependency graph

**The core insight**: These three orientations are not mutually exclusive when architectural constraints are treated as clarity enablers rather than restrictions.

**The core question answered**: "Can we build systems that are simultaneously rigorous, measurable, and humane?"

**The answer this codebase demonstrates**: Yes, by encoding intent in tooling, treating quality as data, and designing for both human and AI comprehension.

---

## IX. References

- **Architecture**: `CLAUDE.md` - 12-domain dependency graph and context loading strategy
- **Boonhonk Audit**: `BOONHONK-AUDIT.md` - CSS/JS semantics, naming, and responsiveness audit
- **Keyboard Audit**: `KEYBOARD-AUDIT.md` - Intent layers, regions, shortcut tree, and reactivity coupling
- **Token Efficiency**: `TOKEN-EFFICIENCY.md` - Baseline metrics, optimization phases, measurement scripts
- **Layer Boundaries**: `.eslintrc.json` - Enforced import rules per domain
- **Custom Rules**: `scripts/eslint-plugin-spw/` - Architectural documentation via lint
- **Configuration Types**: `src/core/types/config.ts` - Reusable base patterns
- **Event Pattern**: `src/core/events.ts` - Shared `DomainEvent<Type, Data>` base

---

## X. Questions for Future Development

**Architectural Resilience**:
1. Does this discipline scale to 10+ developers? (hypothesis: yes, constraints reduce coordination)
2. Will token efficiency survive deadline pressure? (hypothesis: yes, measurement is automated)
3. Will bonk markers accumulate faster than resolution? (risk to monitor quarterly)

**Conceptual Clarity**:
4. Can newcomers grasp phasor model thinking? (needs explicit training materials)
5. Will custom tooling become a bottleneck? (rule count and complexity tracking needed)

**Practical Validation**:
6. Measure time-to-first-PR for new contributors (onboarding effectiveness)
7. Track doc-code divergence quarterly (token efficiency sustainability)
8. Monitor breaking changes per refactor (refactor safety metric)

Use these questions to guide future architectural decisions. The goal is to maintain the synthesis of craft, research, and enterprise orientations as the codebase scales.
