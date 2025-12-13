import type { ParsedPRD } from '../types.js';

export function generateClaudeMd(prd: ParsedPRD, outputDir: string): string {
  return `# ${prd.projectInfo.name}

## Project Overview
${prd.overview.summary}

### Goals
${prd.overview.goals.map((g) => `- ${g}`).join('\n')}

## Quick Start for Claude Code

### Before Starting Work
1. **Read the task breakdown:** \`${outputDir}/PRD.md\`
2. **Check progress:** \`docs/progress/state.json\`
3. **Read current phase:** \`${outputDir}/phases/phase-{N}.md\`

### Available Commands
- \`/next-task\` - Get the next task to work on
- \`/checkpoint\` - Save progress and create summary
- \`/phase-status\` - Show current phase completion
- \`/check-issue <description>\` - Check if an issue is a bug or just not implemented yet

## CRITICAL: Before Fixing ANY Issue

**ALWAYS check the PRD and progress state before attempting to fix anything.**

When the user reports something "broken", "not working", or asks you to "fix" something:

1. **STOP** - Do not immediately try to fix it
2. **Check \`docs/progress/state.json\`** - What phase are we on? What tasks are completed?
3. **Check the task breakdown** - Is this feature supposed to be implemented yet?
4. **Determine if it's actually a bug or just not built yet:**
   - If the feature is in a FUTURE phase/task → Tell the user "This isn't implemented yet. It's scheduled for Phase X, Task Y. Would you like to continue with the current task or skip ahead to implement this?"
   - If the feature SHOULD be working → Then investigate and fix the bug

**Example scenarios:**
- User: "The API shows disconnected" → Check: Have we implemented the API connection task yet? If not, this is expected.
- User: "Login doesn't work" → Check: Is authentication in a completed task? If not, it's not a bug.
- User: "The dashboard is empty" → Check: Have we implemented data fetching? If not, this is expected behavior.

This prevents wasting time "fixing" things that simply haven't been built yet.

### Implementation Guidelines
- Work through phases sequentially (Phase 1 → Phase 2 → ...)
- Complete all tasks in a phase before moving on
- Run \`/checkpoint\` after completing each task
- **Always verify current progress before attempting fixes**

### Context Retention
When starting a new session or after a long break:
1. Read \`${outputDir}/PRD.md\`
2. Check \`docs/progress/state.json\` for current state
3. Read the current phase file
4. Review recent checkpoint summaries in \`docs/progress/\`

### File Structure
\`\`\`
${outputDir}/
├── PRD.md              # Task breakdown document
└── phases/             # Detailed phase breakdowns
    ├── phase-1.md
    └── ...

docs/progress/
├── state.json          # Machine-readable progress
└── phase-*-summary.md  # Human-readable checkpoints
\`\`\`

## Current Phase Tasks
See \`${outputDir}/phases/\` for detailed task breakdowns with dependencies.
`;
}

export function generateAgentsMd(prd: ParsedPRD, outputDir: string): string {
  return `# ${prd.projectInfo.name} - Codex Agent Instructions

## Project Context
${prd.overview.summary}

### Goals
${prd.overview.goals.map((g) => `- ${g}`).join('\n')}

## CRITICAL: Before Fixing ANY Issue

**ALWAYS check the task breakdown and progress state before attempting to fix anything.**

When the user reports something "broken", "not working", or asks you to "fix" something:

1. **STOP** - Do not immediately try to fix it
2. **Check \`docs/progress/state.json\`** - What phase are we on? What tasks are completed?
3. **Check the task breakdown at \`${outputDir}/PRD.md\`** - Is this feature supposed to be implemented yet?
4. **Determine if it's actually a bug or just not built yet:**
   - If the feature is in a FUTURE phase/task → Tell the user: "This isn't implemented yet. It's scheduled for Phase X, Task Y. Would you like to continue with the current task or skip ahead to implement this?"
   - If the feature SHOULD be working (task is completed) → Then investigate and fix the bug

**Example scenarios:**
- User: "The API shows disconnected" → Check: Have we implemented the API connection task yet? If not, this is expected.
- User: "Login doesn't work" → Check: Is authentication in a completed task? If not, it's not a bug.
- User: "The dashboard is empty" → Check: Have we implemented data fetching? If not, this is expected behavior.

This prevents wasting time "fixing" things that simply haven't been built yet.

## How to Work on This Project

### Initial Setup
1. Read the full task breakdown at \`${outputDir}/PRD.md\`
2. Review the current state in \`docs/progress/state.json\`
3. Identify the current phase and pending tasks

### Task Execution Flow
1. Find the next pending task in the current phase
2. Read the task details in \`${outputDir}/phases/phase-{N}.md\`
3. Check task dependencies - ensure they're completed first
4. Implement the task
5. Update \`docs/progress/state.json\` with completion
6. Create a summary in \`docs/progress/\`

### Phase Progression Rules
- Complete ALL tasks in a phase before starting the next
- Verify exit criteria before phase transition
- Create a phase summary when completing a phase
- **Always verify current progress before attempting any fixes**
`;
}

export function generateSlashCommands(prd: ParsedPRD, outputDir: string): Record<string, string> {
  return {
    'next-task.md': `# Next Task

Read the current progress from \`docs/progress/state.json\` and identify the next pending task.

## Instructions
1. Parse \`docs/progress/state.json\` to find \`currentPhase\`
2. Read \`${outputDir}/phases/phase-{currentPhase}.md\`
3. Find the first task with status "pending" whose dependencies are all "completed"
4. Display the task details and update its status to "in_progress" in state.json
5. If no pending tasks, check if phase exit criteria are met and suggest advancing to next phase

## Output Format
Show:
- Task ID
- Task title
- Task description
- Dependencies (and their status)
`,

    'checkpoint.md': `# Checkpoint

Save progress and create a summary of work completed.

## Instructions
1. Ask what was accomplished since the last checkpoint
2. Update \`docs/progress/state.json\`:
   - Mark completed tasks as "completed" with timestamp
   - Update \`lastUpdated\`
   - Add to \`checkpoints\` array
3. Create/update a summary file at \`docs/progress/phase-{N}-summary.md\`

## Summary Template
\`\`\`markdown
# Phase {N} Progress Summary

## Completed Tasks
- [task-id]: Brief description of what was done

## Current State
- What's working
- What's next

## Notes
- Any blockers or concerns
- Decisions made

Last updated: {timestamp}
\`\`\`
`,

    'phase-status.md': `# Phase Status

Show the current phase completion status.

## Instructions
1. Read \`docs/progress/state.json\`
2. Read \`${outputDir}/phases/phase-{currentPhase}.md\`
3. Calculate completion percentage
4. Show task breakdown (completed/in-progress/pending)
5. Show exit criteria checklist

## Output Format
\`\`\`
Phase {N}: {Name}
Progress: {X}% ({completed}/{total} tasks)

Tasks:
✓ task-1: Title (completed)
→ task-2: Title (in progress)
○ task-3: Title (pending)

Exit Criteria:
[ ] Criterion 1
[x] Criterion 2
\`\`\`
`,

    'check-issue.md': `# Check Issue

Determine if a reported issue is an actual bug or simply a feature that hasn't been implemented yet.

## Usage
\`/check-issue <description of the issue>\`

## Instructions
1. Read \`docs/progress/state.json\` to understand:
   - Current phase number
   - Which tasks are completed, in-progress, or pending
2. Read \`${outputDir}/PRD.md\` to understand the full feature set
3. Read \`${outputDir}/phases/phase-{currentPhase}.md\` for current phase details
4. Analyze the reported issue against the implementation state

## Analysis Steps
1. **Identify the feature area** - What part of the system does this issue relate to?
2. **Find the relevant task** - Search the task breakdown for tasks related to this feature
3. **Check task status** - Is the task completed, in-progress, or pending?
4. **Make determination:**
   - If task is PENDING or doesn't exist yet → NOT A BUG, just not implemented
   - If task is COMPLETED → This is likely a real bug, investigate further

## Output Format
\`\`\`
Issue: {description}

Related Feature: {feature name}
Related Task: {task-id} - {task title}
Task Status: {completed|in_progress|pending}
Current Phase: {N} | Task's Phase: {M}

Verdict: {BUG | NOT IMPLEMENTED YET}

{If NOT IMPLEMENTED YET}
This feature is scheduled for Phase {M}, Task "{task-id}".
Current progress: Phase {N}, Task "{current-task}".

Options:
1. Continue with current task ({current-task})
2. Skip ahead to implement this feature now

{If BUG}
This feature should be working (task {task-id} is marked complete).
Investigating...
\`\`\`
`,
  };
}
