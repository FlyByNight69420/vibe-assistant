# Todo App

## Project Overview
A simple todo application with user authentication, task management, and cloud sync.

### Goals
- Enable users to create, update, and delete tasks
- Provide secure user authentication
- Sync tasks across devices via cloud storage
- Support task categories and due dates

## Quick Start for Claude Code

### Before Starting Work
1. **Read the task breakdown:** `docs/prd/PRD.md`
2. **Check progress:** `docs/progress/state.json`
3. **Read current phase:** `docs/prd/phases/phase-{N}.md`

### Available Commands
- `/next-task` - Get the next task to work on
- `/checkpoint` - Save progress and create summary
- `/phase-status` - Show current phase completion
- `/check-issue <description>` - Check if an issue is a bug or just not implemented yet

## CRITICAL: Before Fixing ANY Issue

**ALWAYS check the PRD and progress state before attempting to fix anything.**

When the user reports something "broken", "not working", or asks you to "fix" something:

1. **STOP** - Do not immediately try to fix it
2. **Check `docs/progress/state.json`** - What phase are we on? What tasks are completed?
3. **Check the task breakdown** - Is this feature supposed to be implemented yet?
4. **Determine if it's actually a bug or just not built yet:**
   - If the feature is in a FUTURE phase/task -> Tell the user "This isn't implemented yet. It's scheduled for Phase X, Task Y. Would you like to continue with the current task or skip ahead to implement this?"
   - If the feature SHOULD be working -> Then investigate and fix the bug

**Example scenarios:**
- User: "The API shows disconnected" -> Check: Have we implemented the API connection task yet? If not, this is expected.
- User: "Login doesn't work" -> Check: Is authentication in a completed task? If not, it's not a bug.
- User: "The dashboard is empty" -> Check: Have we implemented data fetching? If not, this is expected behavior.

This prevents wasting time "fixing" things that simply haven't been built yet.

### Implementation Guidelines
- Work through phases sequentially (Phase 1 -> Phase 2 -> ...)
- Complete all tasks in a phase before moving on
- Run `/checkpoint` after completing each task
- **Always verify current progress before attempting fixes**

### Context Retention
When starting a new session or after a long break:
1. Read `docs/prd/PRD.md`
2. Check `docs/progress/state.json` for current state
3. Read the current phase file
4. Review recent checkpoint summaries in `docs/progress/`

### File Structure
```
docs/prd/
├── PRD.md              # Task breakdown document
└── phases/             # Detailed phase breakdowns
    ├── phase-1.md
    └── ...

docs/progress/
├── state.json          # Machine-readable progress
└── phase-*-summary.md  # Human-readable checkpoints
```

## Current Phase Tasks
See `docs/prd/phases/` for detailed task breakdowns with dependencies.
