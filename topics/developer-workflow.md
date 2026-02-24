# Developer Workflow

This page captures the default contributor loop for this repository.

## Daily loop

```bash
nvm use
npm run dev
npm run test:run
npm run lint:writerside
npm run lint:docs
npm run lint:spw
```

Use targeted checks while iterating:

```bash
npm test -- <pattern>
npm run lint:changed
npm run task:list
```

## Documentation and Spw checks

- Writerside integrity: `npm run lint:writerside`
- Docs path integrity: `npm run lint:docs`
- Spw parser validation: `npm run lint:spw`
- Spw syntax report: `bash .agents/skills/spw-commit-review/scripts/spw-syntax-audit.sh`
- Layer boundaries: `bash .agents/skills/spw-commit-review/scripts/layer-check.sh`

## Commit protocol

- Commits are gated by the repository pre-commit workflow.
- Keep commits focused by subsystem (docs, parser, runtime, UI, etc.).
- Prefer commit messages with an explicit scope and intent.

## Task helpers

```bash
npm run task:start -- <slug>
npm run task:list
npm run task:stream -- <slug>
npm run task:archive -- <slug>
```

Plans and workflows are stored under `.agents/`.

## Review checklist before opening a PR

1. Relevant tests pass (`npm run test:run` or targeted equivalent).
2. Docs and Spw checks pass (`lint:docs`, `lint:spw`).
3. Layer boundaries are preserved.
4. Changed files are coherent with the declared intent.


## Experimentation and skills

- See [Experiments & Skills](experiments-and-skills.md) for fuzz profiles, audits, and curated skills.
- Maintainers: see [Maintenance Surface](maintenance-surface.topic) for validation loops and common repair tasks.
