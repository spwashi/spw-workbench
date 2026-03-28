# Site-Install Release Story

This note explains why the current public shape of Spw `v0.3.0` is a site mounting the workbench at `.spw/_workbench` instead of treating npm publish as the primary release event.

The short version is simple: the submodule model says what is true right now.

## What `v0.3.0` Can Honestly Claim

At `v0.3.0`, Spw can already support this relationship:

- a site owns its own `.spw/` canon
- the workbench is mounted at `.spw/_workbench` as infrastructure
- parser, runtime, CLI, LSP, spec library, and agent tooling resolve from that mounted workbench
- the site records its engagement in `.spw/mount.spw`

That is a real install model, not a placeholder.

## Why The Release Is Not Framed As npm-First

An npm-first story would imply a cleaner package-consumer relationship than the repo currently wants to promise.

The submodule model is more honest for this phase because it is:

- visible: the relationship between site and workbench is explicit in the repo tree
- versionable: the site can pin the mounted workbench to a commit or release tag
- reversible: removing `_workbench` does not destroy the site's own `.spw/` canon
- layered: site surfaces stay site-authored while engine surfaces stay engine-owned

npm packages may still become a convenience layer later. They are not the truth gate for this release.

## The Boundary This Release Defends

The important asymmetry is:

- the site owns `.spw/index.spw`, `.spw/workspace.spw`, and `.spw/mount.spw`
- the workbench owns `.spw/_workbench`

That boundary matters because it prevents an external site from being narrated as "just another checkout of the workbench." The site remains a separate codebase with its own identity, conventions, and publishing intent.

## Why `mount.spw` Matters

`.spw/mount.spw` is the contract that keeps the install story explicit instead of folkloric.

It records:

- which workbench version the site is tracking
- which surfaces the site is engaging
- which resolution paths point at spec, CLI, and LSP roots

That turns install from a pile of relative-path assumptions into a named boundary that runtime, CLI, editor tooling, and docs can all repeat consistently.

## What An External Adopter Learns

The release story should make these things easier to understand:

- Spw does not require a site to surrender its `.spw/` identity to a package manager
- `_workbench` is infrastructure, not site content
- `spw:init` and `spw:doctor` are there to seed and verify that boundary
- future convenience wrappers can get shorter without changing the underlying model

This is a stronger public claim than "there are packages in the repo now," because it describes how another codebase can actually engage the work.

## What Stays Future Work

This release story should stay narrower than these future possibilities:

- npm distribution as the primary install path
- site-local wrappers that hide the mounted workbench path completely
- broader governance metadata about which surfaces are fully launch-ready
- richer editor auto-detection and cross-surface discoverability

Those may all happen. `v0.3.0` does not need them in order to tell the truth about site install today.

## Release Rule

If the repo says `v0.3.0` is installable, this is the sentence it should be able to defend:

"An external site can mount the Spw workbench at `.spw/_workbench`, initialize a site-owned `.spw/` surface, and resolve parser, runtime, CLI, and LSP behavior through an explicit mount contract."

That is the current public shape. Anything broader should wait until the underlying convenience layer is real.
