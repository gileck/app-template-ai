# Audit React Query Mutations

This command audits ALL React Query mutations in the project and ensures they follow the optimistic-only mutation guidelines.

📚 **Full Documentation**: [docs/react-query-mutations.md](mdc:../../docs/react-query-mutations.md)  
📚 **State Management**: [docs/state-management.md](mdc:../../docs/state-management.md)

---

## ⚠️ CRITICAL: Read This First

### The #1 Mistake: Confusing Temp IDs with Client-Generated Stable IDs

| Pattern | Example | Compliant? |
|---------|---------|------------|
| **Temp ID that gets replaced** | `_id: \`temp-${Date.now()}\`` then replaced with server ID in `onSuccess` | ❌ **NO** |
| **Client-generated stable ID** | `_id: nanoid()` or `_id: crypto.randomUUID()` that server persists as-is | ✅ **YES** (if server accepts it) |

**How to tell the difference:**
- Look at `onSuccess` - does it replace the temp ID with a server-returned ID? → **Non-compliant**
- Look at the server handler - does it use the client-provided ID or generate its own? → Check API code

### Core Rules Summary

1. **Edits / Deletes → Optimistic-only**
   - Update cache in `onMutate`
   - Rollback on `onError`
   - `onSuccess: () => {}` (empty - never update from server response)
   - `onSettled: () => {}` (empty - never invalidate from mutations)

2. **Creates → Decision required**
   - **Optimistic create** ONLY if client generates stable ID that server persists
   - **Non-optimistic create** (show loader) if server generates ID
   - **NEVER use temp-ID → server-ID replacement flows**

3. **Allowed in onSuccess (not violations):**
   - `queryClient.removeQueries()` - cleaning up stale single-item cache after delete
   - Inserting server-returned entity for non-optimistic creates
   - Zustand store updates (not React Query cache)

---

## Process

### Step 1: Read Guidelines (Required First Step)

**Action**: Read and understand the full guidelines before proceeding.

Read these files completely:
1. `docs/react-query-mutations.md` - Detailed mutation patterns
2. `docs/state-management.md` - Section on React Query mutations
3. `.cursor/rules/state-management-guidelines.mdc` - Quick reference

**Confirm you understand these key distinctions:**
- Temp ID replacement (❌ bad) vs client-generated stable ID (✅ good)
- `setQueryData` from server response (❌ bad) vs `removeQueries` cleanup (✅ fine)
- `invalidateQueries` in mutations (❌ bad) vs triggered elsewhere (✅ fine)

---

### Step 2: Find ALL React Query Mutations

**Action**: Search the entire codebase for mutation hooks.

```bash
# Find all useMutation usage
grep -r "useMutation" src/client --include="*.ts" --include="*.tsx" -l

# Find all mutation hook definitions  
grep -r "function use.*Create\|function use.*Update\|function use.*Delete\|function use.*Add\|function use.*Remove" src/client --include="*.ts" --include="*.tsx"

# Find temp ID patterns (these are RED FLAGS)
grep -r "temp-\|temp_\|temporary\|tempId\|temp_id" src/client --include="*.ts" --include="*.tsx"
```

**Expected locations**:
- `src/client/routes/*/hooks.ts` - Route-specific mutations
- `src/client/features/*/hooks.ts` - Feature mutations
- Any other `.ts`/`.tsx` files with `useMutation`

---

### Step 3: Analyze Each Mutation

For EACH mutation found, answer these questions:

#### A) What type of mutation is it?

| Type | Pattern | Example |
|------|---------|---------|
| **Edit** | Updates existing entity | `useUpdateTodo`, `useUpdateProfile` |
| **Delete** | Removes entity | `useDeleteTodo`, `useDeleteReport` |
| **Create** | Creates new entity | `useCreateTodo`, `useCreateComment` |
| **Other** | Auth, fire-and-forget, no cache | `useLogin`, `useSubmitReport` |

#### B) For CREATES specifically - answer these:

1. **Does it use a temp ID pattern?** Search for:
   - `temp-${` or `temp_${` or `\`temp`
   - `Date.now()` in ID generation
   - `Math.random()` in ID generation
   - Variable named `tempId`, `temporaryId`, etc.

2. **Does `onSuccess` replace the temp ID with server ID?** Look for:
   - Filtering out temp entries and adding server data
   - Mapping over items to replace temp ID
   - Any logic that uses both `context.tempId` and `data._id`

3. **If yes to either → Mark as ❌ Non-compliant**

#### C) For EDITS and DELETES - check these:

1. **Does `onSuccess` call `setQueryData` with server response data?**
   - ❌ Bad: `queryClient.setQueryData(['key'], data)` where `data` is from server
   - ✅ OK: `queryClient.removeQueries()` for cleanup after delete

2. **Does `onSuccess` or `onSettled` call `invalidateQueries`?**
   - ❌ Bad: Causes race conditions
   - Exception: Aggregation queries that can't be computed optimistically (discuss with user)

3. **Does it have `onMutate` with optimistic update?**
   - ✅ Required for edits/deletes
   - Check: Updates cache immediately before server responds

#### D) Classification

| Classification | Criteria |
|----------------|----------|
| ✅ **Compliant** | Follows all rules for its type |
| ❌ **Non-compliant** | Violates one or more rules |
| ⚠️ **Needs Discussion** | Edge case, unclear, or requires UX decision |

**DO NOT mark a mutation as "Compliant" if it uses temp IDs, even if onSuccess is empty.** The temp ID pattern itself is the problem.

---

### Step 4: Summarize Findings

**Action**: Create a summary table for the user.

#### Required Format

```markdown
## Mutation Audit Results

### ✅ Compliant Mutations (X total)
| File | Hook | Type | Why Compliant |
|------|------|------|---------------|
| routes/Todos/hooks.ts | useUpdateTodo | Edit | Optimistic in onMutate, empty onSuccess/onSettled |
| routes/Todos/hooks.ts | useDeleteTodo | Delete | Optimistic in onMutate, removeQueries cleanup only |
| routes/Todos/hooks.ts | useCreateTodo | Create | Non-optimistic (server generates ID), inserts on success |

### ❌ Non-compliant Mutations (X total)
| File | Hook | Type | Violation | Fix Required |
|------|------|------|-----------|--------------|
| routes/Plans/hooks.ts | useCreatePlan | Create | Uses temp-${Date.now()}, replaces in onSuccess | Remove temp ID, make non-optimistic |
| routes/Items/hooks.ts | useUpdateItem | Edit | onSuccess calls invalidateQueries | Remove invalidation, use optimistic-only |

### ⚠️ Needs Discussion (X total)
| File | Hook | Type | Question for User |
|------|------|------|-------------------|
| routes/Orders/hooks.ts | useCreateOrder | Create | Server computes totals - confirm non-optimistic is acceptable? |
```

**Important Notes column guidance:**
- ✅ Compliant: Explain WHY it's compliant (not just "optimistic")
- ❌ Non-compliant: Specify the EXACT violation found
- ⚠️ Discussion: Ask a SPECIFIC question

---

### Step 5: For EVERY Non-Compliant Create, Explain UX Impact

**REQUIRED**: For any CREATE mutation that is non-compliant, provide this template:

```markdown
## UX Change Required: [Hook Name]

**File**: [path/to/file.ts]
**Current behavior**: [Describe what happens now]
**Proposed behavior**: [Describe the change]

### Why the current implementation is problematic:

[Choose the applicable reason:]

☐ **Temp ID replacement**: The code uses `temp-${Date.now()}` or similar, then replaces 
   with server ID in onSuccess. This is complex, error-prone, and causes subtle bugs 
   when users act faster than the server responds.

☐ **Server generates the ID**: The entity ID is a MongoDB ObjectId generated server-side.
   The client cannot know this ID ahead of time.

☐ **Server computes critical fields**: The server calculates [specific fields] which 
   the client cannot predict.

### Recommended fix:

**Option A (Recommended): Non-optimistic with inline loading**
- Remove `onMutate` (no optimistic insert)
- In `onSuccess`: insert the server-returned entity
- In component: disable button + show spinner while `isPending`
- UX impact: User sees ~0.5-1s delay, but no visual glitches

**Option B: True optimistic with client-generated ID**
- Requires API change: server must accept and persist client-provided ID
- Client generates UUID/nanoid before mutation
- No replacement needed - same ID used everywhere
- UX impact: Instant feedback, but requires backend changes

### My recommendation: Option [A/B]

[Explain why this option is best for this specific case]
```

---

### Step 6: Get User Approval

**Action**: Present all findings and wait for explicit approval.

```markdown
## Summary of Proposed Changes

### Code-only changes (no UX impact):
1. `[file]` - `[hook]`: [specific change]
2. ...

### UX-affecting changes:
1. `[file]` - `[hook]`: Change from optimistic to non-optimistic
   - Before: Item appears instantly with temp ID
   - After: Button shows loading, item appears after server responds
2. ...

---

**Please review and reply:**
- **"Approve all"** - Proceed with all changes
- **"Approve except [X]"** - Skip specific changes
- **"Questions about [X]"** - I'll explain further
- **"Show me the code for [X]"** - I'll show the specific implementation
```

**⛔ DO NOT PROCEED without explicit user approval.**

---

### Step 7: Implement Changes

**Action**: After approval, make the changes systematically.

#### Pattern: Edit/Delete → Optimistic-only

```typescript
// BEFORE (non-compliant)
onSuccess: (data) => {
    if (data) {
        queryClient.setQueryData(['items', data._id], data);
    }
    queryClient.invalidateQueries({ queryKey: ['items'] });
},

// AFTER (compliant)
onSuccess: () => {},
onSettled: () => {},
```

#### Pattern: Create with temp ID → Non-optimistic

```typescript
// BEFORE (non-compliant - temp ID replacement)
onMutate: async (variables) => {
    const tempId = `temp-${Date.now()}`;
    queryClient.setQueryData(['items'], (old) => ({
        items: [...(old?.items || []), { _id: tempId, ...variables }]
    }));
    return { tempId };
},
onSuccess: (newItem, _variables, context) => {
    // Replace temp with real - THIS IS THE PROBLEM
    queryClient.setQueryData(['items'], (old) => ({
        items: old?.items?.map(item => 
            item._id === context?.tempId ? newItem : item
        ) || []
    }));
},

// AFTER (compliant - non-optimistic)
// No onMutate - don't insert optimistically
onSuccess: (newItem) => {
    if (!newItem) return; // Guard for offline mode
    queryClient.setQueryData(['items'], (old) => ({
        items: [...(old?.items || []), newItem]
    }));
},
```

#### Pattern: Update component for non-optimistic create

```typescript
const createMutation = useCreateItem();

<Button 
    onClick={() => createMutation.mutate(data)}
    disabled={createMutation.isPending}
>
    {createMutation.isPending ? (
        <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
        </>
    ) : (
        'Create'
    )}
</Button>
```

---

### Step 8: List Flows to Verify

**Action**: Provide specific test instructions for each changed mutation.

```markdown
## Please Verify These Flows

### Edits (should feel instant):
- [ ] **[Route]**: [Action] - should update immediately, no flicker
- [ ] **[Route]**: [Action] - verify optimistic update + rollback on error

### Deletes (should feel instant):
- [ ] **[Route]**: [Action] - should disappear immediately
- [ ] **[Route]**: [Action] - verify rollback if delete fails

### Creates (changed to non-optimistic):
- [ ] **[Route]**: [Action] - verify:
  - [ ] Button shows loading/disabled state while creating
  - [ ] New item appears after server responds (~0.5-1s)
  - [ ] No console errors
  - [ ] Works on retry after failure
  - [ ] Input is cleared only after success

### Offline behavior (if applicable):
- [ ] Enable offline mode in settings
- [ ] Try edit/delete - should work (optimistic, queued)
- [ ] Try create - should show appropriate offline handling

**Reply with:**
- **"All verified"** - Ready to commit
- **"Issue with [X]"** - I'll investigate
```

---

### Step 9: Commit and Push

**Action**: After user confirms all flows work:

```bash
git add -A
git commit -m "refactor: align React Query mutations with optimistic-only guidelines

Changes:
- [List each hook and what was changed]

Edits/deletes: Now use optimistic-only pattern (no server response handling)
Creates: [Describe create changes if any]

See docs/react-query-mutations.md for guidelines."

git push
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Marking temp-ID creates as "Compliant"

**Wrong**: "useCreatePlan - Optimistic with temp ID ✓"
**Why wrong**: If it uses temp IDs, it's non-compliant regardless of other factors.
**Correct**: Mark as non-compliant, explain temp ID violation.

### ❌ Mistake 2: Confusing `removeQueries` with `setQueryData`

**Wrong**: Marking `onSuccess: () => queryClient.removeQueries(...)` as violation
**Why wrong**: Removing stale cache entries is cleanup, not updating from server.
**Correct**: This is fine after deletes.

### ❌ Mistake 3: Not explaining UX impact for create changes

**Wrong**: "useCreateTodo needs to be non-optimistic" (no explanation)
**Why wrong**: User needs to understand the tradeoff.
**Correct**: Use the full UX impact template.

### ❌ Mistake 4: Saying "optimistic with temp ID" without checking replacement

**Wrong**: Assuming temp ID is fine if onSuccess looks simple
**Check**: Does ANY code path replace temp ID with server ID? Check onSuccess, onError, onSettled.

### ❌ Mistake 5: Missing mutations in components

**Wrong**: Only checking `hooks.ts` files
**Correct**: Also grep for `useMutation` in `.tsx` files (inline mutations).

---

## Final Checklist

Complete ALL items before finishing:

### Phase 1: Understanding
- [ ] Read `docs/react-query-mutations.md` completely
- [ ] Read `docs/state-management.md` mutation section
- [ ] Understand temp ID vs client-generated stable ID distinction
- [ ] Understand what's allowed in onSuccess (removeQueries, Zustand updates)

### Phase 2: Discovery
- [ ] Found ALL files with `useMutation`
- [ ] Searched for temp ID patterns (`temp-`, `tempId`, `Date.now()` in IDs)
- [ ] Checked both `.ts` and `.tsx` files
- [ ] Documented location of each mutation

### Phase 3: Analysis
- [ ] Classified each mutation as edit/delete/create/other
- [ ] For creates: verified whether temp IDs are used
- [ ] For creates: checked if onSuccess replaces temp with server ID
- [ ] For edits/deletes: checked for server response handling
- [ ] For edits/deletes: checked for invalidateQueries calls
- [ ] Marked each as compliant/non-compliant/needs-discussion

### Phase 4: Communication
- [ ] Created summary table with ALL mutations
- [ ] Explained WHY each compliant mutation is compliant
- [ ] Explained EXACT violation for each non-compliant mutation
- [ ] Used UX impact template for EVERY non-compliant create
- [ ] Listed specific questions for "needs discussion" items

### Phase 5: Approval
- [ ] Presented complete summary to user
- [ ] Received explicit approval (or addressed questions)
- [ ] Did NOT proceed without approval

### Phase 6: Implementation
- [ ] Made all approved changes
- [ ] Updated component UX where needed (loading states)
- [ ] No TypeScript errors
- [ ] No lint errors

### Phase 7: Verification
- [ ] Listed specific flows for user to test
- [ ] User confirmed all flows work
- [ ] Committed with descriptive message
- [ ] Pushed to remote
