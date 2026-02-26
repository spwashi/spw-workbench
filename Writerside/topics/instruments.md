# Instruments

An instrument is a tool that makes the system observable.

Instruments are how Boonhonk becomes measurable: you can see where the work is stable,
where it is brittle, and what changed.

## Canon instruments (always expected to work)

- Spw parser validation: `npm run lint:spw`
- Writerside integrity: `npm run lint:writerside`

## Documentation checks

- Canon-safe docs check: `npm run lint:docs`
- Full reference integrity (requires importing more of the workbench source tree): `npm run lint:docs:strict`

## A good instrument

- Has a narrow scope.
- Produces actionable output.
- Can be run repeatedly without ceremony.
