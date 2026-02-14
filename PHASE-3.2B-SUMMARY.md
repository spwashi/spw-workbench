# Phase 3.2B: Mood-Responsive Authoring Editor – DESIGN COMPLETE ✓

## Summary

I've designed and implemented a **genre-driven, mood-responsive editor system** that transforms the editor's visual appearance and behavioral scaffolding based on the authoring genre. Rather than showing a generic code editor, the Spw Workbench now adapts to create atmospheric writing environments that harmonize with the genre's aesthetic and requirements.

## What Was Completed

### 1. **Genre Aesthetics System** (`genre-aesthetics.ts`)
A comprehensive visual design framework with 5 preset genre aesthetics:

**Files Created**:
- `src/publishing/authoring/genre-aesthetics.ts` (~500 lines)

**Includes**:

| Genre | Typography | Colors | Mood | Warmth | Focus |
|-------|-----------|--------|------|--------|-------|
| **Novel** | Georgia serif, 18px, 1.8 line height | Warm off-white bg, terracotta accent, sage green | Cozy | 0.8 | 0.7 |
| **Textbook** | Segoe UI sans, 16px, 1.6 line height | Clean white, academic blue, green | Professional | 0.3 | 0.8 |
| **Poetry** | Georgia italic, 17px, 1.9 line height | Nearly white, deep purple, lavender | Lyrical | 0.5 | 0.9 |
| **Essay** | Segoe UI sans, 16px, 1.65 line height | Off-white, deep blue, dark green | Formal | 0.2 | 0.75 |
| **Manual** | Monospace, 15px, 1.5 line height | Near-white, orange, green | Instructional | 0.4 | 0.85 |

Each aesthetic defines:
- **Typography**: Font family, size, line height, weight, style
- **Color Palette**: 9 colors (background, text, accent, scaffolding, success, hint, selection, etc.)
- **Spacing**: Editor padding, block spacing, indentation, break margins
- **Mood Descriptors**: Tone, warmth, minimalism, focus level, motivation approach

**Key Function**:
```typescript
applyGenreAesthetic(aesthetic: GenreAesthetic)
```
Applies aesthetic as CSS custom properties to document root for dynamic styling.

### 2. **Editor Modes System** (`editor-modes.ts`)
Interaction design framework defining how the editor behaves per genre:

**Files Created**:
- `src/publishing/authoring/editor-modes.ts` (~550 lines)

**Includes**:

| Mode | Layout | Scaffolding | Sidebar | Metrics | Toolbar |
|------|--------|-------------|---------|---------|---------|
| Novel | 70% wide, 280px sidebar | Scene template (Setting, Characters, Action, Emotion) | Character index | Words + reading time | Yes |
| Textbook | 75% wide, 250px sidebar | Section template (Objectives, Content, Examples, Exercises) | Concept index | Pages + sections | Yes |
| Poetry | 60% centered, no sidebar | **None** (blank page) | **None** | Lines only | **No** |
| Essay | 72% wide, 270px sidebar | Section template (Thesis, Evidence, Counter, Synthesis) | References | Pages + reading time | Yes |
| Manual | 75% wide, 260px sidebar | Step template (Step, Example, Caution, Result) | Troubleshooting | Pages | Yes |

Each mode defines:
- **Layout Configuration**: Content width, sidebar placement, toolbar/stats visibility
- **Scaffolding Blocks**: Template elements to guide writing (3-4 blocks per mode)
- **Sidebar Content**: Index type (characters, concepts, references, troubleshooting)
- **Writing Assistance**: Suggestion types, style guide visibility, auto-save intervals
- **Metrics**: Primary metric tracked, daily goals, streak tracking
- **Keyboard Shortcuts**: Shortcuts for new unit, save, outline, scaffolding toggle

**Key Functions**:
```typescript
getEditorMode(genreId: string): EditorMode
hasScaffolding(genreId: string): boolean
hasSidebar(genreId: string): boolean
```

### 3. **Comprehensive CSS Styling** (`authoring-editor.css`)
Style implementation using CSS custom properties for dynamic theming:

**Files Created**:
- `src/publishing/authoring/authoring-editor.css` (~400 lines)

**Features**:
- **Base Container**: Flex layout, seamless transitions
- **Scaffolding Blocks**: Template elements with labels, icons, placeholders
- **Genre-Specific Adaptations**: Poetry hides toolbar, Essay sets max-width, etc.
- **Progressive Disclosure**: Technical panels shown/hidden with toggle
- **Responsive Design**: Mobile-friendly sidebar repositioning
- **Print Styles**: Clean printed output

**CSS Custom Properties Used**:
```css
--author-bg                 /* Background color */
--author-text              /* Text color */
--author-body-font         /* Typography */
--author-accent            /* Primary accent */
--author-editor-padding    /* Content padding */
--author-block-spacing     /* Block spacing */
--author-warmth            /* Color warmth (0-1) */
--author-focus             /* Focus level (0-1) */
```

**Genre-Specific CSS**:
```css
[data-author-mood="cozy"] /* Novel styles */
[data-author-mood="professional"] /* Textbook styles */
[data-author-mood="lyrical"] /* Poetry styles */
[data-author-mood="formal"] /* Essay styles */
[data-author-mood="instructional"] /* Manual styles */
```

### 4. **Public API** (`index.ts`)
Clean barrel export for easy consumption:

**Files Created**:
- `src/publishing/authoring/index.ts` (~30 lines)

**Exports**:
```typescript
// Aesthetic system
export type GenreAesthetic
export const NOVEL_AESTHETIC, TEXTBOOK_AESTHETIC, ...
export function getGenreAesthetic(), applyGenreAesthetic(), getAllAesthetics()

// Mode system
export type EditorMode, TemplateBlock
export const NOVEL_MODE, TEXTBOOK_MODE, ...
export function getEditorMode(), getAllEditorModes(), hasScaffolding(), hasSidebar()
```

### 5. **Design Documentation** (`PHASE-3.2B-EDITOR-DESIGN.md`)
Comprehensive 400+ line design document explaining:

**Includes**:
- Architecture overview with data flow diagrams
- Detailed aesthetic definitions (typography, colors, spacing)
- Editor mode specifications (layout, scaffolding, metrics)
- Implementation patterns and CSS variable usage
- Integration points and future phases
- Testing checklist
- Key insights on mood-driven UX

## Architecture Diagram

```
Genre Selection
     ↓
┌────────────────────────────────────────┐
│   GenreAesthetic System                │
│   - Colors, typography, spacing        │
│   - Mood descriptors                   │
│   - CSS custom properties              │
└────────────────────┬───────────────────┘
                     ↓
┌────────────────────────────────────────┐
│   EditorMode System                    │
│   - Layout & scaffolding               │
│   - Sidebar content                    │
│   - Metrics & assistance               │
└────────────────────┬───────────────────┘
                     ↓
┌────────────────────────────────────────┐
│   CSS Styling (authoring-editor.css)   │
│   - Uses aesthetic variables           │
│   - Genre-specific adaptations         │
│   - Responsive & progressive disclosure│
└────────────────────────────────────────┘
                     ↓
            Visual Transformation
         (Smooth 300ms transition)
```

## Key Design Decisions

### 1. **Separation of Concerns**
- **GenreAesthetic**: Visual design only (colors, fonts, spacing)
- **EditorMode**: Interaction design only (layout, structure, metrics)
- **CSS**: Implementation (uses both as inputs)

This allows each to evolve independently.

### 2. **CSS Custom Properties**
Rather than hardcoding colors/fonts, the system generates CSS variables that CSS rules use. This enables:
- **Smooth transitions**: Genre switch changes variables → CSS naturally animates
- **Dynamic themes**: Could support user customization by modifying variables
- **No JavaScript overhead**: Once applied, styling is pure CSS

### 3. **Data Attributes for Complex Rules**
Some CSS rules require context beyond variables. Data attributes provide semantic hooks:
```css
[data-author-mood="lyrical"] .toolbar { display: none; }
[data-author-mood="lyrical"] .canvas { max-width: 600px; }
```

### 4. **Poetry Gets Special Treatment**
Poetry mode explicitly hides unnecessary UI (toolbar, stats) to create a **blank page effect**. This is intentional: poets don't need scaffolding or gamification.

### 5. **Metrics Match Genre Intent**
- **Novelists**: Track words + reading time + daily goal + streak (motivation)
- **Academics**: Track pages + reading time (toward thesis)
- **Poets**: Track lines only (minimal feedback)
- **Technical**: Track pages (completion-focused)

## Mood Alignments

### Novel Writing: "Cozy"
```
Color Palette: Warm terracotta, sage green, aged-paper cream
Typography: Georgia serif, 18px, loose spacing
Layout: 70% content, 30% character sidebar
Scaffolding: Scene-based (Setting → Characters → Action → Emotion)
Sidebar: Character index with descriptions
Metrics: Words + reading time, daily goal tracking, writing streak
Feedback: Motivational (encourages daily writing)
```

**Why This Works**:
- Serif fonts evoke books and storytelling
- Warm colors feel intimate and welcoming
- Character sidebar supports narrative planning
- Daily goals maintain momentum for 50K+ word projects
- Scene scaffolding provides structure without dictation

### Textbook Writing: "Professional"
```
Color Palette: Clean white, academic blue, professional green
Typography: Segoe UI sans, 16px, crisp spacing
Layout: 75% content, 25% concept sidebar
Scaffolding: Section-based (Objectives → Content → Examples → Exercises)
Sidebar: Glossary/concept index
Metrics: Pages + section count toward project goal
Feedback: Task-focused (completion tracking)
```

**Why This Works**:
- Sans-serif fonts feel modern and authoritative
- Cool colors suggest academic rigor
- Learning objectives first guides pedagogy
- Examples and exercises integral to learning
- Concept sidebar aids consistency

### Poetry: "Lyrical"
```
Color Palette: Nearly white, deep purple, lavender
Typography: Georgia italic, 17px, generous line height
Layout: 60% centered, **no sidebar**
Scaffolding: **None** (blank page)
Metrics: Lines only
Feedback: **Minimal** (no gamification)
```

**Why This Works**:
- Italic fonts suggest musicality
- Narrow, centered canvas focuses attention
- **No scaffolding**: poetry requires freedom from structure
- **No toolbar/stats**: minimal distraction
- Pure blank page effect invites verse

### Essay: "Formal"
```
Color Palette: Off-white, deep academic blue, dark green
Typography: Segoe UI sans, 16px, academic spacing
Layout: 72% content, 28% reference sidebar
Scaffolding: Argument-based (Thesis → Evidence → Counter → Synthesis)
Sidebar: Citations/references index
Metrics: Pages toward thesis goal
Feedback: Structured (argument mapping)
```

**Why This Works**:
- Thesis-first ensures clear argumentation
- Evidence and counter-argument prevent one-sided writing
- Citation sidebar supports academic integrity
- Page goal provides clear completion metric

### Manual: "Instructional"
```
Color Palette: Off-white, orange (attention), green (success)
Typography: Monospace, 15px, clear line height
Layout: 75% content, 25% troubleshooting sidebar
Scaffolding: Step-based (Step → Example → Caution → Expected Result)
Sidebar: Troubleshooting/FAQ index
Metrics: Pages
Feedback: Clarity-focused
```

**Why This Works**:
- Monospace suggests code/precision
- Orange draws attention to important notes
- Step-by-step scaffolding matches procedural nature
- "Expected Result" blocks prevent ambiguity
- Caution warnings catch common mistakes

## Future Integration Points

### Phase 3.2B.2: Authoring Editor Component
```typescript
class AuthoringEditor {
  mount(containerId, genre: GenreDefinition)
  setGenre(genre: GenreDefinition)
  toggleTechnical()
  getContent(): string
  setContent(text: string)
}
```

Will implement:
- Full editor UI with scaffolding blocks
- Sidebar population (characters, references, etc.)
- Real-time metrics (word count, reading time)
- Save indicators and version tracking

### Phase 4: Performance Mode
- **Recitation mode** for poetry (line-by-line with meter)
- **Lesson mode** for textbooks (pause at exercises)
- **Scene performance** for novels (dramatic reading of scenes)

### Phase 5: Content Templates
- Use scaffolding blocks from modes as template guidance
- Auto-generate chapter outlines from mode structure
- Completion checklist per template

## Files Created (5 Total)

| File | Purpose | LOC |
|------|---------|-----|
| `genre-aesthetics.ts` | Visual design per genre | 500 |
| `editor-modes.ts` | Interaction design per genre | 550 |
| `authoring-editor.css` | Style implementation | 400 |
| `index.ts` | Public API | 30 |
| `PHASE-3.2B-EDITOR-DESIGN.md` | Design documentation | 400+ |
| **Total** | | **~1880** |

## Files Modified (2 Total)

| File | Changes |
|------|---------|
| `src/publishing/index.ts` | Added authoring exports (35 lines) |
| **Total** | **35 lines** |

## Key Insight

**★ Insight ─────────────────────────────────────**

The editor becomes a **mood instrument**: like a musician choosing an instrument for its tonal qualities, a writer now chooses a genre to get the right atmospheric environment.

A novelist writing in a cozy, serif-driven space with scene scaffolding gets gentle guidance. An essayist in a formal, structured layout gets clarity. A poet in a minimal whitespace-forward interface gets freedom.

This inverts the typical "one editor for all writing" paradigm. Instead of fighting the tool, writers now collaborate with it. The genre doesn't constrain—it *invites*.

The system works through:
1. **GenreAesthetic**: Visual/typographic alignment (what mood do these colors/fonts evoke?)
2. **EditorMode**: Structural alignment (what scaffolding does this genre need?)
3. **CSS Variables**: Dynamic implementation (smooth, seamless transitions between moods)

Together, they create **atmospheric coherence**: every element—color, typography, spacing, scaffolding, metrics—aligns with the writing task.

**─────────────────────────────────────────────────**

## What's Ready for Implementation

The design is complete and production-ready. The next phase (3.2B.2) will:
1. Create the `AuthoringEditor` React/Web Component
2. Wire genre switching to aesthetic + mode application
3. Render scaffolding blocks dynamically
4. Populate sidebars (character list, concept glossary, etc.)
5. Wire metrics tracking

## Testing Strategy

1. **Visual**: Each genre applies correct aesthetic visually
2. **Behavioral**: Scaffolding/sidebar/toolbar visibility matches mode
3. **Metrics**: Correct primary/secondary metrics display per genre
4. **Responsive**: Mobile layout adapts sidebar
5. **Transitions**: Genre switching animates smoothly
6. **Technical Toggle**: Context panel shows/hides correctly

## How This Aligns with Roadmap

- **Phase 3.1** ✓: Publishing with genre styling (export to HTML)
- **Phase 3.2B** ✓ (Design only): Genre-driven editor aesthetics
- **Phase 3.2B.2** (Next): Implement AuthoringEditor component
- **Phase 3.4**: Library browser & management
- **Phase 4**: Performance mode (live execution with pacing)
- **Phase 5**: Content templates (use scaffolding as guidance)
- **Phase 6**: Emergence explorer (semantic discovery)

The author experience progresses: editor feel → structured scaffolding → library management → live performance → semantic exploration.

## Immediate Next Steps

To bring this to life:

1. **Create `AuthoringEditor` component** (`src/app/components/authoring-editor.ts`)
   - Mount/unmount lifecycle
   - Genre change handler
   - Scaffold rendering logic

2. **Create `BookSidebar` component** (`src/app/components/book-sidebar.ts`)
   - Character/concept/reference population
   - Quick jump to sections
   - Progress tracking

3. **Integrate into workbench** (`src/platform/bootstrap/`)
   - Replace current editor with AuthoringEditor
   - Wire genre selector to aesthetic/mode changes
   - Add technical toggle

4. **Test implementations** (visual, behavioral, responsive)

These are straightforward implementations using the design provided here.
