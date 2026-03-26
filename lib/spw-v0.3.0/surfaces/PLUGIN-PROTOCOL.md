# PLUGIN-PROTOCOL (Spw v0.3.0)

## Status

New in v0.3.0 — spec library surface for the plugin extensibility framework.

## v0.3.0 Contract

The plugin protocol defines how external transforms extend the Spw surface ecosystem:
- Plugins are `.spw` files — the protocol is self-describing.
- Plugin discovery uses selector queries — the same mechanism plugins themselves use.
- A workspace with zero plugins still publishes via the default pipeline.
- Plugin composition is explicit — no implicit middleware chains.
- Backward compatibility across dialect versions is a hard constraint.

Lifecycle: `discovery → validation → select → hooks → transform → hooks → emit → hooks`

## Source Links

- Protocol definition: `.spw/surfaces/plugin-protocol.spw`
- Plugin scan path: `.spw/surfaces/plugins/*.spw`
- Surface index: `.spw/surfaces/index.spw`

## Invariants

- Every selector in a plugin must match at least one frame in the workspace.
- Plugin output format must exist in the surface format registry.
- Independent plugins can run in parallel; dependent plugins run in topological order.
- Plugins receive copies of frames — they cannot modify each other's selections.

## Migration Notes

New in v0.3.0. The protocol definition existed in `.spw/surfaces/plugin-protocol.spw` since v0.2.0 but was not represented in the spec library. No concrete plugins have been implemented yet.

## Open Questions

- What is the simplest plugin that would be genuinely useful?
- How does the plugin ecosystem resist the "WordPress trap" of incompatible bloat?
- Should plugin health metrics be part of the protocol or a separate concern?

## v0.4.0 Candidates

- First concrete plugin implementation (changelog generator or taxonomy builder).
- Plugin discovery integrated with workspace index.
- Plugin health metrics and compatibility signals.
