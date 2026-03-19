---
name: workforce-decompose
description: Break a complex task into smaller subtasks suitable for individual agent runs. Use when a task is too broad for a single agent.
---

When the user invokes /workforce-decompose, decompose a complex prompt into subtasks.

## Steps

1. Take the user's prompt (provided as argument or ask for it)

2. Analyze the prompt and break it into focused subtasks. Each subtask should:
   - Be completable by a single agent in under 10 minutes
   - Target specific files or modules
   - Have a clear, testable outcome
   - Be independent enough to run concurrently where possible

3. For each subtask, determine:
   - **prompt**: Clear, specific agent instruction
   - **tier**: simple / medium / complex
   - **estimatedCost**: Based on tier ($0.05 / $0.25 / $0.50)
   - **dependencies**: Which other subtasks must complete first (if any)

4. Present the decomposition:
   - Numbered list of subtasks
   - Total estimated cost
   - Suggested execution order (parallel where possible)

5. Ask the user:
   - "Launch all subtasks?"
   - "Launch specific ones? (give numbers)"
   - "Modify any subtask?"

6. For selected subtasks, call `workforce_create_task` for each.

## Decomposition Principles

- Prefer many small tasks over few large ones
- Each task should touch a bounded set of files
- Separate refactoring from feature work
- Tests should be their own subtask if substantial
- UI changes separate from backend changes
