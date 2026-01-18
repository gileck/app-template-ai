# GitHub Projects Integration

This document describes the GitHub Projects integration that automates the feature request workflow from initial submission to merged PRs.

## Overview

The integration creates a complete pipeline:

1. **User submits** feature request via app UI → stored in MongoDB
2. **Admin gets Telegram notification** with one-click approval link
3. **Admin approves** (via Telegram link or app UI) → server creates GitHub Issue + adds to Project "Backlog"
4. **Admin gets GitHub notification** (via GitHub Actions) → moves issue to "Ready for Product Design"
5. **Generate Product Design** (CLI agent) → updates issue → moves to "Product Design Review"
6. **Generate Tech Design** (CLI agent) → updates issue → moves to "Technical Design Review"
7. **Implement + Create PR** (CLI agent) → creates branch, implements, opens PR → moves to "PR Review"
8. **Admin merges PR** → Done

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
│  CLI Agent Scripts (scripts/agents/)                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ product-design   │  │ tech-design      │  │ implement            │  │
│  │ .ts              │  │ .ts              │  │ .ts                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ shared/                                                           │  │
│  │ ├── config.ts         # Repo/project URLs (per-repo config)      │  │
│  │ ├── github.ts         # GitHub API utilities                     │  │
│  │ ├── claude.ts         # Claude SDK utilities                     │  │
│  │ ├── notifications.ts  # Telegram notifications                   │  │
│  │ ├── prompts.ts        # Prompt templates                         │  │
│  │ └── types.ts          # Shared types                             │  │
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

The project needs a Status field with these exact values:

| Status | Description |
|--------|-------------|
| `Backlog` | New items, not yet started |
| `Ready for Product Design` | Ready for product design generation |
| `Product Design Review` | Product design generated, awaiting review |
| `Ready for Technical Design` | Product design approved, ready for tech design |
| `Technical Design Review` | Tech design generated, awaiting review |
| `Ready for development` | Tech design approved, ready for implementation |
| `PR Review` | Implementation complete, PR awaiting review |
| `In review` | PR being actively reviewed |
| `Done` | Completed and merged |

### Step 3: Create Review Status Custom Field

1. In your project, click the "+" button to add a field
2. Select "Single select"
3. Name it exactly: `Review Status`
4. Add these options:
   - `Waiting for Review`
   - `Approved`
   - `Request Changes`
   - `Rejected`

This field is used within review phases to track the sub-status of items.

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

The configuration is in `scripts/agents/shared/config.ts`:

```typescript
export const config: AgentConfig = {
    github: {
        owner: 'gileck',           // GitHub username or org
        repo: 'app-template-ai',   // Repository name
        projectNumber: 3,          // Project number from URL
        ownerType: 'user',         // 'user' or 'org'
    },
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

**Note:** The status values in `STATUSES` and `REVIEW_STATUSES` are constants and should NOT be modified. Only modify the `config` object for your project.

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
| `.github/workflows/project-notifications.yml` | Project item status changes |
| `.github/workflows/pr-notifications.yml` | Pull requests, reviews |
| `.github/workflows/reset-review-status.yml` | Auto-reset Review Status |

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

➡️ Ready for Product Design
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

### Auto-Reset Review Status

The repository includes a GitHub Action that automatically resets the Review Status field when the main Status changes. This prevents confusion when moving items between phases (e.g., Review Status staying "Approved" when moving to the next phase).

**Behavior:**
- When Status changes to a **non-review phase** (e.g., "Ready for Technical Design"), Review Status is **cleared**
- When Status changes to a **review phase** and Review Status is "Approved", it's **reset to "Waiting for Review"**

**Configuration:**
- Enabled by default
- To disable, set repository variable `AUTO_RESET_REVIEW_STATUS` to `false`

**Workflow File:** `.github/workflows/reset-review-status.yml`

## Viewing GitHub Status in the App

The app UI displays live GitHub Project status for feature requests that have been synced to GitHub.

### What's Displayed

When you expand a feature request card in the admin panel, you'll see:
- **GitHub Issue Link**: Click to view the issue on GitHub
- **GitHub PR Link**: Click to view the PR (when created)
- **Project Status**: The current status in GitHub Projects (e.g., "Product Design Review")
- **Review Status**: The current review status (e.g., "Waiting for Review")

### How It Works

The status is fetched **directly from GitHub API** in real-time:
1. When you expand a feature request card, it fetches the current status from GitHub
2. Status refreshes automatically when the window regains focus
3. Data is considered stale after 30 seconds

This approach ensures you always see the **actual current status** from GitHub, not a cached copy in the database.

### API Endpoint

The UI uses the `feature-requests/github-status` API endpoint which:
- Requires authentication
- Users can only view status of their own requests
- Admins can view status of any request
- Returns: `status`, `reviewStatus`, `issueState`, `issueUrl`

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
              ▼ (Admin moves to Ready for Product Design)
    ┌─────────────────────────────────┐
    │ Status: Ready for Product Design │
    └─────────────────┬───────────────┘
                      │
                      ▼ yarn agent:product-design
    ┌─────────────────────────────────────┐
    │ Status: Product Design Review       │
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
                      ▼ (Admin moves to Ready for Technical Design)
    ┌─────────────────────────────────────┐
    │ Status: Ready for Technical Design  │
    └─────────────────┬───────────────────┘
                      │
                      ▼ yarn agent:tech-design
    ┌─────────────────────────────────────┐
    │ Status: Technical Design Review     │
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
                      ▼ (Admin moves to Ready for development)
    ┌─────────────────────────────────────┐
    │ Status: Ready for development       │
    └─────────────────┬───────────────────┘
                      │
                      ▼ yarn agent:implement
    ┌─────────────────────────────────────┐
    │ Status: PR Review                   │
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
                      ▼
    ┌─────────────────────────────────────┐
    │ Status: Done                        │
    │ (PR merged)                         │
    └─────────────────────────────────────┘
```

### Admin Actions

| Phase | Admin Action | Effect |
|-------|--------------|--------|
| Backlog | Move to "Ready for Product Design" | Enables product design agent |
| Product Design Review | Set Review Status = "Approved" | Ready for tech design |
| Product Design Review | Set Review Status = "Request Changes" + comment | Agent revises design |
| Technical Design Review | Set Review Status = "Approved" | Ready for development |
| Technical Design Review | Set Review Status = "Request Changes" + comment | Agent revises design |
| Ready for development | (automatic) | Implementation agent creates PR |
| PR Review | Set Review Status = "Approved" + merge PR | Done |
| PR Review | Set Review Status = "Request Changes" + review comments | Agent addresses feedback |

## Running the Agents

### CLI Commands Reference

```bash
# Generate product designs
yarn agent:product-design                    # Process all pending
yarn agent:product-design --id <item-id>     # Specific item
yarn agent:product-design --dry-run          # Preview
yarn agent:product-design --stream           # Stream Claude output

# Generate technical designs
yarn agent:tech-design                       # Process all pending
yarn agent:tech-design --id <item-id>        # Specific item
yarn agent:tech-design --dry-run --stream    # Preview with streaming

# Implement and create PRs
yarn agent:implement                         # Process all pending
yarn agent:implement --id <item-id>          # Specific item
yarn agent:implement --dry-run               # Preview
yarn agent:implement --skip-push             # Skip git push (for testing)
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
# Run each agent when needed
yarn agent:product-design
yarn agent:tech-design
yarn agent:implement
```

**Automated (via cron or CI):**
```bash
# Run all agents that have pending work
yarn agent:product-design && \
yarn agent:tech-design && \
yarn agent:implement
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
📊 Status: Product Design Review

Review and approve to proceed to Technical Design.
```

**PR Ready:**
```
🚀 Implementation Complete - PR Ready!

📋 Add dark mode toggle
🔗 Issue #123
🔀 PR #456
📊 Status: PR Review

Review and merge to complete.
```

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

1. **Edit configuration** in `scripts/agents/shared/config.ts`:
   ```typescript
   export const config: AgentConfig = {
       github: {
           owner: 'your-username',
           repo: 'your-repo',
           projectNumber: 1,  // Your project number
           ownerType: 'user',
       },
       // ... rest stays the same
   };
   ```

2. **Create GitHub Project** with required statuses (see Setup section)

3. **Set environment variables**:
   ```bash
   GITHUB_TOKEN=your_token
   TELEGRAM_BOT_TOKEN=your_bot_token  # optional
   ```

4. **Run agents** as normal - everything uses config automatically

## File Structure

```
scripts/
├── agents/
│   ├── product-design.ts      # Generate product design
│   ├── tech-design.ts         # Generate technical design
│   ├── implement.ts           # Implement + create PR
│   └── shared/
│       ├── config.ts          # Repo/project configuration
│       ├── github.ts          # GitHub API (GraphQL + REST)
│       ├── claude.ts          # Claude SDK runner
│       ├── notifications.ts   # Telegram notifications
│       ├── prompts.ts         # Prompt templates
│       ├── types.ts           # Shared types
│       └── index.ts           # Barrel exports

src/
├── server/
│   ├── github-sync/
│   │   └── index.ts           # Server-side GitHub sync (approval flow)
│   └── github-status/
│       └── index.ts           # Fetch GitHub Project status for UI
├── apis/
│   └── feature-requests/
│       └── handlers/
│           └── getGitHubStatus.ts  # API handler for fetching status
├── pages/
│   └── api/
│       └── feature-requests/
│           └── approve/
│               └── [requestId].ts  # Telegram approval endpoint

.github/
└── workflows/
    ├── issue-notifications.yml     # Issue event notifications
    ├── project-notifications.yml   # Project status change notifications
    ├── pr-notifications.yml        # PR event notifications
    └── reset-review-status.yml     # Auto-reset Review Status on Status change
```

## Related Documentation

- [Telegram Notifications](./telegram-notifications.md)
- [GitHub PR CLI](../CLAUDE.md#github-pr-cli-tool)
