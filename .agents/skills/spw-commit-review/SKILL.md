---
name: spw-commit-review
description: Human-in-the-loop commit gate. Blocks agent-initiated commits until human authorizes. Surfaces layer violations, Spw syntax generation gaps, golden snapshot risks. Use for all commit workflows.
---

# Spw Commit Review

## Purpose

Every commit requires human authorization. Agents prepare changes and stage files; the human reviews the pre-commit report and authorizes (or rejects) the commit.

## Default Workflow

1. Poll checks early while editing:
   - `bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed`
2. Poll checks on staged files before commit:
   - `bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=staged`
3. Stage files: `git add <files>`
4. Attempt `git commit -m "<message>"`
5. The hook displays a report and then prompts for Touch ID authorization.
   - If Touch ID is unavailable, it falls back to: `Authorize this commit? [y/N]`
6. Review the report:
   - `⛔` = errors (layer violations) — should fix before authorizing
   - `⚠` = warnings (golden snapshots modified, Gen 1 syntax) — acknowledge
   - `○` = advisories (Gen 2 patterns) — optional modernization opportunity
   - `✓` = clean files (with Gen 3 feature counts)
7. Type `y` to authorize or `n` to abort

## Authorization Model

| Scenario | Behavior |
|---|---|
| Touch ID available | Fingerprint authorization |
| Human at terminal (No Touch ID) | Interactive y/N prompt fallback |
| Agent (non-interactive) | **Blocked** — exit 1 unless Touch ID prompt runs on screen |
| Skip all hooks | `git commit --no-verify` |

Agents must either ask the human to run the commit, or the human pre-authorizes via env var.

## Agent Identification

| Agent | Detection |
|---|---|
| `claude` | `CLAUDE_SESSION_ID` or `ANTHROPIC_API_KEY` |
| `gemini` | `GEMINI_SESSION_ID` or `GOOGLE_API_KEY` |
| `antigravity` | `ANTIGRAVITY_SESSION` |
| `copilot` | `GITHUB_COPILOT` |
| Manual | `SPW_AGENT=<name>` |
| `human` | Default (no agent env) |

## Built-in Checks

1. **Layer boundaries**: `lib/spw/` must not import `@/` paths
2. **Spw syntax gen**: flags Gen 1 (`^"key"{}`) and Gen 2 (`@domain:`, `~#`, `~key:`) patterns
3. **Golden snapshots**: warns when `__tests__/snapshots/` files change
4. **Axis-scoped constants**: warns when genre/axis-scoped files (e.g., `src/styles/genres/`) contain raw `cubic-bezier` or round-number `setTimeout` delays instead of named axis tokens
5. **Pluggable**: add scripts to `.git/hooks/checks.d/*.sh`

## Polling Loop (High-Leverage)

Use polling to get feedback before hook-time:

```bash
# Changed files while coding (recommended default)
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed

# Staged files right before commit
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=staged

# Continuous loop every 15s (for vibe-coding sessions)
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed --watch --interval=15

# Tight pre-merge poll using strict fuzz profile
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=staged --fuzz=ship --fuzz-level=error

# Optional: include Gen1/Gen2 syntax hints for .spw files
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed --gen-hints

# Optional: skip writing runtime register snapshots for one-off probes
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed --no-state

# Optional: use strict parser validation for snapshot writes (slower, more durable)
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed --state-validate=strict
```

This polls:
- ESLint on changed source files
- FUZZ profile checks on the same files
- `.spw` parse validation
- golden snapshot modifications
- runtime register snapshot updates at `.agents/state/runtime/poll-review.state.spw`
- aggregated register bus updates at `.agents/state/runtime/register-bus.state.spw`
- snapshot `nearby_spw` refs are dynamic (scope + changed-file adjacency) and extension/LSP navigable via local tilde refs (`~"relative/path"` from the runtime state file)

Generation syntax hints are intentionally optional in polling (`--gen-hints`), so the default loop stays focused on fast correctness feedback.

## Commit Message Conventions

Use Spw operator sigils as prefixes:

```
.[stratum] =facet[sections] — description          # .spw doc updates
^seed[name] — description                           # new seed/probe files
&[components] — description                          # merge/integrate
![tests] *verify[features] — description             # test coverage
vocab[types] =satisfies[contracts] — description     # type refactors
#[file list] ~spec[specs] — description              # new specs
```

## Spw Syntax Generations

| Gen | Pattern | Modern Equivalent | Status |
|---|---|---|---|
| 1 | `^"key"{}` | `^seed[...]` | Legacy |
| 2 | `@domain:`, `~#quality`, `~key:` | `.{ domain = X }[reg=facet]` | Legacy |
| 3 | `.{}`, `#[]`, `?<>`, `=`, `[reg=]` | ✓ Current | All strata files migrated |

## Codebase Tooling

```bash
npm run lint                # ESLint passes (incl. layer boundary enforcement via config)
npm run lint:docs           # Verify .spw path references are valid
npm run lint:spw            # Parse-validate all .spw files through the real parser
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed  # fast local polling loop
bash .agents/skills/spw-commit-review/scripts/spw-syntax-audit.sh [path]   # .spw gen distribution
bash .agents/skills/spw-commit-review/scripts/layer-check.sh               # Import boundary check
FUZZ=boonhonk npx eslint <file>                                             # Groove detector on specific file
```

## Skill Care

Update this skill when:
- The hook authorization model changes (new env vars, new bypass paths) → update Authorization Model table
- A new agent harness is added (new env var for detection) → update Agent Identification table
- A new built-in check is added to `.git/hooks/pre-commit` → update Built-in Checks section
- Polling behavior changes (`poll-review.sh` flags/output) → update Polling Loop section
- Gen 4 syntax emerges → update Spw Syntax Generations table and Self-Correction Patterns

## Self-Correction Patterns

When the hook flags issues, fix them:

| Flag | Fix |
|---|---|
| Gen 1 `^"key"{}` | Rewrite to `^seed[name v:N @profile:Spw.b]` |
| Gen 2 `@domain:` | Move into `.{ domain = X }[reg=facet]` |
| Gen 2 `~#quality` | Use valence pentad: `quality = boon \| bane \| bone \| bonk \| honk` |
| Gen 2 `~key:` | Use `= bias` pattern: `key = value` |
| Layer violation | Move import to correct layer or extract shared types to `core/` |

## Scripts

- `bash .agents/skills/spw-commit-review/scripts/poll-review.sh [options]` — poll changed/staged files for lint, fuzz, and .spw checks; writes per-skill state + register bus under `.agents/state/runtime/` unless `--no-state`
- `bash .agents/skills/spw-commit-review/scripts/spw-syntax-audit.sh [path]` — full .spw syntax generation report
- `bash .agents/skills/spw-commit-review/scripts/layer-check.sh` — import boundary verification
