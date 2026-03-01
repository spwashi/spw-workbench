# Geometry Dialects

Version: 0.1.0-alpha
Status: Specified (Optional)

---

## Overview

The geometry axis describes how Spw expressions are dimensionally represented. The same semantic content can be expressed in different geometric forms depending on context.

| Dialect | Dimension | Primary Use |
|---------|-----------|-------------|
| Spw.l | 1D (linear) | Storage, transmission, hashing |
| Spw.b | 2D (block) | Authoring, reading, version control |
| Spw.x | 0D (index) | Linking, composition, lazy loading |

---

## Spw.l — Linear Geometry

Linear geometry serializes content to a single line with explicit connectors.

### Characteristics

- All content on one line
- Whitespace insignificant (token separation only)
- All connectors explicit
- Canonical form (one valid representation per seed)

### Example

```spw.l
^["greeting"]{!boon["Hello"]..?[@name]{!["Welcome, "..@name]|!["Welcome, stranger"]}..@out}
```

### Grammar Notes

- Line breaks forbidden within seed
- `..` required between sequential operations
- No implicit sequences

### Use Cases

- Database storage fields
- API payloads and message queues
- URL parameters
- Content-addressed hashing
- Embedding in code comments

---

## Spw.b — Block Geometry

Block geometry uses line breaks and indentation to convey structure.

### Characteristics

- Whitespace significant
- Indentation indicates nesting
- Line breaks create implicit sequences
- Blank lines separate sections

### Example

```spw.b
^["greeting"]{
  !boon["Hello"]
  
  ?[@name]{
    !["Welcome, " .. @name]
  | !["Welcome, stranger"]
  }
  
  @out
}
```

### Grammar Notes

- Indentation depth determines nesting
- Same-level lines are implicit sequence (no `..` needed)
- Explicit `..` permitted but optional between lines
- `|` for alternatives typically at line start

### Use Cases

- Primary authoring format
- Documentation and specifications
- Version control (meaningful diffs)
- Code review
- Teaching materials

---

## Spw.x — Index Geometry

Index geometry references content by address without including it.

### Characteristics

- Zero-dimensional (pointer only)
- Content resolved at access time
- Supports multiple addressing schemes

### Reference Types

**Local reference:**
```spw.x
@templates/greeting
@lib/utils/format
```

**Registry reference:**
```spw.x
@canon:Spw.Patterns.Greeting@1.0
@user:spwashi/templates/email
```

**Content-addressed reference:**
```spw.x
@hash:sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
```

**Versioned reference:**
```spw.x
@greeting@1.0.0
@greeting@2026.01.07
```

**Fragment reference:**
```spw.x
@document#section_3
@spec#operators
```

### Use Cases

- Cross-document linking
- Artifact composition
- Content-addressed storage
- Lazy loading
- Dependency declaration

---

## Conversion

### Spw.b ↔ Spw.l

Conversion between block and linear is **lossless**.

**Block to Linear:**
1. Remove insignificant whitespace
2. Insert `..` between implicit sequences
3. Collapse to single line

**Linear to Block:**
1. Parse expression structure
2. Insert line breaks at sequence boundaries
3. Indent according to nesting depth

### Any → Spw.x

Conversion to index is **lossy**—content is discarded.

```spw.b
# Original
^["greeting"]{!["Hello"]}

# Becomes
@greeting               # Content not included
```

### Spw.x → Any

Resolution requires fetching content from source.

```spw.x
@greeting               # Reference

# Resolves to
^["greeting"]{!["Hello"]}
```

Resolution may fail if source is unavailable.

---

## Canonical Form

Every seed has exactly one canonical Spw.l representation. This enables:

- Content-addressed hashing
- Equivalence testing
- Deduplication

**Canonicalization rules:**

1. Convert to Spw.l
2. Normalize whitespace to single spaces
3. Sort annotation keys alphabetically
4. Remove comments

Two seeds are semantically equivalent if and only if their canonical forms are identical.

---

## Notation

Complete dialect specification:

```
Spw.<geometry>
Spw.<geometry>.<function>
Spw.<geometry>.<function>@<version>
```

Examples:

```
Spw.l           # Linear geometry
Spw.b           # Block geometry
Spw.l.p         # Linear prompting
Spw.b.q         # Block querying
Spw.b.t@0.1.0   # Block templating v0.1.0
```

---

## Selection Guide

| Context | Recommended |
|---------|-------------|
| Human authoring | Spw.b |
| Human reading | Spw.b |
| Storage/transmission | Spw.l |
| Version control | Spw.b |
| Hashing/deduplication | Spw.l (canonical) |
| Cross-document links | Spw.x |
| Lazy loading | Spw.x |
| API payloads | Spw.l |
