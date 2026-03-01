# Taste@ Meta-Domain

Version: 0.1.0-alpha
Status: Specified (Optional)

---

## Overview

Taste@ is a meta-domain that evaluates seeds through aesthetic and quality dimensions. Unlike interpretive domains that project content, Taste@ measures how well-crafted a seed is.

The notation `Taste@seed` means "the seed evaluated through aesthetic criteria."

---

## Evaluation Framework

### Six Axes

| Axis | Low | High | Measures |
|------|-----|------|----------|
| Density | Sparse | Dense | Token economy, compression |
| Valence | Neutral | Charged | Emotional texture of form |
| Depth | Flat | Deep | Nesting complexity |
| Explicit | Implicit | Explicit | Self-documentation |
| Abstract | Concrete | Abstract | Generality, reusability |
| Temporal | Instant | Processual | Unfolding, iteration |

Each axis scored 1-10.

### Eight Elegance Criteria

| Criterion | Weight | Question |
|-----------|--------|----------|
| Inevitability | 20% | Only way to write this? |
| Economy | 20% | Every token necessary? |
| Balance | 15% | Structure ↔ feeling harmony? |
| Rhythm | 15% | Reads smoothly? |
| Surprise | 10% | Turn or insight? |
| Resonance | 10% | Form echoes content? |
| Composability | 5% | Combines with others? |
| Memorability | 5% | Will it stick? |

Each criterion scored 1-10. Composite elegance is weighted average.

### Five Style Profiles

| Profile | Characteristics | Use Case |
|---------|-----------------|----------|
| Minimalist | High density, low explicit | Expert tools |
| Literate | Low density, high explicit | Team docs |
| Poetic | High valence, high rhythm | Creative work |
| Mechanical | High explicit, checkpointed | Production |
| Research | Structured, linked | Analysis |

---

## Evaluation Notation

Three forms at increasing verbosity.

### Micro Form

Inline annotation, ≤220 characters:

```spw
#taste[7,3,5,8,6,7|8,7,8,8,6,9,8,7→7.85:Literate]
```

Format:
```
#taste[axes|elegance→composite:profile]
axes     = 6 comma-separated scores (density,valence,depth,explicit,abstract,temporal)
elegance = 8 comma-separated scores (inevitability,economy,balance,rhythm,surprise,resonance,composability,memorability)
composite = weighted average
profile  = primary style profile
```

### Compact Form

Structured, machine-readable:

```spw.b
#taste{
  axes[7,3,5,8,6,7]
  elegance[8,7,8,8,6,9,8,7]
  composite: 7.85
  profile: Literate
}
```

### Full Form

With rationale and diagnostics:

```spw.b
#taste{
  #evaluation{
    date: @today
    evaluator: @role
    confidence: 0.85
  }
  
  ^["axes"]{
    density{ value: 7, note: "compressed but readable" }
    valence{ value: 3, note: "neutral presentation" }
    depth{ value: 5, note: "moderate nesting" }
    explicit{ value: 8, note: "named elements" }
    abstract{ value: 6, note: "mixed concrete/abstract" }
    temporal{ value: 7, note: "processual flow" }
  }
  
  ^["elegance"]{
    inevitability{ score: 8, evidence: "structure mirrors content" }
    economy{ score: 7, evidence: "one optional element" }
    balance{ score: 8, evidence: "logic/emotion proportion" }
    rhythm{ score: 8, evidence: "cadence supports meaning" }
    surprise{ score: 6, evidence: "readable but expected" }
    resonance{ score: 9, evidence: "form embodies process" }
    composability{ score: 8, evidence: "units standalone" }
    memorability{ score: 7, evidence: "pattern sticks" }
  }
  
  composite: 7.85
  
  ^["profile"]{
    primary: Literate
    secondary: Research
    distances: { Literate: 0.4, Research: 0.5, Mechanical: 0.7 }
  }
  
  ^["issues"]{
    !bone["low_valence"]{ opportunity: "add texture" }
    !bone["repetition"]{ severity: "minor" }
  }
}
```

---

## Grammar

```ebnf
taste_micro ::= "#taste[" axes "|" elegance "→" composite ":" profile "]"
axes        ::= score ("," score){5}
elegance    ::= score ("," score){7}
score       ::= digit | "10"
composite   ::= digit+ ("." digit+)?
profile     ::= "Minimalist" | "Literate" | "Poetic" | "Mechanical" | "Research"
```

---

## Evaluation Process

1. **Score axes** (1-10 each, six dimensions)
2. **Score elegance** (1-10 each, eight criteria)
3. **Compute composite** (weighted average of elegance)
4. **Match profile** (nearest canonical profile)
5. **Identify issues** (opportunities for refinement)

---

## Variant Support

Taste@ supports the triple-form pattern:

| Variant | Audience | Typical Elegance |
|---------|----------|------------------|
| baseline | Learning, reference | 8.0-8.5 |
| literate | Team documentation | 8.5-9.0 |
| minimalist | Expert tools | 7.5-8.5 |

Selection syntax:
```spw
@seed@literate          # Use literate variant
@seed@minimalist        # Use minimalist variant
```

---

## Taste Development Stages

| Stage | Marker | Focus | Elegance |
|-------|--------|-------|----------|
| Learning | L1 | Correctness | 4-5 |
| Competence | L2 | Fluency | 5-6 |
| Proficiency | L3 | Appropriateness | 6-7 |
| Expertise | L4 | Elegance | 7-8 |
| Mastery | L5 | Teaching | 8+ |

---

## Anti-Patterns

| Pattern | Symptom | Remedy |
|---------|---------|--------|
| Over-locking | Excessive `=` | Reduce rigidity |
| Over-injection | Many `!` without structure | Add anchors |
| Over-nesting | Lost in hierarchy | Flatten |
| Monotone | All same valence | Add contrast |
| Repetition | Examples identical | Vary structure |

---

## Integration

Taste@ can gate workflows:

```spw
@seed .. Taste@{?[composite > 8.0]}{ @publish | @revise }
```

Cross-domain comparison:

```spw
(Hardware@seed .. Taste@) & (Theatre@seed .. Taste@)
```

---

## Conformance Notes

- Taste@ is **optional** at all conformance levels
- Evaluation notation is **recommended** for published seeds
- Automated refinement is **not specified** in v0.1.0
