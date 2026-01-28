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

## Implementation Notes

### Components to Build

#### Backend
- New API endpoint for submitting clarification answers
- Parse agent output to detect clarification questions format
- Telegram webhook handler for ANSWER_QUESTIONS callback

#### Frontend
- New dedicated page: `/clarify/[issueNumber]` or similar
- Question renderer component (handles options + free text)
- Answer submission logic

#### Agent Changes
- Define standard output format for clarification questions
- Add clarification detection to agent output parsing
- Add clarificationReceived mode handling in agents

#### Telegram
- New button type for ANSWER_QUESTIONS
- URL that opens the dedicated clarification UI

### Technical Considerations
- The clarification UI should be simple and focused (not full admin panel)
- Consider mobile-friendly design for quick Telegram → answer flow
- Questions format should be parseable (consider JSON or structured markdown)
- Multiple questions per clarification request supported

## Files to Modify

- `src/agents/shared/prompts.ts` - Add clarification output format to agent prompts
- `src/agents/shared/utils.ts` - Add clarification question parsing
- `src/agents/auto-advance.ts` - Handle waitingForClarification status transition
- `src/pages/api/telegram-webhook.ts` - Add ANSWER_QUESTIONS callback handler
- `src/server/project-management/config.ts` - Already has waitingForClarification/clarificationReceived statuses
- `src/client/routes/` - New ClarificationAnswer route and components
- `src/apis/feature-requests/` - New API for submitting clarification answers

## Dependencies

- Review statuses `waitingForClarification` and `clarificationReceived` already exist in config

## Risks

- Agent output parsing may need iteration to get the format right
- Mobile UX for the clarification UI needs careful design
- Need to handle edge cases: multiple pending clarifications, expired clarification requests
