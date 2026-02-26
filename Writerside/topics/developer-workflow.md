# Developer Workflow

This page captures the default loop for the canon rewrite repository.

## Daily loop (canon)

```bash
npm install
npm run lint:spw
npm run lint:writerside
npm run lint:docs
```

If you are working on references across the broader workbench surface (beyond the kernel), run strict reference integrity too:

```bash
npm run lint:docs:strict
```

## Kernel checks

- Spw parser validation: `npm run lint:spw`
- Writerside integrity: `npm run lint:writerside`
- Canon docs check: `npm run lint:docs`

## Commit protocol

- Commits are gated by the repository pre-commit workflow.
- Keep commits focused by subsystem (docs, kernel, spec, tools).
- Prefer episode bodies that name invariants and verification.

## Review checklist before committing

1. `npm run lint:spw` passes.
2. `npm run lint:writerside` passes.
3. `npm run lint:docs` passes.
4. If applicable, `npm run lint:docs:strict` passes.
