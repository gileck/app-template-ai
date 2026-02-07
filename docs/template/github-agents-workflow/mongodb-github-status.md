# MongoDB Status vs Workflow Status

The system uses a **two-tier status tracking** approach with three MongoDB collections:

1. **Source collections** (`feature-requests`, `reports`) - intake/approval lifecycle
2. **Workflow-items collection** - detailed workflow pipeline tracking

## Source Collection Statuses (4 values)

Source collections track the high-level lifecycle state and store rich diagnostic data.

### Feature Requests
| Status | Meaning |
|--------|---------|
| `new` | Feature request submitted, not yet approved |
| `in_progress` | Approved and synced to GitHub (detailed status in workflow-items) |
| `done` | Completed and merged |
| `rejected` | Not going to implement |

### Bug Reports
| Status | Meaning |
|--------|---------|
| `new` | Bug report submitted, not yet approved |
| `investigating` | Approved and synced to GitHub (detailed status in workflow-items) |
| `resolved` | Fixed and merged |
| `closed` | Won't fix, duplicate, or not a bug |

## Workflow-Items Collection (Pipeline Tracking)

The `workflow-items` collection tracks detailed workflow steps through the development pipeline. Each document represents an active item in the pipeline.

### Schema
```typescript
{
    _id: ObjectId,
    type: 'feature' | 'bug' | 'task',
    title: string,
    description?: string,
    status: string,                // Pipeline status (see below)
    reviewStatus?: string,         // Sub-state within each phase
    implementationPhase?: string,  // '1/3', '2/3', etc. for multi-phase features
    sourceRef?: {                  // Back-reference to source document (null for CLI tasks)
        collection: 'feature-requests' | 'reports',
        id: ObjectId,
    },
    githubIssueNumber?: number,
    githubIssueUrl?: string,
    githubIssueTitle?: string,
    labels?: string[],
    createdAt: Date,
    updatedAt: Date,
}
```

### Pipeline Statuses
| Status | Meaning |
|--------|---------|
| `Backlog` | New items, not yet started |
| `Product Design` | AI generates product design, human reviews |
| `Bug Investigation` | AI investigates bug root cause |
| `Technical Design` | AI generates tech design, human reviews |
| `Ready for development` | AI implements feature (picked up by implement agent) |
| `PR Review` | PR created, waiting for human review/merge |
| `Done` | Completed and merged |

### Review Status (sub-state)
| Status | Meaning |
|--------|---------|
| `Waiting for Review` | Agent completed work, waiting for admin |
| `Approved` | Admin approved |
| `Request Changes` | Admin requested changes |
| `Rejected` | Admin rejected |
| `Waiting for Clarification` | Needs more info |
| `Clarification Received` | Info provided, ready to resume |

## How Items Flow Between Collections

### Creation Flow
```
1. User submits feature/bug via UI or CLI
   → Created in feature-requests or reports (status: 'new')

2. Admin approves via Telegram
   → Source doc status: 'in_progress' / 'investigating'
   → GitHub issue created
   → Workflow-item document created (status: 'Backlog' or routed phase)
   → Source doc's githubProjectItemId updated to workflow-item _id

3. Agents process the item through pipeline
   → Only workflow-items.status and workflow-items.reviewStatus change
   → Source doc status stays 'in_progress' / 'investigating'

4. PR merged, item complete
   → Workflow-item status: 'Done'
   → Source doc status: 'done' / 'resolved'
```

### Key Relationships
- Source doc `githubProjectItemId` points to `workflow-items._id`
- Workflow-item `sourceRef` points back to source doc `_id` and collection
- All pipeline agents read/write workflow-items (not source collections)
- Source collections store diagnostic data (session logs, stack traces, etc.)

## Why This Split?

### Source Collections' Role
- **Tracks approval state and lifecycle**: new -> in progress -> done
- **Stores rich diagnostics for bugs**: Session logs, screenshots, stack traces
- **Separate collections**: Features and bugs have different data shapes
- **Provides user-facing API**: App UI displays source status for new/done/rejected items

### Workflow-Items Collection's Role
- **Tracks detailed workflow steps**: Backlog -> Product Design -> Tech Design -> etc.
- **Single collection queries**: No need to merge feature-requests + reports
- **Enables agent coordination**: Each agent knows what phase to process
- **Review Status sub-tracking**: Within each phase (empty -> Waiting for Review -> Approved)
- **Extensible**: New item types (tasks) don't require new source collections

### Benefits
1. **Clean separation**: Source = approval & diagnostics, Workflow = pipeline
2. **Single-collection queries**: List all pipeline items with one query
3. **No sync conflicts**: Source status only changes at major lifecycle events
4. **Flexible workflow**: Can change pipeline columns without touching source schema
5. **Extensible**: CLI-created tasks can enter pipeline without a source collection

## Status Transitions

### Feature Request Lifecycle
```
new -> (admin approves) -> in_progress -> (PR merges) -> done
                                |
                        (admin rejects) -> rejected
```

### Bug Report Lifecycle
```
new -> (admin approves) -> investigating -> (fix merges) -> resolved
                                 |
                        (admin closes) -> closed
```

### Workflow Pipeline (while in_progress/investigating)
```
Backlog -> Product Design -> Technical Design -> Ready for development -> PR Review -> Done
     |         |                  |                   |                    |
   (can skip phases based on admin routing decision)
```

## Related Documentation

- **[overview.md](./overview.md)** - Complete system overview
- **[setup-guide.md](./setup-guide.md)** - Setup instructions
