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

## Step 8: Review Implementation
- **Objective**: Self-review before committing
- **Actions**:
  - Review all changed files
  - Verify the implementation matches task requirements
  - Check for edge cases
  - Ensure error handling is proper
  - Verify no unrelated changes were made
  - Confirm adherence to project guidelines

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

## Step 10: Push and Create PR
- **Objective**: Submit changes for review
- **Actions**:
  - Push to remote: `git push -u origin task/N-branch-name`
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
- src/agents/core-agents/implementAgent/index.ts"
```

---

## Step 11: Mark Task as Done (After PR Merges)
- **Objective**: Track completion in task-manager/tasks.md
- **Actions**:
  - After PR is merged, run: `yarn task mark-done --task N`
  - This adds ✅ DONE marker to the task header
  - Commit the change: `git add task-manager/tasks.md && git commit -m "docs: mark task N as done"`
  - Push: `git push`

**IMPORTANT:** Only mark task as done AFTER the PR is merged, not before!

---

## Step 12: Summarize
- **Objective**: Provide completion report to the user
- **Actions**:
  - Summarize what was implemented
  - Highlight key changes and files modified
  - Show the PR URL
  - Confirm validation checks passed
  - Remind to mark task as done after PR merges
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
- [ ] Implementation self-reviewed
- [ ] Changes committed with proper message
- [ ] Changes pushed to remote
- [ ] PR created with clear title and description
- [ ] User notified with summary
- [ ] (After merge) Task marked as done

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
- Don't mark task as done before PR merges
- Don't ignore "CRITICAL" notes in task description
