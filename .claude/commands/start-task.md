---
description: Start implementing a task from task-manager/tasks.md with full workflow support
---

# Start Task Command

Implement a task from `task-manager/tasks.md` following a systematic approach with proper planning, implementation, and verification.

## Usage

Invoke this command with a task number:
- `/start-task 1` - Start task 1
- `/start-task --task 3` - Start task 3

## Process Overview

Follow these steps to implement a task from task-manager/tasks.md:

---

## Step 1: Load Task Details
- **Objective**: Read the specific task from task-manager/tasks.md
- **Actions**:
  - Run: `yarn task work --task N` (where N is the task number)
  - This automatically:
    - Creates/switches to a git branch: `task/N-task-name`
    - Displays full task details (priority, size, complexity, implementation details)
    - Shows files to modify
    - Provides next steps
  - Read the task content carefully
  - Note the task priority, size, and complexity

---

## Step 2: Understand Requirements
- **Objective**: Gain clear understanding of what needs to be done
- **Actions**:
  - Read the task summary and impact
  - Review the implementation details section
  - Identify files to modify
  - Note any specific code examples or patterns to follow
  - Check for any "CRITICAL" or "IMPORTANT" notes
  - If anything is unclear, ask the user for clarification

---

## Step 3: Review Related Documentation
- **Objective**: Ensure compliance with project standards
- **Actions**:
  - Check `CLAUDE.md` for relevant guidelines
  - Review any documentation mentioned in the task (e.g., specific docs/ files)
  - Understand the project's architectural patterns
  - Note any specific requirements or constraints

---

## Step 4: Explore Relevant Code
- **Objective**: Familiarize yourself with the code to be modified
- **Actions**:
  - Read the files listed in "Files to Modify" section
  - Understand the current implementation
  - Identify where changes need to be made
  - Look for existing patterns to follow
  - Note any dependencies or related code

---

## Step 5: Create Implementation Plan
- **Objective**: Break down the work into manageable steps
- **Actions**:
  - Use the TodoWrite tool to create a structured task list if the task is complex
  - Break down implementation into logical sub-tasks
  - Order sub-tasks by dependencies
  - For simple tasks (XS/S), you may skip this step

**Example Todo List for Complex Task:**
```
- [ ] Read and understand current implementation
- [ ] Add new field to TypeScript interface
- [ ] Implement server-side logic
- [ ] Add client-side hook
- [ ] Update component to use new field
- [ ] Test the implementation
- [ ] Run validation checks
```

---

## Step 6: Implement the Task
- **Objective**: Execute the implementation following best practices

### Core Guidelines:

**Follow Task Instructions**
- Implement exactly what the task specifies
- Use code examples provided in the task
- Follow file structure and patterns mentioned
- Don't add features beyond the task scope

**Keep It Simple**
- Fix only what's specified in the task
- Don't over-engineer the solution
- Use straightforward approaches

**Follow Project Guidelines**
- Implement according to established patterns
- Maintain consistency with existing code
- Use the same styling and naming conventions
- Check CLAUDE.md for specific rules

**Maintain Code Quality**
- Avoid code duplication
- Keep files modular and focused
- Add proper error handling
- Follow TypeScript strict mode

**For Multi-Step Tasks:**
- Implement one sub-task at a time
- Mark each sub-task complete before moving to next
- Keep commits logical and focused

---

## Step 7: Run Validation Checks
- **Objective**: Ensure code quality and correctness
- **Actions**:
  - Run: `yarn checks`
  - This runs both TypeScript and ESLint checks
  - Fix any errors or warnings
  - Re-run until all checks pass
  - **DO NOT proceed to next step until checks pass**

**If checks fail:**
1. Read the error messages carefully
2. Fix TypeScript errors first
3. Fix ESLint errors second
4. Re-run `yarn checks`
5. Repeat until all checks pass

---

## Step 8: Request User Review and Approval (MANDATORY)
- **Objective**: Get user approval before committing any code
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
1. Proceed with committing and creating the PR
2. Make any modifications
3. Show you the actual code changes
```

- **Wait for explicit approval** before proceeding to commit
- If user requests changes, make them and return to Step 7 (validation)
- Only proceed to Step 9 after user says "yes", "approve", "proceed", or similar

---

## Step 9: Commit Changes
- **Objective**: Save the work to version control
- **Actions**:
  - Stage all changes: `git add .`
  - Write a proper commit message following conventional commit format:
    - `fix:` for bug fixes
    - `feat:` for new features
    - `refactor:` for code refactoring
    - `docs:` for documentation changes
  - Include task number in commit message
  - Example: `fix: correct cost tracking in implementation agent (task #1)`
  - Commit: `git commit -m "message"`

---

## Step 10: Mark Task as Done (AUTOMATIC)
- **Objective**: Update task status in task-manager/tasks.md immediately after implementation
- **Actions**:
  - Run: `yarn task mark-done --task N` (where N is the task number)
  - This updates the task header with ✅ DONE marker and completion date
  - Stage the change: `git add task-manager/tasks.md`
  - Commit with message: `git commit -m "docs: mark task #N as done"`
  - This creates a **separate commit** following the implementation commit

**CRITICAL:** This step MUST happen before pushing/PR creation so both commits go into the same PR.

**Why a separate commit?**
- Keeps implementation and documentation changes separated
- Makes git history cleaner and easier to review
- Follows the principle of atomic commits

---

## Step 11: Push and Create PR
- **Objective**: Submit changes for review (includes both implementation and task status commits)
- **Actions**:
  - Push to remote: `git push -u origin task/N-branch-name`
    - This pushes **both commits**: implementation commit + task status commit
  - Create PR using: `yarn github-pr create --title "Title" --body "Description"`
  - PR title should:
    - Use conventional commit format
    - Clearly describe what was done
    - Reference task number
  - PR body should:
    - Link to task: "Implements Task #N from task-manager/tasks.md"
    - Summarize what was changed
    - List key files modified
    - Note any important decisions

**Example PR Creation:**
```bash
yarn github-pr create \
  --title "fix: Cost Tracking Bug in Implementation Agent" \
  --body "Implements Task #1 from task-manager/tasks.md

Fixes cost tracking by using actual usage values from Claude SDK response instead of hardcoded zeros.

Changes:
- Updated logExecutionEnd() call in implementAgent/index.ts
- Now correctly tracks toolCallsCount, totalTokens, totalCost

Files modified:
- src/agents/core-agents/implementAgent/index.ts

This PR includes 2 commits:
1. Implementation commit with the fix
2. Documentation commit marking task as done"
```

---

## Step 12: Summarize
- **Objective**: Provide completion report to the user
- **Actions**:
  - Summarize what was implemented
  - Highlight key changes and files modified
  - Show the PR URL
  - Confirm validation checks passed
  - Confirm task was marked as done in tasks.md
  - Note any follow-up items if applicable

---

## Quick Checklist

- [ ] Task loaded with `yarn task work --task N`
- [ ] Requirements understood
- [ ] Documentation reviewed (CLAUDE.md, task-specific docs)
- [ ] Relevant code explored
- [ ] Implementation plan created (if needed)
- [ ] Task implemented following guidelines
- [ ] `yarn checks` passed with 0 errors
- [ ] **User review requested and approval received**
- [ ] Changes committed with proper message (implementation commit)
- [ ] Task marked as done with `yarn task mark-done --task N` (separate commit)
- [ ] Both commits pushed to remote
- [ ] PR created with clear title and description
- [ ] User notified with summary

---

## Important Notes

### Task Size Guidelines

- **XS tasks**: Usually 1 file, < 50 lines changed, no planning needed
- **S tasks**: 2-5 files, < 100 lines, simple planning
- **M tasks**: 5-15 files, < 500 lines, detailed planning recommended
- **L tasks**: 15-30 files, < 1000 lines, comprehensive planning required
- **XL tasks**: 30+ files, > 1000 lines, should be broken into phases

### When to Ask for Help

Ask the user if:
- Task requirements are ambiguous
- Multiple valid approaches exist
- Implementation becomes more complex than expected
- Task size estimate seems wrong
- Breaking changes are required

### Common Pitfalls to Avoid

- Don't skip `yarn checks` - validation is critical
- Don't add features beyond task scope
- Don't refactor unrelated code
- Don't skip documentation if task requires it
- Don't forget to mark task as done (Step 10) before pushing
- Don't ignore "CRITICAL" notes in task description
- Don't combine implementation and task status into one commit - keep them separate
