# Product Design: Habit Tracker Page

## Size Estimate: S (Small)
A focused daily check-in style habit tracker with a 7-day checkbox grid, streak counters, and a floating add button with bottom sheet. Follows existing Todos page patterns.

---

## Overview

The Habit Tracker page provides a simple, daily check-in experience for tracking recurring habits. Users can:
- View all their habits in a scrollable list
- Mark habits as complete/incomplete for the last 7 days using a checkbox grid
- See current streak counters for each habit
- Add new habits via a floating action button that opens a bottom sheet form

This design prioritizes simplicity and quick daily interactions over complex analytics or calendar views.

---

## UI/UX Design

### Page Structure (Mobile ~400px)

**Header Section**
- Page title "Habits" displayed as large bold text (matches Todos page styling)
- Optional refresh button (icon-only, 48px touch target) in top-right if manual refresh is needed

**Habit List**
- Vertical scrollable list of habit cards
- Each habit card contains:
  - Habit name (left-aligned, truncates with ellipsis if too long)
  - Current streak counter with flame icon (e.g., "🔥 5 days")
  - 7-day checkbox grid showing the last 7 days (today on the right)

**Habit Card Detail (Mobile)**
- Card layout (full width with standard padding)
- Row 1: Habit name + streak badge
  - Name: Bold text, single line with ellipsis overflow
  - Streak: Small badge with flame emoji and day count (e.g., "🔥 12")
- Row 2: 7-day checkbox grid
  - 7 circular checkboxes arranged horizontally
  - Day labels above each checkbox (S, M, T, W, T, F, S or date numbers)
  - Today's checkbox visually highlighted (e.g., border ring)
  - Checked state: Filled circle with checkmark
  - Unchecked state: Empty circle outline
  - Each checkbox is a 44px touch target minimum
- Row 3 (on tap/expand or always visible): Action buttons
  - Edit button
  - Delete button

**7-Day Checkbox Grid Behavior**
- Tapping a checkbox toggles completion for that specific day
- Visual feedback: Checked boxes show filled state with a subtle animation
- Today's checkbox has a distinct border/highlight to help users quickly identify it
- Past days can be marked/unmarked (to correct mistakes)
- Future days are not shown (only today and 6 days prior)

**Streak Counter Logic**
- Counts consecutive days completed ending with today (or yesterday if today is incomplete)
- Resets to 0 if there's a gap in the streak
- Displayed as "🔥 X" where X is the number of days

**Floating Add Button**
- Positioned in bottom-right corner, above the bottom navigation
- Circular button, 56px diameter, primary color
- Plus icon centered
- Fixed position, always visible when scrolling
- Adequate spacing from bottom nav bar (minimum 16px gap)

**Add Habit Bottom Sheet**
- Slides up from bottom when FAB is tapped
- Drag handle at top for dismissal
- Content:
  - Title: "New Habit"
  - Text input field for habit name (44px height, full width)
  - "Create" button (full width, primary style, 44px height)
  - Optional: Quick suggestions below input (e.g., "Exercise", "Read", "Meditate") as tappable chips
- Dismissable by:
  - Tapping outside the sheet
  - Swiping down
  - Tapping a close button (X) if present

**Empty State**
- Displayed when user has no habits
- Friendly illustration or emoji (e.g., "📋")
- Message: "No habits yet"
- Sub-message: "Tap the + button to create your first habit"
- Centered vertically in the content area

### Loading State
- Linear progress bar at top of content area (matches app pattern)
- Brief loading text: "Loading your habits..."

### Error State
- Alert banner at top of page (destructive variant)
- Error message displayed
- Dismissable or auto-dismisses on retry

### Delete Confirmation
- Confirmation dialog appears when user taps delete
- Title: "Delete Habit?"
- Message: "This will permanently delete [habit name] and all its history."
- Buttons: "Cancel" (outline) and "Delete" (destructive)

### Edit Habit Flow
- Tapping edit opens the bottom sheet pre-filled with habit name
- User can modify the name
- "Save" button replaces "Create" button
- Cancel dismisses without saving

---

## Tablet/Desktop Enhancements (sm: breakpoint and above)

**Layout Adjustments**
- Habit cards display in a wider format with more horizontal space
- The 7-day grid can show full day names (Sun, Mon, Tue...) instead of single letters
- Floating action button can be replaced with an inline "Add Habit" button in the header area
- Bottom sheet becomes a centered dialog/modal on larger screens

**Additional Space Usage**
- Streak counter and habit name on same row with more breathing room
- Action buttons (edit/delete) visible on hover without needing to tap/expand

---

## Edge Cases

**Long Habit Names**
- Names truncate with ellipsis on mobile
- Full name shown in edit view and on hover (desktop)

**Many Habits (Scrolling)**
- Page scrolls naturally; FAB remains fixed above bottom nav
- Consider adding a subtle shadow under header when scrolling

**Streak Edge Cases**
- New habit: Shows "🔥 0" or no streak badge until first completion
- Habit completed today only: Shows "🔥 1"
- Gap in streak: Counter resets, only counts from most recent consecutive run

**Offline/Sync**
- Checkmarks should feel instant (optimistic updates)
- If sync fails, show a subtle error indicator and retry option