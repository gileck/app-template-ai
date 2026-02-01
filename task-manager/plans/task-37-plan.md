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

The feature branch workflow introduces a new branch hierarchy:

```
main <---------------- Final PR: "Task #42: Add feature X"
                              ^
                              |
                      feature/task-42
                              ^
          +---------+---------+---------+
          |         |         |
     Phase 1 PR  Phase 2 PR  Phase 3 PR
     (merged)    (merged)    (open)
```

### Key Changes Required

1. **Create feature branch per task** at workflow start (when implementation begins)
2. **Phase PRs target feature branch** instead of main
3. **After all phases complete**, create a single PR from feature branch to main
4. **Admin verifies via Vercel preview** before merging final PR
5. **Include preview URL in notifications** for final PR

### Architectural Decisions

1. **When to create feature branch**: At the start of implementation (first phase), not earlier
2. **Branch naming**: `feature/task-{issueId}` for the task branch, `feature/task-{issueId}-phase-{N}` for phase branches
3. **Where to track task branch**: Add new field to GitHub Projects or store in artifact comment
4. **Phase merge handling**: Merge to feature branch (not main) - this is the key change
5. **Final PR creation**: After last phase merges to feature branch, automatically create PR to main
6. **Preview URL**: Get from Vercel API or include in final PR notification

## Sub-tasks

### Sub-task 1: Add Task Branch Tracking Infrastructure
- [ ] Add `Task Branch` field to GitHub Projects (or use artifact comment)
- [ ] Add `getTaskBranch()` and `setTaskBranch()` methods to adapter
- [ ] Update `ArtifactComment` type to include `taskBranch` field

### Sub-task 2: Modify Implementation Agent - Branch Creation
- [ ] Create task feature branch when first phase starts
- [ ] Store task branch name in tracking system
- [ ] Update `generateBranchName()` to create phase-specific branches off task branch
- [ ] Checkout task branch before creating phase branch

### Sub-task 3: Modify Implementation Agent - PR Creation
- [ ] Change PR base branch from `defaultBranch` to task branch
- [ ] Update PR body to indicate it targets feature branch
- [ ] Update `createPullRequest()` call with correct base branch

### Sub-task 4: Modify PR Review Agent
- [ ] Review phase PRs (targeting feature branch)
- [ ] No changes needed for review logic (still reviews code changes)
- [ ] Possibly skip certain checks that apply to main-targeted PRs

### Sub-task 5: Update Merge Handler (Telegram Webhook)
- [ ] Detect if merging phase PR (to feature branch) vs final PR (to main)
- [ ] For phase PRs: merge to feature branch, trigger next phase or final PR
- [ ] For final PRs: merge to main, mark as Done, delete feature branch

### Sub-task 6: Create Final PR Logic
- [ ] Detect when last phase merges to feature branch
- [ ] Automatically create PR from feature branch to main
- [ ] Include all phase information in final PR description
- [ ] Request review from admin

### Sub-task 7: Add Vercel Preview URL to Notifications
- [ ] Get preview deployment URL for feature branch PRs
- [ ] Include preview URL in final PR notification
- [ ] Add "Open Preview" button to Telegram notification

### Sub-task 8: Update On-PR-Merged Script
- [ ] Handle phase merges to feature branch differently
- [ ] Handle final PR merge to main
- [ ] Update phase tracking logic

### Sub-task 9: Update Notifications
- [ ] Add `notifyFinalPRReady()` for when final PR to main is created
- [ ] Include preview URL in notification
- [ ] Add verification step for admin

### Sub-task 10: Update Documentation
- [ ] Update multi-phase-features.md with new flow
- [ ] Document feature branch workflow
- [ ] Update troubleshooting guides

## Files to Modify

### Core Agent Files
- `src/agents/core-agents/implementAgent/index.ts` - Branch creation, PR targeting
- `src/agents/core-agents/prReviewAgent/index.ts` - Minor updates for phase PR context

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
- **More PRs**: Each task now has N+1 PRs (N phase PRs + 1 final PR) instead of N PRs
- **More branches**: Each task has a feature branch plus phase branches
- **Better isolation**: Worth the complexity for concurrent workflow support
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
