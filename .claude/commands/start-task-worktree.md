---
description: Start implementing a task in a separate git worktree for isolated work
---

# Start Task in Worktree Command

Create a separate git worktree and implement a task from `task-manager/tasks.md` in isolation using the squash-merge workflow. This allows working on multiple tasks simultaneously with clean commit history.

## Usage

Invoke this command with a task number:
- `/start-task-worktree 3` - Start task 3 in a new worktree
- `/start-task-worktree --task 5` - Start task 5 in a new worktree

## Worktree Workflow Overview

This workflow uses **squash merge** for clean history:
1. Create worktree with branch
2. Work in worktree (messy commits are OK)
3. Run validation checks
4. **Return to main worktree**
5. **Squash merge** all worktree commits into ONE clean commit
6. Push to main
7. Clean up worktree and branch

**No PRs needed** - Changes go directly to main with a clean commit.

## When to Use Worktree Workflow

**Use worktree workflow when:**
- Working on multiple tasks simultaneously
- Need isolated environment without affecting main workspace
- Want to experiment freely (easy to abort)
- Task is small/medium and doesn't need code review
- Solo work or trusted automated implementation

**Use regular `/start-task` (with PR) when:**
- Changes need code review
- Large features requiring team collaboration
- Want CI checks before merging
- Working with a team on shared codebase

---

## Process Overview

---

## Step 1: Create Worktree
- **Objective**: Set up isolated workspace for the task
- **Actions**:
  - Run: `yarn task worktree --task N` (where N is the task number)
  - This automatically:
    - Creates worktree at `../worktree-task-N/`
    - Creates new branch: `task/N-task-name`
    - Provides setup instructions
  - Note the worktree path and branch name

**Expected Output:**
```
🔧 Creating worktree for Task N: Task Title

📂 Worktree path: /Users/you/Projects/worktree-task-N
🌿 Branch: task/N-task-name

✅ Worktree created!
```

---

## Step 2: Navigate to Worktree and Symlink Dependencies
- **Objective**: Set up worktree environment
- **Actions**:
  - Save main project path: `MAIN_PROJECT_PATH=$(pwd)`
  - Change to worktree: `cd ../worktree-task-N`
  - Symlink node_modules (DO NOT run yarn install): `ln -s "${MAIN_PROJECT_PATH}/node_modules" node_modules`
  - Verify symlink created: `ls -la node_modules`

**CRITICAL - Always symlink, never install:**
- ✅ **Faster**: No dependency installation (saves minutes)
- ✅ **Saves disk space**: Doesn't duplicate node_modules (saves GBs)
- ✅ **Same dependencies**: Uses exact same packages as main workspace
- ❌ **Never run `yarn install` in worktree** - Always use symlink

---

## Step 3: Understand Task Requirements
- **Objective**: Read and understand what needs to be done
- **Actions**:
  - Read `task-manager/tasks.md` for task details
  - Note priority, size, complexity
  - Review implementation details and code examples
  - Check for "CRITICAL" or "IMPORTANT" notes
  - Identify files to modify
  - If anything is unclear, ask the user

---

## Step 4: Review Documentation
- **Objective**: Ensure compliance with project standards
- **Actions**:
  - Check `CLAUDE.md` for relevant guidelines
  - Review any documentation mentioned in the task
  - Understand architectural patterns
  - Note specific requirements or constraints

---

## Step 5: Explore Relevant Code
- **Objective**: Familiarize with code to be modified
- **Actions**:
  - Read files listed in "Files to Modify"
  - Understand current implementation
  - Identify where changes need to be made
  - Look for existing patterns to follow

---

## Step 6: Create Implementation Plan (Optional)
- **Objective**: Break down complex work
- **Actions**:
  - For complex tasks, use TodoWrite tool for sub-tasks
  - Break into logical steps ordered by dependencies
  - For simple tasks (XS/S), skip this step

---

## Step 7: Implement the Task
- **Objective**: Execute implementation

### Implementation Guidelines:

**Follow Task Instructions**
- Implement exactly what the task specifies
- Use code examples from the task
- Follow file structure and patterns mentioned

**Keep It Simple**
- Don't over-engineer
- Use straightforward approaches
- Only change what's necessary

**Follow Project Guidelines**
- Maintain consistency with existing code
- Use project styling and naming conventions
- Check CLAUDE.md for specific rules

**Commit Freely (These Will Be Squashed)**
- Commit as often as you want
- WIP commits are fine: `git commit -m "WIP: initial changes"`
- Don't worry about perfect commit messages
- These commits will be combined into ONE clean commit later

**Example worktree commits:**
```bash
git add .
git commit -m "WIP: initial implementation"

# More changes...
git add .
git commit -m "WIP: fix TypeScript errors"

# More changes...
git add .
git commit -m "WIP: add error handling"
```

---

## Step 8: Run Validation Checks
- **Objective**: Ensure code quality before merging
- **Actions**:
  - Run: `yarn checks`
  - Fix any TypeScript errors
  - Fix any ESLint errors
  - Re-run until all checks pass
  - **DO NOT proceed until checks pass**

---

## Step 9: Request User Review and Approval (MANDATORY)
- **Objective**: Get user approval before committing/merging any code
- **Actions**:
  - **STOP and present to the user:**
    1. **Task Summary**: Remind the user what task was being implemented (task number, title, objective)
    2. **Implementation Summary**: Explain what was done:
       - List all files that were modified/created
       - Briefly describe the key changes in each file
       - Highlight any important decisions made
    3. **Validation Status**: Confirm `yarn checks` passed
    4. **Ask for Approval**: Explicitly ask the user to review and approve before committing

**Example message to user:**
```
## Ready for Review

**Task #2:** Debug PR Reviewer + Claude Integration

**What was implemented:**
- `src/agents/core-agents/prReviewAgent/createPrReviewerAgentPrompt.ts`
  - Updated instruction text to require explicit acknowledgment of Claude's feedback
  - Changed "optional guidance" to mandatory AGREE/DISAGREE response format
- `src/agents/core-agents/prReviewAgent/AGENTS.md`
  - Updated documentation to reflect new feedback handling behavior

**Validation:** ✅ `yarn checks` passed

**Please review the changes and let me know if you'd like me to:**
1. Proceed with committing and pushing to main
2. Make any modifications
3. Show you the actual code changes
```

- **Wait for explicit approval** before proceeding to commit
- If user requests changes, make them and return to Step 8 (validation)
- Only proceed to Step 10 after user says "yes", "approve", "proceed", or similar

---

## Step 10: Final Commit in Worktree
- **Objective**: Ensure all changes are committed
- **Actions**:
  - Stage any remaining changes: `git add .`
  - Commit: `git commit -m "WIP: final changes"`
  - Verify worktree is clean: `git status`

---

## Step 11: Return to Main Worktree
- **Objective**: Prepare for squash merge
- **Actions**:
  - Navigate back to main project: `cd /path/to/main/project`
  - Ensure main worktree is on main branch: `git checkout main`
  - Pull latest changes: `git pull origin main`

---

## Step 12: Squash Merge Branch
- **Objective**: Combine all worktree commits into ONE clean commit
- **Actions**:
  - Squash merge the worktree branch: `git merge --squash task/N-branch-name`
  - This stages all changes from worktree as one batch
  - All worktree commits are combined (no individual commit history)

**What `--squash` does:**
- Combines ALL commits from worktree into staged changes
- Lets you write ONE clean commit message
- No merge commit created
- Clean linear history on main

---

## Step 13: Create Clean Commit
- **Objective**: Write polished commit message for main branch
- **Actions**:
  - Create commit with detailed message:

```bash
git commit -m "$(cat <<'EOF'
fix: descriptive title of what was changed (task #N)

Detailed explanation of what was changed and why.
Can be multiple lines explaining the implementation.

Implements Task #N from task-manager/tasks.md

Key changes:
- File 1: what was changed
- File 2: what was changed

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

**Commit message guidelines:**
- First line: conventional commit format (`fix:`, `feat:`, `refactor:`)
- Include task number reference
- Explain what and why, not how
- List key changes
- Add Co-Authored-By tag

---

## Step 14: Push to Main
- **Objective**: Deploy changes to main branch
- **Actions**:
  - Push to main: `git push origin main`
  - Verify push succeeded

---

## Step 15: Clean Up Worktree
- **Objective**: Remove worktree and branch
- **Actions**:
  - Remove worktree: `git worktree remove ../worktree-task-N`
  - If needed: `git worktree remove ../worktree-task-N --force`
  - Delete local branch: `git branch -d task/N-branch-name`
  - If you pushed the branch: `git push origin --delete task/N-branch-name`

---

## Step 16: Mark Task Done
- **Objective**: Update task tracking
- **Actions**:
  - Mark task complete: `yarn task mark-done --task N`
  - Commit change: `git add task-manager/tasks.md && git commit -m "docs: mark task N as done"`
  - Push: `git push origin main`

---

## Step 17: Summarize
- **Objective**: Report completion to user
- **Actions**:
  - Summarize what was implemented
  - Highlight key changes and files modified
  - Show the clean commit message that was created
  - Confirm validation checks passed
  - Confirm task marked as done
  - Confirm worktree cleaned up

---

## Quick Checklist

- [ ] Worktree created with `yarn task worktree --task N`
- [ ] Navigated to worktree and symlinked node_modules (NOT yarn install)
- [ ] Task requirements understood
- [ ] Documentation reviewed (CLAUDE.md)
- [ ] Relevant code explored
- [ ] Task implemented (WIP commits OK)
- [ ] `yarn checks` passed with 0 errors
- [ ] **User review requested and approval received**
- [ ] Final WIP commit made in worktree
- [ ] Returned to main worktree on main branch
- [ ] Squash merged branch: `git merge --squash task/N-branch`
- [ ] Created ONE clean commit with detailed message
- [ ] Pushed to main: `git push origin main`
- [ ] Removed worktree and branch
- [ ] Marked task as done
- [ ] User notified with summary

---

## Squash Merge Workflow Quick Reference

```bash
# === IN WORKTREE ===
MAIN_PROJECT_PATH=$(pwd)
cd ../worktree-task-N
ln -s "${MAIN_PROJECT_PATH}/node_modules" node_modules
# ... implement changes, commit freely (WIP commits OK) ...
yarn checks
git add . && git commit -m "WIP: final"

# === IN MAIN WORKTREE ===
cd "${MAIN_PROJECT_PATH}"
git checkout main
git pull origin main
git merge --squash task/N-branch-name

# Create ONE clean commit
git commit -m "$(cat <<'EOF'
fix: description (task #N)

Details about the change.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

git push origin main

# === CLEANUP ===
git worktree remove ../worktree-task-N
git branch -d task/N-branch-name
yarn task mark-done --task N
```

---

## Common Scenarios

### Abort/Discard Changes

If you want to throw away all work in worktree:

```bash
git worktree remove --force ../worktree-task-N
git branch -D task/N-branch-name
```

### Check Existing Worktrees

```bash
git worktree list
```

### Multiple Worktrees in Parallel

```bash
# Work on task 3
MAIN_PROJECT_PATH=$(pwd)
yarn task worktree --task 3
cd ../worktree-task-3 && ln -s "${MAIN_PROJECT_PATH}/node_modules" node_modules
# ... work on task 3 ...

# Work on task 5 simultaneously
cd "${MAIN_PROJECT_PATH}"
yarn task worktree --task 5
cd ../worktree-task-5 && ln -s "${MAIN_PROJECT_PATH}/node_modules" node_modules
# ... work on task 5 ...

# Merge task 3 when ready
cd "${MAIN_PROJECT_PATH}"
git merge --squash task/3-branch
git commit -m "..."
git push origin main
git worktree remove ../worktree-task-3

# Merge task 5 when ready
git merge --squash task/5-branch
git commit -m "..."
git push origin main
git worktree remove ../worktree-task-5
```

---

## Benefits of Squash-Merge Worktree Workflow

1. **Clean History**: ONE commit per task on main, no messy WIP commits
2. **Freedom to Experiment**: Commit freely in worktree, will be squashed
3. **Easy Abort**: Just delete worktree, no cleanup needed
4. **Isolated Work**: Main workspace stays clean and untouched
5. **No PRs Needed**: Direct to main for solo/trusted work
6. **Parallel Work**: Multiple worktrees for multiple tasks
7. **Fast**: No PR review cycle for simple tasks

---

## When NOT to Use Worktree

- **Large features**: Use `/start-task` with PR for code review
- **Team work**: Use PR workflow for collaboration
- **Quick fixes** (XS): Regular workflow is faster, no isolation needed
- **Limited disk space**: Worktrees duplicate the codebase
- **Need CI checks**: Use PR workflow with GitHub Actions

---

## Anti-Patterns to Avoid

| Don't Do This | Do This Instead |
|---------------|-----------------|
| Push feature branch, then merge with PR | Squash merge locally, push to main |
| Create PR for tiny solo fixes | Squash merge directly to main |
| Checkout feature branch in main worktree | Keep branches in their worktrees |
| Leave old worktrees around | Clean up after squash merging |
| Skip `yarn checks` before merge | Always validate before squash merge |
| Forget to squash merge | Use `git merge --squash`, not `git merge` |

---

## Worktree vs Regular Task Workflow

| Aspect | `/start-task-worktree` | `/start-task` |
|--------|------------------------|---------------|
| **Workspace** | Separate worktree | Main workspace |
| **Commits** | Messy WIP commits OK | Clean commits |
| **Merge method** | Squash merge to main | PR with squash/merge |
| **Code review** | No (direct to main) | Yes (PR review) |
| **Best for** | Solo work, experiments | Team work, large features |
| **History** | ONE clean commit | PR with review history |
| **Speed** | Fast (no PR review) | Slower (PR review cycle) |
| **Isolation** | Full isolation | Same workspace |
| **Parallel work** | Multiple worktrees | Branch switching |
