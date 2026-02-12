# Product Design: Todo List Page Redesign - Simplify & Streamline

## Size Estimate
**M (Medium, 1-2 days)**

The redesign involves restructuring the layout and reducing visible elements, but preserves existing functionality. Changes are primarily UI/UX reorganization rather than new features.

---

## Overview

The Todo List page currently displays a statistics panel, create form, filter/sort controls, and todo items all competing for attention. This redesign streamlines the interface by:

1. **Hiding complexity by default** - Moving statistics and controls behind expandable sections
2. **Focusing on the core task** - Making the todo list the primary visual element
3. **Reducing action buttons** - Using swipe gestures on mobile and hover states on desktop
4. **Simplifying visual hierarchy** - Cleaner cards with less chrome and better spacing

The redesign keeps all existing functionality accessible but surfaces it contextually rather than all at once.

---

## UI/UX Design

### Mobile Layout (~400px viewport) - Primary Design

#### Page Structure (Top to Bottom)

**1. Header Area**
- Page title "Todos" - clean, standard weight (not gradient text)
- Compact quick-add input field to the right of title or directly below
- No refresh button visible (pull-to-refresh gesture instead)

**2. Quick Add Bar**
- Single-line input field with placeholder "Add a todo..."
- Small "+" button (44×44px) at right edge of input
- Tapping input expands it to reveal optional due date picker (inline, not dialog)
- Input collapses back after adding todo

**3. Smart Summary Bar (Replaces Statistics Panel)**
- Single horizontal bar showing only actionable info:
  - "3 overdue" (red, tappable - filters to overdue)
  - "2 due today" (blue, tappable - filters to today)
  - When no urgent items: shows "5 of 12 done" as subtle text
- Tapping any item acts as a quick filter
- Disappears when list is empty

**4. Todo List**
- Each todo is a minimal card:
  - Left: Checkbox (44×44px touch target)
  - Center: Title (wraps to 2 lines max)
  - Right: Subtle due date text (no badge, just "Tomorrow" or "Mar 5")
- No visible action buttons on cards
- Swipe left reveals: Edit, Delete actions
- Swipe right: Quick complete animation
- Tap on title: Opens todo detail view
- Completed todos show strikethrough, muted colors

**5. Filter/Sort Access**
- Small filter icon button in top-right corner of list section
- Opens bottom sheet with all filter/sort options when tapped
- Badge count on icon when filters are active
- Options in bottom sheet:
  - Sort: Newest, Oldest, Due Date
  - Show: All / Active / Completed
  - Due: All / Today / This Week / Overdue
- "Reset filters" link at bottom when any filter is active

**6. Empty State**
- When no todos: Simple illustration with "No todos yet" message
- When filters return no results: "No matching todos" with "Clear filters" button

#### Interactions & Gestures

**Pull-to-Refresh**
- Pull down from top of list to refresh
- Replaces refresh button for cleaner header

**Swipe Actions**
- Swipe left on todo: Reveals Edit and Delete buttons (both 60px wide)
- Swipe right on todo: Quick complete with satisfying animation
- Swipe is discoverable via subtle hint on first use

**Tap Behavior**
- Tap checkbox: Toggle complete
- Tap title: Navigate to detail view
- Tap due date: Open date picker dialog

**Long Press**
- Long press on todo: Opens context menu with all actions (View, Edit, Delete, Set Due Date)
- Provides alternative to swipe for accessibility

#### Loading States

**Initial Load**
- Skeleton cards (3-4 placeholder items)
- No spinner or progress bar

**Background Refresh**
- Pull-to-refresh shows subtle spinner at top
- No blocking overlay
- List remains interactive

**Action Feedback**
- Completing todo: Checkbox fills with animation, slight bounce
- Deleting todo: Card slides out to left
- Creating todo: New card slides in from top with subtle animation

#### Error Handling

**Network Error**
- Toast notification at bottom: "Couldn't save. Tap to retry."
- Todo remains in optimistic state (visible but marked)

**Empty Input**
- Input border turns red briefly
- Placeholder changes to "Enter a todo title"

---

### Tablet/Desktop Enhancements (>640px)

**Layout Adjustments**
- Maximum content width of 600px, centered
- More generous spacing between elements

**Hover States Replace Swipe**
- Action buttons (View, Edit, Delete) appear on hover over todo card
- Buttons are icon-only, appearing at right side of card
- Checkbox area enlarges subtly on hover

**Quick Add**
- Input always expanded, showing due date picker option
- Keyboard shortcut: Enter to add, Cmd+Enter to add with today's date

**Smart Summary Bar**
- Can show more detail: "3 overdue • 2 due today • 5 of 12 complete"
- Filters visible as clickable chips

**Filter Panel**
- Appears as dropdown from filter icon rather than bottom sheet
- All options visible without scrolling

---

### Before & After Comparison

**Before (Current):**
- Stats panel visible at all times (3 numbers + progress bar + badges)
- Create form with input + 2 buttons + date badge
- Controls panel with dropdown + 2 toggles + 5 filter pills
- Each todo card has 3 visible action buttons

**After (Redesigned):**
- Smart summary bar (single line, contextual)
- Minimal quick-add input (expands only when focused)
- Controls hidden behind filter icon (bottom sheet on mobile)
- Clean todo cards with actions revealed via gesture/hover

---

### Accessibility Considerations

- All swipe actions have alternative access via long-press context menu
- Touch targets remain 44×44px minimum
- Filter state is announced via screen reader when changed
- Keyboard users can access all actions via tab navigation on desktop
- Pull-to-refresh has alternative refresh in filter menu