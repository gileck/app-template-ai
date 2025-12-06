# Template Sync Quick Start

## Scenario: You Created a New App from This Template

### Step 1: Create Your Project from Template

On GitHub:
1. Click **"Use this template"** → **"Create a new repository"**
2. Name your repo: `my-awesome-app`
3. Clone it:
```bash
git clone https://github.com/yourusername/my-awesome-app.git
cd my-awesome-app
yarn install
```

### Step 2: Initialize Template Tracking

This tells your project where the template is so it can sync updates later:

```bash
yarn init-template https://github.com/yourusername/app-template-ai.git
```

This creates `.template-sync.json`:
```json
{
  "templateRepo": "https://github.com/yourusername/app-template-ai.git",
  "templateBranch": "main",
  "baseCommit": "abc123...",
  "lastSyncCommit": "abc123...",
  "lastSyncDate": "2024-01-01T00:00:00.000Z",
  "ignoredFiles": [
    "package.json",
    "README.md",
    ".env",
    "src/client/routes/Todos",
    "src/client/routes/Chat",
    "src/apis/todos",
    "src/apis/chat",
    "..."
  ],
  "projectSpecificFiles": []
}
```

**Note:** Example features (Todos, Chat) are automatically ignored since they're just demonstrations.

**Commit this file:**
```bash
git add .template-sync.json
git commit -m "Initialize template tracking"
git push
```

### Step 3: Build Your App

Work on your app normally:
```bash
# Create your features
mkdir -p src/client/features/my-feature
# ... build your app ...

git commit -am "Add my awesome feature"
git push
```

### Step 4: Later... Template Gets Updated

Months later, the template gets improvements. Time to sync!

**Preview what would change:**
```bash
yarn sync-template --dry-run
```

Output:
```
🔄 Template Sync Tool
============================================================
📥 Cloning template from https://github.com/yourusername/app-template-ai.git...
📍 Template commit: def456...

🔍 Analyzing changes...

📝 Found 12 changed files

============================================================
📊 SYNC RESULTS
============================================================

✅ Auto-merged (9 files):
   src/client/components/ui/button.tsx
   src/client/config/defaults.ts
   src/server/middleware/auth.ts
   ...

⚠️  Conflicts - Manual merge needed (3 files):
   src/server/index.ts
      → Template version saved to: src/server/index.ts.template
   src/client/routes/Home/page.tsx
      → Template version saved to: src/client/routes/Home/page.tsx.template
   src/apis/todos/server.ts
      → Template version saved to: src/apis/todos/server.ts.template

⏭️  Skipped (0 files):
```

### Step 5: Apply Updates

```bash
yarn sync-template
```

This will:
- ✅ **Auto-merge** files that only the template changed
- ⚠️ **Create `.template` files** for conflicts (both you and template changed)

### Step 6: Resolve Conflicts

For each conflict, you'll see a `.template` file:

```bash
# Your version (with your changes)
cat src/server/index.ts

# Template version (with template improvements)
cat src/server/index.ts.template
```

**Manually merge them:**

1. Open both files side-by-side in your editor
2. Combine the changes you want from both
3. Save your merged version in the original file
4. Delete the `.template` file:
```bash
rm src/server/index.ts.template
```

Repeat for each `.template` file.

### Step 7: Test and Commit

```bash
# Make sure everything works
yarn checks
yarn dev

# Commit the merge
git add .
git commit -m "Merge template updates"
git push
```

## Example Conflict Resolution

**Your version** (`src/server/index.ts`):
```typescript
// Your custom code
app.use('/api/my-feature', myFeatureRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT);
```

**Template version** (`src/server/index.ts.template`):
```typescript
// Template improved with better error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT);

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
```

**Merged result** (keep both improvements):
```typescript
// Your custom code
app.use('/api/my-feature', myFeatureRouter);

// Template improvement
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT);

// Template improvement
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
```

## Avoiding Conflicts

### Mark Project-Specific Files

If you have files that should never be synced, add them to `.template-sync.json`:

```json
{
  "projectSpecificFiles": [
    "src/client/features/my-custom-feature",
    "src/server/my-custom-logic.ts",
    "src/apis/my-custom-api"
  ]
}
```

These files will be **skipped** during sync.

### Sync Regularly

The longer you wait, the more conflicts you'll have:

```bash
# Good: Sync monthly
yarn sync-template --dry-run

# Bad: Wait 2 years, get 100 conflicts
```

## Common Workflows

### Just Want to See What's New
```bash
yarn sync-template --dry-run
```

### Apply Non-Conflicting Changes Only
```bash
# Sync
yarn sync-template

# If there are conflicts, just revert
git checkout .
git clean -f  # Remove .template files

# You can cherry-pick specific changes manually later
```

### Ignore Template Updates for Now
Just don't run `yarn sync-template`. Your app keeps working fine.

## FAQ

**Q: Can I skip certain template changes?**  
A: Yes! During conflict resolution, just don't apply the template version. Keep your version.

**Q: What if I don't want to sync ever?**  
A: Don't run `yarn sync-template`. The init step is optional too. Your app is independent.

**Q: Can I sync with a different branch of the template?**  
A: Yes! Edit `.template-sync.json`:
```json
{
  "templateBranch": "develop"
}
```

**Q: What if template deleted a file I'm using?**  
A: The sync system never deletes your files. Only adds/modifies.

**Q: How do I know what the template changed?**  
A: Check the template's git history:
```bash
# View template commits since your last sync
git log def456..HEAD  # in the template repo
```

## Summary

1. **Create project** from template on GitHub
2. **Initialize tracking**: `yarn init-template <template-url>`
3. **Build your app** normally
4. **Later, sync**: `yarn sync-template`
5. **Resolve conflicts** by merging `.template` files manually
6. **Test and commit**

That's it! You get template improvements while keeping your customizations. 🎉

