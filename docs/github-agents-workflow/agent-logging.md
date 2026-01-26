# Agent Logging System

This document describes the logging system used by the GitHub agents workflow to create execution logs for debugging and analysis.

---

## Overview

Every agent execution creates a log file at `agent-logs/issue-{N}.md` that captures:
- Phase starts and ends
- Prompts sent to Claude API
- Tool calls and results
- Agent thinking and responses
- Token usage and costs
- Errors and status changes
- GitHub API actions

---

## Log Markers

**CRITICAL: All log entries MUST use `[LOG:TYPE]` markers for grep-based analysis.**

These markers enable the workflow reviewer (`/workflow-review`) to search logs precisely without false positives.

### Marker Reference Table

| Marker | Description | Example |
|--------|-------------|---------|
| `[LOG:PHASE_START]` | Beginning of a workflow phase | `## [LOG:PHASE_START] Phase: Product Design` |
| `[LOG:PHASE_END]` | End of phase with result summary | `### [LOG:PHASE_END] Phase Result` |
| `[LOG:PROMPT]` | Prompt sent to Claude API | `### [LOG:PROMPT] Prompt` |
| `[LOG:TOOL_CALL]` | Tool invocation | `[LOG:TOOL_CALL] Tool: Read` |
| `[LOG:TOOL_RESULT]` | Tool response | `[LOG:TOOL_RESULT] Result: Read` |
| `[LOG:THINKING]` | Extended thinking block | `[LOG:THINKING] Thinking:` |
| `[LOG:RESPONSE]` | Text response from agent | `[LOG:RESPONSE] Response:` |
| `[LOG:TOKENS]` | Token usage and cost | `[LOG:TOKENS] Tokens: 1000 in / 500 out` |
| `[LOG:STATUS]` | Status transition | `[LOG:STATUS] Status: Backlog -> Product Design` |
| `[LOG:GITHUB]` | GitHub API action | `[LOG:GITHUB] pr_created: PR #45` |
| `[LOG:ERROR]` | Non-fatal error | `[LOG:ERROR] Error: Something went wrong` |
| `[LOG:FATAL]` | Fatal error (stops execution) | `[LOG:FATAL] Error: Critical failure` |
| `[LOG:SUMMARY]` | Final summary table | `## [LOG:SUMMARY] Summary` |

### Why Markers Matter

**Before markers:**
```bash
# This catches "error handling" in design docs - false positive!
Grep pattern="error|Error" path="agent-logs/issue-43.md"
```

**After markers:**
```bash
# This ONLY catches actual errors logged by the system
Grep pattern="\[LOG:ERROR\]\|\[LOG:FATAL\]" path="agent-logs/issue-43.md"
```

---

## Log File Structure

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

```
[prompt content]
```

### Agent Execution

**[HH:MM:SS]** [LOG:TOOL_CALL] Tool: [name] (ID: [id])
```json
[tool input]
```

**[HH:MM:SS]** [LOG:TOOL_RESULT] Result: [name] (ID: [id])
```
[tool output]
```

**[HH:MM:SS]** [LOG:THINKING] Thinking:
> [thinking content]

**[HH:MM:SS]** [LOG:RESPONSE] Response:
[response content]

**[HH:MM:SS]** [LOG:TOKENS] Tokens: [in] in / [out] out ([total] total) | **Cost:** $X.XXXX

**[HH:MM:SS]** [LOG:STATUS] Status: [from] -> [to]

**[HH:MM:SS]** [LOG:GITHUB] [action]: [details]

**[HH:MM:SS]** [LOG:ERROR] Error:
```
[error message]
```

---

### [LOG:PHASE_END] Phase Result

**Duration:** Xm Xs
**Tool calls:** N
**Tokens:** N
**Cost:** $X.XX
**Status:** Success/Failed

---

## [LOG:SUMMARY] Summary

| Phase | Duration | Tools | Tokens | Cost |
|-------|----------|-------|--------|------|
| Product Design | 2m 30s | 15 | 5000 | $0.05 |
| Tech Design | 3m 45s | 20 | 8000 | $0.08 |
| **Total** | **6m 15s** | **35** | **13000** | **$0.13** |

**Completed:** HH:MM:SS
```

---

## Logger API

The logger is located at `src/agents/lib/logging/logger.ts`.

### Import

```typescript
import {
    logExecutionStart,
    logPrompt,
    logToolCall,
    logToolResult,
    logThinking,
    logTextResponse,
    logStatusTransition,
    logGitHubAction,
    logError,
    logTokenUsage,
    logExecutionEnd,
    logFinalSummary,
} from '@/agents/lib/logging';
```

### Functions

#### `logExecutionStart(ctx: LogContext)`
Logs the start of a phase. Creates log file if it doesn't exist.

```typescript
logExecutionStart({
    issueNumber: 43,
    issueTitle: 'Add dark mode',
    issueType: 'feature',
    phase: 'Product Design',
    workflow: 'product-design',
    startTime: new Date(),
});
// Output: ## [LOG:PHASE_START] Phase: Product Design
```

#### `logPrompt(ctx, prompt, options?)`
Logs the prompt sent to the AI.

```typescript
logPrompt(ctx, promptText, {
    model: 'sonnet',
    tools: ['Read', 'Glob', 'Grep'],
    timeout: 600,
});
// Output: ### [LOG:PROMPT] Prompt
```

#### `logToolCall(ctx, toolId, toolName, input)`
Logs a tool invocation.

```typescript
logToolCall(ctx, 'abc123', 'Read', { file_path: '/path/to/file.ts' });
// Output: **[HH:MM:SS]** [LOG:TOOL_CALL] Tool: Read (ID: abc123)
```

#### `logToolResult(ctx, toolId, toolName, output)`
Logs a tool response. Truncates long outputs (>5000 chars).

```typescript
logToolResult(ctx, 'abc123', 'Read', fileContents);
// Output: **[HH:MM:SS]** [LOG:TOOL_RESULT] Result: Read (ID: abc123)
```

#### `logThinking(ctx, thinking)`
Logs extended thinking content as blockquote.

```typescript
logThinking(ctx, 'Analyzing the file structure...');
// Output: **[HH:MM:SS]** [LOG:THINKING] Thinking:
```

#### `logTextResponse(ctx, text)`
Logs text response from the agent.

```typescript
logTextResponse(ctx, 'I have completed the design.');
// Output: **[HH:MM:SS]** [LOG:RESPONSE] Response:
```

#### `logStatusTransition(ctx, from, to)`
Logs a status change in the workflow.

```typescript
logStatusTransition(ctx, 'Backlog', 'Product Design');
// Output: **[HH:MM:SS]** [LOG:STATUS] Status: Backlog -> Product Design
```

#### `logGitHubAction(ctx, action, details)`
Logs a GitHub API action.

```typescript
logGitHubAction(ctx, 'pr_created', 'PR #45 created');
// Output: **[HH:MM:SS]** [LOG:GITHUB] pr created: PR #45 created
```

Actions: `'comment' | 'pr_created' | 'issue_updated' | 'label_added'`

#### `logError(ctx, error, isFatal?)`
Logs an error. Use `isFatal: true` for fatal errors.

```typescript
logError(ctx, new Error('Something went wrong'));
// Output: **[HH:MM:SS]** [LOG:ERROR] Error:

logError(ctx, 'Critical failure', true);
// Output: **[HH:MM:SS]** [LOG:FATAL] Error:
```

#### `logTokenUsage(ctx, usage)`
Logs token usage and cost.

```typescript
logTokenUsage(ctx, {
    inputTokens: 1000,
    outputTokens: 500,
    cost: 0.02,
});
// Output: **[HH:MM:SS]** [LOG:TOKENS] Tokens: 1000 in / 500 out (1500 total) | **Cost:** $0.0200
```

#### `logExecutionEnd(ctx, summary)`
Logs phase completion with summary.

```typescript
logExecutionEnd(ctx, {
    success: true,
    toolCallsCount: 15,
    totalTokens: 5000,
    totalCost: 0.05,
});
// Output: ### [LOG:PHASE_END] Phase Result
```

#### `logFinalSummary(ctx, phases)`
Logs final summary table after all phases complete.

```typescript
logFinalSummary(ctx, [
    { name: 'Product Design', duration: 150000, toolCallsCount: 15, totalTokens: 5000, totalCost: 0.05 },
    { name: 'Tech Design', duration: 225000, toolCallsCount: 20, totalTokens: 8000, totalCost: 0.08 },
]);
// Output: ## [LOG:SUMMARY] Summary
```

---

## Searching Logs

Use the markers with Grep for precise searches:

```bash
# Find all errors
Grep pattern="\[LOG:ERROR\]\|\[LOG:FATAL\]" path="agent-logs/issue-43.md"

# Find all phase starts
Grep pattern="\[LOG:PHASE_START\]" path="agent-logs/issue-43.md"

# Find all tool calls
Grep pattern="\[LOG:TOOL_CALL\]" path="agent-logs/issue-43.md"

# Find specific tool (Read)
Grep pattern="\[LOG:TOOL_CALL\].*Read" path="agent-logs/issue-43.md"

# Find token usage
Grep pattern="\[LOG:TOKENS\]" path="agent-logs/issue-43.md"

# Find status changes
Grep pattern="\[LOG:STATUS\]" path="agent-logs/issue-43.md"

# Find GitHub actions
Grep pattern="\[LOG:GITHUB\]" path="agent-logs/issue-43.md"

# Find phase results with context
Grep pattern="\[LOG:PHASE_END\]" path="agent-logs/issue-43.md" -A 5
```

---

## Related Files

- `src/agents/lib/logging/logger.ts` - Logger functions
- `src/agents/lib/logging/writer.ts` - File writing utilities
- `src/agents/lib/logging/cost-summary.ts` - Cost tracking
- `src/agents/lib/logging/types.ts` - TypeScript types
- `.claude/commands/workflow-review.md` - Workflow reviewer skill

---

## Adding New Log Types

If you need to add a new log type:

1. **Choose a unique marker** - Follow the `[LOG:TYPE]` format
2. **Add the logging function** - In `src/agents/lib/logging/logger.ts`
3. **Include the marker** - In the log output string
4. **Update this documentation** - Add to the marker reference table
5. **Update workflow-review.md** - Add grep pattern for the new marker

Example:
```typescript
export function logMyNewEvent(ctx: LogContext, data: string): void {
    const timestamp = formatTime(new Date());
    const content = `**[${timestamp}]** [LOG:MY_NEW_EVENT] My Event: ${data}

`;
    appendToLog(ctx.issueNumber, content);
}
```
