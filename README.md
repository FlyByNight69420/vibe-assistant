# vibe-assistant

> **Parse your PRDs into structured tasks for AI coding agents like Claude Code.**

Built with love in Auckland

[![npm version](https://img.shields.io/npm/v/vibe-assistant.svg)](https://www.npmjs.com/package/vibe-assistant)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is this?

**vibe-assistant** takes your existing Product Requirements Document (PRD) and transforms it into a structured task breakdown that AI coding agents like **Claude Code** and **OpenAI Codex** can actually use.

Just give it your PRD file, and it creates:

- Phased implementation roadmap with clear task dependencies
- Progress tracking via `state.json`
- Agent instruction files (`CLAUDE.md`, `AGENTS.md`)
- Slash commands for workflow (`/next-task`, `/checkpoint`, etc.)

---

## Quick Start

```bash
# Install globally
npm install -g vibe-assistant

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Parse your PRD!
cd your-project
vibe-assistant init
```

You'll be prompted for:
1. Path to your PRD file (markdown, text, etc.)
2. Project name (optional - auto-detected from PRD)
3. Which AI agent you're using

That's it! Claude parses your PRD and generates everything your AI coding agent needs to get started.

---

## What Gets Generated

```
your-project/
├── docs/
│   ├── prd/
│   │   ├── PRD.md              <- Task breakdown summary
│   │   └── phases/
│   │       ├── phase-1.md      <- Detailed task breakdowns
│   │       ├── phase-2.md
│   │       └── ...
│   └── progress/
│       ├── state.json          <- Machine-readable progress
│       └── phase-*-summary.md  <- Checkpoint summaries
│
├── .claude/
│   └── commands/
│       ├── next-task.md        <- Get next task
│       ├── checkpoint.md       <- Save progress
│       ├── phase-status.md     <- Show completion
│       └── check-issue.md      <- Bug vs not-implemented checker
│
├── CLAUDE.md                   <- Instructions for Claude Code
└── AGENTS.md                   <- Instructions for Codex
```

---

## Commands

### `vibe-assistant init`

Parse a PRD file into structured tasks.

```bash
vibe-assistant init
```

### `vibe-assistant status`

Check your project's progress.

```bash
vibe-assistant status
```

```
Project Status

Current Phase: 2
Last Updated: 12/13/2025, 10:30 AM

Overall Progress:
  ████████░░░░░░░░░░░░ 40%
  8 completed, 1 in progress, 11 pending
```

### `vibe-assistant update`

Re-parse a PRD or regenerate task files.

```bash
vibe-assistant update
```

Options:
- Re-parse PRD (preserves progress for matching task IDs)
- Regenerate from scratch

---

## MCP Server Integration

vibe-assistant can run as an MCP (Model Context Protocol) server, allowing Claude Code to call it directly without shell commands.

### Setup

Add to your Claude Code MCP settings (`~/.claude/claude_desktop_config.json` or via Claude Code settings):

```json
{
  "mcpServers": {
    "vibe-assistant": {
      "command": "npx",
      "args": ["-y", "vibe-assistant-mcp"]
    }
  }
}
```

Or if installed globally:
```json
{
  "mcpServers": {
    "vibe-assistant": {
      "command": "vibe-assistant-mcp"
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `parse_prd` | Parse a PRD file into structured tasks |
| `get_status` | Get current project progress |
| `get_next_task` | Get the next pending task |
| `check_if_implemented` | Check if an issue is a bug or not implemented |

### Example Usage

Once configured, you can ask Claude:
- "Parse my PRD at ./docs/requirements.md"
- "What's the current project status?"
- "What's the next task I should work on?"
- "Is user authentication implemented yet?"

Claude will call the appropriate MCP tool directly.

---

## Slash Commands

When using Claude Code, these commands help maintain context:

| Command | What it does |
|---------|--------------|
| `/next-task` | Get the next task to work on |
| `/checkpoint` | Save progress and create summary |
| `/phase-status` | Show current phase completion |
| `/check-issue <desc>` | Check if issue is bug or not implemented yet |

---

## Configuration

### API Keys

```bash
# Option 1: Environment variables (recommended)
export ANTHROPIC_API_KEY=sk-ant-...
export PERPLEXITY_API_KEY=pplx-...  # Optional, for research

# Option 2: Config file
vibe-assistant config --set-anthropic-key sk-ant-...
vibe-assistant config --set-perplexity-key pplx-...
```

### View Config

```bash
vibe-assistant config --show
```

### All Options

| Flag | Description |
|------|-------------|
| `--set-anthropic-key <key>` | Set Claude API key (required) |
| `--set-perplexity-key <key>` | Set Perplexity API key (optional, for research) |
| `--set-default-agent <agent>` | `claude-code`, `codex`, or `both` |

---

## The "Check Before Fixing" Feature

One of the most useful features is the `/check-issue` command and the guidance in `CLAUDE.md`.

When a user reports something "broken", the AI agent is instructed to:

1. **Check `state.json`** - What phase are we on? What's completed?
2. **Check the PRD** - Is this feature supposed to be implemented yet?
3. **Determine verdict:**
   - Feature in future phase? → Tell user "not implemented yet"
   - Feature should be working? → Investigate the bug

This prevents wasting time "fixing" things that simply haven't been built yet.

---

## How It Works

1. You provide your PRD (any text format - markdown, plain text, etc.)
2. **Research step** (if Perplexity API key is set):
   - Claude extracts key technical topics from your PRD
   - Perplexity researches best practices for each topic
   - Research results inform the task generation
3. Claude analyzes the PRD and extracts:
   - Project goals and summary
   - Implementation phases with entry/exit criteria
   - Individual tasks with dependencies
   - Parallelization opportunities
4. The structured output is saved as markdown files and JSON
5. Your AI coding agent uses these files to work through the project systematically

**Note:** The Perplexity research step is optional but recommended. It helps Claude create more informed tasks based on current best practices for your tech stack.

---

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

---

## License

MIT © Nick K

---

<p align="center">
  <b>Built with love in Auckland, New Zealand</b>
  <br>
  <sub>Making AI coding agents actually useful since 2024</sub>
</p>
