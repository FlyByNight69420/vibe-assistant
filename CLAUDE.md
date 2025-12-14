# CLAUDE.md

> **Note:** This file is for developers working on vibe-assistant itself.
> End users get a different CLAUDE.md generated into their projects (see `src/generators/agent-configs.ts`).

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

vibe-assistant is a CLI tool and MCP server that helps users "vibe code" applications from idea to structured implementation. It takes rough project ideas or existing PRDs and generates phased task breakdowns with dependencies, progress tracking, and AI agent instructions. The goal is to enable automated, one-task-at-a-time development while preserving context.

**Note:** This tool generates task breakdowns and planning documents. Your PRD will include deployment recommendations (CI/CD, cloud providers, etc.), but actual deployment scripts are created during task implementation, not by vibe-assistant.

## Commands

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Run CLI directly via tsx (no build needed)
npm run typecheck    # Type-check without emitting
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
```

Run the CLI during development:
```bash
npm run dev -- create              # Create PRD from idea
npm run dev -- init                # Parse existing PRD
npm run dev -- status              # Check progress
npm run dev -- update              # Re-parse or regenerate
npm run dev -- config --show       # Show config
```

## Architecture

**Entry Points:**
- `src/bin/vibe-assistant.ts` - CLI entry point using Commander
- `src/bin/vibe-assistant-mcp.ts` - MCP server entry point

**Core Flows:**

### Create Flow (`cli/commands/create.ts`)
1. User describes project idea in editor
2. User selects target AI agent (claude-code, codex, or both)
3. **User selects deployment strategy** (local, github-only, github-cloud, github-aws/gcp/azure, self-hosted)
4. `researchProjectIdea()` researches tech stack, versions, complexity (if Perplexity configured)
5. `generateInitialPRD()` creates comprehensive PRD from idea + research + deployment config
6. User reviews summary and provides feedback
7. `refinePRD()` iterates based on feedback (loop until approved)
8. `formatWithRPGTemplate()` converts PRD to structured JSON
9. `writePRDFiles()` generates all output files

### Init Flow (`cli/commands/init.ts`)
1. User provides existing PRD file path
2. `researchPRDContext()` researches tech from PRD content (if Perplexity configured)
3. `parsePRD()` sends PRD + research to Claude for structured extraction
4. `writePRDFiles()` generates all output files

**Key Modules:**
- `generators/prd-creator.ts` - PRD generation, refinement, and RPG formatting
- `parsers/prd.ts` - PRD parsing with Claude
- `generators/writer.ts` - Writes phase files, state.json, CLAUDE.md, slash commands
- `generators/agent-configs.ts` - Generates CLAUDE.md, AGENTS.md, slash commands
- `mcp/server.ts` - Exposes functionality as MCP tools

**Key Types (`types.ts`):**
- `ParsedPRD` - Full parsed output containing phases and tasks
- `Phase` - Contains tasks with entry/exit criteria
- `Task` - Individual work item with id, dependencies, status
- `ProgressState` - Tracks task completion in state.json
- `ResearchResults` - Structured research output (tech stack, versions, complexity, best practices)
- `PackageVersionInfo` - Package version details (name, version, LTS, deprecated, alternatives)
- `TaskGuidance` - Project complexity and task breakdown recommendations
- `DeploymentConfig` - User's deployment strategy (type, cloud provider, IaC tool)
- `DeploymentType` - One of: local, github-only, github-cloud, github-aws, github-gcp, github-azure, self-hosted

**LLM Integration (`llm/client.ts`):**
- Uses `@anthropic-ai/sdk` for Claude (claude-sonnet-4-5-20250929)
- Uses OpenAI SDK pointed at Perplexity API (sonar-pro model) for research
- `generateWithClaude()` - General-purpose Claude API wrapper used throughout
- `extractTechStack()` - Extracts technologies/packages from text
- `researchPackageVersions()` - Researches current versions and deprecation status
- `researchProjectComplexity()` - Analyzes project complexity and suggests task breakdown
- `researchPRDContext()` - Research orchestrator for init flow (parses existing PRD)
- `formatResearchResults()` - Formats research into prompt-ready string

**PRD Creator (`generators/prd-creator.ts`):**
- `researchProjectIdea()` - Research orchestrator for create flow (from raw idea)
- `generateInitialPRD()` - Creates comprehensive PRD from idea + research
- `refinePRD()` - Refines PRD based on user feedback
- `formatWithRPGTemplate()` - Converts raw PRD to structured JSON
- `extractPRDSummary()` - Extracts summary for display during feedback loop

**Research Flow:**
When Perplexity API key is configured, research includes:
1. Tech stack extraction from PRD/idea content
2. Package version lookup (current stable versions, LTS, deprecation warnings)
3. Project complexity assessment (suggested phases, tasks per phase, critical path)
4. Best practices research for identified technologies

## MCP Server

The MCP server (`src/mcp/server.ts`) exposes five tools:
- `create_prd` - Create a PRD from a project idea (requires deployment_type, supports interactive mode and self-refinement)
- `parse_prd` - Parse a PRD file into structured tasks
- `get_status` - Get current project progress
- `get_next_task` - Get the next pending task (respects task dependencies)
- `check_if_implemented` - Check if an issue is a bug or not yet implemented

**Deployment types for `create_prd`:** `local`, `github-only`, `github-cloud`, `github-aws`, `github-gcp`, `github-azure`, `self-hosted`

## Configuration

User config stored at `~/.vibe-assistant/config.json`:
- `anthropicApiKey` - Required for PRD parsing
- `perplexityApiKey` - Optional, enables research step before parsing
- `defaultAgent` - Target agent: `claude-code`, `codex`, or `both`
- `outputDir` - Where to write generated files (default: `docs/prd`)
- `claudeModel` - Claude model to use (default: `claude-sonnet-4-5-20250929`)
