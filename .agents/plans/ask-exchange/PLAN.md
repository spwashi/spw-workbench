# Plan: ask-exchange

Every ask a mounted consumer files reaches one intake, each with a home plan and a status. A check reads the consumer's ask files by path and reports what has drifted. The workbench's replies reach the consumer on its next pin, and the workbench never names the consumer. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

A mounted consumer has filed dozens of asks since 2026-10-11, in one file per theme with the same slots in the same order. This repo takes them in through four tables in four shapes:
- first-plugin `^["intake"]` (the plugin asks, ranks 1 to 17);
- inquiry-loop `^["intake"]` (the capability asks);
- ground-edge-reading `^["intake"]` (the motions asks);
- the status table in vscode-lsp-roadmap PLAN.md (the 2026-10-12 review).

No table reads another, so nothing catches drift:
- **A misroute:** the motions asks were sent to spw-beat-diff-precipitation after it had been rescoped, and stayed unread for ten days.
- **Stale status:** five rows sat stale in the roadmap table after their work landed.
- **Unseen asks:** a dozen asks filed after 2026-10-25 reached no table until a person read the consumer tree.

This plan makes the intake one file and gives it a check. onboarding-quest's `?[asks_transport]` asked how asks should travel. The answer here: the consumer keeps its asks, the workbench keeps a status per ask id, and a verb compares the two.

Taste note:
- containment:
  - the consumer owns its asks;
  - the workbench owns only the home and status of each;
  - no domain, owner or deploy target is named, as mounted-consumer-tooling and ecosystem-surface-governance require.
- correctness: a home that is archived, dormant or rescoped is reported, not trusted.

## Scope

- In scope:
  - one intake file;
  - one replies file;
  - an asks check that reads a consumer's ask files by explicit path;
  - moving the four tables' rows into the intake, with the plans citing rows.
- Out of scope:
  - an issue tracker;
  - writing into the consumer tree;
  - ranking the consumer's asks for it.

## Files

[NEW] .spw/exchange/intake.spw
[NEW] .spw/exchange/replies.spw
[NEW] an asks check under packages/spw-cli/src (verb home per ?[verb_home])
[MOD] .agents/plans/first-plugin/wip.spw, .agents/plans/inquiry-loop/wip.spw, .agents/plans/ground-edge-reading/wip.spw (intake frames become citations)
[MOD] .agents/plans/vscode-lsp-roadmap/PLAN.md (table becomes a citation)

## Commits

1. ~[intake_shape]
2. ~[asks_check_fixture]
3. ~[asks_check]
4. ~[intake_moves]
5. ~[replies_file]

## Dependencies

- `?[ask_key]` before commit 1.
- Commit 4 lands after the consumer's next pin bump, so the plans it cites read the same intake the consumer does.

## Failure Modes

- Hard: the intake names the consumer, or copies its ask text.
- Soft: two sources of status again, if a plan keeps its own table after `intake_moves`.

## Validation

- Hypothesis: run on the consumer's ask tree as of 2026-11-06, the check finds:
  - the motions misroute (home rescoped);
  - the axis-canon route to a dormant plan;
  - every ask with no intake row.
- Negative control: an ask whose home plan is active and whose status matches reports nothing.
- Demo sequence:
  1. Check: drift listed.
  2. Route each ask.
  3. Check: clean.
  4. The consumer bumps its pin and reads the replies.
