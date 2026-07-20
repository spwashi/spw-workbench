# Site-Install Release Story

This is the current public install claim for `v0.3.0`.

Spw installs into an independent consumer repository by mounting the workbench at `.spw/_workbench`.

The model is simple:

- the site keeps its own `.spw/` canon
- the workbench provides parser, runtime, CLI, LSP, and supporting infrastructure
- `.spw/mount.spw` records the relationship

## Why This Is The Release Model

Because it is explicit, versionable, and operational now.

It gives the site:

- a clear ownership boundary
- a pin-able workbench dependency
- reversible infrastructure
- direct resolution paths for tools and specs

## Boundary

- the site owns `.spw/index.spw`, `.spw/workspace.spw`, and `.spw/mount.spw`
- the workbench owns `.spw/_workbench`

That keeps site canon and workbench infrastructure distinct.

## Role Of `mount.spw`

`.spw/mount.spw` records:

- which workbench version the site tracks
- which surfaces the site engages
- which paths resolve CLI, LSP, and spec roots

It is the installation contract in repo form.

## What This Release Claims

`v0.3.0` supports this sentence:

> An independent consumer can mount the Spw workbench at `.spw/_workbench`, initialize a consumer-owned `.spw/` surface, and resolve parser, runtime, CLI, and LSP behavior through an explicit mount contract.

That is the release surface. Anything broader belongs to a later convenience layer.
