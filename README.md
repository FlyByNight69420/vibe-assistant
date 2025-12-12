# vibe-assistant

AI-agent-optimized PRD generator using the RPG (Repository Planning Graph) methodology from Microsoft Research.

Generate comprehensive Product Requirements Documents specifically designed for AI coding agents like Claude Code and OpenAI Codex to implement. **Includes full infrastructure and deployment automation.**

## Features

- **Interactive PRD Generation**: Guided interview to capture all requirements
- **RPG Methodology**: Separates functional and structural thinking with explicit dependencies
- **Infrastructure as Code**: Generates IaC specs for Terraform, Pulumi, CloudFormation, CDK, etc.
- **CI/CD Pipelines**: GitHub Actions, GitLab CI, Jenkins configurations
- **Deployment Automation**: Bootstrap scripts, Docker configs, environment templates
- **Multi-Cloud Support**: AWS, GCP, Azure, Vercel, Railway, Fly.io, or self-hosted
- **Multi-Agent Support**: Generates configs for Claude Code (CLAUDE.md) and Codex (AGENTS.md)
- **Context Retention**: Slash commands, checkpoints, and progress tracking to maintain context
- **Research Integration**: Uses Perplexity or Claude to research best practices during generation
- **Progress Tracking**: JSON state file and markdown summaries to track implementation

## Installation

```bash
npm install -g vibe-assistant
```

## Setup

Configure your API keys:

```bash
# Option 1: Environment variables
export ANTHROPIC_API_KEY=sk-...
export PERPLEXITY_API_KEY=pplx-...  # Optional, for research

# Option 2: Config file
vibe-assistant config --set-anthropic-key sk-...
vibe-assistant config --set-perplexity-key pplx-...
```

## Usage

### Generate a new PRD

```bash
cd your-project-directory
vibe-assistant init
```

This will:
1. Conduct an interactive interview about your project
2. Collect infrastructure & deployment preferences (hosting, CI/CD, IaC, etc.)
3. Research best practices for your tech stack
4. Generate a comprehensive RPG-structured PRD with:
   - Full infrastructure specifications
   - CI/CD pipeline definitions
   - Bootstrap scripts (zero to running)
   - Environment configurations
5. Create agent configuration files (CLAUDE.md/AGENTS.md)
6. Set up slash commands for context retention

### Check progress

```bash
vibe-assistant status
```

### Update an existing PRD

```bash
vibe-assistant update
```

Options:
- Add new features
- Modify existing requirements
- Add research findings
- Regenerate from scratch

## Generated Files

```
your-project/
├── docs/
│   ├── prd/
│   │   ├── PRD.md              # Main PRD document
│   │   ├── phases/
│   │   │   ├── phase-1.md      # Phase details + tasks
│   │   │   └── ...
│   │   └── research/           # Research findings
│   └── progress/
│       ├── state.json          # Machine-readable progress
│       └── phase-*-summary.md  # Checkpoint summaries
├── .claude/
│   └── commands/
│       ├── next-task.md        # Get next task
│       ├── checkpoint.md       # Save progress
│       ├── phase-status.md     # Show progress
│       └── research.md         # Research a topic
├── CLAUDE.md                   # Claude Code instructions
└── AGENTS.md                   # Codex instructions (if selected)
```

## Slash Commands

When using Claude Code, these commands help maintain context:

- `/next-task` - Get the next task to work on
- `/checkpoint` - Save progress and create summary
- `/phase-status` - Show current phase completion
- `/research <topic>` - Research a technical topic

## RPG Methodology

The Repository Planning Graph methodology structures PRDs with:

1. **Overview** - Problem, users, success metrics
2. **Functional Decomposition** - Capability domains and features
3. **Structural Decomposition** - Module organization
4. **Dependency Graph** - Build order and dependencies
5. **Implementation Roadmap** - Phased tasks with criteria
6. **Test Strategy** - Testing requirements
7. **Architecture** - Technical decisions
8. **Infrastructure & Deployment** - Complete deployment automation:
   - Hosting platform & cloud services
   - Infrastructure as Code file specifications
   - CI/CD pipeline configuration
   - Container orchestration
   - Environment definitions
   - Secrets management strategy
   - Bootstrap steps (zero to running)
   - Teardown steps
9. **Risks** - Risk assessment and mitigations

## Infrastructure Interview

During `vibe-assistant init`, you'll be asked about:

- **Hosting**: AWS, GCP, Azure, Vercel, Netlify, Railway, Fly.io, or self-hosted
- **Self-hosted options**: Docker Compose, Kubernetes, shell scripts, systemd
- **Repository**: GitHub, GitLab, Bitbucket
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins, CircleCI
- **Infrastructure as Code**: Terraform, Pulumi, CloudFormation, CDK, Bicep
- **Containerization**: Docker with optional orchestration
- **Environments**: Development, staging, production
- **Secrets**: AWS Secrets Manager, GCP Secret Manager, Vault, Doppler, env files

## Configuration

View current config:
```bash
vibe-assistant config --show
```

Options:
- `--set-anthropic-key <key>` - Set Claude API key
- `--set-perplexity-key <key>` - Set Perplexity API key
- `--set-research-provider <provider>` - perplexity or claude
- `--set-default-agent <agent>` - claude-code, codex, or both

## License

MIT
