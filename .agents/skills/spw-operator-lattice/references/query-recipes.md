# Query Recipes

## Lattice Symmetry Sweep

```bash
npm run spw:ls -- --seq '?~@&*^' --braces '<>{}' --model lattice --root .spw --top 30
```

Use when evaluating phase symmetry and brace consistency.

## Intrinsic Label Probe

```bash
npm run spw:ls -- --seq '?_query' --label query --model fluid --root .spw --top 20
```

Use when exploring labeled dispositions (`?_query`, `{_x ... }_x`).

## Memory-Lattice Replay Loop

```bash
npm run spw:mem:dump -- --dump-root /tmp/spw-mem-dumps --label before-loop --include-extra
npm run spw:ls -- --seq '?~@&*^' --root .spw --top 15
npm run spw:mem:load -- --dump-root /tmp/spw-mem-dumps --wipe
```

## Liminal Probe Sequence

```bash
npm run spw:ls -- --seq '?~@' --probe '?(subject).[' --equiv soft --model lattice --root .spw --top 20
```

Use when testing concept priming versus material realization across block contexts.

## Dangling Register Merge

```bash
npm run spw:ls -- --seq '?~&' --equiv soft --root .spw --top 20
```

Use when uncompleted scripts should surface as dangling registers that `&` may reference.

Use when comparing semantic projections across repeated runs.
