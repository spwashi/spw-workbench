Validate .spw file syntax through the real Spw parser.

Reference: `.agents/workflows/validate-spw-syntax.md`

Run validation based on scope:

```bash
# All .spw files (excluding .agents)
npm run lint:spw

# Specific directory or file
node --import tsx scripts/analyzers/spw-syntax-validate.ts $ARGUMENTS

# With filtering
npm run lint:spw -- --match <pattern>
npm run lint:spw -- --exclude <pattern>

# Verbose (show passing files with token counts)
node --import tsx scripts/analyzers/spw-syntax-validate.ts -v

# Strict mode (fail on warnings)
npm run lint:spw:strict
```

If the user provides a path, validate that specific target. Otherwise validate the full project.

Report: total files checked, pass/fail counts, and specific errors with file:line references.

User input: $ARGUMENTS
