---
name: workflow-audit
description: Audit the GitHub Agents Workflow source code and documentation for consistency and compliance
disable-model-invocation: true
---

# GitHub Agents Workflow Audit

This command performs a comprehensive audit of the GitHub Agents Workflow system, including:
- **Source code** (`src/agents/`) - Agent implementations, shared utilities, and library abstractions
- **Documentation** (`docs/github-agents-workflow/`) - Workflow guides and reference materials
- **Doc-Code Consistency** - Cross-reference validation between docs and implementation

**Output: This command produces a detailed AUDIT REPORT with all violations and recommendations. It does NOT make any code changes.**

## Report Output Location

**The audit report MUST be saved to a file:**

```
audits/workflow-audit-YYYY-MM-DD.md
```

**Example**: `audits/workflow-audit-2026-01-28.md`

If the `audits/` folder doesn't exist, create it.

**Primary References**:
- [CLAUDE.md - GitHub Agents Workflow Section](mdc:../../CLAUDE.md) - High-level overview
- [docs/github-agents-workflow/](mdc:../../docs/github-agents-workflow/) - Full documentation
- [src/agents/](mdc:../../src/agents/) - Source code

---

## CRITICAL: Read This First

This is a **comprehensive audit**. Before starting, understand:

1. **This will take time** - You'll review the entire workflow system systematically
2. **Create a TODO list FIRST** - Track your progress through each audit area
3. **Collect ALL findings** - Document every violation, inconsistency, and recommendation
4. **DO NOT FIX ANYTHING** - This audit produces a report only, no code changes
5. **Output a comprehensive report** - The final deliverable is a detailed audit with improvement plan

---

## MANDATORY: Create TODO List Before Starting

**You MUST create a TODO list using the `todo_write` tool BEFORE starting any audit work.**

### Step 1: Create Initial TODO List

```
## Initial TODO List (Create This First)

1. [pending] Phase 1: Read all workflow documentation
2. [pending] Phase 2: Discovery - Map all agents, shared code, lib modules, docs
3. [pending] Phase 3.1: Audit Agent Structure (core-agents/)
4. [pending] Phase 3.2: Audit Shared Code (shared/)
5. [pending] Phase 3.3: Audit Library Abstractions (lib/)
6. [pending] Phase 3.4: Audit Main Entry Point (index.ts)
7. [pending] Phase 3.5: Audit Prompt Quality (CRITICAL)
8. [pending] Phase 3.6: Audit E2E Workflow (phases, artifacts, communication)
9. [pending] Phase 3.7: Audit Telegram Webhooks (status updates, actions)
10. [pending] Phase 4: Documentation Audit
11. [pending] Phase 5: Doc-Code Consistency Check
12. [pending] Phase 6: Generate Final Audit Report
```

---

## Process Overview

```
Phase 1: Study Documentation (Required First)
    | - docs/github-agents-workflow/*.md
    | - CLAUDE.md workflow sections
    | - Agent AGENTS.md files
    v
Phase 2: Discovery & Planning
    | - Map all agents in core-agents/
    | - Map shared utilities
    | - Map lib abstractions
    | - Create comprehensive TODO list
    v
Phase 3: Systematic Code Review
    | - 3.1: Agent Structure Compliance
    | - 3.2: Shared Code Patterns
    | - 3.3: Library Abstractions
    | - 3.4: Main Entry & Config
    | - 3.5: Prompt Quality (CRITICAL)
    | - 3.6: E2E Workflow (phases, artifacts)
    | - 3.7: Telegram Webhooks (status updates)
    v
Phase 4: Documentation Audit
    | - Completeness
    | - Accuracy
    | - Quality
    v
Phase 5: Doc-Code Consistency
    | - Cross-reference validation
    | - CLI options match
    | - Status constants match
    v
Phase 6: Generate Final Report
    | - Compile findings
    | - Create improvement plan
    | - DO NOT MAKE CODE CHANGES
```

---

## Phase 1: Study Documentation (Required First)

**Action**: Read and understand ALL workflow documentation before proceeding.

### Required Reading

Read these files completely in order:

#### Overview Documentation
1. **`docs/github-agents-workflow/README.md`** - Entry point
2. **`docs/github-agents-workflow/overview.md`** - System overview
3. **`docs/github-agents-workflow/setup-guide.md`** - Configuration
4. **`docs/github-agents-workflow/workflow-guide.md`** - Step-by-step workflow

#### Agent Documentation
5. **`docs/github-agents-workflow/running-agents.md`** - How to run agents
6. **`docs/github-agents-workflow/multi-phase-features.md`** - L/XL feature handling

#### Technical Documentation
7. **`docs/github-agents-workflow/agent-logging.md`** - Logging patterns
8. **`docs/github-agents-workflow/reference.md`** - API reference
9. **`docs/github-agents-workflow/telegram-integration.md`** - Notifications

#### Agent-Specific AGENTS.md Files
10. **`src/agents/core-agents/*/AGENTS.md`** - Per-agent instructions

### Confirm Understanding

After reading, you should understand:

| Concept | Key Points |
|---------|------------|
| **Workflow Phases** | Backlog -> Product Design -> Tech Design -> Ready -> PR Review -> Done |
| **Agent Types** | productDesign, technicalDesign, implement, prReview |
| **Logging Pattern** | createLogContext, runWithLogContext, logExecutionStart/End |
| **Notification Pattern** | notifyAgentStarted, notifyAgentError, notifyBatchComplete |
| **CLI Pattern** | Commander.js with standard options (--issue, --pr, --all, etc.) |
| **Error Handling** | try/catch with error extraction, proper returns |

---

## Phase 2: Discovery & Planning

**Action**: Map the entire workflow codebase and create a comprehensive TODO list.

### Step 2.1: Discover All Agents

```bash
# List all agents
ls -la src/agents/core-agents/

# For each agent, check structure
ls -la src/agents/core-agents/*/
```

**Create a table of all agents:**

| Agent | Has index.ts | Has AGENTS.md | CLI Pattern | Logging Pattern | Status |
|-------|--------------|---------------|-------------|-----------------|--------|
| implementAgent | Y/N | Y/N | Y/N | Y/N | |
| productDesignAgent | Y/N | Y/N | Y/N | Y/N | |
| technicalDesignAgent | Y/N | Y/N | Y/N | Y/N | |
| prReviewAgent | Y/N | Y/N | Y/N | Y/N | |
| productDevelopmentAgent | Y/N | Y/N | Y/N | Y/N | |

### Step 2.2: Discover Shared Utilities

```bash
# List shared modules
ls -la src/agents/shared/
```

**Create a table of shared modules:**

| Module | Purpose | Exports | Used By |
|--------|---------|---------|---------|
| config.ts | Configuration | | |
| notifications.ts | Telegram notifications | | |
| prompts.ts | Agent prompts | | |
| utils.ts | Utility functions | | |
| types.ts | Type definitions | | |
| output-schemas.ts | Output parsing | | |
| agent-identity.ts | Agent metadata | | |
| loadEnv.ts | Environment loading | | |

### Step 2.3: Discover Library Abstractions

```bash
# List lib modules
ls -la src/agents/lib/
ls -la src/agents/lib/adapters/
ls -la src/agents/lib/logging/
```

**Create a table of lib modules:**

| Module | Purpose | Exports |
|--------|---------|---------|
| index.ts | Main entry | |
| artifacts.ts | Artifact handling | |
| commitMessage.ts | Commit message generation | |
| design-files.ts | Design file handling | |
| phases.ts | Phase management | |
| parsing.ts | Output parsing | |
| types.ts | Type definitions | |
| config.ts | Config | |
| pricing.ts | Cost tracking | |
| devServer.ts | Development server | |
| adapters/ | CLI adapters | |
| logging/ | Logging utilities | |

### Step 2.4: Discover Documentation Files

```bash
# List all workflow docs
ls -la docs/github-agents-workflow/
```

**Create a table of all documentation:**

| File | Topic | Last Updated | Status |
|------|-------|--------------|--------|
| README.md | Entry point | | |
| overview.md | System overview | | |
| setup-guide.md | Setup instructions | | |
| workflow-guide.md | Workflow steps | | |
| running-agents.md | Running agents | | |
| multi-phase-features.md | L/XL features | | |
| agent-logging.md | Logging patterns | | |
| reference.md | API reference | | |
| telegram-integration.md | Notifications | | |
| troubleshooting.md | Common issues | | |
| feedback-and-reviews.md | Feedback system | | |
| mongodb-github-status.md | Status tracking | | |
| workflow-e2e.md | E2E workflow | | |

### Step 2.5: Update TODO List With Discoveries

**DO NOT PROCEED to Phase 3 without updating your TODO list with specific items for each agent, module, and doc file discovered.**

---

## Phase 3: Systematic Code Review

### 3.1: Agent Structure Audit

For EACH agent in `core-agents/`, check:

#### 3.1.1: File Structure

| Check | Expected | Status |
|-------|----------|--------|
| `index.ts` exists | Y | |
| `AGENTS.md` exists | Y | |
| Exports main function | Y | |

#### 3.1.2: CLI Pattern Compliance

All agents should use Commander.js with consistent patterns:

```typescript
// REQUIRED: Commander.js setup
import { Command } from 'commander';

const program = new Command();
program
    .name('agent-name')
    .description('Agent description')
    .option('--issue <number>', 'GitHub issue number')
    .option('--pr <number>', 'GitHub PR number')
    .option('--all', 'Process all eligible items')
    .option('--dry-run', 'Preview without making changes')
    .action(async (options) => { ... });
```

| Check | Status |
|-------|--------|
| Uses Commander.js | |
| Has `--issue` or `--pr` option (where applicable) | |
| Has `--all` option | |
| Has `--dry-run` option (where applicable) | |
| Consistent option naming | |

#### 3.1.3: Logging Pattern Compliance

All agents MUST use the logging context pattern:

```typescript
// REQUIRED: Logging pattern
import { createLogContext, runWithLogContext } from '../lib/logging';
import { logExecutionStart, logExecutionEnd, getAgentLogger } from '../lib/logging';

const log = getAgentLogger('agent-name');

async function main() {
    const ctx = createLogContext('agent-name', { /* metadata */ });

    return runWithLogContext(ctx, async () => {
        logExecutionStart(ctx, 'operation-name');

        try {
            // Agent logic
            logExecutionEnd(ctx, 'operation-name', 'success');
        } catch (error) {
            logExecutionEnd(ctx, 'operation-name', 'error', error);
            throw error;
        }
    });
}
```

| Check | Status |
|-------|--------|
| Uses `createLogContext` | |
| Uses `runWithLogContext` | |
| Uses `logExecutionStart`/`logExecutionEnd` | |
| Uses `getAgentLogger` | |
| Logs are contextual (not ad-hoc console.log) | |

#### 3.1.4: Notification Pattern Compliance

Agents should use shared notification functions:

```typescript
// REQUIRED: Notification pattern
import { notifyAgentStarted, notifyAgentError, notifyBatchComplete } from '../shared/notifications';

// At start
await notifyAgentStarted('agent-name', { issue: 123 });

// On error
await notifyAgentError('agent-name', error, { issue: 123 });

// On batch complete
await notifyBatchComplete('agent-name', results);
```

| Check | Status |
|-------|--------|
| Uses `notifyAgentStarted` | |
| Uses `notifyAgentError` on failures | |
| Uses `notifyBatchComplete` for batch operations | |
| Consistent notification format | |

#### 3.1.5: Error Handling Pattern

All agents MUST have consistent error handling:

```typescript
// REQUIRED: Error handling pattern
try {
    // Agent logic
    return { success: true, data };
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Operation failed', { error: message });
    await notifyAgentError('agent-name', error, context);
    return { success: false, error: message };
}
```

| Check | Status |
|-------|--------|
| Uses try/catch at top level | |
| Extracts error message properly | |
| Sends notification on error | |
| Returns structured result | |
| Does not swallow errors silently | |

#### 3.1.6: Type Safety

| Check | Status |
|-------|--------|
| No `any` types | |
| No `as any` casts | |
| Function parameters typed | |
| Return types specified | |
| Uses shared types from `shared/types.ts` | |

#### 3.1.7: AGENTS.md Quality

| Check | Status |
|-------|--------|
| Describes agent purpose | |
| Documents CLI options | |
| Explains workflow integration | |
| Includes usage examples | |
| Current/accurate | |

---

### 3.2: Shared Code Audit

For each module in `src/agents/shared/`:

#### 3.2.1: config.ts

| Check | Status |
|-------|--------|
| Exports configuration constants | |
| Uses environment variables safely | |
| Has sensible defaults | |
| Well-documented | |

#### 3.2.2: notifications.ts

| Check | Status |
|-------|--------|
| Exports `notifyAgentStarted` | |
| Exports `notifyAgentError` | |
| Exports `notifyBatchComplete` | |
| Handles missing Telegram config gracefully | |
| Consistent message formatting | |

#### 3.2.3: prompts.ts

| Check | Status |
|-------|--------|
| Organizes prompts by agent type | |
| Uses template strings cleanly | |
| Avoids hardcoded values | |
| Well-documented sections | |

#### 3.2.4: utils.ts

| Check | Status |
|-------|--------|
| Pure utility functions | |
| No side effects | |
| Well-typed | |
| Reused across agents | |

#### 3.2.5: types.ts

| Check | Status |
|-------|--------|
| Defines workflow types | |
| Defines status types | |
| Exports all types needed by agents | |
| No duplicated types (centralized) | |

#### 3.2.6: output-schemas.ts

| Check | Status |
|-------|--------|
| Defines expected output formats | |
| Used for parsing agent responses | |
| Validates outputs correctly | |

---

### 3.3: Library Abstractions Audit

For each module in `src/agents/lib/`:

#### 3.3.1: index.ts (Main Entry)

| Check | Status |
|-------|--------|
| Re-exports public API | |
| Clean public interface | |
| No implementation details leaked | |

#### 3.3.2: artifacts.ts

| Check | Status |
|-------|--------|
| Handles artifact creation | |
| Handles artifact retrieval | |
| Proper error handling | |

#### 3.3.3: commitMessage.ts

| Check | Status |
|-------|--------|
| Generates commit messages | |
| Follows commit message conventions | |
| Handles multi-phase features | |

#### 3.3.4: design-files.ts

| Check | Status |
|-------|--------|
| Handles design doc creation | |
| Handles design doc retrieval | |
| Uses correct paths | |

#### 3.3.5: phases.ts

| Check | Status |
|-------|--------|
| Manages multi-phase feature logic | |
| Tracks current phase | |
| Determines next phase | |

#### 3.3.6: logging/

| Check | Status |
|-------|--------|
| Exports `createLogContext` | |
| Exports `runWithLogContext` | |
| Exports `logExecutionStart`/`logExecutionEnd` | |
| Exports `getAgentLogger` | |
| Creates log files | |
| Structured logging format | |

#### 3.3.7: adapters/

| Check | Status |
|-------|--------|
| Has README or documentation | |
| Consistent adapter interface | |
| Supports multiple CLI tools | |

#### 3.3.8: parsing.ts

| Check | Status |
|-------|--------|
| Parses agent outputs | |
| Extracts markdown/code | |
| Handles edge cases | |

---

### 3.4: Main Entry & Config Audit

#### 3.4.1: src/agents/index.ts

| Check | Status |
|-------|--------|
| Entry point for running agents | |
| Proper CLI setup | |
| Handles all agent types | |
| Error handling | |

#### 3.4.2: src/agents/agents.config.ts

| Check | Status |
|-------|--------|
| Defines all configuration | |
| Uses environment variables | |
| Has validation | |
| Documents all options | |

#### 3.4.3: src/agents/auto-advance.ts

| Check | Status |
|-------|--------|
| Handles workflow auto-advancement | |
| Correct status transitions | |
| Proper GitHub Project updates | |

---

### 3.5: Prompt Quality Audit (CRITICAL)

Prompts are the core of agent behavior. Poor prompts lead to inconsistent outputs, missed requirements, and wasted tokens. This section audits both the structure and quality of all prompts.

**Primary file**: `src/agents/shared/prompts.ts`
**Supporting files**: `src/agents/core-agents/*/AGENTS.md`, `src/agents/lib/prompts/`

#### 3.5.1: Prompt Discovery

```bash
# Find all prompt definitions
grep -r "const.*Prompt\|export.*prompt\|function.*Prompt" src/agents/ --include="*.ts"

# Find all template literals used as prompts
grep -r "You are\|Your task\|Instructions:" src/agents/ --include="*.ts" | head -30

# Check AGENTS.md files for inline prompts
grep -r "## Prompt\|## Instructions\|## System" src/agents/core-agents/ --include="*.md"
```

**Create inventory of all prompts:**

| Prompt Name | Location | Agent(s) Used By | Approx Tokens | Status |
|-------------|----------|------------------|---------------|--------|
| | | | | |

#### 3.5.2: Prompt Structure Compliance

Each prompt SHOULD follow a consistent structure:

```
1. Role/Identity - Who the agent is
2. Context - What situation/project
3. Task - What to accomplish
4. Constraints - Rules and limitations
5. Output Format - Expected structure
6. Examples (if needed) - Concrete demonstrations
```

**Per-prompt checklist:**

| Check | Status |
|-------|--------|
| Has clear role/identity statement | |
| Provides necessary context | |
| States task clearly | |
| Defines constraints/rules | |
| Specifies output format | |
| Includes examples where helpful | |

#### 3.5.3: Prompt Quality Criteria

For EACH major prompt, evaluate:

##### Clarity & Precision

| Check | Status |
|-------|--------|
| Instructions are unambiguous | |
| No conflicting directives | |
| Uses consistent terminology | |
| Avoids vague terms ("good", "appropriate", "as needed") | |
| Specific about what to include/exclude | |

##### Completeness

| Check | Status |
|-------|--------|
| Covers all expected scenarios | |
| Handles edge cases explicitly | |
| Defines error handling behavior | |
| Specifies behavior for missing data | |
| Includes necessary context (project info, constraints) | |

##### Output Specification

| Check | Status |
|-------|--------|
| Output format is clearly defined | |
| Uses structured format (JSON, markdown sections) | |
| Specifies required vs optional fields | |
| Provides output examples | |
| Handles multi-part outputs correctly | |

##### Token Efficiency

| Check | Status |
|-------|--------|
| No unnecessary repetition | |
| Concise where possible | |
| Avoids bloated examples | |
| Uses references instead of duplicating content | |
| Separates reusable parts into functions/templates | |

##### Maintainability

| Check | Status |
|-------|--------|
| Organized into logical sections | |
| Uses template functions for dynamic content | |
| Variables/placeholders clearly marked | |
| Comments explain non-obvious parts | |
| Easy to update without breaking | |

#### 3.5.4: Agent-Specific Prompt Checks

For each agent type, verify prompts include critical requirements:

##### Product Design Agent Prompts

| Check | Status |
|-------|--------|
| Understands feature request context | |
| Focuses on user experience | |
| Considers edge cases | |
| Outputs design document structure | |
| Handles both features and bugs appropriately | |

##### Technical Design Agent Prompts

| Check | Status |
|-------|--------|
| Understands codebase context | |
| Considers architecture patterns | |
| Identifies affected files | |
| Determines size/complexity (S/M/L/XL) | |
| Plans multi-phase approach for large features | |
| Outputs implementation plan structure | |

##### Implementation Agent Prompts

| Check | Status |
|-------|--------|
| Receives design documents as context | |
| Follows coding guidelines | |
| Handles multi-phase implementation | |
| Specifies commit message format | |
| Includes testing expectations | |
| Handles error recovery | |

##### PR Review Agent Prompts

| Check | Status |
|-------|--------|
| Reviews against original requirements | |
| Checks code quality | |
| Validates against design docs | |
| Provides actionable feedback | |
| Distinguishes blocking vs non-blocking issues | |
| Handles phase-aware review for multi-phase features | |

#### 3.5.5: Prompt Consistency Check

Verify consistency across all prompts:

| Check | Status |
|-------|--------|
| Consistent tone across agents | |
| Consistent terminology for workflow concepts | |
| Consistent output format markers | |
| Consistent error handling instructions | |
| Consistent reference to project/codebase | |

#### 3.5.6: Dynamic Content Handling

Check how prompts handle variable content:

```typescript
// GOOD: Clean template function
function createPrompt(context: PromptContext): string {
    return `
        ## Context
        Project: ${context.projectName}
        Issue: #${context.issueNumber}

        ## Task
        ${context.task}
    `;
}

// BAD: Inline string concatenation
const prompt = "You are working on " + projectName + " and need to " + task;
```

| Check | Status |
|-------|--------|
| Uses template functions for dynamic content | |
| Context variables are typed | |
| Handles missing/optional context gracefully | |
| No raw string concatenation | |

#### 3.5.7: Prompt-Output Schema Alignment

Verify prompts align with expected output schemas:

```bash
# Compare prompt output specs with output-schemas.ts
cat src/agents/shared/output-schemas.ts
cat src/agents/shared/prompts.ts | grep -A20 "Output Format\|Expected Output"
```

| Agent | Prompt Output Spec | Schema Definition | Match? |
|-------|-------------------|-------------------|--------|
| productDesign | | | |
| technicalDesign | | | |
| implement | | | |
| prReview | | | |

#### 3.5.8: Prompt Testing & Validation

| Check | Status |
|-------|--------|
| Prompts have been tested with real examples | |
| Edge cases have been validated | |
| Output parsing handles actual prompt outputs | |
| Token count is reasonable for model limits | |

#### 3.5.9: Common Prompt Issues

Look for these common problems:

| Issue | How to Find | Impact |
|-------|-------------|--------|
| **Vague instructions** | Search for "appropriate", "as needed", "good" | Inconsistent outputs |
| **Missing output format** | Check if format is specified | Parsing failures |
| **Conflicting directives** | Read through for contradictions | Confused behavior |
| **Too much context** | Check token count | Wasted tokens, truncation |
| **Too little context** | Check if agent has needed info | Wrong assumptions |
| **Hardcoded values** | Search for literals in prompts | Maintenance burden |
| **No error handling** | Check for failure case instructions | Silent failures |
| **Missing examples** | Check complex prompts for examples | Misunderstanding |

#### 3.5.10: Prompt Quality Summary Table

Create a summary for each prompt:

| Prompt | Clarity | Completeness | Output Spec | Efficiency | Overall |
|--------|---------|--------------|-------------|------------|---------|
| productDesignPrompt | 1-5 | 1-5 | 1-5 | 1-5 | 1-5 |
| techDesignPrompt | 1-5 | 1-5 | 1-5 | 1-5 | 1-5 |
| implementPrompt | 1-5 | 1-5 | 1-5 | 1-5 | 1-5 |
| prReviewPrompt | 1-5 | 1-5 | 1-5 | 1-5 | 1-5 |

**Rating Scale:**
- 5: Excellent - Clear, complete, well-structured
- 4: Good - Minor improvements possible
- 3: Adequate - Works but has notable gaps
- 2: Poor - Significant issues affecting quality
- 1: Critical - Major rewrite needed

---

### 3.6: E2E Workflow Audit

This section audits the end-to-end workflow: how phases connect, how agents communicate, artifact flow, and overall workflow coherence.

#### 3.6.1: Workflow Phase Analysis

Map the complete workflow and verify each phase is correctly implemented:

```
User Submits Feature/Bug
        ↓
┌───────────────────────────────────────────────────────────────┐
│ PHASE 1: Backlog (MongoDB: new, GitHub: Backlog)              │
│ - Item created in MongoDB                                      │
│ - Item appears in GitHub Project                               │
│ - Telegram notification sent to owner                          │
│ - Owner approves/rejects via Telegram                          │
└───────────────────────────────────────────────────────────────┘
        ↓ (on approval)
┌───────────────────────────────────────────────────────────────┐
│ PHASE 2: Product Design (optional) (GitHub: Product Design)   │
│ - Product Design Agent runs                                    │
│ - Creates design doc in feature-designs/                       │
│ - Creates PR for design review                                 │
│ - Owner approves design PR                                     │
└───────────────────────────────────────────────────────────────┘
        ↓ (on merge or skip)
┌───────────────────────────────────────────────────────────────┐
│ PHASE 3: Tech Design (GitHub: Tech Design)                    │
│ - Tech Design Agent runs                                       │
│ - Creates tech design doc                                      │
│ - Determines size (S/M/L/XL)                                   │
│ - For L/XL: plans phases                                       │
│ - Creates PR for design review                                 │
│ - Owner approves design PR                                     │
└───────────────────────────────────────────────────────────────┘
        ↓ (on merge)
┌───────────────────────────────────────────────────────────────┐
│ PHASE 4: Ready for Development (GitHub: Ready)                │
│ - Implementation Agent runs                                    │
│ - Reads design docs as context                                 │
│ - Implements changes                                           │
│ - Creates implementation PR                                    │
│ - For L/XL: implements one phase at a time                     │
└───────────────────────────────────────────────────────────────┘
        ↓ (PR created)
┌───────────────────────────────────────────────────────────────┐
│ PHASE 5: PR Review (GitHub: PR Review)                        │
│ - PR Review Agent runs                                         │
│ - Reviews against design docs                                  │
│ - Reviews code quality                                         │
│ - Posts review comments                                        │
│ - Owner merges or requests changes                             │
└───────────────────────────────────────────────────────────────┘
        ↓ (on merge)
┌───────────────────────────────────────────────────────────────┐
│ PHASE 6: Done (MongoDB: done, GitHub: Done)                   │
│ - Status updated to done                                       │
│ - For L/XL: next phase starts OR marked done                   │
│ - Telegram notification sent                                   │
└───────────────────────────────────────────────────────────────┘
```

**Phase Verification Checklist:**

| Phase | Entry Condition | Exit Condition | Agent | Artifacts | Status |
|-------|-----------------|----------------|-------|-----------|--------|
| Backlog | Item created | Approved via Telegram | None | MongoDB doc | |
| Product Design | Routed here | Design PR merged | productDesign | design doc | |
| Tech Design | Previous complete | Design PR merged | technicalDesign | tech design | |
| Ready | Design approved | Impl PR created | implement | code changes | |
| PR Review | PR created | PR merged | prReview | review comments | |
| Done | PR merged | N/A | None | Updated status | |

#### 3.6.2: Agent Communication Audit

How do agents pass information between phases?

##### Design Documents as Communication

| Check | Status |
|-------|--------|
| Product design output is readable by tech design agent | |
| Tech design output is readable by implement agent | |
| Original issue/request is available to all agents | |
| Design docs stored in consistent location | |
| Design doc format is standardized | |

##### Artifact Flow

```bash
# Trace artifact flow
grep -r "feature-designs\|design-docs\|artifacts" src/agents/ --include="*.ts" | head -20
```

| Artifact | Created By | Used By | Location | Status |
|----------|------------|---------|----------|--------|
| Product Design Doc | productDesign | technicalDesign, implement | feature-designs/ | |
| Tech Design Doc | technicalDesign | implement, prReview | feature-designs/ | |
| Implementation PR | implement | prReview | GitHub PR | |
| Review Comments | prReview | (human) | GitHub PR | |

##### Context Passing

| Check | Status |
|-------|--------|
| Issue number passed between phases | |
| Design docs referenced correctly | |
| Phase info tracked for multi-phase | |
| Previous agent output available | |

#### 3.6.3: Status Synchronization

Verify MongoDB and GitHub Project statuses stay in sync:

```bash
# Check status update logic
grep -r "updateStatus\|setStatus\|STATUSES" src/agents/ --include="*.ts" | head -30
```

| Transition | MongoDB Status | GitHub Status | Auto-Advance? | Status |
|------------|----------------|---------------|---------------|--------|
| Created → Backlog | new | Backlog | No | |
| Approved → Product Design | in_progress | Product Design | Yes | |
| Approved → Tech Design | in_progress | Tech Design | Yes | |
| Design Merged → Ready | in_progress | Ready | Yes | |
| PR Created → PR Review | in_progress | PR Review | Yes | |
| PR Merged → Done | done | Done | Yes | |

| Check | Status |
|-------|--------|
| Status updates are atomic | |
| Failed updates don't leave inconsistent state | |
| Both MongoDB and GitHub are updated | |
| Auto-advance logic is correct | |

#### 3.6.4: Multi-Phase Feature Flow

For L/XL features with multiple phases:

```bash
# Check multi-phase logic
grep -r "phase\|Phase\|PHASE" src/agents/ --include="*.ts" | head -30
```

| Check | Status |
|-------|--------|
| Phase count determined in tech design | |
| Current phase tracked in metadata | |
| Implementation agent knows which phase to implement | |
| PR review is phase-aware | |
| Next phase starts after current phase PR merged | |
| All phases complete before marking done | |

##### Multi-Phase Artifact Naming

| Check | Status |
|-------|--------|
| Phase number in commit messages | |
| Phase number in PR titles | |
| Phase tracking in MongoDB | |
| Clear phase boundaries in code | |

#### 3.6.5: Error Recovery & Edge Cases

How does the workflow handle failures?

| Scenario | Expected Behavior | Implemented? | Status |
|----------|-------------------|--------------|--------|
| Agent fails mid-execution | Error logged, notification sent, can retry | | |
| Design PR rejected | Owner can re-run design agent | | |
| Implementation PR rejected | Owner can re-run implement agent | | |
| Network failure during status update | Retry logic, doesn't break workflow | | |
| Missing design doc | Implementation agent errors clearly | | |
| Invalid issue number | Clear error message | | |
| Already processed item | Skips or warns, doesn't duplicate | | |

#### 3.6.6: Workflow Configuration

Verify workflow can be configured:

| Check | Status |
|-------|--------|
| Phases can be skipped (e.g., skip product design) | |
| Different item types (feature vs bug) handled correctly | |
| Routing options work (direct to tech design) | |
| Size-based behavior (S/M vs L/XL) works | |

#### 3.6.7: Workflow Timing & Triggers

How are agents triggered?

| Check | Status |
|-------|--------|
| Manual trigger via CLI works | |
| `--all` batch processing works | |
| Auto-advance after merge works | |
| Telegram quick actions work | |
| No race conditions on concurrent runs | |

#### 3.6.8: Workflow Observability

Can you understand what's happening?

| Check | Status |
|-------|--------|
| Workflow progress visible in GitHub Project | |
| Logs capture workflow state | |
| Telegram notifications at key points | |
| Error notifications include context | |
| Can determine current phase for any item | |

#### 3.6.9: E2E Workflow Summary

| Aspect | Score (1-5) | Notes |
|--------|-------------|-------|
| Phase Completeness | | |
| Agent Communication | | |
| Artifact Management | | |
| Status Synchronization | | |
| Multi-Phase Support | | |
| Error Handling | | |
| Configurability | | |
| Observability | | |
| **Overall E2E Score** | | |

---

### 3.7: Telegram Webhooks Audit

Telegram webhooks handle critical workflow actions: approvals, rejections, merges, and routing. Issues here can break the entire workflow or leave items in inconsistent states.

**Primary locations**:
- `src/pages/api/telegram/` - Webhook API routes
- `src/server/telegram/` - Telegram utilities
- `src/agents/shared/notifications.ts` - Notification functions

#### 3.7.1: Webhook Discovery

```bash
# Find all Telegram webhook handlers
find src -path "*telegram*" -name "*.ts" | head -20

# Find callback query handlers
grep -r "callback_query\|callbackQuery\|callback_data" src --include="*.ts" | head -20

# Find inline button definitions
grep -r "inline_keyboard\|InlineKeyboard" src --include="*.ts" | head -20
```

**Create webhook inventory:**

| Webhook/Handler | Location | Actions Handled | Status |
|-----------------|----------|-----------------|--------|
| | | | |

#### 3.7.2: Quick Action Buttons Audit

Telegram messages include inline buttons for quick actions. Verify all buttons:

##### Approval Flow Buttons

| Button | Action | Status Update | Status |
|--------|--------|---------------|--------|
| Approve | Approve feature/bug | new → in_progress | |
| Reject | Reject feature/bug | new → rejected | |
| Route to Product Design | Skip to product design | Update GitHub column | |
| Route to Tech Design | Skip to tech design | Update GitHub column | |

##### PR Action Buttons

| Button | Action | Status Update | Status |
|--------|--------|---------------|--------|
| Merge PR | Merge the PR | in_progress → done (or next phase) | |
| Request Changes | Flag for revision | Stays in PR Review | |
| View PR | Open PR in browser | None | |

##### Other Action Buttons

| Button | Action | Status Update | Status |
|--------|--------|---------------|--------|
| View Issue | Open issue in browser | None | |
| Re-run Agent | Trigger agent re-run | None | |
| | | | |

#### 3.7.3: Callback Handler Verification

For each callback action, verify:

```typescript
// Expected pattern for callback handlers
async function handleCallback(callbackData: string, chatId: number, messageId: number) {
    try {
        // 1. Parse callback data
        const { action, itemId, ...params } = parseCallbackData(callbackData);

        // 2. Validate permissions
        if (!isAuthorized(chatId)) {
            return sendError('Unauthorized');
        }

        // 3. Perform action
        const result = await performAction(action, itemId, params);

        // 4. Update message (remove buttons or show result)
        await updateMessage(chatId, messageId, result);

        // 5. Send confirmation
        await answerCallbackQuery(queryId, 'Action completed');

    } catch (error) {
        // 6. Error handling
        await answerCallbackQuery(queryId, 'Error: ' + error.message);
        await notifyError(error);
    }
}
```

| Check | Status |
|-------|--------|
| Callback data is parsed safely | |
| Actions are validated before execution | |
| Authorization is checked | |
| Message is updated after action | |
| Callback query is answered (prevents loading state) | |
| Errors are handled gracefully | |
| Errors don't leave inconsistent state | |

#### 3.7.4: Status Update Actions

These are CRITICAL - wrong status updates break the workflow.

```bash
# Find all status update calls in webhook handlers
grep -r "updateStatus\|setStatus\|STATUSES" src/pages/api/telegram --include="*.ts"
grep -r "updateStatus\|setStatus\|STATUSES" src/server/telegram --include="*.ts"
```

| Action | MongoDB Update | GitHub Project Update | Both Synced? | Status |
|--------|----------------|----------------------|--------------|--------|
| Approve | new → in_progress | Backlog → [routed column] | | |
| Reject | new → rejected | Remove from board? | | |
| Merge PR | in_progress → done | PR Review → Done | | |
| Route to Product Design | (none?) | → Product Design | | |
| Route to Tech Design | (none?) | → Tech Design | | |

| Check | Status |
|-------|--------|
| MongoDB and GitHub are BOTH updated | |
| Updates are atomic (both succeed or both fail) | |
| Failure in one doesn't leave other inconsistent | |
| Status values match constants in code | |

#### 3.7.5: Webhook Security

| Check | Status |
|-------|--------|
| Webhook validates Telegram signature/token | |
| Only authorized chat IDs can trigger actions | |
| Callback data cannot be spoofed | |
| No sensitive data in callback payloads | |
| Rate limiting in place | |

#### 3.7.6: Message Formatting

Verify notification messages are clear and consistent:

```bash
# Find message formatting
grep -r "sendMessage\|editMessageText" src --include="*.ts" -A5 | head -50
```

| Check | Status |
|-------|--------|
| Messages include item title/number | |
| Messages include relevant links | |
| Messages are not too long | |
| Markdown/HTML formatting is valid | |
| Emojis used consistently | |
| Error messages are clear | |

#### 3.7.7: Button State Management

After an action, buttons should be updated:

| Check | Status |
|-------|--------|
| Buttons removed after action taken | |
| Or buttons disabled/updated to show state | |
| No stale buttons that trigger duplicate actions | |
| Loading states shown during action | |

#### 3.7.8: Error Scenarios

| Scenario | Expected Behavior | Implemented? | Status |
|----------|-------------------|--------------|--------|
| Invalid callback data | Error message, no action | | |
| Item already processed | Inform user, no duplicate action | | |
| GitHub API failure | Error message, rollback MongoDB if needed | | |
| MongoDB failure | Error message, don't update GitHub | | |
| Network timeout | Retry logic or clear error | | |
| Unauthorized user | Reject action, log attempt | | |
| Malformed message | Graceful error, don't crash | | |

#### 3.7.9: Webhook Logging

| Check | Status |
|-------|--------|
| All webhook calls are logged | |
| Callback actions are logged with context | |
| Errors are logged with full details | |
| Sensitive data not logged (tokens, etc.) | |
| Logs help debug issues | |

#### 3.7.10: Multi-Phase Feature Handling

For L/XL features with multiple phases:

| Check | Status |
|-------|--------|
| Merge button knows current phase | |
| After merge, next phase is triggered (not marked done) | |
| Final phase merge marks item as done | |
| Phase info shown in messages | |

#### 3.7.11: Webhook Testing

| Check | Status |
|-------|--------|
| Webhooks can be tested locally (ngrok, etc.) | |
| Test commands/buttons available | |
| Dry-run mode for testing actions | |

#### 3.7.12: Telegram Webhook Summary

| Aspect | Score (1-5) | Notes |
|--------|-------------|-------|
| Button Coverage | | |
| Status Update Accuracy | | |
| Error Handling | | |
| Security | | |
| Message Clarity | | |
| State Management | | |
| Logging | | |
| **Overall Webhook Score** | | |

---

## Phase 4: Documentation Audit

### 4.1: Completeness Check

For each doc, verify it covers what it should:

| Doc | Required Content | Status |
|-----|------------------|--------|
| README.md | Overview, quick start, links | |
| overview.md | Full system overview, architecture | |
| setup-guide.md | All setup steps, env vars, tokens | |
| workflow-guide.md | All workflow phases, transitions | |
| running-agents.md | All CLI commands, options | |
| multi-phase-features.md | Phase detection, transitions | |
| agent-logging.md | Logging patterns, file locations | |
| reference.md | All types, constants, configs | |
| telegram-integration.md | Setup, message formats | |
| troubleshooting.md | Common issues, solutions | |

### 4.2: Accuracy Check

For each doc, verify content matches implementation:

| Doc | Accuracy Check | Status |
|-----|----------------|--------|
| CLI options match actual options | | |
| Status values match code constants | | |
| File paths referenced exist | | |
| Code examples are valid/current | | |
| Environment variables are correct | | |

### 4.3: Quality Check

| Doc | Quality Check | Status |
|-----|---------------|--------|
| Clear explanations | | |
| Proper structure/headings | | |
| Working links | | |
| No outdated info | | |
| Consistent terminology | | |

---

## Phase 5: Doc-Code Consistency Check

### 5.1: CLI Options Validation

Compare documented CLI options with actual implementation:

```bash
# Check actual CLI options in each agent
grep -r "\.option(" src/agents/core-agents/ --include="*.ts"
grep -r "\.option(" src/agents/index.ts

# Compare with docs/github-agents-workflow/running-agents.md
```

| Agent | Documented Options | Actual Options | Match? |
|-------|-------------------|----------------|--------|
| implementAgent | | | |
| productDesignAgent | | | |
| technicalDesignAgent | | | |
| prReviewAgent | | | |

### 5.2: Status Constants Validation

Compare documented status values with code:

```bash
# Find status constants in code
grep -r "STATUSES\|WorkflowName\|STATUS" src/agents/shared/ --include="*.ts"
grep -r "status.*=.*'" src/agents/ --include="*.ts" | head -30

# Compare with docs/github-agents-workflow/reference.md
```

| Status Type | Documented Values | Code Values | Match? |
|-------------|-------------------|-------------|--------|
| MongoDB Status | | | |
| GitHub Project Status | | | |
| Workflow Names | | | |

### 5.3: Configuration Validation

Compare documented configuration with actual config:

```bash
# Check agents.config.ts
cat src/agents/agents.config.ts

# Compare with docs/github-agents-workflow/setup-guide.md
```

| Config Option | Documented | In Code | Match? |
|---------------|------------|---------|--------|
| GitHub Project ID | | | |
| Telegram Chat IDs | | | |
| Agent-specific configs | | | |

### 5.4: Agent Name Validation

Compare documented agent names with actual directories:

| Documented Name | Directory Name | Match? |
|-----------------|----------------|--------|
| | implementAgent | |
| | productDesignAgent | |
| | technicalDesignAgent | |
| | prReviewAgent | |
| | productDevelopmentAgent | |

### 5.5: Code Examples Validation

For each code example in docs, verify:

| Doc | Example | Valid? | Issue |
|-----|---------|--------|-------|
| | | | |

---

## Phase 6: Generate Final Audit Report

**CRITICAL: This is the final output. DO NOT make any code changes.**

### 6.1: Create Output File

**Action**: Create the audit report file:

```
audits/workflow-audit-YYYY-MM-DD.md
```

### 6.2: Report Template

Use this template for the final report:

```markdown
# Workflow Audit Report

**Generated**: YYYY-MM-DD
**Scope**: GitHub Agents Workflow (`src/agents/`, `docs/github-agents-workflow/`)
**Status**: X% Compliant

---

## Executive Summary

| Area | Total Items | Compliant | Issues | Compliance % |
|------|-------------|-----------|--------|--------------|
| Agent Structure | X | X | X | XX% |
| Shared Code | X | X | X | XX% |
| Library Abstractions | X | X | X | XX% |
| Prompt Quality | X | X | X | XX% |
| E2E Workflow | X | X | X | XX% |
| Telegram Webhooks | X | X | X | XX% |
| Documentation | X | X | X | XX% |
| Doc-Code Sync | X | X | X | XX% |
| **Total** | **X** | **X** | **X** | **XX%** |

### Overall Health Score: [X/10]

---

## Critical Issues (Must Fix)

Issues that cause bugs, break workflows, or create confusion.

| # | Area | File | Issue | Impact |
|---|------|------|-------|--------|
| 1 | | | | |

---

## High Priority Issues

Issues that affect consistency or developer experience.

| # | Area | File | Issue | Impact |
|---|------|------|-------|--------|
| 1 | | | | |

---

## Medium Priority Issues

Issues that should be fixed but don't cause immediate problems.

| # | Area | File | Issue | Impact |
|---|------|------|-------|--------|
| 1 | | | | |

---

## Recommendations

Best practice improvements and nice-to-haves.

| # | Area | Recommendation |
|---|------|----------------|
| 1 | | |

---

## Compliant Areas

Areas that fully meet guidelines.

| Area | Details |
|------|---------|
| | |

---

## Documentation Issues

| Doc | Issue | Update Needed |
|-----|-------|---------------|
| | | |

---

## Doc-Code Inconsistencies

| Area | Doc Says | Code Does | Resolution |
|------|----------|-----------|------------|
| | | | |

---

## Fix Plan

### Overview

| Phase | Description | Files Affected | Priority |
|-------|-------------|----------------|----------|
| 1 | Critical Fixes | X | Critical |
| 2 | Consistency Fixes | X | High |
| 3 | Documentation Updates | X | Medium |
| 4 | Best Practices | X | Low |

### Phase 1: Critical Fixes

- [ ] **Fix 1**: [Description]
  - File: `path/to/file.ts`
  - Issue: [What's wrong]
  - Fix: [What to do]

### Phase 2: Consistency Fixes

- [ ] **Fix 1**: [Description]
  - File: `path/to/file.ts`
  - Issue: [What's wrong]
  - Fix: [What to do]

### Phase 3: Documentation Updates

- [ ] **Update 1**: [Description]
  - File: `docs/github-agents-workflow/[name].md`
  - Issue: [What's wrong]
  - Fix: [What to do]

### Phase 4: Best Practices

- [ ] **Improvement 1**: [Description]
  - Issue: [Current state]
  - Improvement: [What to improve]

---

## Final Verification Checklist

Complete after ALL fixes are implemented:

### Code Quality
- [ ] All agents use consistent logging pattern
- [ ] All agents use consistent notification pattern
- [ ] All agents use consistent error handling
- [ ] No `any` types in agent code
- [ ] `yarn checks` passes

### Prompt Quality
- [ ] All prompts have clear structure (role, context, task, constraints, output)
- [ ] All prompts specify output format
- [ ] No vague or conflicting instructions
- [ ] Token usage is reasonable
- [ ] Prompts align with output schemas

### E2E Workflow
- [ ] All phases implemented and connected
- [ ] Artifact flow is clear and working
- [ ] Status sync between MongoDB and GitHub
- [ ] Multi-phase features work correctly
- [ ] Error recovery is in place
- [ ] Notifications at all key points

### Telegram Webhooks
- [ ] All quick action buttons work correctly
- [ ] Status updates are atomic (MongoDB + GitHub)
- [ ] Error handling doesn't leave inconsistent state
- [ ] Security validation in place
- [ ] Messages updated after actions
- [ ] Multi-phase merge handling correct

### Documentation
- [ ] All CLI options documented
- [ ] All status constants documented
- [ ] All configuration options documented
- [ ] Code examples in docs are valid
- [ ] File paths in docs exist

---

## Appendix: Files Inventory

### Source Files Audited

| File | Lines | Issues | Priority |
|------|-------|--------|----------|
| | | | |

### Documentation Files Audited

| File | Words | Issues | Priority |
|------|-------|--------|----------|
| | | | |
```

---

## Master Checklist (For Auditor)

Complete ALL items to finish the audit:

### Phase 1: Documentation Review
- [ ] Read docs/github-agents-workflow/README.md
- [ ] Read docs/github-agents-workflow/overview.md
- [ ] Read docs/github-agents-workflow/setup-guide.md
- [ ] Read docs/github-agents-workflow/workflow-guide.md
- [ ] Read docs/github-agents-workflow/running-agents.md
- [ ] Read docs/github-agents-workflow/multi-phase-features.md
- [ ] Read docs/github-agents-workflow/agent-logging.md
- [ ] Read docs/github-agents-workflow/reference.md
- [ ] Read docs/github-agents-workflow/telegram-integration.md
- [ ] Read all AGENTS.md files in core-agents/

### Phase 2: Discovery
- [ ] Listed all agents in core-agents/
- [ ] Listed all shared modules
- [ ] Listed all lib modules
- [ ] Listed all documentation files
- [ ] Created comprehensive TODO list

### Phase 3: Code Audit
- [ ] Audited EVERY agent
- [ ] Audited shared code
- [ ] Audited lib abstractions
- [ ] Audited main entry point
- [ ] Audited configuration
- [ ] Audited prompt quality (structure, clarity, completeness)
- [ ] Audited E2E workflow (phases, artifacts, communication)
- [ ] Audited Telegram webhooks (buttons, status updates, security)

### Phase 4: Documentation Audit
- [ ] Checked completeness
- [ ] Checked accuracy
- [ ] Checked quality

### Phase 5: Doc-Code Consistency
- [ ] Validated CLI options
- [ ] Validated status constants
- [ ] Validated configuration
- [ ] Validated agent names
- [ ] Validated code examples

### Phase 6: Report Generation
- [ ] Created `audits/` folder (if needed)
- [ ] Saved report to `audits/workflow-audit-YYYY-MM-DD.md`
- [ ] Compiled all findings
- [ ] Created fix plan with checkboxes
- [ ] Calculated compliance scores
- [ ] **NO CODE CHANGES WERE MADE**

---

## Quick Reference: Common Violations

### Agent Structure Violations

| Violation | How to Find | Fix |
|-----------|-------------|-----|
| Missing AGENTS.md | `ls core-agents/*/` | Create AGENTS.md with agent documentation |
| No logging context | `grep "createLogContext"` | Add logging pattern |
| No notifications | `grep "notifyAgent"` | Add notification calls |
| Inconsistent CLI | `grep "\.option("` | Use standard options |
| any types | `grep ": any"` | Use proper types |

### Documentation Violations

| Violation | How to Find | Fix |
|-----------|-------------|-----|
| Outdated CLI options | Compare grep results | Update docs |
| Wrong file paths | Check if paths exist | Fix paths |
| Missing sections | Check doc structure | Add sections |
| Invalid code examples | Try running examples | Fix examples |

### Consistency Violations

| Violation | How to Find | Fix |
|-----------|-------------|-----|
| Status mismatch | Compare STATUSES | Sync code and docs |
| Config mismatch | Compare config files | Sync code and docs |
| Naming mismatch | Compare names | Use consistent naming |

### Prompt Quality Violations

| Violation | How to Find | Fix |
|-----------|-------------|-----|
| Vague instructions | Search for "appropriate", "as needed" | Be specific and explicit |
| Missing output format | Check prompt for format spec | Add structured output format |
| No error handling | Check for failure instructions | Add error case handling |
| Conflicting directives | Read through for contradictions | Remove contradictions |
| Missing context | Check if agent has needed info | Add required context |
| Hardcoded values | Search for literals in prompts | Use template variables |
| No examples | Check complex prompts | Add concrete examples |
| Token bloat | Estimate token count | Condense, use references |
| Inconsistent terminology | Compare terms across prompts | Standardize vocabulary |

### E2E Workflow Violations

| Violation | How to Find | Fix |
|-----------|-------------|-----|
| Missing phase | Trace workflow phases | Add missing phase handling |
| Broken artifact flow | Check design doc usage | Fix artifact paths/references |
| Status desync | Compare MongoDB vs GitHub | Fix status update logic |
| No error recovery | Check failure handling | Add retry/recovery logic |
| Multi-phase gaps | Check phase transitions | Fix phase tracking |
| Missing notifications | Check notification calls | Add notifications at key points |
| Race conditions | Check concurrent access | Add locking/idempotency |
| Unclear phase boundaries | Check workflow code | Define clear transitions |

### Telegram Webhook Violations

| Violation | How to Find | Fix |
|-----------|-------------|-----|
| Missing button handlers | Check callback handlers | Add missing handlers |
| Status desync on action | Check both DB updates | Update MongoDB AND GitHub atomically |
| No callback answer | Check answerCallbackQuery | Always answer to clear loading |
| Stale buttons | Check message updates | Remove/update buttons after action |
| Missing authorization | Check chat ID validation | Add authorization check |
| No error handling | Check try/catch | Add proper error handling |
| Duplicate actions | Check idempotency | Add duplicate detection |
| Missing phase awareness | Check multi-phase handling | Pass phase info to handlers |
| Unclear error messages | Check error responses | Improve error messaging |
| No logging | Check webhook logs | Add comprehensive logging |

---

## Notes

### This is a REPORT-ONLY Audit

- **DO NOT** make any code changes during this audit
- **DO NOT** fix any issues you find
- **DO** save the report to `audits/workflow-audit-YYYY-MM-DD.md`
- **DO** document every violation with specific details
- **DO** create a fix plan with actionable tasks

### Scope Clarification

This audit covers ONLY the workflow system:
- `src/agents/` - All agent source code
- `docs/github-agents-workflow/` - All workflow documentation

It does NOT cover:
- Main application code (`src/client/`, `src/apis/`, etc.)
- Other documentation (`docs/*.md` outside github-agents-workflow/)
- Application features

### Key Differences from Full Project Audit

| Aspect | Full Project Audit | Workflow Audit |
|--------|-------------------|----------------|
| Scope | Main app | Workflow system only |
| Focus | React Query, Zustand | Logging, notifications, CLI |
| Docs | All docs | github-agents-workflow/ only |
| Critical Patterns | Optimistic-only, createStore | Logging context, error handling |
