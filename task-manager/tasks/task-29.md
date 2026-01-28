---
number: 29
title: Disable Plan Mode When Addressing PR Feedback
priority: Medium
size: S
complexity: Low
status: Backlog
dateAdded: 2026-01-27
dateUpdated: 2026-01-27
---

# Task 29: Disable Plan Mode When Addressing PR Feedback

**Summary:** Plan mode should only be enabled for new PR creation, not when the implementor is addressing feedback from PR review.

## Problem

Currently, plan mode (Plan Subagent) may be invoked even when:
1. The agent is addressing review feedback on an existing PR
2. Making minor fixes requested by reviewer
3. Iterating on an already-planned implementation

This adds unnecessary cost and time when the implementation direction is already established.

## Proposed Solution

Add logic to detect when the agent is:
1. **Creating a new PR** → Enable plan mode (if configured)
2. **Addressing feedback** → Disable plan mode, go straight to implementation

## Detection Criteria

The agent is "addressing feedback" when:
- PR already exists for this issue/phase
- PR has review comments requesting changes
- GitHub review status is "Changes Requested"
- Agent was triggered by "Request Changes" action

## Files to Modify

- `src/agents/core-agents/implementAgent/index.ts` - Add feedback detection
- `src/agents/lib/index.ts` - Pass feedback context to plan decision
- Possibly `src/agents/shared/planSubagent.ts` - Skip logic

## Implementation

```typescript
// Pseudocode
const isAddressingFeedback = await checkIfAddressingFeedback(issueNumber, phase);

if (isAddressingFeedback) {
  // Skip plan mode, implement directly
  await implementWithoutPlan(feedback);
} else {
  // New PR - use plan mode if enabled
  await implementWithPlan();
}
```

## Notes

- Simple check that can save cost on iterations
- Should log when plan mode is skipped and why
- Consider making this behavior configurable (always plan, never plan, smart plan)
