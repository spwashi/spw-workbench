# Mounted Workbench

A repository may mount this workbench at `.spw/_workbench` as a development organelle. The mount contributes parsers, CLI tools, editor services, review methods, and working references without taking ownership of consumer canon.

## Ownership

- The consumer owns `.spw/`, including prompts, manifests, claims, plans, and audit output.
- The workbench owns `.spw/_workbench`.
- Default scans exclude `_workbench`; deliberate infrastructure inspection must opt in.
- Evidence records consumer and workbench revisions using repository-relative paths.

## Prompt a Repository-Local Model

Use `.spw/README.md` as the short entrypoint. A useful request is:

> Read `.spw/README.md`, `.spw/index.spw`, `.spw/workspace.spw`, and `.spw/mount.spw`. Treat `.spw/_workbench` as mounted infrastructure, exclude it from the consumer corpus, and use its mounted-consumer review skill only as an instrument. Review one bounded question and write revision-aware evidence under the consumer-owned `.spw/audits/` tree.

The prompt states authority, exclusions, method, scope, and output location. It does not require knowledge of the consumer's identity or deployment shape.

## Navigate Before Reviewing

```bash
npm --prefix .spw/_workbench run spw -- doctor ../..
npm --prefix .spw/_workbench run spw -- roots
npm --prefix .spw/_workbench run spw -- tree @spw --depth 3
npm --prefix .spw/_workbench run spw -- select .spw/index.spw --selector navigable --summary
```

Use `tree @workbench --include-workbench` only when the workbench itself is the review target. See [`.spw/conventions/submodule.spw`](../../../.spw/conventions/submodule.spw) for the canonical boundary and [the mounted-consumer review skill](../../../.agents/skills/spw-mounted-consumer-review/SKILL.md) for the evidence protocol.
