---
name: workforce-review
description: Review completed task diffs and approve or reject changes. Use when tasks are awaiting review or user wants to inspect agent output.
---

When the user invokes /workforce-review, show tasks awaiting review and guide through approval.

## Steps

1. Call `workforce_list_tasks` and filter for status="review"

2. If no tasks in review:
   - Say "No tasks awaiting review"
   - Show recently completed tasks (done/failed) as context

3. For each task in review:
   a. Show task ID, prompt, project, elapsed time
   b. Call `workforce_get_diff` with the task_id
   c. Present the diff clearly:
      - Files changed with additions/deletions count
      - The actual diff content (use code blocks with diff syntax highlighting)
   d. Summarize what the agent changed and whether it looks correct
   e. Ask: "Approve (merge to main) or Reject?"

4. On approve: Call `workforce_approve_task` — report merge success
5. On reject: Call `workforce_reject_task` — report cleanup

## Diff Presentation

- Show file names and line counts first as a summary
- Then show the full diff in a code block with ```diff formatting
- For large diffs (>200 lines), summarize the changes and offer to show specific files
- Call out anything suspicious: new dependencies, deleted tests, security-sensitive changes
