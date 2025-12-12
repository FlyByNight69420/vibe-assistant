import type { PRDDocument } from '../types.js';

export function generateClaudeMd(prd: PRDDocument, outputDir: string): string {
  return `# ${prd.projectInfo.name}

## Project Overview
${prd.overview.problemStatement}

## Quick Start for Claude Code

### Before Starting Work
1. **Read the PRD:** \`${outputDir}/PRD.md\`
2. **Check progress:** \`docs/progress/state.json\`
3. **Read current phase:** \`${outputDir}/phases/phase-{N}.md\`

### Available Commands
- \`/next-task\` - Get the next task to work on
- \`/checkpoint\` - Save progress and create summary
- \`/phase-status\` - Show current phase completion
- \`/research <topic>\` - Research a technical topic

### Implementation Guidelines
- Work through phases sequentially (Phase 1 → Phase 2 → ...)
- Complete all tasks in a phase before moving on
- Run \`/checkpoint\` after completing each task
- If blocked, use \`/research\` to investigate solutions

### Context Retention
When starting a new session or after a long break:
1. Read \`${outputDir}/PRD.md\` sections 1-5
2. Check \`docs/progress/state.json\` for current state
3. Read the current phase file
4. Review recent checkpoint summaries in \`docs/progress/\`

### File Structure
\`\`\`
${outputDir}/
├── PRD.md              # Main requirements document
├── phases/             # Detailed phase breakdowns
│   ├── phase-1.md
│   └── ...
└── research/           # Research findings

docs/progress/
├── state.json          # Machine-readable progress
└── phase-*-summary.md  # Human-readable checkpoints
\`\`\`

## Tech Stack
${prd.architecture.techStackRationale}

## Key Architecture Decisions
${prd.architecture.decisions.map((d) => `- ${d}`).join('\n')}

## Current Phase Tasks
See \`${outputDir}/phases/\` for detailed task breakdowns with dependencies.
`;
}

export function generateAgentsMd(prd: PRDDocument, outputDir: string): string {
  return `# ${prd.projectInfo.name} - Codex Agent Instructions

## Project Context
${prd.overview.problemStatement}

## How to Work on This Project

### Initial Setup
1. Read the full PRD at \`${outputDir}/PRD.md\`
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

### Research Tasks
Some tasks require research before implementation. These are marked with "Research Required" in the task description. Conduct the research and save findings to \`${outputDir}/research/\`.

## Structural Overview

### Module Organization
${prd.structuralDecomposition.map((m) => `- **${m.name}** (\`${m.path}\`): ${m.description}`).join('\n')}

### Dependency Layers
${prd.dependencyGraph.map((layer) => `
**${layer.name}**
- Modules: ${layer.modules.join(', ')}
- Depends on: ${layer.dependsOn.join(', ') || 'None'}`).join('\n')}

## Success Criteria
${prd.overview.successMetrics.map((m) => `- ${m}`).join('\n')}

## Testing Requirements
- Unit test coverage: ${prd.testStrategy.coverageTarget}%
- Critical scenarios: ${prd.testStrategy.criticalScenarios.join(', ')}
`;
}

export function generateSlashCommands(prd: PRDDocument, outputDir: string): Record<string, string> {
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
- Any research required
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

    'research.md': `# Research

Research a technical topic using available resources.

## Usage
\`/research <topic>\`

## Instructions
1. Take the topic provided after the command
2. Search for relevant information about the topic
3. Focus on:
   - Best practices
   - Common patterns
   - Potential pitfalls
   - Recommended approaches
4. Save findings to \`${outputDir}/research/{topic-slug}.md\`
5. Summarize key points for immediate use

## Output Format
Provide a concise summary with:
- Key recommendations
- Code examples if applicable
- Links to resources
- Things to avoid
`,
  };
}
