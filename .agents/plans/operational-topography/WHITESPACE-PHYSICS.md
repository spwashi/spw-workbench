# Whitespace Physics: Longitudinal Block Familiarity

Date: 2026-07-20

Status: proposed protocol; no participant results have been collected.

## Question

When Spw content and parser-owned structure are held constant, do stable indentation and spacing profiles change how quickly a person can orient, navigate, recognize, and safely edit nested blocks over repeated encounters?

## Hypotheses

- **H1 — stable-profile learning**: repeated exposure to one declared layout profile reduces median time-to-orient and selection error relative to a counterbalanced variable-profile condition.
- **H2 — transfer boundary**: improvement partly transfers to unseen blocks with the same structural category and profile, but less strongly to the same content under an unfamiliar profile.
- **H0**: after controlling for content, structure, task order, and exposure, layout profile does not materially change the measured outcomes.

The experiment does not treat familiarity, emotion, or taste as a property of whitespace. Those are explicit human reports or longitudinal behavioral observations with uncertainty.

## Method

- **Inputs**: small, revision-pinned Spw blocks stratified by AST category, container depth, line count, operator mix, and prior exposure.
- **Eligible variants**: differentials that reparse completely, remain well-nested, preserve the declared structural fingerprint and normalized plan projection, and avoid adjacency-sensitive syntax. A character is not assumed to be “layout-only” merely because it is whitespace.
- **Conditions**:
  1. stable declared profile across pulses;
  2. counterbalanced profile variation across pulses;
  3. unchanged-source control;
  4. unseen-content transfer under a learned profile.
- **Tasks**: locate a named region, identify its parent/container pair, follow one relation, predict the next safe edit, and perform or preview one bounded reindentation.
- **Pulse**: one scheduled exposure-and-measurement episode. A pulse observes; it does not imply a source mutation.
- **Loop**: baseline, repeated exposures, delayed recall, transfer, and optional reversal. Stop on completion, cancellation, error budget, or the declared iteration limit.

Use a within-subject, counterbalanced order when practical. Change one layout variable at a time in the first study; architecture projections and label profiles belong in later experiments.

## Controls

- Same source content and task intent within a comparison pair.
- Same complete parse state, AST category, container pairing, and declared normalized projection.
- Stable editor viewport, font, wrapping, tab policy, and input method within a session.
- Warm-up examples excluded from outcome analysis.
- Order and profile assignments counterbalanced to reduce practice and fatigue effects.
- Negative control: a second application of the same layout profile yields an empty differential.
- Negative control: render-only architecture projections do not alter source, parsed structure, or task answers.

## Metrics

Choose one primary outcome before a run:

- **Primary**: median time from reveal to correct region selection.
- **Secondary behavioral**: navigation actions, wrong-region selections, edit errors, undo count, task completion, delayed structural recall, and transfer accuracy.
- **Explicit reports**: familiarity, confidence, readability, and preference on declared scales, recorded separately from behavioral metrics.
- **Layout covariates**: indent deltas, blank-line cadence, alignment runs, token gaps, block span, container depth, and profile identity.
- **Cost**: parse time, differential construction time, preview latency, and packet size.

Do not combine these into one “fitness” or “taste” number. Report distributions, missing observations, and uncertainty per dimension.

## Instrumentation

Each observation packet should include:

```text
consumerRevision, workbenchRevision, fileContentHash, parserVersion
dialect, layoutProfileHash, differentialHash, sourceSpans, structureFingerprint
taskId, pulseId, sequenceIndex, condition, exposureCount
startMonotonic, durationMs, actions, errors, completion
familiarityReport?, confidenceReport?, preferenceReport?
modelId?, modelCapabilitySnapshot?, promptHash?
```

Use monotonic duration for task timing. Wall-clock timestamps may order observations but do not participate in source or plan identity. Participant identity should be pseudonymous and locally controlled; screen, keystroke, or gaze capture requires separate opt-in.

## Physical Architecture Projection

A “physical codebase architecture” view is a disclosed projection over revision-addressed structure:

- containers become bounded regions;
- nesting becomes one named depth axis;
- references become typed edges;
- layout measures may affect spacing or texture;
- pulse history may affect an observation overlay;
- explicit familiarity reports and behavioral history may color a separate, uncertainty-bearing layer.

The projection must let the user turn each layer off. Distance on screen is not semantic distance unless the projection names and tests that mapping.

## Analysis

- Compare within-person changes from baseline before comparing people.
- Plot the primary outcome by pulse index and condition; retain individual trajectories.
- Treat content, structure category, depth, prior exposure, and task order as covariates or stratification axes.
- Report effect sizes and intervals; do not promote an interesting visualization to a semantic invariant.
- Inspect errors and counterexamples, especially blocks whose parse-equivalent layouts do not feel or perform similarly.

## Falsification

- Reject H1 if stable-profile exposure does not outperform the counterbalanced variable-profile condition under the preregistered primary outcome.
- Reject a “layout-only” differential if parse completeness, well-nestedness, structural fingerprint, reference resolution, or declared plan identity changes.
- Reject the architecture projection if it obscures the source span or causes users to confuse rendered distance with semantic distance.
- Treat familiarity reports and performance as distinct if they diverge; neither silently substitutes for the other.

## Results

Not run. Record raw observations append-only; corrections create new observations linked to the superseded record.

## Next Steps

1. Implement a parser-owned structure fingerprint and complete/recovered/invalid parse state.
2. Expose a pure layout differential preview with document-version and content-hash preconditions.
3. Build three tiny fixture families with matched structure and controlled layout variants.
4. Run a self-study pilot to estimate task duration and remove ambiguous tasks.
5. Only then consider paired-label or architecture-projection conditions.

## Repro

Current checks:

```bash
npm run lint:spw
npm run test:seed
npm run spw:format -- --check
```

The planned differential-preview and experiment-run commands do not exist yet. Add their exact invocations, revisions, profiles, and fixture hashes before recording results.
