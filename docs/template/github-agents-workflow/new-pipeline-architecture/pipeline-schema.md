---
title: Pipeline Definition Schema
summary: TypeScript interfaces and design decisions for declaring pipeline statuses, transitions, guards, hooks, and review flows as typed const objects.
---

# Pipeline Definition Schema

## Storage Decision: Code, Not Database

Pipeline definitions are stored as **const objects in TypeScript**, not in MongoDB. Rationale:

- Definitions change with code releases, not at runtime
- TypeScript provides compile-time validation that transition `from`/`to` reference valid status IDs
- Guard and hook IDs are validated against the registry at startup
- No migration needed — just update the const and deploy
- Pipeline definitions are read-only at runtime — no concurrency concerns

## Core Types

### PipelineDefinition

The top-level type representing a complete pipeline:

```typescript
interface PipelineDefinition {
  id: string;                          // 'feature' | 'bug' | 'task'
  label: string;                       // 'Feature Pipeline'
  entryStatus: string;                 // Status ID for newly approved items
  terminalStatuses: string[];          // Status IDs where the pipeline is complete
  statuses: PipelineStatus[];
  transitions: PipelineTransition[];
  reviewFlows: ReviewFlowDefinition[];
}
```

### PipelineStatus

Each status in the pipeline:

```typescript
interface PipelineStatus {
  id: string;                          // Maps to STATUSES values: 'Backlog', 'Product Design', etc.
  label: string;                       // Human-readable label
  agentPhase?: string;                 // Agent type that runs in this status (e.g., 'product-design', 'implementation')
  isDesignPhase?: boolean;             // True for Product Dev, Product Design, Bug Investigation, Tech Design
  requiresDecision?: boolean;          // True for Bug Investigation (admin selects fix approach)
}
```

### PipelineTransition

A single valid transition between statuses:

```typescript
interface PipelineTransition {
  id: string;                          // Unique transition ID: 'route-to-product-design', 'merge-impl-pr', etc.
  from: string | '*';                  // Source status ID, or '*' for any-status transitions
  to: string | '*';                    // Target status ID, or '*' for dynamic target (undo)
  trigger: TransitionTrigger;          // What causes this transition
  guards?: TransitionGuardRef[];       // Preconditions that must pass
  hooks?: TransitionHookRef[];         // Side effects to execute
  description?: string;               // Human-readable explanation
}
```

### TransitionTrigger

Replaces implicit "who calls what" with explicit trigger types:

```typescript
type TransitionTrigger =
  | 'admin_route'                      // Admin routes item to a destination
  | 'admin_review_approve'             // Admin approves a design review
  | 'admin_review_changes'             // Admin requests changes on design
  | 'admin_review_reject'              // Admin rejects a design
  | 'admin_merge_pr'                   // Admin merges implementation PR
  | 'admin_merge_final_pr'             // Admin merges final PR
  | 'admin_merge_revert_pr'            // Admin merges revert PR
  | 'admin_revert'                     // Admin reverts a merge
  | 'admin_request_changes_pr'         // Admin requests changes on impl PR
  | 'admin_request_changes_design_pr'  // Admin requests changes on design PR
  | 'admin_mark_done'                  // Admin manually marks Done
  | 'admin_delete'                     // Admin deletes item
  | 'admin_undo'                       // Admin undoes within time window
  | 'admin_decision'                   // Admin submits decision (bug fix selection)
  | 'admin_choose_recommended'         // Admin selects recommended option
  | 'admin_clarification_received'     // Admin marks clarification received
  | 'agent_complete'                   // Agent finishes work
  | 'auto_advance'                     // System auto-advances approved items
  | 'system_approve'                   // System processes item approval
  | 'system_phase_advance';            // System advances to next implementation phase
```

### TransitionGuardRef and TransitionHookRef

References to registered guards and hooks:

```typescript
interface TransitionGuardRef {
  id: string;                          // Guard ID in the registry: 'guard:item-exists'
  params?: Record<string, unknown>;    // Optional parameters passed to guard function
}

interface TransitionHookRef {
  id: string;                          // Hook ID in the registry: 'hook:create-github-issue'
  phase: 'before' | 'after';          // Execute before or after status change
  optional?: boolean;                  // If true, hook failure doesn't block transition
  params?: Record<string, unknown>;    // Optional parameters passed to hook function
}
```

### ReviewFlowDefinition

Governs sub-state (review status) within a pipeline status:

```typescript
interface ReviewFlowDefinition {
  statusId: string;                    // Pipeline status this applies to
  onAgentComplete: {
    reviewStatus: string;              // Review status set when agent finishes
  };
  reviewActions: ReviewAction[];       // Available admin actions
}

interface ReviewAction {
  action: string;                      // 'approve' | 'changes' | 'reject' | 'choose_recommended'
  reviewStatus?: string;               // Review status to set
  triggersTransition?: string;         // Transition ID to fire after setting review status
}
```

### TransitionContext

Runtime data passed through a transition:

```typescript
interface TransitionContext {
  actor?: string;                      // 'admin' | 'agent' | 'system'
  agentType?: string;                  // For agent_complete: 'implementation', 'bug-investigation', etc.
  agentResult?: Record<string, unknown>; // Agent completion data
  destination?: string;                // For routing: 'product-design', 'tech-design', etc.
  designType?: string;                 // For design operations: 'product', 'product-dev', 'tech'
  prNumber?: number;                   // PR number for merge/revert operations
  shortSha?: string;                   // For revert validation
  commitMessage?: string;              // For merge operations
  restoreStatus?: string;              // For undo: status to restore
  restoreReviewStatus?: string;        // For undo: review status to restore
  phase?: string;                      // For multi-phase: '1/3', '2/3', etc.
  decisionSelection?: {               // For decision routing
    optionIndex: number;
    routing?: { destination: string; targetStatus: string };
  };
  sourceRef?: {                        // For approve: source document reference
    collection: string;
    id: string;
  };
  itemType?: string;                   // 'feature' | 'bug' | 'task'
  logAction?: string;                  // Logging action label
  logDescription?: string;             // Logging description
  statusVersion?: number;              // For optimistic concurrency
  metadata?: Record<string, unknown>;  // Additional context for hooks
}
```

### TransitionResult

Returned after a successful transition:

```typescript
interface TransitionResult {
  success: boolean;
  error?: string;
  previousStatus?: string;
  newStatus?: string;
  previousReviewStatus?: string;
  newReviewStatus?: string;
  transitionId: string;
  hookResults?: Array<{
    hookId: string;
    success: boolean;
    error?: string;
    data?: unknown;
  }>;
  // Operation-specific results (passed through from hooks)
  mergeCommitSha?: string;
  advancedTo?: string;
  phaseInfo?: { current: number; total: number; next?: number };
  finalPrCreated?: { prNumber: number; prUrl: string };
  revertPrCreated?: { prNumber: number; prUrl: string };
  expired?: boolean;                   // For undo: time window expired
}
```

## Key Design Decisions

### Review Status Is a Separate Dimension

Review status (`Waiting for Review`, `Approved`, `Request Changes`, etc.) is **not** a pipeline status. It's a sub-state within a status. This avoids state explosion — instead of needing separate statuses for "Product Design / Waiting for Review" and "Product Design / Approved", the pipeline status remains `Product Design` while the review status tracks the sub-state.

The pipeline engine manages `status`; review status is governed by `ReviewFlowDefinition` within each status. The `engine.updateReviewStatus()` method handles review status changes with validation against the current status's review flow.

### Trigger Types Replace Implicit Caller Identity

The current code has no way to distinguish *who* initiated a status change. The same `advanceStatus()` function is called by admin actions, agent completions, and system auto-advance. Trigger types make this explicit:

- `admin_route` — admin chose a routing destination
- `agent_complete` — an agent finished its phase
- `auto_advance` — the system auto-advanced an approved item

This allows pipeline definitions to restrict certain transitions to certain triggers. For example, `auto_advance` transitions can only fire for statuses that have a defined next-status in `STATUS_TRANSITIONS`.

### Wildcard Transitions for Global Operations

Some operations apply regardless of current status:

- **`from: '*'`** transitions: cancel/delete (any status → removed), manual-mark-done (any status → Done)
- **`from: '*', to: '*'`** transitions: undo (target is dynamic from `context.restoreStatus`)

The engine resolves wildcard targets at runtime using `TransitionContext` data. Guards on wildcard transitions are especially important since they're the only thing preventing invalid state changes.

### Hook Ordering and Failure Tolerance

Hooks have two execution phases:
- **`before`** hooks run before the status change is written. Use these for operations that must succeed for the transition to proceed (e.g., creating a GitHub issue during approval).
- **`after`** hooks run after the status change is written. Use these for side effects that shouldn't block the transition (e.g., sending notifications).

The `optional: boolean` flag controls failure tolerance:
- `optional: false` (default) — hook failure aborts the transition (before hooks) or logs an error (after hooks)
- `optional: true` — hook failure is logged but doesn't affect the transition

This matches the current pattern where operations like Telegram notifications are fire-and-forget while GitHub issue creation is a hard requirement.

### Const Objects with Type Safety

Pipeline definitions are TypeScript const objects, not JSON files. This enables:

```typescript
const FEATURE_PIPELINE = {
  id: 'feature',
  statuses: [
    { id: STATUSES.backlog, label: 'Backlog' },
    { id: STATUSES.productDevelopment, label: 'Product Development', isDesignPhase: true, agentPhase: 'product-dev' },
    // ...
  ],
  transitions: [
    {
      id: 'route-to-product-design',
      from: STATUSES.backlog,
      to: STATUSES.productDesign,
      trigger: 'admin_route' as const,
      guards: [{ id: 'guard:item-exists' }, { id: 'guard:github-synced' }],
      hooks: [
        { id: 'hook:sync-workflow-status', phase: 'after' as const },
        { id: 'hook:notify-routed', phase: 'after' as const, optional: true },
      ],
    },
    // ...
  ],
} as const satisfies PipelineDefinition;
```

Using `STATUSES` constants for status IDs ensures pipeline definitions stay in sync with the project management configuration. The `satisfies` keyword provides type checking without losing const narrowing.
