# Spw Migration Notes

This guide is for repos and contributors who knew Spw as the `v0.2.x` alpha or the earlier lore-era checkout model and need the practical `v0.3.0` shape.

`v0.3.0` is not just a version bump. It is the packages-era boundary: the repo is now a workspace, the install story is site-first, and the workbench is mounted as infrastructure instead of pretending the site and the engine are the same thing.

## What Changed

| Topic | `v0.2.x` / lore-era | `v0.3.0` / packages-era |
|---|---|---|
| Release naming | `v0.2.0-alpha` pre-release language | `v0.3.0` named release line |
| Repo shape | single-package alpha with root-heavy scripts | workspace with explicit package boundaries |
| Core code layout | `src/seed/`, `src/runtime/` | `packages/spw-seed/`, `packages/spw-runtime/`, `packages/spw-cli/`, `packages/spw-lsp/` |
| Site engagement | easy to blur the site and the workbench together | site owns `.spw/`; workbench lives at `.spw/_workbench` |
| Install contract | path folklore and local checkout assumptions | explicit `.spw/mount.spw` contract with version and resolution paths |
| CLI direction | mixed root-script and alias language | canonical public form is `spw <verb>` |

## The New Boundary

The current public shape is:

- your site owns `.spw/index.spw`, `.spw/workspace.spw`, and `.spw/mount.spw`
- the workbench is mounted at `.spw/_workbench`
- parser, runtime, CLI, LSP, spec library, and agent tooling resolve from that mounted workbench

That asymmetry is deliberate. `v0.3.0` treats the workbench as infrastructure that a site engages, not canon that a site has to absorb wholesale.

## If You Already Have A `v0.2.x` Site

Use this sequence from the site root:

```bash
mkdir -p .spw
git submodule add https://github.com/spwashi/spw-workbench .spw/_workbench
cd .spw/_workbench
npm install
npm run spw:init -- ../..
npm run spw:doctor -- ../..
```

What to expect:

- `spw:init` seeds any missing portable scaffold files
- `spw:doctor` verifies the mounted workbench, installed dependencies, and required `.spw/` files
- `.spw/mount.spw` becomes the explicit record of:
  - tracked workbench/spec version
  - engaged surfaces such as `seed`, `runtime`, `cli`, and `lsp`
  - resolution paths for spec, CLI, and LSP roots

## If You Contributed To The Old Checkout

The biggest structural move is from a root-shaped repo to package boundaries:

- `src/seed/` is now `packages/spw-seed/`
- `src/runtime/` is now `packages/spw-runtime/`
- CLI implementation lives in `packages/spw-cli/`
- language-server implementation lives in `packages/spw-lsp/`

The practical rule is simple: prefer package-owned entrypoints and package-owned imports over reaching through the repo as if it were still one undifferentiated alpha surface.

## CLI Renames And Compatibility

The public command direction is now `spw <verb>`.

Use these as the canonical forms in docs, examples, and wrappers:

- `spw init`
- `spw doctor`
- `spw query`
- `spw select`
- `spw ls`

Compatibility still exists for migration paths:

- `spw install` is an alias for `spw init`
- `spwq` is an alias for `spw select`

Keep the aliases for muscle memory. Do not make them the primary teaching surface for `v0.3.0`.

## What Did Not Change

- Spw is still source-first; checkouts remain the truthful development surface
- `.spw/` is still the workspace root for site canon
- the parser/runtime/editor stack is still the core engagement path
- the release is still intentionally narrower than a full npm-first packaging story

## Migration Checklist

1. Move your mental model from "clone the whole thing and work inside it" to "mount the workbench under `.spw/_workbench`."
2. Update any scripts or docs that still teach `spwq` or `spw install` as the primary interface.
3. Ensure your site has `.spw/index.spw`, `.spw/workspace.spw`, and `.spw/mount.spw`.
4. Verify `.spw/mount.spw` tracks the mounted `0.3.0` workbench and its resolution paths.
5. Run `npm --prefix .spw/_workbench run spw -- doctor .` from the site root, or `npm run spw:doctor -- ../..` from inside `.spw/_workbench`.

## A Good `v0.3.0` Outcome

After migration:

- the site remains legible without treating the workbench as local content
- the mount contract makes version and tool resolution explicit
- external docs can teach one install path truthfully
- future CLI wrappers can get shorter without changing the underlying boundary
