# Product Design: Workflow Main UI Page Redesign

## Size Estimate

**L (Large)** - This is a significant UI overhaul requiring:
- Three distinct view implementations (Kanban, List, Timeline)
- Tab navigation system with state persistence
- Mobile-first responsive design for all views
- Shared detail sheet and action patterns

---

## Overview

### Purpose
Redesign the workflow main UI page to provide admins with three complementary view options for managing workflow items. Each view serves a different mental model and workflow preference, allowing admins to choose their preferred way of visualizing and acting on items.

### Why It's Needed
- Different tasks benefit from different visualization approaches
- Admins have varying preferences for how they process workflow items
- The current single-view approach doesn't accommodate diverse workflow patterns
- Providing options increases admin satisfaction and efficiency

### The Three Views

1. **Kanban Board** - Visual status-based organization for pipeline overview
2. **Action-Focused List** - Prioritized list surfacing urgent items for quick action
3. **Timeline/Activity Stream** - Chronological view for tracking recent activity and context

---

## UI/UX Design

### Mobile Layout (~400px viewport)

#### Global Page Structure

**Header Area**
- Page title "Workflow" left-aligned, 18px semibold
- Optional badge showing pending count (e.g., "4 pending") right-aligned
- Total height: 48px with 16px horizontal padding

**View Switcher Tabs**
- Three equal-width tab buttons spanning full width
- Each tab shows:
  - Primary label (e.g., "List")
  - Secondary description in smaller text (e.g., "Action-Focused")
- Active tab: Bottom border accent color, foreground text
- Inactive tabs: No border, muted text
- Sticky positioned below header during scroll
- Touch target: Minimum 48px height per tab
- Tab order (left to right): List, Kanban, Timeline

**Content Area**
- 16px horizontal padding
- Scrollable vertical content
- Each view fills remaining viewport height

---

### View 1: Action-Focused List (Default Tab)

This is the recommended default view as it surfaces actionable items immediately.

**Summary Bar**
- Horizontal card with three metric sections separated by vertical dividers
- Each section shows:
  - Large number (24px bold)
  - Label below (10px muted text)
- Metrics displayed:
  - "Action required" count
  - "In progress" count  
  - "Total" count
- Full width, 12px padding, rounded corners

**"Needs Your Attention" Section**
- Section header: "NEEDS YOUR ATTENTION" (10px uppercase, muted, tracking-wide)
- 12px margin below header

**Actionable Item Cards**
- Full-width cards with 16px internal padding
- Layout (top to bottom):
  - Title (14px medium, up to 2 lines, then truncate)
  - Row containing: Type badge + Status badge + timestamp (right-aligned)
  - Action button (right side of card, vertically centered with title)
- Critical priority indicator: 4px red left border stripe
- Action buttons: Primary style, compact (28px height), labels like "Approve", "Review Design", "Review PR"
- Card spacing: 8px between cards
- Tap anywhere on card (except button) opens detail sheet

**"In Progress" Section**
- Section header: "IN PROGRESS" (same styling as above)
- Appears below actionable items

**Regular Item Cards**
- Compact version of action cards
- Layout:
  - Title (14px medium, single line truncate)
  - Row containing: Type badge + Status badge
  - Timestamp (right-aligned)
- Card internal padding: 12px
- No action button (items don't need admin action)
- Tap opens detail sheet

**Empty State**
- Centered vertically in content area
- Checkmark icon in 64px muted circular background
- Heading: "All caught up!" (18px medium)
- Subtext: "No items need your attention right now. New feature requests and bug reports will appear here." (14px muted, max 280px width, centered)

---

### View 2: Kanban Board (Mobile-First Redesign)

The admin specifically requested a mobile-first approach instead of horizontal scrolling.

**Mobile Kanban Layout**

**Quick Stats Bar**
- Horizontal scrollable row of status pills
- Each pill shows: colored dot + count + abbreviated label
- Examples: "🟠 2 Pending", "🟣 1 Design", "🔵 1 PR Review"
- Pill styling: colored background (light), rounded-full, 12px horizontal padding
- Only shows statuses that have items (hide empty statuses from stats)

**Collapsible Status Sections**
- Each status displayed as a vertical accordion section (NOT horizontal columns)
- Section header:
  - Colored status dot (8px)
  - Status label (12px uppercase semibold)
  - Item count badge (muted background)
  - Expand/collapse chevron icon
- Default state: Sections with items expanded, empty sections collapsed
- Tap header to toggle expand/collapse

**Item Cards Within Sections**
- Compact card layout:
  - Priority dot (8px, left side)
  - Title (14px medium, 2-line clamp)
  - Row: Type badge + timestamp
- Card spacing: 8px between cards
- Background: Slightly muted container for each section
- Tap card opens detail sheet

**Status Order (top to bottom)**
1. Pending Approval (amber)
2. Product Design (purple)
3. Technical Design (blue)
4. Bug Investigation (pink)
5. Ready for Development (orange)
6. PR Review (cyan)

**Empty Section State**
- When expanded: "No items" text, centered, muted
- Collapsed by default when empty

**Kanban Empty State**
- Clipboard icon in 64px muted circular background
- Heading: "No workflow items" (18px medium)
- Subtext: "When users submit feature requests or bug reports, they will appear here for review and processing." (14px muted)

---

### View 3: Timeline/Activity Stream

**Filter Tabs**
- Segmented control with three options:
  - "All Activity" (default)
  - "Needs Action"
  - "Recent Changes"
- Full width, muted background container
- Active segment: White background, shadow, foreground text
- Inactive: Muted text
- Height: 40px

**Date Separator**
- Horizontal line with centered text
- Text: "Today", "Yesterday", or specific date
- Line: 1px muted border
- Text: 12px medium muted, 8px horizontal padding

**Activity Cards**
- Layout structure:
  - Left: Event icon in 40px colored circle (emoji)
  - Vertical connector line (2px, border color) extending below icon
  - Right: Event content

**Event Icons by Type**
- submitted: 📥 (amber background)
- design_ready: 🎨 (purple background)
- pr_created: 🔀 (cyan background)
- moved: ➡️ (blue background)
- investigating: 🔍 (pink background)
- approved: ✅ (green background)
- merged: 🎉 (green background)

**Activity Content**
- Event label + timestamp (12px muted, same row)
- Card containing:
  - Title (14px medium, 2-line clamp)
  - Type badge + Status badge
  - Actor avatar (24px, right side) with initials fallback
- 24px bottom padding per activity (space for connector line)

**Filter Behavior**
- "Needs Action": Shows only submitted, design_ready, and pr_created events
- "Recent Changes": Shows only activities from today
- "All Activity": Shows all activities chronologically

**Timeline Empty State**
- Mailbox icon (📭) in 64px muted circular background
- Heading: "No activity yet" (18px medium)
- Subtext: "Your workflow timeline will show feature requests, bug reports, and their progress through the pipeline." (14px muted)

**Filtered Empty State**
- When no activities match filter:
- Simple centered text: "No activities match this filter." (14px muted)

---

### Shared Components

**Item Detail Sheet**
- Opens from bottom, slides up
- Height: 70% of viewport
- Top corners: 16px radius
- Drag handle: 32px wide, 4px tall, centered, muted background

**Sheet Content**
- Badge row: Type badge + Status badge (8px gap)
- Title: 20px semibold, left-aligned, 8px below badges
- Metadata row:
  - Priority indicator + label (e.g., "High priority")
  - Creation date (e.g., "Created 2 days ago")
- Description area: 14px muted text, placeholder content
- Action buttons (bottom):
  - Primary action (e.g., "Approve") - full width or 50% if two buttons
  - "View Details" secondary button - navigates to full item page
- 16px top padding from drag handle
- 16px horizontal padding
- Safe area padding at bottom for iOS

**Type Badges**
- "Feature": Blue background (light), blue text
- "Bug": Red background (light), red text
- 10px font size, 6px horizontal padding, rounded

**Status Badges**
- Color-coded by status (matching Kanban column colors)
- 10px font size, 6px horizontal padding, rounded

**Priority Indicators**
- Critical: Red (displayed as left border stripe or dot)
- High: Orange
- Medium: Blue
- Low: Gray

---

### Loading States

**List View Loading**
- Skeleton for header (96px wide, 24px tall)
- Skeleton for summary bar (full width, 80px tall)
- 4 skeleton cards (full width, 80px tall each, 8px spacing)

**Kanban View Loading**
- Skeleton for stats bar
- 3 skeleton sections with 2 card skeletons each

**Timeline View Loading**
- Skeleton for filter tabs
- 4 activity skeletons:
  - 40px circle skeleton (left)
  - 32px wide label skeleton + 80px card skeleton (right)

---

### Interactions

**Tab Switching**
- Instant switch between views (no page reload)
- Selected tab state persists during session
- Content scrolls to top when switching tabs

**Card Tap**
- Anywhere on card (except action buttons) opens detail sheet
- Subtle background color change on press (accent/50)

**Action Button Tap**
- Executes primary action immediately
- Shows loading state on button during action
- Success: Item updates/moves, button reflects new state
- Error: Toast notification with error message

**Sheet Interactions**
- Swipe down to dismiss
- Tap outside sheet (on overlay) to dismiss
- Buttons remain accessible in thumb zone

**Pull-to-Refresh**
- Available on all views
- Standard pull-down gesture
- Loading indicator during refresh

---

### Tablet/Desktop Enhancements (768px+)

**Tab Navigation**
- Tabs remain at top but with more spacing
- Consider icon + label format for tabs

**List View**
- Cards can display in 2-column grid
- Action buttons always visible (no need to tap card first)

**Kanban View**
- Switches to traditional horizontal column layout
- 3-4 columns visible without scrolling
- Horizontal scroll for additional columns
- Drag-and-drop support for moving items between columns

**Timeline View**
- Wider cards with more horizontal content
- Actor information displayed inline with event details

**Detail Sheet**
- Opens as side panel (400px width) instead of bottom sheet
- Full-height, slides in from right

---

### Accessibility

**Touch Targets**
- All interactive elements minimum 44px tap target
- Adequate spacing between tappable elements (8px minimum)

**Color**
- Status colors have sufficient contrast
- Priority indicators don't rely solely on color (include text labels in detail view)

**Screen Readers**
- Cards announced with: Type, Title, Status, Priority
- Tab navigation properly labeled
- Sheet content structured with proper headings

**Reduced Motion**
- Tab switches instant (no animation)
- Sheet appears without slide animation
- Card interactions use opacity instead of transforms

---

## Edge Cases

**Many Items in Single Status**
- Kanban sections show all items (no pagination within section)
- Sections remain collapsible to manage visual complexity
- Stats bar scrolls horizontally if many statuses have items

**Rapid Actions**
- Action buttons disable during processing
- Optimistic UI updates where appropriate
- Queue concurrent actions to prevent race conditions

**Offline State**
- Show cached data with "Offline" indicator
- Disable action buttons when offline
- Retry actions when connection restored

**Deep Linking**
- URL reflects current tab (e.g., ?view=kanban)
- Direct links to specific items open detail sheet automatically