```spw
^["Spw.Toolkit"]{
  #version: "0.1.0"
  #purpose: "Context-switching interface across syntactic, semantic, pragmatic layers"
  
  <>["terminal", "desktop", "mobile", "web"]
  .. =["keyboard_first": true]
  .. @["specification"]
}
```

---

# Spw Toolkit: Technical Specifications

## Overview

The Spw Toolkit is a unified interface for authoring, evaluating, and projecting Spw seeds across three interpretive layers. All four platform implementations share a common interaction model optimized for keyboard navigation and rapid context switching.

### The Three Layers

| Layer | Focus | Operations |
|-------|-------|------------|
| **Syntactic** | Structure | Parse, validate, transform geometry |
| **Semantic** | Meaning | Evaluate, bind, project domains |
| **Pragmatic** | Purpose | Apply dialects, assess taste, emit outputs |

### The Context Matrix

```
              Syntactic    Semantic     Pragmatic
            ┌────────────┬────────────┬────────────┐
   Edit     │ Token      │ Binding    │ Intent     │
            │ editing    │ editing    │ editing    │
            ├────────────┼────────────┼────────────┤
   View     │ Parse tree │ Eval state │ Projection │
            │ AST        │ Registers  │ Domain@    │
            ├────────────┼────────────┼────────────┤
   Debug    │ Syntax     │ Trace      │ Taste      │
            │ errors     │ stepping   │ analysis   │
            └────────────┴────────────┴────────────┘
```

---

## Shared Architecture

### Core Engine

All platforms embed the same evaluation core:

```
┌─────────────────────────────────────────────────┐
│                   Spw Core                      │
├─────────────────────────────────────────────────┤
│  Parser        │ Evaluator      │ Projector    │
│  ─────────     │ ──────────     │ ──────────   │
│  Tokenizer     │ Register VM    │ Domain@      │
│  AST Builder   │ Scope Manager  │ Dialect      │
│  Validator     │ Connector Eval │ Taste@       │
├─────────────────────────────────────────────────┤
│                  Geometry Layer                 │
│         Spw.l ←→ Spw.b ←→ Spw.x               │
└─────────────────────────────────────────────────┘
```

### Keyboard Model

Global keybindings consistent across platforms:

| Key | Function |
|-----|----------|
| `Ctrl+1` | Switch to Syntactic layer |
| `Ctrl+2` | Switch to Semantic layer |
| `Ctrl+3` | Switch to Pragmatic layer |
| `Ctrl+E` | Toggle Edit/View mode |
| `Ctrl+D` | Toggle Debug panel |
| `Ctrl+G` | Cycle geometry (l→b→x) |
| `Ctrl+P` | Cycle domain projection |
| `Ctrl+T` | Show Taste@ evaluation |
| `Tab` | Next focus region |
| `Shift+Tab` | Previous focus region |
| `Ctrl+Enter` | Evaluate current seed |
| `Ctrl+Space` | Context menu |

### Accessibility Requirements

- Full keyboard navigation (no mouse required)
- Screen reader compatible (ARIA labels, semantic HTML)
- High contrast mode
- Reduced motion option
- Minimum touch target 44×44px (mobile)

---

## Terminal Application

### Platform

- **Runtime:** Native binary (Rust) or Node.js
- **UI Framework:** TUI (ratatui/Rust or blessed/Node)
- **Distribution:** Homebrew, apt, npm, cargo

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ [Syntactic] [Semantic] [Pragmatic]    Spw.b  Hardware@   │
├────────────────────────────────────────┬─────────────────┤
│                                        │ ▸ Parse Tree    │
│  ^["circuit"]{                         │   ^["circuit"]  │
│    !["Vin"]                            │     !["Vin"]    │
│    .. =["gain": 10]                    │     ..          │
│    .. @["Vout"]                        │       =[]       │
│  }                                     │     ..          │
│                                        │       @[]       │
│                                        ├─────────────────┤
│                                        │ R0: "Vout"      │
│                                        │ R^: {circuit,   │
│                                        │      gain: 10}  │
│                                        │ R@: [pending]   │
├────────────────────────────────────────┴─────────────────┤
│ > Ready                                    L:4 C:12      │
└──────────────────────────────────────────────────────────┘
```

### Panes

| Pane | Content | Keys |
|------|---------|------|
| Editor | Seed source (Spw.b default) | vim/emacs bindings |
| Tree | Parse tree or eval state | `j/k` navigate |
| Registers | R0, R^, R@, etc. | `r` to inspect |
| Status | Mode, position, diagnostics | — |

### Commands

```
:layer syn|sem|prag    Switch layer
:geom l|b|x            Switch geometry
:domain <name>         Set domain projection
:eval                  Evaluate seed
:trace                 Step through evaluation
:taste                 Show Taste@ scores
:export <path>         Save to file
:canon <ref>           Load from canon
```

### Configuration

```toml
# ~/.config/spw/config.toml

[editor]
theme = "dark"
tab_width = 2
vim_mode = true

[defaults]
geometry = "b"
domain = "Cognitive"
layer = "syntactic"

[keybindings]
layer_syn = "ctrl+1"
layer_sem = "ctrl+2"
layer_prag = "ctrl+3"
```

---

## Desktop Application

### Platform

- **Framework:** Tauri (Rust + WebView) or Electron
- **Renderer:** Web technologies (HTML/CSS/JS)
- **Distribution:** DMG (macOS), MSI (Windows), AppImage (Linux)

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ ☰  File  Edit  View  Layer  Domain  Help              ⚙ ─ □ ✕   │
├────────┬─────────────────────────────────────────────────────────┤
│        │ ┌─[Syntactic]──[Semantic]──[Pragmatic]─────────────────┐│
│ Files  │ │                                                      ││
│ ────── │ │  ^["greeting"]{                                      ││
│ ▼ proj │ │    !boon["Hello"]                                    ││
│   seed │ │    .. ?[@name]{                                      ││
│   cfg  │ │         !["Welcome, " .. @name]                      ││
│        │ │       | !bone["Welcome, stranger"]                   ││
│ Canon  │ │       }                                              ││
│ ────── │ │    .. @out                                           ││
│ Hardw… │ │  }                                                   ││
│ Theat… │ │                                                      ││
│        │ └──────────────────────────────────────────────────────┘│
├────────┴──────────────────────────────┬──────────────────────────┤
│ Parse Tree            [Syntactic ▾]   │ Registers    [Semantic ▾]│
│ ├─ ^["greeting"]                      │ R0: "Welcome, stranger"  │
│ │  ├─ !boon["Hello"]                  │ R^: { greeting, name: ∅ }│
│ │  ├─ ..                              │ R@: ["Welcome, stranger"]│
│ │  ├─ ?[@name]                        │                          │
│ │  │  ├─ !["Welcome, "..@name]        │ Domain: Cognitive@       │
│ │  │  └─ !bone["Welcome, stranger"]   │ Geometry: Spw.b          │
│ │  └─ @out                            │                          │
├───────────────────────────────────────┴──────────────────────────┤
│ ✓ Valid  │  Cognitive@  │  Spw.b  │  Taste: 7.8 Literate  │ L:3  │
└──────────────────────────────────────────────────────────────────┘
```

### Features

**Multi-pane Layout**
- Resizable panels
- Drag-and-drop arrangement
- Save/restore layouts
- Split views (horizontal/vertical)

**File Management**
- Project folders
- Canon browser
- Recent files
- Search across files

**Editor**
- Syntax highlighting (token-aware)
- Auto-completion (operators, modifiers, bindings)
- Inline diagnostics
- Bracket matching
- Code folding

**Visualization**
- Parse tree (collapsible)
- Register state (live update)
- Domain projection diff
- Taste radar chart

### Keyboard Shortcuts (Desktop-Specific)

| Key | Function |
|-----|----------|
| `Cmd/Ctrl+N` | New seed |
| `Cmd/Ctrl+O` | Open file |
| `Cmd/Ctrl+S` | Save |
| `Cmd/Ctrl+Shift+S` | Save as |
| `Cmd/Ctrl+W` | Close tab |
| `Cmd/Ctrl+\`` | Toggle terminal |
| `F5` | Evaluate |
| `F6` | Step |
| `F7` | Trace |

### Preferences

```yaml
# Preferences dialog maps to:
editor:
  font_family: "JetBrains Mono"
  font_size: 14
  line_height: 1.5
  minimap: true

panels:
  tree: left
  registers: right
  output: bottom

themes:
  light: "spw-light"
  dark: "spw-dark"
  
accessibility:
  high_contrast: false
  reduce_motion: true
  screen_reader: true
```

---

## Mobile Application

### Platform

- **iOS:** Swift/SwiftUI, minimum iOS 15
- **Android:** Kotlin/Jetpack Compose, minimum API 26
- **Cross-platform option:** Flutter or React Native

### Layout (Portrait)

```
┌────────────────────────────┐
│ ≡  Spw Toolkit      ⚙  ⋮  │
├────────────────────────────┤
│ [Syn] [Sem] [Prag]         │
├────────────────────────────┤
│                            │
│  ^["mobile"]{              │
│    !boon["tap to edit"]    │
│    .. @out                 │
│  }                         │
│                            │
│                            │
│                            │
├────────────────────────────┤
│ ▸ Parse    ▸ Regs   ▸ Out  │
├────────────────────────────┤
│ ┌──────────────────────┐   │
│ │ R0: "tap to edit"    │   │
│ │ R^: { mobile }       │   │
│ │ R@: [...]            │   │
│ └──────────────────────┘   │
├────────────────────────────┤
│  [!] [^] [~] [?] [=] [@]   │
│  [bone] [boon] [bane] [..] │
└────────────────────────────┘
```

### Interaction Model

**Touch Gestures**
| Gesture | Action |
|---------|--------|
| Tap | Place cursor / select node |
| Long press | Context menu |
| Swipe left/right | Switch layers |
| Swipe up (editor) | Show keyboard |
| Swipe down (editor) | Dismiss keyboard |
| Pinch | Zoom tree view |
| Two-finger swipe | Switch geometry |

**Operator Ribbon**
- Bottom toolbar with operator buttons
- Swipe ribbon to access modifiers, connectors
- Customizable button order
- Haptic feedback on insert

**Keyboard Support (External)**
- Full desktop keybinding set when hardware keyboard connected
- `Cmd+1/2/3` layer switching
- `Cmd+Enter` evaluate

### Accessibility (Mobile-Specific)

- VoiceOver (iOS) / TalkBack (Android) full support
- Dynamic Type / Font scaling
- Switch Control compatible
- Minimum 44pt touch targets
- Voice input for content

### Data Sync

```yaml
sync:
  provider: iCloud | Google Drive | custom
  conflict_resolution: last_write_wins | merge | prompt
  offline_mode: true
  
local_storage:
  max_seeds: 1000
  max_size_mb: 50
```

---

## Web Application

### Platform

- **Framework:** SvelteKit, Next.js, or SolidStart
- **Editor:** CodeMirror 6 or Monaco
- **State:** Zustand or Jotai
- **Deployment:** Vercel, Cloudflare Pages, self-hosted

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Client                        │
├─────────────────────────────────────────────────────────┤
│  UI Layer (Svelte/React)                                │
│  ├─ Editor Component (CodeMirror)                       │
│  ├─ Tree Visualizer (D3 or custom)                      │
│  ├─ Register Inspector                                   │
│  └─ Taste Dashboard                                      │
├─────────────────────────────────────────────────────────┤
│  Spw Core (WASM)                                        │
│  ├─ Parser                                              │
│  ├─ Evaluator                                           │
│  └─ Projector                                           │
├─────────────────────────────────────────────────────────┤
│  Persistence Layer                                       │
│  ├─ IndexedDB (local)                                   │
│  ├─ LocalStorage (settings)                             │
│  └─ API Client (remote sync)                            │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (Optional)                    │
├─────────────────────────────────────────────────────────┤
│  Auth     │  Storage    │  Canon      │  Collaboration  │
│  ───────  │  ─────────  │  ─────────  │  ─────────────  │
│  OAuth    │  S3/R2      │  Registry   │  WebSocket      │
│  JWT      │  Postgres   │  Versions   │  CRDT           │
└─────────────────────────────────────────────────────────┘
```

### URL Routing

```
/                       Landing / new seed
/edit/:id               Edit seed by ID
/edit?seed=<base64>     Edit seed from URL
/view/:id               Read-only view
/canon/:ref             Browse canon entry
/taste/:id              Taste analysis
/share/:hash            Shared seed (content-addressed)
```

### Editor Features

**CodeMirror Extensions**
- `spw-language` — syntax highlighting, folding
- `spw-lint` — real-time validation
- `spw-complete` — operator/modifier completion
- `spw-hover` — inline documentation
- `spw-format` — auto-formatting

**Layer Panels**

```typescript
interface LayerPanel {
  id: 'syntactic' | 'semantic' | 'pragmatic';
  views: PanelView[];
  activeView: string;
}

interface PanelView {
  id: string;
  label: string;
  component: Component;
  shortcut: string;
}

const syntacticViews: PanelView[] = [
  { id: 'tree', label: 'Parse Tree', component: TreeView, shortcut: 'Alt+T' },
  { id: 'tokens', label: 'Tokens', component: TokenList, shortcut: 'Alt+K' },
  { id: 'ast', label: 'AST JSON', component: ASTJson, shortcut: 'Alt+A' },
];

const semanticViews: PanelView[] = [
  { id: 'registers', label: 'Registers', component: RegisterView, shortcut: 'Alt+R' },
  { id: 'bindings', label: 'Bindings', component: BindingTable, shortcut: 'Alt+B' },
  { id: 'trace', label: 'Eval Trace', component: TraceView, shortcut: 'Alt+E' },
];

const pragmaticViews: PanelView[] = [
  { id: 'domain', label: 'Domain', component: DomainProjection, shortcut: 'Alt+D' },
  { id: 'taste', label: 'Taste', component: TasteAnalysis, shortcut: 'Alt+S' },
  { id: 'output', label: 'Output', component: OutputView, shortcut: 'Alt+O' },
];
```

### Keyboard Navigation (Web-Specific)

| Key | Function |
|-----|----------|
| `Alt+1/2/3` | Focus layer panel |
| `Alt+E` | Focus editor |
| `Alt+←/→` | Previous/next panel view |
| `Escape` | Return to editor |
| `/` | Command palette |
| `?` | Keyboard shortcuts help |

### Sharing

```typescript
interface ShareOptions {
  // URL-embedded (small seeds)
  embedInUrl: boolean;  // ?seed=base64(gzip(source))
  
  // Content-addressed (any size)
  contentAddressed: boolean;  // /share/:sha256
  
  // Collaboration
  realtime: boolean;  // WebSocket + CRDT
  
  // Export
  formats: ('spw.l' | 'spw.b' | 'json' | 'png')[];
}
```

### Progressive Web App

```json
{
  "name": "Spw Toolkit",
  "short_name": "Spw",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1a1a2e",
  "background_color": "#0f0f1a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Offline capability via Service Worker caching Spw WASM core.

---

## Cross-Platform Sync

### Data Model

```typescript
interface SyncedSeed {
  id: string;              // UUID
  hash: string;            // SHA256 of canonical Spw.l
  source: string;          // Spw.b formatted
  metadata: {
    title: string;
    created: ISO8601;
    modified: ISO8601;
    geometry: 'l' | 'b' | 'x';
    domain?: string;
    taste?: TasteScore;
    tags: string[];
  };
  version: number;         // Optimistic locking
}

interface TasteScore {
  axes: [number, number, number, number, number, number];
  elegance: [number, number, number, number, number, number, number, number];
  composite: number;
  profile: string;
}
```

### Sync Protocol

```
Client                          Server
  │                               │
  ├─── GET /sync/status ─────────►│
  │◄── { lastSync, version } ─────┤
  │                               │
  ├─── POST /sync/pull ──────────►│
  │    { since: lastSync }        │
  │◄── { seeds[], deletions[] } ──┤
  │                               │
  ├─── POST /sync/push ──────────►│
  │    { seeds[], deletions[] }   │
  │◄── { conflicts[], accepted } ─┤
  │                               │
  ├─── POST /sync/resolve ───────►│
  │    { resolutions[] }          │
  │◄── { ok } ────────────────────┤
```

---

## Summary

| Platform | Framework | Distribution | Unique Feature |
|----------|-----------|--------------|----------------|
| Terminal | Rust/TUI | cargo, brew | Scriptable, pipeable |
| Desktop | Tauri | DMG, MSI, AppImage | Multi-window, deep OS integration |
| Mobile | SwiftUI/Compose | App Store, Play Store | Operator ribbon, gesture nav |
| Web | SvelteKit + WASM | URL | Shareable, collaborative |

All platforms share:
- Same Spw evaluation core
- Same keyboard model (`Ctrl+1/2/3` layer switching)
- Same three-layer context matrix
- Sync via common data model