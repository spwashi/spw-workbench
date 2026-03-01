# Goals: Runtime Execution Modes

Version: 0.1.0-prealpha
Status: Specified

---

## Overview

Goals are first-class runtime modes that determine execution behavior. A goal selects defaults for Posture (behavior) and extraction strata targets without changing surface syntax semantics.

**Principle:** "Goals before features: explain/index/execute/onboard/audit are first-class."

---

## Goal Tokens

| Goal | Purpose | Optimizes For |
|------|---------|---------------|
| `explain` | Produce intelligible account | Understanding |
| `index` | Build searchable structure | Discovery |
| `execute` | Run or simulate | Correctness |
| `onboard` | Teach and introduce | Ergonomics |
| `audit` | Verify provenance | Trust |

---

## Goal Semantics

### explain

Produce an intelligible account optimized for understanding.

```spw
<c[goal:explain]>{
  ~{parse}
  ~{annotate reasoning}
  ~{emit narrative}
}
```

**Default Posture:** TeachingGentle
**Output Form:** Narrative, annotated structures, rationale
**Use When:** Documentation, debugging, learning

### index

Build or update searchable structure with strata awareness.

```spw
<c[goal:index strata:node]>{
  ~{prime}
  ~{extract indices}
  ~{precipitate}
}
```

**Default Posture:** StreamVelocity
**Output Form:** Index structures, cross-references, search metadata
**Use When:** Building caches, preparing for queries, project analysis

### execute

Run or simulate; may require capabilities.

```spw
<c[goal:execute caps:{io}]>{
  !{run_program}
  @{emit_result}
}
```

**Default Posture:** ProductionSafe
**Output Form:** Execution result, side effects
**Use When:** Actual execution, simulation, testing

### onboard

Teach and introduce with gentle defaults and high ergonomics.

```spw
<c[goal:onboard]>{
  ~{step_by_step}
  ~{explain_each_part}
  ~{suggest_next_action}
}
```

**Default Posture:** TeachingGentle
**Output Form:** Tutorial sequences, hints, guided exploration
**Use When:** New users, learning contexts, interactive help

### audit

Verify provenance, hashes, and determinism; emit witnesses.

```spw
<c[goal:audit]>{
  ~{canonicalize}
  ~{compute_hash}
  ~{verify_provenance}
  ~{emit_witness}
}
```

**Default Posture:** AuditComplete
**Output Form:** Verification results, witness records, hash chains
**Use When:** Compliance, trust verification, reproducibility

---

## Goal Selection

Goals are selected via capsule configuration:

```spw
<c[goal:explain]>{
  // Content evaluated with explain goal
}
```

Only one goal is active at a time. Nested capsules can change goals:

```spw
<c[goal:index]>{
  // Building indices

  <c[goal:explain]>{
    // This subsection explains what we're indexing
  }

  // Back to indexing
}
```

---

## Goal Contract

1. **Goal selects defaults** for Posture and extraction strata targets
2. **Goal never changes surface semantics**; syntax means the same thing
3. **Goal changes outputs and checks**; what gets produced differs
4. **Goal is explicit**; no goal inference from content

---

## Relationship to Pipeline

Goals influence the distill/extract pipeline:

| Stage | explain | index | execute | onboard | audit |
|-------|---------|-------|---------|---------|-------|
| prime | context | caches | runtime | tutorials | witnesses |
| wonder | navigate | search | probe | guide | verify |
| desugar | annotate | normalize | compile | simplify | canonicalize |
| extract | narrative | indices | artifacts | steps | proofs |
| precipitate | docs | cache | results | progress | witnesses |

---

## Relationship to Dialects

Goals are orthogonal to dialects. Both can be specified:

```spw
<c[goal:explain dialects:{x t}]>{
  // Explain the linkage graph and topology
}

<c[goal:audit dialects:{r}]>{
  // Audit the reduced form
}
```

---

## Conformance

- **Level 1**: MAY parse goal in capsule; MUST NOT reject
- **Level 2**: SHOULD recognize goal tokens; MAY treat as hint
- **Level 3**: MUST honor goal; MUST select appropriate posture defaults

---

## See Also

- [../core/CAPSULES.md](../core/CAPSULES.md) - Capsule configuration syntax
- [../domains/POSTURE.md](../domains/POSTURE.md) - Behavior profiles
- [PIPELINE.md](./PIPELINE.md) - Distill/extract stages
- [REGISTERS.md](./REGISTERS.md) - Register architecture
