import ora from 'ora';
import chalk from 'chalk';
import { generateWithClaude, research } from '../llm/client.js';
import type { ProjectInfo, PRDDocument, UserConfig } from '../types.js';

const SYSTEM_PROMPT = `You are an expert software architect who creates detailed PRDs using the RPG (Repository Planning Graph) methodology from Microsoft Research.

The RPG methodology separates functional thinking (what the system does) from structural thinking (how code is organized), then connects them via explicit dependencies.

Your PRDs must be optimized for AI coding agents (Claude Code, Codex) to implement. This means:
1. Clear, unambiguous requirements
2. Explicit dependencies between components
3. Phased implementation with entry/exit criteria
4. Specific file paths and module names
5. Testable acceptance criteria
6. Complete infrastructure-as-code and CI/CD pipeline definitions
7. Bootstrap scripts that take a user from zero to running with minimal manual steps

IMPORTANT: The generated PRD must include complete deployment automation. The goal is that a developer can clone the repo and run minimal commands to have everything deployed. Include:
- Dockerfiles and compose files if Docker is used
- Terraform/Pulumi/CloudFormation files if IaC is specified
- CI/CD workflow files (GitHub Actions, GitLab CI, etc.)
- Bootstrap scripts (setup.sh, deploy.sh)
- Environment configuration templates

Always output valid JSON matching the requested schema.`;

export async function generatePRD(
  config: UserConfig,
  projectInfo: ProjectInfo,
  researchResults: Map<string, string>
): Promise<PRDDocument> {
  const spinner = ora('Generating PRD with Claude...').start();

  const researchContext = Array.from(researchResults.entries())
    .map(([query, result]) => `### Research: ${query}\n${result}`)
    .join('\n\n');

  const infra = projectInfo.infrastructure;
  const infraSummary = `
- Hosting: ${infra.hosting.platform}${infra.hosting.selfHostedType ? ` (${infra.hosting.selfHostedType})` : ''}${infra.hosting.platformDetails ? ` - ${infra.hosting.platformDetails}` : ''}
- Repository: ${infra.repository.platform} (${infra.repository.visibility})
- CI/CD: ${infra.cicd.platform}${infra.cicd.autoDeploy ? ' with auto-deploy on main' : ''}
- Infrastructure as Code: ${infra.infrastructure.asCode ? infra.infrastructure.tool || 'Yes' : 'No'}
- Containerization: ${infra.containerization.useDocker ? `Docker with ${infra.containerization.orchestration || 'no orchestration'}` : 'No Docker'}
- Environments: ${infra.environments.join(', ')}
- Secrets Management: ${infra.secrets.management}`;

  const prompt = `Generate a comprehensive PRD for the following project using RPG methodology.

## Project Information
- Name: ${projectInfo.name}
- Description: ${projectInfo.description}
- Target Users: ${projectInfo.targetUsers}
- Core Features: ${projectInfo.coreFeatures.join(', ')}
- Tech Stack: ${projectInfo.techStack || 'Recommend appropriate stack'}
- Technical Constraints: ${projectInfo.technicalConstraints}
- Success Metrics: ${projectInfo.successMetrics}
- Target Coding Agent: ${projectInfo.targetAgent}

## Infrastructure & Deployment Requirements
${infraSummary}

IMPORTANT: The implementation must include complete deployment automation based on these infrastructure choices. The AI coding agent should generate:
${infra.containerization.useDocker ? '- Dockerfile and docker-compose.yml (if orchestration is docker-compose)' : ''}
${infra.infrastructure.asCode && infra.infrastructure.tool ? `- ${infra.infrastructure.tool} configuration files for all cloud resources` : ''}
${infra.cicd.platform !== 'none' ? `- ${infra.cicd.platform} workflow/pipeline configuration` : ''}
- Bootstrap script (setup.sh or similar) that handles initial setup
- Deploy script or instructions for each environment
- Environment variable templates (.env.example)

## Research Context
${researchContext || 'No additional research conducted.'}

## Output Format
Generate a JSON object with this exact structure:

{
  "projectInfo": { /* echo back the project info */ },
  "overview": {
    "problemStatement": "string - clear problem being solved",
    "targetUsers": "string - who will use this",
    "successMetrics": ["array of measurable success criteria"]
  },
  "functionalDecomposition": [
    {
      "name": "Capability Domain Name",
      "description": "What this domain handles",
      "features": [
        {
          "name": "Feature Name",
          "description": "What this feature does",
          "inputs": ["what it receives"],
          "outputs": ["what it produces"],
          "behavior": "how it works"
        }
      ]
    }
  ],
  "structuralDecomposition": [
    {
      "name": "Module Name",
      "path": "src/module-name",
      "description": "What this module contains",
      "capabilities": ["which capability domains it implements"],
      "dependencies": ["other modules it depends on"]
    }
  ],
  "dependencyGraph": [
    {
      "name": "Layer Name (e.g., Foundation, Core, Features, UI)",
      "modules": ["modules in this layer"],
      "dependsOn": ["layers this depends on"]
    }
  ],
  "implementationRoadmap": [
    {
      "number": 1,
      "name": "Phase Name",
      "description": "What this phase accomplishes",
      "entryCriteria": ["what must be true to start"],
      "exitCriteria": ["what must be true to complete"],
      "tasks": [
        {
          "id": "phase1-task1",
          "title": "Task Title",
          "description": "Detailed task description",
          "phase": 1,
          "dependencies": ["task ids this depends on"],
          "status": "pending",
          "parallelizable": true,
          "researchRequired": "optional research topic if needed"
        }
      ]
    }
  ],
  "testStrategy": {
    "unitTests": ["what to unit test"],
    "integrationTests": ["what to integration test"],
    "e2eTests": ["end-to-end scenarios"],
    "coverageTarget": 80,
    "criticalScenarios": ["must-pass scenarios"]
  },
  "architecture": {
    "decisions": ["key architectural decisions with rationale"],
    "dataModels": ["main data structures"],
    "techStackRationale": "why this tech stack"
  },
  "infrastructure": {
    "overview": "High-level description of the deployment architecture",
    "hosting": {
      "platform": "aws|gcp|azure|vercel|etc",
      "services": ["list of cloud services used, e.g., EC2, RDS, S3"],
      "regions": ["deployment regions"]
    },
    "iacFiles": [
      {
        "path": "infra/main.tf",
        "description": "What this IaC file provisions",
        "tool": "terraform|pulumi|cloudformation|cdk"
      }
    ],
    "cicdPipeline": {
      "description": "What the CI/CD pipeline does",
      "steps": ["build", "test", "deploy to staging", "deploy to production"],
      "triggers": ["push to main", "pull request"],
      "artifacts": ["docker images", "deployment packages"]
    },
    "containerization": {
      "dockerfile": "Path to Dockerfile or description",
      "composeFile": "Path to docker-compose.yml if used",
      "orchestration": "none|docker-compose|kubernetes|ecs"
    },
    "environments": [
      {
        "name": "development",
        "purpose": "Local development",
        "autoDeployBranch": "optional branch that auto-deploys here"
      },
      {
        "name": "production",
        "purpose": "Live production environment",
        "url": "https://example.com",
        "autoDeployBranch": "main"
      }
    ],
    "secrets": {
      "strategy": "How secrets are managed",
      "requiredSecrets": ["DATABASE_URL", "API_KEY", "etc"]
    },
    "bootstrapSteps": [
      "Step-by-step instructions to go from zero to running",
      "1. Clone repo",
      "2. Run ./setup.sh",
      "3. Configure secrets",
      "4. Run ./deploy.sh production"
    ],
    "teardownSteps": [
      "Steps to completely tear down the infrastructure",
      "1. Run ./teardown.sh",
      "2. Delete secrets from vault"
    ]
  },
  "risks": [
    {
      "type": "technical|dependency|scope",
      "description": "risk description",
      "likelihood": "low|medium|high",
      "impact": "low|medium|high",
      "mitigation": "how to mitigate"
    }
  ],
  "appendix": {
    "glossary": {"term": "definition"},
    "openQuestions": ["questions to resolve"],
    "references": ["relevant links or resources"]
  }
}

Be thorough but practical. Each phase should have 3-7 tasks. Include realistic dependencies. Make task descriptions actionable for an AI coding agent.

Respond with ONLY the JSON object, no markdown code fences or additional text.`;

  try {
    const response = await generateWithClaude(config, SYSTEM_PROMPT, prompt, 8192);

    // Try to parse the JSON response
    let prd: PRDDocument;
    try {
      // Remove any markdown code fences if present
      const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      prd = JSON.parse(jsonStr);
    } catch (parseError) {
      spinner.fail('Failed to parse PRD response');
      throw new Error(`Invalid JSON response from Claude: ${parseError}`);
    }

    spinner.succeed('PRD generated successfully');
    return prd;
  } catch (error) {
    spinner.fail('Failed to generate PRD');
    throw error;
  }
}

export async function conductResearch(
  config: UserConfig,
  projectInfo: ProjectInfo
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Skip research if no Perplexity key and research provider is perplexity
  if (config.researchProvider === 'perplexity' && !config.perplexityApiKey) {
    console.log(chalk.yellow('\n⚠️  Skipping research (no Perplexity API key configured)\n'));
    return results;
  }

  console.log(chalk.cyan('\n🔍 Conducting research...\n'));

  const queries = [
    `Best practices and architecture patterns for ${projectInfo.description.substring(0, 100)}`,
    projectInfo.techStack
      ? `Best practices for ${projectInfo.techStack} projects in 2024`
      : `Recommended tech stack for: ${projectInfo.coreFeatures.slice(0, 3).join(', ')}`,
  ];

  for (const query of queries) {
    const spinner = ora(`Researching: ${query.substring(0, 50)}...`).start();
    try {
      const { response, provider } = await research(config, query);
      results.set(query, response);
      spinner.succeed(`Research complete (${provider})`);
    } catch (error) {
      spinner.warn(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}
