# Spw cheat sheet

## Operators (spirit / acts)

| Sigil | Role (short) |
|-------|----------------|
| `?` | wonder / probe |
| `~` | potential / path / defer |
| `@` | perspective / root shelf |
| `&` | confluence / merge |
| `*` | value / collapse |
| `^` | integrate / frame |
| `!` | action / inject |
| `#` | annotation / resonance |
| `.` | ground / facet |
| `$` | select / address |
| `%` | measure |
| `=` | config / bias |

## Containers (bounds)

| Form | Reading |
|------|---------|
| `[]` | frame / selection |
| `{}` | body / material |
| `()` | scope / hold |
| `<>` | capsule / shell (not digraph `<>` operator) |
| `<<>>` | stream |

## Effect grades (tools)

| Grade | Meaning |
|-------|---------|
| `effect.l0.measure` | plan / report / pulse dry |
| `effect.l1.memory` | in-memory rewrite |
| `effect.l2.workspace` | write files (needs explicit accept) |
| `effect.l3.external` | cross-authority boundary |

## Form sequence (confluence)

```text
&  =>  {&}  =>  {&[#label]}  =>  {&<#tag>_label}
```

- **wrap** materializes merge in a body  
- **annotate / select** attaches `#label` or arms  
- **membrane** adds `<#tag>` + `_label`  
- **reduce** peels layers back toward bare `&`  
- Not a file mutation; mutation automata are separate

## Template holes

| Hole | Meaning |
|------|---------|
| `_` | creative open hole |
| `$name` / `${name}` | named slot |
| `${name=default}` | slot with default |
| `#expand` | fill only |
| `#mutate` | creative axis change |

## CLI sense loop

```bash
spw invent <roots> [--role hub] [--sort degree]
spw map <roots> [--compare other] [--hubs N]
spw formula [roots] [--catalog] [--family field]
spw analyze <roots>
spw geometry <file.spw>           # braces + operators → lessons
spw query --from <dir> --skim -s pathRefs -n 20
spw skim <file.spw>
spw pulse <file> --check          # measure
spw mutate …                      # memory → workspace (guarded)
spw mem status | prune
```

## Geometry (learn form)

```bash
spw geometry docs/examples/spw/form-sequence.spw
# kinds () [] {} <>  · couple/medials · operator % · nesting lessons
```

VS Code: **Spw: Inspect Geometry**; surface decorations (Settings → Spw → Surface).

## Editors

| Client | Probe |
|--------|--------|
| VS Code | Spw: Operator Frequency, Form Sequence, Temperature, Restart LS |
| Neovim | `:SpwOperatorFreq` `:SpwPhase` `:SpwFormSeq` `:SpwTemperature` |
| Comments | `# …` (not `//` as Spw culture) |

## Learn more

- Path: [path.md](path.md)  
- Worked CLI: [worked-cli.md](worked-cli.md)  
- Hub: [README.md](README.md)
