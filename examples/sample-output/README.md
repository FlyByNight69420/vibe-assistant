# Sample Output

This directory shows what vibe-assistant generates when you run `vibe-assistant create` or `vibe-assistant init`.

## Example Project: Todo App

A simple todo application with user authentication and cloud sync.

## Generated Files

```
sample-output/
├── CLAUDE.md                      # Instructions for Claude Code
├── docs/
│   ├── prd/
│   │   ├── PRD.md                 # Main task breakdown summary
│   │   └── phases/
│   │       └── phase-1.md         # Detailed phase breakdown
│   └── progress/
│       └── state.json             # Progress tracking (machine-readable)
└── .claude/
    └── commands/
        └── next-task.md           # Slash command definition
```

**Note:** This example shows only Phase 1 for brevity. A real project typically has 3-5 phases, each with its own `phase-N.md` file in the `phases/` directory.

## How to Use These Files

1. **Start with PRD.md** - Understand the overall project structure
2. **Check state.json** - See what's completed and what's next
3. **Read phase-N.md** - Get detailed task instructions
4. **Use slash commands** - `/next-task`, `/checkpoint`, etc.

## Progress State Example

The `state.json` shows:
- 2 tasks completed (phase1-task1, phase1-task2)
- 1 task in progress (phase1-task3)
- 11 tasks pending

This represents a project mid-way through Phase 1.
