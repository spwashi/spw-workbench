# Interaction Semantics Design — Spw Workbench
**Date:** 2026-02-15  
**Status:** Design Proposal  
**Depends on:** `keyboard-navigation-design.md`, `features/keyboard/registers/register-bank.ts`, `features/keyboard/navigation/action-targets.ts`, `app/spw-workbench.ts`, `app/attention-hint.ts`

---

## Preamble: What This Document Covers

The keyboard navigation design (§1-§6) established *where* focus goes and *how* regions relate. This document addresses the next layer: **what happens once you're there.** It concerns four interlocking interaction patterns:

```
A. Script Editing  ←→  Node Inspection / Transformation / Execution
B. Spw Commands    ←→  Region Actions / Yank-Paste / Cache Config
C. Bracket Delimiters (::before/::after for Spw-native text selection)
D. Spreadsheet-friendly selection and paste semantics
```

These aren't independent features — they form a single **interaction vocabulary** that maps Spw's language-level concepts (operators, frames, modifiers) onto UI-level affordances (selection, clipboard, region action targets).

---

## A. Script Editing ↔ Node Inspection / Transformation / Execution

### The Three Interaction Phases

The workbench supports a workflow where the user moves between three phases of interaction with Spw code. These phases correspond to the existing mode×region×layer axes, but the transitions between them need explicit design.

```
┌─────────────┐    parse    ┌─────────────────┐   transform   ┌───────────────┐
│   EDITING    │ ──────────→│   INSPECTION     │ ────────────→│   EXECUTION    │
│  (Editor)    │            │  (Inspector)     │              │  (Geology)     │
│              │←───────────│                  │←─────────────│                │
│  insert/     │   navigate │  normal/inspect  │    apply     │  stepping/     │
│  normal mode │            │  mode            │              │  transform     │
└─────────────┘            └─────────────────┘              └───────────────┘
```

### Phase A1: Script Editing

**Region:** Editor  
**Modes:** `insert` (typing), `normal` (cursor motions)  
**Primary register:** `"` (default register)

The editor is a `<textarea>` that accepts raw Spw source. On every keystroke (debounced), the input is parsed via `parseInput()` and the AST/token views update.

**Current capabilities:**
- Insert mode for free typing
- Normal mode for vim-like cursor motions
- Source range selection via mouse or visual mode
- Auto-parse on change

**Missing capabilities:**
| Gap | Description | Proposed Solution |
|-----|-------------|-------------------|
| **Structural editing** | No way to manipulate the AST structurally from the editor (e.g., "wrap selection in a frame") | `Space+w` in visual mode → wrap selected text with operator syntax. Selection becomes `![selection]` or `^[selection]` based on operator register. |
| **Inline execution** | No way to execute/evaluate a selection without leaving the editor | `Space+e` → parse selection, evaluate via sheaf, show inline result. Uses the existing `subparseSelectionToSheaf()`. |
| **Template insertion** | No Spw-aware snippet system | `Space+t` → open template picker. Templates are Spw fragments stored in the sheaf. Insert at cursor. |

### Phase A2: Node Inspection

**Region:** Inspector  
**Modes:** `normal` (tree navigation), `inspect` (vim AST motions)  
**Primary view:** AST tree, Token list

The inspector displays the parsed output. The user can navigate the tree, select nodes, and examine their properties.

**Current capabilities:**
- Click/Enter to select a node
- Vim motions (hjkl) in inspect mode to navigate the AST
- Token filtering and search via `highlightTokensByText()`
- Node ↔ Token bidirectional selection highlighting

**Missing capabilities:**
| Gap | Description | Proposed Solution |
|-----|-------------|-------------------|
| **Node yanking** | `y` in inspect mode should yank the selected node's source text + metadata to the register bank | Capture `{ source, semantic, pattern }` representations. The node's operator populates its operator register (e.g., selecting `!boon["hello"]` stores the source in `"` and the pattern in `!`). |
| **Node transformation** | No way to apply a transformation to a selected node and see the result | `t` in inspect mode enters `transform` mode. The transform palette shows applicable transforms. `Enter` applies. |
| **Cross-region paste** | Yanking in inspector, pasting in editor should insert the source representation; yanking in inspector, pasting in geology should insert the pragmatic representation | Register's `representations` field (already defined) selects the right one: `source` for editor, `pragma` for geology, `semantic` for text fields. |

### Phase A3: Execution / Evaluation

**Region:** Geology (Context Engine)  
**Modes:** `stepping` (step through evaluation), `transform` (apply chain)  
**Primary view:** System state, activation context

The geology panel shows the runtime context — registers, environment, evaluation state.

**Missing capabilities:**
| Gap | Description | Proposed Solution |
|-----|-------------|-------------------|
| **Step-through execution** | Can't step through the evaluation of a parsed expression | `Space+s` in geology → begin stepping mode. Each `Enter`/`Space` advances one reduction step. Escape exits. The current step is mirrored in the AST tree (inspector highlights the active node). |
| **Environment injection** | Can't manually set register values or environment bindings | `Space+i` in geology → open injection modal. Type `register = value` to set. Uses `registerBank.set()` under the hood. |
| **Execution result display** | Evaluation results aren't surfaced anywhere | Add an "Output" sub-tab in the inspector that shows the result of the last evaluation. Populated by stepping mode's terminal state. |

### Phase Transitions

The critical ergonomic question: **how does the user move between phases without losing context?**

The register bank is the answer. It's already the shared state bus:

```
Edit → Inspect:  Parse triggers automatically. Selection in editor
                  creates a sourceRange that the inspector can highlight.
                  
Inspect → Edit:   Selecting a node in the inspector highlights the
                  corresponding source range in the editor. Pressing
                  'e' (or Space+2) returns focus to the editor with
                  the cursor at the node's source position.

Inspect → Execute: Yanking a node, switching to geology, and stepping
                    should use the yanked node as the evaluation root.
                    Register "0" always holds the last yank.

Execute → Edit:    The result of evaluation can be pasted into the
                    editor via 'p' in normal mode. The register's
                    'source' representation is used.
```

---

## B. Spw Commands, Region Actions, Yanking/Pasting State, Caching

### The Command Vocabulary

Spw operators (! ^ ~ ? * = @ # .) have 1:1 mappings to dedicated registers in `SPW_OPERATOR_REGISTERS`. This is already built. What's missing is a **command interface** that unifies operator-register semantics with region actions.

### B1: Region-Scoped Actions

The `actionTarget` system (§4 of keyboard-navigation-design) lets the user designate which region receives the next action. Combine this with mode-specific verbs:

```
┌──────────────────────────────────────────────────────┐
│ Mode    │ Verb  │ actionTarget=editor  │ aT=inspector│
├──────────────────────────────────────────────────────┤
│ normal  │ y     │ yank source text     │ yank node   │
│ normal  │ p     │ paste from register  │ n/a         │
│ normal  │ d     │ delete selection     │ deselect    │
│ inspect │ y     │ yank source at node  │ yank node   │
│ inspect │ c     │ change (edit) node   │ n/a         │
│ visual  │ y     │ yank visual sel.     │ yank range  │
│ visual  │ d     │ delete visual sel.   │ deselect    │
│ visual  │ s     │ surround selection   │ n/a         │
│ transform│ w    │ wrap with operator   │ n/a         │
│ transform│ f    │ wrap with frame      │ n/a         │
└──────────────────────────────────────────────────────┘
```

### B2: Yank / Paste State Machine

The yank-paste cycle has implicit states that should be explicit:

```
         ┌────────────────────────────────┐
         │                                │
    ┌────▼────┐      y        ┌───────────┴──┐
    │  IDLE   │──────────────→│  YANKED       │
    │         │               │  register='"' │
    └─────────┘               │  preview=✓    │
         │                    └───────┬───────┘
         │                            │
         │    p (same region)         │  p (cross-region)
         │         ┌──────────────────┘
         │         │
         │    ┌────▼────┐
         │    │  PASTED  │
         │    │  undo=✓  │
         │    └────┬────┘
         │         │
         └─────────┘  (timer or next action resets)
```

**State announcements:**
```typescript
// On yank:
a11y.announceAction(`Yanked: ${preview}. Register: ${registerName}`)

// On paste: 
a11y.announceAction(`Pasted from register ${registerName}`)

// On paste to different region:
a11y.announceAction(`Pasted from ${sourceRegion} to ${targetRegion}`)
```

### B3: Register Preview and Selection

When the user presses `"` (register select prefix), they need to see what's in each register. The existing `listDisplayEntries()` returns this data. What's needed is a **floating register palette** that appears on `"`:

```
┌─────────────────────────────────────┐
│ Register Select                     │
├─────────────────────────────────────┤
│ " │ !boon["hello"] .. @out        │ ← default
│ 0 │ !boon["hello"] .. @out        │ ← last yank
│ 1 │ @out                           │ ← previous
│ ! │ boon                           │ ← Action op register
│ @ │ out                            │ ← Perspective op register
│ a │ (empty)                        │ ← named register
└─────────────────────────────────────┘
```

Press the register key to select it, then `y` or `p` to yank into or paste from it.

### B4: Caching Configuration

Parse results are cached via `parseInput()`'s input comparison (`if (input === state.input && state.output)`). This is invisible to the user. Surface it:

**Cache indicators:**
- Footer badge: `cached` / `stale` / `forced`
- `Space+c` → toggle cache behavior:
  1. **Auto** (default): Cache until input changes
  2. **Force**: Always reparse (`{ force: true }`)
  3. **Freeze**: Keep current parse even if input changes (useful for comparing edit with previous parse)

**Register for cache state:**
```typescript
registerBank.set('_cache', {
  value: cacheMode,
  kind: 'environment',
  label: 'Parse cache',
  environmentId: 'parse-cache',
  representations: {
    source: cacheMode,
    semantic: `Parse caching: ${cacheMode}`,
    pragma: `~#cache: "${cacheMode}"`,
  },
})
```

This means caching config is yank-able and paste-able — you can capture a cache configuration and apply it elsewhere, treating configuration as first-class data.

---

## C. Bracket Delimiters — `::before` / `::after` for Spw-Native Text Selection

### The Insight

Spw syntax uses brackets as structural delimiters: `!boon["hello"]`, `(scope: ...)`, `{body}`. The workbench renders AST nodes as horizontally-aligned DOM elements. When a user selects text across these elements (drag or Shift+Arrow), the browser's text selection follows DOM order, not visual order.

The key insight: **if each structural element has `::before` and `::after` pseudo-elements containing `[` and `]`**, then text selection across horizontally-aligned components produces text that reads like valid Spw.

### The Problem Without Delimiters

Current AST rendering:
```html
<div class="ast-node"> <!-- Operation -->
  <span class="ast-type">Operation</span>
  <span class="ast-operator">[!]</span>
  <span class="ast-span">1:1</span>
</div>
<div class="ast-node"> <!-- Frame -->
  <span class="ast-type">Frame</span>
  <span class="ast-span">1:6</span>
</div>
```

Text selection across both nodes: `Operation [!] 1:1 Frame 1:6`

This is meaningless as Spw. It's a visual layout artifact, not structured text.

### The Solution: Bracket Pseudo-Elements

Add CSS pseudo-elements that inject bracket delimiters into the selectable text flow:

```css
/* 
 * Spw-native text selection delimiters.
 * These pseudo-elements are invisible (transparent/zero-width) by default
 * but become part of the text selection stream. When a user copies a range
 * of AST nodes, the clipboard text includes brackets that mirror Spw syntax.
 *
 * Activated via a data attribute so the feature can be toggled.
 */

/* === Container-level grouping brackets === */
[data-spw-brackets="true"] .ast-children::before {
  content: "[";
  position: absolute;
  opacity: 0;
  width: 0;
  overflow: hidden;
  /* Not display:none — must remain in text selection flow */
}

[data-spw-brackets="true"] .ast-children::after {
  content: "]";
  position: absolute;
  opacity: 0;
  width: 0;
  overflow: hidden;
}

/* === Node-level type prefix === */
[data-spw-brackets="true"] .ast-node[data-operator]::before {
  content: attr(data-operator);
  position: absolute;
  opacity: 0;
  width: 0;
  overflow: hidden;
}

/* === Modifier nodes get their modifier value === */
[data-spw-brackets="true"] .ast-node[data-modifiers]::after {
  content: attr(data-modifiers);
  position: absolute;
  opacity: 0;
  width: 0;
  overflow: hidden;
}

/* === Visual mode: show brackets on hover/selection === */
[data-spw-brackets="visible"] .ast-children::before,
[data-spw-brackets="visible"] .ast-children::after {
  position: static;
  opacity: 0.3;
  width: auto;
  font-family: var(--font-mono);
  color: var(--color-bracket);
}
```

### Selection Output

With brackets active, selecting the full tree of `!boon["hello"] .. @out` produces:

```
!Operation[Frame[Parameter[Literal "hello"]]]ModifierChain[MODIFIER]Reference @out
```

This isn't valid Spw yet, but it's **structurally meaningful text** that maps to the AST. With a CSS refinement that omits `ast-type` from the text flow and surfaces the source values instead:

```css
[data-spw-brackets="true"] .ast-type {
  user-select: none;  /* Node type names are not part of copied text */
}

[data-spw-brackets="true"] .ast-value,
[data-spw-brackets="true"] .ast-operator {
  user-select: text;  /* Values and operators ARE part of copied text */
}
```

The selection becomes: `!["hello"]..@out` — approximate Spw source reconstructed from the tree.

### Toggle and Modes

Three bracket modes, controlled via `data-spw-brackets` on the document:

| Mode | `data-spw-brackets` | Visual | Selection |
|------|----------------------|--------|-----------|
| Off | `"false"` (default) | No brackets | Raw DOM text |
| Silent | `"true"` | No visual change | Brackets in clipboard |
| Visible | `"visible"` | Brackets rendered at 30% opacity | Brackets in clipboard |

**Keyboard shortcut:** `Space+b` cycles through the three modes.

**Announcement:** `a11y.announceAction('Bracket mode: silent')` / `'visible'` / `'off'`

---

## D. Spreadsheet-Friendly Selection and Paste Semantics

### The Problem

The workbench displays structured data in several places:

1. **Token list:** Type, Value, Position columns
2. **AST tree:** Type, Operator/Value, Position columns  
3. **Register bank:** Name, Value, Kind, Timestamp
4. **System state (geology):** Key, Value pairs
5. **Timing metrics:** Label, Value pairs

When a user selects and copies from any of these, the clipboard gets a single string of concatenated text with no structure. Pasting into a spreadsheet produces a single cell of mush.

### The Solution: Structured Copy with Tab Delimiters

Intercept the `copy` event on structured data containers and rewrite the clipboard with tab-delimited (TSV) content:

```typescript
/**
 * Spw Structured Copy
 * 
 * Intercepts copy events on structured containers and writes
 * both text/plain (TSV) and text/html (table) to the clipboard.
 * This makes paste into spreadsheets produce properly columnar data.
 */

interface CopyColumn {
  selector: string       // CSS selector for the column element within each row
  header: string         // Column header for spreadsheet paste
  transform?: (text: string) => string  // Optional text transformation
}

interface StructuredCopyConfig {
  containerSelector: string
  rowSelector: string
  columns: CopyColumn[]
}

const STRUCTURED_COPY_CONFIGS: StructuredCopyConfig[] = [
  {
    containerSelector: '[role="tree"]',          // AST tree
    rowSelector: '[role="treeitem"]',
    columns: [
      { selector: '.ast-type', header: 'Type' },
      { selector: '.ast-operator, .ast-value', header: 'Value' },
      { selector: '.ast-span', header: 'Position' },
    ],
  },
  {
    containerSelector: '.token-list',             // Token list
    rowSelector: '.token-item',
    columns: [
      { selector: '.token-type', header: 'Type' },
      { selector: '.token-value', header: 'Value' },
      { selector: '.token-pos', header: 'Position' },
    ],
  },
  {
    containerSelector: '.register-display',       // Register bank
    rowSelector: '.register-entry',
    columns: [
      { selector: '.register-name', header: 'Register' },
      { selector: '.register-value', header: 'Value' },
      { selector: '.register-kind', header: 'Kind' },
    ],
  },
]
```

### Copy Event Handler

```typescript
function handleStructuredCopy(e: ClipboardEvent): void {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  // Find which structured container the selection is within
  const range = selection.getRangeAt(0)
  const ancestor = range.commonAncestorContainer instanceof HTMLElement
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement

  if (!ancestor) return

  for (const config of STRUCTURED_COPY_CONFIGS) {
    const container = ancestor.closest(config.containerSelector)
    if (!container) continue

    // Found a structured container — build TSV
    const rows = Array.from(container.querySelectorAll(config.rowSelector))
    const selectedRows = rows.filter(row => selection.containsNode(row, true))

    if (selectedRows.length === 0) continue

    // Build TSV lines
    const headerLine = config.columns.map(c => c.header).join('\t')
    const dataLines = selectedRows.map(row => {
      return config.columns.map(col => {
        const el = row.querySelector(col.selector) as HTMLElement | null
        const text = el?.textContent?.trim() ?? ''
        return col.transform ? col.transform(text) : text
      }).join('\t')
    })

    const tsv = [headerLine, ...dataLines].join('\n')

    // Build HTML table
    const html = `<table>
      <thead><tr>${config.columns.map(c => `<th>${c.header}</th>`).join('')}</tr></thead>
      <tbody>${selectedRows.map(row => {
        const cells = config.columns.map(col => {
          const el = row.querySelector(col.selector) as HTMLElement | null
          const text = el?.textContent?.trim() ?? ''
          return `<td>${text}</td>`
        }).join('')
        return `<tr>${cells}</tr>`
      }).join('')}</tbody>
    </table>`

    // Write both formats to clipboard
    e.preventDefault()
    e.clipboardData?.setData('text/plain', tsv)
    e.clipboardData?.setData('text/html', html)

    // Announce
    a11y.announceAction(
      `Copied ${selectedRows.length} rows as structured data`
    )
    return
  }
}

// Register globally
document.addEventListener('copy', handleStructuredCopy)
```

### Paste Target Awareness

When pasting structured content *back into* the workbench, the target region determines interpretation:

| Paste target | Source=TSV row | Source=plain text |
|-------------|---------------|-------------------|
| Editor | Join columns with Spw syntax: `!Type[Value] Position` | Insert raw text |
| Inspector | No-op (read-only view) | No-op |
| Geology | Parse as environment binding: `key=value` | Set register |
| Any input field | Insert first column value | Insert raw text |

This is implemented in the paste handler by checking `actionTarget`:

```typescript
function handleStructuredPaste(e: ClipboardEvent): void {
  const tsv = e.clipboardData?.getData('text/plain')
  if (!tsv || !tsv.includes('\t')) return  // Not structured

  const targetRegion = appState.getActionTarget() ?? appState.getActiveRegion()
  
  switch (targetRegion) {
    case 'editor': {
      e.preventDefault()
      // Convert TSV rows to Spw source fragments
      const lines = tsv.split('\n').slice(1) // skip header
      const spw = lines.map(line => {
        const [type, value, pos] = line.split('\t')
        return value || type  // Use value if present, else type
      }).join(' ')
      insertAtCursor(spw)
      break
    }
    case 'geology': {
      e.preventDefault()
      const lines = tsv.split('\n').slice(1)
      lines.forEach(line => {
        const [name, value, kind] = line.split('\t')
        if (name && value) {
          registerBank.set(name.charAt(0), {
            value,
            kind: (kind as RegisterKind) || 'text',
            label: name,
          })
        }
      })
      break
    }
  }
}
```

### Copy Mode Toggle

Add a copy-mode setting that controls whether structured copy is active:

```
Space+C → cycle copy mode:
  1. "smart"  (default) — structured copy in structured containers, plain elsewhere
  2. "plain"  — always plain text
  3. "spw"    — always attempt Spw reconstruction (combines §C brackets + §D structure)
```

---

## Interaction Matrix

How all four concerns connect:

```
                    ┌──────────────────────────────────────────┐
                    │              REGISTER BANK               │
                    │  " 0-9 a-z ! ^ ~ ? * = @ # .            │
                    │  source | semantic | pattern | pragma    │
                    └────┬─────────┬─────────┬────────────┬───┘
                         │         │         │            │
              ┌──────────▼──┐  ┌───▼─────┐  ┌▼────────┐  │
              │  A: EDITING  │  │A: INSPECT│  │A: EXEC  │  │
              │   y → yank   │  │  y → yank│  │ step    │  │
              │   p → paste  │  │  c → chg │  │ eval    │  │
              │   insert text│  │  t → xfrm│  │ inject  │  │
              └──────┬───────┘  └───┬──────┘  └──┬──────┘  │
                     │              │             │         │
    ┌────────────────▼──────────────▼─────────────▼────┐    │
    │         B: REGION ACTIONS + COMMANDS             │    │
    │  Space+a → set action target                     │    │
    │  Space+A → clear action target                   │    │
    │  " + key → select register                       │    │
    │  Space+c → toggle cache mode                     │    │
    │  Cross-region paste selects representation       │    │
    └────────────┬────────────────────────┬────────────┘    │
                 │                        │                 │
    ┌────────────▼──────────┐  ┌──────────▼──────────┐     │
    │  C: BRACKET DELIMITERS│  │  D: STRUCTURED COPY │     │
    │  ::before/::after [ ] │  │  TSV + HTML table   │     │
    │  Spw-native selection │  │  Spreadsheet paste   │     │
    │  data-spw-brackets    │  │  text/plain + html  │     │
    │  Space+b → mode cycle │  │  Space+C → mode     │     │
    └───────────────────────┘  └──────────────────────┘     │
                     │                        │             │
                     └────────────┬───────────┘             │
                                  │                         │
                     ┌────────────▼────────────────┐        │
                     │  CLIPBOARD (system)          │        │
                     │  text/plain: TSV or Spw-like │        │
                     │  text/html: table markup     │        │
                     │  ← actionTarget selects repr │────────┘
                     └─────────────────────────────┘
```

---

## Implementation Priorities

| Priority | Feature | Difficulty | Dependencies |
|----------|---------|-----------|--------------|
| **P0** | Node yank in inspect mode | Low | Register bank (exists) |
| **P0** | Structured copy (TSV) for token list + AST tree | Medium | Copy event handler |
| **P1** | Bracket pseudo-elements (silent mode) | Low | CSS only |
| **P1** | Register palette on `"` keystroke | Medium | `listDisplayEntries()` (exists) |
| **P1** | Cross-region paste with representation selection | Medium | `RegisterRepresentations` (exists) |
| **P2** | Bracket mode toggle (`Space+b`) | Low | Data attribute + CSS |
| **P2** | Cache mode control (`Space+c`) | Low | `parseInput()` options |
| **P2** | Structured paste interpretation by region | Medium | Paste event handler |
| **P3** | Step-through execution in geology | High | Evaluation engine |
| **P3** | Structural editing (wrap with operator) | High | Source rewriting |
| **P3** | Template insertion from sheaf | Medium | Sheaf manager (exists) |

---

## Summary of Design Decisions

| # | Decision | Principle |
|---|----------|-----------|
| A | Three-phase workflow (Edit→Inspect→Execute) connected by register bank | **Registers as shared memory** — state flows through yanks, not imperative calls |
| B | Region-scoped verbs with cross-region representation switching | **Paste to context** — the same data means different things in different regions |
| C | CSS `::before`/`::after` inject brackets into text selection flow | **Copy is syntax** — what you select is what you'd write in Spw |
| D | Copy event intercept writes TSV + HTML table to clipboard | **Paste to spreadsheet** — structured data stays structured across applications |
