---
name: workforce-backlog
description: Manage the task backlog — add, update, remove, reorder, and analyze backlog items. Use when user wants to plan work for agents.
---

When the user invokes /workforce-backlog, provide full backlog management.

## Capabilities

### View backlog
Call `workforce_backlog_list` and display items sorted by current order:
- Priority badge (high/medium/low)
- Title and description
- Created date

### Add item
Call `workforce_backlog_add` with title, description, priority.

### Update item
Call `workforce_backlog_update` with id and changed fields.

### Remove item
Call `workforce_backlog_delete` with id.

### Reorder
Call `workforce_backlog_reorder` with the new order array of IDs.

### Analyze and prioritize
Since you ARE Claude, you can directly analyze the backlog:
- Stack-rank items by impact and urgency
- Identify items that can be combined or split
- Suggest which items to launch as agent tasks next
- Estimate complexity and cost for each item

### Launch from backlog
If the user wants to launch a backlog item as a task, use the prompt from the backlog item and call `workforce_create_task`.

## Conversation Style
Be conversational. The user can say things like:
- "add: implement dark mode support" → add item
- "remove the second one" → delete by position
- "what should we work on next?" → analyze and recommend
- "launch the top 3" → create tasks from top items
