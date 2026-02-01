# Task 37: Implement Feature Branch Workflow with Phase PRs - Implementation Plan

## Objective

Refactor the GitHub agents workflow to use feature branches per task with phase PRs targeting those feature branches (not main), providing isolation between concurrent workflows, easier phase reviews, and preview deployments for verification before final merge.

## Current Architecture

Based on codebase exploration, here is how the system currently works:

### Current Branch Flow
```
main <--- Phase 1 PR (direct to main)
main <--- Phase 2 PR (direct to main)
main <--- Phase 3 PR (direct to main)
```

### Key Components Identified

1. **Implementation Agent** (`src/agents/core-agents/implementAgent/index.ts`)
   - Creates branches: `feature/issue-{N}-phase-{M}-{slug}` or `feature/issue-{N}-{slug}`
   - Creates PRs targeting `main` (via `defaultBranch`)
   - Handles new implementations, feedback addressing, and clarifications
   - Uses `generateBranchName()` for branch naming

2. **PR Review Agent** (`src/agents/core-agents/prReviewAgent/index.ts`)
   - Reviews PRs in "PR Review" status with "Waiting for Review"
   - Submits GitHub PR reviews (APPROVE or REQUEST_CHANGES)
   - Generates commit messages for merge

3. **GitHub Adapter** (`src/server/project-management/adapters/github.ts`)
   - `createPullRequest(head, base, title, body, reviewers)` - base branch is configurable
   - `findOpenPRForIssue()` - finds open PRs referencing an issue
   - `mergePullRequest()` - squash merges PRs
   - `createBranch()`, `deleteBranch()`, `branchExists()` - branch management

4. **On PR Merged Script** (`scripts/template/on-pr-merged.ts`)
   - Handles phase transitions when PRs merge
   - Increments phase counter or marks as Done
   - Updates artifact comments

5. **Telegram Webhook** (`src/pages/api/telegram-webhook.ts`)
   - Handles merge actions via callback buttons
   - Primary merge handler (GitHub Action is disabled)

6. **Multi-Phase System** (`src/agents/lib/phases.ts`, `src/agents/lib/artifacts.ts`)
   - Tracks phase progress via `Implementation Phase` field in GitHub Projects
   - Stores phase info in artifact comments on issues
   - Format: `Phase X/Y: Name`

7. **Notifications** (`src/agents/shared/notifications.ts`)
   - `notifyPRReady()`, `notifyPRReadyToMerge()`, `notifyPhaseComplete()`
   - Sends Telegram messages with action buttons

8. **Vercel Deployments** (`.github/workflows/deploy-notify.yml`)
   - Preview deployments for PRs already exist
   - Production deployments on merge to main

## Approach

The feature branch workflow introduces a new branch hierarchy where ALL work (design + implementation) targets the feature branch:

```
main <─────────────────────── Final PR: "Task #42: Add feature X"
                                      │
                              feature/task-42
                                      ▲
        ┌──────────────┬──────────────┼──────────────┬──────────────┐
        │              │              │              │              │
  Product Design   Tech Design    Phase 1 PR    Phase 2 PR    Phase 3 PR
  PR (merged)      PR (merged)    (merged)      (merged)      (merged)
```

### Key Changes Required

1. **Create feature branch per task** at workflow start (when product design begins)
2. **Design PRs target feature branch** - full PR review experience with line comments
3. **Phase PRs target feature branch** instead of main
4. **After all phases complete**, create a single PR from feature branch to main
5. **Admin verifies via Vercel preview** before merging final PR
6. **Include preview URL in notifications** for final PR

### Architectural Decisions

1. **When to create feature branch**: At the START of the workflow (product design phase)
2. **Design docs**: PRs to feature branch (not main) - full review experience with line comments
3. **Branch naming**: `feature/task-{issueId}` for the task branch, sub-branches for each PR
4. **Where to track task branch**: Store in artifact comment on the issue
5. **All PRs merge to feature branch**: Design PRs + Phase PRs all target feature branch
6. **Final PR creation**: After last phase merges to feature branch, create PR to main
7. **Preview URL**: Get from Vercel API or include in final PR notification

### Design Docs Flow (New)

**Before (current):**
- Product Design Agent → Creates PR to main → Admin reviews → Merged to main
- Tech Design Agent → Creates PR to main → Admin reviews → Merged to main

**After (new):**
- Feature branch `feature/task-{issueId}` created at workflow start
- Product Design Agent → Creates PR to feature branch → Admin reviews with line comments → Merged to feature branch
- Tech Design Agent → Creates PR to feature branch → Admin reviews with line comments → Merged to feature branch
- Implementation phases → PRs to feature branch → PR Review Agent reviews → Merged to feature branch
- Final PR from feature branch to main

**Benefits:**
- Full PR review experience for designs (line comments, Request Changes)
- If task is abandoned, no orphaned design docs in main
- Everything for a task stays in one branch
- Single final PR includes design + code
- True isolation between concurrent workflows
- Admin can request changes on design with detailed feedback

## Sub-tasks

### Sub-task 1: Add Task Branch Tracking Infrastructure
- [ ] Add `Task Branch` field to GitHub Projects (or use artifact comment)
- [ ] Add `getTaskBranch()` and `setTaskBranch()` methods to adapter
- [ ] Update `ArtifactComment` type to include `taskBranch` field

### Sub-task 2: Create Feature Branch at Workflow Start
- [ ] Create `feature/task-{issueId}` branch when workflow enters Product Design
- [ ] Store task branch name in artifact comment
- [ ] Update workflow runner to create branch before invoking design agents

### Sub-task 3: Modify Design Agents - PR to Feature Branch
- [ ] Update Product Design Agent to create PR targeting feature branch (not main)
- [ ] Update Tech Design Agent to create PR targeting feature branch (not main)
- [ ] Create design branch off feature branch: `feature/task-{id}-product-design`
- [ ] Update PR base branch from `defaultBranch` to task branch

### Sub-task 4: Update Design Review Flow
- [ ] Design PRs target feature branch - full PR review experience preserved
- [ ] Admin can use line comments and Request Changes as before
- [ ] Merge design PRs to feature branch (not main)
- [ ] Update Telegram webhook to handle design PR merge to feature branch

### Sub-task 5: Modify Implementation Agent - Branch Creation
- [ ] Reuse existing task feature branch (don't create new one)
- [ ] Update `generateBranchName()` to create phase-specific branches off task branch
- [ ] Checkout task branch before creating phase branch

### Sub-task 6: Modify Implementation Agent - PR Creation
- [ ] Change PR base branch from `defaultBranch` to task branch
- [ ] Update PR body to indicate it targets feature branch
- [ ] Update `createPullRequest()` call with correct base branch

### Sub-task 7: Modify PR Review Agent
- [ ] Review phase PRs (targeting feature branch)
- [ ] No changes needed for review logic (still reviews code changes)
- [ ] Possibly skip certain checks that apply to main-targeted PRs

### Sub-task 8: Update Merge Handler (Telegram Webhook)
- [ ] Detect PR type: design PR, phase PR, or final PR
- [ ] For design PRs: merge to feature branch, advance to next design phase or implementation
- [ ] For phase PRs: merge to feature branch, trigger next phase or final PR creation
- [ ] For final PRs: merge to main, mark as Done, delete feature branch

### Sub-task 9: Create Final PR Logic
- [ ] Detect when last phase merges to feature branch
- [ ] Automatically create PR from feature branch to main
- [ ] Include all phase information in final PR description
- [ ] Include design doc summaries in final PR body
- [ ] Request review from admin

### Sub-task 10: Add Vercel Preview URL to Notifications
- [ ] Get preview deployment URL for feature branch PRs
- [ ] Include preview URL in final PR notification
- [ ] Add "Open Preview" button to Telegram notification

### Sub-task 11: Update On-PR-Merged Script
- [ ] Handle phase merges to feature branch differently
- [ ] Handle final PR merge to main
- [ ] Update phase tracking logic

### Sub-task 12: Update Notifications
- [ ] Add `notifyFinalPRReady()` for when final PR to main is created
- [ ] Include preview URL in notification
- [ ] Add verification step for admin

### Sub-task 13: Update Documentation
- [ ] Update multi-phase-features.md with new flow
- [ ] Document feature branch workflow
- [ ] Update troubleshooting guides

## Files to Modify

### Core Agent Files
- `src/agents/core-agents/implementAgent/index.ts` - PR targeting to feature branch
- `src/agents/core-agents/prReviewAgent/index.ts` - Minor updates for phase PR context
- `src/agents/core-agents/productDesignAgent/index.ts` - PR to feature branch instead of main
- `src/agents/core-agents/techDesignAgent/index.ts` - PR to feature branch instead of main

### Infrastructure Files
- `src/server/project-management/adapters/github.ts` - Add task branch tracking methods
- `src/server/project-management/types.ts` - Add task branch to types
- `src/server/project-management/config.ts` - Add task branch field constant

### Merge/Webhook Handling
- `src/pages/api/telegram-webhook.ts` - Handle phase vs final PR merge
- `scripts/template/on-pr-merged.ts` - Update merge logic (if re-enabled)

### Artifact/Phase Tracking
- `src/agents/lib/artifacts.ts` - Add task branch to artifact comment
- `src/agents/lib/phases.ts` - May need updates for phase-to-feature-branch flow

### Notifications
- `src/agents/shared/notifications.ts` - Add final PR notification with preview URL

### Documentation
- `docs/template/github-agents-workflow/multi-phase-features.md`

## New Files (if any)

- `src/agents/lib/feature-branch.ts` - Utilities for feature branch management (optional, could be in artifacts.ts)

## Testing Strategy

1. **Unit Testing**
   - Test branch name generation with new hierarchy
   - Test artifact comment parsing/formatting with task branch
   - Test PR base branch determination logic

2. **Integration Testing**
   - Dry run with `--dry-run` flag to verify branch/PR logic
   - Test with single-phase feature (should still work)
   - Test with multi-phase feature (full flow)

3. **Manual Verification**
   - Run workflow on test issue
   - Verify phase PRs target feature branch
   - Verify final PR targets main
   - Verify preview deployment URL is included
   - Verify merge flow works correctly

## Risks and Mitigations

### Risk 1: Breaking Existing Single-Phase Workflow
**Mitigation**: Feature branch workflow should apply to all workflows, but single-phase features become `task-{id}` branch with single phase PR, then final PR to main. Test thoroughly with single-phase features.

### Risk 2: Preview Deployment Availability
**Mitigation**: Vercel already creates preview deployments for PRs. The preview URL may need to be fetched from GitHub deployment API or Vercel API. Fallback to GitHub PR link if preview not available.

### Risk 3: Concurrent Workflow Conflicts
**Mitigation**: Feature branches isolate work. Each task has its own branch space. No conflicts between concurrent workflows.

### Risk 4: Complexity in Feedback Mode
**Mitigation**: Feedback mode pushes to the same phase branch, which is still a child of the task branch. The PR still targets the task branch. Should work without major changes.

### Risk 5: Branch Cleanup
**Mitigation**: Delete phase branches after merge to task branch. Delete task branch after final PR merges to main. Use existing `deleteBranch()` method.

## Notes

### Trade-offs
- **More PRs**: Each task now has D+N+1 PRs (D design PRs + N phase PRs + 1 final PR)
  - Example: 2 design PRs + 3 phase PRs + 1 final = 6 PRs per task
- **More branches**: Each task has a feature branch plus sub-branches for each PR
- **Better isolation**: Worth the complexity for concurrent workflow support
- **Full review experience**: Line comments and Request Changes for all stages (design + code)
- **Preview before merge**: Admin can verify complete feature before merging to main

### Backward Compatibility
- Existing issues in progress may need special handling
- Consider adding migration logic or documenting manual steps for in-flight issues

### Vercel Preview Considerations
- Vercel creates previews for all PRs by default
- Preview URL format: `{project}-{hash}-{team}.vercel.app` or custom preview URL pattern
- May need to wait for deployment before including URL in notification

### Critical Files for Implementation

The 5 most critical files for implementing this plan:

1. `src/agents/core-agents/implementAgent/index.ts` - Core logic for branch creation and PR targeting (most changes)
2. `src/pages/api/telegram-webhook.ts` - Merge handling for phase PRs vs final PRs (critical flow change)
3. `src/server/project-management/adapters/github.ts` - Add task branch methods (infrastructure)
4. `src/agents/lib/artifacts.ts` - Track task branch in artifact comment (state management)
5. `src/agents/shared/notifications.ts` - Final PR notifications with preview URL (user-facing)
