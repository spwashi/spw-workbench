---
description: how to commit with human-in-the-loop verification
---

# Commit with Touch ID Verification

The pre-commit hook **blocks all commits** until the human authorizes via Touch ID.
Agents write the commit messages; humans sign off biometrically.

## Flow

1. Agent stages files: `git add <files>`
2. Agent runs `git commit -m "<message>"`
3. The hook displays a file report, then:
   - **Touch ID prompt** appears → human places finger to authorize
   - If Touch ID is unavailable → falls back to interactive `y/N`
   - If non-interactive and no Touch ID → **blocks with exit 1**

4. To skip all checks: `git commit --no-verify`

## Commit Message Conventions

For `.spw` file updates:
```
.[stratum] =facet[sections] — description
```

For code changes:
```
vocab[types] =satisfies[contracts] — description
![tests] *verify[features] — description
&[components] — integration description
```

## Touch ID Setup

The Swift helper at `scripts/touchid-authorize.swift` uses the macOS
LocalAuthentication framework. It works out of the box on Macs with
Touch ID — no system configuration needed.

Exit codes:
- `0` — authorized (Touch ID or passcode)
- `1` — denied / cancelled
- `2` — biometrics unavailable (triggers fallback)

## Agent Identification

```bash
SPW_AGENT=grok git commit       # Manual override
# Auto-detected: claude, gemini, antigravity, copilot
```

## Pluggable Checks

Add custom check scripts to `.git/hooks/checks.d/*.sh`:
```bash
#!/bin/bash
# Available: STAGED_ALL, AGENT
# Stdout = report lines, exit code ignored
```

## Reference

See `.agents/skills/spw-commit-review/SKILL.md` for full documentation.
