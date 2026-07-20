---
name: spw-commit-review
description: Human-in-the-loop commit gate. Blocks agent-initiated commits until human authorizes. Surfaces layer violations, profile-based Spw syntax review, and golden snapshot risks. Use for all commit workflows.
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
   - `⛔` = errors (layer violations, parser failures) — should fix before authorizing
   - `⚠` = warnings (golden snapshots, newly introduced discouraged syntax for a file profile) — acknowledge or fix
   - `○` = advisories/waivers (historical forms allowed by profile) — informational
   - `✓` = reviewed files with no active syntax mismatch
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

Preferred provenance model:
- Explicit local context file when available
- Explicit env (`SPW_AGENT=...`) next
- Heuristic harness detection as fallback

Helpers:
```bash
scripts/commit-review/set-agent-context.sh codex-air wrapper high
scripts/commit-review/clear-agent-context.sh
```

## Built-in Checks

1. **Layer boundaries**: `lib/spw/` must not import `@/` paths
2. **Spw syntax review**: evaluates `.spw` files by profile and warns on newly introduced discouraged forms rather than generation buckets
3. **Golden snapshots**: warns when `__tests__/snapshots/` files change
4. **Axis-scoped constants**: warns when genre/axis-scoped files (e.g., `src/styles/genres/`) contain raw `cubic-bezier` or round-number `setTimeout` delays instead of named axis tokens
5. **Pluggable**: add scripts to `.git/hooks/checks.d/*.sh`

## Mounted Consumer Mode

When this workbench is mounted at `.spw/_workbench` inside an independent consumer repository:

1. Treat the consumer root as the caller and authority root.
2. Read consumer-owned `.spw/index.spw`, `.spw/workspace.spw`, and `.spw/mount.spw` before workbench guidance.
3. Exclude `.spw/_workbench/**` from the consumer-authored review corpus unless the task explicitly audits the tooling mount.
4. Record both the consumer revision and mounted-workbench revision in review evidence.
5. Emit repository-relative paths. Never copy consumer identifiers, private content, or machine-local absolute paths into workbench artifacts.
6. Keep findings consumer-owned until a human explicitly selects a distilled, identity-free improvement for upstream contribution.

The commit authorization model does not change in mounted mode: a local human still authorizes every commit.

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

# Optional: explicitly force syntax review (default is already on)
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed --syntax-review

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

Syntax review now uses file/surface profiles instead of generation buckets. The default poll loop includes syntax review; use `--no-syntax-review` only when you need a parser-only pass.

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

## Spw Syntax Review Profiles

The hook no longer treats the repo as a one-way syntax migration ladder.
Instead it asks whether a form fits the current file profile.

| Profile | Typical paths | Review stance |
|---|---|---|
| `historical` | `docs/archive/`, `lib/spw-v0.1.0-alpha/`, `lib/spw-v0.2.0-alpha/`, `_archive/` | Historical forms are waived |
| `agent_surface` | `.agents/**` | Planning/coordination idioms are allowed |
| `runtime_state` | `*.state.spw`, `.spw/state/**`, `.agents/state/**` | Snapshot-oriented concise forms are allowed |
| `canon_surface` | `.spw/**`, repo `index.spw` | Quoted frames and concise traits are allowed |
| `narrative_surface` | `docs/**/*.spw`, `lib/**/*.spw`, `src/**/docs/**/*.spw` | Narrative idioms are allowed |
| `strict_surface` | Other `.spw` machine surfaces | Discouraged forms trigger warnings when newly introduced |

Current discouraged forms:
- `@domain:` outside historical profiles
- `^"..."`, `~#...`, and `~name:` on `strict_surface` files

## Codebase Tooling

```bash
npm run lint                # ESLint passes (incl. layer boundary enforcement via config)
npm run lint:docs           # Verify .spw path references are valid
npm run lint:spw            # Parse-validate all .spw files through the real parser
bash .agents/skills/spw-commit-review/scripts/poll-review.sh --scope=changed  # fast local polling loop
bash .agents/skills/spw-commit-review/scripts/spw-syntax-audit.sh [path]   # .spw profile distribution
bash .agents/skills/spw-commit-review/scripts/layer-check.sh               # Import boundary check
FUZZ=boonhonk npx eslint <file>                                             # Groove detector on specific file
```

## Skill Care

Update this skill when:
- The hook authorization model changes (new env vars, new bypass paths) → update Authorization Model table
- A new agent harness is added (new env var for detection) → update Agent Identification table
- A new built-in check is added to `.git/hooks/pre-commit` → update Built-in Checks section
- Polling behavior changes (`poll-review.sh` flags/output) → update Polling Loop section
- Syntax review profiles or discouraged-form policy changes → update the profile table and self-correction guidance

## Self-Correction Patterns

When the hook flags issues, fix them:

| Flag | Fix |
|---|---|
| `@domain:` on active/non-historical surfaces | Move into `.{ domain = X }[reg=facet]` or another explicit structural binding |
| `^"key"{}` on strict surfaces | Rewrite to `^seed[name v:N @profile:Spw.b]` or another explicit strict-surface form |
| `~#quality` on strict surfaces | Use an explicit structural or valence form suited to the file contract |
| `~key:` on strict surfaces | Use `= bias` or another clearer structural binding |
| Layer violation | Move import to correct layer or extract shared types to `core/` |

## Scripts

- `bash .agents/skills/spw-commit-review/scripts/poll-review.sh [options]` — poll changed/staged files for lint, fuzz, and .spw checks; writes per-skill state + register bus under `.agents/state/runtime/` unless `--no-state`
- `node --import tsx .agents/skills/spw-commit-review/scripts/spw-syntax-review.ts [options] -- <files>` — profile-based syntax review engine
- `bash .agents/skills/spw-commit-review/scripts/spw-syntax-audit.sh [path]` — full .spw profile landscape report
- `bash .agents/skills/spw-commit-review/scripts/layer-check.sh` — import boundary verification
