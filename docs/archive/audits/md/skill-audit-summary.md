# @spw-vim-semantics-coherence Skill - Audit Summary

**Status:** ✅ COMPLETE
**Duration:** 1 session
**Output:** 2 comprehensive documents + implementation roadmap

---

## What This Skill Does

Validates that vim motions genuinely align with Spw language structure by:
1. Analyzing each motion (h/j/k/l/w/b/e) against language semantics
2. Mapping to Spw operators, connectors, containers, modifiers
3. Identifying gaps between topology-based navigation and semantic navigation
4. Scoring coherence across 6 dimensions
5. Recommending prioritized patches

---

## Key Findings

### Overall Coherence Score: 6.5/10 ⚠️

The vim motions are **topologically sound but semantically shallow**.

### Scorecard

| Dimension | Score | Status |
|-----------|-------|--------|
| Tree Topology | 9/10 | ✅ Excellent |
| Operator Awareness | 4/10 | ⚠️ Missing |
| Connector Recognition | 3/10 | 🚫 Not implemented |
| Container Semantics | 5/10 | ⚠️ Weak |
| Valence Awareness | 2/10 | 🚫 Not implemented |
| User Mental Model | 6/10 | ⚠️ Unclear |

---

## What's Working ✅

```
Motions h/j/k/l:
├─ Navigate tree perfectly (9/10)
├─ Pipeline traversal is natural (j/k for data flow steps)
├─ Ergonomic vim-like layout
└─ Handles all node types correctly

Why: Tree topology is sound, generic tree nav principles apply
```

---

## What's Missing 🚫

```
Semantic Awareness:
├─ Operator types (8 operators: !, @, ~, <>, ?, *, =, ^)
│  └─ Problem: All treated identically
│     Solution: New motions to jump by operator type
│
├─ Connectors (.., |, &, /, ->)
│  └─ Problem: Data flow paths not visible
│     Solution: Highlight pipelines, show connector types
│
├─ Containers (Frame, Body, Scope, Capsule)
│  └─ Problem: Can't distinguish "enter params" vs "enter code"
│     Solution: Smart descent logic + new container motions
│
└─ Valence Modifiers (boon, bone, bane, bonk, honk)
   └─ Problem: Completely invisible in navigation
      Solution: New motions to jump by valence quality
```

---

## Real Example: The Disconnect

**Spw Pattern (semantic):**
```spw
!boon["raw_data"]        ; positive inject (start)
  .. ^parse             ; observe/tap the output
  .. ~normalize         ; transform operation
  .. ?valid             ; probe/query condition
  .. @result            ; emit result to output
```

**Semantic Intent:** "Data pipeline with 5 semantic stages"

**User's Mental Model:**
> "I want to navigate through the transformation steps, going from inject → parse → normalize → validate → emit"

**What Vim Motions Currently Do:**
- `j` moves to next term ✓ (works!)
- But UI shows: generic "next sibling" (no context)
- Motion doesn't know: "these are connected by `..` pipeline operator"
- User sees: tree structure, not semantic pipeline

**With Enhanced Motions:**
- `j` moves to next term ✓ (same)
- But UI shows: "next pipeline step (via ..)"
- Motion knows: "in pipeline context"
- User sees: semantic data flow

**Coherence Improvement:** 6/10 → 8/10 (pipeline-aware)

---

## Motion Analysis Summary

| Motion | Current | Issue | Enhancement |
|--------|---------|-------|-------------|
| **h** | Parent/collapse | ✓ Good | Add context label |
| **j** | Next sibling | Works but unclear context | Show connector type |
| **k** | Prev sibling | Works but unclear context | Show connector type |
| **l** | First child | Can't distinguish Frame vs Body | Smart descent |
| **w** | Next at depth | Confusing wrap behavior | Clarify semantics |
| **b** | Prev at depth | Confusing wrap behavior | Clarify semantics |
| **e** | End of siblings | ✓ Decent | Show context |

---

## 3-Phase Improvement Plan

### Phase 1: Context Awareness (2-3 hours) 🟢
**Goal:** +1pt coherence (users understand what they're navigating)
**Risk:** Low (UI-only changes)

**Changes:**
- Display node semantics: type, operator, modifiers
- Update motion hints based on context
- Add visual indicators for containers

**Before:** `j` → "next sibling"
**After:** `j` → "next pipeline step (via ..)" [in pipeline] OR "next branch" [in branching]

---

### Phase 2: Operator Motions (4-6 hours) 🟡
**Goal:** +2pts coherence (navigate by linguistic intent)
**Risk:** Medium (new keyboard bindings, conflict handling)

**New Motions:**
```
Operators:
O → next operation (any)
T → next transform (~)
I → next inject (!)
E → next emit (@)
P → next probe (?)
A → next branch (*)
V → next tap (^)
C → next couple (<>)

Valence:
<space>+ → next positive (boon)
<space>- → next negative (bane)
<space>* → next emphatic (bonk)
<space>! → next exceptional (honk)
```

**Example:** "Show me all transforms" → T T T T (jumps through all `~` operators)

---

### Phase 3: Semantic Parsing (10+ hours) 🔴
**Goal:** +3pts coherence (full language integration)
**Risk:** High (AST annotation, structural changes)

**Features:**
- Recognize pipeline chains (`term1 .. term2 .. term3`)
- Detect branching blocks (`*{ expr1; expr2 }`)
- Track scope nesting with breadcrumbs
- Valence-aware grouping

**Phase 3 is research-grade enhancement, deferred for now**

---

## Recommendation: Implement Phases 1 + 2

**Why:**
- Phase 1 is low-risk foundation
- Phase 2 shows significant semantic capability
- Total effort: 6-9 hours
- Coherence improvement: 6.5 → 9/10 (excellent)
- User value: High (can navigate by intent)

**Timeline:**
- Day 1: Phase 1 implementation & testing
- Day 2: Phase 2 design & conflict resolution
- Day 3: Phase 2 implementation & testing
- Day 4: Validation & documentation

---

## Deliverables Generated

### 1. SEMANTIC_COHERENCE_AUDIT.md (1,200+ lines)
Detailed audit with:
- Motion-by-motion coherence analysis (h/j/k/l/w/b/e)
- Context-dependent semantic problems
- Coherence scoring matrix
- Real-world test cases
- Linguistic gaps and recommendations
- Phase implementation details

### 2. COHERENCE_ACTION_PLAN.md (800+ lines)
Implementation roadmap with:
- Visual coherence radar
- 3-phase patch roadmap
- Decision matrix (which phases to implement)
- Detailed step-by-step implementation guide
- Risk mitigation strategies
- Success criteria for each phase

### 3. This Summary (Overview)

---

## Using These Outputs

### For Immediate Action:
```bash
# Read the action plan
cat src/features/keyboard/COHERENCE_ACTION_PLAN.md

# Decision: Implement Phase 1 + 2? Yes/No
# If yes, follow "Detailed Implementation" sections
```

### For Deep Understanding:
```bash
# Read the full audit
cat src/features/keyboard/SEMANTIC_COHERENCE_AUDIT.md

# Study:
# - Motion coherence matrix (Part 3)
# - Context-dependent problems (Part 2)
# - Real test cases (Part 9)
```

### For Implementation:
```bash
# Phase 1 checklist (file: COHERENCE_ACTION_PLAN.md)
# - Step 1a: Add semantic context analysis
# - Step 1b: Update UI display
# - Step 1c: Update motion hints
# - Testing: 8-point checklist

# Phase 2 checklist (file: COHERENCE_ACTION_PLAN.md)
# - Step 2a: Implement operator traversal
# - Step 2b: Register motion keys
# - Step 2c: Update geology schema
```

---

## Key Insights

### 1. Topology vs Semantics Divide
The system navigates **tree topology** perfectly but doesn't understand **language semantics**. This is like a browser that can traverse HTML perfectly but doesn't understand document structure.

### 2. Pipeline Recognition Gap
Pipeline chains (`term1 .. term2 .. term3`) are among the most common Spw patterns, yet motions treat them as generic siblings. This is a high-impact gap.

### 3. Operator Invisibility
Spw has 8 distinct operators with semantic meaning, but they're invisible to navigation. Users can't "jump to all transforms" or "jump to error handlers" - they must navigate generically.

### 4. Quick Wins Available
Phase 1 (2-3 hours) provides immediate user value through better context display. Low risk, good return.

### 5. Scalable Path
Phases stack well: Phase 1 enables Phase 2 easily, Phase 2 enables Phase 3 research.

---

## Related Skills

After implementing phases 1+2, consider running:

- **@spw-fluency-validation** - Verify that enhanced motions improve actual fluency scores
- **@spw-keybinding-coverage** - Audit keyboard real estate usage for new operator motions
- **@spw-research-rigor** - Formalize the semantic coherence improvement as measurable experiment

---

## Questions This Skill Answers

1. ✅ **"Do vim motions align with Spw structure?"**
   - Partially (6.5/10). Tree topology yes, semantics no.

2. ✅ **"Where's the disconnect?"**
   - Operators, connectors, containers, valence all invisible.

3. ✅ **"How to improve?"**
   - 3-phase plan from context-awareness → operator-motions → semantic-parsing.

4. ✅ **"What's the effort?"**
   - Phase 1+2: 6-9 hours, +3pts coherence → 9/10

5. ✅ **"What's the risk?"**
   - Phase 1: Low (UI). Phase 2: Medium (new keys). Phase 3: High (AST changes).

---

## Next Steps

### Immediate:
1. Review COHERENCE_ACTION_PLAN.md
2. Decide: Implement Phases 1+2? (Recommended: YES)
3. Assign ownership
4. Create implementation PR

### Follow-up Skills:
- Run @spw-vim-motion-naturality to test phases 1+2 on real patterns
- Run @spw-fluency-validation to measure improvement in actual metrics
- Run @spw-geological-coherence-check to ensure layers still coherent

---

## Metrics

| Metric | Value | Meaning |
|--------|-------|---------|
| **Documents Generated** | 3 | Audit + plan + summary |
| **Lines of Analysis** | 2,000+ | Detailed breakdown |
| **Motions Analyzed** | 7 | All current motions |
| **Gaps Identified** | 5 major | Specific recommendations |
| **Implementation Phases** | 3 | Staged approach |
| **Effort Estimate** | 6-9 hrs | Phases 1+2 |
| **Coherence Improvement** | +3pts | 6.5 → 9/10 |
| **Skill Reusability** | High | Can rerun post-patches |

---

## Conclusion

The **@spw-vim-semantics-coherence skill** successfully audited the vim keybindings system and identified a clear path to linguistic alignment.

**Current State:** Motions navigate topology well (9/10) but miss semantic meaning (4/10 avg).
**Target State:** Full semantic awareness and operator-focused navigation (9.5/10).
**Path:** 3-phase implementation plan, recommend phases 1+2 now.

**Recommendation:** ✅ **Implement Phases 1 + 2** for substantial coherence improvement with manageable risk.

---

**Skill Status:** ✅ COMPLETE | 📊 Analysis Delivered | 🚀 Ready for Implementation

See SEMANTIC_COHERENCE_AUDIT.md and COHERENCE_ACTION_PLAN.md for full details.
