---
number: 26
title: Standardize Telegram Messages and Commit Summaries
priority: Medium
size: M
complexity: Low
status: Backlog
dateAdded: 2026-01-27
dateUpdated: 2026-01-27
---

# Task 26: Standardize Telegram Messages and Commit Summaries

**Summary:** Ensure all Telegram notifications and commit summaries across all workflow phases follow a consistent format and include the same issue context.

## Problem

Currently, Telegram messages and commit summaries vary across different phases:
1. Some messages include issue number, some don't
2. Format and structure differs between agents
3. Commit summaries have inconsistent formatting
4. Hard to track which messages belong to which issue

## Proposed Solution

Create standardized templates for:
1. **Telegram Messages** - Consistent header with issue number, phase, and action
2. **Commit Summaries** - Consistent format linking back to issue
3. **PR Descriptions** - Standard sections and formatting

## Standardization Requirements

### Telegram Messages
```
[Issue #{number}] {phase}: {action}
---
{details}

{action buttons}
```

### Commit Messages
```
{type}({scope}): {description}

Issue: #{number}
Phase: {phase} (if multi-phase)

{body}
```

## Files to Modify

- `src/server/telegram.ts` - Add message formatting helpers
- `src/agents/core-agents/*/` - Update each agent to use standard formats
- `src/agents/shared/` - Create shared formatting utilities
- PR Review Agent - Ensure generated commit messages follow format

## Implementation Steps

1. Audit all current message formats across agents
2. Design unified template system
3. Create shared formatting functions
4. Update each agent to use the new functions
5. Test all notification paths

## Notes

- Consider using a template engine for flexibility
- Include issue URL in messages for easy navigation
- Phase indicators are especially important for multi-phase features
