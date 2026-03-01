# Theatre@ Application

Version: 0.1.0-alpha
Domain: Dramatic Performance

---

## Overview

Theatre@ interprets Spw seeds as performance scripts. Operators map to dramatic elements; seeds describe scenes and action.

---

## Operator Bindings

| Operator | Dramatic Element |
|----------|------------------|
| `!` | Entrance, action, dialogue |
| `^` | Character naming, scene establishment |
| `~` | Recurring motif, chorus |
| `<>` | Character relationship |
| `?` | Dramatic question |
| `*` | Plot branch, choice |
| `=` | Character trait, anchor |
| `@` | Exit, scene end |

---

## Modifier as Direction

| Modifier | Acting Direction |
|----------|------------------|
| `bone` | Neutral delivery |
| `boon` | Warm, welcoming |
| `bane` | Guarded, warning |
| `bonk` | Sharp, sudden |
| `honk` | Emphatic, important |

---

## Role Mapping

Each operator suggests an actor role:

| Operator | Role |
|----------|------|
| `!` | MESSENGER — brings information |
| `^` | NAMER — establishes identity |
| `~` | CHORUS — provides rhythm |
| `<>` | MATCHMAKER — creates relationships |
| `?` | DETECTIVE — asks questions |
| `*` | JUDGE — makes decisions |
| `=` | ANCHOR — fixes certainty |
| `@` | HERALD — announces outcomes |

---

## Example: Encounter

```spw.b
Theatre@{
  ^["encounter"]{
    !honk["A stranger appears"]      # MESSENGER, emphatic
    
    <>["Traveler", "Villager"]       # Relationship established
    
    ?["friend or foe"]{              # Dramatic question
      !boon["They share bread"]      # Warm resolution
    | !bane["They draw weapons"]     # Guarded conflict
    }
    
    @["The story continues"]         # Scene end
  }
}
```

---

## Staging Conventions

Operators suggest stage positions:

```
        UPSTAGE
   R^        R=        R#
   (naming)  (anchor)  (aside)
   
   R<>      CENTER     R?
   (couple)           (question)
   
   R!        R*        R~
   (inject)  (decide)  (rhythm)
   
   R@        R.
   (emit)    (focus)
       DOWNSTAGE
       [AUDIENCE]
```

---

## Use Cases

- Performance scores
- Devised theatre creation
- Script analysis
- Dramatic structure teaching
- Interactive fiction
