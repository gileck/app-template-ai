# Technical Design: Weekly Progress Dashboard

**Size: S** | **Complexity: Low**

## Overview

Create a new route `/weekly-progress` that displays a minimalist view of weekly todo completion. The feature uses existing todo data from the `useTodos` hook with client-side filtering by week - no new API endpoint or database changes required. The UI features a circular progress indicator as the centerpiece, week navigation buttons, and a simple highlights list.

## Files to Create

- `src/client/routes/project/WeeklyProgress/WeeklyProgress.tsx`
  - Main page component with circular progress indicator, week navigation, and highlights list
  - Uses `useTodos` hook to fetch all todos, then filters by selected week
  - Calculates completion stats: total, completed, percentage for the week

- `src/client/routes/project/WeeklyProgress/index.ts`
  - Exports the WeeklyProgress component

- `src/client/routes/project/WeeklyProgress/components/CircularProgress.tsx`
  - SVG-based circular progress indicator component
  - Props: `percentage`, `size`, `strokeWidth`
  - Shows percentage in center with animated fill

- `src/client/routes/project/WeeklyProgress/components/WeekNavigator.tsx`
  - Week toggle buttons (previous/next) with current week label
  - Shows week date range (e.g., "Feb 10 - Feb 16")

- `src/client/routes/project/WeeklyProgress/components/HighlightsList.tsx`
  - Simple list showing weekly highlights
  - Items: completed count, remaining count, completion rate

- `src/client/routes/project/WeeklyProgress/utils.ts`
  - Week calculation utilities: `getWeekBounds(date)`, `isWithinWeek(todoDate, weekStart, weekEnd)`
  - Filter todos by week: `filterTodosByWeek(todos, weekStart)`

## Files to Modify

- `src/client/routes/index.project.ts`
  - Add route: `'/weekly-progress': WeeklyProgress`

- `src/client/components/NavLinks.tsx`
  - Add navigation item for Weekly Progress page (optional, based on nav design)

## Implementation Notes

**Data Flow:**
1. `WeeklyProgress` component uses existing `useTodos()` hook to get all user todos
2. Local state tracks selected week (defaults to current week)
3. `filterTodosByWeek()` utility filters todos where `createdAt` falls within the week bounds
4. Stats calculated client-side: `completed = todos.filter(t => t.completed).length`

**Week Calculation:**
- Week starts on Monday, ends on Sunday (ISO standard)
- `getWeekBounds(date)` returns `{ start: Date, end: Date }` for the week containing `date`
- Navigation buttons shift the week by ±7 days

**Circular Progress:**
- Pure SVG implementation using `stroke-dasharray` and `stroke-dashoffset`
- Animated transition when percentage changes
- Uses semantic colors: `stroke="hsl(var(--primary))"` for fill, `stroke="hsl(var(--muted))"` for track

## Implementation Plan

1. Create week utility functions in `src/client/routes/project/WeeklyProgress/utils.ts`
2. Create CircularProgress component in `src/client/routes/project/WeeklyProgress/components/CircularProgress.tsx`
3. Create WeekNavigator component in `src/client/routes/project/WeeklyProgress/components/WeekNavigator.tsx`
4. Create HighlightsList component in `src/client/routes/project/WeeklyProgress/components/HighlightsList.tsx`
5. Create main WeeklyProgress page in `src/client/routes/project/WeeklyProgress/WeeklyProgress.tsx`
6. Create index export in `src/client/routes/project/WeeklyProgress/index.ts`
7. Add route to `src/client/routes/index.project.ts`
8. Run yarn checks to verify