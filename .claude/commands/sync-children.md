# Sync Child Projects

This command syncs template changes to all child projects (projects cloned from this template).

## Purpose

Use this command to:
- Push template updates to all child projects at once
- See which projects were synced successfully
- Identify projects that were skipped (uncommitted changes) or had errors
- See validation errors (TypeScript/ESLint) if sync causes issues

## Prerequisites

Ensure `child-projects.json` exists in the project root with the list of child project paths:

```json
{
  "projects": [
    "../project-1",
    "../project-2"
  ]
}
```

## Process

### Step 1: Run the Sync Command

Execute the sync-children script:

```bash
yarn sync-children
```

This will:
1. Read the list of child projects from `child-projects.json`
2. For each project, check if it has uncommitted changes
3. Skip projects with uncommitted changes
4. Run `yarn sync-template --json` on clean projects
5. Parse the structured JSON response for reliable status detection
6. Run validation (TypeScript + ESLint) and capture any errors
7. Print a summary of results

### Step 2: Capture and Summarize Results

After the command completes, provide a clear summary to the user including:

1. **Synced Projects**: List projects that were successfully synced with files applied
2. **Up to Date**: Projects with no changes needed
3. **Skipped Projects**: Projects skipped due to uncommitted changes
4. **Checks Failed**: Projects where sync applied but TypeScript/ESLint failed (with error details)
5. **Errors**: Projects that encountered errors during sync
6. **Recommendations**: Suggest next steps for failed projects

## Output Format

The script outputs a structured summary:

```
============================================================
📊 SYNC SUMMARY
============================================================

✅ Synced (2):
   • project-1: Synced 5 file(s) successfully.
     - src/client/features/index.template.ts
     - scripts/template-scripts/sync-template/modes/json-mode.ts
     ... and 3 more
   • project-2: Synced 3 file(s) successfully.

📋 Up to date (1):
   • project-3

⏭️  Skipped (1):
   • project-4: Has uncommitted changes

⚠️  Checks Failed (1):
   • project-5: Sync applied but validation failed. Changes NOT committed.
     TypeScript errors:
       src/client/components/Layout.tsx(9,27): error TS2305: Module...
       ... and 2 more

❌ Errors (1):
   • project-6: Failed to clone template

============================================================
Total: 6 projects | Success: 3 | Skipped: 1 | Problems: 2
============================================================
```

## JSON Mode

The sync-children script uses `--json` mode when calling sync-template, which provides:

- **Reliable status detection**: No string matching, uses structured JSON response
- **Validation results**: Includes TypeScript and ESLint errors if checks fail
- **File lists**: Shows exactly which files were applied, skipped, or conflicted
- **Backward compatibility**: Falls back to string matching for older child projects

## Handling "Checks Failed" Projects

When a project reports "Checks Failed", the sync was applied but validation (TypeScript/ESLint) failed, so changes were **NOT committed**. You need to investigate and fix the issues.

### Step 1: Examine the Errors

Look at the `checksResult` in the output:
- `tsErrors`: TypeScript compilation errors
- `lintErrors`: ESLint errors

### Step 2: Identify the Root Cause

Check errors often fall into these categories:

#### A. Template Bug
The error is in a **template file that was synced**. This suggests a bug in the template itself.

**Solution**: Fix the issue in the **template repository**, then re-run sync-children.

#### B. Integration Issue with Skipped Files
This is the most common cause. The error is often because:
- The project has **ignored/skipped files** that were modified in the template
- Template files were synced, but related project-specific files were NOT synced
- This creates a mismatch (e.g., template exports a new feature, but project's `index.ts` doesn't import it)

**How to identify**: Look at `filesSkipped` in the JSON output. If skipped files are related to the error location, this is likely the cause.

**Solution**: Manually merge the skipped files with template changes:
1. Go to the child project
2. Run `yarn sync-template --show-drift` to see all differences
3. For each relevant skipped file, manually merge the template changes
4. Be careful - both project and template may have changes that need to be combined
5. Run `yarn checks` to verify
6. Commit the merged changes

#### C. Project-Specific Code Issue
The error is in project-specific code that's incompatible with template changes.

**Solution**: Update the project-specific code in the child project to work with the new template.

### Step 3: Commit the Changes

After fixing the issues in the child project:

```bash
cd ../child-project
yarn checks  # Verify fixes work
git add .
git commit -m "fix: resolve sync integration issues"
```

### Edge Cases on Large Template Changes

Large template changes (like restructuring exports, adding new features, or changing APIs) are more likely to cause integration issues with skipped files. When this happens:

1. **Don't panic** - the sync applied changes but didn't commit, so you can review
2. **Check the skipped files list** - these are often the source of integration problems
3. **Consider running interactive sync**: `yarn sync-template` (without `--auto-safe-only`) to handle conflicts manually
4. **Merge carefully** - skipped files have both project customizations AND template changes that need to be combined

## Notes

- Only safe changes (no conflicts) are synced automatically
- Projects with uncommitted changes are always skipped to prevent data loss
- Each synced project gets a commit with the template changes
- Validation (yarn checks) runs automatically - changes are NOT committed if it fails
- Use `yarn sync-children --dry-run` to preview without applying changes
- Exit code is non-zero if any project has errors or checks failed
