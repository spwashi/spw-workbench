# Phase 3.1 Testing Guide

## Quick Start: Test the Publish Feature

### Prerequisites
- [ ] Run `npm run build` to verify TypeScript compilation
- [ ] Spw Workbench running (`npm run dev`)
- [ ] Browser DevTools open (for console errors, network tab)

### Test Scenario 1: Quick Export (Has Title)

**Setup**:
1. Type Spw code: `!boon["hello"] .. @out`
2. Click "Parse" to parse it
3. In editor, add a title as first line: `my-example`

**Test Steps**:
1. Click "Publish" button in sidebar (or press Shift+E)
2. **Expected**: Drawer slides in from right
3. **Expected**: Title field shows "my-example"
4. **Expected**: "Quick export" section visible with:
   - Profile selector dropdown
   - "Export as HTML" button
   - "Customize..." button
5. Click "Export as HTML"
6. **Expected**: Toast appears: "✓ Downloaded: my-example.html"
7. **Expected**: Library prompt appears asking to save to library
8. Click "Not right now"
9. **Expected**: Drawer closes smoothly

**Verify Exported HTML**:
- Download should appear as `my-example.html`
- Open in browser
- Should show:
  - Title: "my-example"
  - Genre name and info
  - Pretty-printed Spw code
  - Genre-specific colors (based on active genre)
  - Metadata section

### Test Scenario 2: Form Export (No Title)

**Setup**:
1. Clear editor
2. Type Spw code: `~wonder["why?"]`
3. Don't parse yet (optional)

**Test Steps**:
1. Click "Publish"
2. **Expected**: Drawer opens
3. **Expected**: Publish form visible with:
   - Title field (required, focused)
   - Author field (optional)
   - Description field (optional)
   - Tags field (optional)
   - "Publish Document" and "Cancel" buttons
4. **Expected**: "Quick export" section hidden
5. Enter title: "wonderer"
6. Enter author: "Spw Experimenter"
7. Enter tags: "wonder,exploration"
8. Click "Publish Document"
9. **Expected**: Document published and exported
10. **Expected**: Toast: "✓ Downloaded: wonderer.html"
11. **Expected**: Library prompt
12. Click "Yes, save it"
13. **Expected**: Toast: "Publication saved to library"
14. **Expected**: Drawer closes

### Test Scenario 3: Profile Switching

**Setup**:
1. New Spw code with title: `example-code`

**Test Steps**:
1. Click "Publish"
2. Quick export section visible
3. Click profile selector dropdown
4. **Expected**: Options visible:
   - Quick Export (default)
   - Web Share
   - Academic
   - Narrative
   - Technical
5. Select "Academic"
6. Click "Export as HTML"
7. **Expected**: Export succeeds
8. **Verify**: Download should reference selected profile somehow (or check metadata)

### Test Scenario 4: Customize Toggle

**Setup**:
1. New Spw code: `test-doc`

**Test Steps**:
1. Click "Publish"
2. Quick export section visible
3. Click "Customize..." button
4. **Expected**:
   - Quick export section hides
   - Form section appears
   - Fields pre-filled with current values
5. Click "Customize..." again (if visible)
6. **Expected**: Form hides, quick export appears again

### Test Scenario 5: Genre Integration

**Setup**:
1. Open genre selector (if visible in header)
2. Switch to different genre (e.g., "Narrative Fiction")
3. New Spw code: `story-example`

**Test Steps**:
1. Click "Publish"
2. Export as HTML
3. **Verify in Browser**:
   - HTML should show "Genre: Narrative Fiction"
   - Colors should match narrative genre (purple/pink tones)
   - Line height/spacing should match narrative pacing

### Test Scenario 6: localStorage Persistence

**Setup**:
1. Publish 2-3 documents

**Test Steps**:
1. Open DevTools → Application → localStorage
2. **Expected**: Entry `spw-publications` exists
3. **Expected**: Entry contains JSON array with publication objects
4. **Verify each publication has**:
   - `id`, `title`, `genre`, `content`, `createdAt`, etc.
   - `formats` array with HTML export URI
5. Refresh page
6. **Expected**: Publications still accessible (manager re-initializes from localStorage)

### Test Scenario 7: Error Handling

**Setup**: Various error conditions

**Test Steps**:

*Missing title*:
1. Open form (no title in code)
2. Leave title field empty
3. Try to submit
4. **Expected**: Toast warning "Title is required"
5. Form stays open

*No active genre*:
1. Somehow deactivate genre (or test with fresh instance)
2. Try to publish
3. **Expected**: Toast error "No active genre"

*No input*:
1. Open publish dialog with empty editor
2. Complete form
3. Click publish
4. **Expected**: Export succeeds with empty `content: ""`

### Test Scenario 8: Responsive Behavior

**Desktop**:
1. Publish → drawer opens on right, 400px wide

**Tablet** (600px-900px):
1. Resize browser to tablet width
2. Publish → drawer should still work, might be narrower

**Mobile** (<600px):
1. Resize to mobile width
2. Publish → drawer full-width
3. **Expected**: Form fields stack vertically
4. **Expected**: Buttons stack or compress

## Automated Test Checklist

These would be implemented in vitest/testing-library:

### Unit Tests
- [ ] `generateHtmlExport()` creates valid HTML structure
- [ ] `htmlToDataUrl()` creates proper blob URL
- [ ] `libraryManager.publish()` generates unique IDs
- [ ] `libraryManager.search()` filters correctly
- [ ] Default profiles have correct schema version
- [ ] Genre CSS generation produces valid CSS
- [ ] Spw syntax highlighter produces correct classes

### Integration Tests
- [ ] Publish dialog mounts/unmounts cleanly
- [ ] Form visibility toggles based on title
- [ ] Profile selector updates form defaults
- [ ] Export download triggers with correct filename
- [ ] localStorage writes and reads correctly
- [ ] Multiple exports to same document updates version

### E2E Tests (Playwright/Cypress)
- [ ] User can publish with quick export
- [ ] User can publish with form
- [ ] User can switch genres and see CSS change
- [ ] User can customize and export
- [ ] User can toggle profile/customize
- [ ] Downloaded HTML is valid and readable

## Performance Checks

**Bundle Size**:
- [ ] `npm run build` completes without warnings
- [ ] Library code adds <50KB to bundle

**Runtime**:
- [ ] Publish dialog opens <100ms
- [ ] HTML export generates <500ms
- [ ] localStorage write/read <50ms
- [ ] No memory leaks on repeated publish/export

## Cleanup Checklist

- [ ] All console errors fixed
- [ ] TypeScript strict mode passes
- [ ] No unused imports/variables
- [ ] CSS classes follow `spw-*` naming
- [ ] Data attributes use `data-spw-component`
- [ ] Event listener cleanup in unmount
- [ ] Toast notifications clean up DOM
- [ ] No global state pollution

## Recommended Browser Testing

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ✓ Test |
| Firefox | Latest | ✓ Test |
| Safari | Latest | ✓ Test |
| Edge | Latest | ✓ Test |
| Mobile Chrome | Latest | ✓ Test |

## Rollback Plan

If issues found:
1. Comments in code mark removable sections
2. Can disable publish action without affecting core
3. localStorage entries are isolated
4. All new code in separate files (easy to remove)
