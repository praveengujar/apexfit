---
name: workforce
description: Show workforce dashboard — running tasks, pending queue, recent completions, health metrics, and cost summary. Use when user wants task status overview.
---

When the user invokes /workforce, display a comprehensive dashboard of the autonomous agent workforce.

## Steps

1. Call `workforce_list_tasks` to get all active tasks
2. Call `workforce_health_metrics` to get success/failure rates
3. Call `workforce_cost_summary` to get cost data

## Output Format

Present the dashboard in this structure:

### Running Tasks
For each running task, show:
- Task ID (short, first 8 chars)
- Prompt (truncated to 80 chars)
- Project name
- Elapsed time since startedAt
- tmux session name if applicable

### Pending Queue
Show count and list prompts waiting to run.

### Review Needed
Show tasks in "review" status that need human approval. Flag these prominently.

### Recent Completions (last 5)
Show done/failed tasks with outcome and cost.

### Health Summary
- Success rate, failure rate, one-shot rate
- Improvement suggestions if any

### Cost Summary
- Today / this week / this month spend
- Breakdown by tier (simple/medium/complex)

Keep output concise and scannable. Use monospace tables where helpful.
