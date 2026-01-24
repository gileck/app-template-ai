---
description: List all tasks from task-manager/tasks.md organized by priority
---

# Task List Command

Display all available tasks from `task-manager/tasks.md` organized by priority.

## Process

### Step 1: Read Tasks File
- **Objective**: Load tasks from task-manager/tasks.md
- **Actions**:
  - Read the `task-manager/tasks.md` file from the project root
  - Parse all tasks with their metadata (number, title, priority, size, complexity)

### Step 2: Organize by Priority
- **Objective**: Group tasks for easy decision-making
- **Actions**:
  - Group tasks by priority: Critical → High → Medium → Low
  - Within each priority, maintain task order by number

### Step 3: Display Task List
- **Objective**: Present tasks in a clear, actionable format
- **Actions**:
  - Show tasks grouped by priority with visual indicators
  - Display task number, title, and size for each task
  - Use emojis for priority levels:
    - 🔴 Critical
    - 🟠 High
    - 🟡 Medium
    - 🟢 Low

### Step 4: Recommend Next Task
- **Objective**: Help user prioritize work
- **Actions**:
  - Identify the highest priority task that's not marked as done
  - Suggest it as the next task to work on
  - Mention the size estimate to set expectations

## Example Output Format

```
📋 Tasks by Priority

🔴 Critical:
  1. Fix Cost Tracking Bug in Implementation Agent (XS)

🟠 High:
  2. Debug PR Reviewer + Claude Integration (S)
  3. Add "Ready to Merge" Status with Admin Approval Gate (M)

🟡 Medium:
  4. Add Agent Retry Logic for Transient Failures (M)
  5. Add Stale Item Detection Workflow (M)

🟢 Low:
  10. Add Cost Budgeting and Alerts (M)

💡 Recommended: Start with Task 1 (Critical, XS size)
```

## Quick Checklist

- [ ] Tasks file read successfully
- [ ] Tasks organized by priority
- [ ] Task list displayed clearly
- [ ] Recommendation provided
