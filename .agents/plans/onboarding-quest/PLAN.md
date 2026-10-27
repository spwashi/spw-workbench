# Plan: onboarding-quest

A newcomer meets Spw by playing in it. One quest, written once in `docs/learn/quest.spw`, is drawn by every host: spw.quest, `spw quest` in a terminal, the VS Code walkthrough, the WebStorm start action and `:SpwQuest` in Neovim. Then `spw init --preset quest` gives the newcomer a `.spw/quest/` folder to play in.

## Goal

Onboarding should invite play with the syntax, not explain it. One open question runs through the playground: should `door~` bind to `door` the way `~door` does? A reader forks the form, sees what the parser read, moves the claim from felt to proposed to measured, wonders with a probe, and ends with an ask the workbench can act on. The asks shape (rank, claim, exists, gap, measured, recommendation, replaces, probe, question) is the one a mounted consumer already uses for its upstream review.

## Surfaces

| Surface | Where | Landed |
|---------|-------|--------|
| Quest source | `docs/learn/quest.spw` | quest_source |
| Checks and reader names | `packages/spw-seed/src/learn` | quest_cli_scaffold |
| Terminal and scaffold | `spw quest`, `spw init` grow frame | quest_cli_scaffold |
| VS Code | Get started walkthrough | vscode_walkthrough |
| WebStorm | Start the Spw quest action, first-run balloon | webstorm_quest |
| Neovim | `:SpwQuest` panels, `:SpwQuest check` | neovim-spw-surfaces quest_command (1bb4f68d) |
| Playground | `spw init --preset quest` → `.spw/quest/` | play_preset |
| spw.quest | site repo, `workers/spw-quest` | pin_spw_quest |

## Guards

- Every `try` line and every recorded projection is checked against the live parser by a test; a parser change that moves one fails loudly.
- Experiments cite the syntax catalog by id and carry its status; nothing presents a proposal as implemented.
- Nothing in the quest commits; every surface says to read the diff first.
- Hosts never reorder panels or reword a `try` line; they may show fewer fields.

## Commits

Canonical list: wip.spw ^["commits"] — named; .[name](hash) lines have landed.

## Validation

- `npm run test:cli` (quest, init, quest-preset), `npm run test:seed` (learn), VS Code `src/quest` drift test, WebStorm `sync-quest --check`.
- A scratch consumer: `spw init --preset quest`, then `lint .spw`, `resolve --from .spw`, `measure .spw/quest`.
