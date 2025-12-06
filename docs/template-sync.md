# Template Sync Guide

This template includes a powerful template sync system that allows you to merge updates from the template repository into projects created from it.

## Overview

When you create a new app from this template, you can continue to receive updates and improvements from the template while maintaining your own customizations.

## How It Works

The sync system:
1. **Compares** your project files with the latest template files
2. **Auto-merges** files that only changed in the template
3. **Flags conflicts** for files that changed in both template and project
4. **Preserves** your project-specific customizations

## Initial Setup (For New Projects)

When you create a new project from this template:

### 1. Initialize Template Tracking

```bash
yarn init-template https://github.com/yourusername/app-template-ai.git
```

Replace `yourusername` with your GitHub username or organization.

This creates a `.template-sync.json` configuration file.

### 2. Customize Configuration

Edit `.template-sync.json` to specify:

```json
{
  "templateRepo": "https://github.com/yourusername/app-template-ai.git",
  "templateBranch": "main",
  "baseCommit": "abc123...",
  "lastSyncCommit": "abc123...",
  "lastSyncDate": "2024-01-01T00:00:00.000Z",
  "ignoredFiles": [
    ".template-sync.json",
    "package.json",
    "README.md",
    ".env",
    ".env.local",
    "src/client/routes/Todos",
    "src/client/routes/Chat",
    "src/apis/todos",
    "src/apis/chat",
    "src/client/routes/index.ts",
    "src/client/components/NavLinks.tsx",
    "src/apis/apis.ts",
    "src/server/database/collections/index.ts",
    "src/server/database/collections/todos",
    "src/server/database/collections/reports"
  ],
  "projectSpecificFiles": [
    "src/client/features/myCustomFeature",
    "src/server/myCustomLogic.ts"
  ]
}
```

**Key fields:**
- `ignoredFiles`: Files that should never be synced (config files, example features, registry files)
- `projectSpecificFiles`: Additional files to skip (your heavily customized code)

**Note:** Example features (Todos, Chat) and registry files (route/API/collection registrations, navigation menus) are ignored by default since users customize these when creating a new project.

### 3. Commit the Configuration

```bash
git add .template-sync.json
git commit -m "Initialize template tracking"
```

## Syncing Template Updates

### Preview Changes (Dry Run)

```bash
yarn sync-template --dry-run
```

This shows what would be synced without making any changes.

### Sync Updates (Interactive Mode)

```bash
yarn sync-template
```

The script will:
1. Clone the latest template
2. **Analyze and categorize all changes**:
   - ✅ **Safe changes**: Only changed in template (no conflicts)
   - ⚠️ **Potential conflicts**: Changed in both template and your project
   - ⏭️ **Skipped**: Ignored or project-specific files
3. **Ask you what to do**:
   - `[1] Safe only` - Apply only safe changes (recommended first step)
   - `[2] All changes` - Apply everything, creates `.template` files for conflicts
   - `[3] Cancel` - Don't apply any changes

**Example interaction:**

```
📊 ANALYSIS SUMMARY
============================================================

✅ Safe changes (12 files):
   Only changed in template, no conflicts:
   • src/client/components/ui/button.tsx
   • src/server/middleware/auth.ts
   ...

⚠️  Potential conflicts (3 files):
   Changed in both template and your project:
   • src/server/index.ts
   • package.json
   ...

🤔 What would you like to do?

  [1] Safe only  - Apply only safe changes (no conflicts)
  [2] All changes - Apply all changes (may need manual merge)
  [3] Cancel     - Don't apply any changes

Enter your choice (1/2/3):
```

### Auto Mode (Non-Interactive)

```bash
yarn sync-template --auto
```

Applies all changes without prompting (old behavior). Use this for automated workflows.

### Handling Conflicts

When both template and project modified the same file:

1. **Review the conflict:**
   ```bash
   # Your version
   cat src/some-file.ts
   
   # Template version
   cat src/some-file.ts.template
   ```

2. **Manually merge:**
   - Use your preferred merge tool
   - Or manually combine the changes
   - Keep the parts you need from both versions

3. **Clean up:**
   ```bash
   # After merging, delete the template version
   rm src/some-file.ts.template
   ```

4. **Commit:**
   ```bash
   git add .
   git commit -m "Merge template updates"
   ```

## Sync Results

After syncing, you'll see:

```
📊 SYNC RESULTS
============================================================

✅ Auto-merged (15 files):
   src/client/components/ui/button.tsx
   src/client/config/defaults.ts
   ...

⚠️  Conflicts - Manual merge needed (3 files):
   src/server/index.ts
      → Template version saved to: src/server/index.ts.template
   ...

⏭️  Skipped (2 files):
   src/client/features/myCustomFeature/index.ts
   ...
```

## Best Practices

### 1. Keep Dependencies Separate

If you add project-specific dependencies, consider maintaining a separate list and merging `package.json` manually.

### 2. Mark Custom Code

Add your custom features to `projectSpecificFiles` in `.template-sync.json`:

```json
{
  "projectSpecificFiles": [
    "src/client/features/myFeature",
    "src/server/custom-api.ts"
  ]
}
```

### 3. Sync Regularly

Sync frequently to avoid large conflicts:

```bash
# Check for updates weekly or monthly
yarn sync-template --dry-run
```

### 4. Review Before Merging

Always review auto-merged changes:

```bash
git diff
```

Make sure automatic merges didn't break anything.

### 5. Test After Sync

```bash
yarn checks
yarn dev
```

## Advanced Usage

### Force Sync (With Uncommitted Changes)

```bash
yarn sync-template --force
```

⚠️ **Warning:** This bypasses the uncommitted changes check. Use with caution.

### Change Template Branch

Edit `.template-sync.json`:

```json
{
  "templateBranch": "develop"
}
```

### Ignore Additional Files

Add patterns to `ignoredFiles`:

```json
{
  "ignoredFiles": [
    "docs/project-specific",
    "scripts/custom-deploy.sh",
    "*.local.ts"
  ]
}
```

## Workflow Example

```bash
# 1. Check current status
git status

# 2. Commit your work
git add .
git commit -m "Feature: Add user dashboard"

# 3. Preview template updates
yarn sync-template --dry-run

# 4. Sync
yarn sync-template

# 5. Review changes
git diff

# 6. Handle conflicts (if any)
code src/some-file.ts  # Edit manually
rm src/some-file.ts.template

# 7. Test
yarn checks
yarn dev

# 8. Commit
git add .
git commit -m "Merge template updates"
```

## Troubleshooting

### "You have uncommitted changes"

```bash
# Option 1: Commit your changes
git add .
git commit -m "WIP: Current work"

# Option 2: Stash your changes
git stash
yarn sync-template
git stash pop

# Option 3: Force (not recommended)
yarn sync-template --force
```

### "Template repository not found"

Check your `.template-sync.json` and ensure `templateRepo` URL is correct.

### Too Many Conflicts

If you get many conflicts after a long time:

1. Use `--dry-run` first to understand the scope
2. Consider syncing in stages (manually cherry-pick some changes)
3. Mark conflicting areas as `projectSpecificFiles` if they're truly custom

## For Template Maintainers

### Making Template Changes

When updating the template:

1. **Document breaking changes** in commit messages
2. **Test sync** with an existing project before pushing
3. **Consider impact** on existing projects

### Testing Sync

```bash
# Create a test project
git clone <template> test-project
cd test-project
yarn init-template <template-url>

# Make some changes in test-project
# Make changes in template
# Test sync
yarn sync-template --dry-run
```

## Files Created

- `.template-sync.json` - Configuration (commit this)
- `*.template` - Template versions during conflicts (temporary, delete after merging)
- `.template-sync-temp/` - Temporary directory (auto-cleaned)

## Integration with CI/CD

You can automate sync checks:

```yaml
# .github/workflows/check-template.yml
name: Check Template Updates

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: yarn install
      - run: yarn sync-template --dry-run
```

This creates a weekly reminder to check for template updates.

## Summary

| Command | Purpose |
|---------|---------|
| `yarn init-template <url>` | Initialize tracking in new project |
| `yarn sync-template` | Sync updates from template |
| `yarn sync-template --dry-run` | Preview changes |
| `yarn sync-template --force` | Force sync with uncommitted changes |

---

**Happy syncing! 🚀**

