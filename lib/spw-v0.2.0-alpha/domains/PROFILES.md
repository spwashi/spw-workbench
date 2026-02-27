# Domain Profiles

Version: 0.2.0-alpha
Status: Contract stub (upgraded from v0.1.0-alpha redirect)

---

## v0.2.0 Contract Stub

Domains are interpretive lenses that project Spw seeds through specific semantic contexts. The notation `Domain@topic` means "the topic as understood within the Domain context."

**v0.2.0 reality**: no domain projection is implemented in code. The `^["domain"]` structural pattern is queryable via `spwq` (`DOMAIN_ROOTS` preset), but semantic projection — where `!` means "voltage source" in `Hardware@` and "entrance" in `Theatre@` — is not machined. Domains remain a spec-level concept.

### Domain Tiers

| Tier | Domains | v0.2.0 status |
|------|---------|---------------|
| Reference | Cognitive@, Hardware@, Theatre@, Broadcast@ | Theory only — illustrate the pattern |
| Meta | Taste@ | Convention only — used in skills, not machined |
| Structural | `^[_]` domain roots | ✅ Queryable via `DOMAIN_ROOTS` preset |

### Operator Projection Pattern

Each domain re-interprets operators through its lens. This is the core pattern — **not yet implemented, but stable as a design target**:

| Operator | Cognitive@ | Hardware@ | Theatre@ | Broadcast@ |
|----------|------------|-----------|----------|------------|
| `!` | Encoding | Voltage source | Entrance | Signal source |
| `^` | Chunking | Node label | Character | Channel |
| `~` | Rehearsal | Oscillator | Motif | Carrier |
| `?` | Retrieval | Comparator | Question | Monitor |
| `=` | Consolidation | Ref voltage | Trait | Parameter |
| `@` | Expression | Output | Exit | Transmission |

### Domain Definition

```spw.b
^profile["Hardware"]{
  #version: "0.2.0"
  #domain: "electronic_circuits"

  ^["operators"]{
    !: "voltage_source"
    ^: "node_label"
    ~: "oscillator"
    ?: "comparator"
    =: "reference_voltage"
    @: "output_driver"
  }

  ^["modifiers"]{
    bone: "normal_operation"
    boon: "primary_signal_path"
    bane: "backup_or_fault_path"
  }
}
```

---

## Invariants

1. **Projection preserves structure**: domain application changes interpretation, not tree shape.
2. **Orthogonality**: domains compose independently with geometry, function, taste, and posture.
3. **Structural domains are queryable**: `DOMAIN_ROOTS` and `DOMAIN_ROOTS_FULL` presets select `^[_]` and `^[_]{_}`.
4. **Semantic domains are not**: until projection is implemented, operator reinterpretation is human-only.

---

## Implementation Hooks

| Hook | Location | Status |
|------|----------|--------|
| `DOMAIN_ROOTS` preset | `src/seed/query/presets.ts` | ✅ Shipped |
| Domain operator projection | — | ❌ Not implemented |
| Domain registration (`canon:Spw.Domain.*`) | — | ❌ Not implemented |
| `#domain:` annotation | — | ❌ Not implemented |

---

## See Also

- [TASTE.md](./TASTE.md) — Aesthetic meta-domain
- [POSTURE.md](./POSTURE.md) — Behavioral profiles
- [../applications/QUERY.md](../applications/QUERY.md) — Query application (only application domain with code backing)
