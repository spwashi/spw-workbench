# Attention Token Audit — 2026-02-06

## 1) Findings (token consumption + mismatches)

- Attention token **definitions exist** in:
  - `src/styles/tokens.css:316`
  - `src/styles/themes/atelier.css:52`
  - `src/styles/themes/nebula.css:40`
  - `src/styles/themes/stages.css:93`
- Attention token **consumption is real but narrow**:
  - mostly `src/styles/panels.css:97` and `src/features/keyboard/components/keybinding-geology.css:104`
  - very limited usage outside panel/chip/readout surfaces.
- Core mismatch: several tokens are defined but not consumed in runtime CSS:
  - `--spw-attention-focus-border`, `--spw-attention-active-glow`
  - most `--spw-attention-saturation-*`, `--spw-attention-pulse-*`, `--spw-attention-layer-*`, `--spw-attention-contrast-*`, `--spw-attention-scale-*`
  - Evidence: only definitions found in `src/styles/tokens.css`, no `var(--token)` consumption in runtime selectors.
- Current dimming stack is over-composed:
  - region-level opacity/filter (`src/styles/state.css:709`)
  - stage optics (`src/styles/themes/stages.css:65`, `src/styles/themes/stages.css:93`)
  - plus panel state overlays (`src/styles/panels.css:925`)
  - This explains reported over-dimming in Stage 2/3.
- LoD is semantically wired through `data-lod` and `data-spw-layer` (`src/core/layers/layers.ts:248`), but visual affordance is still mostly panel indicator/chip driven, not globally reinforced.
- Attention owner pipeline is coherent in state:
  - `focus > selection > action > background` via attention levels (`src/infra/state/state.ts:451`)
  - emits event `spw-attention-shift` (`src/infra/state/state.ts:606`)
  - audio soft-tick bridge exists (`src/features/audio/interaction-sounds.ts:144`).

## 2) Attention Token Consumption Map (table)

| Token | Consumed by (CSS property) | Selector/component | Region | Perspective relevance | Notes |
|---|---|---|---|---|---|
| `--spw-attention-ambient-opacity` | `opacity` | `.panel-lod-indicator` | editor/inspector/context headers | medium | `src/styles/panels.css:109`; token defined in theme+stage files. |
| `--spw-attention-tertiary-opacity` | `opacity` | `.panel-genre-indicator` | editor/inspector/context headers | medium | `src/styles/panels.css:127`; active state overrides to primary opacity. |
| `--spw-attention-secondary-opacity` | `opacity` | active `.panel-lod-indicator`; geology headings/labels | context-heavy + panel headers | high | `src/styles/panels.css:155`, `src/features/keyboard/components/keybinding-geology.css:114,170,178,192`. |
| `--spw-attention-primary-opacity` | `opacity` | active genre tag / action btn hover | panel header + geology actions | medium | `src/styles/panels.css:161`, `src/features/keyboard/components/keybinding-geology.css:152`. |
| `--spw-attention-focus-glow` | `box-shadow` | active/focused `.panel-lod-indicator` | panel headers | medium | `src/styles/panels.css:156`. |
| `--spw-attention-hover-glow` | `box-shadow` | active/focused `.panel-genre-indicator` | panel headers | medium | `src/styles/panels.css:162`. |
| `--spw-attention-weight-medium` | `font-weight` | indicators + hint labels + geology labels | all visible regions | medium | `src/styles/panels.css:102,1053`; `src/features/keyboard/components/keybinding-geology.css:110,145,168,176`. |
| `--spw-attention-weight-bold` | `font-weight` | `.geology-title` | context panel | low | `src/features/keyboard/components/keybinding-geology.css:127`. |
| `--spw-attention-transition-quick` | `transition` | `.geology-action-btn` | context panel | low | `src/features/keyboard/components/keybinding-geology.css:147`. |
| `--spw-attention-transition-normal` | `transition` | panel indicators | panel headers | medium | `src/styles/panels.css:113,133`. |
| `--spw-attention-dormant-opacity` | `opacity` | `.hint-divider` | footer hint | low | `src/styles/panels.css:1071`. |
| `--spw-attention-focus-border` | **not consumed** | n/a | n/a | n/a | Defined in `src/styles/tokens.css:324`; no runtime `var()` reference found. |
| `--spw-attention-active-glow` | **not consumed** | n/a | n/a | n/a | Defined in `src/styles/tokens.css:326`; no runtime `var()` reference found. |
| `--spw-attention-saturation-*` | **not consumed** | n/a | n/a | n/a | Defined in `src/styles/tokens.css:329`; no runtime usage found. |
| `--spw-attention-pulse-*` | **not consumed** | n/a | n/a | n/a | Defined in `src/styles/tokens.css:335`; no runtime usage found. |
| `--spw-attention-layer-*` | **not consumed** | n/a | n/a | n/a | Defined in `src/styles/tokens.css:341`; no runtime usage found. |
| `--spw-attention-contrast-*` | **not consumed** | n/a | n/a | n/a | Defined in `src/styles/tokens.css:348`; no runtime usage found. |
| `--spw-attention-scale-*` | **not consumed** | n/a | n/a | n/a | Defined in `src/styles/tokens.css:360`; no runtime usage found. |

## 3) Testing Guide Verification (PASS/FAIL/PARTIAL with evidence)

### Claim A: Panel indicators use `--spw-attention-ambient-opacity`
- **PASS**
- Evidence:
  - `src/styles/panels.css:97` defines `.panel-lod-indicator`
  - `src/styles/panels.css:109` consumes `opacity: var(--spw-attention-ambient-opacity, 0.45)`
  - Indicators exist in DOM: `index.html:101,167,228`

### Claim B: Genre labels use `--spw-attention-tertiary-opacity`
- **PASS (with active-state override)**
- Evidence:
  - base: `src/styles/panels.css:127` (`--spw-attention-tertiary-opacity`)
  - active/focus override: `src/styles/panels.css:161` (`--spw-attention-primary-opacity`)
  - genre label content updates by JS: `src/publishing/genre/manager.ts:406`

### Claim C: Context labels use `--spw-attention-secondary-opacity`
- **PARTIAL / EFFECTIVELY FAIL for currently rendered state labels**
- Evidence:
  - class definitions exist and consume token:
    - `src/features/keyboard/components/keybinding-geology.css:165,173,188`  
  - but no template usage found for these classes in render output:
    - no matches in `src/features/keyboard/components/keybinding-geology.ts`
  - rendered “State” section currently uses `renderStateItem(...)` (`src/features/keyboard/components/keybinding-geology.ts:634`) and appears not mapped to those classnames.
- Minimal fix:
  - wire `renderStateItem()` label/value classes to attention token classes (or re-map section CSS to actual emitted selectors).

### Claim D: Theme/stage transitions are smooth
- **PARTIAL**
- Evidence:
  - Theme transitions have explicit transition orchestration:
    - theme cascade styles: `src/design/themes/theme-bus.ts:265`
    - liminal transition state styles: `src/styles/themes/liminal.css:21`
    - theme apply with duration: `src/platform/bootstrap/settings.ts:214`
  - Stage transitions rely mostly on variable swaps + downstream transitions:
    - stage token swap: `src/styles/themes/stages.css:9,37,65,93`
    - region transition channels: `src/styles/state.css:118`
  - but dimming and inactive filters stack aggressively:
    - `src/styles/state.css:709`
    - `src/styles/panels.css:925`
  - This produces perceived harshness/non-smoothness at higher stages.
- Minimal fix:
  - clamp inactive opacity and grayscale for `data-attention-level="0/1"` and ensure level `2/3` bypasses stage dim.

## 4) Signal Strength Plan (stage/perspective/region cues, accessibility notes)

### Stage-gated cue channels (multi-channel, not opacity-only)

| Stage | Channels enabled | Rule |
|---|---|---|
| 0 Functional | border + minimal opacity delta | no blur/grain amplification; speed-first |
| 1 Atmospheric | + subtle tint + light glow | maintain AA text contrast in all active regions |
| 2 Instrumental | + texture + micro-motion + audio tick | increase region separation, not global darkness |
| 3 Poetic | + strongest tint/glow + optional shader reaction | preserve focused region at full contrast; background dim only |

### Perspective → primary region mapping

| Perspective | Primary | Secondary | Tertiary |
|---|---|---|---|
| Visual | Context | Editor | Inspector |
| Editing | Editor | Inspector | Context |
| Reporting | Context | Inspector | Editor |
| Debug | Inspector | Editor | Context |
| Design | Context | Editor | Inspector |
| Teach | Context | Inspector | Editor |
| Performance | Editor | Context | Inspector |
| Structural/Neutral | Inspector | Context | Editor |

### Accessibility constraints
- Never dim active/focused region below **1.0 opacity**.
- Clamp non-focused opacity floor to **>= 0.78**.
- Respect `prefers-reduced-motion`: disable micro-motion and pulse, keep color/border cues.
- Keep text contrast at least AA for secondary labels in all stages.
- Avoid hue-only status coding; pair with border style/icon/weight.

### Fast implementation notes
- Bind perspective to region priority in state (not only style).
- Use attention levels as sole dimming source; stage contributes ambience only.
- Split “ornament” from “focus” token families to prevent accidental coupling.

## 5) Instrumentation Spec (events + metrics + overlay + implementation checklist)

### Event schema (local-first, opt-in)

Use a dedicated local bus (`spw.attn.*`) and keep payloads small:

- `spw.attention.region_focus_change`
  - `{ ts, fromRegion, toRegion, owner, perspective, lod, disclosure, stage, theme }`
- `spw.attention.selection_change`
  - `{ ts, fromRegion, toRegion, selectionKind, lod }`
- `spw.attention.action_target_change`
  - `{ ts, fromRegion, toRegion, actionKind, scope }`
- `spw.attention.perspective_change`
  - `{ ts, from, to, activeRegion, stage, theme }`
- `spw.attention.lod_change`
  - `{ ts, from, to, perspective, activeRegion }`
- `spw.attention.disclosure_change`
  - `{ ts, from, to, guidanceValue }`
- `spw.ui.inspector_tab_change`
  - `{ ts, fromTab, toTab, perspective, lod }`
- `spw.parse.result`
  - `{ ts, status: 'success'|'warn'|'error', errorCount, warningCount, activeRegion }`
- `spw.ui.guidance_change`
  - `{ ts, mode, value, perspective, disclosure }`
- `spw.ui.stage_change`
  - `{ ts, from, to, theme }`
- `spw.ui.theme_change`
  - `{ ts, from, to, stage }`

### Derived metrics (computed locally)
- **Region dwell time**: sum of contiguous intervals by active region.
- **Perspective settling time**: time from perspective switch to first 2s stable focus.
- **Inspector tab efficiency**: tab switches per successful parse cycle.
- **LoD friction delta**: action retries/errors before vs after LoD switch.
- **Disclosure relief index**: reduction in rapid toggles/reversals after guidance/disclosure change.
- **Attention churn**: focus changes/minute with no parse/output progress.

### Storage
- In-memory ring buffer (default 2,000 events).
- Optional “Export session JSON” button.
- No network I/O; no personal content capture by default.
- Optional hashing/redaction for textual identifiers.

### Attention Debug Overlay (opt-in)
- Fixed compact panel:
  - `Theme | Stage | LoD | Disclosure | Perspective`
  - `Focus | Selection | Action | Owner`
  - last 15 events (timestamp + type + compact payload)
  - counters: dwell, churn, parse result tally

### Manual experiment protocol
1. Baseline run: Stage 0, single-channel cues only.
2. Multi-channel run: Stage 2/3 cues enabled.
3. Task script:
   - parse/fix loop
   - switch perspectives by objective
   - inspect AST/TOKENS/FLOW transitions
4. Compare:
   - settling time, churn, parse turnaround, tab efficiency
5. Repeat under reduced motion + performance mode.

### Implementation checklist
- Add `src/infra/attention/attention-bus.ts` (typed local bus).
- Add `src/infra/attention/attention-metrics.ts` (ring buffer + reducers).
- Emit events from existing state transition points (`src/infra/state/state.ts`).
- Add overlay component `src/app/components/attention-debug-overlay.ts`.
- Add settings toggles under diagnostics/appearance:
  - `attention.debugOverlay`
  - `attention.captureEnabled`
  - `attention.captureLimit`
  - `attention.export`.

## 6) Patch List (prioritized, minimal diffs: file → change summary)

1. `src/features/keyboard/components/keybinding-geology.ts`
   - Wire actual emitted state labels/metadata to selectors that consume attention tokens (or emit classes currently defined but unused).
2. `src/features/keyboard/components/keybinding-geology.css`
   - Remove orphan selectors or remap them to rendered markup; keep token-driven opacity/weights aligned.
3. `src/styles/state.css`
   - Make attention level authoritative for dimming:
     - level 3/2 no stage dim
     - level 1/0 stage dim with floor clamps.
4. `src/styles/panels.css`
   - Reduce redundant dim layer on `[data-region-state="inactive"]`; rely on `data-attention-level`.
5. `src/styles/tokens.css`
   - Keep defined-but-unused tokens behind a documented “future” block or remove until consumed to reduce drift.
6. `src/infra/attention/attention-bus.ts` (new)
   - Local-first typed event bus (`spw.attention.*`).
7. `src/infra/attention/attention-metrics.ts` (new)
   - Ring buffer + derived metric reducers + export helper.
8. `src/app/components/attention-debug-overlay.ts` (new)
   - Opt-in diagnostics panel; no network.
9. `src/ui/elements/settings-data.ts` + `src/platform/bootstrap/settings.ts`
   - Add instrumentation toggles and export action.

