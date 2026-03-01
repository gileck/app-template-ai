# Technical Design: Workflow Main UI Page Redesign

**Size: L** | **Complexity: High**

## Overview

Redesign the workflow main UI page (`/admin/workflow`) to provide three complementary views (Action-Focused List, Kanban Board, Timeline) in a tabbed interface. The implementation will refactor the existing monolithic 1150+ line `WorkflowItems.tsx` into smaller focused components, add a view switcher with persisted state, and create mobile-first layouts for all three views.

## Implementation Phases

This feature will be split into 3 PRs:

### Phase 1: Foundation - Refactor & List View (M)
- Extract shared components from existing WorkflowItems.tsx
- Create new component structure with proper separation of concerns
- Implement the main view tab navigation
- Implement the Action-Focused List View (default tab)
- Refactor store to support new view structure

### Phase 2: Kanban Board View (M)
- Implement mobile-first Kanban with collapsible status sections
- Add quick stats bar with status counts
- Create compact item cards for Kanban display
- Implement expand/collapse persistence

### Phase 3: Timeline/Activity Stream View (M)
- Implement Timeline view with activity stream
- Add filter tabs (All Activity, Needs Action, Recent Changes)
- Create activity cards with event icons and timestamps
- Add date separators and timeline visual elements

## Files to Create

**Phase 1 - New Components:**
- `src/client/routes/template/Workflow/components/ViewSwitcher.tsx`
  - Tab navigation for switching between List, Kanban, Timeline views
  - Three equal-width tabs with primary label and secondary description
  - Sticky positioned below header during scroll

- `src/client/routes/template/Workflow/components/ListView.tsx`
  - Action-Focused List view implementation
  - Summary bar with action/in-progress/total counts
  - "Needs Your Attention" and "In Progress" sections

- `src/client/routes/template/Workflow/components/ActionableItemCard.tsx`
  - Full-width card for items needing action
  - Title, badges, timestamp, and action button layout
  - Critical priority indicator (4px red left border)

- `src/client/routes/template/Workflow/components/RegularItemCard.tsx`
  - Compact card for in-progress items without action buttons

- `src/client/routes/template/Workflow/components/SummaryBar.tsx`
  - Horizontal card with three metric sections
  - Action required, In progress, Total counts

- `src/client/routes/template/Workflow/components/EmptyState.tsx`
  - Shared empty state component for all views
  - Configurable icon, heading, and subtext

**Phase 2 - Kanban Components:**
- `src/client/routes/template/Workflow/components/KanbanView.tsx`
  - Mobile-first Kanban layout with collapsible sections
  - Quick stats bar at top

- `src/client/routes/template/Workflow/components/KanbanQuickStats.tsx`
  - Horizontal scrollable row of status pills
  - Colored dot + count + abbreviated label

- `src/client/routes/template/Workflow/components/KanbanSection.tsx`
  - Collapsible status section (accordion-style)
  - Section header with status dot, label, count, chevron

- `src/client/routes/template/Workflow/components/KanbanItemCard.tsx`
  - Compact card for Kanban sections
  - Priority dot, title (2-line clamp), type badge, timestamp

**Phase 3 - Timeline Components:**
- `src/client/routes/template/Workflow/components/TimelineView.tsx`
  - Timeline layout with filter tabs
  - Date separators and activity list

- `src/client/routes/template/Workflow/components/TimelineFilterTabs.tsx`
  - Segmented control: All Activity, Needs Action, Recent Changes

- `src/client/routes/template/Workflow/components/ActivityCard.tsx`
  - Activity card with event icon, connector line
  - Event label, timestamp, item details, actor avatar

- `src/client/routes/template/Workflow/components/DateSeparator.tsx`
  - Horizontal line with centered date text
  - Shows "Today", "Yesterday", or specific date

## Files to Modify

**Phase 1:**
- `src/client/routes/template/Workflow/WorkflowItems.tsx`
  - Refactor to become orchestrator component
  - Remove inline component definitions (extract to separate files)
  - Import and render ViewSwitcher and current view component
  - Reduce from ~1150 lines to ~200 lines

- `src/client/routes/template/Workflow/store.ts`
  - Add `currentView` state: `'list' | 'kanban' | 'timeline'` (default: 'list')
  - Add `setCurrentView` action
  - Persist `currentView` in partialize

- `src/client/routes/template/Workflow/index.ts`
  - Update exports if needed

**Phase 2:**
- `src/client/routes/template/Workflow/store.ts`
  - Add `kanbanExpandedSections` state (array of expanded status keys)
  - Add `toggleKanbanSection` action
  - Persist expanded sections

**Phase 3:**
- `src/client/routes/template/Workflow/store.ts`
  - Add `timelineFilter` state: `'all' | 'needs-action' | 'recent'`
  - Add `setTimelineFilter` action
  - Persist timeline filter

- `src/client/routes/template/Workflow/hooks.ts`
  - Add `useWorkflowActivities` hook or derive activities from existing data
  - Transform workflow items into activity feed format

## Data Model

No new database collections needed. The existing `ListWorkflowItemsResponse` provides all necessary data:

**Existing Types (no changes needed):**
```typescript
interface PendingItem {
    id: string;
    type: 'feature' | 'bug';
    title: string;
    source?: string;
    priority?: string;
    createdAt: string;
}

interface WorkflowItem {
    id: string;
    sourceId: string | null;
    type: 'feature' | 'bug' | 'task';
    status: string | null;
    reviewStatus: string | null;
    content: WorkflowItemContent | null;
    implementationPhase?: string | null;
    prData?: WorkflowItemPRData;
    history?: WorkflowHistoryEntry[];
    createdAt: string | null;
}

interface WorkflowHistoryEntry {
    action: string;
    description: string;
    timestamp: string;
    actor?: string;
    metadata?: Record<string, unknown>;
}
```

**New Client-Side Types:**
```typescript
// View type for tab navigation
type WorkflowViewType = 'list' | 'kanban' | 'timeline';

// Timeline filter type
type TimelineFilterType = 'all' | 'needs-action' | 'recent';

// Derived activity type for timeline view
interface WorkflowActivity {
    id: string;
    itemId: string;
    itemTitle: string;
    itemType: 'feature' | 'bug' | 'task';
    eventType: 'submitted' | 'design_ready' | 'pr_created' | 'moved' | 'investigating' | 'approved' | 'merged';
    timestamp: string;
    actor?: string;
    status?: string;
}
```

## State Management

**Store Updates (Zustand):**
```typescript
// Add to existing WorkflowPageState in store.ts
interface WorkflowPageState {
    // Existing fields...
    
    // New Phase 1 fields
    currentView: WorkflowViewType;
    setCurrentView: (view: WorkflowViewType) => void;
    
    // New Phase 2 fields
    kanbanExpandedSections: string[];
    toggleKanbanSection: (status: string) => void;
    setAllKanbanExpanded: (expanded: boolean) => void;
    
    // New Phase 3 fields
    timelineFilter: TimelineFilterType;
    setTimelineFilter: (filter: TimelineFilterType) => void;
}
```

**Persistence:**
- `currentView` - Persisted (user's preferred view)
- `kanbanExpandedSections` - Persisted (user's section preferences)
- `timelineFilter` - Persisted (user's filter preference)

## Implementation Notes

### View Switcher Component

The view switcher uses a custom tab implementation (similar to existing ViewTabs):

```tsx
const VIEWS = [
    { id: 'list', label: 'List', description: 'Action-Focused' },
    { id: 'kanban', label: 'Kanban', description: 'Status Board' },
    { id: 'timeline', label: 'Timeline', description: 'Activity Stream' },
];

// Full-width tabs, sticky positioned
<div className="sticky top-12 z-10 bg-background border-b">
    <div className="flex">
        {VIEWS.map(view => (
            <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={cn(
                    'flex-1 py-3 text-center border-b-2',
                    currentView === view.id
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground'
                )}
            >
                <span className="text-sm font-medium">{view.label}</span>
                <span className="text-xs text-muted-foreground block">
                    {view.description}
                </span>
            </button>
        ))}
    </div>
</div>
```

### Mobile-First Kanban Implementation

Instead of horizontal columns (poor mobile UX), use vertical accordion sections:

```tsx
// Each status becomes a collapsible section
<div className="space-y-2">
    {statusGroups.map(({ status, items }) => (
        <KanbanSection
            key={status}
            status={status}
            items={items}
            expanded={kanbanExpandedSections.includes(status)}
            onToggle={() => toggleKanbanSection(status)}
        />
    ))}
</div>

// Default: sections with items expanded, empty sections collapsed
```

### Timeline Activity Derivation

Activities are derived from workflow items and their history:

```typescript
function deriveActivities(items: WorkflowItem[]): WorkflowActivity[] {
    const activities: WorkflowActivity[] = [];
    
    for (const item of items) {
        // Add history entries as activities
        for (const entry of item.history || []) {
            activities.push({
                id: `${item.id}-${entry.timestamp}`,
                itemId: item.id,
                itemTitle: item.content?.title || 'Untitled',
                itemType: item.type,
                eventType: mapActionToEventType(entry.action),
                timestamp: entry.timestamp,
                actor: entry.actor,
                status: item.status || undefined,
            });
        }
    }
    
    // Sort by timestamp descending
    return activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}
```

### Item Detail Sheet Enhancement

The existing `ItemPreviewDialog` will be enhanced to work as a bottom sheet for mobile:

- Height: 70% of viewport
- Top corners: 16px radius
- Drag handle: 32px wide, 4px tall, centered
- Slides up from bottom on mobile
- Can use existing `Sheet` component from UI library

### Action Buttons by Status

Different statuses show different primary actions:

- **Pending Approval**: "Approve" or "Backlog"
- **Product Design / Technical Design**: "Review Design"
- **PR Review**: "Review PR"
- **Final Review**: "Approve & Merge"
- **Done**: No action button

### Loading States

Each view has its own skeleton loading pattern:

```tsx
// List View Loading
<div className="space-y-3">
    <Skeleton className="h-20 w-full" /> {/* Summary bar */}
    <Skeleton className="h-6 w-48" /> {/* Section header */}
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-20 w-full" />
</div>

// Kanban View Loading
<div className="space-y-2">
    <Skeleton className="h-10 w-full" /> {/* Stats bar */}
    <Skeleton className="h-12 w-full" /> {/* Section header */}
    <Skeleton className="h-16 w-full" />
    <Skeleton className="h-16 w-full" />
</div>
```

### Touch Targets

All interactive elements follow 48px minimum touch target guidelines:

- Tab buttons: Full-width, 56px height
- Card tap areas: Full card clickable
- Action buttons: 48px minimum height
- Collapse toggles: 48px tap target

## Implementation Plan

### Phase 1: Foundation - Refactor & List View

1. **Update store** (`src/client/routes/template/Workflow/store.ts`)
   - Add `currentView: WorkflowViewType` field (default 'list')
   - Add `setCurrentView` action
   - Add to `partialize` for persistence

2. **Create EmptyState component** (`src/client/routes/template/Workflow/components/EmptyState.tsx`)
   - Accept icon, heading, subtext props
   - Center vertically with icon in circular background

3. **Create SummaryBar component** (`src/client/routes/template/Workflow/components/SummaryBar.tsx`)
   - Three metric sections with dividers
   - Accept actionCount, inProgressCount, totalCount props

4. **Create ActionableItemCard component** (`src/client/routes/template/Workflow/components/ActionableItemCard.tsx`)
   - Extract from existing PendingCard/WorkflowCard logic
   - Add action button and critical priority stripe

5. **Create RegularItemCard component** (`src/client/routes/template/Workflow/components/RegularItemCard.tsx`)
   - Compact version without action buttons

6. **Create ListView component** (`src/client/routes/template/Workflow/components/ListView.tsx`)
   - Summary bar at top
   - "Needs Your Attention" section with actionable cards
   - "In Progress" section with regular cards
   - Use existing useWorkflowItems hook

7. **Create ViewSwitcher component** (`src/client/routes/template/Workflow/components/ViewSwitcher.tsx`)
   - Three tabs: List, Kanban, Timeline
   - Sticky positioning below header
   - Connect to store for currentView state

8. **Refactor WorkflowItems.tsx** (`src/client/routes/template/Workflow/WorkflowItems.tsx`)
   - Import new components
   - Remove extracted code
   - Add view switcher and conditional view rendering
   - Keep ItemPreviewDialog and bulk action bar

9. **Test List View**
   - Verify all existing functionality works
   - Test responsive layout at 400px viewport
   - Verify tab switching and persistence

### Phase 2: Kanban Board View

1. **Update store** (`src/client/routes/template/Workflow/store.ts`)
   - Add `kanbanExpandedSections: string[]` field
   - Add `toggleKanbanSection` and `setAllKanbanExpanded` actions
   - Add to `partialize` for persistence

2. **Create KanbanQuickStats component** (`src/client/routes/template/Workflow/components/KanbanQuickStats.tsx`)
   - Horizontal scrollable row of status pills
   - Status color dot, count, and label

3. **Create KanbanItemCard component** (`src/client/routes/template/Workflow/components/KanbanItemCard.tsx`)
   - Compact card layout with priority dot
   - Title (2-line clamp), type badge, timestamp

4. **Create KanbanSection component** (`src/client/routes/template/Workflow/components/KanbanSection.tsx`)
   - Collapsible accordion-style section
   - Header with status dot, label, count, chevron
   - Muted background container for items

5. **Create KanbanView component** (`src/client/routes/template/Workflow/components/KanbanView.tsx`)
   - Quick stats bar at top
   - Collapsible sections for each status
   - Group items by status in PIPELINE_STATUSES order

6. **Update WorkflowItems.tsx**
   - Import and render KanbanView when currentView is 'kanban'

7. **Test Kanban View**
   - Verify section expand/collapse
   - Test empty sections behavior
   - Verify persistence of expanded states

### Phase 3: Timeline/Activity Stream View

1. **Update store** (`src/client/routes/template/Workflow/store.ts`)
   - Add `timelineFilter: TimelineFilterType` field (default 'all')
   - Add `setTimelineFilter` action
   - Add to `partialize` for persistence

2. **Add activity derivation utility** (`src/client/routes/template/Workflow/utils.ts`)
   - Create `deriveActivities` function
   - Map workflow history entries to activity items
   - Sort by timestamp descending

3. **Create TimelineFilterTabs component** (`src/client/routes/template/Workflow/components/TimelineFilterTabs.tsx`)
   - Segmented control with three options
   - Full width, muted background container

4. **Create DateSeparator component** (`src/client/routes/template/Workflow/components/DateSeparator.tsx`)
   - Horizontal line with centered date text
   - Format: "Today", "Yesterday", or date string

5. **Create ActivityCard component** (`src/client/routes/template/Workflow/components/ActivityCard.tsx`)
   - Event icon in colored circle (left)
   - Connector line extending below
   - Event content with timestamp and item details

6. **Create TimelineView component** (`src/client/routes/template/Workflow/components/TimelineView.tsx`)
   - Filter tabs at top
   - Activities grouped by date with separators
   - Apply filter logic based on timelineFilter

7. **Update WorkflowItems.tsx**
   - Import and render TimelineView when currentView is 'timeline'

8. **Test Timeline View**
   - Verify filter tabs work correctly
   - Test date separators
   - Verify activity ordering
   - Test empty filter states

9. **Final testing and polish**
   - Cross-view navigation
   - Verify all views work at 400px viewport
   - Test pull-to-refresh
   - Verify item detail sheet works from all views
