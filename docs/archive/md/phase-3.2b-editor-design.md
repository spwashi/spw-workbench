# Phase 3.2B: Mood-Responsive Authoring Editor Design

## Overview

This document describes the **genre-driven, mood-responsive editor system** that transforms the editor appearance and behavior based on the authoring genre. The goal is to create writing environments that harmonize with the genre's aesthetic and writing style.

### Vision

Rather than showing a generic code editor optimized for Spw language syntax, the authoring editor adapts to the genre being written:

- **Novel writer** sees warm tones, cozy typography, scene scaffolding
- **Textbook author** sees professional layout, learning objectives, structured sections
- **Poet** sees minimal UI, ample whitespace, line-focused interface
- **Academic essayist** sees formal typography, argument mapping, citations sidebar
- **Technical writer** sees instructional layout, step-by-step scaffolding, examples

This creates **atmospheric alignment**: the editor mood matches the writing task.

## Architecture

### Three Core Systems

```
Genre
  ↓
┌─────────────────────────────────────┐
│  1. GenreAesthetic                  │  Visual design (colors, typography)
│     - Colors (palette)              │
│     - Typography (fonts, size)      │  CSS variables applied to document root
│     - Spacing & layout              │
│     - Mood descriptors              │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  2. EditorMode                      │  Interaction design (layout, structure)
│     - Layout (sidebar, toolbar)     │
│     - Scaffolding blocks            │  Template elements & metrics
│     - Sidebar content (index type)  │
│     - Metrics display               │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  3. CSS Styling                     │  Visual implementation
│     - CSS custom properties         │
│     - Genre-specific classes        │  Uses variables from Aesthetics
│     - Responsive breakpoints        │
│     - Print styles                  │
└─────────────────────────────────────┘
```

### Data Flow

```
User selects "Novel" genre
  ↓
getGenreAesthetic("narrative-fiction")
  ↓ returns NOVEL_AESTHETIC
    {
      colors: { background: "#faf8f3", ... },
      typography: { bodyFont: "Georgia", ... },
      mood: { tone: "cozy", ... }
    }
  ↓
applyGenreAesthetic(aesthetic)
  ↓
  Updates CSS variables on document root:
    --author-bg: #faf8f3
    --author-text: #2d2d2d
    --author-body-font: Georgia, serif
    --author-line-height: 1.8
    --author-accent: #c17a4a
    ...
  ↓
CSS rules use variables:
  .authoring-editor {
    background: var(--author-bg);
    color: var(--author-text);
    font-family: var(--author-body-font);
  }
  ↓
RESULT: Editor visually transforms with smooth transition
```

## Aesthetic Definitions

Each genre has a complete **GenreAesthetic** defining:

### 1. Typography

| Genre | Body Font | Size | Line Height | Weight | Style |
|-------|-----------|------|------------|--------|-------|
| Novel | Georgia (serif) | 18px | 1.8 | 400 | normal |
| Textbook | Segoe UI (sans) | 16px | 1.6 | 400 | normal |
| Poetry | Georgia (serif) | 17px | 1.9 | 400 | italic |
| Essay | Segoe UI (sans) | 16px | 1.65 | 400 | normal |
| Manual | Monospace | 15px | 1.5 | 400 | normal |

### 2. Color Palette

**Novel (Warm, Cozy)**:
```
Background: #faf8f3 (warm off-white, like aged paper)
Text: #2d2d2d (soft black)
Accent: #c17a4a (warm terracotta)
Secondary: #8b7355 (muted brown)
Success: #7a9d5c (sage green)
Hint: #d4a574 (golden)
```

**Textbook (Cool, Professional)**:
```
Background: #ffffff (clean white)
Text: #1a1a1a (dark gray)
Accent: #0066cc (academic blue)
Secondary: #4d94ff (light blue)
Success: #2d8659 (academic green)
Hint: #3366cc (blue)
```

**Poetry (Balanced, Lyrical)**:
```
Background: #fefdfb (nearly white)
Text: #3a3a3a (soft charcoal)
Accent: #6b4e71 (deep purple)
Secondary: #9d7ba8 (lavender)
Success: #5a7a3a (forest green)
Hint: #a8876b (soft bronze)
```

**Essay (Formal, Academic)**:
```
Background: #f9f9f9 (slightly off-white)
Text: #1a1a1a (dark)
Accent: #004080 (deep academic blue)
Secondary: #3366aa (medium blue)
Success: #2d6a4a (dark green)
Hint: #004080 (deep blue)
```

**Manual (Clear, Instructional)**:
```
Background: #fafafa (near-white)
Text: #222222 (very dark)
Accent: #d97706 (orange/amber)
Secondary: #f97316 (bright orange)
Success: #059669 (green)
Hint: #d97706 (orange)
```

### 3. Spacing

| Genre | Padding | Block Spacing | Indent | Break Margin |
|-------|---------|---------------|--------|--------------|
| Novel | 3rem 4rem | 1.5rem | 2.5rem | 3rem |
| Textbook | 2rem 3rem | 1.25rem | 2rem | 2rem |
| Poetry | 3rem 5rem | 2rem | 1.5rem | 3rem |
| Essay | 2.5rem 3.5rem | 1.25rem | 2.5rem | 1.5rem |
| Manual | 2rem 3rem | 1.25rem | 2rem | 1.75rem |

### 4. Mood Descriptors

```typescript
mood: {
  tone: 'cozy' | 'professional' | 'lyrical' | 'formal' | 'instructional'
  warmth: 0-1        // Color warmth (0=cool, 1=warm)
  minimalism: 0-1    // Visual detail (0=minimal, 1=detailed)
  focus: 0-1         // Distraction reduction (0=detailed, 1=minimal)
  hasMotivation: boolean
}
```

Examples:

```
Novel:
  tone: 'cozy'
  warmth: 0.8 (warm colors)
  minimalism: 0.4 (some scaffolding visible)
  focus: 0.7 (good focus, some guidance)
  hasMotivation: true (daily goals, streaks)

Poetry:
  tone: 'lyrical'
  warmth: 0.5 (balanced)
  minimalism: 0.8 (very minimal scaffolding)
  focus: 0.9 (maximum focus, blank page)
  hasMotivation: false (poetry doesn't need gamification)

Textbook:
  tone: 'professional'
  warmth: 0.3 (cool, professional)
  minimalism: 0.2 (detailed, structured)
  focus: 0.8 (high focus)
  hasMotivation: false
```

## Editor Mode Definitions

Each **EditorMode** defines how the editor behaves and what scaffolding appears.

### Layout Configuration

```typescript
layout: {
  contentWidth: number          // % of container
  showSidebar: boolean
  sidebarWidth: number          // px
  sidebarPosition: 'left' | 'right'
  showToolbar: boolean
  showStatsBar: boolean
}
```

**Mode Differences**:

```
Novel:
  ├─ Content: 70%
  ├─ Sidebar: 280px right
  ├─ Toolbar: YES (quick actions)
  └─ StatsBar: YES (word count, reading time)

Poetry:
  ├─ Content: 60% (narrower for focus)
  ├─ Sidebar: NO (minimal UI)
  ├─ Toolbar: NO
  └─ StatsBar: NO (blank page effect)

Textbook:
  ├─ Content: 75%
  ├─ Sidebar: 250px right (concept index)
  ├─ Toolbar: YES
  └─ StatsBar: YES (pages, sections)
```

### Scaffolding Blocks

Each mode defines template blocks to guide writing:

**Novel Scene Template**:
```
┌─ SETTING (optional)
│  Where and when does this scene unfold?
├─ CHARACTERS (optional)
│  Who is present? Their emotional state?
├─ ACTION (required)
│  What happens? Write here...
└─ EMOTIONAL ARC (optional)
   What emotional note remains?
```

**Textbook Section Template**:
```
┌─ LEARNING OBJECTIVES (required)
│  □ After this section, students will...
├─ CONTENT (required)
│  Explain the concept clearly...
├─ EXAMPLES (optional)
│  Example 1: ...
│  Example 2: ...
└─ EXERCISES (optional)
   Practice problems for students...
```

**Manual Step Template**:
```
┌─ STEP (required)
│  Describe the action...
├─ EXAMPLE (optional)
│  Show what this looks like...
├─ IMPORTANT NOTE (optional)
│  ⚠️ What should users watch out for?
└─ EXPECTED RESULT (optional)
   What should they see if correct?
```

**Poetry Template**:
```
(No scaffolding - blank page for poetry)
```

### Sidebar Types

Different genres show different sidebars:

| Genre | Sidebar Type | Content |
|-------|--------------|---------|
| Novel | Characters | Cast list, character names, descriptions |
| Textbook | Concepts | Glossary, key terms, definitions |
| Poetry | None | (Minimal UI) |
| Essay | References | Citations, bibliography, sources |
| Manual | Troubleshooting | FAQ, common issues, index |

### Metrics Display

Different genres track different metrics:

| Genre | Primary | Secondary | Goal Tracking | Streak |
|-------|---------|-----------|---------------|--------|
| Novel | Words | Reading time | ✓ (1000/day) | ✓ |
| Textbook | Pages | Section count | ✓ (300 total) | ✗ |
| Poetry | Lines | — | ✗ | ✗ |
| Essay | Pages | Reading time | ✓ (20 pages) | ✗ |
| Manual | Pages | — | ✗ | ✗ |

Rationale:
- **Novelists** benefit from daily goals and streaks (motivation for regular writing)
- **Academics** track pages toward a thesis/dissertation
- **Poets** don't need gamification (distraction)
- **Essayists** aim for quality, tracked by page count

## Implementation Pattern

### 1. Applying Aesthetics at Startup

```typescript
// When user selects a genre
const genre = getActiveGenre()  // e.g., "narrative-fiction"
const aesthetic = getGenreAesthetic(genre.id)
const mode = getEditorMode(genre.id)

// Apply visual design
applyGenreAesthetic(aesthetic)

// Apply behavior
initializeEditorMode(mode)
```

### 2. CSS Variables Usage

The aesthetic system generates CSS custom properties that CSS rules use:

```css
/* genre-aesthetics.ts applies these to document root */
:root {
  --author-bg: #faf8f3;
  --author-text: #2d2d2d;
  --author-body-font: 'Georgia', serif;
  --author-line-height: 1.8;
  --author-accent: #c17a4a;
  --author-scaffolding-bg: #f5f1e8;
  --author-editor-padding: 3rem 4rem;
  --author-block-spacing: 1.5rem;
  --author-warmth: 0.8;
  --author-minimalism: 0.4;
  --author-focus: 0.7;
}

/* authoring-editor.css uses them */
.authoring-editor {
  background: var(--author-bg);
  color: var(--author-text);
  font-family: var(--author-body-font);
  line-height: var(--author-line-height);
  padding: var(--author-editor-padding);
}

.author-block {
  margin-bottom: var(--author-block-spacing);
  background: var(--author-scaffolding-bg);
  border-left-color: var(--author-accent);
}
```

### 3. Data Attributes for CSS Selectors

The system also sets data attributes for more complex styling:

```typescript
root.dataset.authorGenre = 'narrative-fiction'
root.dataset.authorMood = 'cozy'
```

```css
/* Use in CSS */
[data-author-mood="lyrical"] .authoring-editor__toolbar {
  display: none;  /* No toolbar for poetry */
}

[data-author-mood="lyrical"] .authoring-editor__canvas {
  max-width: 600px;  /* Narrow for poetry */
  margin: 0 auto;
}

[data-author-mood="professional"] .authoring-editor__canvas {
  max-width: 900px;  /* Standard for academic */
}
```

## Visual Transitions

Genre switching should be smooth and noticeable:

```css
.authoring-editor {
  transition: background-color 300ms ease-in-out,
              color 300ms ease-in-out;
}

.author-block {
  transition: all 200ms ease-in-out;
}

.author-block__content {
  transition: border-color 200ms, box-shadow 200ms;
}
```

When switching from Novel (warm terracotta) to Textbook (cool blue), the entire editor smoothly fades to the new palette over 300ms.

## Progressive Disclosure

The editor supports a "technical mode" toggle to show/hide parser details:

```html
<button onclick="editor.toggleTechnical()">
  Show technical details
</button>
```

When enabled:
```html
<div class="authoring-editor authoring-editor--show-technical">
  <div class="authoring-editor__content">
    <!-- Editor canvas -->
  </div>
  <div class="authoring-context">
    <!-- Parse tokens, AST, context lens (from Phase 3.1) -->
  </div>
</div>
```

When disabled:
```html
<div class="authoring-editor authoring-editor--hide-technical">
  <!-- Just the editor, no technical panels -->
</div>
```

## File Structure

```
src/publishing/authoring/
├── genre-aesthetics.ts          # Visual design per genre
│   ├── GenreAesthetic interface
│   ├── NOVEL_AESTHETIC
│   ├── TEXTBOOK_AESTHETIC
│   ├── POETRY_AESTHETIC
│   ├── ESSAY_AESTHETIC
│   ├── MANUAL_AESTHETIC
│   ├── getGenreAesthetic()
│   ├── applyGenreAesthetic()
│   └── getAllAesthetics()
│
├── editor-modes.ts              # Interaction design per genre
│   ├── EditorMode interface
│   ├── TemplateBlock interface
│   ├── NOVEL_MODE
│   ├── TEXTBOOK_MODE
│   ├── POETRY_MODE
│   ├── ESSAY_MODE
│   ├── MANUAL_MODE
│   ├── getEditorMode()
│   ├── getAllEditorModes()
│   ├── hasScaffolding()
│   └── hasSidebar()
│
├── authoring-editor.css         # Style implementation
│   ├── Base editor container
│   ├── Content area
│   ├── Canvas
│   ├── Scaffolding blocks
│   ├── Stats bar
│   ├── Sidebar
│   ├── Genre-specific adaptations
│   ├── Progressive disclosure
│   └── Responsive rules
│
└── index.ts                     # Public API
    └── Re-exports all above
```

## Integration Points

### 1. Publishing Index Export

```typescript
// src/publishing/index.ts
export {
  NOVEL_AESTHETIC,
  TEXTBOOK_AESTHETIC,
  // ...
  getGenreAesthetic,
  applyGenreAesthetic,
} from './authoring'

export {
  NOVEL_MODE,
  TEXTBOOK_MODE,
  // ...
  getEditorMode,
  getAllEditorModes,
} from './authoring'
```

### 2. Future: Authoring Editor Component

The next step (Phase 3.2B.2) will implement an `AuthoringEditor` component that:

```typescript
class AuthoringEditor {
  mount(containerId: string, genre: GenreDefinition)

  // Adapts to genre:
  // - Applies aesthetic (colors, typography)
  // - Initializes mode (scaffolding, sidebar, metrics)
  // - Renders template blocks
  // - Shows appropriate metrics

  setGenre(genre: GenreDefinition)  // Genre switch with smooth transition
  toggleTechnical()                  // Show/hide technical panels
  getEditorContent(): string         // Returns authored text
  setEditorContent(text: string)     // Sets text (for loading)
}
```

## Future Enhancements

### Phase 3.2B.2: Authoring Editor Component
- Implement full editor UI with scaffolding
- Character/concept sidebar population
- Real-time word count, reading time
- Save indicators, version control

### Phase 3.2B.3: Writing Assistance
- Inline suggestions (grammar, clarity, tone)
- Genre-specific style guides
- Character consistency checking (for novels)
- Learning objective tracking (for textbooks)

### Phase 4: Performance Mode Integration
- Read scenes/sections aloud with genre-specific pacing
- "Perform" a textbook section (pause at exercises)
- Poetry in "recitation mode" with meter highlighting

## Testing Checklist

- [ ] Each genre applies correct aesthetic (colors visible)
- [ ] Transitions are smooth when switching genres
- [ ] Typography is correct per genre
- [ ] Scaffolding blocks appear only in genres that use them
- [ ] Poetry mode hides toolbar and stats
- [ ] Textbook mode shows learning objectives
- [ ] Novel mode shows character sidebar
- [ ] Sidebar is right-aligned for all genres
- [ ] Mobile: sidebar moves below canvas
- [ ] Metrics display correct primary/secondary values
- [ ] Technical toggle shows/hides context panel
- [ ] CSS variables correctly applied to all elements

## Key Insight

**★ Insight ─────────────────────────────────────**

The editor becomes a **mood instrument**: just as a musician chooses an instrument for its tonal qualities, a writer now chooses a genre to get the right atmospheric environment. The genre doesn't constrain writing—it *invites* it.

A novelist writing in a cozy, serif-driven environment with scene scaffolding gets gentle guidance without dictation. An essayist in a formal, structured layout with thesis-first organization gets clarity. A poet in a minimal, whitespace-forward interface gets freedom.

This is the opposite of generic productivity software that treats all writing as "blank canvas." Here, the writing environment *speaks back* to the writer through visual and structural cues specific to the task.

**─────────────────────────────────────────────────**
