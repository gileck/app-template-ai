# Migrate to Path Ownership Config

This command migrates a child project from the legacy hash-based template sync config to the new Path Ownership model, and validates that all `projectOverrides` are justified.

## When to Use

- Child project still uses legacy config (has `fileHashes`, `ignoredFiles`, `projectSpecificFiles`)
- To audit existing `projectOverrides` and ensure they're justified
- After folder restructuring migration

## Important: projectOverrides Philosophy

**projectOverrides are NOT for small tweaks.** They should only contain files where:

- The project has **significant, project-specific logic** that doesn't belong in the template
- The changes would **NOT benefit other projects** using the template
- The differences are **intentional and permanent**

**If changes are small or could benefit all projects** → Contribute to template instead and remove the override.

---

## Process

### Step 1: Check Current Config Format

Read the current config:

```bash
cat .template-sync.json
```

**Identify the config type:**

| Config Type | Indicators |
|-------------|------------|
| **Legacy (hash-based)** | Has `fileHashes`, `ignoredFiles`, `projectSpecificFiles`, `templateIgnoredFiles` |
| **Path Ownership (new)** | Has `templatePaths`, `projectOverrides`, `overrideHashes` |

If already using Path Ownership, skip to **Step 5: Validate Overrides**.

---

### Step 2: Backup Legacy Config

```bash
cp .template-sync.json .template-sync.legacy.json
```

---

### Step 3: Create New Config

Write a new `.template-sync.json` with Path Ownership format:

```json
{
  "templateRepo": "git@github.com:gileck/app-template-ai.git",
  "templateBranch": "main",
  "templateLocalPath": "../app-template-ai",
  "lastSyncCommit": "<KEEP FROM LEGACY>",
  "lastSyncDate": "<KEEP FROM LEGACY>",

  "templatePaths": [
    "package.json",
    "tsconfig.json",
    ".eslintrc.js",
    "eslint.config.mjs",
    "postcss.config.mjs",
    "next.config.ts",
    "CLAUDE.md",
    "docs/template/**",
    "scripts/template/**",
    ".ai/skills/template/**",
    "src/client/components/ui/**",
    "src/client/query/**",
    "src/client/stores/**",
    "src/server/middleware/**",
    "src/server/utils/**",
    "src/server/database/index.ts",
    "src/server/database/collections/index.template.ts",
    "src/server/database/collections/feature-requests/**",
    "src/server/database/collections/users/**",
    "src/server/database/collections/todos/**",
    "src/server/database/collections/reports/**",
    "src/pages/api/process/**",
    "app-guildelines/**",
    "task-manager/**"
  ],

  "projectOverrides": [
    "src/client/features/index.ts",
    "src/server/database/collections/index.ts"
  ],

  "overrideHashes": {}
}
```

**CRITICAL:**
- Do NOT use broad globs like `src/server/database/**` - this would delete project-specific collections
- Be specific about which database files the template owns

---

### Step 4: Run Migration Sync

**4.1: Dry Run First**

```bash
yarn sync-template --dry-run
```

**Check the output carefully:**

| Section | What to Look For |
|---------|------------------|
| **To Delete** | Should NOT include project-specific files (custom database collections, custom features) |
| **To Copy** | Template files that will be synced |
| **Skipped** | Files in `projectOverrides` - these are protected |

**If project-specific files appear in "To Delete":**
1. Add them to `projectOverrides`, OR
2. Make `templatePaths` more specific

**4.2: Apply Sync**

```bash
yarn sync-template --auto-safe-only
```

**4.3: Verify**

```bash
yarn checks
```

Must pass with 0 errors.

**4.4: Commit**

```bash
git add -A
git commit -m "feat: migrate to Path Ownership template sync config

- Converted from legacy hash-based config to new Path Ownership model
- Template paths explicitly defined
- Project-specific files protected via projectOverrides
- Backed up legacy config as .template-sync.legacy.json

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Step 5: Validate projectOverrides

**CRITICAL STEP:** Each file in `projectOverrides` must be justified.

**5.1: List Current Overrides**

```bash
cat .template-sync.json | grep -A 20 '"projectOverrides"'
```

**5.2: For EACH Override, Compare with Template**

```bash
# Compare override with template version
diff -u ../app-template-ai/path/to/file.ts ./path/to/file.ts
```

**5.3: Classify Each Override**

| Classification | Action | Criteria |
|----------------|--------|----------|
| **Justified** | Keep | Significant project-specific logic, wouldn't benefit other projects |
| **Should Contribute** | Contribute to template, remove override | Bug fixes, improvements that benefit all projects |
| **Unnecessary** | Remove | File is identical or nearly identical to template |

**5.4: Decision Tree**

```
Does template have this file?
├── NO: Is this genuinely project-specific?
│   ├── YES → JUSTIFIED (keep override)
│   └── NO → Template should have it → CONTRIBUTE
│
└── YES: What are the differences?
    ├── MAJOR (different logic, project-specific) → JUSTIFIED
    ├── MINOR (bug fixes, improvements) → CONTRIBUTE to template
    └── NONE/TRIVIAL → REMOVE from overrides
```

**5.5: Examples**

| File | Verdict | Reason |
|------|---------|--------|
| `src/client/features/index.ts` | **Always Justified** | Each project exports its own features |
| `src/server/database/collections/index.ts` | **Always Justified** | Each project exports its own collections |
| `src/client/components/ui/button.tsx` | **Usually NOT Justified** | Style tweaks should go to template |
| `src/client/components/ui/checkbox.tsx` | **Justified IF** project added it and template doesn't need it |

---

### Step 6: Take Action on Unjustified Overrides

**To remove an unnecessary override:**
1. Remove file path from `projectOverrides` array
2. Run `yarn sync-template` - template version will be copied
3. Run `yarn checks` to verify

**To contribute improvements to template:**
1. Copy the improved file to the template repository
2. Run `yarn checks` in template
3. Commit to template
4. Remove from child project's `projectOverrides`
5. Run `yarn sync-template` in child project

---

### Step 7: Final Validation Checklist

- [ ] Config uses Path Ownership format (`templatePaths`, `projectOverrides`)
- [ ] Legacy config backed up as `.template-sync.legacy.json`
- [ ] `yarn sync-template --dry-run` shows no unexpected deletions
- [ ] `yarn checks` passes
- [ ] **All overrides validated:**
  - [ ] Each override has significant project-specific changes
  - [ ] No overrides that could be contributed to template
  - [ ] No unnecessary overrides (identical to template)
- [ ] Changes committed

---

## Quick Reference

| Task | Command |
|------|---------|
| Check config | `cat .template-sync.json` |
| Dry run | `yarn sync-template --dry-run` |
| Compare file | `diff -u ../app-template-ai/path/file ./path/file` |
| Apply sync | `yarn sync-template --auto-safe-only` |
| Verify | `yarn checks` |

---

## Troubleshooting

### "To Delete" includes project-specific files

**Problem:** Broad patterns include project files.

**Solution:** Make `templatePaths` more specific:
```json
// BAD
"src/server/database/**"

// GOOD
"src/server/database/index.ts",
"src/server/database/collections/users/**"
```

### Override file nearly identical to template

**Problem:** Override has only trivial differences.

**Solution:**
1. If differences are intentional → Document why
2. If not intentional → Remove from `projectOverrides`
