# Plan: dom-css-test-harness

Lightweight DOM/CSS testing framework for feature development in this repository.

## Goal

Establish a minimal, reliable test surface for DOM behavior and CSS contract checks using the existing TypeScript workflow. This should make it fast to add UI-focused tests without introducing heavy browser infrastructure. The quality target is correctness and containment: tests should assert DOM structure and style signals in a small harness with clear boundaries.

## Scope

- In scope: add test runner config and scripts for DOM/CSS tests, add reusable helpers, add example tests that verify harness behavior.
- Out of scope: full E2E browser automation, visual regression pipelines, broad refactors of existing seed/parser tests.

## Files

[MOD] package.json — add scripts and dev dependencies for DOM/CSS test execution
[MOD?] package-lock.json — lockfile updates if dependencies are installed
[NEW] vitest.config.ts — configure shared DOM test environment
[NEW] src/testing/dom-css-harness.ts — lightweight setup/helper utilities for DOM/CSS assertions
[NEW] src/testing/__tests__/dom-css-harness.test.ts — baseline harness tests
[NEW] docs/design/md/dom-css-testing-harness.md — usage guide and extension notes

Craft guard:
- No file is expected to exceed 600 lines or 12 imports.
- Concept count is constrained by separating config, harness helper, and example tests.

## Commits

1. #[dom-css-tests] — add Vitest DOM environment and scripts
2. ![dom-css-tests] — add lightweight harness utilities and baseline DOM/CSS tests
3. .[dom-css-tests] — document how to write DOM/CSS feature tests

## Agentic Hygiene

- Rebase target: `main@a69e6d5`
- Rebase cadence: before commit 1, before merge
- Hygiene split: none (no out-of-scope drift detected in `main...HEAD`)

## Dependencies

none

## Spw Artifact

Not warranted for this infrastructure-only change.
