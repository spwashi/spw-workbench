# Functional Dialects

Version: 0.1.0-alpha
Status: Specified (Optional)

---

## Overview

The functional axis describes the operational purpose of Spw expressions. Each functional dialect optimizes syntax and semantics for a specific use case.

| Dialect | Purpose | Parsing | Key Ergonomics |
|---------|---------|---------|----------------|
| Spw.p | Prompting | Shallow (1-pass) | Role markers, slots, emission |
| Spw.q | Querying | Deep (2-pass) | Predicates, shaping, aggregation |
| Spw.t | Templating | 2-pass | Placeholders, defaults, late binding |

---

## Spw.p — Prompting Dialect

Optimized for interaction with language models.

### Role Markers

The `!` operator takes role prefixes for LLM context:

```spw.p
!sys["You are a helpful assistant."]
!usr[@question]
!ctx[@retrieved_context]
!inst["Think step by step."]
```

| Prefix | Role | Purpose |
|--------|------|---------|
| `sys` | System | Model instructions |
| `usr` | User | User input |
| `ctx` | Context | Retrieved/provided context |
| `inst` | Instruction | Processing directive |

### Emission

The `@emit` operator triggers model output:

```spw.p
!sys["Summarize the document."]
!ctx[@document]
@emit["summary"]
```

### Chained Reasoning

```spw.p
!sys["You are a reasoning assistant."]
!usr[@problem]
!inst["Think step by step."]
@emit["reasoning"]
!inst["Now provide the final answer."]
@emit["answer"]
```

### Few-Shot Pattern

```spw.p
!sys["Classify sentiment."]

~[@examples]{
  !usr[@_.input]
  !["Label: " .. @_.label]
}

!usr[@new_input]
!inst["Label:"]
@emit
```

### Parsing Characteristics

- Single-pass (1-sync)
- Shallow nesting
- Slot resolution at emission
- Idiom expansion for common patterns

---

## Spw.q — Querying Dialect

Optimized for data retrieval and filtering.

### Filter Predicates

The `?` operator specifies filter conditions:

```spw.q
@users .. ?[status == "active"]
@products .. ?[price < 100 & in_stock == true]
@orders .. ?[date >= @start_date]
```

### Result Shaping

The `^` operator shapes result structure:

```spw.q
@users
  .. ?[active]
  .. ^["select": ["name", "email"]]
  .. @out
```

### Sorting and Limiting

```spw.q
@products
  .. ?[category == "electronics"]
  .. =boon["price"]               # Sort ascending
  .. ^["limit": 10]
  .. @out
```

### Aggregation

```spw.q
@orders
  .. ?[date >= @start]
  .. ^["group": "category"]{
       total: @sum["amount"]
       count: @count
       average: @avg["amount"]
     }
  .. @out
```

### Nested Queries

```spw.q
@customers
  .. ?[region == "west"]{
       @orders
         .. ?[customer_id == @_.id]
         .. ?[amount > 1000]
     }
  .. ^["select": ["name", "orders"]]
  .. @out
```

### Parsing Characteristics

- Two-pass (2-sync)
- First pass: schema/type collection
- Second pass: field resolution, validation
- Query optimization may reorder

---

## Spw.t — Templating Dialect

Optimized for parameterized reuse.

### Placeholder Syntax

The `_` prefix marks slots:

```spw.t
^template["greeting"]{
  !boon["Hello, " .. _name .. "!"]
  @out
}
```

### Slot Types

| Syntax | Type | Description |
|--------|------|-------------|
| `_name` | Required | Must be provided |
| `_name?` | Optional | Has default or omittable |
| `_items...` | Spread | Captures multiple values |
| `_name:type` | Typed | Validates against type |

### Defaults

```spw.t
^template["email"]{
  #defaults{
    greeting: "Hello"
    signature: "Best regards"
  }
  
  !boon[_greeting? .. ", " .. _recipient .. ","]
  !bone[_content]
  !bone[_signature?]
}
```

### Instantiation

```spw
@template/greeting{ name: "Alice" }
# Produces: !boon["Hello, Alice!"] .. @out
```

### Spread Slots

```spw.t
^template["list"]{
  !honk[_title]
  ~[_items...]{
    !bone["• " .. @_]
  }
}

# Instantiate:
@template/list{
  title: "Tasks"
  items: ["Review", "Approve", "Deploy"]
}
```

### Typed Slots

```spw.t
^template["metric"]{
  ^["name"]: _metric:string
  ^["value"]: _value:number
  ^["trend"]: _direction:enum["up", "down", "flat"]
}
```

### Parsing Characteristics

- Two-pass (2-sync)
- First pass: slot identification, default collection
- Second pass: binding, validation
- Required slots validated at instantiation

---

## Combining Geometry and Function

Geometry and function axes are orthogonal. A complete dialect specification combines both:

```
Spw.<geometry>.<function>@<version>
```

### Common Combinations

| Notation | Description | Use Case |
|----------|-------------|----------|
| `Spw.l.p` | Linear prompting | Prompt storage |
| `Spw.b.p` | Block prompting | Prompt authoring |
| `Spw.b.q` | Block querying | Complex queries |
| `Spw.l.q` | Linear querying | Inline queries |
| `Spw.t.p` | Template prompting | Prompt libraries |
| `Spw.b.t` | Block templating | Template authoring |

### Selection Guide

| Need | Geometry | Function |
|------|----------|----------|
| Write prompts | Spw.b | Spw.p |
| Store prompts | Spw.l | Spw.p |
| Write queries | Spw.b | Spw.q |
| API query params | Spw.l | Spw.q |
| Create templates | Spw.b | Spw.t |
| Reusable patterns | Spw.t | (any) |

---

## Dialect Detection

Implementations **SHOULD** support automatic dialect detection:

1. Check file extension: `.spw.p`, `.spw.q`, `.spw.t`
2. Check annotation: `#dialect: Spw.b.p`
3. Infer from content (role markers → prompting, predicates → querying)

Explicit declaration takes precedence over inference.

---

## Extending Dialects

Custom functional dialects can be defined following the pattern:

```spw
^dialect["Spw.r"]{
  #purpose: "Routing"
  #parsing: "2-pass"
  
  ^["operators"]{
    !: "signal_injection"
    @: "route_emission"
  }
  
  ^["ergonomics"]{
    "Route declarations"
    "Priority markers"
    "Fallback chains"
  }
}
```

Custom dialects are not part of v0.1.0 conformance but may be registered in future versions.
