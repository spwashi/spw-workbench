# Documentation

## Structure

```
docs/
├── design/           # Design decisions and history
│   ├── goals.md      # Product design goals
│   └── history.md    # Origin story, influences
│
├── lang/             # Spw language documentation
│   └── few-shot.spw.md
│
└── learn/            # Learning paths (future)
```

## Entry Points

- **Complete navigation?** Open `toc.spw` (table of contents)
- **New to Spw?** Start with `lang/few-shot.spw.md`
- **Understanding the architecture?** See `design/goals.md`
- **Need a top-down map?** Read `architecture-map.md`
- **Curious about origins?** Read `design/history.md`
- **Need the full map?** Open `index.spw`
- **Working with feature flags?** See `feature-registry.spw`

## Path Syntax

Documentation files use a path topology syntax:

| Syntax | Purpose | Example |
|--------|---------|---------|
| `@name: ~"path"` | Declare named root | `@src: ~"../src"` |
| `@root/path/` | Root-relative dir | `@src/core/` |
| `@root/file.ext` | Root-relative file | `@src/index.ts` |
| `~"./path"` | Local relative ref | `~"./README.md"` |
