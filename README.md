# vibe-assistant

> **Turn ideas into structured, AI-executable task breakdowns for vibe coding.**

Built with love in Auckland

[![npm version](https://img.shields.io/npm/v/vibe-assistant.svg)](https://www.npmjs.com/package/vibe-assistant)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is this?

**vibe-assistant** enables "vibe coding" - going from a rough idea to a structured implementation plan that AI coding agents can execute one task at a time. It can either:

1. **Create a PRD from scratch** - Describe your idea, and vibe-assistant uses Claude to generate a full PRD with your feedback
2. **Parse an existing PRD** - Already have a PRD? Feed it in and get structured tasks

Either way, you get:

- Phased implementation roadmap with clear task dependencies
- Progress tracking via `state.json`
- Agent instruction files (`CLAUDE.md`, `AGENTS.md`)
- Slash commands for workflow (`/next-task`, `/checkpoint`, etc.)
- "Check before fixing" - prevents AI from wasting time on unimplemented features

**Note:** vibe-assistant generates planning documents and task breakdowns. Your PRD will include deployment recommendations (CI/CD, cloud providers, etc.), but actual deployment scripts are created during task implementation, not by this tool.

---

## Before You Start

**Option A: Let vibe-assistant create your PRD** (recommended for new projects)

```bash
vibe-assistant create
```

This opens an editor where you describe your idea. Claude will generate a full PRD, ask for your feedback, and refine it until you're happy. Then it formats and parses it automatically.

**Option B: Bring your own PRD**

If you already have a PRD or prefer to write one manually, here's how to create a great one:

### Step 1: Develop Your Idea with an LLM

Use any LLM (ChatGPT, Claude, Gemini, etc.) to flesh out your idea. Iterate multiple times until it's specific and complete.

**Things to decide:**
- Deployment: On-prem, AWS, Google Cloud, Vercel, etc.
- CI/CD: Fully automated pipelines? GitHub Actions? Manual deploys?
- Tech stack: Specific requirements, or let the AI recommend?
- Architecture: Monolith, microservices, serverless?
- Database: SQL, NoSQL, specific providers?

**Just ask the LLM to write your PRD and keep refining it.** Don't worry about formatting yet.

### Step 2: Validate Your PRD

Start a **new LLM session**, paste your entire PRD, and ask:

> "Assess this PRD for any gaps, inconsistencies, or missing features that should be included."

Repeat this as many times as needed. Each fresh session gives you unbiased feedback.

**CRITICAL: Read your PRD yourself. Understand every section. You need to know what you're building.**

### Step 3: Format Your PRD

Once you're happy with the content, start another new session and format it using our template:

```bash
# If vibe-assistant is installed globally
cat $(npm root -g)/vibe-assistant/examples/prd-template.md
```

Paste the template into your LLM along with your PRD and ask it to reformat your PRD following the template structure.

### Step 4: Run vibe-assistant

Save your formatted PRD to a file (e.g., `requirements.md`) and run:

```bash
vibe-assistant init
```

---

## Quick Start

```bash
# Install globally
npm install -g vibe-assistant

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Option 1: Create a PRD from your idea
cd your-project
vibe-assistant create

# Option 2: Parse an existing PRD
vibe-assistant init
```

That's it! Claude generates everything your AI coding agent needs to get started.

---

## What Gets Generated

```
your-project/
├── raw-prd.md                  <- Original PRD (if using create)
├── docs/
│   ├── prd/
│   │   ├── PRD.md              <- Task breakdown summary
│   │   ├── phases/
│   │   │   ├── phase-1.md      <- Detailed task breakdowns
│   │   │   ├── phase-2.md
│   │   │   └── ...
│   │   ├── research/           <- For research notes (initially empty)
│   │   └── architecture/       <- For architecture docs (initially empty)
│   └── progress/
│       ├── state.json          <- Machine-readable progress
│       └── phase-*-summary.md  <- Created via /checkpoint command
│
├── .claude/                    <- (if target: claude-code or both)
│   └── commands/
│       ├── next-task.md        <- Get next task
│       ├── checkpoint.md       <- Save progress
│       ├── phase-status.md     <- Show completion
│       └── check-issue.md      <- Bug vs not-implemented checker
│
├── CLAUDE.md                   <- (if target: claude-code or both)
└── AGENTS.md                   <- (if target: codex or both)
```

**Want to see example output?** Check the `examples/sample-output/` directory for a complete example of generated files.

---

## Commands

### `vibe-assistant create`

Create a PRD from a rough project idea. This is the easiest way to get started.

```bash
vibe-assistant create
```

What happens:
1. Opens your editor to describe your project idea
2. Asks which AI agent you'll use (Claude Code, Codex, or both)
3. **Asks how you want to deploy** (see Deployment Strategies below)
4. Claude generates a comprehensive PRD with appropriate deployment tasks
5. Shows you a summary and asks for feedback
6. Refines the PRD based on your feedback (repeat until approved)
7. Formats the PRD and generates all task files

### `vibe-assistant init`

Parse an existing PRD file into structured tasks.

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

## Deployment Strategies

When creating a PRD, vibe-assistant asks how you want to deploy your project. This ensures the generated tasks include appropriate CI/CD and infrastructure setup.

| Strategy | What's Included |
|----------|-----------------|
| **Local only** | Git for version control, no remote. Best for personal projects or learning. |
| **GitHub repository** | GitHub remote, no automated deployment. Deploy manually or separately. |
| **GitHub + Cloud hosting** | GitHub + Vercel/Netlify/Railway/etc. Auto-deploy on push. |
| **GitHub + AWS** | Full AWS infrastructure with Terraform/CDK, staging environments, secrets management. |
| **GitHub + Google Cloud** | Full GCP infrastructure with Terraform/CDK, staging environments. |
| **GitHub + Azure** | Full Azure infrastructure with Terraform/CDK, staging environments. |
| **Self-hosted** | Docker + docker-compose, deploy to VPS with nginx and SSL. |

### Cloud Hosting Providers (for GitHub + Cloud)

When you choose "GitHub + Cloud hosting", you'll be asked which provider:
- **Vercel** - Recommended for Next.js/React apps
- **Netlify** - Great for static sites and JAMstack
- **Railway** - Good for full-stack with databases
- **Render** - Good all-rounder
- **Fly.io** - Good for global distribution

### Infrastructure as Code (for AWS/GCP/Azure)

When you choose enterprise cloud (AWS/GCP/Azure), you'll be asked which IaC tool:
- **Terraform** - Recommended, cloud-agnostic
- **AWS CDK / Pulumi** - TypeScript-based, great for developers
- **CloudFormation / ARM templates** - Native to cloud provider
- **None** - Manual setup via cloud console

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
| `create_prd` | Create a PRD from a project idea (with optional self-refinement) |
| `parse_prd` | Parse a PRD file into structured tasks |
| `get_status` | Get current project progress |
| `get_next_task` | Get the next pending task (respects task dependencies) |
| `check_if_implemented` | Check if an issue is a bug or not implemented |

### MCP Tool Parameters

**`create_prd`**
| Parameter | Type | Description |
|-----------|------|-------------|
| `idea` | string | Project idea or description (required) |
| `deployment_type` | string | **Required.** One of: `local`, `github-only`, `github-cloud`, `github-aws`, `github-gcp`, `github-azure`, `self-hosted` |
| `cloud_provider` | string | Cloud hosting provider (required if `deployment_type` is `github-cloud`). One of: `vercel`, `netlify`, `railway`, `render`, `fly-io`, `other` |
| `iac_tool` | string | IaC tool (required if `deployment_type` is `github-aws/gcp/azure`). One of: `terraform`, `cdk`, `pulumi`, `cloudformation`, `none` |
| `project_name` | string | Project name (auto-detected if not provided) |
| `project_dir` | string | Project directory to write files to (defaults to current directory) |
| `refinement_passes` | number | Number of AI self-refinement passes (default: 1). Higher values produce more polished PRDs. |
| `interactive` | boolean | If true, returns PRD for user feedback instead of auto-refining (default: false) |
| `feedback` | string | User feedback to refine an existing PRD (used with interactive mode) |
| `current_prd` | string | Current PRD content to refine (used with interactive mode and feedback) |

**Interactive Mode Flow:**
1. Call `create_prd` with `interactive: true` to get initial PRD
2. Review the PRD and call again with `feedback`, `current_prd`, and `interactive: true` to refine
3. Repeat step 2 until satisfied
4. Call with `feedback`, `current_prd`, and `interactive: false` to finalize and generate task files

**`parse_prd`**
| Parameter | Type | Description |
|-----------|------|-------------|
| `prd_path` | string | Path to the PRD file to parse (required) |
| `project_name` | string | Project name (auto-detected if not provided) |
| `target_agent` | string | Target AI agent: `claude-code`, `codex`, or `both` |
| `project_dir` | string | Project directory to write files to (defaults to current directory) |

### Example Usage

Once configured, you can ask Claude:
- "Create a PRD for a todo app with user authentication, deployed to Vercel"
- "Create a PRD for an API service deployed to AWS with Terraform"
- "Parse my PRD at ./docs/requirements.md"
- "What's the current project status?"
- "What's the next task I should work on?"
- "Is user authentication implemented yet?"

Claude will call the appropriate MCP tool directly, asking for deployment details if not specified.

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
| `--set-model <model>` | Set Claude model (default: `claude-sonnet-4-5-20250929`) |

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

## PRD Templates

Not sure how to structure your PRD? We have two options:

### Quick-Start (Simple Projects)
```bash
cat node_modules/vibe-assistant/examples/quickstart-prd.md
```
A minimal template for small projects. Fill in the blanks and go.

### Full Template (Complex Projects)
```bash
cat node_modules/vibe-assistant/examples/prd-template.md
```
The comprehensive **Repository Planning Graph (RPG)** template for larger projects. Helps you:
- Separate functional capabilities from code structure
- Define explicit dependencies between modules
- Create phases that follow topological order
- Write PRDs that produce better task breakdowns

**Tip:** Start with quick-start for simple projects. Use the full template when you have multiple developers, complex dependencies, or need detailed architecture planning.

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

## Troubleshooting

### "Configuration Error: Missing Anthropic API key"

Set your API key via environment variable or config:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
# or
vibe-assistant config --set-anthropic-key sk-ant-...
```

### Research step failing

The Perplexity research step is optional. If it fails, vibe-assistant continues without it. To enable research:
```bash
export PERPLEXITY_API_KEY=pplx-...
```

### "Task files already exist"

Use `vibe-assistant update` to re-parse or regenerate. Choose "Re-parse" to preserve progress for matching task IDs.

### Slash commands not working in Claude Code

Ensure the `.claude/commands/` directory was created:
```bash
ls .claude/commands/
```

If missing, re-run `vibe-assistant init` or `vibe-assistant update`.

### Tasks seem out of order

Tasks should be completed in dependency order. Use `/next-task` to get the next task whose dependencies are met. Don't skip ahead unless all dependencies are complete.

### AI keeps trying to fix unimplemented features

This is what vibe-assistant prevents! Make sure:
1. The generated `CLAUDE.md` is in your project root
2. Use `/check-issue <description>` before investigating any reported issue
3. Check `docs/progress/state.json` to see what's actually implemented

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
  <sub>Making AI coding agents actually useful since 2025</sub>
</p>
