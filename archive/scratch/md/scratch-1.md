## Narrative Context

Doc mode emerges from a fundamental insight: **code is literature**.

When we write software, we're not just instructing machines—we're creating
artifacts that other humans will read, interpret, and extend. The separation
between "prose that explains" and "code that executes" is artificial. In a
mature symbolic language, the two should flow together.

This feature enables the **writer's room** concept: a space where designers,
illustrators, and developers collaborate on narrative arcs that span multiple
constructs. The prose chunks aren't comments—they're first-class participants
in the document's meaning.

**Structural salience** (architecture) and **runtime salience** (performance)
become two axes of a production cycle. A chunk might explain *why* a particular
operator was chosen, connecting the technical decision to cognitive structure.
Git history then traces how these narrative forms stabilize over time.

---

## Document Identity

Every document needs a name. Not just a filename—a meaningful identifier that
captures its role in the larger work.

**Document kinds:**
- `script` — Narrative work with prose + code (the primary artifact)
- `module` — Pure Spw for reuse across scripts
- `sketch` — Exploratory work, not yet named
- `reference` — Documentation or supporting material

Names should be evocative: `scene-1-awakening`, `character-arc-tension`,
`theme-recursion`. These become the vocabulary for discussing the work.

The naming/saving flow:
1. Start as `sketch` (untitled, exploratory)
2. As it stabilizes, give it a name and promote to `script` or `module`
3. Git commits mark narrative beats in the document's evolution
4. Tags provide cross-cutting organization (`#act-1`, `#refactor`, `#draft`)

---

## Change request captured from the screenshot

You want the editor to support **mixed prose + Spw snippets** so that:

* prose is **syntax-highlighted as prose** (not treated as invalid Spw),
* the document **does not fail parse** just because it contains `;` or freeform text,
* you can **embed Spw** inside the prose and still get AST/TOKENS/STEPS for those snippets.

This is a **“document mode”** problem: one file can contain multiple languages / regions.

---

## MVP addition: `Doc` profile (mixed-mode)

Add a second profile next to `Simple`:

* **Simple** = pure Spw (current)
* **Doc** = Prose + Spw (new)

### Doc-mode chunk model

A document is a sequence of chunks:

* `ProseChunk(text)`
* `SpwChunk(source, tokens, ast, flow, diagnostics)`
* `FenceChunk(lang, text)` (optional generalization)

This guarantees the Inspector always has *something* to show even if one chunk fails.

---

## Recommended syntax (explicit delimiters; no heuristics required)

### 1) Prose blocks as first-class Spw call (fits your style)

Use a built-in operator whose block body is **prose**, not Spw:

```spw
^note{
  this is prose; semicolons ok;
  and i can embed spw inline like `!boon["hello"] .. @out`
}
```

* The outer structure is valid Spw.
* Inside `^note{ ... }`, the lexer switches to `PROSE` state.

### 2) Fenced Spw (works well for long snippets)

Markdown-style:

````text
here is a paragraph

```spw
!boon["hello"] .. @out
````

more prose

````

### 3) Inline Spw (short snippets)
Any of these work; pick one canonical form:

- backticks + prefix: `` `spw: !boon["hello"] .. @out` ``
- double-brackets: `⟦ !boon["hello"] .. @out ⟧` (high-clarity delimiter)
- inline fence: `` `!boon["hello"] .. @out` `` (only if you can disambiguate from normal code)

**MVP recommendation:** `^note{}` for prose blocks + ```spw fences for multi-line + `` `spw: ...` `` for inline.

---

## Lexer spec changes (multi-mode, deterministic)

### Lexer states
- `SPW` (existing)
- `PROSE`
- `SPW_FENCE` (inside ```spw … ```)
- `INLINE_SPW` (inside inline delimiter)

### Transitions
- `SPW → PROSE` on `^note{` (after parsing the call head, the block body is prose)
- `ANY → SPW_FENCE` on line-start fence ```spw
- `SPW_FENCE → previous` on closing ```
- `PROSE → INLINE_SPW` on inline marker (e.g., `` `spw: `` or `⟦`)
- `INLINE_SPW → PROSE` on closing marker (e.g., `` ` `` or `⟧`)

### Token additions
- `PROSE_TEXT(span, text)`
- `FENCE_OPEN(lang)`
- `FENCE_CLOSE`
- `INLINE_OPEN / INLINE_CLOSE`

**Key property:** semicolons (and most punctuation) are valid inside `PROSE_TEXT`, so the lexer does not emit “Unexpected character: ;” there.

---

## Parser spec changes (Document AST + embedded Spw AST)

### New top-level AST node
- `Document(chunks[])`

Where:
- `chunks[]` contains `ProseChunk` and `SpwChunk`.

### Embedded parsing rule
When the document parser encounters a `SpwChunk` boundary (fence or inline), it:

1. runs the existing Spw lexer+parser on that substring,
2. stores `tokens/ast/diagnostics` on the chunk node,
3. **does not fail the whole document** if the chunk fails.

So AST tab can show:

````

Document
ProseChunk
SpwChunk
AST: Emit(Call(!boon ...), Ref(@out))
ProseChunk

````

---

## Syntax highlighting (editor)

Implement “language injections” based on the lexer state:

- In `PROSE`: render as prose (one neutral style + optional emphasis)
- In `SPW` / `INLINE_SPW` / `SPW_FENCE`: render with Spw token classes

**UI behavior:**
- clicking an embedded Spw snippet focuses the Inspector on that snippet’s artifacts
- selection highlighting still works with spans because each chunk has its own offset mapping

---

## Inspector behavior changes (minimal but important)

### AST tab
- Default: `Document` tree
- Selecting a `SpwChunk` shows nested AST view (and a “Back to Document” crumb)

### TOKENS tab
- Filter toggle: `All | Prose | Spw`
- Prose shows aggregated `PROSE_TEXT` tokens (don’t spam one token per char)

### STEPS tab
Steps are per Spw snippet:

- Add a snippet selector (dropdown or breadcrumbs):
  - `Document > SpwChunk #2`
- Step-through operates only on the chosen snippet’s lexer/parser steps.

---

## If you want *zero syntax changes*: heuristic fallback (not recommended for MVP)

You can also implement a forgiving mode:

- If the Spw lexer hits an “unexpected character” at top level, it consumes until newline as `PROSE_TEXT`.

This makes your exact screenshot “work” immediately, but it risks hiding real Spw typos. If you add it, gate it behind a toggle:

- `Strict Spw` (default)
- `Doc forgiving` (optional)

---

## Minimal implementation order (keeps scope controlled)

1. **Add `Doc` profile** + `Document(chunks[])` container parser.
2. Implement ```spw fenced blocks** (most robust delimiter).
3. Add `^note{}` prose blocks (your preferred authoring style).
4. Add inline Spw markers (`` `spw: ...` `` or `⟦...⟧`).
5. Update Inspector to select a chunk for AST/TOKENS/STEPS.

---

## Small tweak you may also want (independent of prose)
If semicolons are common in your writing, optionally support `;` as **statement separator** in pure Spw (`Simple`):

- Lex `;` as `SEP`
- Parser treats `SEP` like newline/whitespace between expressions

This reduces friction even outside Doc mode, but it’s separate from “prose recognition.”

---
````
