# src/runtime (compatibility boundary)

The runtime — register state, interpreter, pipeline, session — lives in
`packages/spw-runtime/src/`, with its tests beside the sources they exercise.

`index.ts` is the one file kept here. It re-exports `packages/spw-runtime/src/index`
for a mounted consumer whose build aliases `.spw/_workbench/src/runtime/index.ts`.
Remove it once that consumer imports the package path.

Naming policy (checked by `npm run lint:v020:runtime` against `packages/spw-runtime/src`):
- runtime filenames use kebab-case
- one concern per file
- no UI/platform imports from runtime core
