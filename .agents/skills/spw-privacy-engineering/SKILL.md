---
name: spw-privacy-engineering
description: Do privacy-centric engineering reviews and implement mitigations (data inventory, threat modeling, logging/retention, access controls). Use for PII handling, enterprise privacy posture, and secure-by-default design.
---

# Spw Privacy Engineering

## Default Workflow

1. Inventory data: what is collected, where it flows, and where it persists.
2. Classify data sensitivity (PII, secrets, identifiers, telemetry) and define minimization goals.
3. Threat model primary risks (leakage, unintended correlation, retention creep, access abuse).
4. Review logging and analytics: ensure redaction, sampling, and least-privilege.
5. Propose mitigations in descending order of leverage (eliminate > minimize > isolate > encrypt > audit).
6. Implement the smallest set of changes that materially reduces risk; add tests where feasible.

## Output Contract

- Provide a short data-flow table and a prioritized mitigation list.
- When changing runtime behavior, document tradeoffs and migration steps.

## Codebase-Specific Context

### Data Flow
- **Browser-only**: no server-side data storage. All data lives in the browser (localStorage, IndexedDB).
- **Session state**: `src/infra/state/` manages transient UI state. No external persistence.
- **REPL history**: command history is session-scoped (RAM only unless localStorage is used).
- **Telemetry**: none shipped. No analytics, no tracking, no external requests.
- **Grok/Claude probes**: `.spw` files in `src/lang/seeds/probes/` contain conversations with AI agents. These are committed to the repo. Review for accidental PII.

### Sensitive Boundaries
- **Clipboard**: copy mode (`UICopyMode`) exposes Spw-formatted text. Ensure no secrets in clipboard.
- **URL params**: may gate experiments (CSS lab). Don't put sensitive data in URLs.
- **Console logging**: `src/debug/` may emit internal state. Gate behind stage > 0.
- **Pre-commit hook**: logs agent identity. Agents should not log API keys.

## Codebase Tooling

```bash
bash .agents/skills/spw-privacy-engineering/scripts/privacy-scan.sh [path]  # PII/storage/console scan
npm run audit               # Extract and classify all @spw: annotation sites (check for accidental data logging)
```

## Skill Care

Update this skill when:
- A new data persistence mechanism is added (IndexedDB, server sync) → update Data Flow section
- External requests are added (telemetry, API calls) → update Data Flow and Sensitive Boundaries
- A new clipboard or sharing feature is added → update Sensitive Boundaries
- The probe format changes (new fields that might contain PII) → update Sensitive Boundaries

## Scripts

- `bash .agents/skills/spw-privacy-engineering/scripts/privacy-scan.sh [path]` — scan for storage access, console leaks, clipboard, PII patterns

## Resources

- Use `.agents/skills/spw-privacy-engineering/references/privacy-checklist.md` as the baseline review checklist.
