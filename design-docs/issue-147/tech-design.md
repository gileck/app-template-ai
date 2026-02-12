# Technical Design: Redesign the Todo List Page - Progress-Focused Dashboard

**Size: M** | **Complexity: Medium**

## Overview

Redesign the existing Todo list page to implement a Progress-Focused Dashboard layout with prominent progress visualization, percentage tracking, category filtering (Work/Personal/Health), and encouraging messages. This requires adding a `category` field to the schema and updating all layers (database, API, UI) to support it.

## Data Model Changes

**Add `category` field to TodoItem:**

```typescript
// src/server/database/collections/project/todos/types.ts
export type TodoCategory = 'work' | 'personal' | 'health';

export interface TodoItem {
    _id: ObjectId;
    userId: ObjectId;
    title: string;
    completed: boolean;
    category?: TodoCategory;  // NEW: Optional category
    dueDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface TodoItemClient {
    _id: string;
    userId: string;
    title: string;
    completed: boolean;
    category?: TodoCategory;  // NEW
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
}
```

## API Changes

**Update request/response types:**

- `CreateTodoRequest`: Add optional `category?: TodoCategory`
- `UpdateTodoRequest`: Add optional `category?: TodoCategory`

**Handlers to modify:**
- `createTodo.ts`: Accept and store category field
- `updateTodo.ts`: Accept and update category field

## Files to Modify

**Database Types:**
- `src/server/database/collections/project/todos/types.ts`
  - Add `TodoCategory` type
  - Add `category` field to `TodoItem` and `TodoItemClient`

**API Layer:**
- `src/apis/project/todos/types.ts`
  - Add `category` to `CreateTodoRequest` and `UpdateTodoRequest`
- `src/apis/project/todos/handlers/createTodo.ts`
  - Handle category field in creation
- `src/apis/project/todos/handlers/updateTodo.ts`
  - Handle category field in updates

**Store:**
- `src/client/routes/project/Todos/store.ts`
  - Add `categoryFilter: TodoCategory | 'all'` preference
  - Add `setCategoryFilter` action

**Utils:**
- `src/client/routes/project/Todos/utils.ts`
  - Add `filterTodosByCategory()` function

**Main Page:**
- `src/client/routes/project/Todos/Todos.tsx`
  - Replace current layout with dashboard-style layout
  - Add category filter application to display logic
  - Add encouraging messages based on progress

**Components to Modify:**
- `src/client/routes/project/Todos/components/TodoStats.tsx`
  - Transform into ProgressDashboard component
  - Add prominent circular/radial progress visualization
  - Add per-category progress breakdown
  - Add motivational messages based on completion %
- `src/client/routes/project/Todos/components/TodoControls.tsx`
  - Add category filter chips/pills (All/Work/Personal/Health)
- `src/client/routes/project/Todos/components/CreateTodoForm.tsx`
  - Add category selector dropdown
- `src/client/routes/project/Todos/components/TodoItem.tsx`
  - Add category badge display
  - Add category quick-change option in edit mode

**Hooks:**
- `src/client/routes/project/Todos/hooks.ts`
  - Update `useCreateTodo` optimistic update to include category
  - Update `useUpdateTodo` optimistic update to include category

**Styles:**
- `src/client/styles/todos.css`
  - Add dashboard layout styles
  - Add circular progress styles
  - Add category badge color styles
  - Add motivational message animations

## State Management

**Store additions (useTodoPreferencesStore):**
```typescript
categoryFilter: TodoCategory | 'all';
setCategoryFilter: (filter: TodoCategory | 'all') => void;
```

**Persist `categoryFilter` in localStorage with existing preferences.**

## Component Structure

```
Todos.tsx (dashboard layout)
├── ProgressDashboard (formerly TodoStats, redesigned)
│   ├── CircularProgress (large, prominent)
│   ├── CategoryBreakdown (Work/Personal/Health bars)
│   └── MotivationalMessage
├── CategoryFilterPills (quick category filter)
├── CreateTodoForm (with category selector)
├── TodoControls (existing sort/filter + category)
└── TodoList
    └── TodoItem (with category badge) × N
```

## Implementation Notes

**Progress Visualization:**
- Use a prominent circular progress indicator (similar to fitness apps)
- Show percentage in large text in the center
- Color gradient based on completion (red → yellow → green)

**Category Badges:**
- Work: Blue (`bg-primary`)
- Personal: Purple (`bg-secondary`)  
- Health: Green (`bg-success`)

**Motivational Messages:**
- 0-25%: "You've got this! Every task counts. 💪"
- 26-50%: "Making progress! Keep the momentum going! 🚀"
- 51-75%: "Over halfway there! You're crushing it! 🎯"
- 76-99%: "Almost done! The finish line is in sight! 🏁"
- 100%: "Amazing! All tasks complete! 🎉"

**Filtering Logic:**
Apply filters in order:
1. Category filter (Work/Personal/Health/All)
2. Existing hideCompleted filter
3. Existing dueDateFilter
4. Sort
5. UncompletedFirst grouping

## Implementation Plan

1. Add `TodoCategory` type and `category` field to `src/server/database/collections/project/todos/types.ts`
2. Update API types in `src/apis/project/todos/types.ts` to include category in request types
3. Update `src/apis/project/todos/handlers/createTodo.ts` to handle category field
4. Update `src/apis/project/todos/handlers/updateTodo.ts` to handle category field
5. Add `categoryFilter` state and `setCategoryFilter` action to `src/client/routes/project/Todos/store.ts`
6. Add `filterTodosByCategory()` function to `src/client/routes/project/Todos/utils.ts`
7. Update optimistic updates in `src/client/routes/project/Todos/hooks.ts` for category support
8. Redesign `TodoStats.tsx` into ProgressDashboard with circular progress and category breakdown
9. Add category filter pills to `TodoControls.tsx`
10. Add category selector dropdown to `CreateTodoForm.tsx`
11. Add category badge and edit support to `TodoItem.tsx`
12. Update main `Todos.tsx` to apply category filter and add dashboard layout
13. Add new CSS styles for dashboard layout, circular progress, and category badges to `src/client/styles/todos.css`
14. Run `yarn checks` to verify all changes