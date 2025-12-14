# Next Task

Read the current progress from `docs/progress/state.json` and identify the next pending task.

## Instructions
1. Parse `docs/progress/state.json` to find `currentPhase`
2. Read `docs/prd/phases/phase-{currentPhase}.md`
3. Find the first task with status "pending" whose dependencies are all "completed"
4. Display the task details and update its status to "in_progress" in state.json
5. If no pending tasks, check if phase exit criteria are met and suggest advancing to next phase

## Output Format
Show:
- Task ID
- Task title
- Task description
- Dependencies (and their status)
