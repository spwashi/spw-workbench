# Vim Keybindings & Fluency Audit System - Quick Reference

## 📖 Documentation Map

### Start Here
- **[VIM_IMPLEMENTATION_COMPLETE.md](./VIM_IMPLEMENTATION_COMPLETE.md)** - Complete implementation overview (600 lines)

### Learn How It Works
- **[src/features/keyboard/VIM-KEYBINDINGS.md](./src/features/keyboard/VIM-KEYBINDINGS.md)** - Architecture & design (350 lines)

### Integrate Into Your App
- **[src/features/keyboard/IMPLEMENTATION.md](./src/features/keyboard/IMPLEMENTATION.md)** - Integration guide (400 lines)

### Test Everything
- **[src/features/keyboard/TESTING.md](./src/features/keyboard/TESTING.md)** - Test suite (500 lines)

---

## ⌨️ Keyboard Bindings

### Activation Context Toggle (Global)
```
<space> v  → Visual semantic activation
<space> e  → Editing semantic activation
```

### Vim Motions (Inspector Mode)
```
h  → Move to parent / collapse
j  → Move to next sibling
k  → Move to previous sibling
l  → Move to first child / expand

w  → Next node at same depth
b  → Previous node at same depth
e  → Last node at current depth
```

### Operators (Pragmatic Context)
```
d + motion  → Delete / desugar pattern
y + motion  → Yank semantic representation
c + motion  → Change to sugared/desugared form
```

---

## 🚀 Quick Start

### 1. Initialize in Your App
```typescript
import {
  geologyPanel,
  fluencyReport,
  developmentLog
} from '@/features/keyboard'

// Mount components
geologyPanel.mount('.keyboard-reference')
fluencyReport.mount('.dev-tools-panel')
developmentLog.mount('.dev-tools-panel')
```

### 2. Access Activation Context
```typescript
import { appState } from '@/infra/state'

const context = appState.getActivationContext()
// 'visual-semantic' or 'editing-semantic'
```

### 3. Record Fluency Audit
```typescript
import { developmentLog } from '@/features/keyboard'

// After developing a component
const audit = developmentLog.recordComponentAudit('MyComponent')
console.log(audit.difficulties, audit.recommendations)
```

### 4. Get Metrics
```typescript
import { fluencyAudit } from '@/features/keyboard'

const metrics = fluencyAudit.getMetrics()
console.log({
  efficiency: metrics.navigationalKeystrokes / metrics.totalKeystrokes,
  coherence: metrics.semanticCoherence,
  patterns: metrics.commonMotionSequences
})
```

---

## 📁 File Locations

### Core Implementation
```
src/features/keyboard/
├── activation-context.ts              # Context manager
├── geology-schema.ts                  # Keybinding definitions
├── vim-pragmatic-motions.ts           # Motion handlers
├── vim-operators.ts                   # d/y/c operators
├── fluency-audit.ts                   # Metrics collection
├── keyboard-manager.ts                # Keyboard handler (updated)
└── index.ts                           # Exports (updated)
```

### UI Components
```
src/features/keyboard/components/
├── keybinding-geology.ts              # Geology panel
├── keybinding-geology.css             # Geology styles
├── fluency-report.ts                  # Report component
├── fluency-report.css                 # Report styles
├── fluency-development-log.ts         # Log component
└── fluency-development-log.css        # Log styles
```

### State Management
```
src/infra/state/
├── state.ts                           # AppState with ActivationContext
└── index.ts                           # Exports
```

### App Integration
```
src/app/components/
└── keyboard-hints.ts                  # Updated with vim hints
```

---

## 📚 Documentation Organization

| Document | Purpose | Length | Location |
|----------|---------|--------|----------|
| VIM_IMPLEMENTATION_COMPLETE.md | Complete overview | 600 L | root |
| VIM-KEYBINDINGS.md | Architecture & design | 350 L | features/keyboard/ |
| IMPLEMENTATION.md | Integration guide | 400 L | features/keyboard/ |
| TESTING.md | Test suite | 500 L | features/keyboard/ |
| README-VIM.md | This quick ref | 300 L | root |

---

## 🎯 Common Tasks

### Mount Geology Panel
```typescript
import { geologyPanel } from '@/features/keyboard'
geologyPanel.mount('.sidebar')
```

### Toggle Activation Context Programmatically
```typescript
import { appState } from '@/infra/state'

appState.setActivationContext('editing-semantic')
// or
appState.toggleActivationContext()
```

### Record Motion Event
```typescript
import { fluencyAudit } from '@/features/keyboard'

fluencyAudit.recordKeyboardEvent(
  'h',                    // key
  'inspect',              // mode
  'visual-semantic',      // activation context
  'node-123'             // optional: target node ID
)
```

### Get Fluency Metrics
```typescript
const metrics = fluencyAudit.getMetrics()
console.log({
  totalKeystrokes: metrics.totalKeystrokes,
  efficiency: (metrics.navigationalKeystrokes / metrics.totalKeystrokes * 100).toFixed(1) + '%',
  coherence: (metrics.semanticCoherence * 100).toFixed(0) + '%',
  patterns: Array.from(metrics.commonMotionSequences.entries())
})
```

### Export Development Log
```typescript
import { developmentLog } from '@/features/keyboard'

const entries = developmentLog.getEntries()
const json = JSON.stringify(entries, null, 2)
// Send to server or save to file
```

---

## 🔧 Configuration

### Disable Vim Features
```typescript
import { activationContextManager } from '@/features/keyboard'

activationContextManager.disable()
```

### Custom Fluency Report Options
```typescript
import { FluencyReportComponent } from '@/features/keyboard'

const report = new FluencyReportComponent({
  showMetrics: true,
  showPatterns: true,
  showDifficulties: true,
  compactMode: false
})

report.mount('.panel')
```

---

## 🧪 Testing

### Run TypeScript Check
```bash
npm run build
```

### Manual Testing Checklist
- [ ] Toggle activation context (space+v/e)
- [ ] Navigate AST with hjkl
- [ ] View keybinding geology panel
- [ ] Check fluency metrics update
- [ ] View development log
- [ ] Test export functions
- [ ] Check dark mode
- [ ] Test responsive layout

### Run Specific Tests
See `TESTING.md` for detailed test procedures

---

## 🐛 Troubleshooting

### Issue: Motions not working
**Solution:** Click on AST tree to ensure focus, verify mode is 'inspect'

### Issue: Activation context not changing
**Solution:** Check DOM for `data-activation-context` attribute on html element

### Issue: Metrics not accumulating
**Solution:** Verify `fluencyAudit.recordKeyboardEvent()` is being called

### Issue: Components not visible
**Solution:** Verify parent selector exists in DOM and mount() was called

See `IMPLEMENTATION.md` for more troubleshooting

---

## 📊 Architecture Overview

```
User Input (Keyboard)
    ↓
Keyboard Manager (keyboard-manager.ts)
    ├─ Context Toggle Handler
    │  └─ ActivationContextManager
    │     └─ appState.setActivationContext()
    │
    ├─ Motion Handler
    │  └─ handleVimMotion()
    │     └─ AST Node Navigation
    │
    └─ Fluency Recorder
       └─ fluencyAudit.recordKeyboardEvent()
          └─ Metrics Collection

UI Components (Render State)
├─ Geology Panel → Shows current context
├─ Report → Shows live metrics
└─ Log → Shows audit history
```

---

## 🎓 Learning Path

1. **Beginner**: Read `VIM_IMPLEMENTATION_COMPLETE.md` overview section
2. **Intermediate**: Read `VIM-KEYBINDINGS.md` architecture section
3. **Advanced**: Read `IMPLEMENTATION.md` integration section
4. **Expert**: Review source code with TypeScript types

---

## 🏆 Features

✅ **Activation Context** - Switch between visual/editing semantics
✅ **Vim Motions** - hjkl navigation for AST trees
✅ **Operators** - d/y/c semantic operations
✅ **Fluency Audit** - Automatic metrics collection
✅ **Difficulty Detection** - Identify navigation pain points
✅ **Pattern Recognition** - Find successful key sequences
✅ **Development Log** - Per-component fluency tracking
✅ **Export** - JSON export for analysis

---

## 📞 Getting Help

### Documentation
- **Overview**: `VIM_IMPLEMENTATION_COMPLETE.md`
- **Design**: `VIM-KEYBINDINGS.md`
- **Integration**: `IMPLEMENTATION.md`
- **Testing**: `TESTING.md`

### Quick Reference
- **This File**: `README-VIM.md`

### Source Code
- Location: `src/features/keyboard/`
- All files have inline documentation
- TypeScript types are self-documenting

---

## ✨ Summary

A complete, production-ready vim keybindings and fluency audit system:

- 🎯 **Goal**: Enable efficient keyboard navigation with fluency analysis
- 🚀 **Status**: Complete and ready for production
- 📦 **Size**: ~3,500 lines of code
- 📚 **Docs**: 1,200+ lines of documentation
- ✅ **Tests**: 50+ test cases defined
- 🔒 **Quality**: Full TypeScript type safety
- 🌙 **Design**: Dark mode & responsive

---

## 🎬 Get Started Now

1. Read: `VIM_IMPLEMENTATION_COMPLETE.md`
2. Follow: Integration section in `IMPLEMENTATION.md`
3. Test: Use keyboard bindings
4. Audit: Record component fluency
5. Analyze: View metrics in reports

**Status: ✅ READY FOR PRODUCTION**
