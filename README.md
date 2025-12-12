# 🚀 vibe-assistant

> **AI-powered PRD generator that writes docs your coding agent actually understands.**

Built with ❤️ in Auckland

[![npm version](https://img.shields.io/npm/v/vibe-assistant.svg)](https://www.npmjs.com/package/vibe-assistant)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ What is this?

**vibe-assistant** generates Product Requirements Documents (PRDs) specifically designed for AI coding agents like **Claude Code** and **OpenAI Codex**.

Using the **RPG methodology** (Repository Planning Graph) from Microsoft Research, it creates structured docs that help your AI assistant:

- 🧠 **Maintain context** across long coding sessions
- 📋 **Work through tasks** in the right order
- 🏗️ **Set up infrastructure** with zero manual config
- 🔄 **Track progress** and pick up where it left off

---

## 🎬 Quick Start

```bash
# Install globally
npm install -g vibe-assistant

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Generate a PRD!
cd your-project
vibe-assistant init
```

That's it! Answer the questions, and vibe-assistant will generate everything your AI coding agent needs.

---

## 🎯 Features

| Feature | Description |
|---------|-------------|
| 💬 **Interactive Interview** | Guided Q&A to capture your vision |
| 🏛️ **RPG Methodology** | Battle-tested structure from Microsoft Research |
| ☁️ **Multi-Cloud Support** | AWS, GCP, Azure, Vercel, Railway, Fly.io, self-hosted |
| 🔧 **Infrastructure as Code** | Terraform, Pulumi, CloudFormation, CDK specs |
| 🚀 **CI/CD Pipelines** | GitHub Actions, GitLab CI, Jenkins configs |
| 🐳 **Container Ready** | Docker & orchestration (Compose, K8s, ECS) |
| 🤖 **Agent Configs** | CLAUDE.md + AGENTS.md for your AI |
| ⚡ **Slash Commands** | `/next-task`, `/checkpoint`, `/phase-status` |
| 🔍 **Research Integration** | Uses Perplexity or Claude to research best practices |
| 📊 **Progress Tracking** | Never lose context, even across sessions |

---

## 📦 What Gets Generated

```
your-project/
├── 📁 docs/
│   ├── 📁 prd/
│   │   ├── 📄 PRD.md              ← Main requirements doc
│   │   ├── 📁 phases/
│   │   │   ├── 📄 phase-1.md      ← Detailed task breakdowns
│   │   │   ├── 📄 phase-2.md
│   │   │   └── ...
│   │   └── 📁 research/           ← Research findings
│   └── 📁 progress/
│       ├── 📄 state.json          ← Machine-readable progress
│       └── 📄 phase-*-summary.md  ← Checkpoint summaries
│
├── 📁 .claude/
│   └── 📁 commands/
│       ├── 📄 next-task.md        ← Get next task
│       ├── 📄 checkpoint.md       ← Save progress
│       ├── 📄 phase-status.md     ← Show completion
│       └── 📄 research.md         ← Research a topic
│
├── 📄 CLAUDE.md                   ← Instructions for Claude Code
└── 📄 AGENTS.md                   ← Instructions for Codex
```

---

## 🛠️ Commands

### `vibe-assistant init`

Start a new PRD with an interactive interview.

```bash
vibe-assistant init
```

You'll be asked about:
- 📝 Project name & description
- 👥 Target users
- ✨ Core features
- 🔧 Tech stack preferences
- 🚀 Infrastructure & deployment
- 🤖 Which AI agent you're using

### `vibe-assistant status`

Check your project's progress.

```bash
vibe-assistant status
```

```
📊 Project Status

Current Phase: 2
Last Updated: 12/13/2025, 10:30 AM

Overall Progress:
  ████████░░░░░░░░░░░░ 40%
  8 completed, 1 in progress, 11 pending
```

### `vibe-assistant update`

Update an existing PRD with new requirements.

```bash
vibe-assistant update
```

Options:
- ➕ Add new features
- ✏️ Modify existing requirements
- 🔍 Add research findings
- 🔄 Regenerate from scratch

---

## 🚀 Infrastructure Interview

During setup, you'll configure your entire deployment pipeline:

| Category | Options |
|----------|---------|
| **☁️ Hosting** | AWS, GCP, Azure, Vercel, Netlify, Railway, Fly.io, Self-hosted |
| **🏠 Self-hosted** | Docker Compose, Kubernetes, Shell scripts, Systemd |
| **📦 Repository** | GitHub, GitLab, Bitbucket |
| **🔄 CI/CD** | GitHub Actions, GitLab CI, Jenkins, CircleCI |
| **🏗️ IaC** | Terraform, Pulumi, CloudFormation, CDK, Bicep |
| **🐳 Containers** | Docker + Compose, Kubernetes, ECS, Cloud Run |
| **🌍 Environments** | Development, Staging, Production |
| **🔐 Secrets** | AWS Secrets Manager, GCP Secret Manager, Vault, Doppler |

Your PRD will include **bootstrap scripts** so you can go from zero to deployed with minimal commands!

---

## ⚡ Slash Commands

When using Claude Code, these commands help maintain context:

| Command | What it does |
|---------|--------------|
| `/next-task` | 📋 Get the next task to work on |
| `/checkpoint` | 💾 Save progress and create summary |
| `/phase-status` | 📊 Show current phase completion |
| `/research <topic>` | 🔍 Research a technical topic |

---

## ⚙️ Configuration

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
| `--set-anthropic-key <key>` | Set Claude API key |
| `--set-perplexity-key <key>` | Set Perplexity API key |
| `--set-research-provider <provider>` | `perplexity` or `claude` |
| `--set-default-agent <agent>` | `claude-code`, `codex`, or `both` |

---

## 📖 The RPG Methodology

The **Repository Planning Graph** methodology structures PRDs with:

1. **📋 Overview** — Problem, users, success metrics
2. **🧩 Functional Decomposition** — Capability domains and features
3. **🏗️ Structural Decomposition** — Module organization
4. **🔗 Dependency Graph** — Build order and dependencies
5. **🗺️ Implementation Roadmap** — Phased tasks with entry/exit criteria
6. **🧪 Test Strategy** — Testing requirements and coverage
7. **🏛️ Architecture** — Technical decisions and rationale
8. **🚀 Infrastructure** — Complete deployment automation
9. **⚠️ Risks** — Risk assessment and mitigations
10. **📎 Appendix** — Glossary, references, open questions

---

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT © Nick K

---

<p align="center">
  <b>Built with ❤️ in Auckland, New Zealand</b>
  <br>
  <sub>Making AI coding agents actually useful since 2024</sub>
</p>
