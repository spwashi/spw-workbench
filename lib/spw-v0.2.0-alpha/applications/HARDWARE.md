# Hardware@ Application

Version: 0.2.0-alpha
Status: Contract stub — operator reinterpretation lens

---

## v0.2.0 Contract Stub

`Hardware@` reinterprets Spw's operators through an electronic circuits lens. The same structural seed produces circuit semantics — `!` becomes voltage injection, `^` becomes node labeling, `@` becomes output.

### Operator Reinterpretation

| Operator | Base meaning | Hardware@ meaning |
|----------|-------------|------------------|
| `!` | Hydrate/inject | Voltage/current source |
| `^` | Tap/anchor | Node label, net name |
| `~` | Defer/process | Oscillator, clock |
| `?` | Probe/query | Comparator, threshold |
| `=` | Config/bind | Reference voltage, parameter |
| `@` | Reference/emit | Output driver, terminal |

### Why This Lens Matters

The operators aren't metaphors — `!` (inject energy into a system) describes both "hydrate a value" and "apply voltage." The mapping is structural, not decorative. This validates that Spw's operator algebra captures **universal patterns of action**, not just programming operations.

### Implementation Status

The shader renderer (`src/infra/shaders/shader-renderer.ts`) implements lenses as gain chains. Operator reinterpretation at the AST level is not yet implemented.

---

## See Also

- [../domains/PROFILES.md](../domains/PROFILES.md) — Domain definition schema
- [../../docs/theory/md/lens-algebra.md](../../docs/theory/md/lens-algebra.md) — Formal lens theory
