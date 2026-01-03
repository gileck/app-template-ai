# Contribute Changes to Template

This command helps you transfer bug fixes and improvements from your project back to the template repository. Use this when you've fixed something in template code and want to contribute it upstream.

## Overview

When you fix a bug or improve template code in your project, you want those changes to flow back to the template so:
1. Other projects benefit from the fix
2. Your next template sync includes the fix (avoiding conflicts)

### Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR PROJECT                         TEMPLATE REPO             │
│                                                                 │
│  1. Run this command            ───► Reviews ALL template       │
│                                       file changes              │
│                                                                 │
│  2. For EACH changed file:                                      │
│     • Compare project vs template                               │
│     • Decide: CONTRIBUTE or IGNORE                              │
│       - CONTRIBUTE: Include in patch (meaningful fix)           │
│       - IGNORE: Revert to template version (similar enough)     │
│                                                                 │
│  3. Creates patch for           ───► Copies to template         │
│     contributed files                                           │
│                                                                 │
│  4. Reverts ignored files       ───► Takes template version     │
│     in project                                                  │
│                                                                 │
│  5. Copy message to template    ───► Template agent applies     │
│     agent                             patch and commits         │
│                                                                 │
│  6. Template pushes changes     ◄───────────────────────────   │
│                                                                 │
│  7. Run sync-template           ───► Everything synced!         │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Template Local Path (Auto-detected)

The template is always located at `../app-template-ai` relative to your project root.

For example:
- Your project: `/Users/you/Projects/my-project`
- Template path: `/Users/you/Projects/app-template-ai`

**No configuration needed** - the command auto-detects this path.

### 2. Ensure Clean Template Repo

The template repository should have a clean working directory before applying patches.

## Process

### Step 1: Review ALL Template File Changes

I'll find all template files you've modified and compare each one with the template version.

For each file, I'll show:
- The **diff** between your version and template
- My **recommendation**: CONTRIBUTE or IGNORE
- **Reasoning** for the recommendation

### Step 2: Decide for Each File

For each changed template file, decide:

| Decision | When to Use | Action |
|----------|-------------|--------|
| **CONTRIBUTE** | Meaningful fix/improvement | Include in patch for template |
| **IGNORE** | Template code is good enough, minor/cosmetic differences | Revert to template version |

**Guidelines for deciding:**

✅ **CONTRIBUTE** when:
- Bug fix that template needs
- Performance improvement
- New feature that benefits all projects
- Security fix

❌ **IGNORE** when:
- Cosmetic/formatting differences only
- Project-specific tweaks that don't apply to template
- Template version is equivalent or better
- Changes were temporary/experimental

### Step 3: Execute Decisions

After reviewing all files, I will:

1. **For CONTRIBUTE files:**
   - Create a patch file
   - Copy to `../app-template-ai/incoming-patches/`

2. **For IGNORE files:**
   - Revert to template version in your project
   - `git checkout` from template or copy file

3. **Generate contribution message** for template agent

### Step 4: Copy Message to Template Agent

The generated message includes:
- Summary of contributed changes
- Patch file location
- Instructions for the template agent

### Step 5: After Template Updates

Once the template has pushed the changes:

```bash
# Sync with template - everything should be clean now!
yarn sync-template
```

Since ignored files were reverted and contributed files will come back via sync, your project stays in sync.

---

## Agent Instructions

When the user wants to contribute changes to the template, follow these steps:

### 1. Determine template path

The template is always at `../app-template-ai` relative to the project root:

```bash
TEMPLATE_PATH="../app-template-ai"

# Verify it exists
ls "$TEMPLATE_PATH"
```

### 2. Read sync config and identify template files

```bash
cat .template-sync.json
```

Get the lists of:
- `ignoredFiles` - skip these
- `projectSpecificFiles` - skip these
- `templateIgnoredFiles` - skip these (example code)

### 3. Find ALL changed template files

Compare project files against template to find differences:

```bash
# For each file that exists in both project and template
# and is NOT in any ignore list, check if they differ
```

### 4. Review EACH changed file with the user

For each changed template file, present:

```markdown
## File: src/apis/reports/server.ts

### Diff (Project vs Template):
```diff
[show the actual diff]
```

### Analysis:
- **Type of change**: Bug fix / Feature / Refactor / Cosmetic
- **Impact**: High / Medium / Low
- **Template benefit**: Would this help other projects?

### Recommendation: CONTRIBUTE / IGNORE
**Reasoning**: [explain why]

### Your decision? [CONTRIBUTE / IGNORE]
```

Wait for user decision before moving to next file.

### 5. After all files reviewed, execute decisions

**For CONTRIBUTE files:**
```bash
# Create patch for all contributed files
git diff HEAD -- file1.ts file2.ts file3.ts > contribution.patch

# Copy to template
mkdir -p ../app-template-ai/incoming-patches
cp contribution.patch ../app-template-ai/incoming-patches/contribution-$(date +%Y%m%d-%H%M%S).patch
```

**For IGNORE files:**
```bash
# Revert each ignored file to template version
cp ../app-template-ai/src/path/to/file.ts src/path/to/file.ts
```

### 6. Generate summary and template agent message

Create a message with:
- List of contributed files with descriptions
- Patch file location
- Instructions for template agent

### 7. Show final status

```markdown
## Contribution Summary

### Contributed to template (X files):
- src/apis/reports/server.ts - Bug fix for pagination

### Reverted to template version (Y files):
- src/client/utils/helpers.ts - Template version preferred

### Next steps:
1. Copy the message below to template agent
2. After template pushes, run: yarn sync-template
```

---

## Template Agent Message Template

```markdown
# Incoming Project Contribution

A project has contributed changes back to the template.

## Patch Location
`incoming-patches/contribution-{timestamp}.patch`

## Summary
{Brief description of what was fixed/improved}

## Files Changed
- `src/apis/reports/server.ts` - {description}
- `src/client/features/reports/hooks.ts` - {description}

## Instructions

1. **Review the patch:**
   ```bash
   cat incoming-patches/contribution-{timestamp}.patch
   ```

2. **Apply the patch:**
   ```bash
   git apply incoming-patches/contribution-{timestamp}.patch
   ```

3. **If patch fails (conflicts):**
   ```bash
   # Try with 3-way merge
   git apply --3way incoming-patches/contribution-{timestamp}.patch
   
   # Or apply manually by reading the patch
   ```

4. **Review the changes:**
   ```bash
   git diff
   yarn checks
   ```

5. **Commit and push:**
   ```bash
   git add -A
   git commit -m "fix: {description from contributor}"
   git push
   ```

6. **Clean up:**
   ```bash
   rm incoming-patches/contribution-{timestamp}.patch
   # Remove directory if empty
   rmdir incoming-patches 2>/dev/null || true
   ```

## Original Context
{Any additional context from the contributor about why this change was made}
```

---

## Example Workflow

### User Says: "Contribute to template"

### Agent Reviews Each File:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## File 1 of 3: src/apis/reports/handlers/getReports.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Diff:
```diff
@@ -45,7 +45,7 @@
 const getReports = async (params) => {
-  const offset = page * limit;
+  const offset = (page - 1) * limit;  // Fixed: page is 1-indexed
   const reports = await db.find().skip(offset).limit(limit);
```

### Analysis:
- **Type**: Bug fix
- **Impact**: High - pagination was broken
- **Template benefit**: YES - all projects need this fix

### Recommendation: ✅ CONTRIBUTE
**Reasoning**: This is a clear bug fix that affects all projects.

**Your decision?** [CONTRIBUTE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## File 2 of 3: src/client/utils/formatDate.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Diff:
```diff
@@ -12,7 +12,7 @@
-export function formatDate(date: Date): string {
+export function formatDate(date: Date | string): string {
+  const d = typeof date === 'string' ? new Date(date) : date;
```

### Analysis:
- **Type**: Enhancement
- **Impact**: Low - convenience change
- **Template benefit**: Maybe - depends on use case

### Recommendation: ❓ ASK USER
**Reasoning**: Minor enhancement, could be useful but not critical.

**Your decision?** [IGNORE - template version is fine]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## File 3 of 3: src/client/components/ui/button.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Diff:
```diff
@@ -8,6 +8,7 @@
   return (
-    <button className={cn("px-4 py-2", className)}>
+    <button className={cn("px-4 py-2", className)} type="button">
```

### Analysis:
- **Type**: Best practice fix
- **Impact**: Medium - prevents form submission bugs
- **Template benefit**: YES - good default behavior

### Recommendation: ✅ CONTRIBUTE
**Reasoning**: Adding type="button" is a best practice to prevent accidental form submissions.

**Your decision?** [CONTRIBUTE]
```

### Agent Executes Decisions:

```markdown
## Summary

### ✅ Contributing to template (2 files):
- `src/apis/reports/handlers/getReports.ts` - Pagination bug fix
- `src/client/components/ui/button.tsx` - Add type="button" default

### ↩️ Reverting to template version (1 file):
- `src/client/utils/formatDate.ts` - Template version preferred

### Actions taken:
1. Created patch: `../app-template-ai/incoming-patches/contribution-20240115-143022.patch`
2. Reverted `formatDate.ts` to template version

### Next: Copy this message to template agent ⬇️
```

### Generated Message (copied to template)

```markdown
# Incoming Project Contribution

## Patch Location
`incoming-patches/contribution-20240115-143022.patch`

## Summary
Bug fixes and improvements from project.

## Files Changed
1. `src/apis/reports/handlers/getReports.ts`
   - **Fix**: Pagination offset calculation (page is 1-indexed, not 0-indexed)
   
2. `src/client/components/ui/button.tsx`
   - **Fix**: Add type="button" default to prevent form submission bugs

## Instructions
1. Review: `cat incoming-patches/contribution-20240115-143022.patch`
2. Apply: `git apply incoming-patches/contribution-20240115-143022.patch`
3. Test: `yarn checks`
4. Commit: `git commit -am "fix: pagination offset + button type default"`
5. Push: `git push`
6. Cleanup: `rm incoming-patches/contribution-20240115-143022.patch`
```

### After Template Pushes

```bash
# In project - sync to get changes back
yarn sync-template

# Everything is now in sync!
```

---

## Troubleshooting

### "Patch does not apply cleanly"

The template may have changed since you made your fix. Options:

1. **Try 3-way merge:**
   ```bash
   git apply --3way patch-file.patch
   ```

2. **Apply manually:** Read the patch and make changes by hand

3. **Reject and redo:** If too complex, manually recreate the fix in the template

### "Template directory not found"

The template should be at `../app-template-ai`. Make sure:
1. You have the template cloned locally
2. It's in the same parent directory as your project
3. The folder is named `app-template-ai`

```bash
# Check if template exists
ls ../app-template-ai
```

### "Changes include project-specific files"

Only template files should be contributed. Remove project-specific files from the patch:
- Custom features you added
- Project config files
- Files in `projectSpecificFiles`

---

## Decision Criteria Reference

When analyzing each file, use these criteria:

### ✅ CONTRIBUTE - Include in patch

| Indicator | Example |
|-----------|---------|
| Bug fix | Off-by-one error, null check missing |
| Security fix | XSS prevention, auth check |
| Performance improvement | Optimized query, memoization |
| Type safety | Added proper types, fixed `any` |
| Best practice | Added `type="button"`, proper error handling |
| New feature useful to all | General-purpose utility |

### ❌ IGNORE - Take template version

| Indicator | Example |
|-----------|---------|
| Cosmetic only | Formatting, whitespace |
| Project-specific | Custom business logic |
| Experimental | Trying something, not sure if good |
| Template is equivalent | Both versions work the same |
| Template is better | Cleaner code in template |
| Local workaround | Hack for local issue |

---

## What Should I Do?

Just say **"Review my template changes"** or **"Contribute to template"** and I'll:

1. **Find all template files you've changed**
2. **For each file:**
   - Show the diff between your version and template
   - Analyze the type and impact of changes
   - Recommend CONTRIBUTE or IGNORE
   - Ask for your decision
3. **Execute your decisions:**
   - Create patch for CONTRIBUTE files → copy to template
   - Revert IGNORE files → take template version
4. **Generate the message** for the template agent

### Quick Commands

| Say This | What Happens |
|----------|--------------|
| "Review my template changes" | Full review of all changed files |
| "Contribute to template" | Same as above |
| "Just show what's different" | List files without deciding |
| "Contribute only reports changes" | Filter to specific area |

---

## Notes

- **Only contribute template code**: Files in `projectSpecificFiles` and `templateIgnoredFiles` are automatically excluded
- **Test before contributing**: Make sure your fix works
- **Review is interactive**: I'll ask for your decision on each file before taking action
- **Ignored files are reverted**: When you choose IGNORE, the file is reverted to template version in your project
- **Template path is automatic**: Always `../app-template-ai` relative to project root
