---
title: Unified Workflow Service Layer
summary: "Architecture of the unified workflow service that centralizes all business logic for approve, route, and delete operations across transports."
---

# Unified Workflow Service Layer

The workflow service (`src/server/workflow-service/`) centralizes all business logic for workflow item lifecycle operations. All transports -- Telegram, UI, and CLI -- call into this single service layer instead of implementing their own logic.

## Architecture Overview

The system follows a 3-layer architecture:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Transports (thin wrappers)                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │ Telegram       │  │ UI (APIs)     │  │ CLI           │           │
│  │ Webhook        │  │               │  │ agent-workflow│           │
│  │ Handlers       │  │ approve/route │  │ commands      │           │
│  │                │  │ /delete APIs  │  │               │           │
│  └───────┬────────┘  └───────┬───────┘  └───────┬───────┘           │
│          │                   │                   │                   │
└──────────┼───────────────────┼───────────────────┼───────────────────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Workflow Service (src/server/workflow-service/)                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ approveWorkflow  │  │ routeWorkflow    │  │ deleteWorkflow   │  │
│  │ Item()           │  │ Item()           │  │ Item()           │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  Handles: state validation, GitHub sync, adapter status updates,   │
│  review status clearing, agent logging, Telegram notifications      │
└──────────┬───────────────────┬───────────────────┬───────────────────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Infrastructure                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ MongoDB           │  │ GitHub Sync      │  │ Telegram         │  │
│  │ (source cols +    │  │ (issues, labels) │  │ (notifications)  │  │
│  │  workflow-items)  │  │                  │  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐                        │
│  │ Project Mgmt     │  │ Agent Logging    │                        │
│  │ Adapter          │  │                  │                        │
│  └──────────────────┘  └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Transport responsibilities (thin wrappers):**
- Parse input (callback data, request body, CLI args)
- Call the appropriate service function
- Format output for the transport (Telegram message edit, HTTP response, CLI stdout)

**Service responsibilities (all business logic):**
- State validation (prevent double-approval, check GitHub sync status)
- GitHub issue creation via github-sync
- Adapter status updates (move items between columns)
- Review status clearing
- Agent logging to `agent-logs/issue-{N}.md`
- Telegram notifications (universal notification center)

## Service Functions

### `approveWorkflowItem(ref, options?)`

Approves a workflow item -- creates a GitHub issue, logs the action, and optionally routes.

**Steps performed:**
1. Validates state (prevents double-approval by checking `githubIssueUrl`)
2. Calls github-sync to create issue and sync to GitHub
3. Agent logging (`[LOG:TELEGRAM]` markers)
4. Routes if `initialRoute` provided (delegates to `routeWorkflowItem`)
5. Sends Telegram notification (routing buttons for features, info message for bugs)
6. Returns `needsRouting` flag (true for features without explicit route)

```typescript
import { approveWorkflowItem } from '@/server/workflow-service';

const result = await approveWorkflowItem(
    { id: '697f15ce...', type: 'feature' },
    { initialRoute: 'tech-design' } // optional
);

if (result.success) {
    console.log(`Issue #${result.issueNumber} created`);
    if (result.needsRouting) {
        // Show routing UI to admin
    }
}
```

### `routeWorkflowItem(ref, destination)`

Routes a workflow item to a destination phase by updating the adapter status and clearing review status.

**Steps performed:**
1. Looks up source document to get `githubProjectItemId`
2. Validates destination against type-specific routing map
3. Updates adapter status (moves item to target column)
4. Clears review status (unless routing to backlog)
5. Updates local workflow-items DB to keep in sync
6. Agent logging
7. Sends Telegram info notification

```typescript
import { routeWorkflowItem } from '@/server/workflow-service';

const result = await routeWorkflowItem(
    { id: '697f15ce...', type: 'feature' },
    'tech-design'
);

if (result.success) {
    console.log(`Routed to ${result.targetLabel}`);
}
```

### `routeWorkflowItemByWorkflowId(workflowItemId, status)`

Convenience wrapper used by the UI, which works with workflow-item IDs and raw status strings. Looks up the workflow item, converts the status to a routing destination, and delegates to `routeWorkflowItem()`.

### `deleteWorkflowItem(ref, options?)`

Deletes a workflow item from the source collection and cleans up workflow-items.

**Steps performed:**
1. Fetches source document
2. Checks GitHub sync status (blocks unless `force: true`)
3. Deletes from source collection (feature-requests or reports)
4. Cleans up orphaned workflow-items entry
5. Sends Telegram info notification

```typescript
import { deleteWorkflowItem } from '@/server/workflow-service';

const result = await deleteWorkflowItem(
    { id: '697f15ce...', type: 'bug' },
    { force: false }
);

if (!result.success) {
    console.error(result.error); // "Cannot delete: already synced to GitHub"
}
```

## Types

All types are defined in `src/server/workflow-service/types.ts`:

| Type | Description |
|------|-------------|
| `ItemType` | `'feature' \| 'bug'` |
| `RoutingDestination` | `'product-dev' \| 'product-design' \| 'tech-design' \| 'implementation' \| 'backlog'` |
| `WorkflowItemRef` | Reference to a source item: `{ id: string; type: ItemType }` |
| `ApproveOptions` | Optional approve config: `{ initialRoute?, initialStatusOverride? }` |
| `ApproveResult` | Result with `success`, `issueNumber`, `issueUrl`, `needsRouting`, `title` |
| `RouteResult` | Result with `success`, `targetStatus`, `targetLabel` |
| `DeleteOptions` | `{ force?: boolean }` -- force delete even if synced to GitHub |
| `DeleteResult` | Result with `success`, `title` |

## Constants

All constants are defined in `src/server/workflow-service/constants.ts`:

### Routing Maps

Routing maps translate user-facing destination names to internal adapter status strings.

**`FEATURE_ROUTING_STATUS_MAP`** -- all 5 destinations available for features:
- `product-dev` -> Product Development
- `product-design` -> Product Design
- `tech-design` -> Technical Design
- `implementation` -> Ready for Development
- `backlog` -> Backlog

**`BUG_ROUTING_STATUS_MAP`** -- 4 destinations for bugs (no `product-dev`):
- `product-design` -> Product Design
- `tech-design` -> Technical Design
- `implementation` -> Ready for Development
- `backlog` -> Backlog

**`ROUTING_DESTINATION_LABELS`** -- human-readable labels for each destination.

### Helper Functions

- `getRoutingStatusMap(type)` -- returns the appropriate routing map for the item type
- `statusToDestination(status)` -- reverse lookup: converts a raw status string to a `RoutingDestination`

## Notification Behavior

Telegram serves as the universal notification center. Every service operation sends a notification, so the admin is always informed regardless of which transport initiated the action.

### Two Notification Channels

| Channel | Env Var | Purpose | Examples |
|---------|---------|---------|----------|
| **Actionable** | `AGENT_TELEGRAM_CHAT_ID` | Messages with buttons requiring admin action | Routing buttons after approval |
| **Info** | `AGENT_INFO_TELEGRAM_CHAT_ID` | Confirmations and status updates | "Routed to Tech Design", "Deleted" |

The info channel falls back to: `AGENT_INFO_TELEGRAM_CHAT_ID` -> `AGENT_TELEGRAM_CHAT_ID` -> `ownerTelegramChatId`.

### Notification per Operation

| Operation | Channel | Content |
|-----------|---------|---------|
| Approve (feature, needs routing) | Actionable | Routing buttons (Product Design, Tech Design, etc.) |
| Approve (bug, auto-routed) | Info | Auto-routed to Bug Investigation confirmation |
| Route | Info | "Routed to {destination}" with View Issue button |
| Delete | Info | "Deleted: {title}" |

All notification sends are fire-and-forget (errors are caught and logged as warnings).

## Cross-Transport Edge Cases

The service layer handles several edge cases consistently across all transports:

| Edge Case | Behavior |
|-----------|----------|
| **Double-approval** | Prevented -- checks `githubIssueUrl` exists before approving. Returns `{ success: false, error: 'Already approved' }` |
| **Delete after GitHub sync** | Blocked by default -- returns error unless `force: true` |
| **Delete already-deleted item** | Idempotent -- cleans up orphaned workflow-items and returns success |
| **Invalid routing destination** | Validated against type-specific routing map (bugs cannot route to `product-dev`) |
| **Missing GitHub project item** | Returns error -- item must be synced to GitHub before routing |

## How to Add New Operations

To add a new workflow operation (e.g., `reassignWorkflowItem`):

1. **Add types** in `src/server/workflow-service/types.ts`:
   ```typescript
   export interface ReassignOptions { ... }
   export interface ReassignResult { success: boolean; error?: string; }
   ```

2. **Add notification** in `src/server/workflow-service/notify.ts`:
   ```typescript
   export async function notifyReassigned(...): Promise<void> { ... }
   ```

3. **Create operation** in `src/server/workflow-service/reassign.ts`:
   - Validate state
   - Perform infrastructure calls
   - Agent logging
   - Call notification (fire-and-forget)
   - Return result

4. **Export** from `src/server/workflow-service/index.ts`

5. **Wire up transports** -- each transport calls the service function:
   - Telegram handler: parse callback data -> call service -> edit message
   - UI API: parse request body -> call service -> return JSON
   - CLI command: parse args -> call service -> print result

## Related Documentation

- [Workflow Overview](./overview.md) -- overall architecture
- [CLI](./cli.md) -- CLI commands including `approve`, `route`, `delete`
- [Telegram Integration](./telegram-integration.md) -- notification channels and webhook
- [Workflow Items Architecture](./workflow-items-architecture.md) -- data model
