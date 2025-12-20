import type { ParsedPRD, Task, TechStackInfo } from '../types.js';

export function generateClaudeMd(prd: ParsedPRD, outputDir: string): string {
  return `# ${prd.projectInfo.name}

## Project Overview
${prd.overview.summary}

### Goals
${prd.overview.goals.map((g) => `- ${g}`).join('\n')}

---

## 🚀 SESSION STARTUP PROTOCOL (MANDATORY)

**Every session MUST begin with these steps in order:**

1. **Verify working directory**
   \`\`\`bash
   pwd
   \`\`\`
   Ensure you're in the correct project root.

2. **Review git history** - Understand what was done recently
   \`\`\`bash
   git log --oneline -10
   git status
   \`\`\`

3. **Read progress state** - Know exactly where we are
   - Check \`docs/progress/state.json\` for current phase and task status
   - Read \`docs/progress/progress.txt\` for session history

4. **Start the development environment**
   \`\`\`bash
   ./init.sh
   \`\`\`
   This script auto-starts all necessary servers/services.

5. **Run basic validation** - Ensure nothing is broken
   \`\`\`bash
   npm test 2>/dev/null || echo "No tests yet"
   \`\`\`
   If tests exist and fail, prioritize fixing them before new work.

6. **Identify next task** - Use the structured task list
   - Run \`/next-task\` or check \`docs/progress/tasks.json\`
   - Find the highest-priority pending task with satisfied dependencies

**Never skip these steps.** Each session starts fresh without memory of previous work.

---

## Available Commands
- \`/next-task\` - Get the next task to work on
- \`/checkpoint\` - Save progress and create summary
- \`/phase-status\` - Show current phase completion
- \`/check-issue <description>\` - Check if an issue is a bug or not implemented yet
- \`/session-end\` - Properly close out a session

---

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

---

## Implementation Guidelines

### Single-Task Focus
- **Work on ONE task at a time** - Complete it fully before moving on
- This prevents context exhaustion mid-implementation
- Reduces cleanup work from partial implementations

### Task Completion Checklist
Before marking a task complete:
1. ✅ Code is written and compiles
2. ✅ Basic tests pass (if applicable)
3. ✅ Feature works in browser/UI (use Puppeteer or manual verification)
4. ✅ Changes are committed with descriptive message
5. ✅ Progress files are updated

### Testing Requirements
- **Unit tests alone are insufficient** - They don't catch integration issues
- **Prefer E2E/integration tests** that simulate real user workflows
- If browser automation (Puppeteer MCP) is available, use it to verify UI changes
- Always test the feature from a user's perspective, not just code execution

### Phase Progression
- Complete ALL tasks in a phase before starting the next
- Verify exit criteria before phase transition
- Create a phase summary checkpoint when completing a phase

---

## 🛑 SESSION END PROTOCOL (MANDATORY)

**Before ending ANY session, complete these steps:**

1. **Commit all changes** with descriptive message
   \`\`\`bash
   git add -A
   git commit -m "feat(phase-X): Complete task-Y - brief description"
   \`\`\`

2. **Update progress files**
   - Update \`docs/progress/state.json\` with task completion
   - Add entry to \`docs/progress/progress.txt\` documenting what was done
   - Run \`/checkpoint\` if significant work was completed

3. **Verify clean state**
   \`\`\`bash
   git status  # Should show clean working tree
   npm test    # Tests should pass (if they exist)
   \`\`\`

4. **Never leave the environment broken**
   - If tests are failing, fix them before ending
   - If build is broken, fix it before ending
   - The next session starts with no memory - don't leave messes

---

## File Structure
\`\`\`
${outputDir}/
├── PRD.md              # Task breakdown document
└── phases/             # Detailed phase breakdowns
    ├── phase-1.md
    └── ...

docs/progress/
├── state.json          # Machine-readable progress (JSON)
├── tasks.json          # All tasks in JSON format (corruption-resistant)
├── progress.txt        # Session-by-session progress log
└── phase-*-summary.md  # Human-readable checkpoints

init.sh                 # Development environment startup script
\`\`\`

## JSON-Based Task Tracking

**IMPORTANT:** Use \`docs/progress/tasks.json\` for authoritative task status.
- JSON format is corruption-resistant (models are less likely to incorrectly modify it)
- Never edit task descriptions in this file - only update status fields
- When reading tasks, prefer this file over markdown phase files

---

## Context Management

Claude Code has a 200K token context window. When working on large tasks:

- **Use \`/clear\`** to reset the conversation when context gets cluttered
- **Use \`/compact\`** to summarize progress and continue with a smaller context
- Monitor context usage - if responses slow down or quality drops, consider clearing

**When to clear context:**
- After completing a major task or phase
- When switching between unrelated parts of the codebase
- If Claude starts "forgetting" earlier instructions

---

## Visual Debugging

For UI/frontend work, **use screenshots** for debugging:
- Take screenshots of UI issues and share them
- Claude can analyze visual bugs that aren't apparent from code alone
- Especially useful for CSS, layout, and responsive design issues

If **Puppeteer MCP** or browser automation is available:
- Use it to capture screenshots programmatically
- Automate visual regression testing
- Verify UI changes across different states

---

## Keyboard Shortcuts & Tips

- **Press Escape once** - Interject and redirect Claude while it's working
- **Press Escape twice** - Jump back into the conversation after interrupting
- **Shift+Tab** - Toggle auto-accept mode for faster workflows (use with caution)

---

## Parallel Work

You can run **multiple Claude Code instances** simultaneously:
- Work on independent features in parallel
- One instance for implementation, another for testing
- Different terminals for frontend vs backend work

Ensure parallel work doesn't conflict:
- Work on different files/modules
- Coordinate through git branches if needed
- Use the progress files to avoid duplicate work

---

## MCP Server Integration

Claude Code can be extended with **MCP (Model Context Protocol) servers**:

- **Puppeteer MCP** - Browser automation for E2E testing and screenshots
- **Database MCPs** - Direct database access for debugging
- **API MCPs** - Integration with external services
- **Custom MCPs** - Build project-specific tooling

Check available MCP servers with your Claude Code installation.
Well-documented CLI tools (like GitHub's \`gh\` command) also extend capabilities.

---

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

---

## 🚀 SESSION STARTUP PROTOCOL (MANDATORY)

**Every session MUST begin with these steps in order:**

1. **Verify working directory** - Run \`pwd\` to ensure you're in the correct project root

2. **Review git history** - Understand what was done recently
   - Run \`git log --oneline -10\` and \`git status\`

3. **Read progress state** - Know exactly where we are
   - Check \`docs/progress/state.json\` for current phase and task status
   - Read \`docs/progress/progress.txt\` for session history

4. **Start the development environment** - Run \`./init.sh\`
   - This script auto-starts all necessary servers/services

5. **Run basic validation** - Run tests to ensure nothing is broken
   - If tests fail, prioritize fixing them before new work

6. **Identify next task** - Check \`docs/progress/tasks.json\`
   - Find the highest-priority pending task with satisfied dependencies

**Never skip these steps.** Each session starts fresh without memory of previous work.

---

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

---

## Implementation Guidelines

### Single-Task Focus
- **Work on ONE task at a time** - Complete it fully before moving on
- This prevents context exhaustion mid-implementation
- Reduces cleanup work from partial implementations

### Task Completion Checklist
Before marking a task complete:
1. Code is written and compiles
2. Basic tests pass (if applicable)
3. Feature works in browser/UI (verify from user perspective)
4. Changes are committed with descriptive message
5. Progress files are updated

### Testing Requirements
- **Unit tests alone are insufficient** - They don't catch integration issues
- **Prefer E2E/integration tests** that simulate real user workflows
- Always test the feature from a user's perspective, not just code execution

### Phase Progression Rules
- Complete ALL tasks in a phase before starting the next
- Verify exit criteria before phase transition
- Create a phase summary when completing a phase
- **Always verify current progress before attempting any fixes**

---

## 🛑 SESSION END PROTOCOL (MANDATORY)

**Before ending ANY session, complete these steps:**

1. **Commit all changes** with descriptive message
   - \`git add -A && git commit -m "feat(phase-X): Complete task-Y - brief description"\`

2. **Update progress files**
   - Update \`docs/progress/state.json\` with task completion
   - Add entry to \`docs/progress/progress.txt\` documenting what was done

3. **Verify clean state**
   - Run \`git status\` - Should show clean working tree
   - Run tests - Should pass (if they exist)

4. **Never leave the environment broken**
   - If tests are failing, fix them before ending
   - If build is broken, fix it before ending
   - The next session starts with no memory - don't leave messes

---

## File Structure
\`\`\`
${outputDir}/
├── PRD.md              # Task breakdown document
└── phases/             # Detailed phase breakdowns

docs/progress/
├── state.json          # Machine-readable progress (JSON)
├── tasks.json          # All tasks in JSON format (corruption-resistant)
├── progress.txt        # Session-by-session progress log
└── phase-*-summary.md  # Human-readable checkpoints

init.sh                 # Development environment startup script
\`\`\`

## JSON-Based Task Tracking

**IMPORTANT:** Use \`docs/progress/tasks.json\` for authoritative task status.
- JSON format is corruption-resistant (models are less likely to incorrectly modify it)
- Never edit task descriptions in this file - only update status fields

---

## Context Management

When working on large tasks, be mindful of context limits:

- Clear conversation history when context gets cluttered
- Summarize progress before continuing with fresh context
- If responses slow down or quality drops, consider resetting

**When to reset context:**
- After completing a major task or phase
- When switching between unrelated parts of the codebase
- If the agent starts "forgetting" earlier instructions

---

## Visual Debugging

For UI/frontend work, **use screenshots** for debugging:
- Take screenshots of UI issues and share them
- Agents can analyze visual bugs that aren't apparent from code alone
- Especially useful for CSS, layout, and responsive design issues

If browser automation is available:
- Use it to capture screenshots programmatically
- Automate visual regression testing
- Verify UI changes across different states

---

## Parallel Work

You can run **multiple agent instances** simultaneously:
- Work on independent features in parallel
- One instance for implementation, another for testing
- Different terminals for frontend vs backend work

Ensure parallel work doesn't conflict:
- Work on different files/modules
- Coordinate through git branches if needed
- Use the progress files to avoid duplicate work

---

## CLI Tool Integration

Extend agent capabilities with well-documented CLI tools:
- **GitHub CLI (\`gh\`)** - PR creation, issue management, workflow runs
- **Docker CLI** - Container management and debugging
- **Database CLIs** - Direct database queries for debugging
- **Cloud CLIs** - AWS, GCP, Azure management

The more tools available, the more the agent can accomplish autonomously.
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

    'session-end.md': `# Session End

Properly close out a work session. This ensures the next session (or next agent) can pick up seamlessly.

## CRITICAL: Always run this before ending a session

The next session starts with NO MEMORY of this session. Everything must be documented.

## Instructions

### 1. Commit All Changes
\`\`\`bash
git add -A
git status  # Review what's being committed
git commit -m "feat(phase-X): [task-id] - brief description of what was done"
\`\`\`

Use conventional commit prefixes:
- \`feat\`: New feature
- \`fix\`: Bug fix
- \`refactor\`: Code refactoring
- \`docs\`: Documentation
- \`test\`: Tests
- \`chore\`: Maintenance

### 2. Update Progress State
Edit \`docs/progress/state.json\`:
- Mark completed tasks with \`"status": "completed"\` and \`"completedAt": "{timestamp}"\`
- Update \`"lastUpdated"\` field
- Add checkpoint if significant work was done

### 3. Update Progress Log
Append to \`docs/progress/progress.txt\`:
\`\`\`
## Session: {YYYY-MM-DD HH:MM}

### Completed
- [task-id]: Brief description of what was implemented

### Changes Made
- file1.ts: Added X functionality
- file2.ts: Fixed Y bug

### Current State
- Feature Z is now working
- Tests passing: X/Y

### Next Steps
- Next task: [task-id] - {title}
- Any blockers or notes for next session
\`\`\`

### 4. Update tasks.json
Edit \`docs/progress/tasks.json\`:
- Change completed tasks from \`"status": "pending"\` to \`"status": "completed"\`
- Only update status field, never modify task descriptions

### 5. Verify Clean State
\`\`\`bash
git status        # Should show clean working tree or only untracked files
npm test          # All tests should pass
npm run build     # Build should succeed (if applicable)
\`\`\`

### 6. Final Check
Before ending:
- [ ] All work is committed
- [ ] Progress files are updated
- [ ] Tests pass
- [ ] Build works
- [ ] Environment is not broken

**NEVER leave the environment in a broken state.** Fix issues before ending.
`,
  };
}

/**
 * Generate init.sh script for auto-starting the development environment
 * Adapts to the project's tech stack
 */
export function generateInitScript(prd: ParsedPRD): string {
  const tech = prd.techStack;
  const projectName = prd.projectInfo.name;

  // Generate tech-stack specific sections
  const { projectCheck, installDeps, startDev, quickCommands } = getTechStackCommands(tech);

  return `#!/bin/bash
# ${projectName} - Development Environment Startup Script
# Generated by vibe-assistant
#
# This script starts all necessary services for development.
# Run this at the beginning of each session: ./init.sh

set -e

echo "🚀 Starting ${projectName} development environment..."

${projectCheck}

${installDeps}

${startDev}

echo ""
echo "✅ Environment ready!"
echo ""
${quickCommands}
`;
}

/**
 * Get tech-stack specific commands for init.sh
 */
function getTechStackCommands(tech?: TechStackInfo): {
  projectCheck: string;
  installDeps: string;
  startDev: string;
  quickCommands: string;
} {
  // Default to Node.js if no tech stack specified
  if (!tech) {
    return getNodeCommands('npm');
  }

  // Docker takes precedence if present
  if (tech.hasDocker) {
    return getDockerCommands(tech);
  }

  switch (tech.language) {
    case 'javascript':
    case 'typescript':
      return getNodeCommands(tech.packageManager as 'npm' | 'yarn' | 'pnpm' | undefined, tech);

    case 'python':
      return getPythonCommands(tech);

    case 'go':
      return getGoCommands(tech);

    case 'rust':
      return getRustCommands(tech);

    case 'ruby':
      return getRubyCommands(tech);

    case 'java':
      return getJavaCommands(tech);

    default:
      return getGenericCommands(tech);
  }
}

function getNodeCommands(
  pm: 'npm' | 'yarn' | 'pnpm' | undefined,
  tech?: TechStackInfo
): ReturnType<typeof getTechStackCommands> {
  const packageManager = pm || 'npm';
  const installCmd = packageManager === 'yarn' ? 'yarn' : `${packageManager} install`;
  const runCmd = packageManager === 'yarn' ? 'yarn' : `${packageManager} run`;
  const devCmd = tech?.devCommand || `${runCmd} dev`;
  const testCmd = tech?.testCommand || `${runCmd} test`;
  const buildCmd = tech?.buildCommand || `${runCmd} build`;

  return {
    projectCheck: `# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the project root?"
    exit 1
fi`,

    installDeps: `# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    ${installCmd}
fi`,

    startDev: `# Start development server in background
echo "🔧 Starting development server..."

if ${runCmd} 2>/dev/null | grep -q "dev"; then
    echo "Starting '${devCmd}' in background..."
    ${devCmd} &
    DEV_PID=$!
    echo "Dev server started with PID: $DEV_PID"
    echo $DEV_PID > .dev-server.pid
else
    echo "ℹ️  No 'dev' script found in package.json."
    echo "   Add a 'dev' script or customize init.sh for your project."
fi`,

    quickCommands: `echo "📋 Quick commands:"
echo "   ${testCmd}        - Run tests"
echo "   ${buildCmd}       - Build project"
echo "   kill \\$(cat .dev-server.pid 2>/dev/null) 2>/dev/null  - Stop dev server"
echo ""`,
  };
}

function getPythonCommands(tech: TechStackInfo): ReturnType<typeof getTechStackCommands> {
  const pm = tech.packageManager || 'pip';
  const framework = tech.framework?.toLowerCase();

  let installCmd: string;
  let activateVenv = '';

  switch (pm) {
    case 'poetry':
      installCmd = 'poetry install';
      activateVenv = `# Activate poetry environment
if command -v poetry &> /dev/null; then
    eval "$(poetry env info --path)/bin/activate" 2>/dev/null || true
fi`;
      break;
    case 'pipenv':
      installCmd = 'pipenv install --dev';
      activateVenv = `# Activate pipenv environment
if command -v pipenv &> /dev/null; then
    eval "$(pipenv --venv)/bin/activate" 2>/dev/null || true
fi`;
      break;
    default:
      installCmd = 'pip install -r requirements.txt';
      activateVenv = `# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi`;
  }

  // Determine dev command based on framework
  let devCmd = tech.devCommand || 'python main.py';
  if (framework === 'django') {
    devCmd = 'python manage.py runserver';
  } else if (framework === 'fastapi') {
    devCmd = 'uvicorn main:app --reload';
  } else if (framework === 'flask') {
    devCmd = 'flask run --reload';
  }

  const testCmd = tech.testCommand || 'pytest';

  return {
    projectCheck: `# Check if we're in a Python project
if [ ! -f "requirements.txt" ] && [ ! -f "pyproject.toml" ] && [ ! -f "Pipfile" ]; then
    echo "❌ Error: No Python project files found. Are you in the project root?"
    exit 1
fi

${activateVenv}`,

    installDeps: `# Install dependencies
echo "📦 Checking dependencies..."
${installCmd}`,

    startDev: `# Start development server in background
echo "🔧 Starting development server..."
echo "Running: ${devCmd}"
${devCmd} &
DEV_PID=$!
echo "Dev server started with PID: $DEV_PID"
echo $DEV_PID > .dev-server.pid`,

    quickCommands: `echo "📋 Quick commands:"
echo "   ${testCmd}              - Run tests"
echo "   kill \\$(cat .dev-server.pid 2>/dev/null) 2>/dev/null  - Stop dev server"
echo ""`,
  };
}

function getGoCommands(tech: TechStackInfo): ReturnType<typeof getTechStackCommands> {
  const devCmd = tech.devCommand || 'go run .';
  const testCmd = tech.testCommand || 'go test ./...';
  const buildCmd = tech.buildCommand || 'go build';

  return {
    projectCheck: `# Check if we're in a Go project
if [ ! -f "go.mod" ]; then
    echo "❌ Error: go.mod not found. Are you in the project root?"
    exit 1
fi`,

    installDeps: `# Download dependencies
echo "📦 Downloading Go dependencies..."
go mod download`,

    startDev: `# Start development server in background
echo "🔧 Starting application..."

# Use air for hot reload if available, otherwise plain go run
if command -v air &> /dev/null; then
    echo "Using 'air' for hot reload..."
    air &
else
    echo "Running: ${devCmd}"
    ${devCmd} &
fi
DEV_PID=$!
echo "Application started with PID: $DEV_PID"
echo $DEV_PID > .dev-server.pid`,

    quickCommands: `echo "📋 Quick commands:"
echo "   ${testCmd}       - Run tests"
echo "   ${buildCmd}             - Build binary"
echo "   kill \\$(cat .dev-server.pid 2>/dev/null) 2>/dev/null  - Stop server"
echo ""`,
  };
}

function getRustCommands(tech: TechStackInfo): ReturnType<typeof getTechStackCommands> {
  const devCmd = tech.devCommand || 'cargo run';
  const testCmd = tech.testCommand || 'cargo test';
  const buildCmd = tech.buildCommand || 'cargo build --release';

  return {
    projectCheck: `# Check if we're in a Rust project
if [ ! -f "Cargo.toml" ]; then
    echo "❌ Error: Cargo.toml not found. Are you in the project root?"
    exit 1
fi`,

    installDeps: `# Build dependencies (Cargo handles this automatically)
echo "📦 Building dependencies..."
cargo fetch`,

    startDev: `# Start development server in background
echo "🔧 Starting application..."

# Use cargo-watch for hot reload if available
if command -v cargo-watch &> /dev/null; then
    echo "Using 'cargo watch' for hot reload..."
    cargo watch -x run &
else
    echo "Running: ${devCmd}"
    ${devCmd} &
fi
DEV_PID=$!
echo "Application started with PID: $DEV_PID"
echo $DEV_PID > .dev-server.pid`,

    quickCommands: `echo "📋 Quick commands:"
echo "   ${testCmd}           - Run tests"
echo "   ${buildCmd}  - Build release binary"
echo "   kill \\$(cat .dev-server.pid 2>/dev/null) 2>/dev/null  - Stop server"
echo ""`,
  };
}

function getRubyCommands(tech: TechStackInfo): ReturnType<typeof getTechStackCommands> {
  const framework = tech.framework?.toLowerCase();
  const isRails = framework === 'rails' || framework === 'ruby on rails';

  const devCmd = tech.devCommand || (isRails ? 'rails server' : 'ruby app.rb');
  const testCmd = tech.testCommand || (isRails ? 'rails test' : 'rspec');

  return {
    projectCheck: `# Check if we're in a Ruby project
if [ ! -f "Gemfile" ]; then
    echo "❌ Error: Gemfile not found. Are you in the project root?"
    exit 1
fi`,

    installDeps: `# Install dependencies
echo "📦 Installing gems..."
bundle install`,

    startDev: `# Start development server in background
echo "🔧 Starting development server..."
echo "Running: ${devCmd}"
${devCmd} &
DEV_PID=$!
echo "Dev server started with PID: $DEV_PID"
echo $DEV_PID > .dev-server.pid`,

    quickCommands: `echo "📋 Quick commands:"
echo "   ${testCmd}           - Run tests"
echo "   kill \\$(cat .dev-server.pid 2>/dev/null) 2>/dev/null  - Stop dev server"
echo ""`,
  };
}

function getJavaCommands(tech: TechStackInfo): ReturnType<typeof getTechStackCommands> {
  const pm = tech.packageManager;
  const isMaven = pm === 'maven' || !pm; // Default to Maven
  const isGradle = pm === 'gradle';

  const runCmd = isMaven ? './mvnw spring-boot:run' : './gradlew bootRun';
  const testCmd = tech.testCommand || (isMaven ? './mvnw test' : './gradlew test');
  const buildCmd = tech.buildCommand || (isMaven ? './mvnw package' : './gradlew build');
  const devCmd = tech.devCommand || runCmd;

  const projectFile = isMaven ? 'pom.xml' : 'build.gradle';

  return {
    projectCheck: `# Check if we're in a Java project
if [ ! -f "${projectFile}" ]; then
    echo "❌ Error: ${projectFile} not found. Are you in the project root?"
    exit 1
fi`,

    installDeps: `# Download dependencies
echo "📦 Downloading dependencies..."
${isMaven ? './mvnw dependency:resolve' : './gradlew dependencies'}`,

    startDev: `# Start development server in background
echo "🔧 Starting application..."
echo "Running: ${devCmd}"
${devCmd} &
DEV_PID=$!
echo "Application started with PID: $DEV_PID"
echo $DEV_PID > .dev-server.pid`,

    quickCommands: `echo "📋 Quick commands:"
echo "   ${testCmd}        - Run tests"
echo "   ${buildCmd}     - Build project"
echo "   kill \\$(cat .dev-server.pid 2>/dev/null) 2>/dev/null  - Stop server"
echo ""`,
  };
}

function getDockerCommands(tech: TechStackInfo): ReturnType<typeof getTechStackCommands> {
  const devCmd = tech.devCommand || 'docker-compose up';

  return {
    projectCheck: `# Check if we're in a Docker project
if [ ! -f "docker-compose.yml" ] && [ ! -f "docker-compose.yaml" ] && [ ! -f "compose.yml" ]; then
    echo "❌ Error: No docker-compose file found. Are you in the project root?"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Error: Docker daemon is not running. Please start Docker."
    exit 1
fi`,

    installDeps: `# Pull/build Docker images
echo "📦 Building Docker images..."
docker-compose build`,

    startDev: `# Start containers in background
echo "🔧 Starting Docker containers..."
${devCmd} -d
echo "Docker containers started"`,

    quickCommands: `echo "📋 Quick commands:"
echo "   docker-compose logs -f   - View logs"
echo "   docker-compose ps        - List containers"
echo "   docker-compose down      - Stop containers"
echo "   docker-compose exec <service> sh  - Shell into container"
echo ""`,
  };
}

function getGenericCommands(tech: TechStackInfo): ReturnType<typeof getTechStackCommands> {
  const devCmd = tech.devCommand || 'echo "No dev command configured. Edit init.sh to add your start command."';
  const testCmd = tech.testCommand || 'echo "No test command configured"';

  return {
    projectCheck: `# Generic project check
echo "ℹ️  Tech stack: ${tech.language || 'unknown'}"
echo "   Customize this script for your specific project needs."`,

    installDeps: `# Install dependencies
echo "📦 Checking dependencies..."
# Add your dependency installation command here
# Examples:
#   npm install
#   pip install -r requirements.txt
#   go mod download`,

    startDev: `# Start development server
echo "🔧 Starting development environment..."
${devCmd} &
DEV_PID=$!
echo $DEV_PID > .dev-server.pid`,

    quickCommands: `echo "📋 Quick commands:"
echo "   ${testCmd}"
echo "   kill \\$(cat .dev-server.pid 2>/dev/null) 2>/dev/null  - Stop server"
echo ""
echo "ℹ️  Customize init.sh for your specific project needs."`,
  };
}

/**
 * Generate tasks.json - All tasks in JSON format for corruption-resistant tracking
 */
export function generateTasksJson(prd: ParsedPRD): object {
  const tasks: Array<{
    id: string;
    title: string;
    description: string;
    phase: number;
    phaseName: string;
    dependencies: string[];
    parallelizable: boolean;
    status: 'pending' | 'in_progress' | 'completed';
  }> = [];

  for (const phase of prd.phases) {
    for (const task of phase.tasks) {
      tasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        phase: phase.number,
        phaseName: phase.name,
        dependencies: task.dependencies,
        parallelizable: task.parallelizable,
        status: 'pending',
      });
    }
  }

  return {
    _warning: 'DO NOT edit task descriptions. Only update status field.',
    projectName: prd.projectInfo.name,
    totalTasks: tasks.length,
    generatedAt: new Date().toISOString(),
    tasks,
  };
}

/**
 * Generate initial progress.txt log
 */
export function generateProgressLog(prd: ParsedPRD): string {
  return `# ${prd.projectInfo.name} - Progress Log

This file documents session-by-session progress. Each agent session should read
this file at startup and append to it at session end.

---

## Session: ${new Date().toISOString().split('T')[0]} (Project Initialized)

### Setup
- Project initialized with ${prd.phases.length} phases and ${prd.totalTasks} tasks
- Generated task breakdown in docs/prd/
- Ready for Phase 1 implementation

### Task Summary
${prd.phases.map((p) => `- Phase ${p.number}: ${p.name} (${p.tasks.length} tasks)`).join('\n')}

### Next Steps
- Start with Phase 1, Task 1
- Run \`/next-task\` to get started

---
`;
}
