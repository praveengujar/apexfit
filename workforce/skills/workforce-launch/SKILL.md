---
name: workforce-launch
description: Launch a new autonomous agent task. Validates the prompt, estimates cost, optionally decomposes complex tasks, and creates the task. Use when user wants to spawn an agent.
---

When the user invokes /workforce-launch, guide them through creating a new autonomous task.

## Steps

1. If the user provided a prompt in the invocation, use it. Otherwise ask for the task prompt.

2. Call `workforce_analyze_prompt` with the prompt to check:
   - Is the prompt too short? Too long? Too vague?
   - What tier is it (simple/medium/complex)?
   - What's the estimated cost?

3. If the analysis says the prompt is NOT admitted (too broad, too vague, too short):
   - Show the reason and suggestions
   - Offer to refine the prompt (you can refine it yourself — you ARE Claude)
   - Offer to decompose it into subtasks via /workforce-decompose

4. If the analysis says the prompt IS admitted:
   - Show the tier and estimated cost
   - Ask if the user wants auto-merge on completion, or manual review
   - Ask for project name (optional)

5. Call `workforce_create_task` with:
   - prompt: the final prompt
   - project: user-specified or derived from current directory name
   - autoMerge: based on user preference (default: false for review)

6. Confirm the task was created with its ID and estimated start time.

## Prompt Refinement

Since you ARE Claude, you can refine prompts directly instead of calling an external API:
- Make vague prompts specific (name files, functions, behavior)
- Break compound requests into focused tasks
- Add constraints that help the agent succeed (e.g., "only modify files in src/components/")
