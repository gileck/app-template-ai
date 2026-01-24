# Task Manager - Sync Status

Complete list of task management files and their sync behavior.

## 📁 File Inventory

### task-manager/ Directory

| File | Syncs? | Purpose |
|------|--------|---------|
| `tasks.md` | ❌ NO | Project-specific task list (never syncs) |
| `TASK_FORMAT.md` | ✅ YES | Task format specification |
| `tasks-cli.ts` | ✅ YES | CLI implementation |
| `README.md` | ✅ YES | Folder overview |
| `TASK_COMMANDS.md` | ✅ YES | Quick reference guide |
| `SLASH_COMMANDS_README.md` | ✅ YES | Complete slash commands guide |
| `task-management-cli.md` | ✅ YES | CLI documentation |
| `.sync-info.md` | ✅ YES | Sync behavior explanation |
| `SYNC_STATUS.md` | ✅ YES | This file |

### .claude/commands/ Directory

| File | Syncs? | Purpose |
|------|--------|---------|
| `task-list.md` | ✅ YES | `/task-list` slash command |
| `start-task.md` | ✅ YES | `/start-task` slash command |
| `start-task-worktree.md` | ✅ YES | `/start-task-worktree` slash command |

### package.json Scripts

| Script | Syncs? | Purpose |
|--------|--------|---------|
| `task` | ✅ YES | Main task CLI (supports all commands) |

### Related Documentation

| File | Syncs? | Purpose |
|------|--------|---------|
| `docs/git-worktree-workflow.md` | ✅ YES | Worktree workflow guide |

## 🔧 Configuration

### .template-sync.json

```json
{
  "projectSpecificFiles": [
    "task-manager/tasks.md"
  ]
}
```

**What this means:**
- `task-manager/tasks.md` is marked as project-specific
- Template sync will never overwrite this file in child projects
- All other task-manager files WILL sync normally

## 📊 Sync Summary

### Total Files: 11

- ✅ **10 files sync** (tools, docs, commands, format spec, 1 script)
- ❌ **1 file doesn't sync** (tasks.md)

### Sync Percentage: 91%

Almost everything syncs except the project-specific task list.

## 🎯 Why This Design?

### Tools & Documentation Should Sync ✅
- Bug fixes in CLI
- New features in slash commands
- Improved documentation
- Better workflows

### Task List Should NOT Sync ❌
- Each project has unique tasks
- Different priorities
- Project-specific implementation details
- Independent progress tracking

## 🚀 For Child Projects

### When You Sync Template

```bash
# In child project
yarn sync-template
```

**You receive:**
- Latest CLI tools
- Updated documentation
- New/improved slash commands
- Bug fixes

**You keep:**
- Your own `task-manager/tasks.md`
- Your task progress
- Your priorities

### First Time Setup

If you don't have `task-manager/tasks.md` yet:

```bash
# Create initial tasks file
cat > task-manager/tasks.md << 'EOF'
# Tasks

Tasks sorted by priority (Critical → High → Medium → Low).

---

## 1. Setup Project

| Priority | Complexity | Size |
|----------|------------|------|
| **High** | Low | S |

**Summary:** Initial project setup and configuration

**Files to Modify:**
- TBD
EOF
```

## 🔍 Verification

To verify sync behavior:

```bash
# Check template sync config
cat .template-sync.json | grep -A 5 projectSpecificFiles

# Should show:
# "projectSpecificFiles": [
#   "task-manager/tasks.md"
# ]
```

## 📝 Adding New Task Management Files

When adding new files to the task management system:

### If it's a TOOL/UTILITY (should sync):
- ✅ Just add it to `task-manager/` or `.claude/commands/`
- ✅ It will automatically sync to child projects
- ✅ No configuration needed

### If it's PROJECT-SPECIFIC (shouldn't sync):
- ❌ Add to `.template-sync.json` under `projectSpecificFiles`
- ❌ Example: task templates, project-specific configs

## 🆘 Troubleshooting

### "My tasks.md was overwritten during sync!"

This shouldn't happen if configured correctly. Check:
1. Is `task-manager/tasks.md` in `.template-sync.json`?
2. Did you use `--auto-override-conflicts` flag?
3. Was there a conflict that wasn't handled correctly?

### "New task tools aren't appearing in child project"

Make sure:
1. You ran `yarn sync-template` in child project
2. File isn't in `ignoredFiles` or `projectSpecificFiles`
3. Sync completed successfully without errors

### "I want to add a new utility file"

Just add it! As long as it's not in `projectSpecificFiles`, it will sync automatically.
