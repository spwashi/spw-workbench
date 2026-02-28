# Query Recipes

## Lattice Symmetry Sweep

```bash
npm run spw:seq -- --seq '?~@&*^' --braces '<>{}' --model lattice --root .spw --top 30
```

Use when evaluating phase symmetry and brace consistency.

## Intrinsic Label Probe

```bash
npm run spw:seq -- --seq '?_query' --label query --model fluid --root .spw --top 20
```

Use when exploring labeled dispositions (`?_query`, `{_x ... }_x`).

## Memory-Lattice Replay Loop

```bash
npm run spw:mem:dump -- --dump-root /tmp/spw-mem-dumps --label before-loop --include-extra
npm run spw:seq -- --seq '?~@&*^' --root .spw --top 15
npm run spw:mem:load -- --dump-root /tmp/spw-mem-dumps --wipe
```

Use when comparing semantic projections across repeated runs.
