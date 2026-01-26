---
description: Review agent workflow logs and suggest improvements to the github-agents workflow
---

# Workflow Review

Review agent execution logs and identify issues, inefficiencies, and improvement opportunities.

## Usage

- `/workflow-review 43` - Review log for issue #43
- `/workflow-review` - Review most recent log file

## Process Overview

Analyze workflow execution logs to identify:
- Errors and failures
- Inefficiencies (token/cost, redundant operations)
- Workflow bottlenecks
- Prompt improvement opportunities
- Code/infrastructure issues

---

## CRITICAL: Efficient Reading Strategy

**Log files can be very large (1000+ lines). DO NOT read the entire file at once.**

Use this incremental approach:

### Phase 1: Get Overview (Read sparingly)
1. **Read header only** (first 30 lines) - Get issue title, type, start time
2. **Read Summary section** (last 50 lines) - Get totals, phase breakdown table

### Phase 2: Search for Issues (Use Grep)
Use Grep to find problems WITHOUT reading full content.

**Log entries use `[LOG:TYPE]` markers for precise searching:**

| What to Find | Grep Pattern |
|--------------|--------------|
| Errors | `\[LOG:ERROR\]\|\[LOG:FATAL\]` |
| All phases | `\[LOG:PHASE_START\]` |
| Phase results | `\[LOG:PHASE_END\]` |
| Tool calls | `\[LOG:TOOL_CALL\]` |
| Tool results | `\[LOG:TOOL_RESULT\]` |
| Token usage | `\[LOG:TOKENS\]` |
| Status changes | `\[LOG:STATUS\]` |
| GitHub actions | `\[LOG:GITHUB\]` |
| Webhook events | `\[LOG:WEBHOOK\]` |
| GitHub Action events | `\[LOG:ACTION\]` |
| Telegram events | `\[LOG:TELEGRAM\]` |
| Summary | `\[LOG:SUMMARY\]` |

```bash
# Find errors (precise - no false positives from design docs)
Grep pattern="\[LOG:ERROR\]\|\[LOG:FATAL\]" path="agent-logs/issue-{N}.md"

# Find high costs (look for $X.XX patterns above threshold)
Grep pattern="\$[1-9][0-9]*\." path="agent-logs/issue-{N}.md"

# Find tool calls (count for efficiency analysis)
Grep pattern="\[LOG:TOOL_CALL\]" path="agent-logs/issue-{N}.md"

# Find phase results
Grep pattern="\[LOG:PHASE_END\]" path="agent-logs/issue-{N}.md" -A 5

# Find status changes
Grep pattern="\[LOG:STATUS\]" path="agent-logs/issue-{N}.md"
```

### Phase 3: Drill Down (Read specific sections only)
Only read specific line ranges when investigating a finding:
- Use `Read` with `offset` and `limit` parameters
- Focus on 50-100 lines around the issue

---

## Step 1: Load Log File Header & Summary

**Actions**:
1. If issue number provided: Target `agent-logs/issue-{N}.md`
2. If no argument: List `agent-logs/` and select most recent by timestamp
3. Read first 30 lines (header with issue info)
4. Read last 50 lines (Summary table)

This gives you:
- Issue title, type, start time
- Phase breakdown (duration, tools, tokens, cost per phase)
- Total cost and duration

## Step 2: Search for Red Flags

Use Grep with `[LOG:*]` markers for precise searches:

| Pattern | What it finds |
|---------|---------------|
| `\[LOG:ERROR\]\|\[LOG:FATAL\]` | Errors and failures |
| `\[LOG:PHASE_END\]` with `-A 5` | Phase summaries |
| `\[LOG:TOOL_CALL\].*Read` | File read operations |
| `\[LOG:TOKENS\]` | Token usage entries |
| `\$[1-9]` | High costs (> $1) |

## Step 3: Analyze Findings

For each red flag found:
1. Note the line number from Grep
2. Read only 50-100 lines around that area
3. Understand context and root cause
4. Categorize: Error / Inefficiency / Workflow issue / Prompt issue

## Step 4: Generate Recommendations

**Output**:
- Summary with severity (Critical / Warning / Info)
- Specific findings with line references
- Actionable improvements
- Priority ranking

## Step 5: Present Results

**Format**: Structured report with sections
**Optional**: Offer to create task/issue for major findings

---

## Analysis Checklist

### Errors & Failures
- [ ] Any error markers? (`Grep pattern="\[LOG:ERROR\]\|\[LOG:FATAL\]"`)
- [ ] Stack traces in error blocks? (Read lines around `[LOG:ERROR]` matches)
- [ ] Git operation failures? (`Grep pattern="\[LOG:GITHUB\].*failed\|\[LOG:ERROR\].*git"`)

### Efficiency
- [ ] Same file read multiple times? (`Grep pattern="\[LOG:TOOL_CALL\].*Read"` then check for duplicates)
- [ ] Large token counts for simple tasks? (`Grep pattern="\[LOG:TOKENS\]"` or check Summary table)
- [ ] Redundant Grep/Glob patterns? (`Grep pattern="\[LOG:TOOL_CALL\].*Grep\|\[LOG:TOOL_CALL\].*Glob"`)

### Workflow
- [ ] Phase transitions correct? (`Grep pattern="\[LOG:PHASE_START\]\|\[LOG:PHASE_END\]"`)
- [ ] PR created successfully? (`Grep pattern="\[LOG:GITHUB\].*pr_created\|\[LOG:GITHUB\].*PR"`)
- [ ] Status updates correct? (`Grep pattern="\[LOG:STATUS\]"`)

### Prompts
- [ ] Agent confused? (`Grep pattern="\[LOG:RESPONSE\]"` then read for confusion indicators)
- [ ] Missing context? (`Grep pattern="\[LOG:TOOL_RESULT\].*not found\|\[LOG:ERROR\].*missing"`)

---

## Log File Structure Reference

Log files use `[LOG:TYPE]` markers for easy grep searching:

```markdown
# Issue #33: [title]
**Type:** feature/bug
**Started:** [ISO timestamp]

## [LOG:PHASE_START] Phase: [Product Design/Tech Design/Implement/PR Review]
**Agent:** [agent-type]
**Mode:** [New design/Feedback/Clarification]
**Started:** [HH:MM:SS]

### [LOG:PROMPT] Prompt
**Model:** sonnet | **Tools:** Read, Glob, Grep, WebFetch | **Timeout:** 600s

### Agent Execution
**[HH:MM:SS]** [LOG:TOOL_CALL] 🔧 Tool: [name] (ID: [id])
**[HH:MM:SS]** [LOG:TOOL_RESULT] ✅ Result: [name] (ID: [id])
**[HH:MM:SS]** [LOG:THINKING] 💭 Thinking: [content]
**[HH:MM:SS]** [LOG:RESPONSE] 📝 Response: [content]
**[HH:MM:SS]** [LOG:TOKENS] 📊 Tokens: [in]/[out] | Cost: $X.XX
**[HH:MM:SS]** [LOG:STATUS] 🔄 Status: [from] → [to]
**[HH:MM:SS]** [LOG:GITHUB] 🔀 pr_created: [details]
**[HH:MM:SS]** [LOG:ERROR] ❌ Error: [message]
**[HH:MM:SS]** [LOG:FATAL] ❌ Error: [message]

### [LOG:PHASE_END] Phase Result
**Duration:** Xm Xs | **Tool calls:** N | **Tokens:** N | **Cost:** $X.XX

## [LOG:SUMMARY] Summary
| Phase | Duration | Tools | Tokens | Cost |
```

### Marker Reference

| Marker | Description |
|--------|-------------|
| `[LOG:PHASE_START]` | Beginning of a workflow phase |
| `[LOG:PHASE_END]` | End of phase with result summary |
| `[LOG:PROMPT]` | Prompt sent to Claude API |
| `[LOG:TOOL_CALL]` | Tool invocation |
| `[LOG:TOOL_RESULT]` | Tool response |
| `[LOG:THINKING]` | Extended thinking block |
| `[LOG:RESPONSE]` | Text response from agent |
| `[LOG:TOKENS]` | Token usage and cost |
| `[LOG:STATUS]` | Status transition |
| `[LOG:GITHUB]` | GitHub API action |
| `[LOG:ERROR]` | Non-fatal error |
| `[LOG:FATAL]` | Fatal error |
| `[LOG:SUMMARY]` | Final summary table |

---

## Example Output

```
## Workflow Review: Issue #43

### Executive Summary
- **Issue**: Improve Feature Requests List UX/UI
- **Type**: Feature (L - Multi-phase)
- **Total Cost**: $2.45
- **Total Duration**: 45m
- **Phases**: 4 (Product -> Tech -> Implement -> PR Review)
- **Status**: Completed

### Findings

#### Critical (0)
None found.

#### Warning (2)

1. **Redundant File Reads** (Tech Design phase)
   - `src/agents/shared/prompts.ts` read 4 times
   - **Line**: 1245-1890
   - **Impact**: ~2000 extra tokens ($0.03)
   - **Recommendation**: Cache file contents in agent context

2. **Long Thinking Block** (Implement phase)
   - 800 tokens of thinking for simple import statement
   - **Line**: 2105
   - **Recommendation**: Add example imports to prompt

#### Info (3)
[...]

### Recommendations
1. [High] Update prompts to include common import patterns
2. [Medium] Consider file caching for repeated reads
3. [Low] Add explicit phase transition logging
```
