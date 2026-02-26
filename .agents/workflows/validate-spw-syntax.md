---
description: validate .spw doc syntax through the real parser
---

# Spw Syntax Validation Workflow

Runs every `.spw` file through the actual Spw parser and reports syntax errors.

## Quick validation

// turbo
1. Validate all `.spw` files in the project:
```bash
npm run lint:spw
```

## Scoped validation

2. Validate only the docs directory:
```bash
npm run lint:spw:docs
```

3. Validate a specific directory or file:
```bash
node --import tsx scripts/analyzers/spw-syntax-validate.ts docs/theory/
node --import tsx scripts/analyzers/spw-syntax-validate.ts docs/theory/spw/operators.spw
```

## Precise targeting

4. Filter validation targets by path inclusion (`--match`) or exclusion (`--exclude`):
```bash
npm run lint:spw -- --match semantics
npm run lint:spw -- --exclude .agents
```

## CI / strict mode

4. Fail on any warnings (suitable for CI gates):
```bash
npm run lint:spw:strict
```

5. Machine-readable JSON output:
```bash
npm run lint:spw:json
```

## Verbose & Quiet output

6. Show all passing files with token counts and parse timing:
```bash
node --import tsx scripts/analyzers/spw-syntax-validate.ts -v
```

7. Suppress all output (useful for strictly reading the exit code in scripts):
```bash
npm run lint:spw -- --quiet
```

## Full doc pipeline

Run all doc validation in sequence:

7. Reference check (broken `@root/...` and `~"..."` paths):
```bash
npm run lint:docs
```

// turbo
8. Syntax validation (parse errors):
```bash
npm run lint:spw
```

// turbo
9. Garden audit (structural scaffolding health):
```bash
npm run audit:spw-garden
```

## What each tool checks

| Tool               | npm script          | Validates                                    |
|--------------------|---------------------|----------------------------------------------|
| `spw-path-check`   | `lint:docs`         | `@root/` and `~"..."` references resolve     |
| `spw-syntax-validate` | `lint:spw`       | Every `.spw` file parses without errors      |
| `audit-spw-garden` | `audit:spw-garden`  | Structural blocks (roots/meta/files/questions)|
