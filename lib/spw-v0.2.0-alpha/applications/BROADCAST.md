# Broadcast@ Application

Version: 0.2.0-alpha
Status: Contract stub — operator reinterpretation lens

---

## v0.2.0 Contract Stub

`Broadcast@` reinterprets Spw's operators through a signal transmission lens. The same structural seed produces routing semantics — `!` becomes signal source, `^` becomes channel assignment, `@` becomes transmission.

### Operator Reinterpretation

| Operator | Base meaning | Broadcast@ meaning |
|----------|-------------|-------------------|
| `!` | Hydrate/inject | Signal source |
| `^` | Tap/anchor | Channel assignment |
| `~` | Defer/process | Carrier modulation |
| `?` | Probe/query | Signal monitor |
| `=` | Config/bind | Technical parameter |
| `@` | Reference/emit | Transmission |

### Abstraction Gradient

The four reference lenses form a gradient from **substrate** to **story**:

| Lens | What `!` means | Character |
|------|---------------|-----------|
| Hardware@ | Voltage injection | Physical, component-level |
| Broadcast@ | Signal source | Signal flow, one-to-many |
| Cognitive@ | Encoding to memory | Information processing |
| Theatre@ | Entrance, action | Dramatic narrative |

The operators don't change — only what they're applied *to*.

---

## See Also

- [HARDWARE.md](./HARDWARE.md) — Substrate end
- [THEATRE.md](./THEATRE.md) — Story end
- [../domains/PROFILES.md](../domains/PROFILES.md) — Domain definition schema
