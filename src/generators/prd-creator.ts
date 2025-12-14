import {
  generateWithClaude,
  researchWithPerplexity,
  extractTechStack,
  researchPackageVersions,
  researchProjectComplexity,
  formatResearchResults,
} from '../llm/client.js';
import type { UserConfig, ParsedPRD, ResearchResults, DeploymentConfig } from '../types.js';
import { DEPLOYMENT_DESCRIPTIONS } from '../types.js';

const EXPAND_IDEA_PROMPT = `You are an expert product manager and technical architect. Your job is to take a rough project idea and expand it into a comprehensive Product Requirements Document (PRD).

When expanding the idea, you MUST cover:
1. **Problem Statement**: What problem does this solve? Who experiences it?
2. **Target Users**: Who will use this? What are their workflows?
3. **Goals & Success Metrics**: What does success look like? How will we measure it?
4. **Core Features**: What are the must-have capabilities?
5. **Technical Considerations**:
   - Tech stack recommendations with rationale
   - Database and storage needs
   - API design considerations
   - Authentication/authorization approach
6. **Phases**: Break the project into logical implementation phases (see deployment section for what to include)
7. **Risks & Mitigations**: What could go wrong? How do we prevent it?

CRITICAL - Deployment Configuration:
The user has specified their deployment strategy. You MUST incorporate this into the PRD:
- Include appropriate deployment tasks in a dedicated phase
- Include CI/CD pipeline setup if the strategy requires it
- Include infrastructure-as-code tasks if applicable
- Do NOT include deployment/CI/CD tasks if the user chose "local only"

CRITICAL - When research results are provided:
1. **Use Specific Versions**: Include exact package versions from research (e.g., "React 18.3.1" not just "React")
2. **Avoid Deprecated Tech**: If research identifies deprecated packages, use the recommended alternatives instead
3. **Follow Best Practices**: Incorporate architectural patterns and recommendations from research
4. **Phase Structure**: If research suggests a certain number of phases, follow that guidance
5. **Critical Path**: Structure phases according to the critical path identified in research

Output a well-structured markdown document. Be specific and actionable - avoid vague statements.`;

const REFINE_PRD_PROMPT = `You are an expert product manager refining a PRD based on user feedback.

You have an existing PRD and the user has provided feedback. Your job is to:
1. Carefully read the feedback
2. Apply the requested changes while preserving the overall structure
3. Improve any areas the feedback highlights as unclear or incomplete
4. Keep everything else intact

Return the complete updated PRD in markdown format.`;

const FORMAT_RPG_PROMPT = `You are an expert at structuring PRDs using the Repository Planning Graph (RPG) methodology.

Your job is to take a PRD and restructure it into a dependency-aware task breakdown that AI coding agents can execute.

You MUST respond with valid JSON matching this exact schema:
{
  "projectInfo": {
    "name": "string",
    "description": "string (1-2 sentences)",
    "targetAgent": "claude-code"
  },
  "overview": {
    "summary": "string (2-3 sentences)",
    "goals": ["goal1", "goal2", ...]
  },
  "phases": [
    {
      "number": 1,
      "name": "Phase Name",
      "description": "What this phase accomplishes",
      "entryCriteria": ["What must be true before starting"],
      "exitCriteria": ["What must be true when complete"],
      "tasks": [
        {
          "id": "phase1-task1",
          "title": "Task Title",
          "description": "Detailed description of what to implement",
          "phase": 1,
          "dependencies": [],
          "status": "pending",
          "parallelizable": true
        }
      ]
    }
  ]
}

Guidelines:
- Task IDs MUST follow format: phase{N}-task{M}
- Dependencies reference other task IDs (e.g., ["phase1-task1"])
- Phase 1 tasks should have minimal or no dependencies
- Later phases depend on earlier phases being complete
- Mark tasks as parallelizable: true if they can run alongside other tasks in the same phase
- Be specific in task descriptions - include file paths, function names, API endpoints where relevant
- Each phase should have clear entry/exit criteria
- Aim for 3-7 tasks per phase
- Aim for 3-5 phases total for most projects

Only return the JSON object, nothing else.`;

const RESEARCH_TOPICS_PROMPT = `Analyze this project idea and identify 3-5 specific technical topics that would benefit from research to create a better PRD.

Focus on:
- Deployment and infrastructure best practices for this type of project
- Tech stack recommendations and trade-offs
- Common architectural patterns
- Potential pitfalls to avoid

Return a JSON array of research queries:
["query 1", "query 2", ...]

Only return the JSON array, nothing else.`;

const EXTRACT_TECH_FROM_IDEA_PROMPT = `Analyze this project idea and identify the technologies, frameworks, and packages that would likely be used.

Consider:
- Frontend frameworks (React, Vue, etc.)
- Backend frameworks (Express, FastAPI, etc.)
- Databases (PostgreSQL, MongoDB, etc.)
- Other tools and libraries commonly used for this type of project

Return a JSON array of technology names:
["react", "typescript", "postgresql", ...]

Only return the JSON array, nothing else.`;

/**
 * Research a project idea comprehensively before PRD generation
 * Returns structured research including tech versions, complexity assessment, and best practices
 */
export async function researchProjectIdea(
  config: UserConfig,
  idea: string
): Promise<ResearchResults> {
  const results: ResearchResults = {
    generalContext: '',
    techStack: [],
  };

  // Step 1: Extract likely tech stack from the idea
  console.log('  Analyzing project technologies...');
  const techResponse = await generateWithClaude(
    config,
    'You identify technologies likely to be used in a project.',
    `${EXTRACT_TECH_FROM_IDEA_PROMPT}\n\nProject Idea:\n${idea}`,
    500
  );

  try {
    const cleaned = techResponse.trim().replace(/```json\n?|\n?```/g, '');
    results.techStack = JSON.parse(cleaned);
  } catch {
    results.techStack = [];
  }

  // Step 2: Research package versions for identified tech
  if (results.techStack && results.techStack.length > 0) {
    console.log(`  Researching versions for ${results.techStack.length} technologies...`);
    results.versionInfo = await researchPackageVersions(config, results.techStack);
  }

  // Step 3: Research project complexity and task guidance
  console.log('  Analyzing project complexity...');
  results.taskGuidance = await researchProjectComplexity(config, idea, results.techStack || []);

  // Step 4: Research general best practices
  console.log('  Researching best practices...');
  const topicsResponse = await generateWithClaude(
    config,
    'You identify technical topics worth researching for a project.',
    `${RESEARCH_TOPICS_PROMPT}\n\nProject Idea:\n${idea}`,
    500
  );

  let topics: string[];
  try {
    const cleaned = topicsResponse.trim().replace(/```json\n?|\n?```/g, '');
    topics = JSON.parse(cleaned);
  } catch {
    topics = ['best practices for building ' + idea.substring(0, 100)];
  }

  // Research each topic
  const generalResults: string[] = [];
  for (const topic of topics.slice(0, 4)) {
    try {
      const result = await researchWithPerplexity(config, topic);
      generalResults.push(`## ${topic}\n\n${result}`);
    } catch {
      // Continue if one fails
    }
  }

  results.generalContext = generalResults.join('\n\n---\n\n');

  return results;
}

/**
 * Format deployment config into a human-readable string for the prompt
 */
function formatDeploymentConfig(deployment: DeploymentConfig): string {
  let description = DEPLOYMENT_DESCRIPTIONS[deployment.type];

  const details: string[] = [];

  if (deployment.cloudProvider) {
    const providerNames: Record<string, string> = {
      'vercel': 'Vercel',
      'netlify': 'Netlify',
      'railway': 'Railway',
      'render': 'Render',
      'fly-io': 'Fly.io',
      'other': 'Other cloud provider',
    };
    details.push(`Cloud Provider: ${providerNames[deployment.cloudProvider] || deployment.cloudProvider}`);
  }

  if (deployment.iacTool) {
    const toolNames: Record<string, string> = {
      'terraform': 'Terraform',
      'cdk': 'AWS CDK / Pulumi',
      'pulumi': 'Pulumi',
      'cloudformation': 'CloudFormation / ARM Templates',
      'none': 'Manual setup (no IaC)',
    };
    details.push(`Infrastructure as Code: ${toolNames[deployment.iacTool] || deployment.iacTool}`);
  }

  if (deployment.description) {
    details.push(`Additional notes: ${deployment.description}`);
  }

  if (details.length > 0) {
    description += '\n' + details.map(d => `- ${d}`).join('\n');
  }

  // Add specific guidance based on deployment type
  let guidance = '';
  switch (deployment.type) {
    case 'local':
      guidance = `
Since this is local-only development:
- Do NOT include CI/CD pipeline tasks
- Do NOT include cloud infrastructure tasks
- Include basic Git setup (local repository)
- Focus on local development experience`;
      break;
    case 'github-only':
      guidance = `
Since this uses GitHub without automated deployment:
- Include GitHub repository setup
- Include basic GitHub Actions for testing (optional)
- Do NOT include deployment automation
- Include good README and documentation`;
      break;
    case 'github-cloud':
      guidance = `
Since this uses GitHub with cloud hosting:
- Include GitHub repository setup
- Include GitHub Actions workflow for CI/CD
- Include ${deployment.cloudProvider || 'cloud provider'} configuration
- Include environment variable management
- Include production database setup if applicable
- Include domain/SSL configuration (optional)`;
      break;
    case 'github-aws':
    case 'github-gcp':
    case 'github-azure':
      const cloudName = deployment.type === 'github-aws' ? 'AWS' :
                        deployment.type === 'github-gcp' ? 'Google Cloud' : 'Azure';
      guidance = `
Since this uses GitHub with ${cloudName} infrastructure:
- Include comprehensive CI/CD pipeline with GitHub Actions
- Include ${deployment.iacTool || 'IaC'} setup for infrastructure
- Include staging and production environments
- Include secrets management
- Include monitoring and logging setup
- Include proper IAM/security configuration
- This should be a dedicated "Infrastructure" or "DevOps" phase`;
      break;
    case 'self-hosted':
      guidance = `
Since this is self-hosted:
- Include Dockerfile and docker-compose.yml
- Include nginx or reverse proxy configuration
- Include deployment scripts for VPS
- Include SSL/TLS setup (Let's Encrypt)
- Include basic monitoring (optional)
- Include backup strategy`;
      break;
  }

  return description + '\n' + guidance;
}

export async function generateInitialPRD(
  config: UserConfig,
  idea: string,
  projectName?: string,
  research?: ResearchResults,
  deployment?: DeploymentConfig
): Promise<string> {
  let userPrompt = `Create a comprehensive PRD for this project idea:\n\n${idea}`;

  if (projectName) {
    userPrompt += `\n\nProject Name: ${projectName}`;
  }

  // Add deployment configuration (required for proper task generation)
  if (deployment) {
    userPrompt += `\n\n---\n\n# Deployment Strategy (FOLLOW THIS EXACTLY)\n\n${formatDeploymentConfig(deployment)}`;
  }

  if (research) {
    const formattedResearch = formatResearchResults(research);
    userPrompt += `\n\n---\n\n# Research Results (FOLLOW THESE GUIDELINES)\n\n${formattedResearch}`;
  }

  const response = await generateWithClaude(
    config,
    EXPAND_IDEA_PROMPT,
    userPrompt,
    8192
  );

  return response;
}

export async function refinePRD(
  config: UserConfig,
  currentPRD: string,
  feedback: string
): Promise<string> {
  const userPrompt = `Current PRD:\n\n${currentPRD}\n\n---\n\nUser Feedback:\n${feedback}\n\n---\n\nPlease update the PRD based on this feedback.`;

  const response = await generateWithClaude(
    config,
    REFINE_PRD_PROMPT,
    userPrompt,
    8192
  );

  return response;
}

export async function formatWithRPGTemplate(
  config: UserConfig,
  rawPRD: string,
  projectName?: string
): Promise<ParsedPRD> {
  let userPrompt = `Convert this PRD into the RPG-structured JSON format:\n\n${rawPRD}`;

  if (projectName) {
    userPrompt += `\n\nUse "${projectName}" as the project name.`;
  }

  const response = await generateWithClaude(
    config,
    FORMAT_RPG_PROMPT,
    userPrompt,
    8192
  );

  // Clean up response (remove markdown code fences if present)
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned) as ParsedPRD;

  // Calculate total tasks
  parsed.totalTasks = parsed.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);

  return parsed;
}

export function extractPRDSummary(prd: string): string {
  // Extract a brief summary from the PRD for display
  const lines = prd.split('\n');
  const summary: string[] = [];

  let inSection = false;
  let sectionCount = 0;

  for (const line of lines) {
    if (line.startsWith('# ') || line.startsWith('## ')) {
      if (sectionCount >= 3) break;
      summary.push(line);
      inSection = true;
      sectionCount++;
    } else if (inSection && line.trim()) {
      summary.push(line);
      if (summary.length > 15) {
        inSection = false;
      }
    } else if (line.trim() === '') {
      if (inSection) summary.push('');
    }
  }

  return summary.join('\n').trim() + '\n\n...';
}
