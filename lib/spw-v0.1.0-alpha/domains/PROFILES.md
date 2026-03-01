# Domain Profiles

Version: 0.1.0-alpha
Status: Specified (Optional)

---

## Overview

Domains are interpretive lenses that project Spw seeds through specific semantic contexts. The notation `Domain@topic` means "the topic as understood within the Domain context."

### Key Concepts

**Domain:** An interpretive context with operator bindings and modifier mappings.

**Projection:** Applying a domain lens to a seed, transforming operator semantics.

**Registration:** Recording a domain in the canon for discovery and versioning.

---

## Domain Tiers

| Tier | Domains | Status |
|------|---------|--------|
| Reference | Cognitive@, Hardware@, Theatre@, Broadcast@ | Fully specified |
| Extended | Fractal@, Narrative@ | Fully specified |
| Meta | Taste@ | Fully specified |
| Experimental | Network@, Music@, Chemistry@, Physics@ | Sketched only |

Reference domains demonstrate the interpretation pattern. Implementations supporting these four can support arbitrary domains.

---

## Domain Definition

A domain is defined with operator bindings and modifier mappings:

```spw.b
^profile["Hardware"]{
  #version: "0.1.0"
  #domain: "electronic_circuits"
  
  ^["operators"]{
    !: "voltage_source, current_source"
    ^: "node_label, net_name"
    ~: "oscillator, clock"
    <>: "wire_bond, connection"
    ?: "comparator, threshold"
    *: "multiplexer, switch"
    =: "reference_voltage, parameter"
    @: "output_driver, terminal"
  }
  
  ^["modifiers"]{
    bone: "normal_operation"
    boon: "primary_signal_path"
    bane: "backup_or_fault_path"
    bonk: "fault_condition"
    honk: "priority_signal"
  }
}
```

---

## Domain Application

Apply a domain using the `Domain@` prefix:

```spw.b
Hardware@{
  ^["amplifier"]{
    !["Vin"]
    .. =["gain": 10]
    .. @["Vout"]
  }
}
```

The domain lens transforms how operators are interpreted:
- `!` becomes voltage injection
- `=` becomes parameter lock
- `@` becomes output terminal

---

## Domain Registration

Domains are registered in the canon:

```
canon:Spw.Domain.Hardware@0.1.0
canon:Spw.Domain.Theatre@0.1.0
user:spwashi/domains/Custom@0.1.0
```

### Full Address Form

```
registry:namespace/Domain@topic.geometry.function@version#fragment
```

Example:
```
canon:Spw.Domain.Hardware@circuit.b.r@0.1.0#power_stage
```

---

## Reference Domains

### Cognitive@

Mental operations and information processing.

| Operator | Interpretation |
|----------|----------------|
| `!` | Encoding, injection to working memory |
| `^` | Chunking, anchor point |
| `~` | Rehearsal, iterative processing |
| `<>` | Binding, association |
| `?` | Retrieval, probe |
| `*` | Decision, selection |
| `=` | Consolidation, schema |
| `@` | Expression, output |

### Hardware@

Electronic circuits and signal flow.

| Operator | Interpretation |
|----------|----------------|
| `!` | Voltage/current source |
| `^` | Node label |
| `~` | Oscillator, clock |
| `<>` | Wire bond, connection |
| `?` | Comparator |
| `*` | Multiplexer |
| `=` | Reference voltage |
| `@` | Output driver |

### Theatre@

Dramatic performance and staging.

| Operator | Interpretation |
|----------|----------------|
| `!` | Entrance, action |
| `^` | Character naming |
| `~` | Recurring motif |
| `<>` | Relationship |
| `?` | Dramatic question |
| `*` | Plot branch |
| `=` | Character trait |
| `@` | Exit, emission |

### Broadcast@

Signal transmission and routing.

| Operator | Interpretation |
|----------|----------------|
| `!` | Signal source |
| `^` | Channel assignment |
| `~` | Carrier modulation |
| `<>` | Simulcast link |
| `?` | Signal monitor |
| `*` | Source selector |
| `=` | Technical parameter |
| `@` | Transmission |

---

## Extended Domains

### Fractal@

Self-similar recursion and scale invariance.

| Operator | Interpretation |
|----------|----------------|
| `!` | Init seed |
| `^` | Scale iteration |
| `~` | Recurse depth |
| `<>` | Self-similar couple |
| `?` | Boundary probe |
| `*` | Branch gate |
| `=` | Fix pattern |

**Valence as regime type:**
- `bone` — neutral iteration
- `boon` — deterministic convergent
- `bane` — chaotic divergent
- `bonk` — bifurcation boundary

### Narrative@

Emotional arcs and character development.

| Operator | Interpretation |
|----------|----------------|
| `!` | Inciting event |
| `^` | Observe moment |
| `~` | Progress arc |
| `<>` | Entangle characters |
| `?` | Probe tension |
| `*` | Gate revelation |
| `=` | Resolve catharsis |

---

## Cross-Domain Composition

Domains can be entangled via `&`:

```spw.b
(Hardware@{
  ^["circuit"]{...}
})
&
(Theatre@{
  ^["performance"]{...}
})
```

The `&` operator synchronizes interpretations across domains.

---

## Domain Projection

Projecting a seed through a domain:

```spw
@seed .. Hardware@      # Project seed through Hardware lens
@seed .. Theatre@       # Project through Theatre lens
```

The structure is preserved; only interpretation changes.

---

## Conformance Notes

- Domains are **optional** at all conformance levels
- No domains are **required** for v0.1.0 conformance
- Implementations supporting reference domains can support arbitrary domains
- Domain definitions follow the profile schema above
