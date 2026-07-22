# Worked CLI session (learnability transcript)

Copy-paste friendly session over **docs/examples** and a slice of **theory**.  
All commands are measure-first unless noted.

## 0. Sanity

```bash
npm run spw -- help
npm run spw -- doctor   # if mounted-consumer; skip on bare workbench as needed
```

## 1. Inventory — what exists?

```bash
npm run spw -- invent docs/examples --sort degree -n 15
```

Read: **role** column (`hub` / `leaf` / `orphan` / `source` / `node`), **pRef/rRef**, **sigils**.

Filter warm only:

```bash
npm run spw -- invent docs/examples --role hub
```

JSON for agents:

```bash
npm run spw -- invent docs/examples --json -n 5 | head -c 2000
```

## 2. Topography — who depends on whom?

```bash
npm run spw -- map docs/examples --hubs 8
```

Optional familiarity:

```bash
npm run spw -- map docs/examples --compare docs/theory --hubs 5
```

Look for: **cycle**, **layers**, **broken path targets**, **strands**.

## 3. Formulas — what math language is present?

Catalog (no scan):

```bash
npm run spw -- formula --catalog
```

Scan theory for field language:

```bash
npm run spw -- formula docs/theory/spw --family field --top 12 -n 8
```

## 4. Analyze — multi-selector densities

```bash
npm run spw -- analyze docs/examples --quiet
```

Compare with a single selector:

```bash
npm run spw -- query --from docs/examples --count --selector pathRefs
npm run spw -- query --from docs/examples --skim --selector ops:frame -n 15
```

## 5. Drill — one file

```bash
npm run spw -- skim docs/examples/spw/form-sequence.spw
npm run spw -- select docs/examples/spw/form-sequence.spw --skim --selector all -n 30
```

## 6. Pulse measure (no write)

```bash
npm run spw -- pulse docs/examples/spw/form-sequence.spw --check
```

If JSON:

```bash
npm run spw -- pulse docs/examples/spw/form-sequence.spw --json --check | head -c 1500
```

## 7. Templates (expand ≠ mutate)

```bash
npm run spw -- emit holes docs/examples/spw/template-holes.spw
npm run spw -- emit expand docs/examples/spw/template-holes.spw \
  --bind title="Learn Spw" --bind claim="measure first"
```

## 8. Memory surface

```bash
npm run spw -- mem status
```

## 9. Editor probes (optional)

With LSP running on a buffer:

- VS Code command palette: **Spw: Show Operator Frequency**
- Neovim: `:SpwOperatorFreq` on the same file

## What “good” looks like

| Step | You can answer |
|------|----------------|
| invent | Which example files are hubs? |
| map | Any broken refs? Cyclic? |
| formula | Is field language concentrated in theory? |
| analyze | Which selector is densest? |
| pulse | Would layout_canonical change anything? |
| expand | Which slots remain open? |

## Next

- Theory depth: `docs/theory/spw/form-ladders.spw`  
- Effect grades: `docs/runtime/md/pulse-mutate-beat.md`  
- Agent constraints: [agent-brief.md](agent-brief.md)
