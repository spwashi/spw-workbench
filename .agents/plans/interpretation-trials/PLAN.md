# Plan: interpretation-trials

Hold the open readings of Spw's marks as trials the owner runs on purpose. Each trial scores a reading on what it lets a writer say, what an interactive host can do with it, and which linguistic phenomenon it mirrors. (Card, phase, and next move: [wip.spw](./wip.spw) · index: [../index.spw](../index.spw))

## Goal

The owner's direction (2026-11-06): develop Spw to be more useful for novel interactive semantics, and ground that direction in something linguistically expressive.

The 2026-11-06 reading pass raised many questions about what the marks mean, such as:
- a spaced `=`;
- `<…>` before and after a word;
- `( )` applying to a word or to the word with its body;
- slot order;
- joins between lines;
- `|`;
- a wonder's state.

The readers already disagree. Seed, a consumer's slot reader, and factshift.center (an interactive host that lays lines out on a canvas) read the same lines three ways. These are not decisions to rush; they are readings to try.

`interpretation-trials.spw` holds one card per line of wonder. Each card lists:
- the competing readings;
- the forms and minimal pairs to try them on;
- what each reader does today;
- holes for the owner's judgment and answer.

The method is the owner's feature-card play (2026-10-13): write the forms, read each as every reader does, pair forms that differ in one place, and judge each reading ✓ ? or *. A rubric is added on top: expressive, interactive, grounded, and cost.

Taste note:
- grounded: a reading earns grammar when it mirrors how people already mean (copular clauses, case marking, topicalization, question semantics, evidentiality), not when it is merely possible
- interactive: every reading kept names what a host can do with it
- containment: trials decide nothing; a kept reading moves to its home plan as a decision that cites its trial

## Scope

- In scope:
  - the trial cards
  - a bench that prints every reader's reading of a card's forms side by side
  - recording judgments
  - promoting a kept reading to its home plan
- Out of scope:
  - changing the grammar here; brace-slot-reading, syntax-hardware-alignment and the other home plans do that, gated by reading-drift
  - building stages in factshift.center, which belongs to its own repository; this plan records what the workbench would give it

## Files

[NEW] .agents/plans/interpretation-trials/interpretation-trials.spw
[NEW] a trial bench under scripts/analyzers (per ?[bench_readers])

## Commits

1. ~[trial_bench]
2. ~[first_trials]
3. ~[promote_kept_readings]

## Validation

- Hypothesis: on most cards, the readings that score on all three axes are the ones an existing host or consumer already uses. Usage found them first.
- Negative control: a reading that is only possible, grounded in no phenomenon and used by no host, scores low and stays a wonder.
