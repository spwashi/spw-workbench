# UX Dimensions Audit — Spw Workbench
**Date:** 2026-02-15  
**Scope:** 10 UX dimensions scored across 3 interaction states  
**Reference:** [`ux-dimensions.md`](/docs/design/ux-dimensions.md)

---

## Scoring Method

Each dimension is scored **1–5** across three screenshot states:

| State | Description |
|-------|-------------|
| **S1** | Normal/Editing mode — Context Engine with System State table, mode buttons |
| **S2** | Normal/Fine — Context panel with empty registers, layer key, targets |
| **S3** | Command mode — `/` command bar active, targets populated, registers shown |

**Scale:** 1 = failing, 2 = weak, 3 = adequate, 4 = strong, 5 = exemplary

---

## Scores

### 1. Expressiveness

| State | Score | Evidence |
|-------|-------|----------|
| S1 | **4** | System State table is rich — 8 key-value pairs with labeled rows. Mode buttons use color fills. Detail Level UI is present. Temperature-coded modal context is visible. |
| S2 | **2** | Panel drops to empty registers and a passive Layer Key. Almost no active signaling — the interface goes quiet. |
| S3 | **4** | Command bar appears, targets populate with path context, COPY/PASTE badge emerges. Interface becomes highly communicative. |

**Average: 3.3** · **Bottleneck:** S2 empty state is inexpressive — it reads as "nothing here" rather than "ready."

**Recommendation:** Add dormant-opacity contextual hint text to empty register slots and unpopulated target areas (e.g., `"y to yank"` at `--spw-attention-dormant-opacity`).

---

### 2. Alignment

| State | Score | Evidence |
|-------|-------|----------|
| S1 | **5** | Three-column grid is exact. Panel headers align horizontally. Badge rows (`EDIT·BAS`, `FINE`, `TECHNICAL T…`) use consistent pill styling across all three panels. |
| S2 | **4** | Register slots use consistent vertical rhythm (numbered 0–3, each at equal height). But the `TARGETS` section label sits slightly above the register section without a clear divider. |
| S3 | **4** | Command bar aligns to footer. Target path and register entries maintain left-alignment. Sidebar action labels expand cleanly. |

**Average: 4.3** · **Bottleneck:** Minor — targets and registers could benefit from a subtle horizontal rule or spacing differentiation.

**Recommendation:** Add a `1px` separator or `8px` gap between the Targets and Registers sections in the Context panel.

---

### 3. Register Utility

| State | Score | Evidence |
|-------|-------|----------|
| S1 | **1** | Registers are not visible in this view (System State table dominates). |
| S2 | **1** | Registers are visible but all show `EMPTY` / `_`. Zero utility — no data, no affordance. |
| S3 | **2** | Targets show path context (`region:editor > app > f…`) but registers remain empty. Utility improves for targets, not registers. |

**Average: 1.3** · **Bottleneck:** Registers never auto-populate from parse/selection events. They're a dormant feature.

**Recommendation:** 
1. Auto-populate register `"0"` with the most recent parse output's root node label
2. Auto-populate register `"!"` when an operator node is selected in the inspector
3. Show the register's `kind` badge (e.g., `node`, `text`, `landmark`) alongside the value

---

### 4. Register Clarity

| State | Score | Evidence |
|-------|-------|----------|
| S1 | **N/A** | Not visible |
| S2 | **2** | `EMPTY` text with `_` placeholder. Labels are present (0, 1, 2, 3) but communicate nothing about what would fill them. The `EMPTY` keyword is technically clear but offers no affordance. |
| S3 | **3** | Target path is visible but truncated (`region:editor > app > f…`). The `TEXT | ACTION | PATH | REGISTER` sub-tabs in the targets section add clarity about what kind of data targets can hold. |

**Average: 2.5** · **Bottleneck:** Empty-state rendering is inert. Truncation hides the most specific part of paths.

**Recommendation:**
1. Replace `EMPTY` / `_` with contextual prompts: `"y to yank"`, `"\"a to set"`, or `"select to fill"`
2. Apply `direction: rtl` truncation so the *leaf* of a path is shown, not the root
3. Add `title` attribute with full path for hover reveal

---

### 5. Interface as Prompt

| State | Score | Evidence |
|-------|-------|----------|
| S1 | **4** | Mode buttons (Visual, Editing, Reporting, Debug, Design) clearly prompt action. `ARROWS/HOME/END · ESC NEXT` badge is an excellent inline navigation prompt. Detail Level control communicates adjustability. |
| S2 | **3** | Layer Key (`FINE | TOKEN TAB`, `MEDIUM | BLOCK TAB`, `COARSE | REGION TAB`) successfully maps layers to actions — it's a reference card. But `CONTEXTUAL BINDINGS · AUTO-FILTERED BY STATE` is informational, not actionable. |
| S3 | **5** | The `/` command bar is the literal interface-as-prompt — `Search or command` placeholder text. `COPY/PASTE` badge appears. Target sub-tabs (`TEXT | ACTION | PATH | REGISTER ⓘ`) prompt the user to select a target type. |

**Average: 4.0** · **Bottleneck:** S2 passive state doesn't prompt — the Layer Key informs but doesn't invite action.

**Recommendation:** Add a subtle hover effect to Layer Key items that reveals "Press Ctrl+1/2/3 to switch." Transform the reference card into an interactive prompt.

---

### 6. Vim Navigation

| State | Score | Evidence |
|-------|-------|----------|
| S1 | **4** | Footer status bar shows `xode normal [y:yank p:put]` — clear vim mode indicator with available operators. |
| S2 | **4** | Same vim indicators present. `NAVIGATION ACTIONS` section visible but empty in screenshot. |
| S3 | **5** | Command mode entered via `/` — the vim-native search prefix. Full command bar with history navigation (↑/↓), autocomplete (Tab), and register select (`"a`). |

**Average: 4.3** · **No critical issues.** The vim model is mature and well-exposed.

**Recommendation:** Ensure `NAVIGATION ACTIONS` section populates with available vim verbs for the current mode (e.g., in normal mode: `y yank · p paste · d delete · c change`).

---

### 7. Arrow Navigation

| State | Score | Evidence |
|-------|-------|----------|
| S1 | **4** | `ARROWS/HOME/END` badge on Active Context section explicitly advertises arrow-key navigation. |
| S2 | **4** | Same badge. Navigation Actions section visible. |
| S3 | **4** | Arrow keys used for command history navigation (↑/↓ in command bar). |

**Average: 4.0** · **Adequate across all states.**

**Recommendation:** Add `aria-expanded` and Left/Right expand/collapse to AST tree items (per `keyboard-navigation-design.md` §5).

---

### 8. Tab Navigation

| State | Score | Evidence |
|-------|-------|----------|
| S1 | **4** | Panel header tabs (`EDIT·BAS`, `FINE`, `TECHNICAL T…`) across all three panels. Inspector sub-tabs (`TOKENS 1`, `→FLOW 2`, `↕ AST 3`). |
| S2 | **4** | Same tab structure. No visible issues with tab ordering. |
| S3 | **4** | Additional sub-tabs appear on targets: `TEXT | ACTION | PATH | REGISTER`. Tab structure deepens in command mode. |

**Average: 4.0** · **Consistent across states.**

**Recommendation:** Implement layer-dependent tab scoping (Fine = sticky within region, Medium = permeable, per `keyboard-navigation-design.md` §2).

---

### 9. Level of Detail

| State | Score | Evidence |
|-------|-------|----------|
| S1 | **4** | Full System State table (8 properties), mode buttons, Detail Level slider. Appropriate for "editing" context. |
| S2 | **3** | Fine LoD selected but content is sparse — registers are empty, targets are empty. The *potential* for detail is high but realized detail is low. |
| S3 | **4** | Targets populate with path context. More elements become visible (COPY/PASTE badge, sub-tabs). Detail increases meaningfully with command mode entry. |

**Average: 3.7** · **Bottleneck:** S2 at Fine LoD shows potential, not actual detail. "Fine" should mean "show me everything about this region" — if registers are empty, that should be communicated as "no data yet" with structure, not as blank slots.

**Recommendation:** At Fine LoD, empty registers should show their type (`named`, `history`, `operator`), expected source, and last-populated timestamp.

---

### 10. Level of Noise

| State | Score | Evidence |
|-------|-------|----------|
| S1 | **3** | Moderate — System State table competes with mode buttons and Detail Level control for attention. The "Editing" button (finding T-1) has near-invisible contrast, which is noise-by-absence (you *should* notice it but can't). |
| S2 | **4** | Low noise — empty registers are visually quiet. Layer Key is compact. But the `EMPTY` labels are noise without utility — they occupy space without communicating. |
| S3 | **3** | Higher noise — more populated elements, truncated paths, sub-tabs, COPY/PASTE badge. Justified by utility increase, but the target path truncation (`> f…`) creates ambiguity noise. |

**Average: 3.3** · **Key insight:** Noise is lowest when utility is lowest (S2). The challenge is maintaining low noise when utility scales up (S3).

**Recommendation:**
1. Fix "Editing" button contrast (T-1) — noise-by-absence is worse than noise-by-presence
2. Apply `--spw-attention-dormant-opacity` to empty register labels instead of full-opacity `EMPTY`
3. Use progressive disclosure for target sub-tabs — collapse to icons at narrow widths

---

## Summary Scoreboard

| Dimension | S1 | S2 | S3 | Avg | Status |
|-----------|----|----|-----|-----|--------|
| Expressiveness | 4 | 2 | 4 | **3.3** | 🟡 Empty-state gap |
| Alignment | 5 | 4 | 4 | **4.3** | ✅ Strong |
| Register Utility | 1 | 1 | 2 | **1.3** | 🔴 Dormant feature |
| Register Clarity | — | 2 | 3 | **2.5** | 🔴 Inert placeholders |
| Interface as Prompt | 4 | 3 | 5 | **4.0** | ✅ Strong |
| Vim Navigation | 4 | 4 | 5 | **4.3** | ✅ Mature |
| Arrow Navigation | 4 | 4 | 4 | **4.0** | ✅ Adequate |
| Tab Navigation | 4 | 4 | 4 | **4.0** | ✅ Consistent |
| Level of Detail | 4 | 3 | 4 | **3.7** | 🟡 Sparse at Fine |
| Level of Noise | 3 | 4 | 3 | **3.3** | 🟡 Scales with utility |

**Overall: 3.5 / 5.0**

---

## Priority Actions

| Priority | Action | Dimensions Improved | Existing Finding |
|----------|--------|---------------------|------------------|
| 🔴 P0 | Fix "Editing" button contrast | Noise, Expressiveness | T-1 |
| 🔴 P0 | Replace register `EMPTY`/`_` with contextual prompts | Reg. Clarity, Prompt, Noise | — |
| 🟡 P1 | Add `title` + RTL truncation for target paths | Reg. Clarity, Detail | — |
| 🟡 P1 | Auto-populate default register from parse events | Reg. Utility | — |
| 🟡 P1 | Add targets/registers section separator | Alignment | — |
| 🟡 P2 | Populate Navigation Actions with current-mode verbs | Vim Nav, Prompt | — |
| 🟡 P2 | Hover effects on Layer Key items | Prompt | — |
| 🟢 P3 | Fine LoD register metadata (type, source, timestamp) | Detail, Utility | — |
| 🟢 P3 | Layer-dependent tab scoping | Tab Nav | — |
