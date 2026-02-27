# DOM/CSS Testing Harness

This repository now includes a lightweight DOM/CSS harness for feature-level tests.

## Run

- `npm run test:dom` for one-shot execution
- `npm run test:dom:watch` for active development

## What It Covers

- Mounting DOM fixtures in an isolated root
- Injecting test CSS rules per fixture
- Querying fixture-scoped nodes
- Asserting computed style values and CSS custom properties
- Updating HTML/CSS inside a single test probe

## Core API

Import from `src/testing/dom-css-harness.ts`:

- `createDomCssFixture(options)`
  - `options.html` — initial markup
  - `options.css` — initial style rules
  - `options.rootTag` — optional root element tag
  - `options.rootAttributes` — optional attributes for root gating

Returned fixture methods:

- `query(selector)`
- `queryAll(selector)`
- `computedStyle(node)`
- `cssValue(node, property)`
- `setHtml(html)`
- `setCss(css)`
- `cleanup()`

## Usage Pattern

Use one fixture per test and always clean up in `afterEach`. Keep tests focused on observable UI contracts (attribute state, class transitions, custom property values), not implementation internals.
