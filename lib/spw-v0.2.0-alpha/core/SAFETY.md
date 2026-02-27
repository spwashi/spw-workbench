# SAFETY (Spw v0.2.0-alpha)

## Status

Contract stub for v0.2.0-alpha safety posture.

## v0.2.0 Contract Stub

Safety defines how the kernel handles malformed input, uncertain states, and potentially unsafe execution assumptions. v0.2.0-alpha focuses on:
- fail-fast parsing and validation behavior
- explicit warning/error channels
- deterministic non-execution of unsafe constructs

## Invariants

- Unsafe or invalid states never silently pass as success.
- Errors include enough position/context for repair.
- Safety checks do not depend on editor or runtime UI context.

## Implementation Hooks

- Parse error and warning surfaces: `src/seed/parser/output.ts`
- Parse tracing and diagnostics: `src/seed/parser/trace.ts`
- Validation entrypoint: `scripts/analyzers/spw-syntax-validate.ts`

## Open Questions

- Which warnings should be promoted to errors in ship profile?
- Do we need a separate safety profile for exploratory parsing modes?
