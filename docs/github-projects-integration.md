# GitHub Projects Integration

This document describes the GitHub Projects integration that automates the feature request workflow from initial submission to merged PRs.

## Overview

The integration creates a complete pipeline using a simplified 5-column workflow:

1. **User submits** feature request via app UI → stored in MongoDB
2. **Admin gets Telegram notification** with one-click approval link
3. **Admin approves** (via Telegram link or app UI) → server creates GitHub Issue + adds to Project "Backlog"
4. **Admin moves to Product Design** → AI agent generates design → sets Review Status = "Waiting for Review"
5. **Admin approves** → auto-advances to Technical Design → AI generates tech design
6. **Admin approves** → auto-advances to Implementation → AI implements and creates PR
7. **Admin merges PR** → moves to Done

**Key concepts:**
- **5 board columns**: Backlog → Product Design → Technical Design → Implementation → Done
- **Review Status field** tracks sub-states within each phase (empty → Waiting for Review → Approved/Request Changes)
- **Auto-advance on approval**: When you set Review Status = "Approved", the item automatically moves to the next phase

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│  App UI         │      │  MongoDB         │      │  GitHub Projects    │
│  (User/Admin)   │ ───► │  (Submissions)   │      │  (Design + Dev)     │
└─────────────────┘      └──────────────────┘      └─────────────────────┘
        │                        │                          ▲
        │                        │                          │
        ▼                        ▼                          │
┌─────────────────┐      ┌──────────────────┐              │
│  Telegram       │      │  Server Backend  │──────────────┘
│  (Approval Link)│ ───► │  (Creates Issue) │  On approval
└─────────────────┘      └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Project Management Abstraction (src/server/project-management/)       │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ ProjectManagementAdapter interface (adapter pattern)               ││
│  │ └── adapters/github.ts  # GitHub implementation                   ││
│  │ ├── types.ts            # Domain types                            ││
│  │ ├── config.ts           # Status constants, project config        ││
│  │ └── index.ts            # Singleton factory + exports             ││
│  └────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  CLI Agent Scripts (src/agents/)                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ product-design   │  │ tech-design      │  │ implement            │  │
│  │ .ts              │  │ .ts              │  │ .ts                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ shared/                                                           │  │
│  │ ├── config.ts         # Agent-specific config + re-exports       │  │
│  │ ├── claude.ts         # Claude SDK utilities                     │  │
│  │ ├── notifications.ts  # Telegram notifications                   │  │
│  │ ├── prompts.ts        # Prompt templates                         │  │
│  │ └── types.ts          # Agent-specific types                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## GitHub Project Setup

### Step 1: Create the GitHub Project

1. Go to `https://github.com/users/{your-username}/projects`
2. Click "New project"
3. Select "Board" view
4. Name it appropriately (e.g., "Feature Pipeline")

### Step 2: Configure Status Column

The project uses a simplified 5-column workflow. Create a Status field with these exact values:

| Status | Description |
|--------|-------------|
| `Backlog` | New items, not yet started |
| `Product Design` | AI generates product design, human reviews |
| `Technical Design` | AI generates tech design, human reviews |
| `Implementation` | AI implements and creates PR, human reviews/merges |
| `Done` | Completed and merged |

**How it works**: Each phase uses the Review Status field to track sub-states within that phase (see below).

### Step 3: Create Review Status Custom Field

1. In your project, click the "+" button to add a field
2. Select "Single select"
3. Name it exactly: `Review Status`
4. Add these options:
   - `Waiting for Review`
   - `Approved`
   - `Request Changes`
   - `Rejected`

**Review Status meanings within each phase:**

| Review Status | Meaning |
|---------------|---------|
| *(empty)* | Ready for AI agent to process |
| `Waiting for Review` | AI finished, human needs to review |
| `Approved` | Human approved, ready to advance to next phase (auto-advances) |
| `Request Changes` | Human wants revisions, AI will address feedback |
| `Rejected` | Won't proceed with this item |

This allows each phase to have its own lifecycle (AI work → Human review → Approved/Rejected) without needing separate board columns.

## Environment Setup

### Required Environment Variables

Add these to your `.env` file:

```bash
# GitHub token with 'repo' and 'project' scopes
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# Telegram bot token for notifications (optional but recommended)
TELEGRAM_BOT_TOKEN=xxxxxxxxxxxxx
```

### Getting a GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)" or "Fine-grained token"
3. Required scopes:
   - `repo` - Full control of private repositories
   - `project` - Full control of projects
4. Copy the token to your `.env` file

### Telegram Setup

1. See [docs/telegram-notifications.md](./telegram-notifications.md) for bot setup
2. Set `ownerTelegramChatId` in `src/app.config.js` for admin notifications

## Configuration

Project configuration is controlled via environment variables:

```bash
# Required
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# Optional (defaults shown)
GITHUB_OWNER=gileck
GITHUB_REPO=app-template-ai
GITHUB_PROJECT_NUMBER=3
GITHUB_OWNER_TYPE=user  # 'user' or 'org'
```

Agent-specific configuration (Claude model, timeout) is in `src/agents/shared/config.ts`:

```typescript
export const agentConfig: AgentConfig = {
    telegram: {
        enabled: true,
    },
    claude: {
        model: 'sonnet',
        maxTurns: 100,
        timeoutSeconds: 600,
    },
};
```

**Note:** The status values in `STATUSES` and `REVIEW_STATUSES` are constants defined in `src/server/project-management/config.ts` and should NOT be modified.

### Project Management Adapter

The GitHub API logic uses an adapter pattern for flexibility. Both the server (app UI) and CLI agents share the same adapter:

**File:** `src/server/project-management/`

```typescript
import { getProjectManagementAdapter, STATUSES, REVIEW_STATUSES } from '@/server/project-management';

// Initialize and use the adapter
const adapter = getProjectManagementAdapter();
await adapter.init();

// Get available statuses
const statuses = await adapter.getAvailableStatuses();
const reviewStatuses = await adapter.getAvailableReviewStatuses();

// Update project item status
await adapter.updateItemStatus(itemId, STATUSES.productDesign);
await adapter.updateItemReviewStatus(itemId, REVIEW_STATUSES.waitingForReview);

// Fetch project item details
const item = await adapter.getItem(itemId);
```

The adapter uses a singleton pattern and caches project metadata (field IDs, status options) after initialization to minimize API calls.

**Key interface methods:**
| Method | Description |
|--------|-------------|
| `init()` | Initialize the adapter (authenticate, fetch metadata) |
| `getAvailableStatuses()` | Returns available main statuses |
| `getAvailableReviewStatuses()` | Returns available review statuses |
| `listItems(options)` | List project items with optional filters |
| `getItem(itemId)` | Fetch item with status and review status |
| `updateItemStatus()` | Update main status |
| `updateItemReviewStatus()` | Update review status |
| `createIssue()` | Create a new issue |
| `addIssueToProject()` | Add an issue to the project |
| `createPullRequest()` | Create a PR |

## Feature Request Approval Flow

When a user submits a feature request, the system provides two ways for admins to approve it:

### Option 1: Telegram Quick-Approve (Recommended)

When a feature request is submitted:
1. Admin receives a Telegram notification with the request details
2. The notification includes a secure one-click "Approve" link
3. Clicking the link approves the request and creates the GitHub issue
4. A success page confirms the action with a link to the GitHub issue

**Telegram Notification Example:**
```
📝 New Feature Request!

📋 Add dark mode toggle

Users have requested a dark mode option for the app to reduce eye strain...

📍 Page: Settings

✅ Approve & Create GitHub Issue
```

The approval link contains a secure token that:
- Is unique to each feature request
- Can only be used once
- Expires after approval (token is cleared)

### Option 2: App UI Approval

1. Go to the Feature Requests page in the admin panel
2. Find requests with status "new" or "in_review"
3. Click the **Approve** button on the card
4. The request is approved and a GitHub issue is created

Both methods:
- Update the feature request status to `product_design`
- Create a GitHub issue with the request details
- Add the issue to the GitHub Project with "Backlog" status
- Send a Telegram notification confirming the sync

## GitHub Notifications (Telegram)

The repository includes GitHub Actions workflows that send Telegram notifications for:

- **Issues**: Created, closed, reopened, labeled, assigned
- **Comments**: New comments on issues
- **Project Status**: Items added, status changed, removed
- **Pull Requests**: Opened, merged, closed, review requested
- **PR Reviews**: Approved, changes requested, comments

### Setup

**Option 1: Automatic (Recommended)**

Run the setup script to configure all secrets and variables at once:

```bash
yarn setup-github-secrets
```

This requires:
- GitHub CLI (`gh`) installed and authenticated (`gh auth login`)
- `.env` file with `TELEGRAM_BOT_TOKEN` and `LOCAL_TELEGRAM_CHAT_ID`

**Option 2: Manual**

1. **Add Repository Secrets** (Settings → Secrets and variables → Actions):
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
   - `TELEGRAM_CHAT_ID`: Your Telegram chat ID (get via `yarn telegram-setup`)

2. **Add Repository Variable** (Settings → Secrets and variables → Actions → Variables):
   - `TELEGRAM_NOTIFICATIONS_ENABLED`: Set to `true` to enable notifications

**Additional Setup (for project status notifications):**

3. **Enable Projects V2 Permissions**:
   - Go to Settings → Actions → General
   - Under "Workflow permissions", select "Read and write permissions"

### Workflow Files

| File | Events |
|------|--------|
| `.github/workflows/issue-notifications.yml` | Issues, comments |
| `.github/workflows/pr-notifications.yml` | Pull requests, reviews |
| `.github/workflows/deploy-notify.yml` | Deployment notifications |
| `.github/workflows/pr-checks.yml` | PR checks |

> **Note:** Project-level webhooks (`projects_v2_item` events) don't work for user-owned projects due to GitHub limitations. The auto-advance functionality is handled by `yarn github-workflows-agent --auto-advance` instead.

### Notification Examples

**Issue Created:**
```
🆕 New Issue #123

Add dark mode toggle

👤 by username
🔗 https://github.com/...
```

**Status Changed:**
```
📊 Status Changed

#123: Add dark mode toggle

➡️ Product Design
👤 by admin
🔗 https://github.com/...
```

**PR Merged:**
```
🎉 PR #456 Merged

feat: Add dark mode toggle

👤 by admin
🔗 https://github.com/...
```

### Disabling Notifications

Set the `TELEGRAM_NOTIFICATIONS_ENABLED` variable to `false` or delete it to disable all notifications.

### Auto-Advance on Approval

The `--auto-advance` flag (or `yarn github-workflows-agent --auto-advance`) automatically advances items to the next phase when Review Status = "Approved".

**Transitions:**
| Current Status | On Approval → | Next Status |
|----------------|---------------|-------------|
| Product Design | → | Technical Design |
| Technical Design | → | Implementation |
| Implementation | (no auto-advance) | Manual PR merge required → Done |

**Example workflow:**
1. AI agent generates Product Design, sets Review Status = "Waiting for Review"
2. You receive Telegram notification with Approve/Request Changes buttons
3. You tap "Approve" (or set Review Status = "Approved" in GitHub)
4. Run `yarn github-workflows-agent --auto-advance` (or `--all`)
5. Item moves to "Technical Design" and Review Status is cleared
6. AI agent can now pick it up for Technical Design generation

**Usage:**
```bash
# Run auto-advance only
yarn github-workflows-agent --auto-advance

# Run as part of full workflow (auto-advance runs first)
yarn github-workflows-agent --all
```

> **Note:** GitHub Actions webhooks for project events (`projects_v2_item`) don't work for user-owned projects due to GitHub limitations. That's why auto-advance is handled via CLI instead of GitHub Actions.

## Viewing GitHub Status in the App

The app UI displays live GitHub Project status for feature requests that have been synced to GitHub.

### What's Displayed

When you expand a feature request card in the admin panel, you'll see:
- **GitHub Issue Link**: Click to view the issue on GitHub
- **GitHub PR Link**: Click to view the PR (when created)
- **Project Status**: The current status in GitHub Projects (e.g., "Product Design")
- **Review Status**: The current review status (e.g., "Waiting for Review")

### How It Works

The status is fetched **directly from GitHub API** in real-time:
1. When you expand a feature request card, it fetches the current status from GitHub
2. Status refreshes automatically when the window regains focus
3. Data is considered stale after 30 seconds

This approach ensures you always see the **actual current status** from GitHub, not a cached copy in the database.

### Updating GitHub Status from the App

Admins can change the GitHub Project status directly from the Feature Requests UI without leaving the app:

1. Open the Feature Requests page in the admin panel
2. Find a request that's linked to GitHub (has an issue link)
3. Click the **three-dot menu** (⋮) on the card
4. Select **GitHub Status** submenu
5. Choose the new status from the list

The status updates immediately in GitHub Projects, and the card refreshes to show the new status.

**Available statuses:**
- Backlog
- Product Design
- Technical Design
- Implementation
- Done

**Note:** The "GitHub Status" menu option only appears for requests that have been synced to GitHub (i.e., have a `githubProjectItemId`).

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `feature-requests/github-status` | Fetch current status for a request |
| `feature-requests/github-statuses` | Get all available status options |
| `admin/feature-requests/update-github-status` | Update status (admin only) |

All endpoints require authentication. The update endpoint is admin-only.

## Workflow Guide

### Complete Workflow

```
Feature Request Submitted
         │
         ▼
    ┌─────────┐
    │ MongoDB │  (status: 'new')
    └────┬────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
    ┌────────────────────┐      ┌────────────────────────┐
    │ Telegram           │      │ Admin Panel            │
    │ Notification       │      │ "Approve" Button       │
    │ + Approval Link    │      │                        │
    └─────────┬──────────┘      └───────────┬────────────┘
              │                             │
              └──────────┬──────────────────┘
                         │
                         ▼ (Admin approves - creates GitHub issue)
    ┌─────────────────────┐
    │ GitHub Issue        │
    │ Status: Backlog     │
    │ MongoDB: 'product_design'
    └─────────┬───────────┘
              │
              ▼ (Admin moves to Product Design)
    ┌─────────────────────────────────────┐
    │ Status: Product Design              │
    │ Review Status: (empty)              │
    └─────────────────┬───────────────────┘
                      │
                      ▼ yarn agent:product-design
    ┌─────────────────────────────────────┐
    │ Status: Product Design              │
    │ Review Status: Waiting for Review   │
    │ (Issue body updated with design)    │
    └─────────────────┬───────────────────┘
                      │
              ┌───────┴───────┐
              ▼               ▼
         Approved        Request Changes
              │               │
              │               ▼ yarn agent:product-design
              │           (Revises design)
              │               │
              └───────┬───────┘
                      │
                      ▼ (Auto-advances to Technical Design)
    ┌─────────────────────────────────────┐
    │ Status: Technical Design            │
    │ Review Status: (empty)              │
    └─────────────────┬───────────────────┘
                      │
                      ▼ yarn agent:tech-design
    ┌─────────────────────────────────────┐
    │ Status: Technical Design            │
    │ Review Status: Waiting for Review   │
    │ (Issue body updated with design)    │
    └─────────────────┬───────────────────┘
                      │
              ┌───────┴───────┐
              ▼               ▼
         Approved        Request Changes
              │               │
              │               ▼ yarn agent:tech-design
              │           (Revises design)
              │               │
              └───────┬───────┘
                      │
                      ▼ (Auto-advances to Implementation)
    ┌─────────────────────────────────────┐
    │ Status: Implementation              │
    │ Review Status: (empty)              │
    └─────────────────┬───────────────────┘
                      │
                      ▼ yarn agent:implement
    ┌─────────────────────────────────────┐
    │ Status: Implementation              │
    │ Review Status: Waiting for Review   │
    │ (PR created, branch pushed)         │
    └─────────────────┬───────────────────┘
                      │
              ┌───────┴───────┐
              ▼               ▼
         Approved        Request Changes
         (Merge PR)           │
              │               ▼ yarn agent:implement
              │           (Addresses feedback)
              │               │
              └───────┬───────┘
                      │
                      ▼ (Admin merges PR, moves to Done)
    ┌─────────────────────────────────────┐
    │ Status: Done                        │
    │ (PR merged)                         │
    └─────────────────────────────────────┘
```

### Admin Actions

Admins can change status either from GitHub Projects directly or from the app UI (via the three-dot menu > "GitHub Status").

| Phase | Admin Action | Effect |
|-------|--------------|--------|
| Backlog | Move to "Product Design" | Standard flow - enables product design agent |
| Backlog | Move to "Technical Design" | Skip product design (internal/technical work) |
| Backlog | Move to "Implementation" | Skip both designs (simple fixes) |
| Product Design | Set Review Status = "Approved" | Auto-advances to Technical Design |
| Product Design | Set Review Status = "Request Changes" + comment | Agent revises design |
| Technical Design | Set Review Status = "Approved" | Auto-advances to Implementation |
| Technical Design | Set Review Status = "Request Changes" + comment | Agent revises design |
| Implementation | (agent creates PR automatically) | |
| Implementation | Set Review Status = "Approved" + merge PR | Move to Done |
| Implementation | Set Review Status = "Request Changes" + review comments | Agent addresses feedback |

### Alternative Workflows (Non-Product Features)

Not all work requires a product design phase. For internal implementations, architecture changes, refactoring, or bug fixes, you can skip phases:

**Skip Product Design (Backlog → Technical Design → Implementation):**
- Architecture changes
- Internal refactoring
- Performance improvements
- Technical debt cleanup
- Infrastructure work

**Skip Both Designs (Backlog → Implementation):**
- Simple bug fixes
- Config changes
- Dependency updates
- Very small changes with clear implementation

**How to skip phases:**
Simply move the issue directly to the appropriate column in GitHub Projects:

```
# Skip Product Design
Backlog → Technical Design    (admin moves manually)
         ↓
         yarn github-workflows-agent --tech-design
         ↓
Technical Design → Implementation (via auto-advance on approval)
         ↓
         yarn github-workflows-agent --implement

# Skip Both Designs
Backlog → Implementation      (admin moves manually)
         ↓
         yarn github-workflows-agent --implement
```

The agents only process items in their specific status column, so skipping phases works automatically.

**Tip:** Add a label like `internal` or `no-product-design` to make it clear why product design was skipped.

## Running the Agents

### Master Command (Recommended)

Use `yarn github-workflows-agent` as the single entry point for all agent workflows:

```bash
# Run specific agents
yarn github-workflows-agent --product-design     # Generate product designs
yarn github-workflows-agent --tech-design        # Generate technical designs
yarn github-workflows-agent --implement          # Implement and create PRs
yarn github-workflows-agent --auto-advance       # Auto-advance approved items

# Run all agents in sequence
yarn github-workflows-agent --all                # Runs: auto-advance → product-design → tech-design → implement

# With options
yarn github-workflows-agent --all --dry-run      # Preview all without changes
yarn github-workflows-agent --product-design --id <item-id> --stream
```

The master command delegates to individual scripts and passes through all options.

### Individual Agent Commands

You can also run agents directly if needed:

```bash
yarn agent:product-design                    # Process all pending
yarn agent:tech-design --id <item-id>        # Specific item
yarn agent:implement --dry-run               # Preview
yarn agent:auto-advance                      # Advance approved items
```

> **Note:** GitHub issues are created automatically when you approve a feature request via the app UI or Telegram link. No CLI command is needed for this step.

### Common Options

| Option | Description |
|--------|-------------|
| `--id <id>` | Process a specific item by ID |
| `--limit <n>` | Limit number of items to process |
| `--timeout <s>` | Timeout per item in seconds |
| `--dry-run` | Preview without making changes |
| `--stream` | Stream Claude's output in real-time |
| `--verbose` | Show additional debug output |

### Running Agents Manually vs Automation

**Manual (recommended for getting started):**
```bash
# Run all agents with one command
yarn github-workflows-agent --all

# Or run specific phases
yarn github-workflows-agent --product-design
yarn github-workflows-agent --tech-design
yarn github-workflows-agent --implement
```

**Automated (via cron or CI):**
```bash
# Run all agents that have pending work
yarn github-workflows-agent --all
```

## Handling Feedback Loops

### How "Request Changes" Works

1. Admin reviews the design/PR
2. Admin adds comments on the issue explaining what needs to change
3. Admin sets Review Status = "Request Changes"
4. Next time the agent runs, it:
   - Reads the feedback comments
   - Generates a revised version addressing the feedback
   - Updates the issue/PR
   - Sets Review Status back to "Waiting for Review"
5. Admin receives notification that revisions are ready

### Writing Effective Review Comments

Good comments are:
- **Specific**: "The database schema should include a `createdAt` field"
- **Actionable**: "Add error handling for the case when user is not found"
- **Clear**: Avoid ambiguous requests

The agent will attempt to address ALL comments in the issue.

## Telegram Notifications

Notifications are sent at each step:

**New Feature Request (with approval link):**
```
📝 New Feature Request!

📋 Add dark mode toggle

Users have requested a dark mode option for the app...

📍 Page: Settings

✅ Approve & Create GitHub Issue  ← clickable link
```

**Feature Request Approved & Synced:**
```
✅ Feature request synced to GitHub!

📋 Add dark mode toggle
🔗 Issue #123
📊 Status: Backlog

Waiting for product design generation.
```

**Design Ready for Review:**
```
📝 Product Design Ready for Review!

📋 Add dark mode toggle
🔗 Issue #123
📊 Status: Product Design (Waiting for Review)

Review and approve to proceed to Technical Design.
```

**PR Ready:**
```
🚀 Implementation Complete - PR Ready!

📋 Add dark mode toggle
🔗 Issue #123
🔀 PR #456
📊 Status: Implementation (Waiting for Review)

Review and merge to complete.

[✅ Approve] [📝 Request Changes] [❌ Reject]  ← inline buttons
```

### Telegram Quick Actions

All "Waiting for Review" notifications include inline keyboard buttons:
- **✅ Approve** - Sets Review Status to "Approved"
- **📝 Request Changes** - Sets Review Status to "Request Changes"
- **❌ Reject** - Sets Review Status to "Rejected"

When you tap a button, it updates GitHub Project status immediately via webhook.

**Setup:**
1. Deploy your app (the webhook endpoint needs to be publicly accessible)
2. Register the webhook URL with Telegram:
   ```bash
   yarn telegram-webhook set https://your-app.vercel.app/api/telegram-webhook
   ```
3. Verify it's set:
   ```bash
   yarn telegram-webhook info
   ```

**How it works:**
1. Agent sends notification with inline buttons
2. You tap a button in Telegram
3. Telegram calls your `/api/telegram-webhook` endpoint
4. Webhook updates GitHub Project via the adapter
5. Message is edited to show the action taken

## Troubleshooting

### Common Issues

**"GITHUB_TOKEN environment variable is required"**
- Ensure `GITHUB_TOKEN` is set in your `.env` file
- Verify the token has correct scopes (`repo`, `project`)

**"Project not found"**
- Check `config.github.projectNumber` matches the project number in the URL
- Verify `config.github.ownerType` is correct ('user' vs 'org')

**"Status field not found in project"**
- Ensure your GitHub Project has a Status field
- Verify all required status values exist (see Setup section)

**"Review Status field not found"**
- Create the custom "Review Status" field in your project
- The field name must be exactly "Review Status"

**Agent timeout**
- Increase timeout: `--timeout 900` (15 minutes)
- For complex implementations, consider breaking into smaller features

**Git conflicts during implementation**
- Ensure working directory is clean before running implement agent
- The agent creates fresh branches from the default branch

### API Rate Limits

GitHub API has rate limits:
- 5,000 requests/hour for authenticated requests
- GraphQL: 5,000 points/hour

The agents are designed to minimize API calls. If you hit limits:
- Wait for the rate limit to reset
- Use `--limit` to process fewer items at once

## Child Project Setup (Quick Start)

For projects based on this template:

1. **Set environment variables** in `.env`:
   ```bash
   GITHUB_TOKEN=your_token
   GITHUB_OWNER=your-username
   GITHUB_REPO=your-repo
   GITHUB_PROJECT_NUMBER=1
   GITHUB_OWNER_TYPE=user
   TELEGRAM_BOT_TOKEN=your_bot_token  # optional
   ```

2. **Create GitHub Project** with required statuses (see Setup section)

3. **Run agents** as normal - everything uses environment variables automatically

## File Structure

```
src/
├── agents/                          # CLI agent scripts
│   ├── index.ts                     # Master CLI (yarn github-workflows-agent)
│   ├── product-design.ts            # Generate product design
│   ├── tech-design.ts               # Generate technical design
│   ├── implement.ts                 # Implement + create PR
│   ├── auto-advance.ts              # Auto-advance approved items
│   └── shared/
│       ├── config.ts                # Agent-specific config + re-exports
│       ├── claude.ts                # Claude SDK runner
│       ├── notifications.ts         # Telegram notifications
│       ├── prompts.ts               # Prompt templates
│       ├── types.ts                 # Agent-specific types
│       └── index.ts                 # Barrel exports
├── server/
│   ├── project-management/          # Project management abstraction layer
│   │   ├── adapters/
│   │   │   └── github.ts            # GitHub Projects V2 adapter
│   │   ├── types.ts                 # Adapter interface + domain types
│   │   ├── config.ts                # Status constants, project config
│   │   └── index.ts                 # Singleton factory + exports
│   ├── github-sync/
│   │   └── index.ts                 # Server-side GitHub sync (approval flow)
│   └── github-status/
│       └── index.ts                 # Fetch/update GitHub Project status
├── apis/
│   └── feature-requests/
│       └── handlers/
│           ├── getGitHubStatus.ts   # API: fetch status for a request
│           ├── getGitHubStatuses.ts # API: get available status options
│           └── updateGitHubStatus.ts # API: update status (admin only)
├── pages/
│   └── api/
│       └── feature-requests/
│           └── approve/
│               └── [requestId].ts   # Telegram approval endpoint

.github/
└── workflows/
    ├── issue-notifications.yml      # Issue event notifications
    ├── pr-notifications.yml         # PR event notifications
    ├── pr-checks.yml                # PR checks
    └── deploy-notify.yml            # Deployment notifications
```

## Related Documentation

- [Telegram Notifications](./telegram-notifications.md)
- [GitHub PR CLI](../CLAUDE.md#github-pr-cli-tool)
