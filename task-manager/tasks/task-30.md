---
number: 30
title: Telegram Interactive Clarification Flow for Agents
priority: High
size: L
complexity: High
status: TODO
dateAdded: 2026-01-28
---

# Task 30: Telegram Interactive Clarification Flow for Agents

**Summary:** Enable agents to request user input via Telegram with a dedicated answer UI, supporting structured questions with options and free-text responses

## Details

### Problem
Currently, agents cannot easily request user input during workflow execution. When an agent needs clarification, there's no streamlined way to pause the workflow, ask questions, and receive structured answers.

### Proposed Solution
Implement a complete flow for agent-to-user clarification via Telegram:

#### 1. Agent Output Format
Agents can output a structured list of questions with options:
```
A. How should we implement the X?
   1. Option 1
   2. Option 2
   3. Option 3
   4. Add your option (free text)
B. Question 2...
   [Options for 2]
```

#### 2. Workflow Handling
When agent outputs clarification questions:
- Comment the questions to the GitHub issue
- Change review status to `waitingForClarification`
- Send Telegram message with an [ANSWER QUESTIONS] button

#### 3. Dedicated Answer UI
The [ANSWER QUESTIONS] button opens a new dedicated page (not the main admin panel):
- Shows questions with select buttons for predefined options
- Free text input for "Add your option" choices
- [SUBMIT ANSWERS] button at the bottom

#### 4. Answer Submission
When admin submits answers:
- Comment formatted answers to the GitHub issue
- Change review status to `clarificationReceived`
- Next agent run detects this status and reads the answers to continue

#### 5. Agent Clarification Mode
When agent runs with `clarificationReceived` status:
- Reads the answers from issue comments
- Continues workflow with the provided clarifications

## What's Already Implemented (No Work Needed)

The entire clarification flow already works end-to-end. Admin currently answers via GitHub issue comment.

| Component | Location | Status |
|-----------|----------|--------|
| Review statuses | `src/server/project-management/config.ts` | `waitingForClarification` and `clarificationReceived` exist |
| Agent clarification output format | `src/agents/shared/prompts.ts` | `AMBIGUITY_INSTRUCTIONS` tells agents to use ` ```clarification ` blocks |
| Clarification detection | `src/agents/shared/utils.ts` | `extractClarification()` parses agent output |
| Comment to GitHub issue | `src/agents/shared/utils.ts` | `handleClarificationRequest()` posts questions to issue |
| Status change to waitingForClarification | `src/agents/shared/utils.ts` | Part of `handleClarificationRequest()` |
| Telegram notification with buttons | `src/agents/shared/notifications.ts` | `notifyAgentNeedsClarification()` sends message |
| "Clarification Received" webhook handler | `src/pages/api/telegram-webhook.ts` | `handleClarificationReceived()` changes status |
| Agent clarification mode | All agents in `src/agents/core-agents/*/index.ts` | All agents support `mode: 'clarification'` |
| Continuation prompts | `src/agents/shared/prompts.ts` | `buildXxxClarificationPrompt()` for all 4 agents |

**Current flow:** Agent asks → GitHub comment → Telegram notification → Admin answers via GitHub → Agent continues

## What This Task Adds (New UX)

Instead of writing markdown answers on GitHub, admin clicks a button and uses a dedicated form UI with clickable options.

### Easy Changes (S - few hours)

| Component | Effort | Notes |
|-----------|--------|-------|
| Change Telegram button URL | S | Modify `notifyAgentNeedsClarification()` to use URL button pointing to new UI |
| New API endpoint for submitting answers | S | Create `POST /api/process/clarification_answer` - comments to issue + changes status |
| Parse structured questions from clarification | S | Add parser to extract questions/options from agent's markdown output |

### Medium Work (M - 1-2 days)

| Component | Effort | Notes |
|-----------|--------|-------|
| Dedicated Clarification UI page | M | New route `/clarify/[issueNumber]`, fetch questions, render form, submit |
| Question/Options format definition | M | Define exact parseable format - current format is human-readable but not machine-parseable |
| Mobile-friendly question renderer | M | Component with radio buttons for options + text input for free text |
| State management for answers | S-M | Track selections, handle free text, validation |

### Effort Breakdown

- **New UI page** (~40% of work) - `/clarify/[issueNumber]` with form components
- **Question format parser** (~20% of work) - Extract questions/options from clarification text
- **UI components** (~30% of work) - Question cards with radio options + free text
- **API + wiring** (~10% of work) - New endpoint, Telegram button URL change

## Implementation Notes

### Files to Create

- `src/client/routes/Clarify/index.tsx` - Main clarification page component
- `src/client/routes/Clarify/components/QuestionCard.tsx` - Single question renderer
- `src/client/routes/Clarify/hooks.ts` - Data fetching and submission hooks
- `src/apis/clarification/` - New API domain for clarification operations
- `src/agents/shared/clarificationParser.ts` - Parse questions/options from agent output

### Files to Modify

- `src/agents/shared/notifications.ts` - Change button URL in `notifyAgentNeedsClarification()`
- `src/agents/shared/prompts.ts` - Update `AMBIGUITY_INSTRUCTIONS` with machine-parseable format
- `src/client/routes/index.ts` - Add new Clarify route

### Technical Considerations

- The clarification UI should be simple and focused (not full admin panel)
- Mobile-first design for quick Telegram → answer flow
- Questions format should be parseable (structured markdown with clear delimiters)
- URL should include a token/signature for basic access control
- Multiple questions per clarification request supported

## Dependencies

- Review statuses `waitingForClarification` and `clarificationReceived` already exist
- `handleClarificationRequest()` and `notifyAgentNeedsClarification()` already work
- All agents already support clarification mode

## Risks

- Agent output format change may need iteration to get right (backward compatibility)
- Mobile UX for the clarification UI needs careful design
- URL security - should the page be publicly accessible or require auth?
- Edge cases: expired clarification requests, multiple pending clarifications
