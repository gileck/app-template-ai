---
allowed-tools: Read, Glob, Grep, Bash
description: Review PR changes for code quality and correctness
---

## Task
Review the code changes in this branch for:
1. Code quality and adherence to project patterns
2. Correctness and potential bugs
3. TypeScript/ESLint compliance
4. Security considerations
5. Adherence to technical design (if provided)

## Changes to Review
!`git diff main...HEAD`

## Changed Files
!`git diff --name-only main...HEAD`

## Instructions

1. **Read the changed files** - Use the Read tool to examine each changed file
2. **Understand the context** - Look at surrounding code to understand the changes
3. **Check for issues** - Look for:
   - TypeScript errors or type safety issues
   - ESLint violations
   - Security vulnerabilities (XSS, SQL injection, etc.)
   - Code quality issues (duplication, complexity, etc.)
   - Adherence to project patterns and guidelines
4. **Make a decision** - Decide whether to approve or request changes

## Output Requirements

Your response must include these three parts:

1. **decision**: Either `approved` (code is ready to merge) or `request_changes` (changes needed)

2. **summary**: A 1-2 sentence summary of the review

3. **reviewText**: The full review with:
   - If requesting changes: numbered feedback items with file:line references
   - What looks good about the implementation
   - Any minor suggestions for future improvements

## Important Notes
- Be thorough but constructive
- Provide specific file:line references when possible
- Explain WHY something is an issue, not just WHAT the issue is
- Include positive feedback on what was done well
